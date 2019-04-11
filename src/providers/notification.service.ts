import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, Subscription } from 'rxjs';
import { INotification, INotificationData, IUser } from '../_models/message';
import { BizFireService, IBizGroup } from './biz-fire/biz-fire';
import { switchMap, takeUntil, map } from 'rxjs/operators';
import { ISquad } from './squad.service';
import { TokenProvider } from './token/token';

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

    onUnfinishedNotices = new BehaviorSubject<any>([]); // not using...
    onNotifications = new BehaviorSubject<INotification[]>([]);

    private oldAlarmSub: Subscription;
    private oldUserUID: string;

    // alarm send by SettingComponent
    onAlarmChanged = new BehaviorSubject<IAlarm>(null);

    private _notification: Observable<INotification[]>;

    customToken: any;
    
    constructor(
        private bizFire: BizFireService,
        private tokenService : TokenProvider,) {

        // delete all notifications
        this.bizFire.onUserSignOut.subscribe(()=>{

            this.onUnfinishedNotices.next([]);
            this.onNotifications.next([]);

            // restart monitor
            if(this.oldAlarmSub != null){
                this.oldAlarmSub.unsubscribe();
                this.oldAlarmSub = null;
            }
        });

        // allTime alarm monitor.
        this.bizFire.currentUser.subscribe(user => {

            if(user.uid !== this.oldUserUID){

                // restart monitor
                if(this.oldAlarmSub != null){
                    this.oldAlarmSub.unsubscribe();
                    this.oldAlarmSub = null;
                }
            }

            this.oldAlarmSub = this.bizFire.afStore.doc(this.getAlarmPath())
                .valueChanges()
                .pipe(takeUntil(this.bizFire.onUserSignOut))
                .subscribe((userData: any) => {

                    let alarm: IAlarm;
                    if(userData.alarm == null){
                        // set to default
                        alarm = {all: true, groupInvite: true, squadInOut: true, squadInvite: true, schedule: true, post: true,
                            comment: true, bbs: true};

                        this.updateAlarmStatus(alarm);
                    } else {

                        alarm = userData.alarm as IAlarm;
                    }

                    this.onAlarmChanged.next(alarm);
                });
        });

        this._notification = this.bizFire.currentUser
        .pipe(switchMap(currentUser => {
            // start monitor notification
            const uid = this.bizFire.currentUID;
            const path = `users/${uid}/notifications`;
            return this.bizFire.afStore.collection(path, ref => ref.orderBy('created', 'desc'))
                .snapshotChanges()
                .pipe(
                    takeUntil(this.bizFire.onUserSignOut),
                    map(docs => docs.map(d =>
                    ({mid:d.payload.doc.id, data: d.payload.doc.data()} as INotification)
                )));
        }));

        combineLatest(this._notification,this.onAlarmChanged)
            //.pipe(filter(([n, l, a]) => a!=null))
            .subscribe(([msgs,alarm]) => {
                // save multi lang. Every time language changed, Re load firestore.
                // msg filter
                if(alarm != null){

                    let alarmsToDelete = [];
                    let leftAlarms = [];
                    if(alarm.all === false){
                        alarmsToDelete = msgs;
                    } else {
                        msgs.forEach(m => {
                            let added = false;
                            if(alarm.groupInvite === true){
                                // invite
                                if(m.data.type === 'invitation' && m.data.invitation != null && m.data.invitation.type ==='group' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                                // but remove user from group must be
                                // caught here
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='group' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }

                            if(alarm.squadInvite === true){
                                // add biz
                                if(m.data.type === 'invitation' && m.data.invitation != null && m.data.invitation.type ==='squad' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(alarm.squadInOut === true){
                                // add biz
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='squad' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(alarm.post === true){
                                // add biz
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='post' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(alarm.comment === true){
                                // add biz
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='comment' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(alarm.schedule === true){
                                // add biz
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='schedule' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(alarm.bbs === true){
                                // add biz
                                if(m.data.type === 'notify' && m.data.notify != null && m.data.notify.type ==='bbs' ){
                                    // ok
                                    leftAlarms.push(m);
                                    added = true;
                                }
                            }
                            if(added === false){
                                alarmsToDelete.push(m);
                            }
                        });
                    }
                    this.onNotifications.next(leftAlarms);

                    // delete all alarms
                    if(alarmsToDelete.length > 0){
                        alarmsToDelete.forEach(msg => {
                           //this.deleteNotification(msg);
                           //console.log('delete', msg.data.type);
                        });
                    }
                    // do nothing.
                    // wait for alarm coming.
                }
            });
    }
    private getAlarmPath(): string{
        return `users/${this.bizFire.currentUID}`;
    }
    updateAlarmStatus(alarm: IAlarm){
        return this.bizFire.afStore.doc(this.getAlarmPath()).update({
            alarm: alarm
        });
    }


    makeDisplayString(data: INotificationData): string {
        let ret = '';
        if(data == null) return ret;
    
        if(data.type === 'invitation' && data.invitation) {
    
           if(data.invitation.type === 'group'){
                ret = `${data.invitation.who} ${data.invitation.what} to ${data.invitation.where} by ${data.sender.displayName||data.sender.email}`;
           }
            if(data.invitation.type === 'squad'){
                ret = `${data.invitation.who} ${data.invitation.what} to ${data.invitation.where} of ${data.invitation.info} by ${data.sender.displayName||data.sender.email}`;
            }
        }
        if(data.type === 'notify' && data.notify != null){

            let type;
            if(data.notify.type === 'squad' || data.notify.type === 'group'){
                type = data.notify.type === 'squad' ? 'Squad' : 'BizGroup';
                if(data.notify.what === 'exit'){
                    type = 'from ' + type;
                }
                ret = `${data.notify.who} ${data.notify.what} ${type} ${data.notify.where}`;
                if(data.notify.type === 'squad'){
                    ret += ` of ${data.notify.info.team_name}`;
                }
            }
            else if(data.notify.type === 'post'){
                //
                ret = `${data.notify.who} ${data.notify.what} ${data.notify.info.title} at Squad ${data.notify.where}`;
                // add 'of <GROUP NAME>'
                if(data.notify.info.groupName != null){
                    //ret += ` of ${data.notify.info.groupName}`;
                }
            }

            else if(data.notify.type === 'comment'){
                ret = `${data.notify.who} ${data.notify.what} a comment at ${data.notify.info.title} of Squad ${data.notify.where}`;
            }

            else if(data.notify.type === 'bbs'){
                ret = `${data.notify.who} ${data.notify.what} ${data.notify.where} at BizGroup ${data.notify.info.team_name}`;
            }
        }

        return ret;
    }

    makeJumpPath(data: INotificationData): string {

        this.customToken = this.tokenService.customToken;

        let ret = '';
        if(data == null) return ret;
        if(data.type === 'invitation' && data.invitation) {
            if(data.invitation.type === 'group'){
                 ret = 'https://product.bizsquad.net/teamlist/teamlist?token='+this.customToken;
            }
             if(data.invitation.type === 'squad'){
                 ret = 'https://product.bizsquad.net/main/squad/view?gid='+data.gid+'&token='+this.customToken;
             }
         }
         if(data.type === 'notify' && data.notify != null){
            if(data.notify.type === 'squad' || data.notify.type === 'group'){
                if(data.notify.type === 'squad'){
                    ret = 'https://product.bizsquad.net/main/squad/view?gid='+data.gid+'&sid='+data.sid+'&token='+this.customToken;
                }
                if(data.notify.type === 'group'|| data.notify.what === 'joined'){
                    ret = 'https://product.bizsquad.net/main/squad/view?gid='+data.gid+'&token='+this.customToken;
                }
                if(data.notify.type === 'squad' && data.notify.what === 'exit'){
                    ret = 'https://product.bizsquad.net/main/squad/view?gid='+ data.gid+'&token='+this.customToken;
                }
                if(data.notify.type === 'group' && data.notify.what === 'exit'){
                    ret = 'https://product.bizsquad.net/teamlist/teamlist?token='+this.customToken;
                }
            } else if(data.notify.type === 'post' || data.notify.type === 'comment'){
                ret = 'https://product.bizsquad.net/main/squad/view?gid='+data.gid+'&sid='+data.sid+'&token='+this.customToken;
            } else if(data.notify.type === 'bbs'){
                ret = 'https://product.bizsquad.net/main/bbs?gid='+data.gid+'&token='+this.customToken;
            }
         }
        return ret;
        
    }



    // sendNotificationToMembers(members: any, notification: INotificationData): Promise<any[]>{
    //     const userIds = Object.keys(members).filter(uid => members[uid] === true);
    //     return this.sendNotification(userIds, notification);
    // }

    // // b.20 added. All notification entry point.
    // sendNotification(userIds: string[], notification: INotificationData): Promise<any[]>{

    //     // add default infos.
    //     if(notification['from'] == null){
    //         notification['from'] = this.bizFire.currentUID;
    //     }

    //     if(notification['sender'] == null){
    //         notification['sender'] = this.bizFire.currentUserValue;
    //     }

    //     if(notification['created'] == null){
    //         notification['created'] = new Date().getTime() / 1000 | 0;
    //     }

    //     if(notification['status'] == null){
    //         notification['status'] = 1;
    //     }

    //     // statusInfo.done === true means finished job.
    //     if(notification['statusInfo'] == null){
    //         notification['statusInfo'] = {
    //             type: notification.type, // current not used.
    //             done: false
    //         };
    //     }

    //     const pushedJob = [];
    //     userIds.forEach(uid => {
    //         notification['to'] = uid;
    //         const path = `users/${uid}/notifications`;
    //         pushedJob.push(this.bizFire.afStore.collection(path).add(notification));
    //     });

    //     if(pushedJob.length > 0){
    //         return Promise.all(pushedJob);
    //     }
    // }

    // sendUserRemovedFromSquadNotification(group: IBizGroup, squad: ISquad, user: IUser, members: any){
    //     const notify: INotificationData ={
    //         type: 'notify',
    //         notify: {
    //             info: {
    //                 team_name: group.data.team_name,
    //                 action: 'user removed from squad'
    //             },
    //             type: 'squad',
    //             who: user.data.displayName || user.data.email,
    //             what: 'exit',
    //             where: squad.data.name
    //         },
    //         gid: group.gid
    //     };
    //     this.sendNotificationToMembers(members, notify);
    // }
}