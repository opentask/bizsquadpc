import { NgModule } from '@angular/core';
import { TimestampToDatePipe } from './timestamp-to-date/timestamp-to-date';
import { SanitizingHtmlPipe } from './sanitizing-html/sanitizing-html';
@NgModule({
	declarations: [TimestampToDatePipe,
    SanitizingHtmlPipe],
	imports: [],
	exports: [TimestampToDatePipe,
    SanitizingHtmlPipe]
})
export class PipesModule {}
