import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MemberPage } from './member';
import { AccountService } from './../../../providers/account/account';
@NgModule({
  declarations: [
    MemberPage,
  ],
  imports: [
    IonicPageModule.forChild(MemberPage),
  ],
  providers: [
    AccountService
  ]
})
export class MemberPageModule {}
