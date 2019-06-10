import { environment } from './../../environments/environments';
import { BizFireService } from './../biz-fire/biz-fire';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
/*
  Generated class for the TokenProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class TokenProvider {

  customToken : any;

  constructor(
    public http: Http,
    private bizFire:BizFireService) {
  }

  getToken(uid) {

    const path = `${environment.bizServerUri}/customToken`;
    const header = this.bizFire.idTokenHeader();
    console.log('header',header);
  
    if(uid != null) {
      this.http.get('https://asia-northeast1-bizsquad-6d1be.cloudfunctions.net/customToken?authorization='+uid)
      .subscribe((data) => {
        this.customToken = data.json().customToken;
      })
    }
  }
}
