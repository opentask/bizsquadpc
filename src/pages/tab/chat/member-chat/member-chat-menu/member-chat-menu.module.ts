import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberChatMenuPage } from './member-chat-menu';

@NgModule({
  declarations: [
    MemberChatMenuPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberChatMenuPage),
  ],
})
export class MemberChatMenuPageModule {}
