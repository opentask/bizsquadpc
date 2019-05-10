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

export interface IChatRoom {
    uid?: string,
    cid: string,
    data: IChatRoomData,
  }
export interface IChatRoomData {
    created: number,
    group_id: string,
    type: string,
    lastMessage?: string,
    lastMessageTo?: string,
    lastMessageUid?: string,
    lastMessageTime?: number,
    members?: any,
    manager?: any,
    notify?:boolean,
    member_count?:any,
    member_data?: IUser[],
    title?: string,
    read?: any,
    is_group: number,
    status: number
}

export interface IRoomMessages {
    rid: string,
    data: IRoomMessagesData,
    
}

export interface IRoomMessagesData {
    created: number,
    files?: IFiles,
    message: string,
    photoURL?: string,
    senderId: string,
    senderName: string,
    notice?: number,
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

    createRoomByProfile(type: string,me : IUser,target: IUser){
        const now = new Date();
        const newRoom:IChatRoomData = {
            created:  now.getTime() / 1000 | 0,
            group_id: this.bizFire.onBizGroupSelected.getValue().gid,
            type: type,
            is_group: 0,
            members: {
                [me.uid] : {
                    'name' : me.data.displayName,
                    'photoURL' : me.data.photoURL
                },
                [target.uid] : {
                    'name' : target.data.displayName,
                    'photoURL' : target.data.photoURL
                }
            },
            manager: {
                [me.uid] : true,
                [target.uid] : true
            },
            status: 1
        }
        this.createRoom(newRoom);
    }
    createRoomByFabs(type,members:IUser[]=[]) {
        const now = new Date();
        let is_group = 1;
        const myValue = this.bizFire.currentUserValue;
        // fabs invite에서 초대 한 멤버가 한명일 경우 그룹채팅이 아니다.
        if(members.length === 1){
            is_group = 0;
        }
        const newRoom:IChatRoomData = {
            created:  now.getTime() / 1000 | 0,
            group_id: this.bizFire.onBizGroupSelected.getValue().gid,
            type: type,
            is_group: is_group,
            members:{
                [myValue.uid] : {
                    'name' : myValue.displayName,
                    'photoURL' : myValue.photoURL
                }
            },
            manager:{},
            status: 1
        }
        if(members.length > 0){
            members.forEach(u => {       
                newRoom['manager'][u.data.uid] = true;
                newRoom['members'][u.data.uid] = {
                    'name' : u.data.displayName,
                    'photoURL' : u.data.photoURL
                }           
            })

        }
        console.log(newRoom);
        this.createRoom(newRoom);
    }

    createRoom(newRoom:IChatRoomData){
        if(newRoom != null){
            this.bizFire.afStore.collection("chat").add(newRoom).then(room => {
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
              return 'chat/' + cid +'/chat';
            case 'squad-chat':
              return 'bizgroups/'+ gid + '/squads/' + cid + '/chat';
            case 'member-chat-room':
              return 'chat/' + cid;
            case 'squad-chat-room':
              return 'bizgroups/'+ gid + '/squads/' + cid;
        }  
    }
    getUploadPath(type,cid,gid,message_id,fileName){
        switch(type){
          case 'member-chat':
            return 'chat/'+ gid +'/'+ cid + '/' + 'chat/'+ message_id + '/' +fileName;
          case 'squad-chat':
            return 'chatsquad/'+ gid + '/' + cid + '/' + 'chat/'+ message_id + '/' + fileName; 
        }
      }

    sendMessage(room_type,txt_message,id,gid?,file?:File) {
            const now = new Date();

            let checkFileText = txt_message;
            let filePath;
            if(file != null) {
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
                    lastMessageTo : this.bizFire.currentUserValue.displayName,
                    lastMessageUid : uid,
                    lastMessageTime : now.getTime() / 1000 | 0,
                    read : { [uid] : {lastRead: now.getTime() / 1000 | 0} }
                },{merge : true}).then(() => {
                    if(room_type == "squad-chat" && file != null){
                        filePath = `chatsquad/${gid}/${id}/chat/${message.id}/${file.name}`
                    } else if(room_type == "member-chat" && file != null){
                        filePath = `chat/${gid}/${id}/chat/${message.id}/${file.name}`
                    }
                    if(file != null) {
                        this.uploadFilesToChat(file,room_type,id,gid,message.id,file.name).then(url =>{
                            message.set({
                                message: file.name,
                                files: {
                                    name: file.name,
                                    type:file.type,
                                    storagePath: filePath,
                                    size:file.size,
                                    url: url
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

            }).catch(error => console.error("메세지작성에러",error));
    }

    writeTodayAndSendMsg(room_type,txt_message,id,gid?,file?:File){
        const now = new Date();
        const newMessage: IRoomMessagesData = {
            message: '',
            created: now.getTime() / 1000 - 1 | 0,
            senderId: 'Dev',
            senderName: 'Notice',
            notice: 1,
        }
        this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,id,gid)).add(newMessage).then(() =>{
            if(txt_message != '')
            this.sendMessage(room_type,txt_message,id,gid,file);
        })
    }

    uploadFilesToChat(file,type,id,gid,message_id,fileName): Promise<any> {
        return new Promise<{storagePath: string, url: String}>((resolve, reject) => {
            let storageRef;
            const filePath = this.getUploadPath(type,id,gid,message_id,fileName);

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


    removeMember(uid,cid){
        return new Promise<void>( (resolve, reject) => {
        this.bizFire.afStore.firestore.doc("chat/" + cid).update({
            ['members.' + uid]: firebase.firestore.FieldValue.delete()
        }).then(()=>{
            this.electron.windowClose();
            resolve();
        }).catch(error=>{
            reject(error);
        });  
        });
    }

    updateLastRead(room_type,uid,cid,gid?){
        return new Promise<void>( (resolve, reject) => {
          const now = new Date();
          this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type,cid,gid)).set({
              read : { [uid] : {lastRead: now.getTime() / 1000 | 0}}
          },{merge : true}).then((s)=>{
            resolve(s);
          }).catch(error=>{
            reject(error);
          });  
        });
    }

    checkIfHasNewMessage(d) {
        if(d.data.lastMessageTime != null && d.data.lastMessageTime > 1){
            if(d.data.read !=null && d.data.read[this.bizFire.currentUID] != null){
                let ret = d.data.read[this.bizFire.currentUID].lastRead < d.data.lastMessageTime;
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
            if(d.data.read !=null && d.data.read[this.bizFire.currentUID] != null){
                let ret = d.data.read[this.bizFire.currentUID].lastRead < d.data.lastMessageTime;
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

    check

    onNotification(msg){
        Notification.requestPermission().then(() => {
            let myNotification = new Notification('There is a new message.',{
            'body': msg,
            });
        })
    }
}