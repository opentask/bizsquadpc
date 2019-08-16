import {OnDestroy} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {filter, takeUntil} from 'rxjs/operators';

export class TakeUntil implements OnDestroy {
    
    private _unsubscribeAll;
    
    constructor() {
        //this._unsubscribeAll = new Subject<any>();
    }
    
    protected get takeUntil(): any {
        if(this._unsubscribeAll == null){
            this._unsubscribeAll = new Subject<any>();
        }
        return takeUntil(this._unsubscribeAll);
    }
    
    protected get unsubscribeAll(): Subject<any>{
        if(this._unsubscribeAll == null){
            this._unsubscribeAll = new Subject<any>();
        }
        return this._unsubscribeAll;
    }
    
    ngOnDestroy(): void {
        this.unsubscribe();
    }

    protected unsubscribe(): void {
        if(this._unsubscribeAll != null) {
            this._unsubscribeAll.next();
            this._unsubscribeAll.complete();
            this._unsubscribeAll = null;
        }
    }
    
}
