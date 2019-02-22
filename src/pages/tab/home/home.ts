import { Electron } from './../../../providers/electron/electron';
import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams,App } from 'ionic-angular';
import { AngularFireAuth } from '@angular/fire/auth';
import { Subject, Subscription, of } from 'rxjs';
import { IUserData, IUser } from '../../../_models/message';
import { filter, takeUntil, switchMap, map } from 'rxjs/operators';
import { IBizGroup,BizFireService } from '../../../providers/biz-fire/biz-fire';
import { SquadService } from '../../../providers/squad.service';
import { AccountService } from '../../../providers/account/account';
import { STRINGS } from '../../../biz-common/commons';
import { database } from 'firebase';
import { Http } from '@angular/http';

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

  jj = "koko"
  // disable setting value. icon 
  manager: boolean = false;

  // logout,quit toggle bar
  menuShow : boolean = false;

  ipc: any;

  isPartner = false;

  token: any;

  private _unsubscribeAll;

  private nameMargins: Subscription[] = []; // margin name arrays.

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron: Electron,
    public bizFire : BizFireService,
    public afAuth: AngularFireAuth,
    private squadService: SquadService,
    private accountService: AccountService,
    public http: Http,
    public _app : App) {
      
      this._unsubscribeAll = new Subject<any>();
      this.ipc = electron.ipc;
  }

  ngOnInit(): void {
    // * current User for RIGHT MENU
    this.bizFire.currentUser
      .pipe(filter(d=>d!=null), takeUntil(this._unsubscribeAll))
      .subscribe(user => {
          this.currentUser = user;
          this.displayName = this.bizFire.getDiplayNameInitial();
          this.fullName = user.displayName;
          
          this.http.get('https://asia-northeast1-bizsquad-6d1be.cloudfunctions.net/customToken?authorization='+ this.currentUser.uid)
          .subscribe((data) => {
            console.log("tokenData",data);
            this.token = data.json().customToken;
          })
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

      // 1) onBizGroupSelected find.
      this.bizFire.onBizGroupSelected
      .pipe(filter(g => g!=null), takeUntil(this._unsubscribeAll),
          switchMap(group => {
              this.group = group;
              const path = `${STRINGS.STRING_BIZGROUPS}/${group.gid}/bbs`;
              return this.bizFire.afStore.collection(path, ref=> ref.orderBy('created', 'desc').limit(4))
                  .snapshotChanges()
              //.pipe(takeUntil(this._unsubscribeAll)) // no need.
          }))
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

}

  // profile menu toggle
  showMenu() {
    if(this.menuShow){
      this.menuShow = false;
    } else {
      this.menuShow = true;
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
  windowClose() {
    this.bizFire.windowCloseAndUserStatus().then(() => {
      this.electron.windowClose();
    });
  }
  // 프로필 편집
  profileSetting(){
    
  }

    /*
    * Sign Out
    * navigateToLoginWhenDone: For dev. Just signout only.
    * */
  signOut(navigateToLoginWhenDone = true): Promise<boolean> {
    if(this.bizFire.userState.status === 'signIn') { // old status was 'signIn'

      this.bizFire.windowCloseAndUserStatus();
      if(this.bizFire.bizGroupSub)
      {
        this.bizFire.bizGroupSub();
        this.bizFire.bizGroupSub = null;
      }
      this.bizFire.userState.user = null;
      this.bizFire.userState.status = 'signOut';
      this.bizFire._authState.next(this.bizFire.userState);

      // * called ONLY user signed Out from signIn.
      this.bizFire.onUserSignOut.next(true);

      // clear bizgroups
      this.bizFire.onBizGroups.next([]);
    }
    return this.afAuth.auth.signOut().then(()=> {
        this.electron.resetValue();
        if(navigateToLoginWhenDone) {
          return this._app.getRootNav().setRoot('page-login');
        } else {
            return new Promise<any>(resolve => resolve(true));
        }
    });
  }

}
