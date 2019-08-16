import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, PopoverController } from 'ionic-angular';
import { Electron } from '../../../../../providers/electron/electron';
import { AlertProvider } from '../../../../../providers/alert/alert';
import { IroomData } from '../../../../../providers/chat.service';

/**
 * Generated class for the MemberChatMenuPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

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

  roomData : IroomData;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public electron: Electron,
    public popoverCtrl :PopoverController,
    public alertCtrl : AlertProvider,) {
  }


  ngOnInit(): void {

    this.roomData = this.navParams.get('roomData');
  }

  Invite(ev){
    console.log(this.roomData);
    let popover = this.popoverCtrl.create('page-invite-room',{roomData : this.roomData}, {cssClass: 'page-invite-room'});
    popover.present({ev: ev}).then(() => this.viewCtrl.dismiss());
  }

  leaveChatRoom(){
    this.viewCtrl.dismiss();
    this.alertCtrl.leaveRoomAlert(this.roomData.uid,this.roomData.data.gid,this.roomData.cid)
  }
  close(){
    this.viewCtrl.dismiss();
  }
}
