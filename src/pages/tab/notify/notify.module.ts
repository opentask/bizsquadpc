import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NotifyPage } from './notify';
import { TimestampToDatePipe } from '../../../biz-common/timestamp-to-date.pipe';
@NgModule({
  declarations: [
    NotifyPage,
    TimestampToDatePipe,
  ],
  imports: [
    IonicPageModule.forChild(NotifyPage),
  ],
})
export class NotifyPageModule {}
