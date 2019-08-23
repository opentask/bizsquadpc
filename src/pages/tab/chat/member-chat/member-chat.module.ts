import { AccountService } from './../../../../providers/account/account';
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberChatPage } from './member-chat';
import { PipesModule } from '../../../../pipes/pipes.module';
import {ComponentsModule} from "../../../../components/components.module";
import { FormsModule,ReactiveFormsModule } from "@angular/forms";

@NgModule({
  declarations: [
    MemberChatPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberChatPage),
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [
    AccountService
  ]
})
export class MemberChatPageModule {}
