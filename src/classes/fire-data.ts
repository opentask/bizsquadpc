// auto update class
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {CollectionReference, DocumentChangeAction, Query, QueryDocumentSnapshot} from '@angular/fire/firestore';
import {filter} from 'rxjs/operators';
import {IFireData, IFireDataKey, IFireDataOption, IFireMessage} from './fire-model';



export class FireData implements IFireData {

    private cache : Array<{key: IFireDataKey, sub: Subscription, messages: any[]}> = [];

    private _onMessageChanged = new BehaviorSubject<IFireMessage>(null);
    get onMessageChanged(){ return this._onMessageChanged.asObservable().pipe(filter(s=>s!=null))};

}