import { AccountService } from './../../../../providers/account/account';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { ChatService, IChatRoom, IRoomMessages, IChatRoomData } from '../../../../providers/chat.service';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { IUser } from '../../../../_models/message';
import { filter, takeUntil } from 'rxjs/operators';
import { IBizGroup } from '../../../../providers/biz-fire/biz-fire';

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

  @ViewChild(Content) contentArea: Content;

  private _unsubscribeAll;
  editorMsg = '';
  opacity = 100;

  message : string;
  messages = [];
  readMessages : IRoomMessages[];
  chatroom : IChatRoom;
  room_type : string = "chatRoom";
  ipc : any;

  // room info
  roomMembers: IUser[];
  roomCount : number;
  chatTitle = '';
  logout : any;
  fileSpinner = false;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public electron: Electron,
    public accountService : AccountService,
    public afAuth: AngularFireAuth,
    private loading: LoadingProvider,
    ) {
      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      })
      // esc 버튼 클릭시 채팅창 닫기. node_module keycode
      // document.addEventListener('keydown', event => {
      //   if(event.key === 'Escape' || event.keyCode === 27){
      //     this.electron.windowClose();
      //   }
      // })
      this.ipc = electron.ipc;
    }
  

  ngOnInit(): void {
    this.chatroom = this.navParams.get('roomData');
    console.log(this.chatroom);

    if(this.chatroom != null) {
      // // * get USERS DATA !
      let chatMembers = [];
      const c_members = this.chatroom.data.members;
      chatMembers = Object.keys(c_members).filter(uid => c_members[uid] === true && uid != this.chatroom.uid);
      console.log(chatMembers);
      this.accountService.getAllUserInfos(chatMembers).pipe(filter(m => m != null))
      .subscribe(members => {
        this.roomMembers = members.filter(m => m != null);
        this.roomCount = this.roomMembers.length + 1;
        console.log(this.roomMembers);

        this.chatTitle = '';
        this.roomMembers.forEach(m => {
          this.chatTitle += m.data.displayName + ",";
        })
      })    
      
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
          if(msg.data.message != '') {
            this.messages.push(msg);
            console.log(msg);
          }
        })
        this.onFocus();
        this.chatService.updateLastRead("member-chat-room",this.chatroom.uid,this.chatroom.cid);
      })

    }
    // this.chatService.createRoom(null);

  }
  file(file){
    let fileInfo;
    fileInfo = file.target.files[0];
    if(file.target.files.length === 0 ) {
      return;
    }
    if(file && file.target.files[0].size > 10000000){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
      return;
    } else {
      this.chatService.sendMessage("member-chat",fileInfo.name,this.chatroom.cid,this.chatroom.data.gid,fileInfo);
    }
  }
  sendMsg(){
    // 앞, 뒤 공백제거 => resultString
    if(this.editorMsg !=null){
      const resultString = this.editorMsg.replace(/(^\s*)|(\s*$)/g, '');
      this.editorMsg = '';
      if(resultString != '') {
          this.chatService.sendMessage("member-chat",resultString,this.chatroom.cid);
      }
    }
    this.editorMsg = '';
  }

  changes(v){
    this.electron.setOpacity(v);
  }

  // scrollToBottom(){
  //   const element = document.getElementById('last');
  //   element.scrollIntoView();
  // }

  downloadFile(path){
    console.log(path);
    this.ipc.send('loadGH',path);
  }

  scrollToBottom() {
      if (this.contentArea.scrollToBottom) {
        this.contentArea.scrollToBottom();
      }
  }
  onFocus() {
    this.contentArea.resize();
    this.scrollToBottom();
  }
  scrollToBottomN(){
    const element = document.getElementById('last');
    element.scrollIntoView();
  }
  ngAfterViewChecked(){
    this.onFocus();
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
}
