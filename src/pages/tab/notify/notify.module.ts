import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NotifyPage } from './notify';
import { PipesModule } from '../../../pipes/pipes.module';

@NgModule({
  declarations: [
    NotifyPage,
  ],
  imports: [
    IonicPageModule.forChild(NotifyPage),
    PipesModule
  ],
})
export class NotifyPageModule {}
