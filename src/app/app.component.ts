
import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import * as electron from 'electron';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  rootPage:any = 'page-login';

  constructor() {
  }
  
  ngOnInit(): void {

  }
}

