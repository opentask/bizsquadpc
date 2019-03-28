import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { Electron } from '../../../../../providers/electron/electron';
import { AlertProvider } from '../../../../../providers/alert/alert';

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

  roomData : {
    uid : string,
    cid : string,
  }

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public electron: Electron,
    public alertCtrl : AlertProvider,) {
  }


  ngOnInit(): void {

    this.roomData = this.navParams.get('roomData');

  }

  Invite(){
    console.log(this.roomData);
    // this.viewCtrl.dismiss();
  }

  leaveChatRoom(){
    this.alertCtrl.leaveRoomAlert(this.roomData.uid,this.roomData.cid)
  }
}
