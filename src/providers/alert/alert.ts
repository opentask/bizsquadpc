import { Injectable } from '@angular/core';
import { AlertController } from 'ionic-angular';

@Injectable()
export class AlertProvider {
  constructor(public alertCtrl: AlertController) { }

  showAlert() {
    const alert = this.alertCtrl.create({
      title: 'Success',
      subTitle: 'Your profile photo has been changed.',
      buttons: ['OK']
    });
    alert.present();
  }
}