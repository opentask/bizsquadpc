import { Electron } from './electron/electron';
import { Injectable } from '@angular/core';
import { BizFireService } from './biz-fire/biz-fire';
import { SquadService } from './squad.service';
import { BehaviorSubject } from 'rxjs';
import { IUser } from '../_models/message';
import { take, map } from 'rxjs/operators';

export interface IChatRoom {
    uid?: string,
    cid: string,
    data: IChatRoomData,
    test?: IUser
  }
export interface IChatRoomData {
    created: number,
    gid: string,
    lastMessage?: string,
    lastMessageTime?: number,
    members: any,
    status: number,
    notify?:boolean
}

export interface IRoomMessages {
    rid: string,
    data: IRoomMessagesData
}

export interface IRoomMessagesData {
    created: number,
    file?: string,
    message: string,
    photoURL: string,
    senderId: string,
    senderName: string
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
        public squadService : SquadService) {
            

    }
    getChatRooms(){
        let chatRooms = this.onChatRoomListChanged.getValue();
        chatRooms.forEach(room =>{
            const newData = room;
            newData['uid'] = this.bizFire.currentUID;
          })
        return chatRooms;
    }

    createRoomByMember(me:IUser,member:IUser){
        const now = new Date();
        const newRoom:IChatRoomData = {
            created:  now.getTime() / 1000 | 0,
            gid: this.bizFire.onBizGroupSelected.getValue().gid,
            status: 1,
            members:{
                [me.uid] : {
                    name: me.data.displayName,
                    photoURL : me.data.photoURL,
                    uid: me.uid
                },
                [member.uid] : {
                    name: member.data.displayName,
                    photoURL : member.data.photoURL,
                    uid: member.uid
                }
            },
        }
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
    getMessagePath(type,cid?){
        switch(type){
            case 'member-chat':
              return 'chats/' + cid +'/chat';
            case 'squad-chat':
              return 'bizgroups/'+this.bizFire.onBizGroupSelected.getValue().gid + '/squads/' + "this.squadService.onSelectSquad.getValue().sid "+'/chat';
            case 'member-chat-room':
              return 'chats/' + cid;
            case 'squad-chat-room':
              return 'bizgroups/'+this.bizFire.onBizGroupSelected.getValue().gid + '/squads/' + "this.squadService.onSelectSquad.getValue().sid";
          }  
    }

    sendMessage(room_type,txt_message,cid) {
            const now = new Date();
            const newMessage: IRoomMessagesData = {
                file : "",
                message: txt_message,
                created: now.getTime() / 1000 | 0,
                senderId: this.bizFire.currentUID,
                senderName: this.bizFire.currentUserValue.displayName,
                photoURL: this.bizFire.currentUserValue.photoURL
            }
            this.bizFire.afStore.firestore.collection(this.getMessagePath(room_type,cid)).add(newMessage).then(snap =>{

                // 알람이 들어갈 부분
                if(newMessage.senderId == this.bizFire.currentUID){
                    console.log("내가 보내는 메세지");
                } 

                this.bizFire.afStore.firestore.doc(this.getMessagePath(room_type +'-room',cid)).set({
                    lastMessage : txt_message,
                    lastMessageTime : now.getTime() / 1000 | 0,
                },{merge : true})
                // this.onSelectChatRoom.next(selectedRoom);
            }).catch(error => console.error("라스트메세지 작성 에러?",error));
    }

}