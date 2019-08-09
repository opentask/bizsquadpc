import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TabsPage } from './tabs';
import { AccountService } from '../../providers/account/account';
import { GroupColorProvider } from '../../providers/group-color';
import {ComponentsModule} from "../../components/components.module";

@NgModule({
  declarations: [
    TabsPage,
  ],
  imports: [
    IonicPageModule.forChild(TabsPage),
    ComponentsModule,
  ],
  providers: [
    AccountService,
    GroupColorProvider,
  ]
})
export class TabsPageModule {}
