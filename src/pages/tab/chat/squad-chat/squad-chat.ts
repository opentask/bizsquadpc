import { AccountService } from './../../../../providers/account/account';
import { Electron } from './../../../../providers/electron/electron';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { ISquad } from '../../../../providers/squad.service';
import { BizFireService } from '../../../../providers';
import { STRINGS } from '../../../../biz-common/commons';
import { IUser } from '../../../../_models/message';
import { ChatService, IRoomMessages } from '../../../../providers/chat.service';
import { IchatMember } from '../member-chat/member-chat';
import { IBizGroup } from '../../../../providers/biz-fire/biz-fire';
import { IonContent } from '@ionic/angular';
import { IonInfiniteScroll } from '@ionic/angular';

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
      const drag_file = document.getElementById('drag-file');
      drag_file.addEventListener('drop',(e) => {
        e.preventDefault();
        e.stopPropagation();
        let data = e.dataTransfer;
        if(data.items){
          for (var i=0; i < data.files.length; i++) {
              console.log(data.files[i]);
              this.dragFile(data.files[i]);
            }
        }
      })
      // angular keydown.enter는 이벤트가 두번실행 되므로 이벤트 리스너로 대체 해결.
      // drag_file.addEventListener('keydown',(e) => {
      //   if(e.key === 'Escape' || e.keyCode === 13){
      //     this.sendMsg();
      //   }
      // })
    }

    // 입력한 메세지 배열에 담기
    this.bizFire.afStore.collection(`${STRINGS.STRING_BIZGROUPS}/${this.selectSquad.data.gid}/squads/${this.selectSquad.sid}/chat`, ref => ref.orderBy('created',"asc"))
    .stateChanges().subscribe(snap => {
      snap.forEach(d => {
        const msgData = {rid: d.payload.doc.id, data:d.payload.doc.data()} as IRoomMessages;
        if(d.type == 'added' && msgData.data.message != '' || msgData.data.notice){
          this.messages.push(msgData);
        }
        if(d.type == 'modified'){
          let ret = msgData.data.files != null && msgData.data.message != '';
          if(ret){
            this.messages.push(msgData);
          }
        }
        this.scrollToBottom();
      })
      this.chatService.updateLastRead("squad-chat-room",this.bizFire.currentUID,this.selectSquad.sid,this.selectSquad.data.gid)
    })
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
  

  sendMsg(value) {
    this.editorMsg = '';

    if(value.length > 0){

      const now = new Date();
      const lastmessage = new Date(this.squad.data.lastMessageTime * 1000);

      if(value != '' && now.getDay() <= lastmessage.getDay()){
        this.chatService.sendMessage("squad-chat",value,this.selectSquad.sid,this.selectSquad.data.gid);
      } else if(value != '' && now.getDay() > lastmessage.getDay() || this.squad.data.lastMessageTime == null) {
        this.chatService.writeTodayAndSendMsg("squad-chat",value,this.selectSquad.sid,this.selectSquad.data.gid);
      }
    }
    // 앞, 뒤 공백제거 => resultString
    // if(this.editorMsg !=null){
    //   const resultString = this.editorMsg.replace(/(^\s*)|(\s*$)/g, '');
    //   this.editorMsg = '';
    //   const now = new Date();
    //   const lastmessage = new Date(this.squad.data.lastMessageTime * 1000);

    //   if(resultString != '' && now.getDay() <= lastmessage.getDay()){
    //       this.chatService.sendMessage("squad-chat",resultString,this.selectSquad.sid,this.selectSquad.data.gid);
    //   } else if(resultString != '' && now.getDay() > lastmessage.getDay() || this.squad.data.lastMessageTime == null){
    //     console.log("여기실행");
    //     this.chatService.writeTodayAndSendMsg("squad-chat",resultString,this.selectSquad.sid,this.selectSquad.data.gid);
    //   }
    // }
    // this.editorMsg = '';
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
      this.chatService.sendMessage("squad-chat",fileInfo.name,this.selectSquad.sid,this.selectSquad.data.gid,fileInfo);
    }
  }

  dragFile(file){
    if(file.length === 0 ) {
      return;
    }
    if(file && file.size > 10000000){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
      return;
    } else {
      this.chatService.sendMessage("squad-chat",file.name,this.selectSquad.sid,this.selectSquad.data.gid,file);
    }
  }

  scrollToBottom() {
    if (this.contentArea.scrollToBottom) {
        setTimeout(() => {
            this.contentArea.scrollToBottom(0);
        });
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

  loadData(event) {
    setTimeout(() => {
      console.log('Done');
      event.target.complete();

      // App logic to determine if all data is loaded
      // and disable the infinite scroll
      if (this.messages.length == 50) {
        event.target.disabled = true;
      }
    }, 500);
  }
  
}
