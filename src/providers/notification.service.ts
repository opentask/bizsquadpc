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

    webUrl = 'http://localhost:4200/auth?token=';

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

    customToken: any;

    constructor(
        private bizFire: BizFireService,
        private tokenService : TokenProvider,
        private cacheService : CacheService,
        public electron: Electron,
        ) {
            this.ipc = this.electron.ipc;

            this.bizFire.userCustomToken
            .pipe(takeUntil(this.bizFire.onUserSignOut))
            .subscribe((token) => {
              this.customToken = token;
            })

            // delete all notifications
            this.bizFire.onUserSignOut.subscribe(()=>{

                this.notifyKey = null;
                //this.onUnfinishedNotices.next([]);
                this.onNotifications.next(null);
                // clear cache.
                this.fireData.clear();

                if(this.notifySub){
                    this.notifySub.unsubscribe();
                    this.notifySub = null;
                }
            
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
    onClickNotifyContents(msg: INotificationItem) {

        // 알람 스테이터스 true로 변경.
        this.bizFire.setReadNotify(msg).then(() => {
            console.log(msg);
            // 웹 링크로 이동.
            this.ipc.send('loadGH',msg.html.link[0]);
        })
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
            item.html = { header: null, content: null, link: null, user:null,groupColor: null };
        
            // to where?
            if (info.type === 'group') {
                // 누가 어느 그룹에
                zip(userObserver, groupObserver)
                .subscribe(([u, g]) => {
                
                  let team_name;
                  let userName;
                  if(u != null ){
                    userName = u.data['displayName'] || u.data['email'];
                  } else {
                    userName = `deleted user`;
                  }
                  if( g != null){
                    team_name = g['team_name'];
                    item.html.groupColor = g['team_color'];
                  } else {
                    team_name = `deleted BizGroup`;
                  }
        
                  // set content
                  item.html.header = [`${userName}`,`invited you to BizGroup ${team_name}`];
                  item.html.content = [`Invitation to ${team_name}`];
                  item.html.link = [`${this.webUrl}${this.customToken}&url=home/${data.gid}`];
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
            item.html = { header: null, content: null, link: null, user: null,groupColor: null};

            if (data.post === true) {

            // get squad info
            const squadObserver = this.cacheService.getObserver(Commons.squadDocPath(gid, info.sid));

            zip(userObserver, groupObserver, squadObserver)
                .subscribe(([u, g, s]) => {

                  let team_name;
                  let userName;
                  if(u != null ){
                    userName = u.data['displayName'] || u.data['email'];
                  } else {
                    userName = `deleted user`;
                  }
                  if( g != null){
                    team_name = g['team_name'];
                    item.html.groupColor = g['team_color'];
                  } else {
                    team_name = `deleted BizGroup`;
                  }

                // set content
                item.html.header = [`${userName}`, `posted ${info.title}`];
                item.html.content = [`${info.title}`];
                item.html.link = [`${this.webUrl}${this.customToken}&url=squad/${data.gid}/${info.sid}/post`];
                item.html.user = u;

                resolve.next(item);

                });
            }

            // is a bbs post ?
            else if (data.bbs === true) {

                zip(userObserver, groupObserver)
                    .subscribe(([u, g]) => {

                    const title = info.title || '';
                    let userName;

                    if(u != null ){
                      userName = u.data['displayName'] || u.data['email'];
                    } else {
                      userName = `deleted user`;
                    }

                    if( g != null){
                      item.html.groupColor = g['team_color'];
                    }

                    // set content
                    item.html.header = [`${userName}`, `registered a new notice ${title}`];
                    item.html.content = [`${userName} 씨가 새 게시글 등록했다. 보려면 밑에 링크를 클릭하라.`];

                    // second array is a routerLink !
                    item.html.link = [`${this.webUrl}${this.customToken}&url=bbs/${data.gid}/${data.info.mid}/read`];
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
            item.html = { header: null, content: null, link: null,groupColor : null};
        

            zip(userObserver, groupObserver)
                .subscribe(([u, g])=>{

                  let team_name;
                  let userName;
                  if(u != null ){
                    userName = u.data['displayName'] || u.data['email'];
                  } else {
                    userName = `deleted user`;
                  }
                  if( g != null){
                    team_name = g['team_name'];
                    item.html.groupColor = g['team_color'];
                  } else {
                    team_name = `deleted BizGroup`;
                  }
        
                  // user joined a group.
                  item.html.header = [`${userName}`, `joined ${team_name}`];
                  item.html.content = [`${userName} joined BizGroup ${team_name}`];
                  item.html.link = [`${this.webUrl}${this.customToken}&url=home/${data.gid}`];

                  resolve.next(item);

                  });
    
        });
    
    }
  

}
