// auto update class
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {CollectionReference, DocumentChangeAction, Query, QueryDocumentSnapshot} from '@angular/fire/firestore';
import {filter} from 'rxjs/operators';
import {IFireData, IFireDataKey, IFireDataOption, IFireMessage} from './fire-model';



export class FireData implements IFireData {

    private cache : Array<{key: IFireDataKey, sub: Subscription, messages: any[]}> = [];

    private _onMessageChanged = new BehaviorSubject<IFireMessage>(null);
    get onMessageChanged(){ return this._onMessageChanged.asObservable().pipe(filter(s=>s!=null))};

    clear(){
        // clear all cache data.
        this.cache.forEach(d => {
          if(d.sub){
            d.sub.unsubscribe();
          }
        });
        this.cache = [];
    }

    unregister(key: IFireDataKey) {
        for(let i = 0; i < this.cache.length; i++){
          if(key.isEqualKey(this.cache[i].key)){
            const found = this.cache[i];
            if(found.sub){
              found.sub.unsubscribe();
            }
            this.cache.splice(i, 1);
            break;
          }
        }
    }
      
    private find(key: IFireDataKey): number | undefined {
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
        const index = this.find(key);
        return index != null;
    }
      
    get(key: IFireDataKey): any[] {
        const index = this.find(key);
        return this.cache[index].messages.map(m => m.data);
    }
      
    register(key: IFireDataKey, observer: Observable<any>, option: IFireDataOption = {}) {
      
        //clear old one.
        if(this.find(key) != null) {
          console.error('이미 등록된 키가 불림~~!!!!', key);
          return;
        }
        
        const newData = {key: key, sub: null, messages: []};
        
        console.log("newData",newData);

        let {createFnc, filterFnc, sorter} = option ;
        
        if(createFnc == null){
          createFnc = (doc: QueryDocumentSnapshot<any>)=> {
            return {id: doc.id, data: doc.data()};
          };
        }
        if(filterFnc == null){
          filterFnc = (d: any) => {
            return true;
          };
        }
      
        this.cache.push(newData);
        
        newData.sub = observer.subscribe((changes: Array<any>) => {
          
          const savedData = this.cache[this.find(key)];
          
          changes.forEach((change: DocumentChangeAction<any>) => {
            
            const mid = change.payload.doc.id;
            //console.log(mid, change.type, change.payload.doc.data());
            
            if(change.type === 'added'){
        
              // add new message to top
              const value = createFnc(change.payload.doc);
              if(filterFnc(value)){
                savedData.messages.unshift({mid: mid, data: value});
              }
        
            } else if (change.type === 'modified') {
              // replace old one
              for(let index = 0 ; index < savedData.messages.length; index ++){
      
                const value = createFnc(change.payload.doc);
                if(savedData.messages[index].mid === mid ){
                  // find replacement
                  
                  if(filterFnc(value)){
                    savedData.messages[index] = {mid: mid, data: value};
                  }
                  
                  break;
                }
              }
            } else if (change.type === 'removed') {
              for (let index = 0; index < savedData.messages.length; index++) {
                if (savedData.messages[index].mid === mid) {
                  // remove from array
                  savedData.messages.splice(index, 1);
                  break;
                }
              }
            }
          }); // end of forEach
          
          if(sorter != null){
            savedData.messages.sort( (a, b) => {
              return sorter(a.data, b.data);
            });
          }
          
          this._onMessageChanged.next({key: key, data: savedData.messages.map(m => m.data)} as IFireMessage);
          console.log("this._onMessageChanged",this._onMessageChanged);
          
        }, error1 => {
          console.error(key, error1);
        });
    }

}