import { App } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { IUserData } from './../../_models/message';
import { User } from 'firebase';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { filter, takeUntil } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { InitProcess } from './init-process';
import firebase from 'firebase';
import { LangService } from '../../biz-common/lang-service';
import { STRINGS } from '../../biz-common/commons';
import { AngularFireStorage } from '@angular/fire/storage';

export interface IUserState {
  status:'init'|'signIn'|'signOut',
  user: User,
  autoSignIn: boolean
}
 
export interface IBizGroup {
    gid: string,
    data: {
            manager: any,
            members: any,
            partners?: any,
            status?: number,
            team_color?: string,
            team_description?: string,
            team_name?: string,
            team_id?: string,
            manageInfo?: {
                password: string
            },
            created?: number,
            photoURL?: string,
            team_icon?: string,
            group_members?: number,
            general_squad_count?: number,
            agile_squad_count?: number,
            notifyLength?: Number,
            badgeVisible?: boolean,
        }
}
export interface Igroup {
    created?: number,
    manageInfo?: {
        password: string
    },
    manager: any,
    members: any,
    photoURL?: string,
    status?: number,
    team_color?: string,
    team_description?: string,
    team_id?: string,
    team_name?: string,
}

@Injectable({
    providedIn: 'root'
})


export class BizFireService {

  //--------------------------------------------//
  // BUILD No 18.
  //--------------------------------------------//

  private initProcess: InitProcess;


  // * one and only login feature.
  // * Do not use BehaviorSubject
  public _authState: BehaviorSubject<any>;
  get authState(): Observable<IUserState| null > {
      return this._authState.asObservable();
  }

  // * Push only user logged out.
  onUserSignOut: Subject<boolean>;

  // ** current fireStore User
  get currentUID(): string | undefined {
      let ret;
      if(this.afAuth.auth.currentUser){
          ret = this.afAuth.auth.currentUser.uid;
      } else {
          console.error(`currentUID requested but afAuth.auth.currentUser is ${this.afAuth.auth.currentUser}`);
      }
      return ret;
  }
  // * Firestore data + auth.currentUser data.*
  private _currentUser = new BehaviorSubject<IUserData>(null);

  get currentUser(): Observable<IUserData>{
      return this._currentUser.asObservable().pipe(filter(u=>u!=null));
  }

  get currentUserValue(): IUserData {
      return this._currentUser.getValue();
  }


  // * Biz Groups
  onBizGroupSelected = new BehaviorSubject<IBizGroup>(null);
  onBizGroups = new BehaviorSubject<IBizGroup[]>(null);
  generalMembers = new BehaviorSubject<number>(null);;

  // !! web .ver metaData 생략 !!


  public bizGroupSub;
  public userState: IUserState = {status:'init', user: null, autoSignIn: true};

  //-----------------------------------------------------------------------------//
  // LangService:
  // Usage: bizFire.onLang().subscribe(l => l.pack('squad'))
  //-----------------------------------------------------------------------------//
  private _lang = new LangService();
  

  _onLang = new BehaviorSubject<LangService>(null);
  get lang(): LangService {
      return this._lang;
  }
  get onLang(): Observable<LangService>{
      return this._onLang.asObservable().pipe(filter(g => g!=null));
  }


  constructor(
    public afAuth: AngularFireAuth,
    public afStore: AngularFirestore,
    public afStorage: AngularFireStorage,
    public _app : App
    ) {
        
        this.onUserSignOut = new Subject<boolean>();

        this._lang.setLanguage('en'); // load default language.
        this._onLang.next(this._lang);

        this.initProcess = new InitProcess(this.afStore);

        // one and only
        this._authState = new BehaviorSubject<any>(this.userState);


        // *
        this.afAuth.authState.subscribe((user: User | null) => {

          console.log('authState', user);

          if(user){
              if(this.bizGroupSub){
                  this.bizGroupSub();
                  this.bizGroupSub = null;
              }
              this.startBizGroupMonitor(user);
              // ------------------------------------------------------------------
              // * update user info.
              // ------------------------------------------------------------------
              this.initProcess.start(user).then( ()=> {
                  // start trigger after update login date.
                  this.afStore.doc(`users/${user.uid}`).valueChanges()
                      .pipe(takeUntil(this.onUserSignOut))
                      .subscribe((currentUser: any) => {
                          // multicast current user.
                          this._currentUser.next(currentUser as IUserData);
                      });
                  // update state
                  this.userState.user = user;
                  this.userState.status = 'signIn';
                  this._authState.next(this.userState);
              });
          } else {
              // * start load bizGroups
              if(this.bizGroupSub){
                  this.bizGroupSub();
                  this.bizGroupSub = null;
              }
            }
        });
    }

