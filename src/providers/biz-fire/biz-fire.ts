import {App} from 'ionic-angular';
import { Injectable } from '@angular/core';
import { User } from 'firebase';
import { Observable, BehaviorSubject, Subject, Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { filter, takeUntil, map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { InitProcess } from './init-process';
import firebase from 'firebase';
import { STRINGS, Commons } from '../../biz-common/commons';
import { AngularFireStorage } from '@angular/fire/storage';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { FireDataKey } from '../../classes/fire-data-key';
import { FireData } from '../../classes/fire-data';
import { LangService } from '../lang-service';
import {IBizGroup, INotificationData, INotificationItem, IUserData} from "../../_models";
import {BizGroupBuilder} from "../../biz-common/biz-group";

export interface IUserState {
  status:'init'|'signIn'|'signOut',
  user: User,
  autoSignIn: boolean
}

export interface userLinks {
    mid: string,
    data: {
        create: string,
        img : string,
        title : string,
        url : string,
    }
}

@Injectable({
    providedIn: 'root'
})


export class BizFireService {

  //--------------------------------------------//
  // BUILD No 55.
  //--------------------------------------------//

  buildNo = '55';

  ipc: any;

  // * Push only user logged out.
  onUserSignOut: Subject<boolean>;

  get takeUntilUserSignOut(){
    return takeUntil(this.onUserSignOut);
  }

  // ** current fireStore User
  get currentUID(): string | undefined {
      let ret;
      if(this.afAuth.auth.currentUser){
          ret = this.afAuth.auth.currentUser.uid;
      }
      return ret;
  }

  // * Firestore data + auth.currentUser data.*
  private currentUserSubscription: Subscription;
  private _currentUser = new BehaviorSubject<IUserData>(null);

  get currentUser(): Observable<IUserData>{
      return this._currentUser.asObservable().pipe(filter(u=>u!=null));
  }

  get currentUserValue(): IUserData {
      return this._currentUser.getValue();
  }

  userCustomLinks = new BehaviorSubject<userLinks[]>(null);

  get _userCustomLinks(): userLinks[] {
    return this.userCustomLinks.getValue();
  }

  _userCustomToken = new BehaviorSubject<string>(null);

  // * Biz Groups
  get currentBizGroup(): IBizGroup {
    return this.onBizGroupSelected.getValue();
  }
  get uid(): string | null {
    return this.currentUID;
  }

  onBizGroupSelected = new BehaviorSubject<IBizGroup>(null);
  onBizGroups = new BehaviorSubject<IBizGroup[]>(null);
  generalMembers = new BehaviorSubject<number>(null);

  // !! web .ver metaData 생략 !!


  public bizGroupSub;
  public userState: IUserState = {status:'init', user: null, autoSignIn: true};

  readonly fireData = new FireData();

  _onLang = new BehaviorSubject<LangService>(null);
  get onLang(): Observable<LangService>{
    return this._onLang.asObservable().pipe(
      filter(g => g!=null )
    );
  }


  constructor(
    public afAuth: AngularFireAuth,
    public afStore: AngularFirestore,
    public afStorage: AngularFireStorage,
    private http: HttpClient,
    private _lang: LangService,
    public _app : App
    ) {

        this.onUserSignOut = new Subject<boolean>();

        this._lang.onLangMap.subscribe( (totalLanguageMap: any) => {
          // resolved when load lang.ts finished.
          this._onLang.next(this._lang);
        });

        // *
        this.afAuth.authState.subscribe(async (user: firebase.User | null) => {

            // unsubscribe old one for UserData
            if(this.currentUserSubscription != null){
                this.currentUserSubscription.unsubscribe();
                this.currentUserSubscription = null;
            }

            if(user){

                // ------------------------------------------------------------------
                // * update user info.
                // ------------------------------------------------------------------

                const initProcess = new InitProcess(this.afStore);
                await initProcess.start(user);

                if(this._userCustomLinks == null) {
                  this.getCustomLinks(user.uid);
                }

                if(this.bizGroupSub){
                    this.bizGroupSub();
                    this.bizGroupSub = null;
                }
                this.startBizGroupMonitor(user);


                // start trigger after update login date.
                this.currentUserSubscription = this.afStore.doc(Commons.userPath(user.uid))
                .snapshotChanges()
                .pipe(takeUntil(this.onUserSignOut))
                .subscribe((snapshot: any) => {

                    const userData = snapshot.payload.data();
                    //console.log('currentUser data', userData, 'loaded');

                    // load language file with current user's code
                    this._lang.loadLanguage(userData.language); // resolve onLangMap()

                    // multicast current user.
                    this._currentUser.next(userData as IUserData);
                });

            } else {
                // clear current users' data
                if(this._currentUser.getValue() == null){
                    this._currentUser.next(null);
                }
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
          firebase.database().goOnline();
        }).catch(err => {
            // reset to original. needed?
            this.userState.autoSignIn = true;
            console.error(err);
            reject(err);
        });
    })
  }

  getCustomLinks(uid) {
    this.afStore.collection(`users/${uid}/customlinks`)
      .snapshotChanges().pipe(takeUntil(this.onUserSignOut))
      .subscribe(snaps => {
        const links = snaps.map(snap => {
          return {mid: snap.payload.doc.id, data: snap.payload.doc.data()} as userLinks;
        });
        this.userCustomLinks.next(links);
      });
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

    if(this.bizGroupSub == null) {
      ref = ref.where(new firebase.firestore.FieldPath('members', user.uid), '==', true);

      this.bizGroupSub = ref.onSnapshot(groupsSnap => {
          const groups = groupsSnap.docs.filter(d => {

              return d.get('status') !== false;

          }).map(doc => {
              return {data:doc.data(), gid:doc.id} as IBizGroup;
          });
          this.onBizGroups.next(groups);
      },error1 => console.error(error1));
    }
  }

    isPartner(group?: IBizGroup): boolean {
        if(group == null){
            group = this.onBizGroupSelected.value;
        }
        if(group != null){
            return group.data.partners != null && group.data.partners[this.currentUID] === true;
        } else {
            return false;
        }
    }

    isManager(uid: string) : boolean {
        let group : IBizGroup;
        if(this.onBizGroupSelected.value) {
            group = this.onBizGroupSelected.value;
            if(group.data.manager[uid] != null) {
                return group.data.manager[uid] === true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    signOut(): Promise<boolean> {

        this._currentUser.next(null);
        firebase.database().goOffline();

        // yes.
        if(this.bizGroupSub){
            this.bizGroupSub();
            this.bizGroupSub = null;
        }
        this.userState.user = null;
        this.userState.status = 'signOut';

        // * called ONLY user signed Out from signIn.
        this.onUserSignOut.next(true);

        // clear bizgroups
        this.onBizGroups.next(null);

        // clear bookmark
        this.userCustomLinks.next(null);

        this._userCustomToken.next(null);

        return this.afAuth.auth.signOut().then(()=> {

          // clear cache.
          const mine = new FireDataKey('groups', this.currentUID);
          this.fireData.unregister(mine);

          return this._app.getRootNav().setRoot('page-login');

        });
    }


  async onSelectGroup(gid) : Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.afStore.collection(STRINGS.USERS).doc(this.currentUID).update({
        lastPcGid: gid
      });

      this.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${gid}`)
      .valueChanges().subscribe((doc) => {

        const group : IBizGroup = BizGroupBuilder.buildWithData(gid,doc,this.uid);

        if(group.data.members[this.currentUID] === true && group.data.status === true) {
          this.onBizGroupSelected.next(group);

          resolve(true);
        } else {
          resolve(false);
        }
      })

    })
  }

  async setReadNotify(item : INotificationItem): Promise<boolean> {
    const notification : INotificationData = item.data;
    return new Promise<boolean>(async resolve => {
        if(notification.statusInfo != null){
            if(notification.statusInfo.done !== true) {
                //읽음 상태로 바꾼다.
                await this.afStore.collection(Commons.notificationPath(this.currentUID)).doc(item.mid).update({
                    statusInfo: {
                        done: true
                    }
                }).then(() => resolve(true))
            } else {
                resolve(false);
            }
        } else {
            resolve(false);
        }
    })
  }



  editUserProfile(editData) {
    if(editData){
        return this.afStore.doc(`users/${this.currentUID}`).set({
            displayName : editData.displayName,
            phoneNumber : editData.phoneNumber
        }, {merge: true})
    }
  }

  deleteLink(link){
      return this.afStore.collection(`users/${this.currentUID}/customlinks`).doc(link.mid).delete();
  }

}
