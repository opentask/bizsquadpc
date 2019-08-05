import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest, zip, Subscription, Observable } from 'rxjs';
import { INotification, IAlarmConfig, INoticeItem, INotificationData, INotificationItem } from '../_models/message';
import { BizFireService } from './biz-fire/biz-fire';
import { IFireDataKey, IFireMessage } from '../classes/fire-model';
import { FireData } from '../classes/fire-data';
import { FireDataKey } from '../classes/fire-data-key';
import { takeUntil } from 'rxjs/operators';
import { Commons } from '../biz-common/commons';
import { DataCache } from '../classes/cache-data';
import { TokenProvider } from './token/token';
import { Electron } from './electron/electron';
import { DocumentChangeAction } from '@angular/fire/firestore';
import { CacheService } from './cache/cache';

export interface IAlarm {
    all: boolean,
    groupInvite: boolean,
    squadInvite: boolean,
    squadInOut:boolean,
    post: boolean,
    comment:boolean,
    schedule:boolean,
    bbs:boolean
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    webUrl = "https://product.bizsquad.net/";

    // for notice component.
    onNotifications = new BehaviorSubject<INotification[]>(null);
    
    // alarm send by SettingComponent
    onAlarmChanged = new BehaviorSubject<IAlarmConfig>(null);
    
    // 알람 리스트
    private notificationData: INotification[];

    private notifySub: Subscription;
    
    /*
    * 데이터 일부만 실시간 경신하기 위해 FireData를 사용한다.
    * */
    private fireData = new FireData();
    private notifyKey: IFireDataKey;

    public ipc: any;

    constructor(
        private bizFire: BizFireService,
        private tokenService : TokenProvider,
        private cacheService : CacheService,
        public electron: Electron,
        ) {
            this.ipc = this.electron.ipc;

            // delete all notifications
            this.bizFire.onUserSignOut.subscribe(()=>{

                //this.onUnfinishedNotices.next([]);
                this.onNotifications.next(null);
                // clear cache.
                this.fireData.clear();
                this.notifyKey = null;
            
            });

            // allTime alarm monitor.
            this.bizFire.currentUser.subscribe(user => {

                console.log("this.notifyKey",this.notifyKey);
            
                // start register at first time. ONLY first time.
                if(this.notifyKey == null){
                    this.notifyKey = new FireDataKey('notify', this.bizFire.currentUID);
                }
                if(this.notifySub == null){
                    this.notificationData = [];

                    this.notifySub = this.bizFire.afStore.collection(Commons.notificationPath(this.bizFire.currentUID),
                    ref => {
                        let query : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
                        query = query.orderBy('created', 'asc');
                        return query;
                    }).stateChanges()
                    .pipe(takeUntil(this.bizFire.onUserSignOut))
                    .subscribe((changes : DocumentChangeAction<any>[]) => {

                        //save new value
                        changes.filter(change => {
                            const data = change.payload.doc.data();
                            return parseInt(data.version) >= 50;
                        })
                        .forEach(change => {
                            const data = change.payload.doc.data();
                            const mid = change.payload.doc.id;

                            if(change.type === 'added') {
                                
                                // add new message to top
                                this.notificationData.unshift({mid: mid, data: data} as INotification);

                            } else if (change.type === 'modified') {

                                for(let index = 0; index < this.notificationData.length; index++) {
                                    if(this.notificationData[index].mid === mid) {
                                        this.notificationData[index] = {mid : mid, data: data} as INotification;
                                    }
                                }
                            } else if (change.type === 'removed') {

                                for(let index = 0; index < this.notificationData.length; index++) {
                                    if(this.notificationData[index].mid === mid) {

                                        // remove from array
                                        this.notificationData.splice(index,1);
                                        break;
                                    }
                                }
                            }
                        });
                        // broadcast new value.
                        this.onNotifications.next(this.notificationData);
                    })
                }

                let alarm : IAlarmConfig = user.alarm;

                if(alarm == null) {

                    alarm = {
                        groupInvite: true,
                        post: true,
                        bbs: true
                    }
                    // and update firebase
                    this.updateAlarmStatus(alarm);
                } else {
                    // alarm info changed.
                    this.onAlarmChanged.next(alarm);
                }
                
            });
    }

    updateAlarmStatus(alarm: IAlarmConfig) {
        return this.bizFire.afStore.doc(Commons.userPath(this.bizFire.currentUID)).update({
          alarm: alarm
        });
    }

    // Click alarm text. 아직 안씀 보류
    onClickNotifyContents(msg: INoticeItem) {
        if(msg.data && msg.data.link != null && msg.data.link.length > 1){
            
            // found rounterLink
            const link = msg.data.link[1];

            this.ipc.send('loadGH',link);
        }
    }


