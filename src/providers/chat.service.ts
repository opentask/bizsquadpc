import { Electron } from './electron/electron';
import { Injectable } from '@angular/core';
import {BizFireService} from './biz-fire/biz-fire';
import {SquadService, ISquad} from './squad.service';
import {BehaviorSubject } from 'rxjs';
import { LoadingProvider } from './loading/loading';
import * as firebase from 'firebase';
import {Commons, STRINGS} from '../biz-common/commons';

import {LangService} from "./lang-service";
import {takeUntil} from "rxjs/operators";
import {IChat, IChatData, IFiles, IMessageData} from "../_models/message";
import {IUser} from "../_models";

@Injectable({
    providedIn: 'root'
})

export class ChatService {

    var_chatRooms: any;

    onChatRoomListChanged = new BehaviorSubject<IChat[]>([]);

    onSelectChatRoom = new BehaviorSubject<IChat>(null);

    fileUploadProgress = new BehaviorSubject<number>(null);

    unreadCountMap$ = new BehaviorSubject<any[]>(null);

    langPack: any = {};

    constructor(
        public bizFire : BizFireService,
        public electron: Electron,
        public squadService : SquadService,
        private langService : LangService,
        private loading: LoadingProvider,) {

      this.langService.onLangMap
        .pipe(takeUntil(this.bizFire.onUserSignOut))
            .subscribe((l: any) => {
          this.langPack = l;
        });
    }
    getChatRooms(){
        let chatRooms = this.onChatRoomListChanged.getValue();
        chatRooms.forEach(room =>{
            const newData = room;
            newData['uid'] = this.bizFire.currentUID;
          });
        return chatRooms;
    }

    createRoomByProfile(target: IUser) {
        const now = new Date();
        const newRoom:IChatData = {
            created:  now,
            gid: this.bizFire.onBizGroupSelected.getValue().gid,
            members: {
                [this.bizFire.currentUserValue.uid] : true,
                [target.uid] : true
            },
            status: true,
            type: 'member'
        }

        this.createRoom(newRoom);
    }

    createRoomByFabs(users:IUser[]) {

        const now = new Date();
        const myValue = this.bizFire.currentUserValue;
        // fabs invite에서 초대 한 멤버가 한명일 경우 그룹채팅이 아니다.

        const newRoom:IChatData = {
            created:  now,
            gid: this.bizFire.onBizGroupSelected.getValue().gid,
            members : {
                [myValue.uid] : true
            },
            status: true,
            type: 'member'
        };
        if(users.length > 0){
            users.forEach(u => { newRoom.members[u.uid] = true; });
        }

        console.log("newRoomnewRoom",newRoom);
        this.createRoom(newRoom);
    }

    createRoom(newRoom:IChatData) {
        if(newRoom != null){
            this.bizFire.afStore.collection(Commons.chatPath(newRoom.gid)).add(newRoom).then(room => {
                room.get().then(snap =>{

                  this.var_chatRooms = {
                    cid : snap.id,
                    data: snap.data(),
                  } as IChat;

                  this.makeRoomNoticeMessage('member-chat','init',newRoom.gid,snap.id)
                    .then(() => {
                      this.onSelectChatRoom.next(this.var_chatRooms);
                      this.electron.openChatRoom(this.var_chatRooms);
                    });
                })
            });
        }
    }

    getMessagePath(type,gid,id){
        switch(type){
            case 'member-chat':
              return Commons.chatMsgPath(gid,id);
            case 'squad-chat':
              return Commons.chatSquadMsgPath(gid,id);
            case 'member-chat-room':
              return Commons.chatDocPath(gid,id);
            case 'squad-chat-room':
              return Commons.chatSquadPath(gid,id);
        }
    }

    async addMessage(text: string,parentRef: any,unreadMembers : any,
                    files?: any[],saveLastMessage = true) {
      try{
        if(parentRef == null) {
          throw new Error('parentRef has no data.');
        }

        const now = new Date();
        const msg: IMessageData = {
          message: {
            text : text
          },
          sender: this.bizFire.uid,
          created: now,
          isNotice : false,
          read : null,
          type : 'chat',
          file: false
        };

        if(unreadMembers) {
          msg.read = Commons.makeReadFrom(unreadMembers, this.bizFire.uid);
        }
        const newChatRef = parentRef.collection('chat').doc();

        if(files && files.length > 0) {
          msg.file = true;
          const storageChatPath = parentRef.path;
          const mid = newChatRef.id;
          msg.message.files = [];
          const loads = files.map(async file => {
            const storagePath = `${storageChatPath}/${mid}/${file.name}`;
            const storageRef = this.bizFire.afStorage.storage.ref(storagePath);
            const fileSnapshot = await storageRef.put(file);

            // get download url
            const downloadUrl = await fileSnapshot.ref.getDownloadURL();

            msg.message.files.push({
              name: file.name,
              size: file.size,
              type: file.type,
              url : downloadUrl,
              storagePath: storagePath
            } as IFiles)
          });
          await Promise.all(loads);
        }
        await newChatRef.set(msg);

        if(saveLastMessage === true) {
          await parentRef.set({
            lastMessage: msg.message,
            lastMessageTime: new Date(),
          }, {merge: true});
        }
        return newChatRef.id;
      } catch (e) {
        console.log('addMessage',e,text);
        return null;
      }
    }

    makeRoomNoticeMessage(room_type,type,gid,cid,uid?) {

      const newMessage : IMessageData = {
        message: {
          notice: {
            type: type
          }
        },
        created: new Date(),
        isNotice: true,
        sender: this.bizFire.uid,
        type: 'chat'

      };

      if(uid){
        newMessage.message.notice.uid = uid;
      }

        return this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,gid,cid)).add(newMessage)
    }

    removeMember(uid,gid,cid) {
        return new Promise<void>( (resolve, reject) => {
            this.bizFire.afStore.firestore.doc(Commons.chatDocPath(gid,cid)).update({
                ['members.' + uid]: firebase.firestore.FieldValue.delete()
            }).then(()=>{
              // insert exit room message
              const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', this.bizFire.currentUserValue.displayName);
              this.makeRoomNoticeMessage('member-chat','exit',gid,cid,[this.bizFire.uid]).then(() => this.electron.windowClose());

              resolve();
            }).catch(error=>{
                reject(error);
            });
        });
    }


  setToReadStatus(doc: any, batch: any): boolean {

      let added = false;
      let read = doc.get('read');

      if(read == null || read[this.bizFire.uid] == null){
        read = { [this.bizFire.uid]: { unread: false, read: new Date()}};
        batch.set(doc.ref, {read: read}, {merge: true});
        added = true;

      } else {

        if(read[this.bizFire.uid].unread === true){
          read = { [this.bizFire.uid]: { unread: false, read: new Date()}};
          batch.set(doc.ref, {read: read}, {merge: true});
          added = true;
        }
      }
      return added;
    }

    onNotification(msg){
        Notification.requestPermission().then(() => {
            let myNotification = new Notification('There is a new message.',{
            'body': msg,
            });
        })
    }

}
