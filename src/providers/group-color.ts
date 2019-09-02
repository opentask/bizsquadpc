import { Injectable } from '@angular/core';

@Injectable()
export class GroupColorProvider {

  constructor() {
  // default: #5b9ced,
  //     grey: grey,
  //     warn: #f44336,
  //     accent: #ff4081,
  //     primary: #3f51b5,
  //     facebook: #3b5998,
  //     green: green,
  //     lightskyblue: lightskyblue,
  //     dark: #111111,
  //     forestgreen: forestgreen,
  //     blue: blueviolet,
  }

  makeGroupColor(string) {
    switch(string) {
      case 'grey':
       return 'grey';
      case '#f44336':
       return 'warn';
      case '#ff4081':
       return 'accent';
      case '#3f51b5':
       return 'primary';
      case '#3b5998':
       return 'facebook';
      case 'green':
        return 'green';
      case 'lightskyblue':
       return 'lightskyblue';
      case '#111111':
        return 'dark';
      case 'forestgreen':
        return 'forestgreen';
      case 'blueviolet':
        return 'blue';
      case undefined:
       return 'default';
      default:
       return 'default';
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
