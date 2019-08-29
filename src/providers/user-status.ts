import { Injectable } from '@angular/core';
import {BizFireService} from "./biz-fire/biz-fire";
import firebase from 'firebase';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})

export class UserStatusProvider {

  constructor(private http: HttpClient,
              private bizFire : BizFireService) { }

  onUserStatusChange() {
    console.log("onUserStatusChange !!!");
    const userStatusDatabaseRef = firebase.database().ref(`/status/${this.bizFire.uid}`);
    const userStatusFirestoreRef = this.bizFire.afStore.doc(`users/${this.bizFire.uid}`);

    const isOnlineForFirestore = { onlineStatus : 'online' };
    const isOfflineForFirestore = { onlineStatus : 'offline' };

    firebase.database().ref('.info/connected').on('value', (snapshot) => {
      if(snapshot.val() == false) {
        console.log("로그인했을때 실행 1",snapshot.val());
        userStatusFirestoreRef.set(isOfflineForFirestore,{merge : true});
        return;
      }

      userStatusDatabaseRef.onDisconnect().set(isOfflineForFirestore)
        .then(() => {
          console.log("로그인했을때 실행 2",snapshot.val());
        userStatusDatabaseRef.set(isOnlineForFirestore);
        userStatusFirestoreRef.set(isOnlineForFirestore,{merge : true});
      })
    });
  }

  windowCloseAndUserStatus() {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).update({
      onlineStatus : 'offline'
    })
  }

  statusChanged(value) {
    return this.bizFire.afStore.doc(`users/${this.bizFire.uid}`).update({
      onlineStatus : value
    })
  }

}
