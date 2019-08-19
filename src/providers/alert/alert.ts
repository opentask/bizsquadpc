import { BizFireService } from './../biz-fire/biz-fire';
import { ChatService } from './../chat.service';
import { Injectable } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { Electron } from '../electron/electron';
import {NotificationService} from "../notification.service";
import {INotificationItem} from "../../_models";

@Injectable()
export class AlertProvider {

  private ipc: any;

  constructor(
    public alertCtrl: AlertController,
    public chatService: ChatService,
    public electron : Electron,
    public bizFire : BizFireService,
    private noticeService : NotificationService,
    ) {
      this.ipc = this.electron.ipc;
    }

  showAlert(title,text) {
    const alert = this.alertCtrl.create({
      title: title,
      subTitle: text,
      buttons: ['OK']
    });
    alert.present();
  }

  groupInviteAlert(title,text,msg : INotificationItem) {
    const alert = this.alertCtrl.create({
      title: title,
      message: text,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Accept',
          handler: () => {
            // 여기에 그룹 승인 함수
            this.noticeService.acceptInvitation(msg.data).then(() => {

              this.noticeService.deleteNotification(msg);

              this.ipc.send('loadGH',msg.html.link[0]);
            })
          }
        }
      ]
    })
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
