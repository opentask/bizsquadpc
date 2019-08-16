import { TokenProvider } from './../../providers/token/token';
import { Electron } from './../../providers/electron/electron';
import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { FormGroup, ValidatorFn, Validators, FormBuilder } from '@angular/forms';
import { LoadingProvider,BizFireService } from './../../providers';
import { Subject } from 'rxjs';
import { takeUntil,take } from 'rxjs/operators';
import { IUserState } from '../../providers/biz-fire/biz-fire';
import * as electron from 'electron';
import { IChat } from '../../providers/chat.service';
import {IUserData} from "../../_models/message";

@IonicPage({  
  name: 'page-login',
  segment: 'login',
  priority: 'high'
}) 
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})

export class LoginPage implements OnInit {

  rememberId : boolean = false;
  loginForm: FormGroup;
  version: any;
  hideForm = false;
  imgPath = "imgs/main512.png";
  userEmail = '';

  // 새 창으로 열기위해..
  ipc: any;

  // 구독 종료
  private _unsubscribeAll;

  private emailValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.email
  ]);
  private passwordValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(6)
  ]);

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public electron: Electron,
    private bizFire: BizFireService,
    private loading: LoadingProvider,
    public formBuilder: FormBuilder,
    private TokenProvider: TokenProvider
    ) {
      this.loginForm = formBuilder.group({
        email: ['', this.emailValidator],
        password: ['', this.passwordValidator]
      });
      this.ipc = electron.ipc;
      this._unsubscribeAll = new Subject<any>();
  }
  ionViewCanEnter(){
    this.hideForm = true;
    electron.ipcRenderer.send('giveMeRoomValue', 'ping');
    electron.ipcRenderer.on('selectRoom', (event, roomData : IChat) => {
      if(roomData != null) {
        this.hideForm = false;
        this.loading.show();
        if(roomData.data.type == "member"){
          this.navCtrl.setRoot('page-member-chat',{roomData : roomData});
          this.loading.hide();
          console.log("룸데이터가있습니다.",roomData); // "select member data" 출력)
        } else {
          console.log("스쿼드채팅입니다.",roomData);
          this.navCtrl.setRoot('page-squad-chat',{roomData : roomData});
          this.loading.hide();
        }
      } else {
        this.hideForm = true;
      }
    })
  }

  ngOnInit() {

    // 아이디 쿠키정보가 있을 시 가져옴.
    this.getCookieID();


    // on/offline check
    window.addEventListener('online',this.electron.updateOnlineStatus);
    window.addEventListener('offline',this.electron.updateOnlineStatus);

    // 버전 가져오기
    this.version = electron.remote.app.getVersion();

    // test...중복 로그인 중...
    this.bizFire.authState
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((state: IUserState) => {
      console.log("statestatestate",state);
    });

    electron.ipcRenderer.on('message',function(text) {
      console.log(text);
    })
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  async onLogin() {
  
    if(this.loginForm.valid) {

      this.loading.show();

      try {
        const email = this.loginForm.value['email'];
        const password = this.loginForm.value['password'];

        if(this.bizFire.afAuth.auth.currentUser != null) {
          await this.bizFire.signOut();
        }

        await this.bizFire.loginWithEmail(email,password);
        await this.electron.updateOnlineStatus();

        this.electron.setCookieID('https://www.bizsquad.net','rememberID',this.loginForm.value['email']);

        const gid = await this.findLastBizGroup();

        if(gid && await this.bizFire.onSelectGroup(gid)) {
          // this.navCtrl.setRoot('page-group-list');
          this.navCtrl.setRoot('page-tabs');

        } else {
          this.navCtrl.setRoot('page-group-list');
        }

        this.loading.hide();
      } catch (e) {

        console.log(e);
        this.loading.hide();
        this.electron.showErrorMessages("Login failed.","you entered an incorrect email address or password.");
      }
    } else {
      this.electron.showErrorMessages("Login failed.","Email format is invalid or password has 6 digits or less.");
    }

  }

  async findLastBizGroup() {
    return new Promise<string>( (resolve1, reject) => {
      this.bizFire.currentUser
        .pipe(take(1))
        .subscribe((userData: IUserData)=>{

          if(userData.lastPcGid){
            resolve1(userData.lastPcGid);
          } else {
            resolve1(null);
          }
        });
    });
  }
  // ------------------------------------------------------------------
  // * electron function.
  // ------------------------------------------------------------------

  getCookieID() {
    this.electron.ses.defaultSession.cookies.get({url : 'https://www.bizsquad.net',name: 'rememberID'},(err,cookies) => {
      if(cookies.length > 0) {
        this.userEmail = cookies[0].value;
      }
    })
  }
  windowHide() {
    this.electron.windowHide();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
}
