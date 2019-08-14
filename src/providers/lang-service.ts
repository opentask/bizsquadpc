import { language } from './../biz-common/lang';
import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter} from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class LangService {
    
    language;
    private countryCode = 'en';
    
    private langPackCache = {};
    
    private totalLangMap = {};
    
    //v2
    private _langObserver = new BehaviorSubject<any>(null);
    
    constructor() {
        
        /*
        this.db.object('language').valueChanges().subscribe(language =>{
            console.log(language);
            this.language = language;
        });*/
        
        new Observable<any>(observer => {
            
            // todo: change to firebase
            observer.next(language); // lang.ts file.
        }).subscribe(language => {
            
            this.langPackCache = {};
            this.language = language; // just save lang.ts file of from firebase
        });
    }
    
    //v2 return just new map.
    get onLangMap(): Observable<any> {
        // resolve only when totalLangMap had some value !
        return this._langObserver.asObservable().pipe(filter(f => f != null));
    }
    
    
    
    /*
    * Return object
    * */
    find(key: string): any | null{
        const vals = key.split('.');
        let path = this.language;
        for(let val of vals){
            path = path[val];
            if(path == null)break;
        }
        return path;
    }
    
    
    //USAGE :
    // pack()['close_button']
    /*pack(key: string): any {
        let ret = {};
        const obj = this.find(key);
        if(obj){
            Object.keys(obj).forEach(stringKey => ret[stringKey] = obj[stringKey][this.countryCode]);
        }
        return ret;
    }*/
    
    /*
    * v2
    * - load all keys from lang.ts
    * - override old key with new one.
    * */
    loadLanguage(language = 'en') {
        
        //console.log(`loadLanguage(${language}) called.`);
        
        // remove old one.
        this.totalLangMap = {};
        this.countryCode = language;
        
        // start parse
        Object.keys(this.language)
            .filter(k => typeof this.language[k] === 'object')
            .forEach(key => {
            
            const pack = this.language[key];
            if(pack.hasOwnProperty(language)){
                this.totalLangMap[key] = pack[language];
            }
            else {
                Object.keys(pack).forEach(subKey => {
                    const subPack = pack[subKey];
                    if(subPack.hasOwnProperty(language)){
                        this.totalLangMap[subKey] = subPack[language];
                    }
                });
            }
        });
        
        // broadcast new map to all listeners.
        this._langObserver.next(this.totalLangMap);
    }
    
    get(key: string): string {
        return this.totalLangMap[key] || key;
    }
    
    /*
    * v2
    * - override v1 pack(string)
    * - Just exist for v1.
    * */
    pack(firstObjectKey?: string): any {
        // just return map.
        return this.totalLangMap;
    }
}
