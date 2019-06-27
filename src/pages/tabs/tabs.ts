import { GroupColorProvider } from './../../providers/group-color';
import { AlertProvider } from './../../providers/alert/alert';
import { AccountService } from './../../providers/account/account';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, MenuController,PopoverController } from 'ionic-angular';
import { Electron } from './../../providers/electron/electron';
import { BizFireService } from '../../providers';
import { Subject, of } from 'rxjs';
import { filter, takeUntil, map, switchMap } from 'rxjs/operators';
import { IBizGroup, userLinks } from '../../providers/biz-fire/biz-fire';
import { IUserData, INotification } from '../../_models/message';
import { NotificationService } from '../../providers/notification.service';
import { ChatService,IChatRoom } from '../../providers/chat.service';
import { SquadService, ISquad } from '../../providers/squad.service';
import { DataCache } from '../../classes/cache-data';

@IonicPage({  
  name: 'page-tabs',
  segment: 'tabs',
  priority: 'high'
})
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html',
})
export class TabsPage {


  private _unsubscribeAll;

  currentGroup: IBizGroup;
  currentUser: IUserData;
  groupList; // display Select
  currentGroupList: IBizGroup[];
  memberNewMessage = 0;
  squadNewMessage = 0;
  squadChatRooms: ISquad[];
  group: IBizGroup;

  groupMainColor: string;

  // right button display
  displayName;

  // menu display Name;
  fullName;
  
  // on side menu
  sideMenu : boolean = true;

  // 알람 개수 카운트 - 값이 0일 경우 표시 안됨.
  notification = 0;
  messages: INotification[];
  chatRooms = [];
  badgeCount: number = 0;

  readonly dataCache = new DataCache();


  isPartner = false;

  tab1Root = 'page-home';
  tab2Root = 'page-squad';
  tab3Root = 'page-chat';
  tab4Root = 'page-notify';
  tab5Root = 'page-member';

  

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron: Electron,
    private bizFire: BizFireService,
    public menuCtrl: MenuController,
    public popoverCtrl :PopoverController,
    private noticeService: NotificationService,
    public chatService: ChatService,
    private squadService: SquadService,
    public accountService : AccountService,
    public alertCtrl: AlertProvider,
    public groupColorProvider : GroupColorProvider,
    ) {
      // test notification count   
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit() {

    // * current User for RIGHT MENU
    this.bizFire.currentUser
        .pipe(filter(d=>d!=null), takeUntil(this._unsubscribeAll))
        .subscribe(user => {
            this.currentUser = user;
            this.displayName = this.bizFire.getDiplayNameInitial();
            this.fullName = user.displayName || user.email;
            // if(user.videoCall){
            //     Notification.requestPermission().then(() => {
            //         let myNotification = new Notification('Video Call',{
            //         'body': `video call came from ${this.currentUser.videoCall}`,
            //         });
            //     });
            //     this.alertCtrl.VideoCall().then( () => {
            //         this.bizFire.videoCallSuccess();
            //     })
            // }
    });
    this.bizFire.onBizGroups
        .pipe(filter(g=>g!=null),
            takeUntil(this._unsubscribeAll))
        .subscribe((groups: IBizGroup[]) => {
            // save
            this.currentGroupList = groups;
        });
    this.bizFire.onBizGroupSelected
        .pipe(
            filter(g=>g!=null),
            takeUntil(this._unsubscribeAll))
        .subscribe((group) => {
            //console.log('onBizGroupSelected', group.gid);
            // set selected group to
            this.currentGroup = group;
            this.isPartner = this.bizFire.isPartner(group);
            // set select values.
            this.groupList = this.currentGroupList.filter(g => g.gid!==this.currentGroup.gid);
            // set menu font color.
            this.groupMainColor = this.groupColorProvider.makeGroupColor(this.currentGroup.data.team_color);
            console.log(this.currentGroup.data.team_color);
        });

    // get number of unfinished notices.
    this.noticeService.onNotifications
    .pipe(filter(n => n!=null),takeUntil(this._unsubscribeAll))
    .subscribe((msgs: INotification[]) => {
        console.log("tabs notifi",msgs);
        console.log(msgs.length);
        this.badgeCount = msgs.length;
    })

    this.bizFire.afStore.collection("chat", ref => ref.where("group_id","==",this.currentGroup.gid))
    .snapshotChanges()
    .pipe(takeUntil(this._unsubscribeAll),takeUntil(this.bizFire.onUserSignOut),
        map(rooms => rooms.filter(r=>{
                let ret = false;
                // this squad is a private s.
                const members = r.payload.doc.get('members');
                if(members){
                    ret = members[this.bizFire.currentUID] != undefined;
                }
                return ret;
            }).map(d => ({cid: d.payload.doc.id, data: d.payload.doc.data()} as IChatRoom))
        )
    ).pipe(takeUntil(this._unsubscribeAll))
    .subscribe((chatRooms) => {
        console.log(chatRooms);
        this.chatService.onChatRoomListChanged.next(chatRooms);

        this.memberNewMessage = chatRooms.filter(c => this.chatService.checkIfHasNewMessageNotify(c)).length;
        this.electron.setAppBadge(this.squadNewMessage + this.memberNewMessage);
        if(this.chatService.onSelectChatRoom.value != null){
            const newChat = this.chatRooms.find(l => l.cid === this.chatService.onSelectChatRoom.value.cid);
            if(newChat){
                this.chatService.onSelectChatRoom.next(newChat);
            }
        }
    });

    this.bizFire.onBizGroupSelected
    .pipe(filter(d=>d!=null),takeUntil(this._unsubscribeAll),
        switchMap(group => {
            //* have group changed?
            let reloadGroup = true;
            if(this.group != null){
                reloadGroup = this.group.gid !== group.gid;
            }
            this.group = group;
            this.isPartner = this.bizFire.isPartner(group);

            if(reloadGroup === true){
                // group squads reloading...
                return this.squadService.getMySquadLisObserver(this.group.gid);
            } else {
                // gid not changed.
                return of(null);
            }
        }),
        takeUntil(this._unsubscribeAll),
      filter(l => l != null) // prevent same group reloading.
    ).subscribe(list => {
      this.squadService.onSquadListChanged.next(list);

      this.squadNewMessage = list.filter(c => this.chatService.checkIfHasNewMessageNotify(c)).length;
      this.electron.setAppBadge(this.squadNewMessage + this.memberNewMessage);
    });
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-menu',{}, {cssClass: 'page-menu'});
    popover.present({ev: ev});
  }

  goGroupList() {
    this.navCtrl.setRoot('page-group-list').catch(error => console.error(error));
  }

  windowClose() {
    this.bizFire.windowCloseAndUserStatus().then(() => {
      this.electron.windowClose();
    });
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }

  // side menu toggle
  // onSideMenu() {
  //   this.menuCtrl.open();
  // }

  ngOnDestroy(): void {
    console.log("tabs destroy?")
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.squadNewMessage = 0;
    this.memberNewMessage = 0;
  }

}
