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
import {Observable, fromEvent, timer} from 'rxjs';
import { Commons } from "./../../../../biz-common/commons";
import {LangService} from "../../../../providers/lang-service";
import {IChat, IChatData, IMessage, IMessageData} from "../../../../_models/message";
import {IBizGroupData, IUser, IUserData} from "../../../../_models";
import {Chat} from "../../../../biz-common/chat";
import {ToastProvider} from "../../../../providers/toast/toast";

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

  @ViewChild('scrollMe') contentArea: Content;

  editorMsg = '';
  opacity = 100;
  message : string;
  messages : IMessage[] = [];
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

  private scrolled = false;


  maxFileSize = 5000000; // max file size = 5mb;

  loadProgress : number = 0;

  langPack : any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public electron: Electron,
    public afAuth: AngularFireAuth,
    public popoverCtrl :PopoverController,
    public groupColorProvider: GroupColorProvider,
    private loading: LoadingProvider,
    private cacheService : CacheService,
    private toastProvider : ToastProvider,
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
        this.sendMsg(e.target.value);
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

          if(Object.keys(newSquadData.data.members).length !== this.roomCount) {
            this.cacheService.resolvedUserList(newSquadData.getMemberIds(false),Commons.userInfoSorter)
              .pipe(take(1))
              .subscribe((users :IUser[]) => {
                this.chatTitle = '';
                users.forEach(u => {
                  if(this.chatTitle.length > 0){
                    this.chatTitle += ',';
                  }
                  this.chatTitle += u.data.displayName;
               });
            });
          }
          this.chatroom = newSquadData;
          this.members = this.chatroom.data.members;
          this.chatMembers = Object.keys(this.chatroom.data.members);
          this.roomCount = this.chatMembers.length;
        }
      });
      this.bizFire.afStore.doc(Commons.groupPath(this.chatroom.data.gid)).valueChanges().subscribe((data : IBizGroupData) => {
        this.groupMainColor = data.team_color;
        // 그룹 탈퇴 당할시 채팅방을 닫는다.
        // ...
      })
    } else {
      this.electron.windowClose();
    }
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
          if(!this.chatService.scrollBottom(this.contentArea)) {
            this.toastProvider.showToast(this.langPack['new_message']);
          }
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
      // scroll to bottom
      if(this.chatService.scrollBottom(this.contentArea)) {
        timer(400).subscribe(() => {
          // call ion-content func
          this.contentArea.scrollToBottom(0);
        });
      }
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
    const converterText = Commons.chatInputConverter(value);

    if(converterText) {
      this.contentArea.scrollToBottom(0);
      this.chatService.addChatMessage(converterText,this.chatroom);
    }
    this.editorMsg = '';
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

      this.chatService.addChatMessage(converterText,this.chatroom,[attachedFile]).then(() => {
        timer(800).subscribe(() => {
          // call ion-content func
          this.contentArea.scrollToBottom(0);
        });
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

  makeNoticeMessage(message): string {

    if(Object.keys(this.langPack).length > 0
      && message
      && message.data.isNotice
      && message.data.message.notice
    ){
      const notice = message.data.message.notice;
      if(notice.type === 'exit'){
        const uid = notice.uid;
        let text = '';
        if(uid){
          this.cacheService.userGetObserver(uid[0]).subscribe((user: IUser) => {
            text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME',user.data.displayName);
          });
          return text;
        }
      }

      if(notice.type === 'init'){
        const text = this.langPack['create_chat_room'];
        return text;
      }
      if(notice.type === 'invite'){
        const uids = notice.uid;
        let inviteUserNames = '';
        for(let uid of uids) {
          this.cacheService.userGetObserver(uid).subscribe((user : IUser) => {
            if(user.data.displayName) {
              if(inviteUserNames.length > 0){
                inviteUserNames += ',';
              }
              inviteUserNames += user.data.displayName;
            }
          })
        }
        const text = this.langPack['chat_invite_user_notice'].replace('$DISPLAYNAME',inviteUserNames);
        return text;
      }
    }

    return;
  }

}
