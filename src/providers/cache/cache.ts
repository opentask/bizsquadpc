import { Injectable, Optional, SkipSelf } from '@angular/core';
import { BehaviorSubject, Subscription, Observable, timer } from 'rxjs';
import {BizFireService} from '../biz-fire/biz-fire';
import {CacheOptionBuilderFn, ICacheOption, ICacheOptionBuilder} from './cache-option';
import { ICachePath } from './i-cache-path';
import {CacheOptionBuilder} from './cache-option-builder';
import {Path} from './path';
import { filter,map, take } from 'rxjs/operators';
import { ISquad } from '../squad.service';
import { Commons } from '../../biz-common/commons';
import firebase from 'firebase';
import {IBizGroup, IUser} from "../../_models";

export declare type CacheOptionDataBuilder = (data: any)=> any;
export declare type CacheOptionListBuilder = (id: string, data?: any)=> any;
export declare type CacheOptionBuilderFn = (ref: ICacheOptionBuilder) => ICacheOptionBuilder;

interface ICacheDataItem {
  path: ICachePath,
  subject: BehaviorSubject<any>
  createAt: any | null,
  sub: Subscription,
  lastIndex?: string
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  // default expire time is 1hour.
  private defaultExpireMin: number = 60;

  private observerMap: ICacheDataItem[] = [];
  private listObserverMap: ICacheDataItem[] = [];

  constructor(
    @Optional() @SkipSelf() otherMe: CacheService,
    private bizFire: BizFireService) {
    if(otherMe){
      throw new Error('CacheService must be stand alone!');
    }
    /*
    * 사용자가 로그아웃하면 캐쉬를 지운다.
    * */
    this.bizFire.onUserSignOut.subscribe(()=>{
      this.clear();
    });

    /*
    * 그룹이 바뀌면 캐쉬를 지운다.
    * */
    this.bizFire.onBizGroupSelected.subscribe(()=> this.clear());
  }

  clear(){
    // clear all
    this.observerMap.forEach(d => {
      if(d.sub != null){
        d.sub.unsubscribe();
      }
      if(d.subject){
        d.subject.complete();
      }
    });
    this.observerMap = [];


    this.listObserverMap.forEach(d => {
      if(d.sub != null){
        d.sub.unsubscribe();
      }
      if(d.subject){
        d.subject.complete();
      }
    });
    this.listObserverMap = [];
  }

  private findWithPath(path: ICachePath): ICacheDataItem {
    return this.observerMap.find(d => d.path.isSamePath(path));
  }
  private findListWithPath(path: ICachePath): ICacheDataItem {
    return this.listObserverMap.find(d => d.path.isSamePath(path));
  }

  /*
  * @angular/fire
  * default: doc.get()
  * default expire: this.defaultExpireMin
  * whenNotFound: default null return.
  * */
  getObserver(path: string | ICachePath, option?: ICacheOption | CacheOptionBuilderFn, stateChange = false): Observable<any>{

    let retObserver;

    let cacheOption: ICacheOption;
    // determine option
    if(typeof option === 'function'){
      const builderFn:CacheOptionBuilderFn = option;
      const builder:ICacheOptionBuilder = CacheOptionBuilder.Build();
      cacheOption = builderFn(builder).finalize();

    } else {
      if(option){
        cacheOption = option;
      } else {
        cacheOption = {}; // set to default option;
      }
    }

    let internalPath: ICachePath;
    if(typeof path === 'string'){
      internalPath = new Path(path);
    } else {
      internalPath = path;
    }

    let cacheData: ICacheDataItem = this.findWithPath(internalPath);
    if(cacheData == null){
      // no old data.
      // create new one.
      cacheData = {
        path: internalPath,
        subject: new BehaviorSubject<any>('init'),
        createAt: new Date(),
        sub: null
      };

      this.observerMap.push(cacheData);

    } else {

      let useSaved = true;

      // is valueChange ?
      if(stateChange === false){

        // check expired
        if(cacheOption.refresh !== true && cacheData.createAt != null){
          //
          const expireMin = cacheOption.expireMin || this.defaultExpireMin;

          useSaved = this.checkExpire(cacheData.createAt, expireMin);
        }
      }

      if(useSaved){
        // just return
        retObserver = cacheData.subject.asObservable().pipe(filter(d=>d !== 'init'));

      } else {
        // delete old sub if exist.
        if(cacheData.sub != null){
          // clear old subscription
          console.error('cache time expired. Clear subscription.', path);
          cacheData.sub.unsubscribe();
          cacheData.sub = null;
        }
      }
    }

    if(retObserver == null){
      //console.log('getObserver', internalPath.path, `stateChange(${stateChange})`);
      const ref = stateChange === true ?
        this.bizFire.afStore.doc(internalPath.path).valueChanges()
        : this.bizFire.afStore.doc(internalPath.path).get();

      // start subscription
      cacheData.sub = ref.subscribe((snap: any)=>{
        //console.log('new data received:', path);
        let data;
        if(stateChange === true){
          data = snap;
        } else {
          if(snap.exists){
            data = snap.data();
          }
        }

        if(data){
          if(cacheOption.map != null){
            // converter
            data = cacheOption.map(data);
          }
          // send data !
          cacheData.subject.next(data);
        } else {
          console.error('Data not fount', path);
          if(cacheOption.whenNotFound != null){
            cacheData.subject.next(cacheOption.whenNotFound);
          } else {
            cacheData.subject.next(null);
          }
        }
      });

      retObserver = cacheData.subject.asObservable().pipe(filter(d=>d !== 'init'));
    }

    // return observable
    return retObserver;
  }


