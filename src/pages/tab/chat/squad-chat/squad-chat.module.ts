import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SquadChatPage } from './squad-chat';
import { AccountService } from './../../../../providers/account/account';

@NgModule({
  declarations: [
    SquadChatPage,
  ],
  imports: [
    IonicPageModule.forChild(SquadChatPage),
  ],
  providers: [
    AccountService
  ]
})
export class SquadChatPageModule {}
