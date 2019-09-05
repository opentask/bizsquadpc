import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Electron } from './../../providers/electron/electron';
import { BizFireService } from '../../providers/biz-fire/biz-fire';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { FireData } from '../../classes/fire-data';
import {STRINGS} from "../../biz-common/commons";
import {LangService} from "../../providers/lang-service";
import {IBizGroup} from "../../_models";
import {BizGroupBuilder} from "../../biz-common/biz-group";

@IonicPage({
  name: 'page-group-list',
  segment: 'groupList',
  priority: 'high'
})
@Component({
  selector: 'page-group-list',
  templateUrl: 'group-list.html',
})
export class GroupListPage {

  groups: Array<IBizGroup> = [];

  private _unsubscribeAll;

  // * COLOR
  team_color = '#5b9ced'; // default opentask blue

  private fireData = new FireData();

  langPack: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public electron : Electron,
    private bizFire: BizFireService,
    private langService : LangService
    ) {

      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.bizFire.onLang
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l.pack();
    });

    // get user's bizgroup.
    this.bizFire.onBizGroups
        .pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
        .subscribe(bizGroups => {
            bizGroups.forEach(group => {
                if(group){
                  const newData = group.data;
                  newData['gid'] = group.gid;
                  newData['team_color'] = group.data.team_color || this.team_color;

                  if(group.data.team_name == null || group.data.team_name.length === 0 ) {
                    newData['team_icon'] = 'BG';
                  } else {
                      let count = 2;
                      if(group.data.team_name.length === 1){
                          count = 1;
                      }
                      newData['team_icon'] = group.data.team_name.substr(0, count);
                  }
                }
            });
            this.groups = bizGroups;
            //   .sort((a,b) => {
            //   if(a.data.created && b.data.created) {
            //     return a.data.created > b.data.created ? -1 : 1;
            //   } else {
            //     return 0;
            //   }
            // });
        });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.fireData.clear();
  }

  async gotoTeam(group : IBizGroup){
    if(group && await this.bizFire.onSelectGroup(group.gid)) {
      this.navCtrl.setRoot('page-tabs');
    }
  }

  //                   //
  //  -- electron --   //
  //                   //
  windowHide() {
      this.electron.windowHide();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
}
