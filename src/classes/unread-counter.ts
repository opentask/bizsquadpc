import {BehaviorSubject} from 'rxjs';
import * as firebase from 'firebase/app';


interface MapItem {
  unsubscribe: any,
  unreadList: any[]
}

export class UnreadCounter {

  constructor( public gid: string, public uid: string) {

  }

  unreadList$ = new BehaviorSubject<any[]>(null);

  private map: {[chatId: string]: MapItem} = {};

  isRegistered(cid: string): boolean {
    return this.map[cid] != null;
  }

  register(chatId: string, chatDocRef: any){

    if(this.map[chatId] != null){
      throw new Error('이미 등록한 채팅방의 언리드 모니터를 또하려고 시도...');
    }

    //mid: 채팅방 ID
    this.map[chatId] = {
      unsubscribe: null,
      unreadList: null
    } as MapItem;

    this.map[chatId].unsubscribe= chatDocRef.collection('chat')
      .where(new firebase.firestore.FieldPath('read', this.uid, 'unread'), '==', true)
      .onSnapshot(snaps => {

        if(snaps.docs.length > 0){
          // console.log(snaps.docs.length, 'unread found from chatDoc:',chatDocRef.path);
        }

        // console.log(snaps.docs.length, 'unread', chatDocRef.id);
        this.map[chatId].unreadList = snaps.docs.map(snap => ({mid: snap.id, data: snap.data()}));

        this.recalculateUnreadCount();
      });
  }

  unRegister(chatId){
  // remove from array
    if(this.map[chatId]){
      if(this.map[chatId].unsubscribe != null){
        this.map[chatId].unsubscribe();
        this.map[chatId] = null;
        delete this.map[chatId];
        this.recalculateUnreadCount();
      }
    }
  }

  private recalculateUnreadCount(){
    // 모든 채팅방들 언리드 카운트를 집계해 브로드캐스트
    const map = [];
    Object.keys(this.map)
      .forEach(cid =>{
        if(this.map[cid].unreadList != null){
          this.map[cid].unreadList.forEach(content => {
            const data = {cid: cid, data: content};
            map.push(data);
          });
        }
      });

    this.unreadList$.next(map);
  }

  clear(){
    if(this.map){
      Object.keys(this.map).forEach(cid=> {
        if(this.map[cid].unsubscribe != null){
          this.map[cid].unsubscribe();
        }
      });
      this.map = {};
    }
    this.unreadList$.complete();
  }
}
