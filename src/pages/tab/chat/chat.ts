import { ChatService } from './../../../providers/chat.service';
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
  chatrooms = [];
  squadrooms = [];

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public chatService : ChatService
    ) {
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    console.log(this.bizFire.currentUID);

    this.chatService.onChatRoomListChanged
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll)
    ,map(docs => docs.filter(d=>{
          return d.data.members[this.bizFire.currentUID].notification_id == '';
        })
      ))
    .subscribe(rooms => {
        this.chatrooms = rooms.sort((a,b): number => {
        if(a.data.lastMessageTime < b.data.lastMessageTime) return 1;          
        if(a.data.lastMessageTime > b.data.lastMessageTime) return -1;
        return 0;
      });
      // context.rooms = chatRooms;
      console.log(this.chatrooms);
    });
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
