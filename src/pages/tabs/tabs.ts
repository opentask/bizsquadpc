import { GroupColorProvider } from './../../providers/group-color';
import { AlertProvider } from './../../providers/alert/alert';
import { AccountService } from './../../providers/account/account';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, MenuController,PopoverController } from 'ionic-angular';
import { Electron } from './../../providers/electron/electron';
import { BizFireService } from '../../providers';
import {Subject, of, Subscription, timer} from 'rxjs';
import { filter, takeUntil, map, switchMap } from 'rxjs/operators';
import { IBizGroup, userLinks } from '../../providers/biz-fire/biz-fire';
import { IUserData, INotification } from '../../_models/message';
import { NotificationService } from '../../providers/notification.service';
import { ChatService,IChat } from '../../providers/chat.service';
import { SquadService, ISquad } from '../../providers/squad.service';
import { DataCache } from '../../classes/cache-data';
import { TokenProvider } from '../../providers/token/token';
import {STRINGS} from "../../biz-common/commons";
import { LangService } from '../../providers/lang-service';
import { UnreadCounter } from "../../classes/unread-counter";

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

  private unreadCounter: UnreadCounter;
  private unreadListSubscription: Subscription;

  currentGroup: IBizGroup;
  currentUser: IUserData;
  groupList; // display Select
  currentGroupList: IBizGroup[];
  memberNewMessage = 0;
  squadNewMessage = 0;
  squadChatRooms: ISquad[];
  group: IBizGroup;

  chatRooms = [];

  groupMainColor: string;

  // right button display
  displayName;

  // 알람 개수 카운트 - 값이 0일 경우 표시 안됨.
  notification = 0;
  messages: INotification[];
  badgeCount: number = 0;

  isPartner = false;

  tab1Root = 'page-home';
  tab2Root = 'page-squad';
  tab3Root = 'page-chat';
  tab4Root = 'page-notify';
  tab5Root = 'page-member';

  langPack: any;

  chatCount = 0;

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
    private tokenService: TokenProvider,
    private langService: LangService,
    ) {
      // test notification count
      this._unsubscribeAll = new Subject<any>();

    // 채팅이 아닌 메인 윈도우를 우클릭으로 완전 종료시 유저상태변경하는 리스너.
      window.addEventListener('unload', () => {
        this.bizFire.windowCloseAndUserStatus().then(() => {
            this.bizFire.signOut();
        });
      })
    this.bizFire.onUserSignOut.subscribe(()=>{
      this.clear();
    });
  }

  ngOnInit() {
    this.langService.onLangMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l;
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
            this.groupMainColor = this.groupColorProvider.makeGroupColor(this.group.data.team_color);
            this.isPartner = this.bizFire.isPartner(group);

            // delete old other gid's data.
            this.clear();

            console.log("언리드 모니터 시작");
            // 모든 채팅의 UNREAD COUNT 를 모니터
            this.unreadCounter = new UnreadCounter(this.group.gid, this.bizFire.uid);
            this.unreadListSubscription = this.unreadCounter.unreadList$.subscribe(this.chatService.unreadCountMap$);

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
    ).subscribe((list : ISquad[]) => {
      this.squadService.onSquadListChanged.next(list);

      list.forEach(s => {
        if(!this.unreadCounter.isRegistered(s.sid)) {
          this.unreadCounter.register(s.sid, s.ref);
        }
      });
    });


    this.chatService.unreadCountMap$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((map: any[]) => {
        if(map){
          //console.log('unread datas:', map);
          this.chatCount = map.length;
          this.electron.setAppBadge(this.chatCount);
        }
      });

    this.noticeService.onNotifications
    .pipe(
      filter(n=>n != null),takeUntil(this._unsubscribeAll))
    .subscribe((msgs: INotification[]) => {
      if(msgs){
        // get unfinished notification count.
        this.badgeCount = msgs.filter(m => m.data.statusInfo.done !== true).length;

        if(this.badgeCount > 99){ this.badgeCount = 99; }
        console.log("tabs badgeCount:",this.badgeCount);
      }

    });


    this.bizFire.afStore.collection(`${STRINGS.STRING_BIZGROUPS}/${this.group.gid}/chat`,ref =>{
        return ref.where('status', '==' ,true).where(`members.${this.bizFire.currentUID}`, '==', true);
    })
    .stateChanges()
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe((changes) => {
      changes.forEach(change => {
        const data = change.payload.doc.data();
        const mid = change.payload.doc.id;

        if(change.type === 'added') {
          const item = {cid: mid, data: data,ref: change.payload.doc.ref} as IChat;
          this.chatRooms.push(item);
          this.unreadCounter.register(mid, change.payload.doc.ref);

        } else if(change.type === 'modified') {
          for(let index = 0 ; index < this.chatRooms.length; index ++){
            if(this.chatRooms[index].cid === mid){
              // find replacement
              const item = {cid: mid, data: data, ref: change.payload.doc.ref} as IChat;
              //---------- 껌벅임 테스트 -------------//
              this.chatRooms[index].data = item.data; // data 만 경신 한다.
              //-----------------------------------//
              break;
            }
          }
        } else if (change.type === 'removed') {
          for (let index = 0; index < this.chatRooms.length; index++) {
            if (this.chatRooms[index].cid === mid) {
              // remove from array
              this.chatRooms.splice(index, 1);
              this.unreadCounter.unRegister(mid);
              break;
            }
          }
        }
      });
      this.chatService.onChatRoomListChanged.next(this.chatRooms);

      // if(this.chatService.onSelectChatRoom.value != null){
      //     const newChat = this.chatRooms.find(l => l.cid === this.chatService.onSelectChatRoom.value.cid);
      //     if(newChat){
      //         this.chatService.onSelectChatRoom.next(newChat);
      //     }
      // }
    });
  }

  presentPopover(ev): void {
    let popover = this.popoverCtrl.create('page-menu',{}, {cssClass: 'page-menu'});
    popover.present({ev: ev});
  }

  goGroupList() {
    this.navCtrl.setRoot('page-group-list').catch(error => console.error(error));
  }

  windowHide() {
    this.electron.windowHide();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }

  // side menu toggle
  // onSideMenu() {
  //   this.menuCtrl.open();
  // }
  clear(){

    //just unsubscribe old one.
    if(this.unreadCounter){

      // unreadCounter 가 보내는 현 그룹의 언리드 리스트인
      // unreadList$ 가 받는 구독을 먼저 해제한다.
      if(this.unreadListSubscription){
        this.unreadListSubscription.unsubscribe();
        this.unreadListSubscription = null;
      }
      // 데이터를 지운다.
      this.unreadCounter.clear();
      this.unreadCounter = null; // always create new one with new GID.
    }
  }

  ngOnDestroy(): void {
    console.log("tabs destroy?");
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    this.squadNewMessage = 0;
    this.memberNewMessage = 0;
  }

}
