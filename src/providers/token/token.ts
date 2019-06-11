import { environment } from './../../environments/environments';
import { BizFireService } from './../biz-fire/biz-fire';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
/*
  Generated class for the TokenProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class TokenProvider {

    customToken : any;

    constructor(
        private http: HttpClient,
        private bizFire:BizFireService) {
    }

    async getToken(uid) {
        const path = `${environment.bizServerUri}/customToken`;
        const header = await this.bizFire.idTokenHeader();
        const body = { 
            uid: uid 
        }
        if(uid != null) {
            this.http.post(path,body,{headers: header}).subscribe((res: any) => {
                if(res.result === true){
                  this.customToken = res.customToken;
                  console.log(this.customToken);
                }
            })
        }
    }
    async testSendFcm() {
        const path = `${environment.bizServerUri}/sendFCM`;
        const header = await this.bizFire.idTokenHeader();
        const users = ['E1PK4kTXgiYVu9F9ksEa52esqSH3','nwmxyLdPtdMeaXMAKmKJ27HF0ZB3','MO6sfMXSNbM1uAomtMzprSN6fe63'];
        const payload = {
            notification: {
                title: `노드서버에서 보냅니다.`,
                body: `노드서버에서 보내는 메세지 내용은 이상무`,
                sound: "default",
                click_action: "FCM_PLUGIN_ACTIVITY",
            }
        }
        const body = {
          users : users,
          payload: payload
        }
        this.http.post(path,body,{headers: header}).subscribe((res: any) => {
            // 완료후 확인.

        })

    }
}
