import { IchatMember } from './member-chat';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { IUser, IUserData } from '../../../../_models/message';
import { ChatService, IChatRoom, IRoomMessages } from '../../../../providers/chat.service';
import { BizFireService } from '../../../../providers';

export interface Ichats {
  message: string,
}
export interface IchatMember{
  data : IUserData,
  notify : boolean,
  uid : string
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

  @ViewChild(Content) contentArea: Content;

  private _unsubscribeAll;
  editorMsg = '';

  message : string;
  messages = [];
  readMessages: IRoomMessages[];
  chatroom : IChatRoom;
  room_type : string = "chatRoom";

  // room info
  roomMembers : IchatMember[] = [];
  roomCount : number;
  chatTitle = "";

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public electron: Electron) {
  }

  ngOnInit(): void {
    this.chatroom = this.navParams.get('roomData');
    console.log(this.chatroom);

    if(this.chatroom != null) {
      // // * get USERS DATA !
      Object.keys(this.chatroom.data.members).forEach(uid => {
        if(uid != this.chatroom.uid){
          this.roomMembers.push(this.chatroom.data.members[uid]);
          this.chatTitle += this.chatroom.data.members[uid].data.displayName + ',';
        }
      });
      // 방 인원 수
      this.roomCount = Object.keys(this.chatroom.data.members).length;

      // 입력한 메세지 배열에 담기
      this.bizFire.afStore.collection(`chats/${this.chatroom.cid}/chat`, ref => ref.orderBy('created',"asc"))
      .stateChanges().subscribe(snap => {
        this.readMessages = snap.map(d => (
          {
            rid: d.payload.doc.id,
            data:d.payload.doc.data()
          } as IRoomMessages
        ));
        this.readMessages.forEach(msg =>{
          this.messages.push(msg);
          console.log(msg.data.message);
        })
      })
    }
    // this.chatService.createRoom(null);
  }

  ionViewDidEnter(){
    setTimeout(() => { 
      this.scrollToBottom();
    },1500)
  }



  sendMessage(){
    // 앞, 뒤 공백제거 => resultString
    if(this.message !=null){
      const resultString = this.message.replace(/(^\s*)|(\s*$)/g, '');
      if(resultString != ''){
          this.chatService.sendMessage("member-chat",resultString,this.chatroom.cid);
      }
    }
    this.message = '';
  }
  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  sendMsg(){
    // 앞, 뒤 공백제거 => resultString
    if(this.editorMsg !=null){
      const resultString = this.editorMsg.replace(/(^\s*)|(\s*$)/g, '');
      if(resultString != ''){
          this.chatService.sendMessage("member-chat",resultString,this.chatroom.cid);
      }
    }
    this.editorMsg = '';
    this.onFocus();
  }
  onFocus() {
    this.contentArea.resize();
    this.scrollToBottom();
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.contentArea.scrollToBottom) {
        this.contentArea.scrollToBottom();
      }
    }, 200)
  }
}
