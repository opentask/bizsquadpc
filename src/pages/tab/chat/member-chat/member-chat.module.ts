import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberChatPage } from './member-chat';

@NgModule({
  declarations: [
    MemberChatPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberChatPage),
  ],
})
export class MemberChatPageModule {}
