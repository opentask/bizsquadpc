import {Component, ViewChild} from '@angular/core';
import {Content, IonicPage, NavController, NavParams} from 'ionic-angular';
import {IChat} from "../../../../_models/message";
import {Electron} from "../../../../providers/electron/electron";
import {BizFireService} from "../../../../providers";
import {Commons} from "../../../../biz-common/commons";
import {Chat} from "../../../../biz-common/chat";
import {IBizGroup, IBizGroupData} from "../../../../_models";
import {BizGroupBuilder} from "../../../../biz-common/biz-group";
import {takeUntil} from "rxjs/operators";
import {ChatService} from "../../../../providers/chat.service";


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

  // 메세지를 더 로딩하기 전에
  private oldScrollHeight : number;

  constructor(private navCtrl: NavController,
              private navParams: NavParams,
              private electron : Electron,
              private bizFire : BizFireService,
              private chatService : ChatService) {
    this.getChatroom = this.navParams.get("roomData");
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
      await this.groupDataReload(chatRoom);
      await this.chatDataReload(chatRoom);

    } catch (e) {
      this.electron.windowClose();
    }
  }


  async chatDataReload(chatRoom : IChat) {
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

  async groupDataReload(chatRoom : IChat) {
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
