import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SquadPage } from './squad';

@NgModule({
  declarations: [
    SquadPage,
  ],
  imports: [
    IonicPageModule.forChild(SquadPage),
  ],
})
export class SquadPageModule {}
