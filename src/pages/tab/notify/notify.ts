import { Component, Input } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { NotificationService } from '../../../providers/notification.service';
import { takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { INotification } from '../../../_models/message';
import { IBizGroup, BizFireService } from '../../../providers/biz-fire/biz-fire';
import { Electron } from './../../../providers/electron/electron';

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
  currentGroup: IBizGroup;

  ipc: any;

  jumpPath = '';

  groupBadgeCount = 0;

  noNotify: boolean = true;

  isPartner = false;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron : Electron,
    private noticeService: NotificationService,
    private bizFire: BizFireService,
    ) {

      this.ipc = electron.ipc;
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {

    this.bizFire.onBizGroupSelected
    .pipe(
        filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe((group) => {
        //console.log('onBizGroupSelected', group.gid);
        // set selected group to
        this.currentGroup = group;
        this.isPartner = this.bizFire.isPartner(group);

    });


    // get number of unfinished notices.
    this.noticeService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((msgs:INotification[]) => {
        // get unfinished notification count.
        this.messages = msgs.filter(m => m.data.gid === this.currentGroup.gid);

        this.groupBadgeCount = this.messages.filter(m => m.data.statusInfo.done !== true).length;
        if(this.groupBadgeCount > 0){
          this.noNotify = false;
        }
        this.messages.forEach((m: INotification) => {
          m['text'] = this.noticeService.makeDisplayString(m.data);
          m['path'] = this.noticeService.makeJumpPath(m.data);
        });
    });
  }

  clickNotify(msg){
    console.log(msg)
  }
}
