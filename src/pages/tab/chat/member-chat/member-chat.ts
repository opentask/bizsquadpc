import { CacheService } from './../../../../providers/cache/cache';
import { STRINGS } from './../../../../biz-common/commons';
import { GroupColorProvider } from './../../../../providers/group-color';
import { IUserData } from './../../../../_models/message';
import { AccountService } from './../../../../providers/account/account';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import {
  ChatService,
  IChatRoom,
  IRoomMessages,
  IChatRoomData,
  IRoomMessagesData
} from '../../../../providers/chat.service';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { IUser } from '../../../../_models/message';
import { filter, take, takeUntil } from 'rxjs/operators';
import { AlertProvider } from '../../../../providers/alert/alert';
import { IonContent } from '@ionic/angular';
import { InfiniteScroll } from 'ionic-angular';
import { Observable } from 'rxjs';
import { Commons } from "./../../../../biz-common/commons";
import { IBizGroup, IBizGroupData } from '../../../../providers/biz-fire/biz-fire';


export interface Ichats {
  message: string,
}
export interface IchatMember{
  name: string,
  photoURL: string,
}
 
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
  readMessages : IRoomMessages[];
  chatroom : IChatRoom;
  room_type : string = "chatRoom";
  ipc : any;
  roomData : IChatRoomData;
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

  maxFileSize = 10000000;

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
    console.log(this.chatroom);
    this.chatroom = this.navParams.get('roomData');

    if(this.chatroom != null) {
      // get group color;

      // // * get USERS DATA !
      const c_members = this.chatroom.data.members;
      this.chatMembers = Object.keys(c_members).filter(uid => c_members[uid] === true && uid != this.chatroom.uid);

      //메세지 30개 가져오기
      this.getMessages();

      // 채팅방 정보 갱신. (초대,나가기)
      this.bizFire.afStore.doc(Commons.chatDocPath(this.chatroom.data.group_id,this.chatroom.cid))
      .valueChanges().subscribe((roomData : IChatRoomData) => {
        this.roomData = roomData;
        this.chatMembers = Object.keys(this.roomData.members).filter(uid => this.roomData.members[uid] === true && uid != this.chatroom.uid);
        this.roomCount = Object.keys(this.roomData.members).length;

        this.accountService.getAllUserInfos(this.chatMembers).pipe(filter(m => m != null))
        .subscribe(members => {
          this.roomMembers = members.filter(m => m != null);
          this.chatTitle = '';
          this.roomMembers.forEach(m => {
            this.chatTitle += m.data.displayName + ",";
          })
        })
      });

      this.bizFire.afStore.doc(Commons.groupPath(this.chatroom.data.group_id)).valueChanges().subscribe((data : IBizGroupData) => {
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
  getUserObserver(msg: IRoomMessagesData): Observable<IUser>{
    if(!msg.notice) {
      return this.cacheService.userGetObserver(msg.senderId);
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

    if(value.length > 0){

      const msgPath = Commons.chatMsgPath(this.chatroom.data.group_id,this.chatroom.cid);
      const roomPath = Commons.chatDocPath(this.chatroom.data.group_id,this.chatroom.cid);

      const message = {
        created : new Date(),
        message : value,
        senderId : this.bizFire.currentUserValue.uid,
      };

      this.chatService.addMsg(msgPath,message,roomPath);

      // if(value != '' && now.getDay() <= lastmessage.getDay()) {
      //   this.chatService.sendMessage("member-chat",value,this.chatroom.cid);
      // } else if(value != '' && now.getDay() > lastmessage.getDay() || this.roomData.lastMessageTime == null) {
      //   this.chatService.writeTodayAndSendMsg("member-chat",value,this.chatroom.cid);
      // }
    }
  }

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 statechanges로 배열에 추가해 줍니다.
  getMessages() {

    const msgPath = Commons.chatMsgPath(this.chatroom.data.group_id,this.chatroom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(30))
    .get().subscribe((snapshots) => {

      this.start = snapshots.docs[snapshots.docs.length - 1];

      this.getNewMessages(msgPath,this.start)
    })
  }

  getNewMessages(msgPath,start) {

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
    .startAt(start))
    .stateChanges().subscribe((messages) => {

      messages.forEach((message) => {
        const msgData = {rid: message.payload.doc.id, data:message.payload.doc.data()} as IRoomMessages;
        this.messages.push(msgData);
      });

      this.scrollToBottom(500);
      this.chatService.updateLastRead("member-chat-room",this.chatroom.uid,this.chatroom.data.group_id,this.chatroom.cid);

    });

  }

  getMoreMessages() {

    const msgPath = Commons.chatMsgPath(this.chatroom.data.group_id,this.chatroom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
    .startAt(this.start).limit(10)).get()
    .subscribe((snapshots) => {
      this.end = this.start;
      this.start = snapshots.docs[snapshots.docs.length - 1];

      this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
      .startAt(this.start).endBefore(this.end))
      .stateChanges().subscribe((messages) => {

        messages.reverse().forEach((message) => {
          const msgData = {rid: message.payload.doc.id, data:message.payload.doc.data()} as IRoomMessages;
          this.messages.unshift(msgData);
        })
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

    if(file.target.files.length === 0 ){
      return;
    }
    if(file.target.files[0].size > this.maxFileSize){ 
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      this.loading.show();
      const attachedFile  = file.target.files[0];

      const msgPath = Commons.chatMsgPath(this.chatroom.data.group_id,this.chatroom.cid);
      const roomPath = Commons.chatDocPath(this.chatroom.data.group_id,this.chatroom.cid);
      const filePath = Commons.chatImgPath(this.chatroom.data.group_id,this.chatroom.cid) + attachedFile.name;

      this.chatService.uploadFilesToChat(filePath,attachedFile).then((url) => {
        let upLoadFileMsg = {
          created : new Date(),
          message : attachedFile.name,
          senderId : this.bizFire.currentUserValue.uid,
          files :{
            storagePath:filePath,
            url : url,
            size : attachedFile.size,
            type : attachedFile.type,
          }
        };
        this.chatService.addMsg(msgPath,upLoadFileMsg,roomPath);
        this.loading.hide();
      })

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
  //     this.chatService.sendMessage("member-chat",file.name,this.chatroom.cid,this.chatroom.data.group_id,file);
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
