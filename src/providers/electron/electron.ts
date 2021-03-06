import { Injectable } from '@angular/core';
import * as electron from 'electron';
import { BizFireService } from '../biz-fire/biz-fire';

@Injectable()
export class Electron {

  // electron 에서 a링크 사용하기 위한..
  ipc : any;
  onlineStatus : boolean = true;
  opacity = 0;
  ses = electron.remote.session;

  constructor(public bizFire : BizFireService,) {

    this.ipc = electron.ipcRenderer;
  }

  windowHide(){
    electron.remote.getCurrentWindow().hide();
  }
  // 디폴트 상태창 숨기고 X버튼에 프로그램 종료이벤트 추가.
  // windowClose는 채팅창에서만 사용
  windowClose(){
    electron.remote.getCurrentWindow().close();
  }
  windowMimimize(){
    electron.remote.getCurrentWindow().minimize();
  }
  showErrorMessages(title,message){
    electron.remote.dialog.showErrorBox(title,message);
  }
  setOpacity(v){
      v = v / 100;
      v = Number.parseFloat(v).toFixed(1);
      this.opacity = v * 1;
      if(this.opacity){
        electron.remote.getCurrentWindow().setOpacity(this.opacity)
      }
  }

  setAppBadge(count){
    // macOS에서만 적용
    electron.remote.app.setBadgeCount(count);

    // windows를 위한 프레임 깜빡임 이펙트
    electron.ipcRenderer.send('windowsFlashFrame',count);
  }

  setCookieID(url :string,name :string,value :string) {
    let expiration = new Date();
    let hour = expiration.getHours();
    hour = hour + 6;
    expiration.setHours(hour * 365);
    const cookie = { url: url, expirationDate: expiration.getTime(), name : name, value : value };
    this.ses.defaultSession.cookies.set(cookie , (error) => {
      if(error) console.log(error);
    })
  }

  notification() {
    electron.ipcRenderer.send('notification');
  }

  openChatRoom(ChatRoom) {
    electron.ipcRenderer.send('createChatRoom',ChatRoom);
  }

  resetValue(){
    // signOut할 경우 정상적으로 로그인페이지가 표시되도록 하기 위함.
    electron.ipcRenderer.send('resetValue');
  }

  goLink(url){
    this.ipc.send('loadGH',url);
  }
}
