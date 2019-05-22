import { Injectable } from '@angular/core';

@Injectable()
export class GroupColorProvider {

  constructor() {
  }

  makeGroupColor(string) {
    switch(string) {
      case '#5b9ced':
          return 'skyblue';
      case '#f44336':
          return 'orange';
      case '#ff4081':
          return 'pink';
      case '#3f51b5':
          return 'navy';
      case null:
          return 'skyblue';
      default:
          return string;
    }
  }

}
