import { GroupColorProvider } from './../../../providers/group-color';
import { NotifyPage } from './../../tab/notify/notify';
import { Electron } from './../../../providers/electron/electron';
import { BizFireService,IBizGroup, Igroup } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject,combineLatest, BehaviorSubject } from 'rxjs';
import { NotificationService } from '../../../providers/notification.service';
import { INotification, INoticeItem, INotificationItem } from '../../../_models/message';
import { AlertProvider } from '../../../providers/alert/alert';
@IonicPage({  
  name: 'page-menu',
  segment: 'menu',
  priority: 'high'
})
@Component({
  selector: 'page-menu',
  templateUrl: 'menu.html',
})
export class MenuPage {

  groups: Array<IBizGroup>;
  eachGroups = {};

  // badge
  badgeVisible = false;
  badgeCount = 0;
  groupBadgeCount = 0;

  allMessages: INotification[];

  messages: INotification[];

  noNotify: boolean = false;

  isPartner = false;
  
  ipc: any;



  private _unsubscribeAll;

  isListShown : boolean = true;

  private filterGroup$ = new BehaviorSubject<IBizGroup>(null);

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    private bizFire: BizFireService,
    public electron : Electron,
    public groupColorProvider : GroupColorProvider,
    private alertCtrl : AlertProvider,
    private noticeService: NotificationService) {

      this._unsubscribeAll = new Subject<any>(); 

      this.ipc = electron.ipc;
      this.filterGroup$.next(null);
  }
  ngOnInit(): void {

    combineLatest(this.bizFire.onBizGroups,this.noticeService.onNotifications,this.filterGroup$)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(([groups,msgs,filterGroup]) => {

        this.groups = groups;
        if(msgs !== null) {
          this.allMessages = msgs;

          this.noNotify = this.allMessages.length === 0;
          this.messages = msgs;
    
          if(filterGroup != null) {
            // this.messages = msgs.filter(m => m.data.gid === filterGroup.gid && m.data.statusInfo.done !== true);
            this.messages = msgs.filter(m => m.data.gid === filterGroup.gid);
          }
  
          this.badgeCount = this.allMessages.filter(m => m.data.statusInfo.done !== true).length;
  
        }

      });
  }

  notifyFilter(group) {
    console.log(group);
    this.filterGroup$.next(group);
  }

  groupCountBadge(gid) {
    if(this.allMessages != null) {
      return this.allMessages.filter(m => m.data.gid === gid && m.data.statusInfo.done !== true).length;
    } else {
      return 0;
    }
  }
  groupNotify(gid) {
    if(this.allMessages != null) {
      if(this.allMessages.filter(m => m.data.gid === gid).length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false
    }
  }

  showAllNotify(){
    this.filterGroup$.next(null);
  }

  makeHtml(notification: INotification) {
    return this.noticeService.makeHtml(notification);
  }

  onClickNotifyContents(msg : INotificationItem){
    if(msg.data.groupInvite !== true) {
      this.noticeService.onClickNotifyContents(msg);
    }
  }

  groupInvite(msg) {

    this.alertCtrl.groupInviteAlert('Accept Invitation','Are you sure you want to join this group?',msg);

  }

  toggleList() {
    if (this.isListShown) {
      this.isListShown = false;
    } else {
      this.isListShown = true;
    }
  }

  ngOnDestroy(): void {
    this.filterGroup$.next(null);
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
