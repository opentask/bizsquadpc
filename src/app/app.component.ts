
import { Component } from '@angular/core';
import * as electron from 'electron';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  rootPage:any ="page-login";

  constructor() {
    electron.ipcRenderer.send('giveMeSquadValue', 'ping');
    electron.ipcRenderer.on('selectSquad', (event, data) => {
      if(data != null){
        this.rootPage = 'page-squad-chat';
        console.log(data); // "squad" 출력)
      }
    })
  }
  
  ngOnInit(): void {
  }

}

