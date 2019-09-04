import { NgModule } from '@angular/core';
import { ProgressBarComponent } from './progress-bar/progress-bar';
import { ChatRoomComponent } from './chat-room/chat-room';
import {CommonModule} from "@angular/common";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {PipesModule} from "../pipes/pipes.module";
import {IonicModule} from "ionic-angular";
import {LastMessageComponent} from "./last-message/last-message.component";
import { ChatHeaderComponent } from './chat-header/chat-header';

@NgModule({
	declarations: [
	  ProgressBarComponent,
    ChatRoomComponent,
    LastMessageComponent,
    ChatHeaderComponent
  ],
  imports: [
    CommonModule,
    NgbModule,
    PipesModule,
    IonicModule

  ],
	exports: [
	  ProgressBarComponent,
    ChatRoomComponent,
    LastMessageComponent,
    NgbModule,
    ChatHeaderComponent
  ]
})
export class ComponentsModule {}
