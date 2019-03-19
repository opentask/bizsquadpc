import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BizFireService } from './biz-fire/biz-fire';
import { STRINGS } from '../biz-common/commons';
import { takeUntil, map } from 'rxjs/operators';

export interface ISquad {
    sid: string,
    data?: {
        members?: any,
        name?: string,
        created?: number,
        manager?: any,
        gid?: string,
        type?: string,
        status?: number,
        member_count?:any,
        lastMessage?:string,
        lastMessageTime?:number,
    },
    members?: any,
}

export interface IUserDataDoc {

    folders?: any[],
    privateFolders?: any[]
}


@Injectable({
    providedIn: 'root'
})

export class SquadService {

    /*
    * Current BizGroups' squad list:
    * public or mine.
    * */
    onSquadListChanged = new BehaviorSubject<ISquad[]>([]);


    constructor(public bizFire : BizFireService,) {

    }

    getMySquadLisObserver(gid: string) : Observable<ISquad[]> {
        const path = `${STRINGS.STRING_BIZGROUPS}/${gid}/squads`;
        return this.bizFire.afStore.collection(path, ref => {
            let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            query = query.orderBy('name');
            return query;
        })
            .snapshotChanges()
            .pipe(takeUntil(this.bizFire.onUserSignOut) ,
                map(docs => docs
                    .filter(d=>{
                        // get all
                        let ret = true;

                        // but exclude false or 0 if status field exist.
                        const status = d.payload.doc.get('status');
                        ret = status !== 0 && status !== false;
                        return ret;
                    })
                    .filter(d =>{

                        let ret =false;

                        // get all public squads
                        if(!ret){
                            const type = d.payload.doc.get('type');
                            if(type){
                                ret = type === 'public';
                            }
                        }
                        // and add my private squads.
                        if(!ret){
                            // this squad is a private s.
                            const members = d.payload.doc.get('members');
                            if(members){
                                ret = members[this.bizFire.currentUID] === true;
                            }
                        }
                        return ret;

                    }).map(d => ({sid: d.payload.doc.id, data: d.payload.doc.data()} as ISquad))
                )
            );
    }
    static makeSquadMenuWith(userData: any, squadList: ISquad[]){
        console.log('makeSquadMenuWith', userData, squadList);

        const folders = [];
        const privateFolders = [];
        const addedSqaud = {};

        if(userData != null){
            const publicFolders = userData.folders;
            // create custom folders
            if(publicFolders != null){
                // folder 정렬
                publicFolders.sort( (a, b) => a.index - b.index);

                for(let itr = 0; itr < publicFolders.length; itr ++){

                    const {index, name, squads} = publicFolders[itr];
                    const displayFolder = {index, name, squads:[]};

                    if(squads != null){
                        // does this squad exists?
                        squads.forEach(savedSquad => {

                            for(let idx = 0; idx < squadList.length; idx ++){
                                if(squadList[idx].sid === savedSquad.sid){
                                    // * this squad exists.
                                    // add to display
                                    displayFolder['squads'].push(squadList[idx]);
                                    // now delete from original list
                                    // squadList.splice(idx, 1);
                                    addedSqaud[squadList[idx].sid] = true;
                                    // now go to next saved squad.
                                    break;
                                }
                            }
                        });
                    }
                    // add folder
                    folders.push(displayFolder);
                }
            // loaded.
            }

            // b.18 private squad added.
            const agileFolders = userData['agileFolders'];
            if(agileFolders != null){

                for(let agileFolderIndex = 0; agileFolderIndex < agileFolders.length; agileFolderIndex ++){

                    const {index, name, squads} = agileFolders[agileFolderIndex];
                    const displayFolder = {index, name, squads:[]};

                    if(squads != null){

                        // does this squad exists?
                        squads.forEach(savedSquad => {

                            for(let idx = 0; idx < squadList.length; idx ++){

                                if(squadList[idx].sid === savedSquad.sid){
                                    // * this squad exists.
                                    // add to display
                                    displayFolder['squads'].push(squadList[idx]);

                                    // now delete from original list
                                    // squadList.splice(idx, 1);
                                    addedSqaud[squadList[idx].sid] = true;
                                    // now go to next saved squad.
                                    break;
                                }
                            }
                        });
                    }

                    // add folder
                    privateFolders.push(displayFolder);
                }
                // loaded.
            }

        }
        const privateSquads = squadList.filter(s => s.data.type !== 'public' && addedSqaud[s.sid] !== true);
        const publicSquads = squadList.filter(s => s.data.type === 'public' && addedSqaud[s.sid] !== true);

        // console.log(folders, privateSquads, publicSquads);
        return { folders,privateFolders, privateSquads, publicSquads};
    }

}