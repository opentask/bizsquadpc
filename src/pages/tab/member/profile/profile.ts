import { Electron } from './../../../../providers/electron/electron';
import { AlertProvider } from './../../../../providers/alert/alert';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, PopoverController } from 'ionic-angular';
import { Subject } from 'rxjs';
import { BizFireService, LoadingProvider } from '../../../../providers';
import { FormGroup, ValidatorFn, Validators, FormBuilder } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { IUser } from '../../../../_models/message';
import { ChatService, IChatRoom } from '../../../../providers/chat.service';


@IonicPage({ 
  name: 'page-profile',
  segment: 'profile',
  priority: 'high'
})
@Component({
  selector: 'page-profile',
  templateUrl: 'profile.html',
})
export class ProfilePage {

  // 본인 프로필인지 다른 유저의 프로필인지 체크
  who : boolean = false;

  // 프로필 변경 버튼 클릭
  editProfile : boolean = false;

  // 변경된 값이 있는지
  checkProfile: boolean = false;

  targetValue : IUser;
  myValue: IUser;
  manager: any;
  partner: boolean = false;
  checkManager: boolean = false;
  notImg : string = '';
  imageSrc : string = '';
  displayName: string;

  editProfileForm: FormGroup;

  attachFile: File;

  private _unsubscribeAll;

  private displayNameValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.maxLength(20)
  ]);
  private phoneNumberValidator: ValidatorFn = Validators.compose([
    Validators.maxLength(20)
  ]);
  
  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public bizFire : BizFireService,
    public popoverCtrl :PopoverController,
    private loading: LoadingProvider,
    public formBuilder: FormBuilder,
    public alertCtrl : AlertProvider,
    public electron : Electron,
    public chatService: ChatService) {

      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {

    // 본인 프로필값 -채팅을 위한
    this.myValue = this.navParams.get('me');
    // 본인선택시 본인프로필값 / 유저선택시 유저 프로필값 가져옴.
    this.targetValue = this.navParams.get('target');
    // 매니저 체크 값.
    this.manager = this.navParams.get('manager');
    // 파트너 체크 값.
    this.partner = this.navParams.get('partner');
    this.loadUserData();

    console.log(this.myValue);
    console.log(this.targetValue);
    console.log("you partner?",this.partner);

    if(this.targetValue != null && this.targetValue.uid){
      this.checkManager = this.manager != null && this.manager[this.targetValue.uid] === true;
      console.log("관리자체크",this.checkManager)
    }
    // 본인인가, 유저인가
    this.who = this.bizFire.currentUID == this.targetValue.uid;
    console.log("본인체크",this.who);

    this.editProfileForm = this.formBuilder.group({
      displayName: [this.targetValue.data.displayName, this.displayNameValidator],
      phoneNumber: [this.targetValue.data.phoneNumber, this.phoneNumberValidator],
      email: [this.targetValue.data.email],
    });

    this.editProfileForm.valueChanges.pipe(takeUntil(this._unsubscribeAll))
    .subscribe(data => {
      this.checkProfile = true;
    })
  }

  editProfileShow() {
    if(this.who && !this.editProfile) {
      this.editProfile = true;
    }
  }

  cancelEdit() {
    if(this.who && this.editProfile) {
      this.editProfile = false;
    }
  }

  editPhoto(event) {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      this.attachFile = file;

      this.loading.show();
      const reader = new FileReader();
      reader.onload = (e: any) => this.imageSrc = e.target.result;

      reader.readAsDataURL(file);

      this.uploadProfile().then(url => {
          const updateProfileData = {
              displayName: this.editProfileForm.value['displayName'],
              photoURL: url
          };
          this.bizFire.afAuth.auth.currentUser.updateProfile(updateProfileData).then(()=>{
              this.bizFire.afStore.doc(`users/${this.bizFire.currentUID}`).update({
                  displayName: this.editProfileForm.value['displayName'],
                  photoURL: url
              }).then(()=>{
                  this.closePopover().then(()=>{
                    this.alertCtrl.showAlert();
                  })
                  // clear old value
                  this.attachFile = null;
                  this.loading.hide();
              }).catch(err => {console.error(err);this.loading.hide()});
          }).catch(err => {console.error(err);this.loading.hide()});
      }).catch(err => {console.error(err);this.loading.hide()});
    }
  }
  uploadProfile(): Promise<string>{
    return new Promise<string>( (resolve, reject) => {
        if(this.attachFile){
            const ref = this.bizFire.afStorage.storage.ref(`users/${this.bizFire.currentUID}/${this.attachFile.name}`);
            ref.put(this.attachFile).then(fileSnapshot => {
                // upload finished.
                this.attachFile = null;

                fileSnapshot.ref.getDownloadURL().then((url) => {
                    resolve(url);

                }).catch(err => {
                    console.error(err);
                });
            }).catch(err => {
                console.error(err);
                reject(err);
            });
        } else {
            console.error(this.attachFile, 'empty');
            reject();
        }
    });
  }
  editSubmit() {
    if(this.editProfileForm.valid && this.checkProfile) {
      this.loading.show();
      const editData = this.editProfileForm.value;
      let updateProfileData;
      updateProfileData = {
        displayName: this.editProfileForm.value['displayName'],
        photoURL: this.bizFire.afAuth.auth.currentUser.photoURL
      };
      this.bizFire.afAuth.auth.currentUser.updateProfile(updateProfileData).then(() =>{
        this.bizFire.editUserProfile(editData).then(() => {
          console.log(this.editProfileForm['displayName'])
          console.log("바뀐값이 없어도 실행됨.");
          this.loading.hide();
          this.viewCtrl.dismiss();
        }).catch(err => { 
          this.loading.hide();
          console.log(err)
        })
      })
    } else {
      this.viewCtrl.dismiss();
    }
  }

  loadUserData(){
    if(this.targetValue.data != null && this.targetValue.data.photoURL != null) {
      this.imageSrc = this.targetValue.data.photoURL;
    } else if(this.targetValue.data.displayName != null || this.targetValue.data.displayName.length != 0){
      let count = 2;
      if(this.targetValue.data.displayName.length === 1){
        count = 1;
      }
      this.notImg = this.targetValue.data.displayName.substr(0,count);
    } else {
      this.notImg = this.targetValue.data.email.substr(0,2);
    }
  }

  closePopover(){
    return this.viewCtrl.dismiss().then(() => {
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
    });
  }

  gotoChat(){
    let chatRooms = this.chatService.getChatRooms();
    console.log("chatRooms",chatRooms);
    let selectedRoom: IChatRoom;
    for(let room of chatRooms) {
      const member_list = room.data.members;
      const member_count = Object.keys(member_list).length;

      if(Object.keys(member_list).length == 2) {
        if(member_list.hasOwnProperty(this.targetValue.uid)) {
          console.log("조건에 맞는 채팅방이 있습니다.",room);
          selectedRoom = room;
          break;
        }
      }
    }
    
    if(selectedRoom == null){
      this.chatService.createRoomByProfile(this.targetValue);
    } else {
      this.chatService.onSelectChatRoom.next(selectedRoom);
      this.electron.openChatRoom(selectedRoom);
    }
    this.closePopover();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
