import { GroupColorProvider } from './../../../providers/group-color';
import { Electron } from './../../../providers/electron/electron';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { BizFireService } from '../../../providers/biz-fire/biz-fire';
import { ISquad, SquadService } from '../../../providers/squad.service';
import { filter, takeUntil, map } from 'rxjs/operators';
import {Commons, STRINGS} from '../../../biz-common/commons';
import { TokenProvider } from '../../../providers/token/token';
import {LangService} from "../../../providers/lang-service";
import {IBizGroup, IFolderItem} from "../../../_models";
import {IChat} from "../../../_models/message";

export interface ISquadListData {
  generalSquads?: ISquad[];
  agileSquads?: ISquad[];
  partnerSquads?: ISquad[];
  bookmark?: ISquad[];
}


@IonicPage({
  name: 'page-squad',
  segment: 'squad',
  priority: 'high'
})
@Component({
  selector: 'page-squad',
  templateUrl: 'squad.html',
})
export class SquadPage {

  private _unsubscribeAll;

  currentSquad: ISquad;
  currentBizGroup: IBizGroup;
  generalMembers: number;
  groupMainColor: string;

  ipc: any;

  isPartner = false;

  userCustomData: any;

  defaultSegment : string = "generalSquad";
  isAndroid: boolean = false;

  folders: Array<IFolderItem> = [];
  privateFolders: Array<IFolderItem> = [];
  publicSquads: IChat[] = [];
  privateSquads: IChat[] = [];
  bookmark : IChat[] = [];

  public_shownGroup = null;
  private_shownGroup = null;

  private userDataChanged = new Subject<any>() ; // userData monitor.
  private userDataMargin: Subscription;

  langPack : any;

  webUrl = 'https://product.bizsquad.net/auth?token=';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public bizFire : BizFireService,
    public electron : Electron,
    private squadService: SquadService,
    public platform : Platform,
    private tokenService : TokenProvider,
    private langService: LangService,
    public groupColorProvider : GroupColorProvider) {
    this._unsubscribeAll = new Subject<any>();
    this.ipc = electron.ipc;

    this.isAndroid = platform.is('ios');

    this.langService.onLangMap
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((l: any) => {
        this.langPack = l;
    });
  }

  ngOnInit() {

    this.bizFire.onBizGroupSelected
    .pipe(filter(g=>g!=null), takeUntil(this._unsubscribeAll))
    .subscribe(group => {

        this.generalMembers = Object.keys(group.data.members).length;
        this.groupMainColor = this.groupColorProvider.makeGroupColor(group.data.team_color);
        if(group.data.partners != null){
            this.generalMembers = Object.keys(group.data.members).length - Object.keys(group.data.partners).length;
        }
        // if current group changed,
        // select my squad.
        if( this.currentBizGroup != null) {
            if( this.currentBizGroup.gid !== group.gid){
                this.currentBizGroup = group;
                // get ne userDataChanged monitor
                this.isPartner = this.bizFire.isPartner(group);
                this.startMonitorUserData(group);

                // set MySquad
                // this.squadService.onSelectSquad.next({sid: STRINGS.MY_SQUAD_STRING, data: null});
            } else {
                // just copy latest value.
                this.isPartner = this.bizFire.isPartner(group);
                this.currentBizGroup = group;
            }
        } else {
            // never started.
            this.currentBizGroup = group;
            // get ne userDataChanged monitor
            this.isPartner = this.bizFire.isPartner(group);
            this.startMonitorUserData(group);
            // set MySquad
            // this.squadService.onSelectSquad.next({sid: STRINGS.MY_SQUAD_STRING, data: null});
        }
    });

    combineLatest(this.userDataChanged, this.squadService.onSquadListChanged)
    .pipe(
        takeUntil(this._unsubscribeAll))
    .subscribe(([userData, squadList]) => {
        if(userData.gid === this.currentBizGroup.gid){
            squadList.forEach(squad =>{
                const newData = squad.data;
                newData["member_count"] = Object.keys(squad.data.members).length;
            })
            this.updateShelf(userData, squadList);
        }
    });
  }

  private startMonitorUserData(group: IBizGroup) {
    console.log('group chagned to', group.gid);
    // biz group have changed.
    if(this.userDataMargin){
        this.userDataMargin.unsubscribe();
    }
    // * start monitor userData
    const path = `${STRINGS.STRING_BIZGROUPS}/${group.gid}/userData/${this.bizFire.currentUID}`;
    this.userDataMargin = this.bizFire.afStore.doc(path).valueChanges()
        .pipe(
            map(userData => ({gid: group.gid, uid: this.bizFire.currentUID, data: userData})),
            takeUntil(this.bizFire.onUserSignOut))
        .subscribe(userData => {
          this.userCustomData = userData;
          this.userDataChanged.next(userData);
        });
  }

  // * load left folders.
  /*
  * 실제 존재하는 폴더를 위주로
  * 사이드바에 표시해 리얼타임 갱신이 가능하게 한다.
  * */
  private updateShelf(userData: any, originalSquadList: IChat[]) {
    //console.log('updateShelf with userData', userData, originalSquadList);
    // clear old ones.
    console.log("originalsquadlist",originalSquadList);
    this.folders = []; // my folders
    this.privateSquads = [];
    this.publicSquads = [];
    this.bookmark = [];


    const {folders,privateFolders,privateSquads,publicSquads,bookmark} = this.squadService.makeSquadMenuWith(userData.data, originalSquadList);

    // console.log(folders, privateSquads, publicSquads);

    this.folders = folders;
    this.privateFolders = privateFolders;

    this.publicSquads = publicSquads;
    this.privateSquads = privateSquads;
    this.bookmark = bookmark;

  }

  toggleGroup(group) {
    if (this.isGroupShown(group)) {
        this.public_shownGroup = null;
    } else {
        this.public_shownGroup = group;
    }
  };
  isGroupShown(group) {
      return this.public_shownGroup === group;
  };
  togglePrivateGroup(group) {
    if (this.isPrivateGroupShown(group)) {
        this.private_shownGroup = null;
    } else {
        this.private_shownGroup = group;
    }
  };
  isPrivateGroupShown(group) {
      return this.private_shownGroup === group;
  };

  onSquadChat(ev,squad : IChat) {
    ev.stopPropagation();
    const cutRefValue = {sid: squad.cid, data: squad.data};
    console.log(squad);
    this.electron.openChatRoom(cutRefValue);
  }
  onFavoritesSelect(ev,sid){
    ev.stopPropagation();
    console.log("sidsid",sid);

    const gid = this.bizFire.onBizGroupSelected.getValue().gid;
    const path = Commons.userDataPath(gid, this.bizFire.currentUID);
    console.log("this.userCustomData",this.userCustomData);
    // get delete or add
    if(this.userCustomData.data == null) {
      this.userCustomData.data = {[sid]: {}};
    }

    if(this.userCustomData.data[sid] == null || !this.userCustomData.data[sid]['bookmark']){
      this.userCustomData.data[sid] = { bookmark: true };
    } else if (this.userCustomData.data[sid]['bookmark']){
      this.userCustomData.data[sid] = { bookmark: false };
    }

    console.log("this.userCustomData.data",this.userCustomData.data);

    this.bizFire.afStore.doc(path).set(this.userCustomData.data, {merge: true});

  }

  ngOnDestroy(): void {
    this.currentBizGroup = null;

    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();

    if(this.userDataMargin){
        this.userDataMargin.unsubscribe();
        this.userDataChanged = null;
    }
  }

  groupData(s) {
    console.log(this.currentBizGroup.gid,s);
  }

}
