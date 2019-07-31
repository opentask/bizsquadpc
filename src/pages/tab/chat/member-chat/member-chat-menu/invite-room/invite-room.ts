import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { IUser } from '../../../../../../_models/message';
import { IroomData, IChatRoomData, IChatRoom } from '../../../../../../providers/chat.service';
import { BizFireService } from '../../../../../../providers';
import {Commons, STRINGS} from '../../../../../../biz-common/commons';
import { IBizGroup, Igroup } from '../../../../../../providers/biz-fire/biz-fire';
import { checkAndUpdateDirectiveDynamic } from '@angular/core/src/view/provider';
import { combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { filter, takeUntil, map } from 'rxjs/operators';
import { AccountService } from '../../../../../../providers/account/account';

@IonicPage({  
  name: 'page-invite-room',
  segment: 'invite-room',
  priority: 'high'
})
@Component({
  selector: 'page-invite-room',
  templateUrl: 'invite-room.html',
})
export class InviteRoomPage {

  private _unsubscribeAll;

  serachValue : string;
  allCollectedUsers: IUser[];
  isChecked : IUser[] = [];
  currentGroup : Igroup;

  roomData : IroomData;
  observableRoom : IChatRoomData;
  members = [];

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public bizFire : BizFireService,
    public accountService: AccountService) {

      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {
    console.log('ionViewDidLoad InviteRoomPage');
    this.roomData = this.navParams.get('roomData');
    console.log(this.roomData);

    this.bizFire.afStore.doc(Commons.chatDocPath(this.roomData.data.group_id,this.roomData.cid)).valueChanges()
    .pipe(takeUntil(this._unsubscribeAll)).subscribe((chatRoom : IChatRoomData) => {
      this.observableRoom = chatRoom;
    })

    this.bizFire.afStore.doc(Commons.groupPath(this.roomData.data.group_id)).valueChanges().pipe(takeUntil(this._unsubscribeAll))
    .subscribe((group : Igroup) => {
      this.currentGroup = group;
      if(this.currentGroup){
        let allUsers;
        const members = this.currentGroup.members;
        if(members){
          // get all true users' id.
          allUsers = Object.keys(members)
          .filter(uid => members[uid] === true)
          .filter(uid => uid != this.bizFire.currentUID)
          .map(uid => uid);
          console.log("valueChanges1",members);
          console.log("valueChanges1",allUsers);
        }
        if (allUsers && allUsers.length > 0) {
          this.accountService.getAllUserInfos(allUsers)
              .pipe(filter(l => {
                  //null check
                  // getAllUserInfos returns, [null, null, {}, {}...];
                  let ret;
                  ret = l.filter(ll => ll != null).length === allUsers.length;
                  return ret;
                  }))
              .subscribe(all => {
                  this.allCollectedUsers = all;
                  all.forEach(user => {
                    const newData = user.data;
                    newData['isChecked'] = user.data.isChecked = false;

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
                  })
              });
        }
      }
    })
  }

  invite(){
    let members = {};
    
    this.isChecked.forEach(d => {
      members[d.data.uid] = true;
    })
    this.bizFire.afStore.doc(Commons.chatDocPath(this.roomData.data.group_id,this.roomData.cid)).set({
      members : members
    },{merge : true}).then(() =>{
      this.viewCtrl.dismiss();
    })
  }

  selectedUser() {
    this.isChecked =this.allCollectedUsers.filter(u => u.data.isChecked == true);
    console.log(this.isChecked)
  }

  badgeMember(member : IUser) {
    member.data.isChecked = false;
    this.isChecked =this.allCollectedUsers.filter(u => u.data.isChecked == true);
    console.log(this.isChecked)
  }

  closePopup(){
    this.viewCtrl.dismiss();
  }

  ngOnDestroy(): void {
    console.log("구독종료")
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
