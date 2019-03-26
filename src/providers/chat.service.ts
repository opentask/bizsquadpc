import { Electron } from './electron/electron';
import { Injectable } from '@angular/core';
import { BizFireService } from './biz-fire/biz-fire';
import { SquadService, ISquad } from './squad.service';
import { BehaviorSubject } from 'rxjs';
import { IUser } from '../_models/message';
import { resolve } from 'path';
import { rejects } from 'assert';
import { text } from '@angular/core/src/render3';
import { LoadingProvider } from './loading/loading';

export interface IChatRoom {
    uid?: string,
    cid: string,
    data: IChatRoomData,
  }
export interface IChatRoomData {
    created: number,
    gid: string,
    type: string,
    lastMessage?: string,
    lastMessageTime?: number,
    members?: any,
    notify?:boolean,
    member_count?:any,
    member_data?: IUser[],
    title?: string,
    read?: any
}

export interface IRoomMessages {
    rid: string,
    data: IRoomMessagesData,
    
}

export interface IRoomMessagesData {
    created: number,
    file?: {
        name: string,
        path: string,
        type: string,
        size: number,
    }
    message: string,
    photoURL: string,
    senderId: string,
    senderName: string,
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

    createRoomByProfile(type,me,target){
        const now = new Date();
        const newRoom:IChatRoomData = {
            created:  now.getTime() / 1000 | 0,
            gid: this.bizFire.onBizGroupSelected.getValue().gid,
            type: type,
            members: {
                [me] : true,
                [target] : true
            }
        }
        this.createRoom(newRoom);
    }
    createRoomByFabs(type,members:IUser[]=[]) {
        const now = new Date();
        const newRoom:IChatRoomData = {
            created:  now.getTime() / 1000 | 0,
            gid: this.bizFire.onBizGroupSelected.getValue().gid,
            type: type,
            members:{
                [this.bizFire.currentUID]:true
            }
        }
        if(members.length > 0){
            members.forEach(u => {
                newRoom['members'][u.data.uid] = true;            
            })
        }
        console.log(newRoom);
        this.createRoom(newRoom);
    }

    createRoom(newRoom:IChatRoomData){
        if(newRoom != null){
            this.bizFire.afStore.collection("chats").add(newRoom).then(room => {
                room.get().then(snap =>{
                    this.var_chatRooms = {
                        cid : snap.id,
                        data: snap.data(),
                        uid: this.bizFire.currentUID
                    } as IChatRoom;
                    this.onSelectChatRoom.next(this.var_chatRooms);
                    this.electron.openChatRoom(this.var_chatRooms);
                })
            });
        }
    }
    getMessagePath(type,cid?,gid?){
        switch(type){
            case 'member-chat':
              return 'chats/' + cid +'/chat';
            case 'squad-chat':
              return 'bizgroups/'+ gid + '/squads/' + cid +'/chat';
            case 'member-chat-room':
              return 'chats/' + cid;
            case 'squad-chat-room':
              return 'bizgroups/'+ gid + '/squads/' + cid;
        }  
    }
    getUploadPath(type,cid,gid,fileName){
        switch(type){
          case 'member-chat':
            return 'chat/'+ gid +'/'+ cid + '/' + fileName;
          case 'squad-chat':
            return 'chatsquad/'+ gid + '/' + cid + '/' + fileName; 
        }
      }

    sendMessage(room_type,txt_message,id,gid?,file?:File) {
            const now = new Date();
            let checkFileText = txt_message;
            if(file != null){
                checkFileText = '';
                this.loading.show();
            }
            const newMessage: IRoomMessagesData = {
                message: checkFileText,
                created: now.getTime() / 1000 | 0,
                senderId: this.bizFire.currentUID,
                senderName: this.bizFire.currentUserValue.displayName,
                photoURL: this.bizFire.currentUserValue.photoURL,
            }

            this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,id,gid)).add(newMessage).then(message =>{
                const uid = this.bizFire.currentUID;
                this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type+'-room',id,gid)).set({
                    lastMessage : txt_message,
                    lastMessageTime : now.getTime() / 1000 | 0,
                    read : { [uid] : {lastRead: now.getTime() / 1000 | 0} }
                },{merge : true}).then(() => {
                    if(file != null) {
                        this.uploadFilesToChat(file,room_type,id,gid,file.name).then(url =>{
                            message.set({
                                file: {
                                    name: file.name,
                                    path: url,
                                    type:file.type,
                                    size:file.size,
                                }
                            },{merge : true}).then(() => {
                                this.loading.hide();
                                resolve(url);
                            }).catch(err => {
                                this.loading.hide();
                                rejects(err);
                            })
                        })
                    } else {
                        resolve('');
                        this.loading.hide();
                    }
                }).catch(error => console.log("라스트 메세지 작성에러",error))
                // this.onSelectChatRoom.next(selectedRoom);

            }).catch(error => console.error("메세지작성에러",error));
    }

    uploadFilesToChat(file,type,id,gid,fileName): Promise<any> {
        return new Promise<string>((resolve, reject) => {
            let storageRef;
            const filePath = this.getUploadPath(type,id,gid,fileName);

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

    updateLastRead(room_type,uid,cid,gid?){
        return new Promise<void>( (resolve, reject) => {
          const now = new Date();
          this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type,cid,gid)).set({
              read : { [uid] : {lastRead: now.getTime() / 1000 | 0} }
          },{merge : true}).then(()=>{
            resolve();
          }).catch(error=>{
            reject(error);
          });  
        });
    }

    checkIfHasNewMessage(d) {
        if(d.data.lastMessageTime != null){
            if(d.data.read !=null && d.data.read[this.bizFire.currentUID] != null){
                let ret = d.data.read[this.bizFire.currentUID].lastRead < d.data.lastMessageTime;
                return ret;
            }
        } else {
            return false;
        }
    }

}