  loginWithEmail(email: string, password: string): Promise<User> {
    return new Promise<any>( (resolve, reject) => {
        // * SET autoSignIn false
        this.userState.autoSignIn = false;

        this.afAuth.auth.signInWithEmailAndPassword(email, password).then(user => {
            resolve(user);
        }).catch(err => {
            // reset to original. needed?
            this.userState.autoSignIn = true;
            console.error(err);
            reject(err);
        });
    })
  }

  getDiplayNameInitial(count = 2, user: IUserData = null): string {

    let ret = null;
    if(user === null){
        user = this._currentUser.getValue();
    }
    if(user != null){
        ret = user['displayName'];

        if(ret == null || ret.length === 0){
            ret = user['user_name'];
        }
        if(ret == null || ret.length === 0){
            ret = user['user_visible_lastname'];
        }
        if(ret == null || ret.length === 0){
            ret = user['email'];
        }
    }

    if(ret && ret.length === 0){
        ret = 'U';
    }
    if(ret && ret.length > count -1){
        ret = ret.substr(0, count);
    }

    if(ret === null){
        ret = 'U';
    }
    return ret;
  }

  private startBizGroupMonitor(user) {
    // * start load bizGroups
    let ref: firebase.firestore.CollectionReference | firebase.firestore.Query;
    ref = this.afStore.firestore.collection(STRINGS.STRING_BIZGROUPS);
    let superUser = false;
    if(user && user.type != null) {
        superUser = user.type['super'] === true;
    }
    if(superUser){
        // if already monitored, get new monitor.
        if(this.bizGroupSub){
            this.bizGroupSub();
            this.bizGroupSub = null;

            this.bizGroupSub = ref.onSnapshot(groupsSnap => {
                const groups = groupsSnap.docs.map(doc => {
                    return {data:doc.data(), gid:doc.id} as IBizGroup;
                });
                this.onBizGroups.next(groups);
            }, error1 => console.error(error1));
        }
    } else {

        // * this is a normal user.
        // if not monitored, get new one.
        if(this.bizGroupSub == null){
            // filter user.uid's group.
            ref = ref.where(new firebase.firestore.FieldPath('members', user.uid), '==', true);

            this.bizGroupSub = ref.onSnapshot(groupsSnap => {
                const groups = groupsSnap.docs.filter(d => {
                    // filter status 0 group
                    return d.get('status') !== 0;

                }).map(doc => {
                    return {data:doc.data(), gid:doc.id} as IBizGroup;
                });

                // add default value if not exists.
                groups.forEach(g => {
                //    if(g.data.team_color == null) {
                //        g.data.team_color = '#5B9CED'; // set to opentask color.
                //    }
                //    if(g.data.team_icon == null) {
                //        if(g.data.team_name != null && g.data.team_name.length > 1){
                //            g.data.team_icon = g.data.team_name.substr(0, 2);
                //        }
                //    }
                });
                this.onBizGroups.next(groups);
            }, error1 => console.error(error1));
        } else {
            // * no nothing.
        }
    }
  }

    isPartner(group?: IBizGroup): boolean{
        if(group == null){
            group = this.onBizGroupSelected.value;
        }
        if(group != null){
            return group.data.partners != null && group.data.partners[this.currentUID] === true;
        } else {
            return false;
        }
    }
    signOut(navigateToLoginWhenDone = true): Promise<boolean>{
        console.log('BizFireService.signOut()');

        if(this.userState.status === 'signIn'){
            // yes.
            if(this.bizGroupSub){
                this.bizGroupSub();
                this.bizGroupSub = null;
            }
            this.userState.user = null;
            this.userState.status = 'signOut';
            this._authState.next(this.userState);

            // * called ONLY user signed Out from signIn.
            this.onUserSignOut.next(true);

            // clear bizgroups
            this.onBizGroups.next(null);
        }
        return this.afAuth.auth.signOut().then(()=> {
            if(navigateToLoginWhenDone){
                return this._app.getRootNav().setRoot('page-login');
            } else {
                return new Promise<any>(resolve => resolve(true));
            }
        });
    }

  

  editUserProfile(editData) {
    if(editData){
        return this.afStore.doc(`users/${this.currentUID}`).set({
            displayName : editData.displayName,
            phoneNumber : editData.phoneNumber
        }, {merge: true})
    }
  }
  videoCallSuccess(){
    return this.afStore.doc(`users/${this.currentUID}`).set({
        videoCall : ''
      }, {merge: true})
  }
  getUserOnlineStatus() {
    return this.afStore.doc(`users/${this.currentUID}`).set({
      onlineStatus : 'offline'
    }, {merge: true})
  }
  setUserOnlineStatus() {
      this.afStore.doc(`users/${this.currentUID}`).update({
        onlineStatus : 'online'
    })
  }
  windowCloseAndUserStatus() {
    return this.afStore.doc(`users/${this.currentUID}`).update({
        onlineStatus : 'offline'
    })
  }
  statusChanged(value) {
    return this.afStore.doc(`users/${this.currentUID}`).update({
        onlineStatus : value
    })
  }

  
  
}