import { NgModule } from '@angular/core';
import { TimestampToDatePipe } from './timestamp-to-date/timestamp-to-date';
@NgModule({
	declarations: [TimestampToDatePipe],
	imports: [],
	exports: [TimestampToDatePipe]
})
export class PipesModule {}
