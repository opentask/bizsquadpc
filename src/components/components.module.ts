import { NgModule } from '@angular/core';
import { ProgressBarComponent } from './progress-bar/progress-bar';
import { ChatRoomComponent } from './chat-room/chat-room';
import {CommonModule} from "@angular/common";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {PipesModule} from "../pipes/pipes.module";
import {IonicModule} from "ionic-angular";

@NgModule({
	declarations: [ProgressBarComponent,
    ChatRoomComponent,
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
    NgbModule
  ]
})
export class ComponentsModule {}
