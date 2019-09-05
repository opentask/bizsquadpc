import {Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {IBizGroup, IUser, IUserData} from '../../_models';
import {filter, takeUntil} from 'rxjs/operators';
import {TakeUntil} from "../../biz-common/take-until";
import {BizFireService} from "../../providers";
import {CacheService} from "../../providers/cache/cache";
import {Commons} from "../../biz-common/commons";

@Component({
  selector: 'app-avatar-button',
  templateUrl: 'avatar-button.component.html'
})

export class AvatarButtonComponent extends TakeUntil implements OnInit {

  @Input()
  displayNameOn = true;

  @Input()
  emailOn = true;

  @Input()
  set team_color(color: string){
    if(color){
      this._team_color = color;
    }
  }
  get team_color(): string {
    return this._team_color;
  }

  @Input()
  smallIcon = false;

  _team_color;

  defaultMyColor = 'dodgerblue';

  userData: IUserData;

  @Input()
  set uid(uid: string){
    if(uid){
      this.setUserData(uid, null);
    }
  }

  private currentUserId: string;

  @Input()
  set user(user: IUser) {
    if (user != null) {
      this.setUserData(user.uid, user.data);
    }
  }

  @Output()
  onClick = new EventEmitter<IUserData>();

  isMyMessage = false;
  shortName: string;
  photoURL: string;

  // thumbUrl 이 있으면 표시. 없으면 photoURL 표시.
  thumbUrl: string;

  constructor(private bizFire: BizFireService,
              private cacheService: CacheService
  ) {
    super();
  }

  private setUserData(uid, userData: IUserData){

    this.currentUserId = uid;
    this.isMyMessage = uid === this.bizFire.uid;
    if(this.isMyMessage){

      this.setUser(this.bizFire.currentUserValue);

    } else {

      if(userData == null){
        // get user data from cache
        this.cacheService.userGetObserver(uid)
          .pipe(this.takeUntil)
          .subscribe((data: IUser) => {
            if(data != null){
              this.setUser(data.data);
            }
          });
      } else {
        this.setUser(userData);
      }
    }
  }

  private setUser(userData: IUserData){
    this.userData = userData;
    if(userData != null){
      this.photoURL = userData.photoURL;
      if(this.photoURL){
        if(this.photoURL.indexOf('profile.jpeg') !== -1){
          //photoURL 을 그대로 쓰지않고 썸네일을 표시한다.
          this.thumbUrl = this.photoURL.replace('profile.jpeg', 'thumb_512_profile.jpeg');
        }
      }
      if (this.photoURL == null || this.photoURL.length === 0) {
        this.shortName = Commons.initialChars(userData);
      }
    } else {

      // deleted user.
    }
  }


  ngOnInit() {

    /*
    * team_color 를 설정안해줬을때
    * 현재 그룹에서 자동으로 가져온다.
    * */
    if(this._team_color == null) {
      this.bizFire.onBizGroupSelected
        .pipe(filter(g => g != null),
          takeUntil(this.unsubscribeAll))
        .subscribe((g: IBizGroup) => {
          // default team color is blue
          this._team_color = g.data.team_color || 'dodgerblue';
        });
    }
  }

  /*
  * AVATAR 동그라미, 유저이름 클릭시 발생
  * */
  onNameClick(){
    // this object. Not a class.
    this.onClick.emit({uid: this.currentUserId, data: this.userData} as IUser);
  }
}
