import {GroupBase} from '../_models';
import {IChat, IChatData} from "../_models/message";

export class Chat extends GroupBase implements IChat {

  cid: string;
  data: IChatData;

  constructor(cid: string, data: IChatData, myUid: string, ref?: any) {
    super(data);
    this.cid = cid;
    this.uid = myUid;
    this.ref = ref;
  }

  isPublic(): boolean {
    return this.data && this.data.type === 'public';
  }

  static buildDocSnapshotChange(change: any, uid: string): IChat{
    return new Chat(change.payload.id, change.payload.data(), uid, change.payload.ref);
  }

  static mapBuildSnapshotChange(uid: string) {
    return (change: any) => {
      return new Chat(change.payload.id, change.payload.data(), uid, change.payload.ref);
    }
  }
}
