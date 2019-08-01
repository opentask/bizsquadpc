import { FormControl } from '@angular/forms';
import { IUserData, IUser } from '../_models/message';

export const STRINGS = {
  STRING_BIZGROUPS: 'bizgroups',
  MY_SQUAD_STRING: 'mysquad',
  USERS: 'users',
  WORKS: 'works',
  COMPANY: 'company',

  FIELD:{
    MEMBER: 'members',
    MANAGER: 'manager',
    PARTNER: 'partners'
  },

  COLOR: {
    BIZ_COLOR: '#5b9ced'
  }
};


export class Commons {
    
    static noWhitespaceValidator(control: FormControl): any {
        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;
        return isValid ? null : { 'whitespace': true };
      }
      
      static squadPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads`
      }
      static squadDocPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}`;
      }
      
      static messagePath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/messages`;
      }
      static messageDocPath(gid: string, sid: string, mid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/messages/${mid}`;
      }
      
      static notificationPath(uid: string): string {
        return `users/${uid}/notifications`;
      }
      
      static commentPath(gid: string, sid: string, mid: string): string {
        const path = Commons.messagePath(gid, sid);
        return `${path}/${mid}/comments`;
      }
      
      static groupPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}`;
      }
      
      static bbsPath(gid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/bbs`;
      }
      
      static bbsDocPath(gid: string, bid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/bbs/${bid}`;
      }
      
      static schedulePath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/calendar`;
      }
      
      static initialChars(userData: IUserData, count = 2): string {
        
        let ret;
        ret = userData['displayName'] || userData.email;
        
        if(ret && ret.length === 0){
          ret = 'U';
        }
        
        if(ret && ret.length > count -1){
          ret = ret.substr(0, count);
        }
        
        if(ret === null){
          ret = 'U';
        }
        
        return ret;
      }
      
      static userDataPath(gid: string, uid: string): string {
        const path = `${STRINGS.STRING_BIZGROUPS}/${gid}/userData/${uid}`;
        return path;
      }
      
      static userPath(uid: string): string {
        return `${STRINGS.USERS}/${uid}`;
      }
      
      // /works : some invite actions
      static userInfoSorter(a: IUser, b: IUser): number {
        let index = 0;
        let a_displayName = a.data.displayName || a.data.email;
        let b_displayName = b.data.displayName || b.data.email;
        if(a_displayName != null && b_displayName != null){
          index = a_displayName > b_displayName ? 1 : -1 ;
        }
        return index;
      }
    
      // 채팅방 리스트 불러오기
      static  chatPath(gid: string, type = 'group'): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat`;
      }
      // 해당 채팅방 문서 정보.
      static chatDocPath(gid: string, cid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat/${cid}`;
      }
      // 멤버 채팅 메세지 작성 경로.
      static chatMsgPath(gid: string, cid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/chat/${cid}/chat`;
      }
      // 스쿼드 채팅방 정보 (스쿼드 정보)
      static  chatSquadPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}`;
      }
      // 스쿼드채팅 메세지 작성 경로.
      static chatSquadMsgPath(gid: string, sid: string): string {
        return `${STRINGS.STRING_BIZGROUPS}/${gid}/squads/${sid}/chat`;
      }
  
}
