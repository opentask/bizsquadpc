import { AccountService } from './../../../../providers/account/account';
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberChatPage } from './member-chat';
import { PipesModule } from '../../../../pipes/pipes.module';

@NgModule({
  declarations: [
    MemberChatPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberChatPage),
    PipesModule
  ],
  providers: [
    AccountService
  ]
})
export class MemberChatPageModule {}
