import { NgModule } from '@angular/core';
import { TimestampToDatePipe } from './timestamp-to-date/timestamp-to-date';
import { SanitizingHtmlPipe } from './sanitizing-html/sanitizing-html';
import { BadgeLimitPipe } from './badge-limit/badge-limit';
@NgModule({
	declarations: [TimestampToDatePipe,
    SanitizingHtmlPipe,
    BadgeLimitPipe],
	imports: [],
	exports: [TimestampToDatePipe,
    SanitizingHtmlPipe,
    BadgeLimitPipe]
})
export class PipesModule {}
