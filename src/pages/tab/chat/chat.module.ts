import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ChatPage } from './chat';
import { AccountService } from '../../../providers/account/account';
import { PipesModule } from '../../../pipes/pipes.module';
import {ComponentsModule} from "../../../components/components.module";

@NgModule({
  declarations: [
    ChatPage,
  ],
  imports: [
    IonicPageModule.forChild(ChatPage),
    PipesModule,
    ComponentsModule
  ],
  providers: [
    AccountService
  ]
})
export class ChatPageModule {}
