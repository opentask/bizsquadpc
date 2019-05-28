import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generated class for the TimestampToDatePipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'timestampToDate'
})
export class TimestampToDatePipe implements PipeTransform {
  
  transform(value: any, args?: any): any {

      if(typeof value === 'number'){
          // this is old date number
          return new Date(value * 1000);
      } else {
          return value.toDate();
      }
      
  }
  
}