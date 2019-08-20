import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Observable, Subject} from "rxjs";
import { CacheService } from "../../providers/cache/cache";
import {Commons} from "../../biz-common/commons";
import {BizFireService} from "../../providers";
import {ISquad} from "../../providers/squad.service";
import {TakeUntil} from "../../biz-common/take-until";
import {IChat} from "../../_models/message";
import {IUnreadItem, IUser} from "../../_models";
import {ChatService} from "../../providers/chat.service";
import {filter, map} from "rxjs/operators";

@Component({
  selector: 'chat-room',
  templateUrl: 'chat-room.html'
})

export class ChatRoomComponent extends TakeUntil{

  myId : string;

  private _room : IChat;

  userCount: number = 0;
  unreadCount: number = 0;

  chatTitle: string = '';

  _squadChat: boolean;

  @Input()
  set squadChat(type : boolean) {
    this._squadChat = type;
  }
  get squadChat(): boolean {
    return this._squadChat;
  }

  @Input()
  set chat(room : IChat) {
    if(room) {

      let reload = true;

      if(this._room){
        const oldCount = this._room.isPublic()? this.bizFire.currentBizGroup.getMemberCount() : this._room.getMemberCount();
        const newCount = room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : room.getMemberCount();
        // member 수가 다를 때만 리로드.
        reload = oldCount !== newCount;
      }
      this._room = room;

      if(reload){
        if(this._room.data.type === 'member') {
          this.chatTitle = '';
          this.cacheService.resolvedUserList(this._room.getMemberIds(false), Commons.userInfoSorter)
            .subscribe((users :IUser[]) => {
              users.forEach(u => {
                if(this.chatTitle.length > 0){
                  this.chatTitle += ',';
                }
                this.chatTitle += u.data.displayName;
              });
            });
          this.userCount = this._room.getMemberCount();
        } else {
          // 스쿼드 채팅
          this.chatTitle = this._room.data.name;
          this.userCount = this._room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : this.room.getMemberCount();
        }
      }

    }
  }

  @Input()
  set unread(count : number) {
    this.unreadCount = count;
  }

  @Output()
  onClick = new EventEmitter<any>();

  get room(): IChat | ISquad {
    return this._room;
  }

  constructor(private cacheService: CacheService,
              private chatService : ChatService,
              private bizFire : BizFireService) {
    super();
  }


  ngOnInit() {
    this.myId = this.bizFire.uid;

    if(this._room){
      const cid = this._room.cid;

      this.chatService.unreadCountMap$
        .pipe(
          this.takeUntil,
          filter(d=>d!=null),
          map((list: IUnreadItem[]) => list.filter(i=> i.cid === this._room.cid))
        )
        .subscribe((map: IUnreadItem[]) => {
          if(map){
            //console.log('unread datas:',cid,  map);
            this.unreadCount = map.length;
          }
        });
    }

  }

  onSelectRoom(){
    this.onClick.emit(this._room);
  }

}
