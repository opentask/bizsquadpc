import { CacheService } from './../../../../providers/cache/cache';
import { GroupColorProvider } from './../../../../providers/group-color';
import {Component, ViewChild} from '@angular/core';
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
import {IBizGroup, IBizGroupData, IUser, IUserData} from "../../../../_models";
import {Chat} from "../../../../biz-common/chat";
import {ToastProvider} from "../../../../providers/toast/toast";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {BizGroupBuilder} from "../../../../biz-common/biz-group";

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

  maxFileSize = 20000000; // max file size = 5mb;
  maxChatLength = 1000;

  loadProgress : number = 0;

  langPack : any;

  chatForm : FormGroup;
  chatLengthError: string;

  private selectBizGroupData : IBizGroupData;

  private addedMessages$ = new Subject<any>();
  private addedMessages: IMessage[];
  public messages : IMessage[] = [];

  private oldScrollHeight : number;

  userList$: Observable<IUser[]>;

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
    const maxFileSize = this.selectBizGroupData.maxFileSize == null ? this.maxFileSize : this.selectBizGroupData.maxFileSize;

    if(file.target.files[0].size > maxFileSize){
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
