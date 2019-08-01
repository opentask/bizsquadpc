import { Injectable } from '@angular/core';

@Injectable()
export class GroupColorProvider {

  constructor() {
  }

  makeGroupColor(string) {
    switch(string) {
      case '#f44336':
         return 'warn';
      case '#ff4081':
          return 'accent';
      case '#3f51b5':
          return 'primary';
      case undefined:
          return 'default';
      default:
          return string;
    }
  }

  makeSquadColor(data) {
      if(data.type === 'public'){
        switch(data.color) {
            case undefined:
                return 'dodgerblue';
            default:
                return data.color;
          }
      } else {
        switch(data.color) {
            case undefined:
                return 'green';
            default:
                return data.color;
          }
      }
  }

}
