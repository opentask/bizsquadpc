import {Component, ViewChild} from '@angular/core';
import {Content, IonicPage, NavController, NavParams} from 'ionic-angular';
import {IChat, IMessage, MessageBuilder} from "../../../../_models/message";
import {Electron} from "../../../../providers/electron/electron";
import {BizFireService, LoadingProvider} from "../../../../providers";
import {Commons} from "../../../../biz-common/commons";
import {Chat} from "../../../../biz-common/chat";
import {IBizGroup, IBizGroupData, IUserData} from "../../../../_models";
import {BizGroupBuilder} from "../../../../biz-common/biz-group";
import {ChatService} from "../../../../providers/chat.service";
import {Subject, timer} from "rxjs";
import {debounceTime, filter, map, take, takeUntil} from "rxjs/operators";
import {LangService} from "../../../../providers/lang-service";
import {ToastProvider} from "../../../../providers/toast/toast";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";


@IonicPage({
  name: 'page-chat-frame',
  segment: 'chat-frame',
  priority: 'high'
})
@Component({
  selector: 'page-chat-frame',
  templateUrl: 'chat-frame.html',
})

export class ChatFramePage {

  // 스크롤 컨텐츠
  @ViewChild('scrollContent') contentArea: Content;

  // 채팅 input
  chatForm : FormGroup;

  //비즈그룹 데이터
  private selectBizGroup : IBizGroup;

  // 부모 윈도우에서 받은 룸 데이터 : getChatroom.
  // 새로 로드하는 룸 데이터 : newChatRoom.
  private getChatroom : IChat;
  public newChatRoom : IChat;

  // 메세지 + 사진이 전부 로딩될때까지 컨텐츠내용 숨김.
  public showContent : boolean;

  // 메세지를 더 로딩했을때 그 전(메세지가추가되기 전) 높이 저장
  private oldScrollHeight : number;

  //메세지 배열
  public chatContent : IMessage[] = [];

  //메세지 개수 초과 에러 텍스트
  private maxChatLength = 1000;
  public chatLengthError: string;

  //max file size
  maxFileSize = 20000000; // max file size = 20mb;

  //read, Unread
  private addedMessages$ = new Subject<any>();
  private addedMessages: IMessage[];

  // 지난메세지(moreMessage) 불러올때 기준이되는 값
  private start : any;
  private end : any;

  //언어 팩
  langPack : any;

  constructor(private navCtrl: NavController,
              private navParams: NavParams,
              private electron : Electron,
              private bizFire : BizFireService,
              private loading: LoadingProvider,
              private langService : LangService,
              private toastProvider : ToastProvider,
              private chatService : ChatService,
              private fb: FormBuilder,)
  {
    this.getChatroom = this.navParams.get("roomData");

    this.bizFire.currentUser.subscribe((user : IUserData) => {
      if(user) {
        this.langService.onLangMap
          .pipe(takeUntil(this.bizFire.onUserSignOut))
          .subscribe((l: any) => {
            this.langPack = l;
          });
      }
    });

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
  }

