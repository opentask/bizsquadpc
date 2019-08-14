import { Pipe, PipeTransform } from '@angular/core';
import firebase from 'firebase';

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
  
        //console.log(value, typeof value);
        if(value){
          if(typeof value === 'number'){
            // this is old date number
            return new Date(value * 1000);
          } else if(value.seconds != null &&  value.nanoseconds != null){
            const timestamp = new firebase.firestore.Timestamp(value.seconds, value.nanoseconds);
            return timestamp.toDate();
          } else {
            return '';
          }
        } else {
         return '';
        }
      }
  
}