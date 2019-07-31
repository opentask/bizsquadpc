import {ICachePath} from './i-cache-path';
import {ICacheOption} from './cache-option';

export class Path implements ICachePath {
  
  extra: string;
  path: string;
  
  isSamePath(path: ICachePath): boolean {
    return path.extra === this.extra && path.path === this.path;
  }
  
  constructor(path: string, extra: string = null) {
    this.extra = extra;
    this.path = path;
  }
}
