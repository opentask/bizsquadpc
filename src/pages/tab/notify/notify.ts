import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { NotificationService } from '../../../providers/notification.service';
import { Subject, zip } from 'rxjs';
import { INoticeItem, INotification, INotificationData } from '../../../_models/message';
import { BizFireService } from '../../../providers/biz-fire/biz-fire';
import { Electron } from './../../../providers/electron/electron';
import { DataCache } from '../../../classes/cache-data';
import { filter, takeUntil } from 'rxjs/operators';
import { FireDataKey } from '../../../classes/fire-data-key';
import { Commons } from '../../../biz-common/commons';


@IonicPage({  
  name: 'page-notify',
  segment: 'notify',
  priority: 'high'
})
@Component({
  selector: 'page-notify',
  templateUrl: 'notify.html',
})
export class NotifyPage {

  private _unsubscribeAll;


  private dataCache = new DataCache();

  messages: INoticeItem[];

  ipc: any;

  jumpPath = '';

  noNotify: boolean = true;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public electron : Electron,
    private noticeService: NotificationService,
    private bizFire: BizFireService,
    ) {

      this.ipc = electron.ipc;
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {

    this.noticeService.onNotifications
    .pipe(filter(n => n!=null),takeUntil(this._unsubscribeAll))
    .subscribe((msgs: INotification[]) => {
      let groupMsg;
      groupMsg = msgs.filter(m => {
        let ret;
        if(m.data.type === 'invitation') {
          if(m.data.invitation.type === 'group'){
              return true;
            } else {
              ret = m.data.invitation.gid == this.bizFire.onBizGroupSelected.getValue().gid; 
            }
          }
          if(m.data.type === 'notify') {
            ret = m.data.notify.gid == this.bizFire.onBizGroupSelected.getValue().gid;
          }
          return ret;
        })
        this.messages = groupMsg.map((m: INotification) => this.makeMessage(m));
        console.log("가공된 메세지(전체)", this.messages)
        
    });
  }

  private getObserver(userPath: string) {
    try {
        const userKey = new FireDataKey(userPath);
        if (!this.dataCache.has(userKey)) {
            this.dataCache.register(userKey, this.bizFire.afStore.doc(userPath).valueChanges());
        }
        const userObserver = this.dataCache.get(userKey);
        return userObserver;
    } catch (e) {
        console.error(e);
        throw e;
    }
  }

  /*
  * Create INoticeItem : for html display.
  * */
  private makeMessage(m: INotification): INoticeItem {
        
    const data: INotificationData = m.data;
    
    const message: INoticeItem = {mid: m.mid, notification: data, data: {header: null, content: null, link: null}};
    
    // get user info
    const userObserver = this.getObserver(Commons.userPath(data.from));
    
    // NOTIFY
    if(data.type === 'notify'){
        
        const notify = data.notify;
        // get group info
        const groupObserver = this.getObserver(Commons.groupPath(notify.gid));
        
        if(notify.type === 'post') {
            
            // is squad post ?
            if(data.post === true){
                // get squad info
                const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                
                zip(userObserver, groupObserver, squadObserver)
                    .subscribe(([u, g, s])=>{
                        
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        // set content
                        message.data.header = [`${u['displayName'] || u['email']}`, `posted ${notify.info.title}`];
                        message.data.content = [`${notify.info.title}`];
                        message.data.link = [`${g['team_name']} > ${s['name']}`, `/main/${notify.gid}/${notify.sid}`];
                    });
            }
            // is a bbs post ?
            else if(data.bbs === true){
                zip(userObserver, groupObserver)
                    .subscribe(([u, g])=>{
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        // set content
                        message.data.header = [`${u['displayName'] || u['email']}`, `registered a new notice ${notify.info.title}`];
                        message.data.content = [`New Notice:` , `${notify.info.title}`];
                        // second array is a routerLink !
                        message.data.link = [`${g['team_name']}`, `/main/${notify.gid}/bbs`];
                    });
            }
            // is this a schedule post ?
            else if(data.schedule === true){
                // get squad info
                const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                zip(userObserver, groupObserver, squadObserver)
                    .subscribe(([u, g, s])=>{
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
        
                        // set content
                        message.data.header = [`${u['displayName'] || u['email']}`,
                            `registered a new schedule ${notify.info.title}`];
                        message.data.content = [
                            `In Squad ${s['name']}, ` ,
                            `a new schedule [${notify.info.title}] registered.`,
                            ];
                        
                        message.data.link = [`${g['team_name']} > ${s['name']}`,
                            `/main/${notify.gid}/${notify.sid}`]; // second array is a routerLink !
                    });
            }
        }
        
        if(notify.type === 'comment') {
            // get squad info
            const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
            
            zip(userObserver, groupObserver, squadObserver)
                .subscribe(([u, g, s])=>{
                    // needed to show avatar
                    message.data.user = {uid: data.from, data: u};
                    
                    message.data.header = [`${u['displayName'] || u['email']}`, `commented at ${notify.info.title}`];
                    message.data.content = [`${notify.info.title}`,
                        `<blockquote class="blockquote"><footer class="blockquote-footer font-12">${notify.info.comment}</blockquote>`];
                    message.data.link = [`${g['team_name']} > ${s['name']}`, `/main/${notify.gid}/${notify.sid}`];
                });
            
        }
        
        if(notify.type === 'join'){
            
            // squad or group ?
            if(notify.info && notify.info.join ==='squad'){
                // this is a squad join
                // get squad info
                const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
                
                zip(userObserver, groupObserver, squadObserver)
                    .subscribe(([u, g, s])=>{
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        // user joined a squad
                        message.data.header = [`${u['displayName'] || u['email']}`, `joined ${s['name']}`];
                        message.data.content = [`${u['displayName'] || u['email']} joined <span class="font-weight-bold">${s['name']}</span>`];
                        message.data.link = [`${g['team_name']} > ${s['name']}`];
                        
                    });
                
            } else {
                // this is a group
                zip(userObserver, groupObserver)
                    .subscribe(([u, g])=>{
                        // needed to show avatar
                        message.data.user = {uid: data.from, data: u};
                        
                        // user joined a group.
                        message.data.header = [`${u['displayName'] || u['email']}`, `joined ${g['team_name']}`];
                        message.data.content = [`${u['displayName'] || u['email']} joined BizGroup <span class="font-weight-bold">${g['team_name']}</span>`];
                        message.data.link = [`${g['team_name']}`, `/main/${notify.gid}`];
                        
                    });
                
            }
        }
    }
    
    // INVITATION
    if(data.type === 'invitation'){
        // who
        const invitation = data.invitation;
        // get group info
        const groupObserver = this.getObserver(Commons.groupPath(invitation.gid));
        // to where?
        if(invitation.type === 'group'){
            // 누가 어느 그룹에
            zip(userObserver, groupObserver)
                .subscribe(([u, g])=>{
                    // need to show avatar
                    message.data.user = {uid: data.from, data: u};
                    
                    message.data.header = [
                        `${u['displayName'] || u['email']}`,
                        `invited you to BizGroup ${g['team_name']}`
                    ];
                    
                    message.data.content = [
                        `Invitation to <span class="text-primary">${g['team_name']}</span>`,
                        "Please click Accept to accept this invitation."
                    ];
                    
                });
            
        } else if(invitation.type === 'squad'){
            // get squad info
            const squadObserver = this.getObserver(Commons.squadDocPath(data.notify.gid, data.notify.sid));
            
            zip(userObserver, groupObserver, squadObserver)
                .subscribe(([u, g, s])=>{
                    // need to show avatar
                    message.data.user = {uid: data.from, data: u};
                    
                    message.data.header = [
                        `${u['displayName'] || u['email']}`,
                        `invited you to Squad ${s['name']}`
                    ];
                    
                    message.data.content = [
                        `Invitation to Squad <span class="text-muted">${s['name']}</span> of BizGroup ${g['team_name']}`,
                        "Please click Accept to accept this invitation."
                    ];
                });
        }
        
    }
    
    return message;
  }

  // Click alarm text. 아직 안씀 보류
  onClickNotifyContents(msg: INoticeItem) {
    if(msg.data && msg.data.link != null && msg.data.link.length > 1){
        
        // found rounterLink
        const link = msg.data.link[1];
        console.log(link);

        // this.ipc.send('loadGH',link);
    }
  }
  

  clickNotify(msg){
    console.log(msg)
  }

  gogo(msg){
    console.log(msg);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
    
    this.dataCache.clear();
  }
}
