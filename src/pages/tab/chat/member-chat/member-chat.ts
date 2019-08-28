import { CacheService } from './../../../../providers/cache/cache';
import { GroupColorProvider } from './../../../../providers/group-color';
import {Component, NgZone, ViewChild} from '@angular/core';
import { IonicPage, NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { ChatService } from '../../../../providers/chat.service';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import {debounceTime, filter, map, take, takeUntil} from 'rxjs/operators';
import {BehaviorSubject, Observable, Subject, timer} from 'rxjs';
import { Commons } from "./../../../../biz-common/commons";
import {LangService} from "../../../../providers/lang-service";
import {IChat, IChatData, IMessage, IMessageData, MessageBuilder} from "../../../../_models/message";
import {IBizGroupData, IUser, IUserData} from "../../../../_models";
import {Chat} from "../../../../biz-common/chat";
import {ToastProvider} from "../../../../providers/toast/toast";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

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

  @ViewChild('scrollMe') contentArea: Content;

  showContent : boolean;

  opacity = 100;
  chatroom : IChat;

  ipc : any;
  roomData : IChatData;

  groupMainColor: string;

  start : any;
  end : any;

  // room info
  members: any;
  roomCount : number;
  chatTitle = '';

  maxFileSize = 5000000; // max file size = 5mb;
  maxChatLength = 1000;

  loadProgress : number = 0;

  langPack : any;

  chatForm : FormGroup;
  chatLengthError: string;

  private addedMessages$ = new Subject<any>();
  private addedMessages: IMessage[];
  public messages : IMessage[] = [];

  private oldScrollHeight : number;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public electron: Electron,
    public afAuth: AngularFireAuth,
    public popoverCtrl :PopoverController,
    public groupColorProvider: GroupColorProvider,
    private loading: LoadingProvider,
    private cacheService : CacheService,
    private toastProvider : ToastProvider,
    private langService : LangService,
    private fb: FormBuilder,
    ) {
      this.chatForm = fb.group(
        {
          'chat': ['', Validators.compose([
            Validators.required,
            Validators.maxLength(this.maxChatLength),
            Validators.minLength(1)
          ])]
        }
      );
    this.chatForm.get('chat').valueChanges
      .pipe(debounceTime(300))
      .subscribe((value: string) => {
        value = value.trim();
        //console.log(value);
        if(value.length > this.maxChatLength){
          this.chatLengthError = `${this.langPack['longText']} (${value.length}/${this.maxChatLength})`;
        } else {
          this.chatLengthError = null;
        }
    });

      this.afAuth.authState.subscribe((user: User | null) => {
        if(user == null){
          this.windowClose();
        }
      });
      // esc 버튼 클릭시 채팅창 닫기. node_module keycode
      document.addEventListener('keyup', event => {
        if(event.key === 'Escape' || event.keyCode === 27){
          this.electron.windowClose();
        }
      });

       this.bizFire.currentUser.subscribe((user : IUserData) => {
        if(user) {
          this.langService.onLangMap
            .pipe(takeUntil(this.bizFire.onUserSignOut))
            .subscribe((l: any) => {
              this.langPack = l;
          });
        }
      });
      this.ipc = electron.ipc;
    }

  scrollHandler($event) {
    //스크롤이 가장 상단일때
    if($event.scrollTop === 0) {
      this.oldScrollHeight = this.contentArea.getContentDimensions().scrollHeight;
      this.getMoreMessages();
    }
  }

  keydown(e : any) {
    if (e.keyCode == 13) {
      if (e.shiftKey === false) {
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


  ngOnInit(): void {

    this.chatroom = this.navParams.get('roomData');

    console.log(this.chatroom);

    if(this.chatroom != null) {
      //메세지 30개 가져오기
      this.getMessages();

      // 채팅방 정보 갱신. (초대,나가기)
      this.bizFire.afStore.doc(Commons.chatDocPath(this.chatroom.data.gid,this.chatroom.cid))
      .snapshotChanges().subscribe((snap : any) => {
        if(snap.payload.exists) {
          const newSquadData = new Chat(snap.payload.id,snap.payload.data(),this.bizFire.uid,snap.payload.ref);

          if(Object.keys(newSquadData.data.members).length !== this.roomCount) {
            this.cacheService.resolvedUserList(newSquadData.getMemberIds(false),Commons.userInfoSorter)
              .pipe(take(1))
              .subscribe((users :IUser[]) => {
                this.chatTitle = '';
                users.forEach(u => {
                  if(this.chatTitle.length > 0){
                    this.chatTitle += ',';
                  }
                  this.chatTitle += u.data.displayName;
               });
            });
          }
          this.chatroom = newSquadData;
          this.members = this.chatroom.data.members;
          this.roomCount = Object.keys(this.chatroom.data.members).length;
        }
      });

      this.bizFire.afStore.doc(Commons.groupPath(this.chatroom.data.gid)).valueChanges().subscribe((data : IBizGroupData) => {
        this.groupMainColor = data.team_color;
        // 그룹 탈퇴 당할시 채팅방을 닫는다.
        // ...
      })
    } else {
      this.electron.windowClose();
    }

    this.chatService.fileUploadProgress.subscribe(per => {
      if(per === 100) {

        // 용량이 작을때 프로그레스 바가 안나오므로..
        this.loadProgress = per;

        // 1.5초 뒤 값을 초기화한다.
        timer(1500).subscribe(() => {
          this.chatService.fileUploadProgress.next(null);
          this.loadProgress = 0;
          this.contentArea.scrollToBottom(0);
        })
      } else {
        this.loadProgress = per;
      }
      console.log(per);
    });

    this.addedMessages$.pipe(debounceTime(2000))
    .subscribe(()=>{

      try {
        const batch = this.bizFire.afStore.firestore.batch();
        let added = 0;

        const list = this.addedMessages;
        //const list = this.chatContent;
        if (list) {
          // filter my unread messages.
          let unreadList = list.filter((l: IMessage) => l.data.read == null
            || l.data.read[this.bizFire.uid] == null
            || l.data.read[this.bizFire.uid].unread === true
          );

          if (unreadList.length > 499) {
            // firestore write limits 500
            unreadList = unreadList.slice(0,400);
            //console.log(unreadList.length);
          }
          unreadList.forEach((l: IMessage) => {

            const read = {[this.bizFire.uid]: {unread: false, read: new Date()}};
            batch.set(l.ref, {read: read}, {merge: true});
            added++;

            // upload memory
            l.data.read = read;
          });

          if (added > 0) {
            console.error('unread batch call!', added);
            batch.commit();
          }
        }
      } catch (e) {
        console.error(e);
        this.addedMessages = [];
      }

      // clear processed messages
      this.addedMessages = [];
    });
  }

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 statechanges로 배열에 추가해 줍니다.
  getMessages() {

    const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(20))
    .get().subscribe(async (snapshots) => {
      if(snapshots && snapshots.docs) {
        this.start = snapshots.docs[snapshots.docs.length - 1];

        await this.getNewMessages(msgPath, this.start);

        this.loading.show();

        timer(3000).subscribe(() => {
          // call ion-content func
          this.showContent = true;
          this.contentArea.scrollToBottom(0);
          this.loading.hide();
        });
      }
    })
  }

  getNewMessages(msgPath,start) {
    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
      .startAt(start))
      .stateChanges()
      .pipe(
        map((snaps : any[]) => snaps.filter(s => s.type === 'added')),
        filter(snaps => snaps && snaps.length > 0),
        map(MessageBuilder.mapBuildSnapShot()))
      .subscribe((list : IMessage[]) => {

        this.addAddedMessages(list);

        list.forEach((message : IMessage) => {
          this.messages.push(message);
          if(!this.chatService.scrollBottom(this.contentArea) && message.data.sender !== this.bizFire.uid) {
            this.toastProvider.showToast(this.langPack['new_message']);
          }
        });

        // scroll to bottom
        if(this.chatService.scrollBottom(this.contentArea)) {
          timer(100).subscribe(() => {
            // call ion-content func
            this.contentArea.scrollToBottom(0);
          });
        }
    });
  }

  getMoreMessages() {

    const msgPath = Commons.chatMsgPath(this.chatroom.data.gid,this.chatroom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
    .startAt(this.start).limit(20)).get()
    .subscribe((snapshots) => {
      this.end = this.start;
      this.start = snapshots.docs[snapshots.docs.length - 1];

      console.log("getMoreMessages :",snapshots.docs.length);

      this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
      .startAt(this.start).endBefore(this.end))
      .stateChanges()
      .pipe(take(1),
        map((snaps : any[]) => snaps.filter(s => s.type === 'added')),
        filter(snaps => snaps && snaps.length > 0),
        map(MessageBuilder.mapBuildSnapShot()))
      .subscribe((list : IMessage[]) => {

        this.addAddedMessages(list);
        this.messages = list.concat(this.messages);

        timer(100).subscribe(() => {
          this.contentArea.scrollTo(0,this.contentArea.getContentDimensions().scrollHeight - this.oldScrollHeight,0);
          console.log("메세지 배열에 넣은 후 스크롤길이 :",this.contentArea.getContentDimensions().scrollHeight);
        });

      });
    })
  }

  sendMsg(value) {
    let valid = this.chatForm.valid;

    if(valid) {
      const text = Commons.chatInputConverter(value);

      if(text.length > 0) {
        this.chatService.addChatMessage(text,this.chatroom).then(() => {
          timer(100).subscribe(() => this.contentArea.scrollToBottom(0));
        });
        this.chatForm.setValue({chat:''});
      }
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
      const converterText = Commons.chatInputConverter(attachedFile.name);

      this.chatService.addChatMessage(converterText,this.chatroom,[attachedFile]).then(() => {
        timer(800).subscribe(() => {
          // call ion-content func
          this.contentArea.scrollToBottom(0);
        });
      });
    }
  }

  userGetObserver(uid : string): Observable<IUser> {
    return this.cacheService.userGetObserver(uid);
  }

  // return Observer of senderId
  getUserObserver(msg: IMessageData): Observable<IUser>{
    if(!msg.isNotice) {
      return this.cacheService.userGetObserver(msg.sender);
    }
  }

  downloadFile(path) {
    console.log(path);
    this.ipc.send('loadGH',path);
  }

  opacityChanges(v) {
    this.electron.setOpacity(v);
  }

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-member-chat-menu',{roomData : this.chatroom}, {cssClass: 'page-member-chat-menu'});
    popover.present({ev: ev});
  }

  private addAddedMessages(list: IMessage[]){
    if(this.addedMessages == null){
      this.addedMessages = [];
    }
    const unreadList = list.filter((l:IMessage) => l.data.read == null
      || l.data.read[this.bizFire.uid] == null
      || l.data.read[this.bizFire.uid].unread === true
    );

    if(unreadList.length > 0){
      // add to old lsit
      this.addedMessages = this.addedMessages.concat(unreadList);
      timer(0).subscribe(()=> this.addedMessages$.next());
    }
  }

  imgLoadSuccess() {
    if(this.chatService.scrollBottom(this.contentArea)) {
      timer(100).subscribe(() => {
        // call ion-content func
        this.contentArea.scrollToBottom(0);
      });
    }
  }

}
