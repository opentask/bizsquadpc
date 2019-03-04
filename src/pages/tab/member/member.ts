import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController } from 'ionic-angular';
import { IUser, IUserData } from '../../../_models/message';
import { Subject, Observable, combineLatest } from 'rxjs';
import { BizFireService } from '../../../providers';
import { filter, takeUntil } from 'rxjs/operators';
import { IBizGroup } from '../../../providers/biz-fire/biz-fire';
import { AccountService } from '../../../providers/account/account';

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
  mydata: IUser;

  managerUid: any;
  manager: boolean = false;

  memberCount: any;

  partnerUid: any;
  Partner : boolean = false;
  partnerCount:any;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire : BizFireService,
    private accountService: AccountService,
    public popoverCtrl :PopoverController,) {

    this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {
    this.bizFire.currentUser
    .pipe(filter(d=>d!=null), takeUntil(this._unsubscribeAll))
    .subscribe(user => {
        this.currentUser = user;
        this.displayName = this.bizFire.getDiplayNameInitial();
        this.fullName = user.displayName;
        this.myStatus = user.onlineStatus;
        switch(user.onlineStatus){
          case 'online':
            this.myStatus = '#32db64';
            break;
          case 'wait':
            this.myStatus = '#FEA926';
            break;
          case 'busy':
            this.myStatus = '#f53d3d';
            break;
          case 'offline':
            this.myStatus = '#C7C7C7';
            break;
        }
        console.log("currentUser",this.currentUser);
    });

    this.bizFire.onBizGroupSelected
    .pipe(
        filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe((group) => {
        //console.log('onBizGroupSelected', group.gid);
        // set selected group to
        this.currentGroup = group;
        this.gid = this.currentGroup.gid;
    });

    // get selected group info.
    this.bizFire.onBizGroups
    .pipe(filter(g=>g!=null), takeUntil(this._unsubscribeAll))
    .subscribe(groups => {

        if(this.gid && groups.length > 0){
            this.currentGroup = groups.find(g => g.gid === this.gid);
            if(this.currentGroup){

                this.managerUid = Object.keys(this.currentGroup.data.manager);
                if(this.currentGroup.data.partners && this.currentGroup.data['partners'] != null){
                  this.partnerUid = Object.keys(this.currentGroup.data.partners);
                }

                // is me a manager?
                this.manager = this.currentGroup.data.manager != null &&
                    this.currentGroup.data.manager[this.bizFire.currentUID] === true;
                    
                let allUsers;

                const members = this.currentGroup.data.members;
                if (members) {

                  // get all true users' id.
                  allUsers = Object.keys(members)
                      .filter(uid => members[uid] === true)
                      // .filter(uid => uid != this.currentUser.uid) 자기 자신 제외 구 소스
                      .map(uid => uid);
                }
                // * get ALL USERS DATA !
                if (allUsers && allUsers.length > 0) {
                    this.accountService.getAllUserInfos(allUsers)
                        .pipe(filter(l => {
                            //null check
                            // getAllUserInfos returns, [null, null, {}, {}...];
                            let ret;
                            ret = l.filter(ll => ll != null).length === allUsers.length;
                            return ret;
                            }),
                            takeUntil(this._unsubscribeAll))
                        .subscribe(all => {
                            this.allCollectedUsers = all;
                            this.managerAuthUser = this.allCollectedUsers.filter(u => u.uid == this.managerUid);
                            this.memberAuthUser = this.allCollectedUsers.filter(u => u.uid != this.managerUid && u.uid != this.partnerUid);
                            this.allCollectedUsers.filter(u => u.uid == this.bizFire.currentUID).forEach(user =>{
                              this.mydata = user;
                            });

                            if(this.partnerUid){
                              this.partnerAuthUser = this.allCollectedUsers.filter(u => u.uid == this.partnerUid);
                              this.partnerCount = this.partnerAuthUser.length;
                            }
                            this.memberCount = this.memberAuthUser.length;
                            console.log(this.managerUid);

                            console.log(this.allCollectedUsers);
                            console.log(this.managerAuthUser);
                          
                            all.forEach(user => {
                              const newData = user.data;
                              if(user.data.displayName == null || user.data.displayName.length == 0){
                                newData['user_icon'] = user.data.email.substr(0, 2);
                              } else {
                                let count = 2;
                                if(user.data.displayName.length === 1){
                                  count = 1;
                                }
                                newData['user_icon'] = user.data.displayName.substr(0,count);
                                newData['user_onlineColor'] = '#C7C7C7';
                              }
                              switch(user.data.onlineStatus){
                                case 'online':
                                  newData['user_onlineColor'] = '#32db64';
                                  break;
                                case 'offline':
                                  newData['user_onlineColor'] = '#C7C7C7';
                                  break;
                                case 'wait':
                                  newData['user_onlineColor'] = '#FFBF00';
                                  break;
                                case 'busy':
                                  newData['user_onlineColor'] = '#f53d3d';
                                  break;
                              }
                              // this.namePush.push(user.data.displayName);
                            }) 
                        });
                }
            }
        }
    });
  }

  //    search    //

  getItems(ev: any) {
    if(!this.serachValue == undefined) {

    }
  }
  

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
  // 자신 프로필 사진 클릭시 프로필보기.
  clickAvatar(ev,target) {
    this.Partner = this.isPartner(target.uid);
    // 이벤트 버블링 중지
    ev.stopPropagation();
    console.log("show my profile");
    let popover = this.popoverCtrl.create('page-profile',{me: this.mydata,target : target,manager: this.managerUid,partner: this.Partner}, {cssClass: 'page-profile'});
    popover.present({
      animate: false,
    });
  }

  isPartner(uid: string): boolean {
    let ret = false;
    if(this.currentGroup != null) {
        ret =  this.currentGroup.data['partners'] != null && this.currentGroup.data['partners'][uid] === true;
    }

    return ret;
  }

}
