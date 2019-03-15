import { Electron } from './../../../providers/electron/electron';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChatRoom } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { takeUntil, filter, map } from 'rxjs/operators';
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
  myData : IUser;
  generalMembers: number;
  

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
    this.accountService.getUserObserver(this.bizFire.currentUID).pipe(takeUntil(this._unsubscribeAll))
    .subscribe(userdata => {
      this.myData = userdata;
    });
    
    this.bizFire.onBizGroupSelected
    .pipe(filter(g=>g!=null), takeUntil(this._unsubscribeAll))
    .subscribe(group => {
        if(group.data.partners != null){
          this.generalMembers = Object.keys(group.data.members).length - Object.keys(group.data.partners).length;
        } else {
          this.generalMembers = Object.keys(group.data.members).length
        }
    });
    
    this.squadService.onSquadListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe(squad => {
      squad.forEach(squad =>{
        const newData = squad.data;
        if(squad.data.lastMessageTime == null){
          newData["lastMessageTime"] = 1;
        }
      })
      this.squadChatRooms = squad.sort((a,b): number => {
         return b.data.lastMessageTime - a.data.lastMessageTime;
      });
    })
     
    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe((rooms) => {
      rooms.forEach(room =>{
        const newData = room.data;
        newData["member_count"] = Object.keys(room.data.members).length;
        if(room.data.lastMessageTime == null){
          newData["lastMessageTime"] = 1;
        }
      })
      this.chatRooms = rooms.sort((a,b): number => {
        return b.data.lastMessageTime - a.data.lastMessageTime;
      });
      // context.rooms = chatRooms;
      console.log("chatrooms tab3");
      console.log(this.chatRooms);
    });
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
