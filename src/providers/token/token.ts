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

  getToken(){
    let currentUid = this.bizFire.currentUID;
    
    if(currentUid != null){
      this.http.get('https://asia-northeast1-bizsquad-6d1be.cloudfunctions.net/customToken?authorization='+currentUid)
      .subscribe((data) => {
        this.customToken = data.json().customToken;
      })
    }
  }
}
