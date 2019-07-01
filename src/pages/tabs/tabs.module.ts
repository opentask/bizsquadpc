import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TabsPage } from './tabs';
import { AccountService } from '../../providers/account/account';
import { GroupColorProvider } from '../../providers/group-color';

@NgModule({
  declarations: [
    TabsPage,
  ],
  imports: [
    IonicPageModule.forChild(TabsPage),
  ],
  providers: [
    AccountService,
    GroupColorProvider,
  ]
})
export class TabsPageModule {}
