import { NgModule } from '@angular/core';
import { ProgressBarComponent } from './progress-bar/progress-bar';
import { ChatRoomComponent } from './chat-room/chat-room';
@NgModule({
	declarations: [ProgressBarComponent,
    ChatRoomComponent],
	imports: [],
	exports: [ProgressBarComponent,
    ChatRoomComponent]
})
export class ComponentsModule {}
