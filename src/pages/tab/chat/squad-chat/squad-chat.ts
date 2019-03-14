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

  selectSquad : ISquad;
  squad : ISquad;
  members: any;
  groupMember : IBizGroup;
  allCollectedUsers: IUser[];
  mydata: IUser;
  editorMsg = '';

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
  }

  ngOnInit(): void {
    this.selectSquad = this.navParams.get("roomData");
    if(this.selectSquad != null){
      // 스쿼드 데이터
      this.bizFire.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}/squads/${this.selectSquad.sid}`).snapshotChanges()
      .subscribe(d => {
        if(d.payload.exists){
            this.squad = ({sid: d.payload.id, data: d.payload.data()} as ISquad);
            // 스쿼드 채팅이름.
            this.roomName = this.squad.data.name;
        }
      })
      // 비즈그룹 데이터 방 인원 수. 일단 한번 가져온 후 값 변경 시 변경
      this.bizFire.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}`).snapshotChanges()
      .subscribe(snap =>{
        if(snap.payload.exists){
          this.groupMember = ({gid: snap.payload.id, data: snap.payload.data()} as IBizGroup);
          this.roomCount = Object.keys(this.groupMember.data.members).length;
        }
      });
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
        this.messages.push(msg);
      })
      this.onFocus();
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

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
  
}
