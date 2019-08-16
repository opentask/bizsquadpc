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

@IonicPage({
  name: 'page-chat',
  segment: 'chat',
  priority: 'high'
})
@Component({
  selector: 'page-chat',
  templateUrl: 'chat.html',
})
export class ChatPage {

  private _unsubscribeAll;
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
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l.pack();
    });

    // unread count map
    this.chatService.unreadCountMap$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((list: any[]) => {
        //console.log('unread', list);
        this.unreadList = list;
        console.log("unreadListunreadList",this.unreadList);
      });

    this.groupMainColor = this.groupColorProvider.makeGroupColor(this.bizFire.onBizGroupSelected.getValue().data.team_color);
    this.group = this.bizFire.onBizGroupSelected.getValue();

    // 그룹 유저정보 가져오기.
    this.members = this.bizFire.onBizGroupSelected.getValue().data.members;
    this.members = Object.keys(this.members)
    .filter(uid => this.members[uid] === true)
    .filter(uid => uid != this.bizFire.currentUID)
    .map(uid => uid);
    console.log("this.members :",this.members);


    if(this.members != null && this.members.length > 0){
      this.accountService.getAllUserInfos(this.members)
      .pipe(filter(l => {
        let ret;
        ret = l.filter(ll => ll != null).length === this.members.length;
        return ret;
        })
        ,takeUntil(this._unsubscribeAll))
      .subscribe(members => {
        this.allMembers = members;
        if(this.chatRooms != null){
          this.chatRooms.forEach(room => {
            room.data['member_data'] = this.allMembers.filter(d => room.data.members[d.uid] == true);
            room.data['title'] = '';
            room.data['member_data'].forEach(m => {
                room.data['title'] += m.data.displayName + ',';
            })
            room.data['title'] = room.data['title'].slice(0,room.data['title'].length-1);
          })
        }
      })
    }

    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe((rooms) => {
      rooms.forEach(room =>{
        const newData = room.data;
        newData["member_count"] = Object.keys(room.data.members).filter(uid => room.data.members[uid] === true).length;
        // newData["members"] = Object.keys(room.data.members).filter(uid => room.data.members[uid] === true);

        if(room.data.lastMessageTime == null) {
          newData["lastMessageTime"] = 0;
        }

        if(this.allMembers != null) {
          room.data['title'] = '';
          room.data['member_data'] = this.allMembers.filter(d => room.data.members[d.uid] == true);
          room.data['member_data'].forEach(m => {
            room.data['title'] += m.data.displayName + ',';
          });
          room.data['title'] = room.data['title'].slice(0,room.data['title'].length-1);
        }
      });
      this.chatRooms = rooms.sort((a,b): number => {

        return this.TimestampToDate(b.data.lastMessageTime) - this.TimestampToDate(a.data.lastMessageTime);

      });
    });

          // 스쿼드 채팅방
          this.squadService.onSquadListChanged
            .pipe(filter(d=>d != null),takeUntil(this._unsubscribeAll))
            .subscribe(squad => {
              squad.forEach(squad =>{
                const newData = squad.data;
                newData['member_count'] = Object.keys(squad.data.members).filter(uid => squad.data.members[uid] === true).length;

                if(squad.data.lastMessageTime == null){
                  newData["lastMessageTime"] = 0;
                }
              });
              this.squadChatRooms = squad.sort((a,b): number => {

                return this.TimestampToDate(b.data.lastMessageTime) - this.TimestampToDate(a.data.lastMessageTime);

        });
    })

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
    let ret = 0;
    let rid;
    if(chat.cid) {
      rid = chat.cid;
    } else {
      rid = chat.sid;
    }
    if(this.unreadList) {
      ret = this.unreadList.filter(d => d.cid === rid).length;
      return ret;
    } else {
      return ret;
    }
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

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
