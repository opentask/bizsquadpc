import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SquadChatPage } from './squad-chat';
import { AccountService } from './../../../../providers/account/account';
import { PipesModule } from '../../../../pipes/pipes.module';
import {ComponentsModule} from "../../../../components/components.module";
import { FormsModule,ReactiveFormsModule } from "@angular/forms";

@NgModule({
  declarations: [
    SquadChatPage,
  ],
  imports: [
    IonicPageModule.forChild(SquadChatPage),
    PipesModule,
    ComponentsModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    AccountService
  ]
})
export class SquadChatPageModule {}
