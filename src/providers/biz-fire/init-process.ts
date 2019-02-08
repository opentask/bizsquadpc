import { IUserData } from './../../_models/message';
import { AngularFirestore } from '@angular/fire/firestore';
/*
InitProcess
: Process initial things.
- Get /users/<uid> info.
- Save current users' info.
- Start/Stop monitor current users' BizGroup
*/
export class InitProcess {

    constructor(private afStore: AngularFirestore) { }

    start(user: any): Promise<any> {
        return new Promise<any>( (resolve, reject) => {
            // check 'users/<uid>'
            this.afStore.collection('users').doc(`${user.uid}`).get()
                .subscribe(snap => {
                    if(snap.exists){
                        // update this user's data
                        const data = this.makeUpdateData(user);
                        snap.ref.set(data, {merge: true}).then(()=>{
                            resolve();
                        }).catch(err=> {
                            console.error(err);
                            reject(err);
                        });
                    } else {
                        // insert new data.
                        const data = this.makeNewUserData(user);
                        this.afStore.collection('users').doc(`${user.uid}`).set(data)
                            .then(()=>{
                                resolve();
                            }).catch(err=> {
                            console.error(err);
                            reject(err);
                        });
                    }
                }, error1 => {
                    console.error(error1);
                    reject(error1);
                });
        });
    }

    makeNewUserData(user): IUserData {
        // ------------------------------------------------------------------
        // * Create new user data.
        // ------------------------------------------------------------------
        const {uid, displayName, email, photoURL, emailVerified, providerData} = user;
        const updateNow = {
           /* lastLogin: {
                localData: now.toLocaleString(),
                timestamp: now.getTime() / 1000 | 0
            },*/
            //
            uid: uid,
            displayName: displayName,
            email: email,
            photoURL: photoURL,
            emailVerified: emailVerified,
            providerId: providerData.map(data=>data.providerId),
        
            // set default data:
            status: 1,
            language: 'en',
        };
        return updateNow;
    }

    makeUpdateData(user): IUserData {
        // ------------------------------------------------------------------
        // * Create new user data.
        // ------------------------------------------------------------------
        const {uid, displayName, email, photoURL, emailVerified, providerData} = user; //* just to dev. Do not use these datas...

        const updateNow: IUserData = {
           /* lastLogin: {
                localData: now.toLocaleString(),
                timestamp: now.getTime() / 1000 | 0
            },*/
            uid: uid,
            displayName: displayName,
            email: email,
            photoURL: photoURL,
            emailVerified: emailVerified,
            providerId: providerData.map(data=>data.providerId),
        };

        return updateNow;
    }
}