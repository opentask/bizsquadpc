import {CacheOption, ICacheOptionBuilder} from './cache-option';

export class CacheOptionBuilder {
  // builder
  static Build(): ICacheOptionBuilder {
    return new CacheOption();
  }
}
