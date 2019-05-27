import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { INotification, IAlarmConfig } from '../_models/message';
import { BizFireService } from './biz-fire/biz-fire';
import { IFireDataKey, IFireMessage } from '../classes/fire-model';
import { FireData } from '../classes/fire-data';
import { FireDataKey } from '../classes/fire-data-key';
import { takeUntil } from 'rxjs/operators';
import { Commons } from '../biz-common/commons';

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
    
    // alarm send by SettingComponent
    onAlarmChanged = new Subject<IAlarmConfig>();
    
    // data 가 FireData에서오면 푸쉬
    private _notification = new Subject<INotification[]>();
    
    /*
    * 데이터 일부만 실시간 경신하기 위해 FireData를 사용한다.
    * */
    private fireData = new FireData();
    private notifyKey: IFireDataKey;

    constructor(private bizFire: BizFireService) {

        // wait for notify data changed.
        this.fireData.onMessageChanged.subscribe((message: IFireMessage) => {
            if(this.notifyKey && this.notifyKey.isEqualKey(message.key)){
                
                // notify message changed.
                //console.log(message.data);
                
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
        
            // start register at first time. ONLY first time.
            if(this.notifyKey == null){
                this.notifyKey = new FireDataKey('notify', this.bizFire.currentUID);
            }
        
            // start new alarm ONLY first time.
            if(this.fireData.has(this.notifyKey) === false) {
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
            }
            
            
            // find alarm from /user/<>.alarm
            let alarm: IAlarmConfig = user.alarm;
            
            if(alarm == null){
                // set to default
                alarm = {all: true, groupInvite: true, squadInOut: true, squadInvite: true, schedule: true, post: true,
                    comment: true, bbs: true};
                
                // and update firebase
                this.updateAlarmStatus(alarm);
            
            } else {
                // alarm info changed.
                this.onAlarmChanged.next(alarm);
            }
            
        });

        combineLatest(this._notification, this.onAlarmChanged)
        //.pipe(filter(([n, l, a]) => a!=null))
          .subscribe(([msgs, alarm]) => {
            
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
        });
    }

    updateAlarmStatus(alarm: IAlarmConfig) {
        return this.bizFire.afStore.doc(Commons.userPath(this.bizFire.currentUID)).update({
          alarm: alarm
        });
    }

}