import {ISquad, ISquadData} from "../providers/squad.service";
import {IFirestoreDoc} from "./index";

export interface IChat extends ISquad{
  cid: string,
  data: IChatData,
  title?: string,
  type?: string
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

export interface IMessage extends IFirestoreDoc{
  mid: string,
  data: IMessageData,
  type?: any
}

export interface IMessageData {
  created?: any,
  type?: string,
  message: {
    text?: string,
    files?: IFiles[],
    notice?: {
      langKey?: string,
      uid?: string[],
      type?: string
    }
  };
  isNotice?: boolean,
  file?: boolean,
  sender?: any,
  status?: boolean,
  title?: string,
  updated?:any,
  read?:{ [uid: string]: { unread: boolean, read?: any}}
}
export interface IFiles {
  name:string,
  size:number,
  type:string,
  storagePath:string,
  url:string,
  thumbUrl?: string
}

export interface IroomData{
  cid : string,
  data : IChatData,
  uid : string
}

export class Message implements IMessage {

  mid: string;
  data: IMessageData;
  ref: any;

  constructor(mid: string, data: any, ref?: any) {
    this.mid = mid;
    this.data = data;
    this.ref = ref;

    // convert 'comment' to 'message'
    if(data && data['message'] == null && data['comment'] != null){
      this.data.message = data['comment'];
    }
  }
}


export class MessageBuilder {
  static buildFromSnapshot(change: any): IMessage {
    return new Message(change.payload.doc.id, change.payload.doc.data(), change.payload.doc.ref);
  }

  static mapBuildSnapShot(){
    return (changes: any[]) => {
      return changes.map(change => MessageBuilder.buildFromSnapshot(change));
    }
  }

  static makeReadFrom(members: any, myUid: string): any {
    //const members = currentChat.data.members;
    const read = {};
    if(members == null){
      throw new Error('empty members param');
    }
    Object.keys(members)
      .forEach(uid => {
        // ser unread false except me.
        read[uid] = {unread: uid !== myUid, read: uid === myUid ? new Date(): null};
      });
    return read;
  }

  static processChange(change: any, chatList, builder?: (change: any)=>any){

    const mid = change.payload.doc.id;
    if(change.type === 'added'){

      // add new message to top
      let item;
      if(builder){
        item = builder(change);
      } else {
        item = MessageBuilder.buildFromSnapshot(change);
      }
      chatList.push(item);

    } else if (change.type === 'modified') {

      // replace old one
      for(let index = 0 ; index < chatList.length; index ++){
        if(chatList[index].cid === mid ){
          // find replacement

          //---------- 껌벅임 테스트 -------------//
          chatList[index].data = change.payload.doc.data(); // data 만 경신 한다.
          //-----------------------------------//

          break;
        }
      }
    } else if (change.type === 'removed') {
      for (let index = 0; index < chatList.length; index++) {
        if (chatList[index].cid === mid) {
          // remove from array
          chatList.splice(index, 1);
          break;
        }
      }
    }
  }

}
