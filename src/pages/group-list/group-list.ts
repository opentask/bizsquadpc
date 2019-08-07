import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Electron } from './../../providers/electron/electron';
import { IBizGroup, BizFireService } from '../../providers/biz-fire/biz-fire';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TokenProvider } from '../../providers/token/token';
import { FireData } from '../../classes/fire-data';
import {STRINGS} from "../../biz-common/commons";

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

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron : Electron,
    private bizFire: BizFireService,
    private tokenService : TokenProvider,
    ) {

      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.tokenService.getToken(this.bizFire.currentUID);
    
    // get user's bizgroup.
    this.bizFire.onBizGroups
        .pipe(filter(g=>g!=null),takeUntil(this._unsubscribeAll))
        .subscribe(bizGroups => {
            bizGroups.forEach(group => {
                if(group){
                  const newData = group.data;
                  newData['gid'] = group.gid;
                  newData['group_squads'] = 0;
                  newData['group_members'] = Object.keys(group.data.members).length;
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
                  // get group_squads number
                  this.bizFire.afStore.firestore.collection(`bizgroups/${group.gid}/squads`).get().then(snap => {
                    let general = 0;
                    let agile = 0;
                    snap.forEach(list => {
                      if(list.data().status === true){
                        if(list.data().type === 'public'){
                          general += 1;
                        } else if(list.data().type === 'private'){
                          agile += 1;
                        }
                      }
                    })
                    newData['general_squad_count'] = general;
                    newData['agile_squad_count'] = agile;
                    newData['group_squads'] = snap.docs.length;
                  });
                }
            });
            this.groups = bizGroups.sort((a,b) => {
              if(a.data.created && b.data.created) {
                return a.data.created > b.data.created ? -1 : 1;
              } else {
                return 0;
              }
            })
            console.log(this.groups);
        });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.fireData.clear();
  }

  gotoTeam(group){
    this.onSelectGroup(group);
  }

  onSelectGroup(group: IBizGroup) {
    // save web last login group
    (async ()=>{
      await this.bizFire.afStore.collection(STRINGS.USERS).doc(this.bizFire.currentUID).update({
        lastPcGid: group.gid
      });
      this.bizFire.onBizGroupSelected.next(group);
      this.navCtrl.setRoot('page-tabs');
    })();
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
