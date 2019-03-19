import { Electron } from './../../../../providers/electron/electron';
import { ChatService, IChatRoom } from './../../../../providers/chat.service';
import { AccountService } from './../../../../providers/account/account';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, PopoverController, ViewController } from 'ionic-angular';
import { BizFireService } from '../../../../providers';
import { filter, takeUntil, map } from 'rxjs/operators';
import { IBizGroup } from '../../../../providers/biz-fire/biz-fire';
import { IUser } from '../../../../_models/message';
import { Subject } from 'rxjs';

@IonicPage({  
  name: 'page-invite',
  segment: 'invite',
  priority: 'high'
})
@Component({
  selector: 'page-invite',
  templateUrl: 'invite.html',
})
export class InvitePage {

  serachValue : string;
  private _unsubscribeAll;
  currentGroup: IBizGroup;
  gid: string;
  allCollectedUsers: IUser[];
  mydata: IUser;
  isChecked : IUser[] = [];
  selectedNum  = 0;
  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public bizFire: BizFireService,
    public viewCtrl: ViewController,
    public chatService: ChatService,
    public electron : Electron,
    public accountService: AccountService) {
      this._unsubscribeAll = new Subject<any>();
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
        this.gid = this.currentGroup.gid;
    });

    this.bizFire.onBizGroups
    .pipe(filter(g=>g!=null)
    ,takeUntil(this._unsubscribeAll))
    .subscribe(groups => {
      if(this.gid && groups.length > 0){
        this.currentGroup = groups.find(g => g.gid === this.gid);
        if(this.currentGroup){

          let allUsers;
          const members = this.currentGroup.data.members;
          if (members) {
            // get all true users' id.
            allUsers = Object.keys(members)
                .filter(uid => members[uid] === true)
                .filter(uid => uid != this.bizFire.currentUID)
                .map(uid => uid);
            console.log("allUsers",allUsers)
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
                    })
                    ,
                    takeUntil(this._unsubscribeAll)
                    )
                .subscribe(all => {
                    this.allCollectedUsers = all;
                    this.allCollectedUsers.filter(u => u.uid == this.bizFire.currentUID)
                    .forEach(user =>{
                      this.mydata = user;
                    });      
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
      }

    })
  }
  invite(){
    let chatRooms = this.chatService.getChatRooms();
    console.log("chatRooms",chatRooms);
    let selectedRoom: IChatRoom;
    let target_uid;
    if(this.isChecked.length == 1){
      target_uid = this.isChecked[0].uid;
      console.log(target_uid);
    }
    for(let room of chatRooms) {
      const member_list = room.data.members;
      const member_count = Object.keys(member_list).length;
      if(member_list){
        if(member_list.hasOwnProperty(this.bizFire.currentUID) && member_list.hasOwnProperty(target_uid) && member_count == 2){
          selectedRoom = room;
          break;
        }
      }
    }
    if(selectedRoom == null){
      this.chatService.createRoomByFabs("member",this.isChecked);
      this.viewCtrl.dismiss();
    } else {
      this.chatService.onSelectChatRoom.next(selectedRoom);
      this.electron.openChatRoom(selectedRoom);
      this.viewCtrl.dismiss();
    }
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
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
