import { Electron } from './../../../providers/electron/electron';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChatRoom } from './../../../providers/chat.service';
import { BizFireService, IBizGroup } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { takeUntil, filter, map, switchMap } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
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

  allMembers: IUser[];

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public accountService : AccountService,
    public electron : Electron,
    private squadService: SquadService,
    public popoverCtrl :PopoverController,
    ) {
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    // 그룹 유저정보 가져오기.
    this.members = Object.keys(this.bizFire.onBizGroupSelected.getValue().data.members).filter(uid => uid != this.bizFire.currentUID);
    if(this.members != null && this.members.length > 0){
      this.accountService.getAllUserInfos(this.members)
      .pipe(filter(l => {
        //null check
        // getAllUserInfos returns, [null, null, {}, {}...];
        let ret;
        ret = l.filter(ll => ll != null).length === this.members.length;
        return ret;
        })
        ,
        takeUntil(this._unsubscribeAll)
        )
      .subscribe(members => {
        this.allMembers = members;
        this.chatRooms.forEach(room => {
          room.data.member_data = this.allMembers.filter(d => room.data.members[d.uid] == true);
          room.data.title = '';
          room.data.member_data.forEach(m => {
              room.data.title += m.data.displayName + ',';
          })
          room.data.title = room.data.title.slice(0,room.data.title.length-1);
          console.log("1차",room.data.title);
        })
      })
    }

    // 멤버 채팅방
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe((rooms) => {
      rooms.forEach(room =>{
        const newData = room.data;
        newData["member_count"] = Object.keys(room.data.members).length;
        if(room.data.lastMessageTime == null) {
          newData["lastMessageTime"] = 1;
        }
        if(this.allMembers != null){
          room.data.title = '';
          room.data.member_data = this.allMembers.filter(d => room.data.members[d.uid] == true);
          room.data.member_data.forEach(m => {
            room.data.title += m.data.displayName + ',';
          })
          room.data.title = room.data.title.slice(0,room.data.title.length-1);
          console.log("2차",room.data.title);
        }
      })
      this.chatRooms = rooms.sort((a,b): number => {
        return b.data.lastMessageTime - a.data.lastMessageTime;
      });
      console.log(this.chatRooms);
    });

    // 스쿼드 채팅방
    this.squadService.onSquadListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe(squad => {
      squad.forEach(squad =>{
        const newData = squad.data;
        newData['member_count'] = Object.keys(squad.data.members).length;
        if(newData['member_count'] == 1) {
          newData['member_count'] = Object.keys(this.bizFire.onBizGroupSelected.getValue().data.members).length - Object.keys(this.bizFire.onBizGroupSelected.getValue().data.partners).length;
        }
        if(squad.data.lastMessageTime == null){
          newData["lastMessageTime"] = 1;
        }
      })
      this.squadChatRooms = squad.sort((a,b): number => {
         return b.data.lastMessageTime - a.data.lastMessageTime;
      });
    })

  }


  roominfo(room){
    console.log(room)
  }


  gotoRoom(value:IChatRoom){
      value.uid = this.bizFire.currentUID;
      this.chatService.onSelectChatRoom.next(value);
      console.log("룸데이터 최신화되었는가",value);
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
