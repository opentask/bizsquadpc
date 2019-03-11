import { Electron } from './../../../providers/electron/electron';
import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams,App } from 'ionic-angular';
import { AngularFireAuth } from '@angular/fire/auth';
import { Subject, Subscription, of } from 'rxjs';
import { IUserData, IUser } from '../../../_models/message';
import { filter, takeUntil, switchMap, map } from 'rxjs/operators';
import { IBizGroup,BizFireService } from '../../../providers/biz-fire/biz-fire';
import { SquadService } from '../../../providers/squad.service';
import { STRINGS } from '../../../biz-common/commons';
import { Http } from '@angular/http';
import { TokenProvider } from '../../../providers/token/token';

interface IBbsItem {
  bbsId: string,
  data: {
      title: string,
      sender?: { 
        displayName?: string,
        email?: string,
      },
      created?: number,
      read?: boolean,
      senderName?: string,
  }
}

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
  allCollectedUsers: IUser[];
  
  messages: IBbsItem[];

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

  ipc: any;

  isPartner = false;

  customToken: any;

  myStatus: any;

  private _unsubscribeAll;

  private nameMargins: Subscription[] = []; // margin name arrays.

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron: Electron,
    public bizFire : BizFireService,
    public afAuth: AngularFireAuth,
    private squadService: SquadService,
    public http: Http,
    private tokenService : TokenProvider,
    public _app : App) {
      
      this._unsubscribeAll = new Subject<any>();
      this.ipc = electron.ipc;

      this.customToken = this.tokenService.customToken;
  }

  ngOnInit(): void {
    // 토큰 저장
    this.customToken = this.tokenService.customToken;

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

      this.bizFire.onBizGroupSelected
      .pipe(filter(d=>d!=null),
          switchMap(group => {
              //* have group changed?
              let reloadGroup = true;
              if(this.group != null){
                  reloadGroup = this.group.gid !== group.gid;
              }
              this.group = group;
              this.isPartner = this.bizFire.isPartner(group);

              // bbs 가져오기
              const path = `${STRINGS.STRING_BIZGROUPS}/${group.gid}/bbs`;
              this.bizFire.afStore.collection(path, ref=> ref.orderBy('created', 'desc').limit(4)).snapshotChanges()
                .pipe(takeUntil(this._unsubscribeAll), takeUntil(this.bizFire.onUserSignOut),
                map(docs => {
                    return docs.map(s => ({bbsId: s.payload.doc.id, data: s.payload.doc.data()} as IBbsItem));
                }))
                .subscribe(msgs => {
                    msgs.forEach(msg =>{
                      if(msg){
                        if(msg.data.sender && msg.data.sender.displayName){
                          msg.data.senderName = msg.data.sender.displayName;
                        } else{
                          msg.data.senderName = msg.data.sender.email;
                        }
                      }
                    })
                    if(msgs.length == 0 || msgs == null){
                      this.noBbs = true;
                    } else if (msgs.length > 0 || msgs != null){
                      this.noBbs = false;
                    }
                    this.messages = msgs;
                    console.log(this.messages);
                });
              console.log(this.group);
              // is me a manager?
              this.manager = this.group.data.manager != null &&
              this.group.data.manager[this.bizFire.currentUID] === true;
              console.log(this.manager);

              // ----------------------------------------------------------------------------//
              if(reloadGroup === true){
                  // group squads reloading...
                  return this.squadService.getMySquadLisObserver(this.group.gid);
              } else {
                  // gid not changed.
                  return of(null);
              }
              // ----------------------------------------------------------------------------//
          }),
          takeUntil(this._unsubscribeAll),
        filter(l => l != null) // prevent same group reloading.
      ).subscribe(list => {
        console.log('squad list reloaded', list);
        this.squadService.onSquadListChanged.next(list);
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

  changedStatus(e){
    if(this.statusMenu){
      this.statusMenu = false;
    } else {
      this.statusMenu = true;
    }
    console.log(e.target.innerText);
    if(e.target.innerText != this.myStatus && e.target.innerText)
    this.bizFire.statusChanged(e.target.innerText);
  }

  ngOnDestroy(): void {
    console.log("tab/home destroy?")
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
  windowClose() {
    this.bizFire.windowCloseAndUserStatus().then(() => {
      this.electron.windowClose();
    });
  }

  logout(){
    this.bizFire.windowCloseAndUserStatus().then(() =>{
      this.bizFire.signOut();
    });
  }
 
  showNotify(){
    this.navCtrl.setRoot('page-notify');
  }

}
