import { GroupColorProvider } from './../../../../providers/group-color';
import { IUserData } from './../../../../_models/message';
import { AccountService } from './../../../../providers/account/account';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { ChatService, IChatRoom, IRoomMessages, IChatRoomData } from '../../../../providers/chat.service';
import { BizFireService } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { IUser } from '../../../../_models/message';
import { filter, take, takeUntil } from 'rxjs/operators';
import { AlertProvider } from '../../../../providers/alert/alert';
import { IonContent } from '@ionic/angular';
import { InfiniteScroll } from 'ionic-angular';

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

  // 화상채팅 보낸 이
  senderUser: IUserData;

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
    public popoverCtrl :PopoverController,
    public alertCtrl: AlertProvider,
    public groupColorProvider: GroupColorProvider
    ) {
      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      })
      // esc 버튼 클릭시 채팅창 닫기. node_module keycode
      document.addEventListener('keydown', event => {
        if(event.key === 'Escape' || event.keyCode === 27){
          this.electron.windowClose();
        }
      })
      this.ipc = electron.ipc;
    }  

  ngOnInit(): void {
    console.log(this.chatroom);
    this.chatroom = this.navParams.get('roomData');

    if(this.chatroom != null) {
      // get group color;

      // // * get USERS DATA !
      const c_members = this.chatroom.data.manager;
      this.chatMembers = Object.keys(c_members).filter(uid => c_members[uid] === true && uid != this.chatroom.uid);
      console.log(this.chatMembers);
      this.accountService.getAllUserInfos(this.chatMembers).pipe(filter(m => m != null),take(1))
      .subscribe(members => {
        this.roomMembers = members.filter(m => m != null);
        this.chatTitle = '';
        this.roomCount = Object.keys(members).length + 1;
        console.log("this.roomCount",this.roomCount)
        this.roomMembers.forEach(m => {
          this.chatTitle += m.data.displayName + ",";
        })
      })


      // 채팅방 정보 가져오기
      this.bizFire.afStore.doc(`chat/${this.chatroom.cid}`).valueChanges().subscribe((roomData : IChatRoomData) => {
        this.roomData = roomData;
        let chatMembers = [];
        chatMembers = Object.keys(roomData.manager).filter(uid => roomData.manager[uid] === true && uid != this.chatroom.uid);
        this.roomCount = Object.keys(roomData.manager).length;

        this.accountService.getAllUserInfos(chatMembers).pipe(filter(m => m != null),take(1))
        .subscribe(members => {
          this.roomMembers = members.filter(m => m != null);
          this.chatTitle = '';
          this.roomMembers.forEach(m => {
            this.chatTitle += m.data.displayName + ",";
          })
        })
      })


      // 입력한 메세지 배열에 담기. 누군가 메세지를 입력했다면 라스트 리드 업데이트
      this.bizFire.afStore.collection(`chat/${this.chatroom.cid}/chat`, ref => ref.orderBy('created',"asc"))
      .stateChanges().subscribe(snap => {
        snap.forEach(d => {
          const msgData = {rid: d.payload.doc.id, data:d.payload.doc.data()} as IRoomMessages;
          if(d.type == 'added' && msgData.data.message != '' || msgData.data.notice === 1) {
            // this.messages.push(msgData);
          }
          if(d.type == 'modified') {
            let ret = msgData.data.files != null && msgData.data.message != '';
            if(ret){
              this.messages.push(msgData);
            }
          }
        });
        this.scrollToBottom();

        this.chatService.updateLastRead("member-chat-room",this.chatroom.uid,this.chatroom.cid);
      })

      // 드래그해서 파일 첨부 기능.
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

      this.bizFire.currentUser
      .pipe(filter(d=>d!=null))
      .subscribe(user => {
        this.senderUser = user;
        console.log("currentuser",user);
      })

    }
    // this.chatService.createRoom(null);

    this.getMessages();
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
      this.chatService.sendMessage("member-chat",fileInfo.name,this.chatroom.cid,this.chatroom.data.group_id,fileInfo);
    }
  }
  dragFile(file){
    console.log(file.size);
    console.log(file.name);
    if(file.length === 0 ) {
      return;
    }
    if(file && file.size > 10000000){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
      return;
    } else {
      this.chatService.sendMessage("member-chat",file.name,this.chatroom.cid,this.chatroom.data.group_id,file);
    }
  }
  smile(){
    console.log(this.editorMsg);
  }
  
  // videoCall(){
  //   const path = `users/${this.chatMembers[0]}`;
  //   this.bizFire.afStore.doc(path).get().subscribe(snap => {
  //     let selectUserData:IUserData;
  //     if(snap.exists){
  //       selectUserData = snap.data();
  //       if(selectUserData.onlineStatus == 'online' && selectUserData.videoCall == '' || selectUserData.videoCall == null){
  //         this.bizFire.afStore.doc(path).set({
  //           videoCall : this.senderUser.displayName
  //         },{merge: true}).then(() => {
  //             this.electron.openVedioRoom();
  //         })
  //       } else {
  //         this.alertCtrl.logoutSelectUser();
  //       }
  //     }
  //   })
  // }

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

    // let resultString = value.replace(/(^\s*)|(\s*$)/g, '');
    // 앞, 뒤 공백제거 => resultString

    this.editorMsg = '';

    if(value.length > 0){

      const now = new Date();
      const lastmessage = new Date(this.roomData.lastMessageTime * 1000);

      if(value != '' && now.getDay() <= lastmessage.getDay()) {
        this.chatService.sendMessage("member-chat",value,this.chatroom.cid);
      } else if(value != '' && now.getDay() > lastmessage.getDay() || this.roomData.lastMessageTime == null) {
        this.chatService.writeTodayAndSendMsg("member-chat",value,this.chatroom.cid);
      }
    }


  }

  // 
  opacityChanges(v){
    this.electron.setOpacity(v);
  }

  downloadFile(path) {
    console.log(path);
    this.ipc.send('loadGH',path);
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-member-chat-menu',{roomData : this.chatroom}, {cssClass: 'page-member-chat-menu'});
    popover.present({ev: ev});
  }

  scrollToBottom() {
      if (this.contentArea.scrollToBottom) {
          setTimeout(() => {
              this.contentArea.scrollToBottom(0);
          });
      }
  }

  // onFocus() {
  //   this.contentArea.resize();
  //   this.scrollToBottom();
  // }

  // ngAfterViewChecked() {
  //   this.onFocus();
  // }

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

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 statechanges로 배열에 추가해 줍니다.
  getMessages() {

    this.bizFire.afStore.collection(`chat/${this.chatroom.cid}/chat`,ref => ref.orderBy('created','desc').limit(10))
    .get().subscribe((snapshots) => {

      this.start = snapshots.docs[snapshots.docs.length - 1];

        this.bizFire.afStore.collection(`chat/${this.chatroom.cid}/chat`,ref => ref.orderBy('created')
        .startAt(this.start))
        .stateChanges().subscribe((messages) => {
  
          messages.forEach((message) => {
            const msgData = {rid: message.payload.doc.id, data:message.payload.doc.data()} as IRoomMessages;
            this.messages.push(msgData);
          })
          
          this.scrollToBottom();

        })
        console.log("test_messages",this.testMessages);
    })

  }

  getMoreMessages() {
    this.bizFire.afStore.collection(`chat/${this.chatroom.cid}/chat`,ref => ref.orderBy('created','desc')
    .startAt(this.start).limit(10)).get()
    .subscribe((snapshots) => {
      this.end = this.start;
      this.start = snapshots.docs[snapshots.docs.length - 1];

      this.bizFire.afStore.collection(`chat/${this.chatroom.cid}/chat`,ref => ref.orderBy('created')
      .startAt(this.start).endBefore(this.end))
      .stateChanges().subscribe((messages) => {

        messages.reverse().forEach((message) => {
          const msgData = {rid: message.payload.doc.id, data:message.payload.doc.data()} as IRoomMessages;
          this.messages.unshift(msgData);
        })
      })

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

}
