import { HttpClient } from '@angular/common/http';
import { Electron } from './../../../providers/electron/electron';
import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams,App, PopoverController } from 'ionic-angular';
import { AngularFireAuth } from '@angular/fire/auth';
import { Subject, Subscription } from 'rxjs';
import { filter, takeUntil, map } from 'rxjs/operators';
import { BizFireService, userLinks } from '../../../providers/biz-fire/biz-fire';
import { TokenProvider } from '../../../providers/token/token';
import { NotificationService } from '../../../providers/notification.service';
import {LangService} from "../../../providers/lang-service";
import {IBizGroup, INotification, IUser, IUserData} from "../../../_models";


@IonicPage({
  name: 'page-home',
  segment: 'home',
  priority: 'high'
})
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage implements OnInit {

  currentUser: IUserData;
  group: IBizGroup;
  userCustomLinks: Array<userLinks> = [];

  getFavicons = 'https://www.google.com/s2/favicons?domain=';

  // display user info
  displayName;
  fullName;

  // no bbs message value;
  noBbs : boolean = false;
  // disable setting value. icon
  manager: boolean = false;

  // logout,quit toggle bar
  menuShow : boolean = false;
  // userStatus toggle bar
  statusMenu : boolean = false;

  // notification badge visible value
  notification : INotification[];
  badgeCount : number = 0;

  messages: INotification[];

  ipc: any;

  isPartner = false;

  customToken: any;

  myStatus: any;

  private _unsubscribeAll;

  langPack: any;

  webUrl = 'https://product.bizsquad.net//auth?token=';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public electron: Electron,
    public bizFire : BizFireService,
    public afAuth: AngularFireAuth,
    private noticeService: NotificationService,
    public http: HttpClient,
    private tokenService : TokenProvider,
    public popoverCtrl :PopoverController,
    private langService : LangService,
    public _app : App) {

      this._unsubscribeAll = new Subject<any>();
      this.ipc = electron.ipc;

    this.langService.onLangMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l;
      });
  }

  ngOnInit(): void {

    this.group = this.bizFire.onBizGroupSelected.getValue();

    // * current User for RIGHT MENU
    this.bizFire.currentUser
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe(user => {
        this.currentUser = user;
        this.myStatus = user.onlineStatus;
        switch(user.onlineStatus){
          case 'online':
            this.myStatus = '#32db64';
            break;
          case 'wait':
            this.myStatus = '#FEA926';
            break;
          case 'busy':
            this.myStatus = '#f53d3d';
            break;
          case 'offline':
            this.myStatus = '#C7C7C7';
            break;
        }
        this.displayName = this.bizFire.getDiplayNameInitial();
        this.fullName = user.displayName;
    });



    this.bizFire.userCustomLinks.pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
    .subscribe((links : userLinks[]) => {
      links.forEach(link => {
        if(link){
          const newData = link.data;
          newData['hidden'] = true;
        }
      });
      this.userCustomLinks = links.sort((a,b) => {
        if(a.data.create && b.data.create) {
          return a.data.create > b.data.create ? -1 : 1;
        } else {
          return 0;
        }
      });
      console.log("userCustomLinks",this.userCustomLinks);
    });

    if(this.group){
      this.isPartner = this.bizFire.isPartner(this.group);
      this.manager = this.group.data.manager != null && this.group.data.manager[this.bizFire.currentUID] === true;
    }

    this.noticeService.onNotifications
    .pipe(
      filter(n=>n != null),takeUntil(this._unsubscribeAll))
    .subscribe((msgs: INotification[]) => {

      if(msgs){
        // get unfinished notification count.
        this.badgeCount = msgs.filter(m => {
          let ret : boolean;
          if(m.data.statusInfo.done !== true) {
            ret = m.data.gid === this.group.gid;
          } else {
            ret = false;
          }
          return ret;
        }).length;

        if(this.badgeCount > 99){ this.badgeCount = 99; }
      }

    });
}

  // profile menu toggle
  showMenu() {
    if(this.menuShow){
      this.menuShow = false;
    } else {
      this.menuShow = true;
    }
  }

  showStatus(){
    if(this.statusMenu){
      this.statusMenu = false;
    } else {
      this.statusMenu = true;
    }
  }

  changedStatus(value){
    if(this.statusMenu){
      this.statusMenu = false;
    } else {
      this.statusMenu = true;
    }
    if(value != this.myStatus)
    this.bizFire.statusChanged(value);
  }

  ngOnDestroy(): void {
    console.log("tab/home destroy?");
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
  windowClose() {
    this.electron.windowClose();
  }

  logout(){
    this.electron.resetValue();
    this.bizFire.windowCloseAndUserStatus().then(() =>{
      // 로그인 페이지에서 처리하는 값 초기화
      this.bizFire.signOut();
    });
  }

  showNotify(){
    this.navCtrl.setRoot('page-notify');
  }

  goLink(ev,link){
    this.ipc.send('loadGH',link.data.url);
  }

  presentPopover(ev): void {
    if(this.userCustomLinks.length < 8) {
      let popover = this.popoverCtrl.create('page-customlink',{}, {cssClass: 'page-customlink'});
      popover.present({ev: ev});
    }
  }

  removeLink(ev,link) {
    this.bizFire.deleteLink(link);
    console.log(link);
  }
}
