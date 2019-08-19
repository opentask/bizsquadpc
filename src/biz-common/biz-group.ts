import {GroupBase, IBizGroup, IBizGroupData} from "../_models";


export class BizGroup extends GroupBase implements IBizGroup {

  gid: string;
  data: IBizGroupData;
  ref: any;

  constructor(gid: string, data: IBizGroupData, uid: string, ref?: any) {
    super();
    this.gid = gid;
    this.data = this.filterFalseMembers(data);
    this.uid = uid;
    this.ref = ref;
  }
}


export class BizGroupBuilder {
  public static buildWithOnStateChangeAngularFire(): void {

  }

  public static buildWithData(gid: string, data: any, uid?: string): IBizGroup {
    return new BizGroup(gid, data, uid);
  }
}
