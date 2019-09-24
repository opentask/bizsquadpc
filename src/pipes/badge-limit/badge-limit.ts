import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generated class for the BadgeLimitPipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'badgeLimit',
})
export class BadgeLimitPipe implements PipeTransform {
  /**
   * Takes a value and makes it lowercase.
   */
  transform(value: any, maxCount?: number): number {
    let count = 0;
    if(typeof value === 'string'){
      count = parseInt(value);
    } else if(typeof value === 'number'){
      count = value;
    }

    if(maxCount != null){
      count = count > maxCount ? maxCount : count;
    }
    return count;
  }
}
