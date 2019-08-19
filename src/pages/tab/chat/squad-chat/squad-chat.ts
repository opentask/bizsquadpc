import { ISquad } from './../../../../providers/squad.service';
import { AccountService } from './../../../../providers/account/account';
import { Electron } from './../../../../providers/electron/electron';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { STRINGS, Commons } from '../../../../biz-common/commons';
import { ChatService } from '../../../../providers/chat.service';
import { IonContent } from '@ionic/angular';
import { IonInfiniteScroll } from '@ionic/angular';
import { GroupColorProvider } from '../../../../providers/group-color';
import { Observable, timer } from 'rxjs';
import { CacheService } from '../../../../providers/cache/cache';
import {IMessage, IMessageData} from "../../../../_models/message";
import {IBizGroup, IBizGroupData, IUser, IUserData} from "../../../../_models";
import {takeUntil} from "rxjs/operators";
import {LangService} from "../../../../providers/lang-service";

@IonicPage({
  name: 'page-squad-chat',
  segment: 'squad-chat',
  priority: 'high'
})
@Component({
  selector: 'page-squad-chat',
  templateUrl: 'squad-chat.html',
})
export class SquadChatPage {

  @ViewChild('scrollMe') contentArea: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;

  message : string;
  messages : IMessage[] = [];
  roomCount : number;
  opacity = 100;
  squadMainColor: any;

  selectSquad : ISquad;
  squad : ISquad;
  members: any;
  editorMsg = '';
  ipc : any;

  maxFileSize = 5000000; // max file size = 5mb;

  start : any;
  end : any;

  loadProgress : number = 0;

  langPack : any;

