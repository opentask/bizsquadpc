import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { BizFireService } from '../../../../../../providers';
import { Commons } from '../../../../../../biz-common/commons';
import {combineLatest, Observable, Subject, zip} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupColorProvider } from '../../../../../../providers/group-color';
import {IBizGroup, IBizGroupData, IUser, IUserData} from "../../../../../../_models";
import {IChat, IChatData, IroomData} from "../../../../../../_models/message";
import {ChatService} from "../../../../../../providers/chat.service";
import {CacheService} from "../../../../../../providers/cache/cache";

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
  currentGroup: IBizGroup;

  isChecked : IUser[] = [];
  groupMainColor: string;

  roomData : IChat;

  userList$: Observable<IUser[]>;

  langPack: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public bizFire : BizFireService,
    public groupColorProvider: GroupColorProvider,
    public chatService : ChatService,
    private cacheService : CacheService) {

      this._unsubscribeAll = new Subject<any>();

      this.bizFire.onLang
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((l: any) => {
          this.langPack = l.pack();
      });
  }

  ngOnInit(): void {

    combineLatest(this.chatService.onSelectChatRoom,this.bizFire.onBizGroupSelected)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(([chat,group]) => {
        this.roomData = chat;
        this.currentGroup = group;
        this.groupMainColor = this.groupColorProvider.makeGroupColor(this.currentGroup.data.team_color);

        const inviteUids = this.currentGroup.getMemberIds(false)
          .filter(uid => Object.keys(this.roomData.data.members)
          .find(cUid => cUid === uid) == null);

        this.userList$ = this.cacheService.resolvedUserList(inviteUids, Commons.userInfoSorter);
      });
  }

  setUserName(userData : IUserData) : string {
    return Commons.initialChars(userData);
  }

  makeUserStatus(userData : IUserData) {
    return Commons.makeUserStatus(userData);
  }

  invite(){
    let members = {};
    let makeNoticeUsers = [];
    this.isChecked.forEach(d => {
      members[d.data.uid] = true;
      makeNoticeUsers.push(d.data.uid);
    })
    this.bizFire.afStore.doc(Commons.chatDocPath(this.roomData.data.gid,this.roomData.cid)).set({
      members : members
    },{merge : true}).then(() =>{
      this.chatService.makeRoomNoticeMessage('member-chat','invite',this.roomData.data.gid,this.roomData.cid,makeNoticeUsers);
      this.viewCtrl.dismiss();
    })
  }

  selectedUser(users : IUser[]) {
    this.isChecked = users.filter(u => u.data.isChecked == true);
    console.log(this.isChecked)
  }

  badgeMember(user : IUser) {
    user.data.isChecked = false;
    this.isChecked = this.isChecked.filter(u => u.data.isChecked == true);
    console.log(this.isChecked)
  }

  closePopup(){
    this.viewCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.isChecked.forEach(u => u.data.isChecked = false);
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
