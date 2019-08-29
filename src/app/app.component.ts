
import { Component } from '@angular/core';
import {BizFireService} from "../providers";
import {UserStatusProvider} from "../providers/user-status";
import {IUserData} from "../_models";

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  rootPage:any = 'page-login';

  constructor(
    private bizFire : BizFireService,
    private userStatusService : UserStatusProvider
    ) {
    this.bizFire.currentUser
      .pipe(this.bizFire.takeUntilUserSignOut)
      .subscribe((user : IUserData) => {
      if(user) {
        userStatusService.onUserStatusChange();
      }
    })
  }


  ngOnInit(): void {
  }

  ionViewDidLoad(){
  }
}

