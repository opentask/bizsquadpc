import { IFireDataKey, IFireDataOption, IFireMessage } from './fire-model';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';

export  class DataCache {
  
  protected cache: Array<{key: IFireDataKey, sub: Subscription, messages: any, observer: BehaviorSubject<any>, originalObserver: any}> = [];
  protected _onMessageChanged = new BehaviorSubject<IFireMessage>(null);
  get onMessageChanged(){ return this._onMessageChanged.asObservable().pipe(filter(s=>s!=null))};
  
  private find(key: IFireDataKey): number| null {
    let foundIndex;
    for(let i = 0; i < this.cache.length; i++){
      if(key.isEqualKey(this.cache[i].key)){
        foundIndex = i;
        break;
      }
    }
    return foundIndex;
  }
  
  has(key: IFireDataKey): boolean {
    return this.find(key) != null;
  }
  
  get(key: IFireDataKey, type: string = 'observer'): any {
    if(type === 'observer'){
      return this.getObserver(key);
    }else if(type === 'data'){
      return this.getData(key);
    }
  }
  
  getObserver(key: IFireDataKey): Observable<any> {
    const index = this.find(key);
    if(index != null){
      return this.cache[index].observer.pipe(filter(m => m!=null));
    }
    return null;
  }
  
  getData(key: IFireDataKey): any {
    const index = this.find(key);
    if(index != null){
      return this.cache[index].messages;
    }
    return null;
  }
  
  clear(){
    // clear all cache data.
    this.cache.forEach(d => {
      if(d.sub){
        d.sub.unsubscribe();
      }
      if(d.observer){
        d.observer.complete();
      }
    });
    this.cache = [];
  }
  
  unregister(key: IFireDataKey){
    for(let i = 0; i < this.cache.length; i++){
      if(key.isEqualKey(this.cache[i].key)){
        const found = this.cache[i];
        if(found.sub){
          found.sub.unsubscribe();
        }
        if(found.observer){
          found.observer.complete();
        }
        this.cache.splice(i, 1);
        break;
      }
    }
  }
  
  register(key: IFireDataKey, observer: Observable<any>, option: IFireDataOption = {}) {
    //clear old one.
    if(this.find(key) != null){
      console.error('이미 등록된 키가 불림~~!!!!', key);
      return;
    }
    let {createFnc, filterFnc, sorter} = option ;
    if(createFnc == null){
      createFnc = (doc)=> doc;
    }
    if(filterFnc == null){
      filterFnc = (d: any) => {
        return true;
      };
    }
    
    
    const newData = {key: key, sub: null, messages: null, observer: null, originalObserver: observer};
    
    // create behavior observer
    newData.observer = new BehaviorSubject<any>(null);
  
    newData.sub = observer.subscribe(data => {
      if(filterFnc(data)){
        newData.messages = createFnc(data);
      }
      // send notofication
      this._onMessageChanged.next({key: key, data: newData.messages});
      
      // send observer notification
      newData.observer.next(newData.messages);
    });
    
    this.cache.push(newData);
  }
  
}