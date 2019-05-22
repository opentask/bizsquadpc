import { GroupColorProvider } from './../../../providers/group-color';
import { Electron } from './../../../providers/electron/electron';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChatRoom } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IUser } from '../../../_models/message';
import { SquadService, ISquad } from '../../../providers/squad.service';

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
  chatRooms : IChatRoom[];
  squadChatRooms: ISquad[]
  squadrooms = [];
  memberCount : number;
  members = [];
  groupMainColor: string;

  allMembers: IUser[];
  memberNewMessage = 0;
  squadNewMessage = 0;
  icon_mail = true;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public accountService : AccountService,
    public electron : Electron,
    private squadService: SquadService,
    public popoverCtrl :PopoverController,
    public groupColorProvider: GroupColorProvider
    ) {
      this._unsubscribeAll = new Subject<any>();

      setInterval(() => {
        if(this.icon_mail){
          this.icon_mail = false;
        } else {
          this.icon_mail = true;
        }
      },800)
  }

  ngOnInit() {
    this.groupMainColor = this.groupColorProvider.makeGroupColor(this.bizFire.onBizGroupSelected.getValue().data.team_color);
    
    // 그룹 유저정보 가져오기.
    this.members = Object.keys(this.bizFire.onBizGroupSelected.getValue().data.members).filter(uid => uid != this.bizFire.currentUID);
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
            room.data.member_data = this.allMembers.filter(d => room.data.manager[d.uid] == true);
            room.data.title = '';
            room.data.member_data.forEach(m => {
                room.data.title += m.data.displayName + ',';
            })
            room.data.title = room.data.title.slice(0,room.data.title.length-1);
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
        newData["member_count"] = Object.keys(room.data.manager).length;
        if(room.data.lastMessageTime == null) {
          newData["lastMessageTime"] = 1;
        }
        if(this.allMembers != null) {
          room.data.title = '';
          room.data.member_data = this.allMembers.filter(d => room.data.manager[d.uid] == true);
          room.data.member_data.forEach(m => {
            room.data.title += m.data.displayName + ',';
          })
          room.data.title = room.data.title.slice(0,room.data.title.length-1);
        }
      })
      this.chatRooms = rooms.sort((a,b): number => {
        return b.data.lastMessageTime - a.data.lastMessageTime;
      });
      this.memberNewMessage = this.chatRooms.filter(c => this.chatService.checkIfHasNewMessage(c)).length
    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
    .pipe(filter(d=>d != null),takeUntil(this._unsubscribeAll))
    .subscribe(squad => {
        squad.forEach(squad =>{
          const newData = squad.data;
            newData['member_count'] = Object.keys(squad.data.members).length;

          if(squad.data.lastMessageTime == null){
            newData["lastMessageTime"] = 1;
          }
        })
        this.squadChatRooms = squad.sort((a,b): number => {
          return b.data.lastMessageTime - a.data.lastMessageTime;
        });
        // console.log("스쿼드채팅방목록 : ",this.squadChatRooms)
        this.squadNewMessage = this.squadChatRooms.filter(c => this.chatService.checkIfHasNewMessage(c)).length
    })

  }


  roominfo(room){
    console.log(room)
  }


  gotoRoom(value:IChatRoom){
      value.uid = this.bizFire.currentUID;
      this.chatService.onSelectChatRoom.next(value);
      this.electron.openChatRoom(value);
  }
  gotoSquadRoom(value : ISquad){
    this.electron.openChatRoom(value);
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
