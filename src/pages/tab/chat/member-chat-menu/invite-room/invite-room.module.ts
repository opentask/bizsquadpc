import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { InviteRoomPage } from './invite-room';
import { AccountService } from '../../../../../providers/account/account';

@NgModule({
  declarations: [
    InviteRoomPage,
  ],
  imports: [
    IonicPageModule.forChild(InviteRoomPage),
  ],
  providers: [
    AccountService
  ]
})
export class InviteRoomPageModule {}
