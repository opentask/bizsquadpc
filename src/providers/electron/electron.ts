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

  // 디폴트 상태창 숨기고 X버튼에 프로그램 종료이벤트 추가.
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

  // macOS에서만 적용
  setAppBadge(count){
    electron.remote.app.setBadgeCount(count);
  }
  // windowsOS Badge 대체
  TrayLight(){
    let tray = null;
    electron.remote.Tray
  }

  updateOnlineStatus(){
    let k = window.navigator.onLine ? 'online' : 'offline'
    if(k == 'online'){
      console.log('온라인 상태입니다.')
      this.bizFire.setUserOnlineStatus();
    } else {
      console.log('오프라인 상태입니다.');
    }
  }

  setCookieID(url :string,name :string,value :string) {
    let expiration = new Date();
    let hour = expiration.getHours();
    hour = hour + 6;
    expiration.setHours(hour * 365);
    const cookie = { url: url, expirationDate: expiration.getTime(), name : name, value : value }
    this.ses.defaultSession.cookies.set(cookie , (error) => {
      if(error) console.log(error);
    })
  }

  notification(){
    electron.ipcRenderer.send('notification');
  }

  openChatRoom(ChatRoom){
    electron.ipcRenderer.send('createChatRoom',ChatRoom);
  }
  openVedioRoom(){
    electron.ipcRenderer.send('openVideoCam');
    // 그리고 현재 디렉터리의 html을 로드합니다.
    // win.loadURL(url);
  }
  resetValue(){
    // signOut할 경우 정상적으로 로그인페이지가 표시되도록 하기 위함.
    electron.ipcRenderer.send('resetValue');
  }
}
