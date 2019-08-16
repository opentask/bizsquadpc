import { GroupColorProvider } from './../../../providers/group-color';
import { Electron } from './../../../providers/electron/electron';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChat } from './../../../providers/chat.service';
import { BizFireService, IBizGroup } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IUser } from '../../../_models/message';
import { SquadService, ISquad } from '../../../providers/squad.service';
import firebase from 'firebase';
import {LangService} from "../../../providers/lang-service";
import {TakeUntil} from "../../../biz-common/take-until";

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
  squadChatRooms: ISquad[];
  squadrooms = [];
  memberCount : number;
  members = [];
  groupMainColor: string;
  group: IBizGroup;

  allMembers: IUser[];
  unreadList: any[];

  langPack: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public accountService : AccountService,
    public electron : Electron,
    private squadService: SquadService,
    public popoverCtrl :PopoverController,
    public groupColorProvider: GroupColorProvider,
    private langService: LangService
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
      .subscribe((list: any[]) => {
        //console.log('unread', list);
        this.unreadList = list;
    });

    this.groupMainColor = this.groupColorProvider.makeGroupColor(this.bizFire.onBizGroupSelected.getValue().data.team_color);
    this.group = this.bizFire.onBizGroupSelected.getValue();


    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),this.takeUntil)
    .subscribe((rooms : IChat[]) => {
      console.log("이게 호출되어야함.");

      this.chatRooms = rooms.sort((a,b): number => {
        if(a.data.lastMessageTime && b.data.lastMessageTime) {
          return this.TimestampToDate(b.data.lastMessageTime) - this.TimestampToDate(a.data.lastMessageTime);
        } else {
          return 0;
        }
      });

    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
      .pipe(filter(d=>d != null),this.takeUntil)
      .subscribe((squad : ISquad[]) => {

        squad.forEach(squad =>{
          const newData = squad.data;
          newData['member_count'] = Object.keys(squad.data.members).filter(uid => squad.data.members[uid] === true).length;
        });

        this.squadChatRooms = squad.sort((a,b): number => {
          if(a.data.lastMessageTime && b.data.lastMessageTime) {
            return this.TimestampToDate(b.data.lastMessageTime) - this.TimestampToDate(a.data.lastMessageTime);
          } else {
            return 0;
          }
        });

      });

  }

  TimestampToDate(value) {
    //console.log(value, typeof value);
    if(value){
      if(typeof value === 'number'){
        // this is old date number
        return new Date(value * 1000);
      } else if(value.seconds != null &&  value.nanoseconds != null){
        const timestamp = new firebase.firestore.Timestamp(value.seconds, value.nanoseconds);
        return timestamp.toDate();
      } else {
        return value;
      }
    } else {
      return value;
    }
  }

  getUnreadCount(chat): number {
    let rid;
    if(chat.cid) {
      rid = chat.cid;
    } else {
      rid = chat.sid;
    }
    return this.unreadList.filter(d => d.cid === rid).length;
  }

  makeSquadColor(squad : ISquad) {
    return this.groupColorProvider.makeSquadColor(squad.data);
  }

  gotoRoom(value:IChat){
    const cutRefValue = {cid: value.cid, data: value.data};
    this.chatService.onSelectChatRoom.next(cutRefValue);
    this.electron.openChatRoom(cutRefValue);
  }
  gotoSquadRoom(value : ISquad){
    const cutRefValue = {sid: value.sid, data: value.data};
    this.electron.openChatRoom(cutRefValue);
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-invite',{}, {cssClass: 'page-invite'});
    popover.present({ev: ev});
  }
}
