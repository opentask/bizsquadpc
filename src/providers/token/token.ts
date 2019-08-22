import { environment } from './../../environments/environments';
import { BizFireService } from './../biz-fire/biz-fire';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Electron } from "../electron/electron";
import {LoadingProvider} from "../../providers/loading/loading";

/*
  Generated class for the TokenProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class TokenProvider {

    customToken : string;

    ipc : any;

    constructor(
        private http: HttpClient,
        private electron : Electron,
        private loading: LoadingProvider,
        private bizFire:BizFireService) {
      this.ipc = this.electron.ipc;
    }

    async idTokenHeader(): Promise<HttpHeaders> {
      const idToken = await this.bizFire.afAuth.auth.currentUser.getIdToken(true);
      return new HttpHeaders({
        'authorization': idToken
      });
    }

    async getToken(uid) {
      return new Promise<string>(async resolve => {
        const path = `${environment.bizServerUri}/customToken`;
        const header = await this.idTokenHeader();
        const body = {
          uid: uid
        };
        if(uid != null) {
          await this.http.post(path,body,{headers: header}).subscribe((res: any) => {
            if(res.result === true) {
              resolve(res.customToken);
            }
          })
        }
      });
    }

    async addCustomLink(uid,title,url) {
      console.log(uid,title,url);
        const path = `${environment.bizServerUri}/customLink`;
        const header = await this.idTokenHeader();
        const body = {
            uid: uid,
            title: title,
            url: url,
        };
        console.log("body :",body);
        this.http.post(path,body,{headers: header}).subscribe((res: any) => {
          console.log(res);
            // 파이어스토어에서 링크 데이터 가져오기.
        })
    }

    makeWebJump(type: string,gid?:string,sid?:string) {
      this.loading.show();
      this.getToken(this.bizFire.uid).then((token : string) => {
        if(type === 'member'){
          this.ipc.send('loadGH',`${environment.webJumpBaseUrl}${token}&url=home/${gid}/users`);
        }
        if(type === 'bbs') {
          this.ipc.send('loadGH',`${environment.webJumpBaseUrl}${token}&url=bbs/${gid}`);
        }
        if(type === 'property') {
          this.ipc.send('loadGH',`${environment.webJumpBaseUrl}${token}&url=home/${gid}/property`);
        }
        if(type == 'mypage') {
          this.ipc.send('loadGH',`${environment.webJumpBaseUrl}${token}&url=mypage`);
        }
        if(type == 'squad') {
          this.ipc.send('loadGH',`${environment.webJumpBaseUrl}${token}&url=squad/${gid}/${sid}`);
        }
        this.loading.hide();
      }).catch(err => {
        this.loading.hide();
      });
    }

}
