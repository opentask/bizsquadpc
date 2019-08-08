import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { NotificationService } from '../../../providers/notification.service';
import { Subject, zip, Observable } from 'rxjs';
import { INoticeItem, INotification, INotificationData, INotificationItem, IUser } from '../../../_models/message';
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

  messages: INotification[];
  newMessages: INotification[];

  ipc: any;

  jumpPath = '';

  noNotify: boolean = false;

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

    this.noticeService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe(msgs => {

      if(msgs !== null) {
        this.noNotify = msgs.length === 0;

        this.messages = msgs.filter(m => m.data.gid === this.bizFire.onBizGroupSelected.getValue().gid);
  
        console.log("messages",this.messages);
      }
    });

  }

  makeHtml(notification: INotification) {
    return this.noticeService.makeHtml(notification);
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
  }

  msginfo(msg,item){
    console.log(msg,item);
  }
}
