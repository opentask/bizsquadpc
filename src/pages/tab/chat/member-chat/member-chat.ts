import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { Electron } from './../../../../providers/electron/electron';
import { IUser } from '../../../../_models/message';
import { ChatService, IChatRoom, IRoomMessages } from '../../../../providers/chat.service';
import { BizFireService } from '../../../../providers';
import { takeUntil, map, filter } from 'rxjs/operators';
import { FormGroup, FormBuilder, ValidatorFn,Validators } from '@angular/forms';

export interface Ichats {
  message: string,
}
 
@IonicPage({  
  name: 'page-member-chat',
  segment: 'member-chat',
  priority: 'high'
})
@Component({
  selector: 'page-member-chat',
  templateUrl: 'member-chat.html',
})
export class MemberChatPage {

  @ViewChild(Content) contentArea: Content;

  private _unsubscribeAll;

  message : string;

  messages = [];
  roomTille : string;
  readMessages: IRoomMessages[];
  msgcopy: IRoomMessages[];
  public chats: Ichats[];
  

  chatroom : IChatRoom;
  room_type : string = "chatRoom";

  sendForm: FormGroup;

  private sendValidator: ValidatorFn = Validators.compose([
    Validators.required,
  ]);

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public chatService : ChatService,
    public bizFire : BizFireService,
    public formBuilder: FormBuilder,
    public electron: Electron) {
      this.sendForm = formBuilder.group({
        sendMessage: ['', this.sendValidator]
      });
  }

  ngOnInit(): void {
    this.chatroom = this.navParams.get('roomData');

    this.bizFire.afStore.collection(`chats/${this.chatroom.cid}/chat`, ref => ref.orderBy('created',"asc"))
    .stateChanges(['added']).subscribe(snap => {
      this.readMessages = snap.map(d => (
        {
          rid: d.payload.doc.id,
          data:d.payload.doc.data()
        } as IRoomMessages
      ));
      this.readMessages.forEach(msg =>{
        this.messages.push(msg);

      })
      console.log(this.readMessages);
    })

    this.chatService.createRoom(null);
  } 

  sendMessage(){
    // 앞, 뒤 공백제거 => resultString
    if(this.message !=null){
      const resultString = this.message.replace(/(^\s*)|(\s*$)/g, '');
      if(resultString != ''){
          this.chatService.sendMessage("member-chat",resultString,this.chatroom.cid);
      }
    }
    this.message = '';
  }
  windowClose() {
    this.electron.windowClose();
  }

  windowMimimize() {
    this.electron.windowMimimize();
  }
  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
