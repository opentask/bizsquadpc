import * as firebase from "firebase";
import {ISquad} from "../providers/squad.service";
import {STRINGS} from "../biz-common/commons";
import {IMessageData} from "./message";

export interface IUser {
  uid: string,
  data: IUserData,
}

export interface IUserData {
  email?: string,
  displayName?: string,
  status?: number,
  photoURL?: string,
  phoneNumber?: any,
  type?: any,
  language?: string,
  uid?: string,
  lastPcLogin?: any
  lastLogin?: any
  emailVerified?: boolean,
  user_visible_firstname?: string,
  user_visible_lastname?: string,
  providerId?: any[];
  alarm?: IAlarmConfig;
  // + pc version
  user_icon?: string,
  isChecked?: boolean,
  onlineStatus?: string,
  user_onlineColor?: string,
  lastWebGid?: string,
  lastPcGid?:string
}

export interface IAlarmConfig {

  /* 필수 항목들 */
  on?: boolean,

  groupInvite: boolean,
  //squadInvite: boolean, // 스쿼드는 초대 개념이 아님. 단톡방에는 초대받고 들어가지 않음.
  bbs: boolean,
  post: boolean,
  groupInOut?: boolean, // 그룹에 조인했을때 같은 그룹 사용자들에게 알람.

  /* VIDEO CHAT INVITE*/
  video?: boolean

  /* 다음 버전 */
  comment?: boolean,//다음버전?
  schedule?: boolean, // 다음버전
  version?: string,
  squadInOut?: boolean, // 스쿼드에 참가 이벤트는 있을 필요가 없다.


}

export interface INotification{
  mid: string,
  data: INotificationData,
}

export interface INotificationItem extends INotification {
  html?: {
    header: string[],
    content: string[],
    link?:string[],
    user?: IUser,
    groupColor?: string
  }
}

export type NotificationType = 'invitation' | 'notify' | 'reply';
export type NotifyType = 'post'|'comment'| 'join'| 'exit'| 'delete';

export interface INotificationData extends IAlarmConfig {

  from: string, // uid
  to?: string, // uid
  gid: string,
  info?: {
    type?: string,
    sid?: string,
    mid?: string,
    vid?: string,
    title?: string,
    comment?: string,
    cid?: string,
    eid?: string,
    join?: any,
    auth?: string // 'member', 'manager', 'partner'
    message?: any
  }
  created: any,
  statusInfo: {done: boolean}

}


export interface IFolderItem {
  isFolded?: boolean;
  name: string;
  squads: ISquad[];
  index: number;
}

export interface INoticeItem {
  mid: string,
  notification: INotificationData,
  data: {
    header: string[],
    content: string[],
    link:string[],
    user?: IUser
  }
}

export interface IFirestoreDoc {
  ref?: firebase.firestore.DocumentReference;
}

export interface IBizGroup extends IBizGroupBase {
  gid: string,
  data: IBizGroupData
  ref: any;
}

export interface IBizGroupBase extends IFirestoreDoc{

  isMember?: (uid?: string) => boolean;
  isManager?: (uid?: string) => boolean;
  isPartner?: (uid?: string) => boolean;
  getMemberIds?: (includeMe?: boolean)=> string[];
  getManagerIds?: (includeMe?: boolean)=> string[];
  getPartnerIds?: (includeMe?: boolean)=> string[];
  getMemberCount?: ()=> number;

  // for squad.
  isPublic?: () => boolean;
  // for FireStoreSave
  toFirestoreData?: ()=> any;
}

export interface IBizGroupData {
  manager: any,
  members: any,
  partners?: any,
  status?: any,
  team_color?: string,
  team_description?: string,
  team_name?: string,
  team_id?: string,
  manageInfo?: {
    password: string
  },
  created?: number,
  photoURL?: string,
  team_icon?: string,
  group_members?: number,
  general_squad_count?: number,
  agile_squad_count?: number,
  notifyLength?: Number,
  badgeVisible?: boolean,

  // max upload file size byte.
  maxFileSize?: number,
}

export class GroupBase implements IBizGroupBase{

  uid: string;
  data: any;
  ref: any;

  isMember(uid?: string, auth = STRINGS.FIELD.MEMBER): boolean {
    if(uid == null) uid = this.uid;
    if(this.uid == null){
      throw new Error('this.uid is null. Set uid first.');
    }
    // exception
    if(auth === 'member') auth = STRINGS.FIELD.MEMBER;

    if(this.data == null){
      throw new Error('this.data is null.');
    }
    if(this.data[auth] != null){
      return this.data[auth][uid] === true;
    } else {
      return false;
    }
  }

  isPartner(uid?: string): boolean {
    if(uid == null)uid = this.uid;
    if(this.uid == null){
      throw new Error('this.uid is null. Set uid first.');
    }
    return this.isMember(uid, STRINGS.FIELD.PARTNER);
  }

  isManager(uid?: string): boolean {
    if(uid == null)uid = this.uid;
    if(this.uid == null){
      throw new Error('this.uid is null. Set uid first.');
    }
    return this.isMember(uid, STRINGS.FIELD.MANAGER);
  }

  getMemberIds: (includeMe: boolean) => string[] = (includeMe = true)=>{
    return this.getMembersUidFrom(STRINGS.FIELD.MEMBER, includeMe);
  };

  getManagerIds: (includeMe?: boolean) => string[] = (includeMe = true)=> {
    return this.getMembersUidFrom(STRINGS.FIELD.MANAGER, includeMe);
  };

  getPartnerIds: (includeMe?: boolean) => string[] = (includeMe = true)=> {
    return this.getMembersUidFrom(STRINGS.FIELD.PARTNER, includeMe);
  };

  private getMembersUidFrom(part: string, includeMe = true): string[] {
    if(this.uid == null){
      throw new Error('this.uid is null. Set uid first.');
    }
    if(this.data == null){
      throw new Error('this.data is null.');
    }
    let ret;
    if(this.data && this.data[part]){
      ret = Object.keys(this.data[part]).filter(uid => {
        let r = this.data[part][uid] === true;
        if(!includeMe && uid === this.uid){
          r = false;
        }
        return r;
      });
    } else {
      ret = [];
    }
    return ret;
  }

  getMemberCount(): number {
    if(this.data == null){
      throw new Error('this.data is null.');
    }
    let count = 0;
    if(this.data.members){
      count = Object.keys(this.data.members).filter(uid => this.data.members[uid] === true).length;
    }
    return count;
  }

  // remove deleted user from data.members and return clean data.
  protected filterFalseMembers(data: any): any {
    if(data){
      // filter [UID]: false from members.
      if(data[STRINGS.FIELD.MEMBER] != null){
        const newMembers = {};
        Object.keys(data[STRINGS.FIELD.MEMBER])
          .filter(uid=> data[STRINGS.FIELD.MEMBER][uid] === true)
          .forEach(uid => newMembers[uid] = true);
        // replace with new one.
        data[STRINGS.FIELD.MEMBER] = newMembers;
      }

      if(data[STRINGS.FIELD.MANAGER] != null){
        const newMembers = {};
        Object.keys(data[STRINGS.FIELD.MANAGER])
          .filter(uid=> data[STRINGS.FIELD.MANAGER][uid] === true)
          .forEach(uid => newMembers[uid] = true);
        // replace with new one.
        data[STRINGS.FIELD.MANAGER] = newMembers;
      }
    }
    return data;
  }

  constructor(data?: any) {
    if(data){
      this.data = this.filterFalseMembers(data);
    }
  }
}

export interface IUnreadItem {
  cid: string, // 채팅방
  data: IMessageData[] // 언리드 메시지 배열
}
