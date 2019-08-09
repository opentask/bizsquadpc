import { ISquad } from './../../../../providers/squad.service';
import { AccountService } from './../../../../providers/account/account';
import { Electron } from './../../../../providers/electron/electron';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { STRINGS, Commons } from '../../../../biz-common/commons';
import { IUser } from '../../../../_models/message';
import { ChatService, IRoomMessages, IRoomMessagesData } from '../../../../providers/chat.service';
import { IchatMember } from '../member-chat/member-chat';
import { IBizGroup } from '../../../../providers/biz-fire/biz-fire';
import { IonContent } from '@ionic/angular';
import { IonInfiniteScroll } from '@ionic/angular';
import { GroupColorProvider } from '../../../../providers/group-color';
import { Observable, timer } from 'rxjs';
import { CacheService } from '../../../../providers/cache/cache';

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
  squadMainColor: any;

  selectSquad : ISquad;
  squad : ISquad;
  members: any;
  groupMember : IBizGroup;
  allCollectedUsers: IUser[];
  mydata: IUser;
  editorMsg = '';
  ipc : any;

  maxFileSize = 10000000; // max file size = 10mb;

  start : any;
  end : any;

  public loadProgress : number = 0;

  constructor(
     public navCtrl: NavController,
     public navParams: NavParams,
     public afAuth: AngularFireAuth,
     public bizFire : BizFireService,
     public accountService : AccountService,
     public chatService : ChatService,
     public groupColorProvider: GroupColorProvider,
     private cacheService : CacheService,
     private loading: LoadingProvider,
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
    })

    this.selectSquad = this.navParams.get("roomData");
    console.log("this.selectSquadthis.selectSquad",this.selectSquad);

    if(this.selectSquad != null) {
      this.roomCount = Object.keys(this.selectSquad.data.members).length;
      this.squadMainColor = this.groupColorProvider.makeSquadColor(this.selectSquad.data);


      //메세지 30개 가져오기
      this.getMessages();
      
      // 스쿼드 데이터 경로
      const path = Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid);
      
      // 스쿼드 데이터 갱신
      this.bizFire.afStore.doc(path).snapshotChanges().subscribe(snap => {
        if(snap.payload.exists) {
          this.selectSquad = ({sid: snap.payload.id, data: snap.payload.data()} as ISquad);
          this.squadMainColor = this.groupColorProvider.makeSquadColor(this.selectSquad.data);
          this.roomCount = Object.keys(this.selectSquad.data.members).length;
          
          // 스쿼드 권한 검사 후 팅기기 추가에정
        }
      })
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

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 statechanges로 배열에 추가해 줍니다.
  getMessages() {

    const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);
    console.log("msgPath",msgPath);
    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(30))
    .get().subscribe((snapshots) => {

      this.start = snapshots.docs[snapshots.docs.length - 1];
      console.log(this.start);

      this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
        .startAt(this.start))
        .stateChanges().subscribe((messages) => {

        messages.forEach((message) => {
          const msgData = {rid: message.payload.doc.id, data:message.payload.doc.data()} as IRoomMessages;
          this.messages.push(msgData);
        });
        console.log(messages);

        this.scrollToBottom(500);
        this.chatService.updateLastRead("squad-chat-room",this.bizFire.currentUID,this.selectSquad.data.gid,this.selectSquad.sid);

      });
    })
  }

  getMoreMessages() {

    const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);

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

      const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);
      const roomPath = Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid);

      const message = {
        created : new Date(),
        message : value,
        senderId : this.bizFire.currentUserValue.uid,
      };

      this.chatService.addMsg(msgPath,message,roomPath);
      // if(value != '' && now.getDay() <= lastmessage.getDay()){
      //   this.chatService.sendMessage("squad-chat",value,this.selectSquad.sid,this.selectSquad.data.gid);
      // } else if(value != '' && now.getDay() > lastmessage.getDay() || this.squad.data.lastMessageTime == null) {
      //   this.chatService.writeTodayAndSendMsg("squad-chat",value,this.selectSquad.sid,this.selectSquad.data.gid);
      // }
    }
  }

  file(file){

    if(file.target.files.length === 0 ){
      return;
    }
    if(file.target.files[0].size > this.maxFileSize){ 
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      const attachedFile  = file.target.files[0];

      const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);
      const roomPath = Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid);
      const filePath = Commons.squadChatImgPath(this.selectSquad.data.gid,this.selectSquad.sid) + attachedFile.name;

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
      })

    }
  }


  userDataConsole(u) {
    console.log(u);
  }

  // dragFile(file){
  //   if(file.length === 0 ) {
  //     return;
  //   }
  //   if(file && file.size > 10000000){
  //     this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
  //     return;
  //   } else {
  //     this.chatService.sendMessage("squad-chat",file.name,this.selectSquad.sid,this.selectSquad.data.gid,file);
  //   }
  // }
  
  getUserObserver(msg: IRoomMessagesData): Observable<IUser>{
    if(!msg.notice) {
      return this.cacheService.userGetObserver(msg.senderId);
    }
  }

  scrollToBottom(num : number) {
    if (this.contentArea.scrollToBottom) {
        setTimeout(() => {
            this.contentArea.scrollToBottom(0);
        },num);
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
