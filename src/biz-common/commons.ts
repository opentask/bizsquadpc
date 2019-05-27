import { FormControl } from '@angular/forms';
import { IUserData } from '../_models/message';

export const STRINGS = {
    STRING_BIZGROUPS: 'bizgroups',
    MY_SQUAD_STRING: 'mysquad',
    USERS: 'users',
    WORKS: 'works'
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
        //let path = `${STRINGS.STRING_BIZGROUPS}/${group.gid}/squads/${squad.sid}/messages
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
    
}
