import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { IUser } from './../../_models/message';
import { BizFireService } from './../biz-fire/biz-fire';
import { takeUntil } from 'rxjs/operators';

@Injectable()
export class AccountService {

  private userObserverMap:{[uid: string]: BehaviorSubject<any>} = {};

  constructor(private bizFire: BizFireService) {
    this.bizFire.onUserSignOut.subscribe(()=>{
        //clear all map.
         Object.keys(this.userObserverMap).forEach(obj => {
             this.userObserverMap[obj].complete();
         });
         this.userObserverMap = {};

         this.userObserverMap = {};
     });
  }


    getUserObserver(uid: string): Observable<IUser | null> {
        if(this.userObserverMap[uid] != null){
            return this.userObserverMap[uid].asObservable(); //pipe needed?
        } else {
            const newUser = new BehaviorSubject<IUser>(null);
            this.bizFire.afStore.doc(`users/${uid}`).snapshotChanges()
                .pipe(takeUntil(this.bizFire.onUserSignOut))
                .subscribe(d => {
                    if(d.payload.exists){
                        newUser.next({uid: d.payload.id, data: d.payload.data()} as IUser);
                    } else {
                        console.error(`user[${uid}] data not found from /users/${uid}`);
                    }
                });
            this.userObserverMap[uid] = newUser;
            return this.userObserverMap[uid].asObservable();
        }
    }

    getChatUserObserver(uid: string): Observable<IUser | null> {
        if(this.userObserverMap[uid] != null){
            return this.userObserverMap[uid].asObservable(); //pipe needed?
        } else {
            const newUser = new BehaviorSubject<IUser>(null);
            this.bizFire.afStore.doc(`users/${uid}`).snapshotChanges()
                .pipe(takeUntil(this.bizFire.onUserSignOut))
                .subscribe(d => {
                    if(d.payload.exists){
                        newUser.next({uid: d.payload.id, data: d.payload.data()} as IUser);
                    } else {
                        console.error(`user[${uid}] data not found from /users/${uid}`);
                    }
                });
            this.userObserverMap[uid] = newUser;
            return this.userObserverMap[uid].asObservable();
        }
    }

    /*
    * Get ALL USER INFOS
    * */
    getAllUserInfos(uids: string[]): Observable<IUser[]> {

        if(uids.length === 0){
            // just resolve []
            return of([]);
        } else {

            const push = [];
            uids.forEach(uid => {
                push.push(this.getUserObserver(uid));
            });
            return combineLatest(push);
        }
    }
    

    static userInfoSorter(a: IUser, b: IUser): number {
        let index = 0;
        let a_displayName = a.data.displayName || a.data.email;
        let b_displayName = b.data.displayName || b.data.email;
        if(a_displayName != null && b_displayName != null){
            index = a_displayName > b_displayName ? 1 : -1 ;
        }
        return index;
    }

}
