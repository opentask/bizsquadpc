import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {IChat} from "../../../../_models/message";


@IonicPage({
  name: 'page-chat-frame',
  segment: 'chat-frame',
  priority: 'high'
})
@Component({
  selector: 'page-chat-frame',
  templateUrl: 'chat-frame.html',
})


export class ChatFramePage {

  private chatroom : IChat;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.chatroom = this.navParams.get("roomData");
    console.log("chatroom :::",this.chatroom);
  }

}
