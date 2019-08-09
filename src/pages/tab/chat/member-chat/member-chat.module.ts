import { AccountService } from './../../../../providers/account/account';
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberChatPage } from './member-chat';
import { PipesModule } from '../../../../pipes/pipes.module';
import {ComponentsModule} from "../../../../components/components.module";

@NgModule({
  declarations: [
    MemberChatPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberChatPage),
    PipesModule,
    ComponentsModule
  ],
  providers: [
    AccountService
  ]
})
export class MemberChatPageModule {}