  constructor(
     public navCtrl: NavController,
     public navParams: NavParams,
     public afAuth: AngularFireAuth,
     public bizFire : BizFireService,
     public chatService : ChatService,
     public groupColorProvider: GroupColorProvider,
     private cacheService : CacheService,
     private langService : LangService,
     public electron: Electron
     ) {
      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      });
      // esc 버튼 클릭시 채팅창 닫기.
      document.addEventListener('keydown', event => {
        if(event.key === 'Escape' || event.keyCode === 27){
          this.electron.windowClose();
        }
      });

      this.bizFire.currentUser.subscribe((user : IUserData) => {
        console.log("useruseruseruser",user);
        if(user) {
          this.langService.onLangMap
            .pipe(takeUntil(this.bizFire.onUserSignOut))
            .subscribe((l: any) => {
              this.langPack = l;
            });
        }
      });

      this.ipc = electron.ipc;

  }

  keydown(e : any){
    if (e.keyCode == 13  ) {
      if(e.shiftKey === false){
        // prevent default behavior
        e.preventDefault();
        // call submit
        let value = e.target.value;
        value = value.trim();
        if(value.length > 0){
          this.sendMsg(value);
        }
      } else {
        // shift + enter. Let textarea insert new line.
      }
    }
  }

  ngOnInit(): void {

    this.selectSquad = this.navParams.get("roomData");

    if(this.selectSquad != null) {
      this.squadMainColor = this.groupColorProvider.makeSquadColor(this.selectSquad.data);

      //메세지 30개 가져오기
      this.getMessages();

      // 그룹 데이터
      this.bizFire.afStore.doc(Commons.groupPath(this.selectSquad.data.gid))
        .get().subscribe(group => {
          const groupData = group.data() as IBizGroupData;
          if(groupData && this.selectSquad.data.type === 'public') {
            this.roomCount = Object.keys(groupData.members).length;
            this.members = groupData.members;
          }
      });

      // 스쿼드 데이터 갱신
      this.bizFire.afStore.doc(Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid))
      .snapshotChanges().subscribe(snap => {
        if(snap.payload.exists) {
          this.selectSquad = ({sid: snap.payload.id, data: snap.payload.data(), ref: snap.payload.ref} as ISquad);
          this.squadMainColor = this.groupColorProvider.makeSquadColor(this.selectSquad.data);
          if(this.selectSquad.data.type === 'private'){
            this.roomCount = Object.keys(this.selectSquad.data.members).length;
            this.members = this.selectSquad.data.members;
          }
        }
      })
    } else {
      this.electron.windowClose();
    }

    this.chatService.fileUploadProgress.subscribe(per => {
      if(per === 100) {

        // 용량이 작을때 프로그레스 바가 안나오므로..
        this.loadProgress = per;

        // 1.5초 뒤 값을 초기화한다.
        timer(1500).subscribe(() => {
          this.chatService.fileUploadProgress.next(null);
          this.loadProgress = 0;
        })
      } else {
        this.loadProgress = per;
      }
      console.log(per);
    });
  }

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 statechanges로 배열에 추가해 줍니다.
  getMessages() {

    const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(30))
    .get().subscribe((snapshots) => {
      if(snapshots && snapshots.docs) {
        this.start = snapshots.docs[snapshots.docs.length - 1];
        console.log(this.start);
        this.getNewMessages(msgPath,this.start);
      }
    })
  }

  getNewMessages(msgPath,start) {
    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
    .startAt(start))
    .stateChanges().subscribe((changes: any[]) => {

      const batch = this.bizFire.afStore.firestore.batch();

      changes.forEach((change : any) => {
        if(change.type === 'added') {
          const msgData = {mid: change.payload.doc.id, data:change.payload.doc.data()} as IMessage;
          this.messages.push(msgData);
          this.chatService.setToReadStatus(change.payload.doc, batch);
        }
        if(change.type === 'modified') {
          const msg = this.messages.find(m => m.mid === change.payload.doc.id);
          if(msg){
            msg.data = change.payload.doc.data();
            msg.ref = change.payload.doc.ref;
          }
        }
      });
      batch.commit();
      this.scrollToBottom(500);
    });

  }

  getMoreMessages() {

    const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
    .startAt(this.start).limit(30)).get()
    .subscribe((snapshots) => {
      this.end = this.start;
      this.start = snapshots.docs[snapshots.docs.length - 1];

      this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
      .startAt(this.start).endBefore(this.end))
      .stateChanges().subscribe((messages) => {

        const batch = this.bizFire.afStore.firestore.batch();

        messages.reverse().forEach((message) => {
          const msgData = {mid: message.payload.doc.id, data:message.payload.doc.data()} as IMessage;
          this.messages.unshift(msgData);
          this.chatService.setToReadStatus(message.payload.doc, batch);
        });

        batch.commit();
      });

      console.log("more_messages",this.messages);
    })
  }


  sendMsg(value) {
    this.editorMsg = '';

    const converterText = Commons.chatInputConverter(value);

    if(converterText){

      this.chatService.addMessage(converterText,this.selectSquad.ref,this.members);

    }
  }

  doInfinite(infiniteScroll) {
    console.log('Begin async operation');

    setTimeout(() => {
      this.getMoreMessages();

      console.log('Async operation has ended');

      infiniteScroll.complete();
    }, 500);
  }

  file(file){
    if(file.target.files.length === 0 ){
      return;
    }
    if(file.target.files[0].size > this.maxFileSize){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      const attachedFile  = file.target.files[0];
      const converterText = Commons.chatInputConverter(attachedFile.name);

      this.chatService.addMessage(converterText,this.selectSquad.ref,this.members,[attachedFile]).then(() => {
        this.scrollToBottom(1000);
      });
    }
  }

  userGetObserver(uid : string): Observable<IUser> {
    return this.cacheService.userGetObserver(uid);
  }

  getUserObserver(msg: IMessageData): Observable<IUser>{
    if(!msg.isNotice) {
      return this.cacheService.userGetObserver(msg.sender);
    }
  }

  scrollToBottom(num : number) {
    if (this.contentArea.scrollToBottom) {
        setTimeout(() => {
            this.contentArea.scrollToBottom(0);
        },num);
    }
  }

  downloadFile(path){
    console.log(path);
    this.ipc.send('loadGH',path);
  }
  opacityChanges(v){
    this.electron.setOpacity(v);
  }

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }

}
