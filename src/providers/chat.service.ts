import { Electron } from './electron/electron';
import { Injectable } from '@angular/core';
import { BizFireService } from './biz-fire/biz-fire';
import { SquadService } from './squad.service';
import { BehaviorSubject } from 'rxjs';
import { IUser } from '../_models/message';
import { resolve } from 'path';
import { rejects } from 'assert';
import { LoadingProvider } from './loading/loading';
import * as firebase from 'firebase';
import {Commons, STRINGS} from '../biz-common/commons';

export interface IChatRoom {
    uid?: string,
    cid: string,
    data: IChatRoomData,
  }
export interface IChatRoomData {
    created: any,
    group_id?: string,
    type?: string,
    lastMessage?: string,
    lastMessageTo?: string,
    lastMessageUid?: string,
    lastMessageTime?: number,
    lastRead?: any,
    members?: any,
    manager?: any,
    notify?:boolean,
    member_count?:any,
    member_data?: IUser[],
    title?: string,
    is_group?: number,
    status: boolean
}

export interface IRoomMessages {
    rid: string,
    data: IRoomMessagesData,
    
}

export interface IRoomMessagesData {
    created: any,
    files?: IFiles,
    message: string,
    senderId?: string,
    notice?: boolean,
    senderName?: string,
    photoURL?: string,
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
    data : IChatRoomData,
    uid : string
}

@Injectable({
    providedIn: 'root'
})

export class ChatService {

    room_type: string;

    var_chatRooms: any;

    onChatRoomListChanged = new BehaviorSubject<IChatRoom[]>([]);

    onSelectChatRoom = new BehaviorSubject<IChatRoom>(null);

    onRoomMessagesListChanged = new BehaviorSubject<IRoomMessages[]>([]);

    constructor(
        public bizFire : BizFireService,
        public electron: Electron,
        public squadService : SquadService,
        private loading: LoadingProvider,) {
            

    }
    getChatRooms(){
        let chatRooms = this.onChatRoomListChanged.getValue();
        chatRooms.forEach(room =>{
            const newData = room;
            newData['uid'] = this.bizFire.currentUID;
          })
        return chatRooms;
    }

    createRoomByProfile(target: IUser) {
        const now = new Date();
        const newRoom:IChatRoomData = {
            created:  now,
            group_id: this.bizFire.onBizGroupSelected.getValue().gid,
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

        const newRoom:IChatRoomData = {
            created:  now,
            group_id: this.bizFire.onBizGroupSelected.getValue().gid,
            members : {
                [myValue.uid] : true
            },
            status: true,
            type: 'member'
        }
        if(users.length > 0){
            users.forEach(u => { newRoom.members[u.uid] = true; });
        }

        console.log("newRoomnewRoom",newRoom);
        this.createRoom(newRoom);
    }

    createRoom(newRoom:IChatRoomData) {
        if(newRoom != null){
            this.bizFire.afStore.collection(Commons.chatPath(newRoom.group_id)).add(newRoom).then(room => {
                room.get().then(snap =>{

                  this.var_chatRooms = {
                    cid : snap.id,
                    data: snap.data(),
                    uid: this.bizFire.currentUID
                  } as IChatRoom;

                  this.makeRoomNoticeMessage('member-chat','The chat room has been created.',newRoom.group_id,snap.id)
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
    
          storageRef = this.bizFire.afStorage.storage.ref(filePath);
          storageRef.put(file).then(fileSnapshot => {
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

    addMsg(path : string, msg : any,roomPath : string) {

        this.bizFire.afStore.firestore.collection(path).add(msg).then(() => {
            if(roomPath) {
            this.bizFire.afStore.firestore.doc(roomPath).set({
                lastMessage : msg.message,
                lastMessageTime : new Date().getTime() / 1000 | 0,
                lastRead : {
                [this.bizFire.currentUID] : new Date().getTime() / 1000 | 0
                }
            },{merge : true}).catch(err => console.error("chat : last Data err =>",err))
            }
        }).catch(err => console.error("chat : add Msg err =>",err));
    }

    sendMessage(room_type,txt_message,gid,id) {

            let checkFileText = txt_message;

            const newMessage: IRoomMessagesData = {
                message: checkFileText,
                created: new Date(),
                senderId: this.bizFire.currentUID
            }

            this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,gid,id)).add(newMessage).then(message =>{
                const uid = this.bizFire.currentUID;
                this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type+'-room',gid,id)).set({
                    lastMessage : txt_message,
                    lastMessageTime : new Date().getTime() / 1000 | 0,
                    lastRead : {
                      [uid] : new Date().getTime() / 1000 | 0
                    }
                },{merge : true}).then(() => {

                }).catch(error => console.log("라스트 메세지 작성에러",error))

            }).catch(error => console.error("메세지작성에러",error));
    }
    
    writeTodayAndSendMsg(room_type,txt_message,id,gid?,file?:File) {

        const now = new Date();
        const newMessage: IRoomMessagesData = {
            message: '',
            created: now.getTime() / 1000 - 1 | 0,
            senderId: 'Dev',
            senderName: 'Notice',
            notice: true,
        }
        
        this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,id,gid)).add(newMessage).then(() => {

        })
    }

    makeRoomNoticeMessage(room_type,txt_message,gid,cid) {

        const newMessage: IRoomMessagesData = {
            message: txt_message,
            created: new Date(),
            notice : true
        };

        return this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,gid,cid)).add(newMessage)
        
    }

    removeMember(uid,gid,cid) {
        return new Promise<void>( (resolve, reject) => {
            this.bizFire.afStore.firestore.doc(Commons.chatDocPath(gid,cid)).update({
                ['members.' + uid]: firebase.firestore.FieldValue.delete()
            }).then(()=>{
                this.electron.windowClose();
                resolve();
            }).catch(error=>{
                reject(error);
            });  
        });
    }

    updateLastRead(room_type,uid,gid,id){
        return new Promise<void>( (resolve, reject) => {
          const now = new Date();
          this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type,gid,id)).set({
            lastRead : { [uid] : now.getTime() / 1000 | 0 }
          },{merge : true}).then((s)=>{
            resolve(s);
          }).catch(error=>{
            reject(error);
          });  
        });
    }

    checkIfHasNewMessage(d) {
        if(d.data.lastMessageTime != null && d.data.lastMessageTime > 1){
            if(d.data.lastRead !=null && d.data.lastRead[this.bizFire.currentUID] != null){
                let ret = d.data.lastRead[this.bizFire.currentUID] < d.data.lastMessageTime;
                return ret;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
    checkIfHasNewMessageNotify(d) {
        if(d.data.lastMessageTime != null && d.data.lastMessageTime > 1){
            if(d.data.lastRead !=null && d.data.lastRead[this.bizFire.currentUID] != null){
                let ret = d.data.lastRead[this.bizFire.currentUID] < d.data.lastMessageTime;
                if(ret){
                    // this.onNotification(d.data.lastMessage);
                }
                return ret;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    onNotification(msg){
        Notification.requestPermission().then(() => {
            let myNotification = new Notification('There is a new message.',{
            'body': msg,
            });
        })
    }
}
