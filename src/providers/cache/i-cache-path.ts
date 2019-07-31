
export interface ICachePath {

  path: string,
  extra: string,

  isSamePath(path: ICachePath): boolean;
  
}
