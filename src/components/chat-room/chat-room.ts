import {Component, Input} from '@angular/core';
import {Observable} from "rxjs";
import {IUser} from "../../_models/message";
import { CacheService } from "../../providers/cache/cache";
import {Commons} from "../../biz-common/commons";
import {IChatRoom} from "../../providers/chat.service";

/**
 * Generated class for the ChatRoomComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'chat-room',
  templateUrl: 'chat-room.html'
})
export class ChatRoomComponent {

  text: string;
  _chat : IChatRoom;

  @Input()
  set groupColor(color : string) {
    if(color){
      this._groupColor = color;
    }
  }

  @Input()
  set room(room : IChatRoom) {
    if(room) {
      this._chat = room;
      this.userList$ = this.cacheService.resolvedUserList(Object.keys(room.data.members),Commons.userInfoSorter);
    }
  }



  get groupColor(): string {
    return this._groupColor;
  }

  private _groupColor = '#3f51b5';  //default

  userList$: Observable<IUser[]>;

  constructor(private cacheService: CacheService,) {
    console.log('Hello ChatRoomComponent Component');
    this.text = 'Hello World';
  }

}