  ngOnInit() {
    if(this.getChatroom) {
      this.onWindowChat(this.getChatroom);

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
    } else {
      this.electron.windowClose();
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

  sendMsg(value : any) {
    let valid = this.chatForm.valid;

    if(valid) {
      const text = Commons.chatInputConverter(value);

      if(text.length > 0) {
        this.chatService.addChatMessage(text,this.newChatRoom).then(() => {
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
    const maxFileSize = this.selectBizGroup.data.maxFileSize == null ? this.maxFileSize : this.selectBizGroup.data.maxFileSize;

    if(file.target.files[0].size > maxFileSize){
      this.electron.showErrorMessages("Failed to send file.","sending files larger than 10mb.");
    } else {
      const attachedFile  = file.target.files[0];
      const converterText = Commons.chatInputConverter(attachedFile.name);

      this.chatService.addChatMessage(converterText,this.newChatRoom,[attachedFile]).then(() => {
        timer(800).subscribe(() => {
          // call ion-content func
          this.contentArea.scrollToBottom(0);
        });
      });
    }
  }


  scrollHandler($event) {
    //스크롤이 가장 상단일때
    if($event.scrollTop === 0) {
      this.oldScrollHeight = this.contentArea.getContentDimensions().scrollHeight;
      this.getMoreMessages();
    }
  }

  async onWindowChat(chatRoom : IChat) {
    // 새로운 윈도우창이므로 그룹,채팅방 데이터 다시 불러오기
    try{
      await this.groupDataLoad(chatRoom);
      await this.chatDataLoad(chatRoom);

      await this.getMessages(chatRoom);

    } catch (e) {
      this.electron.windowClose();
    }
  }

  // 최초 메세지 30개만 가져오고 이 후 작성하는 채팅은 getNewMessages로 배열에 추가해 줍니다.
  async getMessages(chatRoom : IChat) {
    const msgPath = chatRoom.data.type === 'member' ?
      Commons.chatMsgPath(chatRoom.data.gid,chatRoom.cid) :
      Commons.chatSquadMsgPath(chatRoom.data.gid,chatRoom.cid);

    await this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(20))
      .get().subscribe(async (snapshots) => {
      if(snapshots && snapshots.docs) {
        this.start = snapshots.docs[snapshots.docs.length - 1];

        await this.getNewMessages(msgPath, this.start);

        this.loading.show();

        timer(2500).subscribe(() => {
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
          this.chatContent.push(message);

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

    const msgPath = this.newChatRoom.data.type === 'member' ?
      Commons.chatMsgPath(this.newChatRoom.data.gid,this.newChatRoom.cid) :
      Commons.chatSquadMsgPath(this.newChatRoom.data.gid,this.newChatRoom.cid);

    this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc')
      .startAt(this.start).limit(30)).get()
      .subscribe((snapshots) => {
        this.end = this.start;
        this.start = snapshots.docs[snapshots.docs.length - 1];

        this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created')
          .startAt(this.start).endBefore(this.end))
          .stateChanges()
          .pipe(take(1),
            map((snaps : any[]) => snaps.filter(s => s.type === 'added')),
            filter(snaps => snaps && snaps.length > 0),
            map(MessageBuilder.mapBuildSnapShot()))
          .subscribe((list : IMessage[]) => {

            this.addAddedMessages(list);
            this.chatContent = list.concat(this.chatContent);

            timer(100).subscribe(() => {
              this.contentArea.scrollTo(0,this.contentArea.getContentDimensions().scrollHeight - this.oldScrollHeight,0);
              console.log("메세지 배열에 넣은 후 스크롤길이 :",this.contentArea.getContentDimensions().scrollHeight);
            });

          });
      })
  }



  async chatDataLoad(chatRoom : IChat) {
    const RoomPath = chatRoom.data.type === 'member' ? Commons.chatDocPath(chatRoom.data.gid,chatRoom.cid) : Commons.chatSquadPath(chatRoom.data.gid,chatRoom.cid);
    // 채팅방 정보 갱신. (초대,나가기)
    await this.bizFire.afStore.doc(RoomPath)
      .snapshotChanges().subscribe((snap : any) => {
      if(snap.payload.exists) {
        this.newChatRoom = new Chat(snap.payload.id,snap.payload.data(),this.bizFire.uid,snap.payload.ref);

        this.chatService.onSelectChatRoom.next(this.newChatRoom);
      }
    });
  }

  async groupDataLoad(chatRoom : IChat) {
    await this.bizFire.afStore.doc(Commons.groupPath(chatRoom.data.gid))
    .valueChanges()
    .subscribe((data : IBizGroupData) => {

      const group : IBizGroup = BizGroupBuilder.buildWithData(chatRoom.data.gid,data,this.bizFire.uid);
      this.selectBizGroup = group;

      if(group.data.members[this.bizFire.uid] === true && group.data.status === true) {
        this.bizFire.onBizGroupSelected.next(group);
      } else {
        this.electron.windowClose();
      }
    });
  }

  // read , unread
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

}
