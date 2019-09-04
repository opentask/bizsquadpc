import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ChatFramePage } from './chat-frame';
import { ComponentsModule } from "../../../../components/components.module";

@NgModule({
  declarations: [
    ChatFramePage,
  ],
  imports: [
    IonicPageModule.forChild(ChatFramePage),
    ComponentsModule
  ],
})
export class ChatFramePageModule {}
