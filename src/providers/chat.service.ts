import { Electron } from './electron/electron';
import { Injectable } from '@angular/core';
import {BizFireService, IBizGroup} from './biz-fire/biz-fire';
import {SquadService, ISquad, ISquadData} from './squad.service';
import {BehaviorSubject, Subscription} from 'rxjs';
import { IUser } from '../_models/message';
import { LoadingProvider } from './loading/loading';
import * as firebase from 'firebase';
import {Commons, STRINGS} from '../biz-common/commons';
import {UnreadCounter} from "../classes/unread-counter";
import {LangService} from "./lang-service";
import {takeUntil} from "rxjs/operators";
import {take} from "rxjs-compat/operator/take";

export interface IFirestoreDoc {
  ref?: firebase.firestore.DocumentReference;
}

export interface IChat extends IFirestoreDoc{
    cid: string,
    data: IChatData,
  }
export interface IChatData extends ISquadData{
    created: any,
    members: any,
    gid?: string,
    lastMessage? : { text?: string, files?: any[] },
    lastMessageTime?: any,
    lastMessageTo?: string,
    manager?: any,

    read?: any,
    status: boolean
}

export interface IMessage {
    mid: string,
    data: IMessageData,
    type?: any
}

export interface IMessageData {
    created?: any,
    isNotice?: boolean,
    message?: {
      text?: string,
      files?: IFiles[]
    };
    sender?: any,
    status?: boolean,
    title?: string,
    updated?:any,
    type?: string,
    read?:{ [uid: string]: { unread: boolean, read?: any}}
}
export interface IFiles {
    name:string,
    size:number,
    type:string,
    storagePath:string,
    url:string
}

export interface IroomData{
    cid : string,
    data : IChatData,
    uid : string
}

@Injectable({
    providedIn: 'root'
})

export class ChatService {

    room_type: string;

    var_chatRooms: any;

    onChatRoomListChanged = new BehaviorSubject<IChat[]>([]);

    onSelectChatRoom = new BehaviorSubject<IChat>(null);

    onRoomMessagesListChanged = new BehaviorSubject<IMessageData[]>([]);

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

                  this.makeRoomNoticeMessage('member-chat','The chat room has been created.',newRoom.gid,snap.id)
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

    uploadFilesToChat(filePath: string,file: File): Promise<any> {
        return new Promise<{storagePath: string, url: String}>((resolve, reject) => {
          let storageRef;

          storageRef = this.bizFire.afStorage.storage.ref(filePath).put(file);
          storageRef.on(firebase.storage.TaskEvent.STATE_CHANGED,(snapshot) => {
            let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            this.fileUploadProgress.next(parseFloat(progress.toFixed()));
          });
          storageRef.then(fileSnapshot => {
            fileSnapshot.ref.getDownloadURL().then((url) => {
              resolve(url);
            }).catch(err => {
              console.log(err);
              reject(err);
            });
          }).catch(err => {
            console.log(err);
            reject(err);
          })
        })
    }

    addMsg(path : string, msg : IMessageData,roomPath : string, currentChat?: IChat | ISquad) {
        if(currentChat) {
            const members = currentChat.data.members;
            msg.read = Commons.makeReadFrom(members,this.bizFire.uid);
            console.log("membersmembers",members);
        }
        return new Promise<string>( (resolve, reject) => {
            this.bizFire.afStore.firestore.collection(path).add(msg).then((ref) => {
                if(roomPath) {
                    this.bizFire.afStore.firestore.doc(roomPath).set({
                        lastMessage : msg.message,
                        lastMessageTime : new Date(),
                    },{merge : true}).catch(err => console.error("chat : last Data err =>",err));
                    resolve(ref.id);
                }
            })
            .catch(err => {
                reject(err);
                console.error("chat : add Msg err =>",err);
            });
        })
    }
    setMsg(path : string, msg : IMessageData) {
        this.bizFire.afStore.firestore.doc(path).set(msg,{merge: true});
    }

    makeRoomNoticeMessage(room_type,txt_message,gid,cid) {

        const newMessage: IMessageData = {
            message: {
                text : txt_message
            },
            created: new Date(),
            isNotice : true,
            type: 'chat'
        };

        return this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,gid,cid)).add(newMessage)

    }

    removeMember(uid,gid,cid) {
        return new Promise<void>( (resolve, reject) => {
            this.bizFire.afStore.firestore.doc(Commons.chatDocPath(gid,cid)).update({
                ['members.' + uid]: firebase.firestore.FieldValue.delete()
            }).then(()=>{
              // insert exit room message
              const text = this.langPack['chat_exit_user_notice'].replace('$DISPLAYNAME', this.bizFire.currentUserValue.displayName);
              const message: IMessageData = {
                created: new Date(),
                isNotice: true,
                sender: this.bizFire.uid,
                message:{
                  text: text
                },
                type: 'chat'
              };
              this.bizFire.afStore.firestore.collection(this.getMessagePath("member-chat",gid,cid)).add(message)
                .then(() => this.electron.windowClose());

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
