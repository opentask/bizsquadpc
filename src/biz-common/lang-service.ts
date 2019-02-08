import { Injectable } from '@angular/core';
import {language} from './lang';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class LangService {

    language;
    private countryCode = 'en';

    private langPackCache = {};

    constructor() {
        new Observable<any>(observer => {

            // todo: change to firebase
            observer.next(language);
        }).subscribe(language => {

            this.langPackCache = {};
            this.language = language;
        });
    }

    setLanguage(language){
        let ref = 'en'; //default
        if(language != null){
            ref = language;
        }
        this.countryCode = ref;
    }

}