import { Injectable } from '@angular/core';

@Injectable()
export class GroupColorProvider {

  constructor() {
  }

  makeGroupColor(string) {
    switch(string) {
      case undefined:
          return 'skyblue';
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
