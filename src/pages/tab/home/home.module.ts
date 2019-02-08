import { AccountService } from './../../../providers/account/account';
import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePage } from './home';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
    NgxDatatableModule
  ],
  providers: [
    AccountService
  ]
})
export class HomePageModule {}
