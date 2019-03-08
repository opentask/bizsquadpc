import { Electron } from './../../../providers/electron/electron';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChatRoom } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { takeUntil, filter, map } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IUser } from '../../../_models/message';

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
  chatrooms : IChatRoom[];
  squadrooms = [];
  memberCount : number;
  members = [];
  myData : IUser;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public accountService : AccountService,
    public electron : Electron,
    ) {
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.accountService.getUserObserver(this.bizFire.currentUID).pipe(takeUntil(this._unsubscribeAll))
    .subscribe(userdata => {
      this.myData = userdata;
    });

    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll))
    .subscribe((rooms) => {
      this.chatrooms = rooms.sort((a,b): number => {
        if(a.data.lastMessageTime < b.data.lastMessageTime) return 1;          
        if(a.data.lastMessageTime > b.data.lastMessageTime) return -1;
        return 0;
      });
      // context.rooms = chatRooms;
      console.log("chatrooms tab3");
      console.log(this.chatrooms);
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
  gotoSquadroom(){

  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
