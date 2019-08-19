import { CacheService } from './../../../../providers/cache/cache';
import { GroupColorProvider } from './../../../../providers/group-color';
import { AccountService } from './../../../../providers/account/account';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { ChatService } from '../../../../providers/chat.service';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { filter, take, takeUntil } from 'rxjs/operators';
import { AlertProvider } from '../../../../providers/alert/alert';
import { IonContent } from '@ionic/angular';
import { Observable, timer } from 'rxjs';
import { Commons } from "./../../../../biz-common/commons";
import {LangService} from "../../../../providers/lang-service";
import {IChat, IChatData, IMessage, IMessageData} from "../../../../_models/message";
import {IBizGroupData, IUser, IUserData} from "../../../../_models";
import {Chat} from "../../../../biz-common/chat";

@IonicPage({
  name: 'page-member-chat',
  segment: 'member-chat',
  priority: 'high'
})
@Component({
  selector: 'page-member-chat',
  templateUrl: 'member-chat.html',
})
export class MemberChatPage {

  @ViewChild('scrollMe') contentArea: IonContent;
  @ViewChild('scrollMe') content: Content;

  editorMsg = '';
  opacity = 100;
  message : string;
  messages = [];
  chatroom : IChat;
  ipc : any;
  roomData : IChatData;
  chatMembers = [];
  groupMainColor: string;

  start : any;
  end : any;


  // room info
  members: any;
  roomCount : number;
  chatTitle = '';


  maxFileSize = 5000000; // max file size = 5mb;

  public loadProgress : number = 0;

  langPack : any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public electron: Electron,
    public accountService : AccountService,
    public afAuth: AngularFireAuth,
    public popoverCtrl :PopoverController,
    public alertCtrl: AlertProvider,
    public groupColorProvider: GroupColorProvider,
    private loading: LoadingProvider,
    private cacheService : CacheService,
    private langService : LangService
    ) {
      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      });
      // esc 버튼 클릭시 채팅창 닫기. node_module keycode
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

  keydown(e : any) {
    if (e.keyCode == 13) {
      if (e.shiftKey === false) {
        // prevent default behavior
        e.preventDefault();
        // call submit
        let value = e.target.value;
        value = value.trim();
        if (value.length > 0) {
          this.sendMsg(value);
        }
      } else {
        // shift + enter. Let textarea insert new line.
      }
    }
  }


  ngOnInit(): void {

    this.chatroom = this.navParams.get('roomData');

    console.log(this.chatroom);

    if(this.chatroom != null) {

      //메세지 30개 가져오기
      this.getMessages();

      // 채팅방 정보 갱신. (초대,나가기)
      this.bizFire.afStore.doc(Commons.chatDocPath(this.chatroom.data.gid,this.chatroom.cid))
      .snapshotChanges().subscribe((snap : any) => {
        if(snap.payload.exists) {
          const newSquadData = new Chat(snap.payload.id,snap.payload.data(),this.bizFire.uid,snap.payload.ref);
          this.chatroom = newSquadData;
          this.chatMembers = Object.keys(this.chatroom.data.members);
          this.members = this.chatroom.data.members;
          this.roomCount = Object.keys(this.chatMembers).length;

          this.cacheService.resolvedUserList(this.chatroom.getMemberIds(false),Commons.userInfoSorter)
            .pipe(take(1))
            .subscribe((users :IUser[]) => {
            users.forEach(u => {
              if(this.chatTitle.length > 0){
                this.chatTitle += ',';
              }
              this.chatTitle += u.data.displayName;
            });
          });
        }
      });
      this.bizFire.afStore.doc(Commons.groupPath(this.chatroom.data.gid)).valueChanges().subscribe((data : IBizGroupData) => {
        this.groupMainColor = this.groupColorProvider.makeGroupColor(data.team_color);
        console.log("this.groupMainColorthis.groupMainColor",this.groupMainColor);
        // 그룹 탈퇴 당할시 채팅방을 닫는다.
        // ...
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

    const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(30))
    .get().subscribe((snapshots) => {
      if(snapshots && snapshots.docs) {
        this.start = snapshots.docs[snapshots.docs.length - 1];
        this.getNewMessages(msgPath, this.start);
      }
    })
  }

  getNewMessages(msgPath,start) {
    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
    .startAt(start))
    .stateChanges().subscribe((changes: any[]) => {

      const batch = this.bizFire.afStore.firestore.batch();

      changes.forEach((change: any) => {
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

    const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);

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

    if(converterText) {
      this.chatService.addMessage(converterText,this.chatroom.ref,this.members);
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

      this.chatService.addMessage(converterText,this.chatroom.ref,this.members,[attachedFile]).then(() => {
        this.scrollToBottom(1000);
      });
    }
  }

  userGetObserver(uid : string): Observable<IUser> {
    return this.cacheService.userGetObserver(uid);
  }

  // return Observer of senderId
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

  downloadFile(path) {
    console.log(path);
    this.ipc.send('loadGH',path);
  }

  opacityChanges(v) {
    this.electron.setOpacity(v);
  }

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }


  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-member-chat-menu',{roomData : this.chatroom}, {cssClass: 'page-member-chat-menu'});
    popover.present({ev: ev});
  }

}
