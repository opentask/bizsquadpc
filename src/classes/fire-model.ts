export declare type CreateFnc = (doc: any) => any;
export declare type FilterFnc = (data: any) => boolean;
export declare type SorterFnc = (a: any, b: any) => number;

export interface IDataCache<T> {

}

export interface IFireData{

}

export interface IFireDataOption {
  createFnc?:CreateFnc,
  filterFnc?: FilterFnc,
  sorter?: SorterFnc
}

export interface IFireDataKey {
  key: string,
  type?: any,
  isEqualKey(b: IFireDataKey): boolean;
}

export interface IFireMessage {
  key: IFireDataKey,
  data: any[]
}
