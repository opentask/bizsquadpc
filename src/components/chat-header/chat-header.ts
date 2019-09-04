import {Component, Input} from '@angular/core';
import {Electron} from "../../providers/electron/electron";
import {PopoverController} from "ionic-angular";
import {IChat} from "../../_models/message";
import {Commons} from "../../biz-common/commons";
import {IUser} from "../../_models";
import {CacheService} from "../../providers/cache/cache";
import {BizFireService} from "../../providers";

/**
 * Generated class for the ChatHeaderComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'chat-header',
  templateUrl: 'chat-header.html'
})
export class ChatHeaderComponent {

  private langPack : any;

  public isMemberChat: boolean;

  @Input()
  set chat(room: IChat) {
    if(room) {
      let reload = true;

      if(this.room){
        const oldCount = this._room.isPublic()? this.bizFire.currentBizGroup.getMemberCount() : this._room.getMemberCount();
        const newCount = room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : room.getMemberCount();
        // member 수가 다를 때만 리로드.
        reload = oldCount !== newCount;
      }

      this._room = room;

      if(reload){
        this.reloadTitle();
      }
    }
  }

  get room(): IChat {
    return this._room;
  }

  private _room : IChat;

  //윈도우 창 투명도 설정.
  public opacity = 100;

  //채팅방 이름,멤버수
  public chatTitle : string = 'Loading data...';
  public userCount : number = 0;

  constructor(
    public electron : Electron,
    private popoverCtrl :PopoverController,
    private bizFire : BizFireService,
    private cacheService : CacheService
  ) {
  }


  reloadTitle() {

    if(this.room == null){
      return;
    }

    console.log(this.langPack);

    if(this.room.data.type === 'member') {
      this.isMemberChat = true;
      this.cacheService.resolvedUserList(this.room.getMemberIds(false), Commons.userInfoSorter)
        .subscribe((users :IUser[]) => {
          this.chatTitle = '';
          users.forEach(u => {
            if(this.chatTitle.length > 0){
              this.chatTitle += ',';
            }
            this.chatTitle += u.data.displayName;
          });

          if(users.length === 0){
            // no user left only me.
            // add no user
            this.chatTitle = 'No user';
          }
        });
      this.userCount = this.room.getMemberCount();

    } else {
      // 스쿼드 채팅.
      this.isMemberChat = false;
      this.chatTitle = this.room.data.name;
      this.userCount = this.room.isPublic() ? this.bizFire.currentBizGroup.getMemberCount() : this.room.getMemberCount();
    }
  }



  //Chat invite Popover
  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-member-chat-menu',{}, {cssClass: 'page-member-chat-menu'});
    popover.present({ev: ev});
  }
}
