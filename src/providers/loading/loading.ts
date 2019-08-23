import { Injectable } from '@angular/core';
import { LoadingController, Loading } from 'ionic-angular';
import { environment } from '../../environments/environments';

@Injectable()
export class LoadingProvider {
  private loading: Loading;
  constructor(private loadingCtrl: LoadingController) { }

  // Show the loading indicator.
  public show(): void {
    if (!this.loading) {
      this.loading = this.loadingCtrl.create({
        spinner: 'ios',
        showBackdrop: false,
      });
      this.loading.present();
    }
  }

  // Hide the loading indicator.
  public hide(): void {
    if (this.loading) {
      this.loading.dismiss();
      this.loading = null;
    }
  }


}
