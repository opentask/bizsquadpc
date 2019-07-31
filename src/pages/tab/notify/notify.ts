import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { NotificationService } from '../../../providers/notification.service';
import { Subject, zip } from 'rxjs';
import { INoticeItem, INotification, INotificationData } from '../../../_models/message';
import { BizFireService } from '../../../providers/biz-fire/biz-fire';
import { Electron } from './../../../providers/electron/electron';
import { DataCache } from '../../../classes/cache-data';
import { filter, takeUntil } from 'rxjs/operators';
import { FireDataKey } from '../../../classes/fire-data-key';
import { Commons } from '../../../biz-common/commons';
import { GroupColorProvider } from '../../../providers/group-color';


@IonicPage({  
  name: 'page-notify',
  segment: 'notify',
  priority: 'high'
})
@Component({
  selector: 'page-notify',
  templateUrl: 'notify.html',
})
export class NotifyPage {

  private _unsubscribeAll;

  messages: INoticeItem[];

  ipc: any;

  jumpPath = '';

  noNotify: boolean = true;

  groupMainColor: string;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron : Electron,
    private noticeService: NotificationService,
    private bizFire: BizFireService,
    private groupColorProvider : GroupColorProvider
    ) {

      this.ipc = electron.ipc;
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {

    this.groupMainColor = this.groupColorProvider.makeGroupColor(this.bizFire.onBizGroupSelected.getValue().data.team_color);

    this.noticeService.onNotifications
    .pipe(filter(n => n!=null),takeUntil(this._unsubscribeAll))
    .subscribe((msgs: INotification[]) => {
      let groupMsg;
      groupMsg = msgs.filter(m => {
        let ret;
        if(m.data.type === 'invitation') {
          if(m.data.invitation.type === 'group') {
              return true;
            } else {
              ret = m.data.invitation.gid == this.bizFire.onBizGroupSelected.getValue().gid; 
            }
          }
          if(m.data.type === 'notify') {
            ret = m.data.notify.gid == this.bizFire.onBizGroupSelected.getValue().gid;
          }
          return ret;
        })
        this.messages = groupMsg.map((m: INotification) => this.noticeService.makeMessage(m));
        if(this.messages.length > 0){
          this.noNotify = false;
        } else {
          this.noNotify = true;
        }
        console.log("가공된 메세지(전체)", this.messages)
        
    });
  }

  clickNotify(msg){
    console.log(msg)
  }

  onClickNotifyContents(msg){
    this.noticeService.onClickNotifyContents(msg);
  }



  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    
    this.noticeService.dataCache.clear();
  }
}
