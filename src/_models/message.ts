import { ISquad } from "../providers/squad.service";
import { IBizGroup } from "../providers/biz-fire/biz-fire";

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
