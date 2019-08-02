import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SquadChatPage } from './squad-chat';
import { AccountService } from './../../../../providers/account/account';
import { PipesModule } from '../../../../pipes/pipes.module';

@NgModule({
  declarations: [
    SquadChatPage,
  ],
  imports: [
    IonicPageModule.forChild(SquadChatPage),
    PipesModule
  ],
  providers: [
    AccountService
  ]
})
export class SquadChatPageModule {}
