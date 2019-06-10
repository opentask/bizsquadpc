import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest, zip, Subscription } from 'rxjs';
import { INotification, IAlarmConfig, INoticeItem, INotificationData } from '../_models/message';
import { BizFireService } from './biz-fire/biz-fire';
import { IFireDataKey, IFireMessage } from '../classes/fire-model';
import { FireData } from '../classes/fire-data';
import { FireDataKey } from '../classes/fire-data-key';
import { takeUntil } from 'rxjs/operators';
import { Commons } from '../biz-common/commons';
import { DataCache } from '../classes/cache-data';

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

    // for notice component.
    onNotifications = new BehaviorSubject<INotification[]>(null);
    
    private oldAlarmSub: Subscription;
    // alarm send by SettingComponent
    onAlarmChanged = new BehaviorSubject<IAlarmConfig>(null);
    
    // data 가 FireData에서오면 푸쉬
    private _notification = new Subject<INotification[]>();
    
    /*
    * 데이터 일부만 실시간 경신하기 위해 FireData를 사용한다.
    * */
    private fireData = new FireData();
    private notifyKey: IFireDataKey;

    public dataCache = new DataCache();

    constructor(private bizFire: BizFireService) {

        // wait for notify data changed.
        this.fireData.onMessageChanged
        .subscribe((message: IFireMessage) => {
            if(this.notifyKey && this.notifyKey.isEqualKey(message.key)) {
                console.log("처음에 값이 들어옵니까?",message.data);
                this._notification.next(message.data);
            }
        });

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
            console.log("this.notifyKey",this.notifyKey);

            // start new alarm ONLY first time.
            // if(this.fireData.has(this.notifyKey) === false) {
            const observer = this.bizFire.afStore.collection(Commons.notificationPath(this.bizFire.currentUID),
                ref => {
                    let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
                    query = query.orderBy('created', 'asc');
                    return query;
                })
                .stateChanges().pipe(takeUntil(this.bizFire.onUserSignOut));
        
            const builder = (doc)=>{
                return {mid:doc.id, data: doc.data()} as INotification;
            };
            
            this.fireData.register(this.notifyKey, observer, {createFnc: builder});

            // }
            // find alarm from /user/<>.alarm
            let alarm: IAlarmConfig = user.alarm;
            
            if(alarm == null){
                // set to default
                alarm = {all: true, groupInvite: true, squadInOut: true, squadInvite: true, schedule: true, post: true,
                    comment: true, bbs: true};
                
                // and update firebase
                this.updateAlarmStatus(alarm);
                console.log("1번",this.onAlarmChanged);
            
            } else {
                // alarm info changed.
                this.onAlarmChanged.next(alarm);
                console.log("2번",this.onAlarmChanged);
            }
        });

        combineLatest(this._notification, this.onAlarmChanged)
        //.pipe(filter(([n, l, a]) => a!=null))
          .subscribe(([msgs, alarm]) => {

            console.log("alert combine latest",this._notification);
            console.log("this.onAlarmChanged",this.onAlarmChanged);
            
            let alarmsToDelete = [];
            let leftAlarms = [];
            if(alarm.all === false){
              alarmsToDelete = msgs;
        
            } else {
              
              msgs.forEach(m => {
          
                const data = m.data;
                let added;
                
                added = alarm.groupInvite === true && data.groupInvite === true;
      
                if(!added){
                  added = alarm.squadInOut === true && data.squadInOut === true;
                }
                if(!added){
                  added = alarm.squadInvite === true && data.squadInvite === true;
                }
                if(!added){
                  added = alarm.schedule === true && data.schedule === true;
                }
                if(!added){
                  added = alarm.post === true && data.post === true;
                }
                if(!added){
                  added = alarm.comment === true && data.comment === true;
                }
                if(!added){
                  added = alarm.bbs === true && data.bbs === true;
                }
                
                if(added){
                  leftAlarms.push(m);
                } else {
                  alarmsToDelete.push(m);
                }
                
              });
            }
            this.onNotifications.next(leftAlarms);
            console.log("leftAlarms",leftAlarms);
        });
    }

    updateAlarmStatus(alarm: IAlarmConfig) {
        return this.bizFire.afStore.doc(Commons.userPath(this.bizFire.currentUID)).update({
          alarm: alarm
        });
    }



    private getObserver(userPath: string) {
        try {
            const userKey = new FireDataKey(userPath);
            if (!this.dataCache.has(userKey)) {
                this.dataCache.register(userKey, this.bizFire.afStore.doc(userPath).valueChanges());
            }
            const userObserver = this.dataCache.get(userKey);
            return userObserver;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    /*
    * Create INoticeItem : for html display.
    * */
    public makeMessage(m: INotification): INoticeItem {
            
        const data: INotificationData = m.data;
        
        const message: INoticeItem = {mid: m.mid, notification: data, data: {header: null, content: null, link: null}};
        
        // get user info
        const userObserver = this.getObserver(Commons.userPath(data.from));
        
        // NOTIFY
        if(data.type === 'notify'){
            
            const notify = data.notify;
            // get group info
            const groupObserver = this.getObserver(Commons.groupPath(notify.gid));
            
            if(notify.type === 'post') {
                
                // is squad post ?
                if(data.post === true){
                    // get squad info
                    const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                    
                    zip(userObserver, groupObserver, squadObserver)
                        .subscribe(([u, g, s])=>{
                            
                            // needed to show avatar
                            message.data.user = {uid: data.from, data: u};
                            
                            // set content
                            message.data.header = [`${u['displayName'] || u['email']}`, `posted ${notify.info.title}`];
                            message.data.content = [`${notify.info.title}`];
                            message.data.link = [`${g['team_name']} > ${s['name']}`, `/main/${notify.gid}/${notify.sid}`];
                        });
                }
                // is a bbs post ?
                else if(data.bbs === true){
                    zip(userObserver, groupObserver)
                        .subscribe(([u, g])=>{
                            // needed to show avatar
                            message.data.user = {uid: data.from, data: u};
                            
                            // set content
                            message.data.header = [`${u['displayName'] || u['email']}`, `registered a new notice ${notify.info.title}`];
                            message.data.content = [`New Notice:` , `${notify.info.title}`];
                            // second array is a routerLink !
                            message.data.link = [`${g['team_name']}`, `/main/${notify.gid}/bbs`];
                        });
                }
                // is this a schedule post ?
                else if(data.schedule === true){
                    // get squad info
                    const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                    zip(userObserver, groupObserver, squadObserver)
                        .subscribe(([u, g, s])=>{
                            // needed to show avatar
                            message.data.user = {uid: data.from, data: u};
            
                            // set content
                            message.data.header = [`${u['displayName'] || u['email']}`,
                                `registered a new schedule ${notify.info.title}`];
                            message.data.content = [
                                `In Squad ${s['name']}, ` ,
                                `a new schedule [${notify.info.title}] registered.`,
                                ];
                            
                            message.data.link = [`${g['team_name']} > ${s['name']}`,
                                `/main/${notify.gid}/${notify.sid}`]; // second array is a routerLink !
                        });
                }
            }
            
            if(notify.type === 'comment') {
                // get squad info
                const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                
                zip(userObserver, groupObserver, squadObserver)
                    .subscribe(([u, g, s])=>{
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        message.data.header = [`${u['displayName'] || u['email']}`, `commented at ${notify.info.title}`];
                        message.data.content = [`${notify.info.title}`,
                            `<blockquote class="blockquote"><footer class="blockquote-footer font-12">${notify.info.comment}</blockquote>`];
                        message.data.link = [`${g['team_name']} > ${s['name']}`, `/main/${notify.gid}/${notify.sid}`];
                    });
                
            }
            
            if(notify.type === 'join'){
                
                // squad or group ?
                if(notify.info && notify.info.join ==='squad'){
                    // this is a squad join
                    // get squad info
                    const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                    
                    zip(userObserver, groupObserver, squadObserver)
                        .subscribe(([u, g, s])=>{
                            // needed to show avatar
                            message.data.user = {uid: data.from, data: u};
                            
                            // user joined a squad
                            message.data.header = [`${u['displayName'] || u['email']}`, `joined ${s['name']}`];
                            message.data.content = [`${u['displayName'] || u['email']} joined <span class="font-weight-bold">${s['name']}</span>`];
                            message.data.link = [`${g['team_name']} > ${s['name']}`];
                            
                        });
                    
                } else {
                    // this is a group
                    zip(userObserver, groupObserver)
                        .subscribe(([u, g])=>{
                            // needed to show avatar
                            message.data.user = {uid: data.from, data: u};
                            
                            // user joined a group.
                            message.data.header = [`${u['displayName'] || u['email']}`, `joined ${g['team_name']}`];
                            message.data.content = [`${u['displayName'] || u['email']} joined BizGroup <span class="font-weight-bold">${g['team_name']}</span>`];
                            message.data.link = [`${g['team_name']}`, `/main/${notify.gid}`];
                            
                        });
                    
                }
            }
        }
        
        // INVITATION
        if(data.type === 'invitation'){
            // who
            const invitation = data.invitation;
            // get group info
            const groupObserver = this.getObserver(Commons.groupPath(invitation.gid));
            // to where?
            if(invitation.type === 'group'){
                // 누가 어느 그룹에
                zip(userObserver, groupObserver)
                    .subscribe(([u, g])=>{
                        // need to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        message.data.header = [
                            `${u['displayName'] || u['email']}`,
                            `invited you to BizGroup ${g['team_name']}`
                        ];
                        
                        message.data.content = [
                            `Invitation to <span class="text-primary">${g['team_name']}</span>`,
                            "Please click Accept to accept this invitation."
                        ];
                        
                    });
                
            } else if(invitation.type === 'squad'){
                // get squad info
                const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                
                zip(userObserver, groupObserver, squadObserver)
                    .subscribe(([u, g, s])=>{
                        // need to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        message.data.header = [
                            `${u['displayName'] || u['email']}`,
                            `invited you to Squad ${s['name']}`
                        ];
                        
                        message.data.content = [
                            `Invitation to Squad <span class="text-muted">${s['name']}</span> of BizGroup ${g['team_name']}`,
                            "Please click Accept to accept this invitation."
                        ];
                    });
            }
            
        }
        
        return message;
    }

    // Click alarm text. 아직 안씀 보류
    onClickNotifyContents(msg: INoticeItem) {
        if(msg.data && msg.data.link != null && msg.data.link.length > 1){
            
            // found rounterLink
            const link = msg.data.link[1];
            console.log(link);

            // this.ipc.send('loadGH',link);
        }
    }
  

}