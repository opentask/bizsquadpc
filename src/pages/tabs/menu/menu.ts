import { Electron } from './../../../providers/electron/electron';
import { BizFireService,IBizGroup } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NotificationService } from '../../../providers/notification.service';
import { INotification, INotificationData } from '../../../_models/message';
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
  badgeVisible = true;
  badgeCount = 0;
  groupBadgeCount = 0;

  messages: INotification[];
  groupMessages: INotification[];
  curruntNotify: INotification;
  notifyLength = 0;
  noNotify: boolean = true;

  isPartner = false;
  
  ipc: any;

  // * COLOR
  team_color = '#5b9ced'; // default opentask blue
  team_icon = 'B';

  private _unsubscribeAll;

  isListShown : boolean = true;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    private bizFire: BizFireService,
    public electron : Electron,
    private noticeService: NotificationService) {
      this._unsubscribeAll = new Subject<any>(); 
      
      this.ipc = electron.ipc;
  }
  ngOnInit(): void {

    this.bizFire.onBizGroupSelected
    .pipe(
        filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe((group) => {
        this.isPartner = this.bizFire.isPartner(group);
    });

    // get user's bizgroup.
    this.bizFire.onBizGroups
    .pipe(filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe(bizGroups => {
        bizGroups.forEach(group => {
          if(group){
            const newData = group.data;
            newData['gid'] = group.gid;
            newData['group_squads'] = 0;
            newData['group_members'] = Object.keys(group.data.members).length;
            newData['team_color'] = group.data.team_color || this.team_color;
            
            if(group.data.team_name == null || group.data.team_name.length === 0 ){
              newData['team_icon'] = 'BG';
            } else {
                let count = 2;
                if(group.data.team_name.length === 1){
                    count = 1;
                }
                newData['team_icon'] = group.data.team_name.substr(0, count);
            }
            // get group_squads number
            this.bizFire.afStore.firestore.collection(`bizgroups/${group.gid}/squads`).get().then(snap => {
              newData['group_squads'] = snap.docs.length;
            });
          }
        });
        this.groups = bizGroups;
    });

    // get number of unfinished notices.
    this.noticeService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((msgs:INotification[]) => {
        // get unfinished notification count.
        this.messages = msgs;
        this.badgeCount = this.messages.filter(m => m.data.statusInfo.done !== true).length;
        if(this.badgeCount > 0){
          this.noNotify = false;
        }
        this.badgeVisible = this.badgeCount > 0;
        this.messages.forEach((m: INotification) => {
          m['text'] = this.noticeService.makeDisplayString(m.data);
          m['path'] = this.noticeService.makeJumpPath(m.data);
        });
        this.makeEachGroup();
    });

    this.bizFire.onUserSignOut.subscribe(()=>{
      this.messages = [];
    });
  }

  private makeEachGroup(){
    this.eachGroups = {};
    if(this.groups != null && this.messages != null){
      console.log(this.messages);
      this.messages.forEach(m => {
        if(this.eachGroups[m.data.gid] == null){
          this.eachGroups[m.data.gid] = [];
        }
        this.eachGroups[m.data.gid].push(m);
      })
    };
  }

  toggleList() {
    if (this.isListShown) {
      this.isListShown = false;
    } else {
      this.isListShown = true;
    }
  }
  showNotify(group) {

    // 그룹 전체보기 숨김.
    if(!this.isListShown)
    this.isListShown = true;
    // get number of unfinished notices.
    this.noticeService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((msgs:INotification[]) => {
        // get unfinished notification count.
        this.messages = msgs.filter(m => m.data.gid === group.gid);
        this.groupBadgeCount = this.messages.filter(m => m.data.statusInfo.done !== true).length;
        if(this.groupBadgeCount > 0){
          this.noNotify = false;
        }
    });
  }

  clickNotify(msg){
    console.log(msg);
    // 웹페이지로 이동. 여기에 작성

  }
  showAllNotify(){
    // get number of unfinished notices.
    this.noticeService.onNotifications
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((msgs:INotification[]) => {
        this.messages = msgs;
    });
  }

  jumpWeb(msg){
    console.log(msg);
  }
  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
