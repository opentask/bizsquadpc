import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { BizFireService, IBizGroup } from '../../../../providers/biz-fire/biz-fire';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { GroupColorProvider } from '../../../../providers/group-color';
import { FormGroup, ValidatorFn, Validators, FormBuilder } from '@angular/forms';
import { TokenProvider } from '../../../../providers/token/token';

@IonicPage({  
  name: 'page-customlink',
  segment: 'customlink',
  priority: 'high'
})
@Component({
  selector: 'page-customlink',
  templateUrl: 'customlink.html',
})
export class CustomlinkPage {

  private _unsubscribeAll;
  currentGroup: IBizGroup;
  groupMainColor: string;

  addLinkForm: FormGroup;

  private linkTitleValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.maxLength(10)
  ]);

  // URL 유효성 검사 정규식
  reg = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';
  
  private linkUrlValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.pattern(this.reg)
  ]);

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,    
    public viewCtrl: ViewController,
    public bizFire: BizFireService,
    public formBuilder: FormBuilder,
    public groupColorProvider: GroupColorProvider,
    private tokenService: TokenProvider
    ) {
      this._unsubscribeAll = new Subject<any>();
  }

  ngOnInit(): void {

    this.addLinkForm = this.formBuilder.group({
      linkTitle: ['', this.linkTitleValidator],
      linkUrl: ['https://', this.linkUrlValidator],
    });

    this.bizFire.onBizGroupSelected
    .pipe(
        filter(g=>g!=null),
        takeUntil(this._unsubscribeAll))
    .subscribe((group) => {
        //console.log('onBizGroupSelected', group.gid);
        // set selected group to
        this.currentGroup = group;
        this.groupMainColor = this.groupColorProvider.makeGroupColor(this.currentGroup.data.team_color);
    });
  }

  submitAddLink() {
    if(this.addLinkForm.valid) {
      this.tokenService.addCustomLink(this.bizFire.currentUID,this.addLinkForm.value['linkTitle'],this.addLinkForm.value['linkUrl'])
      .then(() =>{
        this.closePopup();
      });
    }
  }

  closePopup(){
    this.viewCtrl.dismiss();
  }

}
