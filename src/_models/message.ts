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
      uid?: any,
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
  url:string
}

export interface IroomData{
  cid : string,
  data : IChatData,
  uid : string
}
