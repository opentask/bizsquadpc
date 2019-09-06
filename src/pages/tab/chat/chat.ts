import { GroupColorProvider } from './../../../providers/group-color';
import { Electron } from './../../../providers/electron/electron';
import { ChatService } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import {distinctUntilChanged, filter} from 'rxjs/operators';
import {IChat, IMessageData} from '../../../_models/message';
import { SquadService, ISquad } from '../../../providers/squad.service';
import {TakeUntil} from "../../../biz-common/take-until";
import {IBizGroup, IUnreadItem, IUser} from "../../../_models";
import {Subject} from "rxjs";

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

  langPack: any;

  memberUnreadTotalCount = 0;
  squadUnreadTotalCount = 0;

  // sort distinct and debounce subject
  sortChatRooms$ = new Subject<string>();

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

    this.bizFire.onBizGroupSelected.pipe(this.takeUntil).subscribe((group : IBizGroup) => {
      this.groupMainColor = this.groupColorProvider.makeGroupColor(group.data.team_color);
    });

    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),this.takeUntil)
    .subscribe((rooms : IChat[]) => {
      this.chatRooms = rooms;
    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
    .pipe(filter(d=>d != null),this.takeUntil)
    .subscribe((squad : IChat[]) => {
      this.squadChatRooms = squad;
    });


    /*
    * sort 채팅방
    * 마지막 메시지가 도착한 순으로 소팅
    * */
    this.sortChatRooms$
      .pipe(
        this.takeUntil,
        distinctUntilChanged() // 같은 채팅창이면 이미 소팅되어있으므로 무시
      )
      .subscribe((cid: string) => {
        let target;
        if(this.chatRooms){
          if(this.chatRooms.findIndex(c => c.cid === cid) !== -1) {
            // cid goes to top.
            target = this.chatRooms;
          }
        }
        if(!target && this.squadChatRooms){
          if(this.squadChatRooms.findIndex(c => c.cid === cid) !== -1) {
            target = this.squadChatRooms;
          }
        }
        console.log(target);
        if(target){
          target.sort( (a: IChat, b: IChat) => {
            let ret = 0;
            if(a.cid === cid){
              ret = -1; //a up
            } else if(b.cid === cid){
              ret = 1;//b up
            }
            return ret;
          });
        }
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

  onLastMessageChanged(value) {
    if(value == null)return;

    const room: IChat = value.room;
    const data: IMessageData = value.data;
    console.log('onLastMessageChanged,', room.cid, data.message.text);

    this.sortChatRooms$.next(room.cid);
  }
}
