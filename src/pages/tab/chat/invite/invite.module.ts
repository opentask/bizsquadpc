import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { InvitePage } from './invite';
import { AccountService } from './../../../../providers/account/account';

@NgModule({
  declarations: [
    InvitePage,
  ],
  imports: [
    IonicPageModule.forChild(InvitePage),
  ],
  providers: [
    AccountService
  ]
})
export class InvitePageModule {}
