import { ChatService } from './../chat.service';
import { Injectable } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { Electron } from '../electron/electron';

@Injectable()
export class AlertProvider {
  constructor(
    public alertCtrl: AlertController,
    public chatService: ChatService,
    public electron : Electron,
    ) { }

  showAlert() {
    const alert = this.alertCtrl.create({
      title: 'Success',
      subTitle: 'Your profile photo has been changed.',
      buttons: ['OK']
    });
    alert.present();
  }

  leaveRoomAlert(uid,cid){
    const alert = this.alertCtrl.create({
      title: 'Leave Chatroom',
      message: 'Are you sure you want to leave this chatroom?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Okay',
          handler: () => {
            this.chatService.removeMember(uid,cid);
          }
        }
      ]
    })
    alert.present();
  }
}