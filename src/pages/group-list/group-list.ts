import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Electron } from './../../providers/electron/electron';
import { IBizGroup, BizFireService } from '../../providers/biz-fire/biz-fire';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { LoadingProvider } from '../../providers';
import { TokenProvider } from '../../providers/token/token';

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

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron : Electron,
    private bizFire: BizFireService,
    private loading: LoadingProvider,
    private tokenService : TokenProvider,
    ) {

      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    this.loading.show();
    // get user's bizgroup.
    this.bizFire.onBizGroups
        .pipe(filter(g=>g!=null),
            takeUntil(this._unsubscribeAll))
        .subscribe(bizGroups => {
            bizGroups.forEach(group => {
                if(group){
                  const newData = group.data;
                  newData['gid'] = group.gid;
                  newData['group_squads'] = 0; 
                  newData['group_members'] = Object.keys(group.data.members).length;
                  newData['team_color'] = group.data.team_color || this.team_color;
                  
                  if(group.data.team_name == null || group.data.team_name.length === 0 ){
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
                    newData['group_squads'] = snap.docs.length;
                  });
                }
            });
            this.groups = bizGroups;
            setTimeout(() => { 
              this.loading.hide();
            },2000)
        });

    //파이어베이스에서 토큰 키를 tokenService의 customToken변수에 저장.
    this.tokenService.getToken();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  gotoTeam(group){
    this.bizFire.onBizGroupSelected.next(group);
    this.navCtrl.setRoot('page-tabs',{queryParams: {gid: group.gid}});
  }

  //                   //
  //  -- electron --   //
  //                   //
  windowClose() {
      this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
}
