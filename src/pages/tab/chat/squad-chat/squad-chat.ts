import { ISquad } from './../../../../providers/squad.service';
import { AccountService } from './../../../../providers/account/account';
import { Electron } from './../../../../providers/electron/electron';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { STRINGS, Commons } from '../../../../biz-common/commons';
import { ChatService } from '../../../../providers/chat.service';
import { IonContent } from '@ionic/angular';
import { IonInfiniteScroll } from '@ionic/angular';
import { GroupColorProvider } from '../../../../providers/group-color';
import { Observable, timer } from 'rxjs';
import { CacheService } from '../../../../providers/cache/cache';
import {IMessage, IMessageData} from "../../../../_models/message";
import {IUser} from "../../../../_models";

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
  roomCount : number;
  opacity = 100;
  squadMainColor: any;

  selectSquad : ISquad;
  squad : ISquad;
  members: any;
  editorMsg = '';
  ipc : any;

  maxFileSize = 5000000; // max file size = 5mb;

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
      if(snapshots && snapshots.docs) {
        this.start = snapshots.docs[snapshots.docs.length - 1];
        this.getNewMessages(msgPath,this.start)
      }
    })
  }

  getNewMessages(msgPath,start) {

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
    .startAt(start))
    .stateChanges().subscribe((changes: any[]) => {

      changes.forEach((change) => {
        if(change.type === 'added') {
          const msgData = {mid: change.payload.doc.id, data:change.payload.doc.data()} as IMessage;
          this.messages.push(msgData);
        }
        if(change.type === 'modified') {
          const msg = this.messages.find(m => m.mid === change.payload.doc.id);
          if(msg){
            msg.data = change.payload.doc.data();
            msg.ref = change.payload.doc.ref;
          }
        }
      });

      this.scrollToBottom(500);

    });

  }

  getMoreMessages() {

    const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
    .startAt(this.start).limit(30)).get()
    .subscribe((snapshots) => {
      this.end = this.start;
      this.start = snapshots.docs[snapshots.docs.length - 1];

      this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
      .startAt(this.start).endBefore(this.end))
      .stateChanges().subscribe((messages) => {

        messages.reverse().forEach((message) => {
          const msgData = {mid: message.payload.doc.id, data:message.payload.doc.data()} as IMessage;
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

    const converterText = Commons.chatInputConverter(value);

    if(converterText){

      const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);
      const roomPath = Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid);

      const message : IMessageData = {
        created : new Date(),
        message : {
          text : converterText,
        },
        sender : this.bizFire.currentUserValue.uid,
        type: 'chat',
        file: true
      };
      this.chatService.addMsg(msgPath,message,roomPath,this.selectSquad);
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
      const message : IMessageData = {
        created : new Date(),
        message : {
          text : `<p>${attachedFile.name}</p>`,
        },
        sender : this.bizFire.currentUserValue.uid,
        type: 'chat'
      };

      const msgPath = Commons.chatSquadMsgPath(this.selectSquad.data.gid,this.selectSquad.sid);
      const roomPath = Commons.chatSquadPath(this.selectSquad.data.gid,this.selectSquad.sid);
      // const filePath = Commons.squadChatImgPath(this.selectSquad.data.gid,this.selectSquad.sid) + attachedFile.name;

      this.chatService.addMsg(msgPath,message,roomPath).then(mid => {
        const filePath = Commons.squadChatImgPath(this.selectSquad.data.gid,this.selectSquad.sid,mid) + attachedFile.name;
        const chatMsgDocPath = Commons.chatSquadMsgDocPath(this.selectSquad.data.gid,this.selectSquad.sid,mid);
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

      // this.chatService.uploadFilesToChat(filePath,attachedFile).then((url) => {
      //   let upLoadFileMsg : IRoomMessagesData = {
      //     created : new Date(),
      //     message : {
      //       text : attachedFile.name,
      //       files : [{
      //         name : attachedFile.name,
      //         storagePath: filePath,
      //         url : url,
      //         size : attachedFile.size,
      //         type : attachedFile.type,
      //       }]
      //     },
      //     sender : this.bizFire.currentUserValue.uid,
      //   };

      //   this.chatService.addMsg(msgPath,upLoadFileMsg,roomPath);
      // })

    }
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

  userGetObserver(uid : string): Observable<IUser> {
    return this.cacheService.userGetObserver(uid);
  }

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

}
