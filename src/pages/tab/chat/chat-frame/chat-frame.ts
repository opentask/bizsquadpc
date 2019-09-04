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
import {timer} from "rxjs";
import {filter, map, takeUntil} from "rxjs/operators";
import {LangService} from "../../../../providers/lang-service";
import {ToastProvider} from "../../../../providers/toast/toast";


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
              private chatService : ChatService) {
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
  }

  ngOnInit() {
    if(this.getChatroom) {
      this.onWindowChat(this.getChatroom);
    } else {
      this.electron.windowClose();
    }
  }


  scrollHandler($event) {
    //스크롤이 가장 상단일때
    if($event.scrollTop === 0) {
      this.oldScrollHeight = this.contentArea.getContentDimensions().scrollHeight;
      // this.getMoreMessages();
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
    const msgPath = chatRoom.data.type === 'member' ? Commons.chatMsgPath(chatRoom.data.gid,chatRoom.cid) : Commons.chatSquadMsgPath(chatRoom.data.gid,chatRoom.cid);

    await this.bizFire.afStore.collection(msgPath,ref => ref.orderBy('created','desc').limit(20))
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

      if(group.data.members[this.bizFire.uid] === true && group.data.status === true) {
        this.bizFire.onBizGroupSelected.next(group);
      } else {
        this.electron.windowClose();
      }
    });
  }

}
