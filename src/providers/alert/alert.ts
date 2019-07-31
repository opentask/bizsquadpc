import { BizFireService } from './../biz-fire/biz-fire';
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
    public bizFire : BizFireService,
    ) { }

  showAlert() {
    const alert = this.alertCtrl.create({
      title: 'Success',
      subTitle: 'Your profile photo has been changed.',
      buttons: ['OK']
    });
    alert.present();
  }
  logoutSelectUser() {
    const alert = this.alertCtrl.create({
      title: 'info',
      subTitle: 'Your opponent is not online.',
      buttons: ['OK']
    });
    alert.present();
  }

  VideoCall(){
    const alert = this.alertCtrl.create({
      title: 'Video Call',
      message: 'Someone made a video call to you.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Connect',
          handler: () => {
            this.electron.openVedioRoom();
          }
        }
      ]
    })
    return alert.present();
  }

  leaveRoomAlert(uid,gid,cid){
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
            this.chatService.removeMember(uid,gid,cid);
          }
        }
      ]
    })
    alert.present();
  }
}
