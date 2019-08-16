import { CacheService } from './../../../../providers/cache/cache';
import { GroupColorProvider } from './../../../../providers/group-color';
import { AccountService } from './../../../../providers/account/account';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import {
  ChatService,
  IChat,
  IMessage,
  IChatData,
  IMessageData
} from '../../../../providers/chat.service';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { IUser } from '../../../../_models/message';
import { filter, take, takeUntil } from 'rxjs/operators';
import { AlertProvider } from '../../../../providers/alert/alert';
import { IonContent } from '@ionic/angular';
import { Observable, timer } from 'rxjs';
import { Commons } from "./../../../../biz-common/commons";
import { IBizGroupData } from '../../../../providers/biz-fire/biz-fire';

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

  private _unsubscribeAll;
  editorMsg = '';
  opacity = 100;
  message : string;
  messages = [];
  readMessages : IMessage[];
  chatroom : IChat;
  room_type : string = "chatRoom";
  ipc : any;
  roomData : IChatData;
  chatMembers = [];
  groupMainColor: string;

  start : any;
  end : any;
  testMessages = [];

  // room info
  roomMembers: IUser[];
  roomCount : number;
  chatTitle = '';
  logout : any;
  fileSpinner = false;

  maxFileSize = 5000000; // max file size = 5mb;

  public loadProgress : number = 0;

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
    private cacheService : CacheService
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
      this.ipc = electron.ipc;
    }

  ngOnInit(): void {

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

    console.log(this.chatroom);
    this.chatroom = this.navParams.get('roomData');

    if(this.chatroom != null) {
      // get group color;

      // // * get USERS DATA !
      const c_members = this.chatroom.data.members;
      this.chatMembers = Object.keys(c_members).filter(uid => c_members[uid] === true && uid != this.bizFire.uid);

      //메세지 30개 가져오기
      this.getMessages();

      // 채팅방 정보 갱신. (초대,나가기)
      this.bizFire.afStore.doc(Commons.chatDocPath(this.chatroom.data.gid,this.chatroom.cid))
      .valueChanges().subscribe((roomData : IChatData) => {

        this.chatroom = {uid: this.bizFire.uid,cid : this.chatroom.cid, data : roomData} as IChat;

        this.chatMembers = Object.keys(roomData.members).filter(uid => roomData.members[uid] === true && uid != this.bizFire.uid);

        this.roomCount = Object.keys(this.chatMembers).length + 1;

        this.accountService.getAllUserInfos(this.chatMembers).pipe(filter(m => m != null))
        .subscribe(members => {
          this.roomMembers = members.filter(m => m != null);
          this.chatTitle = '';
          this.roomMembers.forEach(m => {
            this.chatTitle += m.data.displayName + ",";
          })
        })
      });

      this.bizFire.afStore.doc(Commons.groupPath(this.chatroom.data.gid)).valueChanges().subscribe((data : IBizGroupData) => {
        this.groupMainColor = this.groupColorProvider.makeGroupColor(data.team_color);
        console.log("this.groupMainColorthis.groupMainColor",this.groupMainColor);
        // 그룹 탈퇴 당할시 채팅방을 닫는다.
        // ...
      })


      // 드래그해서 파일 첨부 기능.
      // const drag_file = document.getElementById('drag-file');
      // drag_file.addEventListener('drop',(e) => {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   let data = e.dataTransfer;
      //   if(data.items){
      //     for (var i=0; i < data.files.length; i++) {
      //         console.log(data.files[i]);
      //         this.dragFile(data.files[i]);
      //       }
      //   }
      // })
    }
  }

  // return Observer of senderId
  getUserObserver(msg: IMessageData): Observable<IUser>{
    if(!msg.isNotice) {
      return this.cacheService.userGetObserver(msg.sender);
    }
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
      }
    }
  }

  sendMsg(value) {

    this.editorMsg = '';
    const converterText = Commons.chatInputConverter(value);

    if(converterText) {
      const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);
      const roomPath = Commons.chatDocPath(this.chatroom.data.gid,this.chatroom.cid);

      const message : IMessageData = {
        created : new Date(),
        message : {
          text : converterText,
        },
        sender : this.bizFire.currentUserValue.uid,
        type: 'chat'
      };

      this.chatService.addMsg(msgPath,message,roomPath,this.chatroom);
    }
      // if(value != '' && now.getDay() <= lastmessage.getDay()) {
      //   this.chatService.sendMessage("member-chat",value,this.chatroom.cid);
      // } else if(value != '' && now.getDay() > lastmessage.getDay() || this.roomData.lastMessageTime == null) {
      //   this.chatService.writeTodayAndSendMsg("member-chat",value,this.chatroom.cid);
      // }
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

        this.scrollToBottom(500);
      });

      batch.commit();


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

  doInfinite(infiniteScroll) {
    console.log('Begin async operation');

    setTimeout(() => {
      this.getMoreMessages();

      console.log('Async operation has ended');

      infiniteScroll.complete();
    }, 500);
  }

  file(file){

    const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);
    const roomPath = Commons.chatDocPath(this.chatroom.data.gid,this.chatroom.cid);

    if(file.target.files.length === 0 ){
      return;
    }
    if(file.target.files[0].size > this.maxFileSize){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      const attachedFile  = file.target.files[0];

      const message : IMessageData = {
        created : new Date(),
        message : {
          text : `<p>${attachedFile.name}</p>`,
        },
        sender : this.bizFire.currentUserValue.uid,
        type: 'chat'
      };

      this.chatService.addMsg(msgPath,message,roomPath).then(mid => {
        const filePath = Commons.chatImgPath(this.chatroom.data.gid,this.chatroom.cid,mid) + attachedFile.name;
        const chatMsgDocPath = Commons.chatMsgDocPath(this.chatroom.data.gid,this.chatroom.cid,mid);
        this.chatService.uploadFilesToChat(filePath,attachedFile).then((url) => {
          let updateFileMsg = {
            message : {
              files : [{
                name: attachedFile.name,
                storagePath: filePath,
                url : url,
                size : attachedFile.size,
                type : attachedFile.type,
              }]
            }
          };
          this.chatService.setMsg(chatMsgDocPath,updateFileMsg);
        })
      });

    }
  }

  // dragFile(file){
  //   console.log(file.size);
  //   console.log(file.name);
  //   if(file.length === 0 ) {
  //     return;
  //   }
  //   if(file && file.size > 10000000){
  //     this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
  //     return;
  //   } else {
  //     this.chatService.sendMessage("member-chat",file.name,this.chatroom.cid,this.chatroom.data.gid,file);
  //   }
  // }

  downloadFile(path) {
    console.log(path);
    this.ipc.send('loadGH',path);
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-member-chat-menu',{roomData : this.chatroom}, {cssClass: 'page-member-chat-menu'});
    popover.present({ev: ev});
  }

  scrollToBottom(num : number) {
    if (this.contentArea.scrollToBottom) {
      setTimeout(() => {
        this.contentArea.scrollToBottom(0);
      },num);
    }
  }

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }

  opacityChanges(v) {
    this.electron.setOpacity(v);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
