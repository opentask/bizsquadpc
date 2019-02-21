import { Electron } from './../../../../providers/electron/electron';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({  
  name: 'page-squad-chat',
  segment: 'squad-chat',
  priority: 'high'
})
@Component({
  selector: 'page-squad-chat',
  templateUrl: 'squad-chat.html',
})
export class SquadChatPage {

  squadData : any;
  memberCount : any;

  constructor(
     public navCtrl: NavController,
     public navParams: NavParams,
     public electron: Electron) {
       this.squadData = this.navParams.get("data");

       if(this.squadData != null){
        console.log(this.squadData);
        this.memberCount = Object.keys(this.squadData.members).length;
       }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SquadChatPage');
  }

  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
}
