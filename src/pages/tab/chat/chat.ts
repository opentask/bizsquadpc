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
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll),takeUntil(this.bizFire.onUserSignOut))
    .subscribe((rooms) => {
      this.chatrooms = rooms.sort((a,b): number => {
        if(a.data.lastMessageTime < b.data.lastMessageTime) return 1;          
        if(a.data.lastMessageTime > b.data.lastMessageTime) return -1;
        return 0;
      })
      this.chatrooms.map(room => {
        this.memberCount = Object.keys(room.data.members).length;

        const uids = Object.keys(room.data.members).filter(l => l != this.bizFire.currentUID);
        this.accountService.getAllUserInfos(uids).pipe(filter(l =>{
          let ret;
          ret = l.filter(li => li != null).length === uids.length;
          return ret;
        }))
        .subscribe(userData => {
          room.data.members = userData[0];
        })
      })
      console.log(this.chatrooms);
    })


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
