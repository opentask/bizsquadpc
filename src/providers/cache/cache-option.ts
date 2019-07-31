export declare type CacheOptionDataBuilder = (data: any)=> any;
export declare type CacheOptionListBuilder = (id: string, data?: any)=> any;
export declare type CacheOptionBuilderFn = (ref: ICacheOptionBuilder) => ICacheOptionBuilder;

export interface ICacheOption {
  refresh?: boolean,
  expireMin?: number,
  map?: CacheOptionDataBuilder | CacheOptionListBuilder,
  whenNotFound?: any,
  // @angular/fire options
  wheres?: {key: string, match?: string, value?: any}[],
  orderBy?: {key: string, value?: string}[],
  members?: {uid: string, type?: string, value?: any}[],
  limit?: number
}

export interface ICacheOptionBuilder {
  type: 'builder';
  refresh?:(refresh: boolean)=> ICacheOptionBuilder;
  expireMin?:(min: number)=> ICacheOptionBuilder;
  map?:(dataBuilder: CacheOptionDataBuilder| CacheOptionListBuilder)=> ICacheOptionBuilder;
  whenNotFound?:(notFoundData: any) => ICacheOptionBuilder;
  
  where?:(key: string, value?:any, match?: string)=> ICacheOptionBuilder;
  orderBy?: (key: string, value?: string) => ICacheOptionBuilder;
  member?: (uid: string, type?: string, value?: any) => ICacheOptionBuilder;
  limit?: (limit: number) => ICacheOptionBuilder;
  finalize(): ICacheOption;
}


export interface ICachePath {
  path: string,
  extra?: any
}


export class CacheOption implements ICacheOptionBuilder {
  private readonly data: ICacheOption;
  type: 'builder';
  
  constructor() {
    this.data = {};
    this.type = 'builder';
  }
  
  refresh(refresh: boolean): ICacheOptionBuilder{
    this.data.refresh = refresh;
    return this;
  }
  
  expireMin(min: number): ICacheOptionBuilder{
    this.data.expireMin = min;
    return this;
  }
  
  map(dataBuilder: CacheOptionDataBuilder | CacheOptionListBuilder): ICacheOptionBuilder{
    this.data.map = dataBuilder;
    return this;
  }
  
  
  
  whenNotFound(notFoundData: any):ICacheOptionBuilder {
    this.data.whenNotFound = notFoundData;
    return this;
  }
  
  where(key: string, value?: any, match?: string ): ICacheOptionBuilder{
    if(this.data.wheres == null){
      this.data.wheres = [];
    }
    this.data.wheres.push({key: key, value: value, match: match});
    return this;
  }
  
  orderBy(key: string, value = 'asc'): ICacheOptionBuilder {
    if(this.data.orderBy == null){
      this.data.orderBy = [];
    }
    this.data.orderBy.push({key: key, value: value});
    return this;
  }
  
  member(uid: string, type = 'members', value = true): ICacheOptionBuilder{
    if(this.data.members == null){
      this.data.members = [];
    }
    this.data.members.push({uid: uid, type: type, value: value});
    return this;
  }
  
  limit(limit: number): ICacheOptionBuilder {
    this.data.limit = limit;
    return this;
  }
  
  finalize(): ICacheOption {
    return this.data;
  }
}
