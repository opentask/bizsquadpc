import { Injectable } from '@angular/core';
import { ToastController } from 'ionic-angular';

@Injectable()
export class ToastProvider {

  isToastPresent:boolean=false;


  constructor(private toastCtrl: ToastController) { }

  presentToast(text) {
      const toast = this.toastCtrl.create({
        message: text,
        duration: 3000
      })
      toast.present();
      this.isToastPresent=true;

      toast.onDidDismiss(() => {
        this.isToastPresent=false;
        console.log('Dismissed toast');
      });
  }

  showToast(text){
    this.isToastPresent ? '': this.presentToast(text);
  }

}
