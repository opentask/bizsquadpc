import { GroupColorProvider } from './../../../providers/group-color';
import { NotifyPage } from './../../tab/notify/notify';
import { Electron } from './../../../providers/electron/electron';
import { BizFireService,IBizGroup, Igroup } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject,combineLatest, BehaviorSubject } from 'rxjs';
import { NotificationService } from '../../../providers/notification.service';
import { INotification, INoticeItem } from '../../../_models/message';
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
    private noticeService: NotificationService) {
      this._unsubscribeAll = new Subject<any>(); 
      this.ipc = electron.ipc;
  }
  ngOnInit(): void {

    combineLatest(this.bizFire.onBizGroups,this.noticeService.onNotifications,this.filterGroup$)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(([groups,msgs,filterGroup]) => {

        this.groups = groups;
        this.allMessages = msgs;
  
        if(filterGroup !== null) {
          this.messages = msgs.filter(m => m.data.gid === filterGroup.gid && m.data.statusInfo.done !== true);
        } else {
          this.messages = msgs.filter(m => m.data.statusInfo.done !== true);
        }

        this.badgeCount = this.allMessages.length;
        this.noNotify = this.badgeCount === 0;

        // this.makeEachGroup(this.messages);
        console.log("combineLatest : [groups,msgs]",groups,msgs);
        console.log("filter_gid", filterGroup);

      });
  }

  notifyFilter(group) {
    console.log(group);
    this.filterGroup$.next(group);
  }

  groupCountBadge(gid) {
    return this.allMessages.filter(m => m.data.gid === gid).length;
  }

  showAllNotify(){
    this.filterGroup$.next(null);
  }

  makeHtml(notification: INotification) {
    return this.noticeService.makeHtml(notification);
  }

  onClickNotifyContents(msg){
    this.noticeService.onClickNotifyContents(msg);
  }

  toggleList() {
    if (this.isListShown) {
      this.isListShown = false;
    } else {
      this.isListShown = true;
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.filterGroup$.next(null);
  }

}
