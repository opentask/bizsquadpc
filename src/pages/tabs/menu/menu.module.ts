import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MenuPage } from './menu';
import { PipesModule } from '../../../pipes/pipes.module';

@NgModule({
  declarations: [
    MenuPage,

  ],
  imports: [
    IonicPageModule.forChild(MenuPage),
    PipesModule
  ],
})
export class MenuPageModule {}
