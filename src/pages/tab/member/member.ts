import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { Subject, Observable, combineLatest } from 'rxjs';
import { BizFireService } from '../../../providers';
import { filter, takeUntil } from 'rxjs/operators';
import { AccountService } from '../../../providers/account/account';
import { GroupColorProvider } from '../../../providers/group-color';
import {LangService} from "../../../providers/lang-service";
import {IBizGroup, IUser, IUserData} from "../../../_models";
import {CacheService} from "../../../providers/cache/cache";
import {Commons} from "../../../biz-common/commons";

@IonicPage({
  name: 'page-member',
  segment: 'member',
  priority: 'high'
})
@Component({
  selector: 'page-member',
  templateUrl: 'member.html',
})
export class MemberPage {

  private _unsubscribeAll;

  // search set

  serachValue : string;
  useSearch : boolean = false;

  currentGroup: IBizGroup;
  gid: string;
  user_icon = '';

  // default 회색
  user_onlineColor = '#C7C7C7';
  // online 녹색 = #32db64 ;

  currentUser: IUserData;

  // display user info
  displayName;
  fullName;
  myStatus;

  allCollectedUsers: IUser[];
  managerAuthUser: IUser[];
  memberAuthUser: IUser[];
  partnerAuthUser: IUser[];

  managerUid: any;
  manager: boolean = false;

  memberCount: any;

  partnerUid: any;
  Partner : boolean = false;
  partnerCount:any;

  groupMainColor : string;

  langPack : any;

  filteredList: string[];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public bizFire : BizFireService,
    private accountService: AccountService,
    private groupColorProvider: GroupColorProvider,
    private langService : LangService,
    private cacheService : CacheService,
    public popoverCtrl :PopoverController) {

    this._unsubscribeAll = new Subject<any>();

    this.langService.onLangMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l;
      });
  }

  ngOnInit(): void {
    this.bizFire.onBizGroupSelected
    .pipe(
        filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe((group) => {
        //console.log('onBizGroupSelected', group.gid);
        // set selected group to
        this.currentGroup = group;
        if(this.currentGroup) {
          this.filteredList = this.currentGroup.getMemberIds(true);
        }
        this.gid = this.currentGroup.gid;
        this.groupMainColor = group.data.team_color;
    });
  }
  // 자신 프로필 사진 클릭시 프로필보기.
  clickAvatar(ev,target) {
    this.Partner = this.isPartner(target.uid);
    // 이벤트 버블링 중지
    ev.stopPropagation();
    console.log("show my profile");

    let popover = this.popoverCtrl.create('page-profile',{target : target,groupColor : this.groupMainColor}, {cssClass: 'page-profile'});
    popover.present({
      animate: false,
    });
  }

  isManagerUser(user:IUser): boolean {
    return this.currentGroup.isManager(user.uid);
  }

  isPartner(uid: string): boolean {
    let ret = false;
    if(this.currentGroup != null) {
        ret =  this.currentGroup.data['partners'] != null && this.currentGroup.data['partners'][uid] === true;
    }
    return ret;
  }

  getUserObserver(uid: string): Observable<IUser>{
    return this.cacheService.userGetObserver(uid,true);
  }

  setUserName(userData : IUserData) : string {
    return Commons.initialChars(userData);
  }



  makeUserStatus(userData : IUserData) {
    switch(userData.onlineStatus) {
      case 'online':
        return '#32db64';
        break;
      case 'wait':
        return '#FFBF00';
        break;
      case 'busy':
        return '#f53d3d';
        break;
      case 'offline':
        return '#C7C7C7';
        break;
      case undefined :
        return '#C7C7C7';
        break;
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
