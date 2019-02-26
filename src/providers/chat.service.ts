import { Injectable } from '@angular/core';
import { BizFireService } from './biz-fire/biz-fire';
import { SquadService } from './squad.service';
import { BehaviorSubject } from 'rxjs';

export interface IChatRoom {
    cid: string,
    data: IChatRoomData
  }
export interface IChatRoomData {
    created: number,
    group_id: string,
    is_group: number,
    lastMessage: string,
    lastMessageTime: number,
    manager:any,
    members:any,
    name: string,
    squad_id: string,
    status: number
}
  
export interface IRoomMessages {
    rid: string,
    data: IRoomMessagesData
}

export interface IRoomMessagesData {
    created: number,
    file: string,
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

    onChatRoomListChanged = new BehaviorSubject<IChatRoom[]>([]);

    onSelectChatRoom = new BehaviorSubject<IChatRoom>(null);

    onRoomMessagesListChanged = new BehaviorSubject<IRoomMessages[]>([]);

    constructor(
        public bizFire : BizFireService,
        public squadService : SquadService) {
            

    }
    getChatRooms(){
        return this.onChatRoomListChanged.getValue();
    }

    // getMessagePath(room_type){
    //     switch(room_type){
    //       case 'Chatroom-messages':
    //         return 'rooms/' + this.onSelectChatRoom.getValue().cid+'/chat';
    //       case 'Squadroom-messages':
    //         return 'bizgroups/'+this.bizFire.onBizGroupSelected.getValue().gid + '/squads/' + this.squadService.onSelectSquad.getValue().sid +'/chat';
    //       case 'Chatroom':
    //         return 'rooms/'+this.onSelectChatRoom.getValue().cid;
    //       case 'Squadroom':
    //         return 'bizgroups/'+this.bizFire.onBizGroupSelected.getValue().gid + '/squads/' + this.squadService.onSelectSquad.getValue().sid;
    //     }
    // }

}