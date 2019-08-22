import { BizFireService } from './../biz-fire/biz-fire';
import { ChatService } from './../chat.service';
import { Injectable } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { Electron } from '../electron/electron';
import {NotificationService} from "../notification.service";
import {INotificationItem} from "../../_models";
import {TokenProvider} from "../token/token";
import {take} from "rxjs/operators";

@Injectable()
export class AlertProvider {

  private ipc: any;

  private langPack = {};

  constructor(
    public alertCtrl: AlertController,
    public chatService: ChatService,
    public electron : Electron,
    public bizFire : BizFireService,
    private noticeService : NotificationService,
    private   tokenService : TokenProvider
    ) {
      this.ipc = this.electron.ipc;

      this.bizFire.onLang
        .pipe(take(1))
        .subscribe(l => {
          this.langPack = l.pack();
        });
    }

  successEditProfile() {
    const alert = this.alertCtrl.create({
      title: this.langPack['success'],
      subTitle: this.langPack['profile_update_success'],
      buttons: [this.langPack['ok']]
    });
    alert.present();
  }

  groupInviteAlert(msg : INotificationItem) {
    const alert = this.alertCtrl.create({
      title: this.langPack['invitation'],
      message: this.langPack['invitation_confirm'],
      buttons: [
        {
          text: this.langPack['cancel'],
          role: 'cancel',
        }, {
          text: this.langPack['accept'],
          handler: () => {
            // 여기에 그룹 승인 함수
            this.noticeService.acceptInvitation(msg.data).then(() => {

              this.noticeService.deleteNotification(msg);

              this.noticeService.onClickNotifyContents(msg);
            })
          }
        }
      ]
    });
    alert.present();
  }

  deleteInviteAlert(msg : INotificationItem) {
    const alert = this.alertCtrl.create({
      title: this.langPack['deiete_invitation'],
      message: this.langPack['notice_delete_confirm_test'],
      buttons: [
        {
          text: this.langPack['cancel'],
          role: 'cancel',
        }, {
          text: this.langPack['delete'],
          handler: () => {
              this.noticeService.deleteNotification(msg);
          }
        }
      ]
    });
    alert.present();
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
