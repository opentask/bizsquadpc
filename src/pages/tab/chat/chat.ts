import { IUser } from './../../../_models/message';
import { AccountService } from './../../../providers/account/account';
import { ChatService, IChatRoom } from './../../../providers/chat.service';
import { BizFireService } from './../../../providers/biz-fire/biz-fire';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { takeUntil, filter, map } from 'rxjs/operators';
import { Subject } from 'rxjs';

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

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService,
    public accountService : AccountService
    ) {
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {
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
      this.chatrooms.forEach(room => {
        Object.keys(room.data.members).filter(uid => uid != this.bizFire.currentUID).forEach(user =>{
          this.members.push(user);
        })
        this.accountService.getAllUserInfos(this.members)
        .pipe(filter(l => {
            //null check
            // getAllUserInfos returns, [null, null, {}, {}...];
            let ret;
            ret = l.filter(ll => ll != null).length === this.members.length;
            return ret;
        })).subscribe(allUsers => {
          const newData = room;
          newData['test'] = allUsers;
          room = newData;
          console.log(this.chatrooms);
        })
      })
    });
  }

  roominfo(room){
    console.log(room)
  }


  gotoRoom(room){
    console.log(room);
  }
  gotoSquadroom(){

  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
