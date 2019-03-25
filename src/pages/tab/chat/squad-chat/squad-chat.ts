import { AccountService } from './../../../../providers/account/account';
import { SquadService } from './../../../../providers/squad.service';
import { Electron } from './../../../../providers/electron/electron';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { ISquad } from '../../../../providers/squad.service';
import { BizFireService } from '../../../../providers';
import { STRINGS } from '../../../../biz-common/commons';
import { filter, map, takeUntil } from 'rxjs/operators';
import { IUser } from '../../../../_models/message';
import { ChatService, IRoomMessages } from '../../../../providers/chat.service';
import { IchatMember } from '../member-chat/member-chat';
import { IBizGroup } from '../../../../providers/biz-fire/biz-fire';

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

  @ViewChild(Content) contentArea: Content;

  message : string;
  messages = [];
  readMessages: IRoomMessages[];
  roomMembers : IchatMember[] = [];
  roomCount : number;
  roomName = "";
  currentGroup : IBizGroup;
  opacity = 100;

  selectSquad : ISquad;
  squad : ISquad;
  members: any;
  groupMember : IBizGroup;
  allCollectedUsers: IUser[];
  mydata: IUser;
  editorMsg = '';
  ipc : any;

  constructor(
     public navCtrl: NavController,
     public navParams: NavParams,
     public afAuth: AngularFireAuth,
     public bizFire : BizFireService,
     public accountService : AccountService,
     public chatService : ChatService,
     public electron: Electron) {
      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      })
      // esc 버튼 클릭시 채팅창 닫기.
      document.addEventListener('keydown', event => {
        if(event.key === 'Escape' || event.keyCode === 27){
          this.electron.windowClose();
        }
      })
      this.ipc = electron.ipc;
  }

  ngOnInit(): void {
    this.selectSquad = this.navParams.get("roomData");
    console.log(this.selectSquad);
    if(this.selectSquad != null){
      // 스쿼드 데이터
      this.bizFire.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}/squads/${this.selectSquad.sid}`).snapshotChanges()
      .subscribe(d => {
        if(d.payload.exists){
            this.squad = ({sid: d.payload.id, data: d.payload.data()} as ISquad);
            // 스쿼드 채팅이름.
            this.roomName = this.squad.data.name;
            if(this.squad.data.type == "private")
            this.roomCount = Object.keys(this.squad.data.members).length;
        }
      })
      // 비즈그룹 데이터 방 인원 수. 일단 한번 가져온 후 값 변경 시 변경
      if(this.selectSquad){
        this.bizFire.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}`).snapshotChanges()
        .subscribe(snap =>{
          if(snap.payload.exists){
            this.groupMember = ({gid: snap.payload.id, data: snap.payload.data()} as IBizGroup);
            if(this.selectSquad.data.type == "public" && this.groupMember.data.partners != null){
              this.roomCount = Object.keys(this.groupMember.data.members).length -  Object.keys(this.groupMember.data.partners).length;
            } else if (this.selectSquad.data.type == "public"){
              this.roomCount = Object.keys(this.groupMember.data.members).length;
            }
          }
        });
      }
    }

    // 입력한 메세지 배열에 담기
    this.bizFire.afStore.collection(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}/squads/${this.selectSquad.sid}/chat`, ref => ref.orderBy('created',"asc"))
    .stateChanges().subscribe(snap => {
      this.readMessages = snap.map(d => (
        {
          rid: d.payload.doc.id,
          data:d.payload.doc.data()
        } as IRoomMessages
      ));
      this.readMessages.forEach(msg =>{
        if(msg.data.message != '' || msg.data.file){
          this.messages.push(msg);
          console.log(msg);
        }
      })
      this.onFocus();
      this.chatService.updateLastRead("squad-chat-room",this.bizFire.currentUID,this.selectSquad.sid,this.selectSquad.data.gid)
    })
  }

  sendMsg(){
    // 앞, 뒤 공백제거 => resultString
    if(this.editorMsg !=null){
      const resultString = this.editorMsg.replace(/(^\s*)|(\s*$)/g, '');
      this.editorMsg = '';
      if(resultString != ''){
          this.chatService.sendMessage("squad-chat",resultString,this.selectSquad.sid,this.selectSquad.data.gid);
      }
    }
    this.editorMsg = '';
  }

  file(file){
    if(file.target.files.length === 0 ) {
      return;
    }
    if(file && file.target.files[0].size > 10000000){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
      return;
    } else {
      this.chatService.sendMessage("squad-chat",'',this.selectSquad.sid,this.selectSquad.data.gid,file.target.files[0]);
    }
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

  downloadFile(path){
    console.log(path);
    this.ipc.send('loadGH',path);
  }
  changes(v){
    this.electron.setOpacity(v);
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
  
}
