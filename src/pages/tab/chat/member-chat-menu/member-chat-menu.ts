import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, PopoverController } from 'ionic-angular';
import { Electron } from '../../../../providers/electron/electron';
import { AlertProvider } from '../../../../providers/alert/alert';
import {IChat} from "../../../../_models/message";
import {takeUntil} from "rxjs/operators";
import {Subject} from "rxjs";
import {ChatService} from "../../../../providers/chat.service";
import {BizFireService} from "../../../../providers";

@IonicPage({
  name: 'page-member-chat-menu',
  segment: 'member-chat-menu',
  priority: 'high'
})
@Component({
  selector: 'page-member-chat-menu',
  templateUrl: 'member-chat-menu.html',
})
export class MemberChatMenuPage {

  selectChatRoom : IChat;

  private _unsubscribeAll;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public electron: Electron,
    public popoverCtrl :PopoverController,
    private chatService : ChatService,
    public bizFire : BizFireService,
    public alertCtrl : AlertProvider,) {

    this._unsubscribeAll = new Subject<any>();
  }


  ngOnInit(): void {

    this.chatService.onSelectChatRoom
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((chat : IChat) => {
        this.selectChatRoom = chat;
    })

  }

  Invite(ev){
    let popover = this.popoverCtrl.create('page-invite-room',{}, {cssClass: 'page-invite-room'});
    popover.present({ev: ev}).then(() => this.viewCtrl.dismiss());
  }

  leaveChatRoom(){
    this.viewCtrl.dismiss();
    this.alertCtrl.leaveRoomAlert(this.bizFire.uid,this.selectChatRoom.data.gid,this.selectChatRoom.cid);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
