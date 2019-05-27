import { Pipe, PipeTransform } from '@angular/core';

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
