import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SquadChatPage } from './squad-chat';

@NgModule({
  declarations: [
    SquadChatPage,
  ],
  imports: [
    IonicPageModule.forChild(SquadChatPage),
  ],
})
export class SquadChatPageModule {}
