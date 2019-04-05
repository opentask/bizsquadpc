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
    // + pc version 
    user_icon?: string,
    isChecked?: boolean,
    onlineStatus?: string,
    user_onlineColor?: string,
    videoCall?: string
}


export interface INotification{
    mid: string,
    data: INotificationData,
    text?: string,
    notificationTitle?: string,
}

export interface INotificationData {
    type: string, //'invitation' | 'notify' | 'reply',
    from?: string, // uid
    to?: string,
    sender?: IUserData, //userData
    sid?: string,
    gid?: string,
    invitation?: {
        type: string, // 'group', 'squad'
        gid?: string,
        sid?: string,
        who: string,
        what: string,
        where: string,
        info?: any
    },
    notify?: {
        type?: string, // 'group', 'squad'
        who: string,
        what: string,
        where: string
        info?: any
    },
    reply?: {

    },
    created?: number,
    status?: number,
    statusInfo?: any
}


export interface IFolderItem {
    isFolded?: boolean;
    name: string;
    squads: ISquad[];
    index: number;
}