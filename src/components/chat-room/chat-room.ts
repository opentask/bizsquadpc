import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {IUser} from "../../_models/message";
import { CacheService } from "../../providers/cache/cache";
import {Commons} from "../../biz-common/commons";
import {IChat} from "../../providers/chat.service";
import {BizFireService} from "../../providers";
import {ISquad} from "../../providers/squad.service";
import {takeUntil} from "rxjs/operators";

@Component({
  selector: 'chat-room',
  templateUrl: 'chat-room.html'
})

export class ChatRoomComponent {

  myId : string;

  _room : IChat | ISquad;

  userList$: Observable<IUser[]>;

  userCount: number = 0;
  unreadCount: number = 0;
  chatTitle: string = '';

  private _unsubscribeAll;

  _squadChat: boolean;

  @Input()
  set squadChat(type : boolean) {
    this._squadChat = type;
  }
  get squadChat(): boolean {
    return this._squadChat;
  }

  @Input()
  set chat(room : IChat | ISquad) {
    if(room) {
      this._room = room;
      if(room.data.type === 'member') {
        this.userList$ = this.cacheService.resolvedUserList(Object.keys(room.data.members),Commons.userInfoSorter);
        this.userCount = Object.keys(room.data.members).filter(uid => room.data.members[uid] === true).length;
        this.userList$.pipe(takeUntil(this._unsubscribeAll)).subscribe((users :IUser[]) => {
          console.log("usersusers",users);
          users.forEach(u => {
            this.chatTitle += u.data.displayName  + ',';
          });
          this.chatTitle = this.chatTitle.slice(0,this.chatTitle.length -1);
        });
      } else {
        //스쿼드채팅

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
              private bizFire : BizFireService) {
    this._unsubscribeAll = new Subject<any>();
  }


  ngOnInit() {
    this.myId = this.bizFire.uid;

  }

  onSelectRoom(){
    this.onClick.emit(this._room);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
