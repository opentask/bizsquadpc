
import { Component } from '@angular/core';
import * as electron from 'electron';
import { Platform } from 'ionic-angular';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  rootPage:any = 'page-login';

  constructor() {
  }
  
  
  ngOnInit(): void {
  }

  ionViewDidLoad(){
  }
}