    makeHtml(notification: INotification) : Observable<INotificationItem>{

        const data = notification.data;
        if (data.groupInvite === true) {

            return this.makeHtmlInvite(notification);

        } else if(data.post === true || data.bbs === true){

            return this.makeHtmlPost(notification);

        } else if(data.groupInOut === true){

            return this.makeHtmlInOutNotify(notification);

        }

    }

    private makeHtmlInvite(notification: INotification): Observable<INotificationItem>{

        return new Observable<INotificationItem>( resolve => {
    
            const data = notification.data;
            // get user info
            const userObserver = this.cacheService.userGetObserver(data.from);
            // get group info
            const groupObserver = this.cacheService.getObserver(Commons.groupPath(data.gid));
            const info = data.info;
        
            // convert
            const item: INotificationItem = notification;
            item.html = { header: null, content: null, link: null, user:null };
        
            // to where?
            if (info.type === 'group') {
                // 누가 어느 그룹에
                zip(userObserver, groupObserver)
                .subscribe(([u, g]) => {
        
                    const userData = u.data;
        
                    // set content
                    item.html.header = [`${userData['displayName'] || userData['email']}`,`invited you to BizGroup ${g['team_name']}`];
                    item.html.content = [`Invitation to <span class="font-weight-bold">${g['team_name']}</span>`];
                    item.html.link = [`https://product.bizsquad.net`];
                    item.html.user = u;
        
                    resolve.next(item);
                });
            }
        });
        
    }

    private makeHtmlPost(notification: INotification): Observable<INotificationItem>{

        return new Observable<INotificationItem>( resolve => {

            const data = notification.data;
            // get user info
            const userObserver = this.cacheService.userGetObserver(data.from);
            // get group info
            const groupObserver = this.cacheService.getObserver(Commons.groupPath(data.gid));
            const info = data.info;
            const gid = data.gid;

            // convert
            const item: INotificationItem = notification;
            item.html = { header: null, content: null, link: null, user: null};

            if (data.post === true) {

            // get squad info
            const squadObserver = this.cacheService.getObserver(Commons.squadDocPath(gid, info.sid));

            zip(userObserver, groupObserver, squadObserver)
                .subscribe(([u, g, s]) => {

                // set content
                item.html.header = [`${u.data['displayName'] || u.data['email']}`, `posted ${info.title}`];
                item.html.content = [`${info.title}`];
                item.html.link = [`${g['team_name']} > ${s['name']}`, `/squad/${data.gid}/${info.sid}/post`];
                item.html.user = u;

                resolve.next(item);

                });
            }

            // is a bbs post ?
            else if (data.bbs === true) {

                zip(userObserver, groupObserver)
                    .subscribe(([u, g]) => {

                    const title = info.title || '';
                    const userName = u.data['displayName'] || u.data['email'];
                    // set content
                    item.html.header = [`${userName}`, `registered a new notice ${title}`];
                    item.html.content = [`${userName} 씨가 새 게시글 등록했다. 보려면 밑에 링크를 클릭하라.`];

                    // second array is a routerLink !
                    item.html.link = [`${title}`, `/bbs/${data.gid}/${data.info.mid}/read`];
                    item.html.user = u;

                    resolve.next(item);

                    });
            }

        });

    }

    private makeHtmlInOutNotify(notification: INotification): Observable<INotificationItem>{

        return new Observable<INotificationItem>( resolve => {
    
            const data = notification.data;
            // get user info
            const userObserver = this.cacheService.userGetObserver(data.from);
            // get group info
            const groupObserver = this.cacheService.getObserver(Commons.groupPath(data.gid));
        
            // convert
            const item: INotificationItem = notification;
            item.html = { header: null, content: null, link: null, user: null };
        
            /*
            notifyData.groupInOut = true;
            notifyData.info.join = this.bizFire.uid;
            notifyData.info.auth = notificationData.info.auth;
            */
        
            // squad or group ?
            // this is a group. 현재(b54) 스쿼드 초대 / 탈퇴는 알람 메시지를 안보냄.
        
            zip(userObserver, groupObserver)
                .subscribe(([u, g])=>{
        
                const userName = u.data['displayName'] || u.data['email'];
        
                // user joined a group.
                item.html.header = [`${userName}`, `joined ${g['team_name']}`];
                item.html.content = [`${userName} joined BizGroup <span class="font-weight-bold">${g['team_name']}</span>`];
                //item.html.link = [`${g['team_name']}`, `/main/${notify.gid}`];
                item.html.user = u;
        
                resolve.next(item);
        
                });
    
        });
    
    }
  

}