import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ChatFramePage } from './chat-frame';

@NgModule({
  declarations: [
    ChatFramePage,
  ],
  imports: [
    IonicPageModule.forChild(ChatFramePage),
  ],
})
export class ChatFramePageModule {}
