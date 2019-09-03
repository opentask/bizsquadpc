import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-chat-frame',
  templateUrl: 'chat-frame.html',
})
export class ChatFramePage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

}
