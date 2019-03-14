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

  selectSquad : any;
  squad : ISquad;
  members: any;
  memberCount : any;
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
      console.log(this.selectSquad);
      this.bizFire.afStore.doc(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}/squads/${this.selectSquad.sid}`).snapshotChanges()
      .subscribe(d => {
        if(d.payload.exists){
            this.squad = ({sid: d.payload.id, data: d.payload.data()} as ISquad);
            console.log(this.squad);
            // 스쿼드 채팅이름.
            this.roomName = this.squad.data.name;

            let allUsers;
            const members = this.squad.data.members;
            // 방 인원 수
            this.roomCount = Object.keys(members).length;
            if (members) {
              allUsers = Object.keys(members)
                  .filter(uid => members[uid] === true)
                  .map(uid => uid);
    
              if (allUsers && allUsers.length > 0) {
                this.accountService.getAllUserInfos(allUsers)
                    .pipe(filter(l => {
                        let ret;
                        ret = l.filter(ll => ll != null).length === allUsers.length;
                        return ret;
                        }))
                    .subscribe(all => {
                      this.allCollectedUsers = all;
                      console.log("allUsers",this.allCollectedUsers);
                      // 내 정보
                      this.allCollectedUsers.filter(u => u.uid == this.bizFire.currentUID)
                      .forEach(user =>{
                        this.mydata = user;
                        console.log("내 정보", this.mydata);
                      });
                  })
              }
            }
        }
      })
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
        console.log(msg.data.message);
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
