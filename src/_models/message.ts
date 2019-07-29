import { ISquad } from "../providers/squad.service";

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
  lastWebGid?: string
}

export interface IAlarmConfig {
    all?: boolean,
    groupInvite: boolean,
    squadInOut: boolean,
    squadInvite: boolean,
    schedule: boolean,
    post: boolean,
    comment: boolean,
    bbs: boolean,
    version?: string,
    toFirestoreData?:()=>any;
}

export interface INotification{
    mid: string,
    data: INotificationData,
}

export type NotificationType = 'invitation' | 'notify' | 'reply';
export type NotifyType = 'post'|'comment'| 'join'| 'exit'| 'delete';
export type InvitationType = 'group'|'squad';
export interface INotificationData extends IAlarmConfig {
    type: NotificationType,//'invitation' | 'notify' | 'reply',
    from?: string, // uid
    to?: string,
    invitation?: {
      type: InvitationType, // 'group', 'squad',
      
      gid: string,
      sid?: string,
      
      info?: {
        auth?: string // 'member', 'manager', 'partner'
      }
    },
    
    notify?: {
      type: NotifyType,
      
      info?: {
        title?: string,
        comment?: string,
        cid?: string,
          eid?: string,
        join?: any
      },
      sid?: string,
      gid: string,
      mid?: string,
      
    },
    
    created?: any,
    statusInfo?: {done: boolean}

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
