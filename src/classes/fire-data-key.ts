import {IFireDataKey} from './fire-model';

export class FireDataKey implements IFireDataKey{
  
  protected readonly _key: string;
  protected readonly _type: any;
  
  get key(){
    return this._key;
  }
  get type(){
    return this._type;
  }
  
  constructor(key: string, type?: any) {
    this._key = key;
    this._type = type;
  }
  
  static isEqualKey(a: IFireDataKey, b: IFireDataKey): boolean {
    
    let ret = a.key === b.key;
    if(ret){
      ret = a.type != null && b.type != null || a.type == null && b.type == null;
    }
    if(a.type != null){
      if(ret){
        ret = typeof a.type === typeof b.type;
      }
      if(ret){
        if(typeof a.type === 'string'){
          ret = a.type === b.type;
        }
      }
      if(ret){
        if(typeof a.type === 'object'){
          ret = Object.keys(a.type).length === Object.keys(b.type).length;
          // type length is same
          if(ret){
            const aArray = Object.keys(a.type);
            for(let i = 0; i < aArray.length; i++){
              if(a.type[aArray[i]] !== b.type[aArray[i]]){
                ret = false;
                break;
              }
            }
          }
        }
      }
    }
    return ret;
  }
  
  isEqualKey(b: IFireDataKey): boolean {
    return FireDataKey.isEqualKey(this, b);
  }
}
