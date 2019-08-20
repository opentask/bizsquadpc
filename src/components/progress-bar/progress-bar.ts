import {Component, Input, OnInit} from '@angular/core';
import {Observable} from "rxjs";
import {TakeUntil} from "../../biz-common/take-until";

@Component({
  selector: 'progress-bar',
  templateUrl: 'progress-bar.html'
})
export class ProgressBarComponent extends TakeUntil implements OnInit{

  @Input('progress') progress: number;

  @Input()
  progress$: Observable<number>;

  constructor() {
    super();
  }

  ngOnInit(): void {
    if(this.progress$){
      this.progress$
        .pipe(this.takeUntil)
        .subscribe((percentage: number) => this.progress = percentage);
    }
  }

}