  valueChangeObserver(path: string | ICachePath, option?: ICacheOption | CacheOptionBuilderFn): Observable<any>{
    return this.getObserver(path, option, true);
  }

  private checkExpire(from: Date, expireMin: number): boolean {
    let ok = true;
    // saved date
    /*const expire = new Date(from);
    // make expired time
    expire.setMinutes(expire.getMinutes() + expireMin);
    // current
    const now = new Date();
    if(expire.getTime() < now.getTime()){
      // 기록된 시각 + 허용시간 < 현재 이므로, 이 캐쉬는 오래된 데이터.
      // OUT!
      ok = false;
    }*/
    return ok;
  }


  userGetObserver(uid: string,stateChange?:boolean): Observable<IUser> {
    const path = new Path(Commons.userPath(uid), 'userGet_IUser');
    return this.getObserver(path, ref => ref.map(data=> ({uid: uid, data: data})), stateChange);
  }


  userGetObserverList(members: any): Observable<IUser>[] {

    if(members == null){
      throw new Error('members must have value');
    }
    return Object.keys(members)
      .filter(uid => members[uid] === true)
      .map(uid => this.userGetObserver(uid));

  }

  collection(path: ICachePath, option?: ICacheOption | CacheOptionBuilderFn): Observable<any[]> {

    let retObserver;

    let cacheOption: ICacheOption;
    // determine option
    if(typeof option === 'function'){
      const builderFn:CacheOptionBuilderFn = option;
      const builder:ICacheOptionBuilder = CacheOptionBuilder.Build();
      cacheOption = builderFn(builder).finalize();

    } else {
      if(option){
        cacheOption = option;
      } else {
        cacheOption = {}; // set to default option;
      }
    }

    let cacheMap = this.findListWithPath(path);
    if(cacheMap == null){
      // no old data.
      // create new one.
      cacheMap = {
        path: path,
        subject: new BehaviorSubject<any[]>(null),
        createAt: null,
        sub: null,
        lastIndex: null
      };
      this.listObserverMap.push(cacheMap);

    } else {

      retObserver = cacheMap.subject.asObservable().pipe(filter(d=>d !== null));
    }

    if(retObserver == null){

      let ref;
      ref = this.bizFire.afStore.collection(path.path, ref=>{

        let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

        if(cacheOption.wheres){
          cacheOption.wheres.forEach(where => query = query.where(where.key, <firebase.firestore.WhereFilterOp>where.match || '==', where.value || true));
        }
        if(cacheOption.orderBy){
          cacheOption.orderBy.forEach(o => query = query.orderBy(o.key, <firebase.firestore.OrderByDirection>o.value || 'asc'));
        }

        if(cacheOption.members){
          cacheOption.members.forEach(m =>
            query = query.where(new firebase.firestore.FieldPath(m.type || 'members', m.uid), '==', m.value || true));
        }
        if(cacheOption.limit != null){
          query = query.limit(cacheOption.limit);
        }

        return query;
      }).snapshotChanges();

      // start subscription
      cacheMap.sub = ref.subscribe((snaps: any[])=>{

        // console.log('new collection values received:', path);

        if(cacheOption.map != null){
          // converter exist.
          const datas = snaps.map(snap => {
            const id = snap.payload.doc.id;
            let data = snap.payload.doc.data();
            return cacheOption.map(id, data);
          });

          cacheMap.subject.next(datas);

        } else {
          cacheMap.subject.next(snaps);
        }
      });

      retObserver = cacheMap.subject.asObservable().pipe(filter(d=>d !== null));
    }

    // return observable
    return retObserver;
  }



  /*User list for sorting*/
  resolvedUserList(userIdList: string[], sorter?: any){

    return new Observable<IUser[]>( observer => {

      if(userIdList == null || userIdList.length === 0){
        observer.next([]);
        observer.complete();
        return;
      }

      const datas = [];

      let totalTargetCount = userIdList.length; // not using now...

      userIdList.forEach(async (uid: string) => {

        this.userGetObserver(uid).subscribe(user => {
          totalTargetCount --;
          if(user){
            datas.push(user);
          }

          if(totalTargetCount === 0){
            observer.next(datas);
            observer.complete();
          }
        });
      });

    });
  }


  groupValueObserver(gid: string): Observable<IBizGroup> {
    const path = new Path(Commons.groupPath(gid), 'valueChange');
    return this.getObserver(path, ref => ref.map(data => ({gid: gid, data: data} as IBizGroup)), true);
  }
}
