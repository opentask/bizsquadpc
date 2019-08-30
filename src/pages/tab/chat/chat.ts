import { GroupColorProvider } from './../../../providers/group-color';
import { Electron } from './../../../providers/electron/electron';
import { ChatService } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { filter } from 'rxjs/operators';
import {IChat} from '../../../_models/message';
import { SquadService, ISquad } from '../../../providers/squad.service';
import {TakeUntil} from "../../../biz-common/take-until";
import {IBizGroup, IUnreadItem, IUser} from "../../../_models";

@IonicPage({
  name: 'page-chat',
  segment: 'chat',
  priority: 'high'
})
@Component({
  selector: 'page-chat',
  templateUrl: 'chat.html',
})
export class ChatPage extends TakeUntil{

  defaultSegment : string = "chatRoom";
  chatRooms : IChat[];
  squadChatRooms: IChat[];
  members = [];
  groupMainColor: string;
  group: IBizGroup;

  unreadList: any[];

  langPack: any;

  memberUnreadTotalCount = 0;
  squadUnreadTotalCount = 0;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public electron : Electron,
    private squadService: SquadService,
    public popoverCtrl :PopoverController,
    public groupColorProvider: GroupColorProvider,
    ) {
      super();
  }

  ngOnInit() {

    this.bizFire.onLang
      .pipe(this.takeUntil)
      .subscribe((l: any) => {
        this.langPack = l.pack();
    });

    // unread count map
    this.chatService.unreadCountMap$
      .pipe(this.takeUntil)
      .subscribe((list: IUnreadItem[]) => {
        // temp array for counting.
        const typeMember = [];
        const typeSquad = [];

        // get chat data
        list.filter(i => {
          const chat = this.chatService.findChat(i.cid);
          if(chat){
            if(chat.data.type === 'member'){
              typeMember.push(chat);
            } else {
              typeSquad.push(chat);
            }
          }
        });

        this.memberUnreadTotalCount = typeMember.length > 99 ? 99 : typeMember.length;
        this.squadUnreadTotalCount = typeSquad.length > 99 ? 99 : typeSquad.length;
        console.log(this.memberUnreadTotalCount, this.squadUnreadTotalCount);

    });

    this.groupMainColor = this.groupColorProvider.makeGroupColor(this.bizFire.onBizGroupSelected.getValue().data.team_color);
    this.group = this.bizFire.onBizGroupSelected.getValue();

    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),this.takeUntil)
    .subscribe((rooms : IChat[]) => {

      console.log("룸데이터변경",rooms);

      rooms.forEach(r => {
        const newData = r.data;
        if(!r.data.lastMessageTime) {
          newData['lastMessageTime'] = 1;
        }
      });

      this.chatRooms = rooms.sort((a,b): number => {
        if(a.data.lastMessageTime && b.data.lastMessageTime) {
          return this.chatService.TimestampToDate(b.data.lastMessageTime) - this.chatService.TimestampToDate(a.data.lastMessageTime);
        } else {
          return 0;
        }
      });
    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
      .pipe(filter(d=>d != null),this.takeUntil)
      .subscribe((squad : IChat[]) => {

        squad.forEach(squad =>{
          const newData = squad.data;

          if(!squad.data.lastMessageTime) {
            newData['lastMessageTime'] = 1;
          }

          newData['member_count'] = Object.keys(squad.data.members).filter(uid => squad.data.members[uid] === true).length;
        });

        this.squadChatRooms = squad.sort((a,b): number => {
          if(a.data.lastMessageTime && b.data.lastMessageTime) {
            return this.chatService.TimestampToDate(b.data.lastMessageTime) - this.chatService.TimestampToDate(a.data.lastMessageTime);
          } else {
            return 0;
          }
        });

      });

  }

  gotoRoom(value:IChat){
    const cutRefValue = {cid: value.cid, data: value.data};
    this.chatService.onSelectChatRoom.next(value);
    this.electron.openChatRoom(cutRefValue);
  }

  gotoSquadRoom(value : IChat){
    const cutRefValue = {cid: value.cid, data: value.data};
    console.log(cutRefValue);
    this.electron.openChatRoom(cutRefValue);
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-invite',{}, {cssClass: 'page-invite'});
    popover.present({ev: ev});
  }
}
