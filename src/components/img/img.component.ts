import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { of, race, Subject, timer } from 'rxjs';
import {delay} from 'rxjs/operators';
import {TakeUntil} from "../../biz-common/take-until";
import {IFiles} from "../../_models/message";
import {Commons} from "../../biz-common/commons";
import {BizFireService} from "../../providers";

@Component({
  selector: 'biz-img',
  templateUrl: 'img.component.html'
})
export class ImgComponent extends TakeUntil implements OnInit {


  @Output()
  imgDidLoad = new EventEmitter<any>();

  @Input()
  set file(f: IFiles){
    this._file = f;
    if(f){

      this.showSpinner = true;

      if(Commons.isImageFile(f)){
        this.downloadImage = f.thumbUrl || f.url;
      }

    } else {
      // clear image
      this.downloadImage = null;

    }
  }

  get file():IFiles{
    return this._file;
  }

  private _file: IFiles;

  // async downloaded image thumbnail url
  private _downloadImage: string;

  // set download image with timer trigger
  set downloadImage(img: string){

    this._downloadImage = img;

    if(img){

      // race load or time expire
      const timer$ = of('timeOut').pipe(delay(5000));
      race(this.imgLoad$, timer$)
        .pipe(this.takeUntil)
        .subscribe(value => {

          if(value === 'timeOut'){
            console.error('image may not exist.', this.file.storagePath);
            // show image not found image file.
            this._downloadImage = 'assets/images/image_not_found.png';

          } else {
            // image loaded and onLoad() called.
            // console.error('image load finised');
          }

          // replace spinner with real image.
          this.showSpinner = false;
        });

    } else {
      this.showSpinner = false;
    }
  }

  get downloadImage(): string {
    return this._downloadImage;
  }

  showSpinner = true;

  @Input()
  maxRetrySec = 3;

  // race load event and timer(5000)
  imgLoad$ = new Subject<any>();
  //timer$;

  constructor(private bizFire: BizFireService) {
    super();
  }

  ngOnInit() {

  }

  private getDownloadUrl(file:IFiles, count: number){
    return new Promise<any>( resolve => {
      let currentCount = count;
      const thumbPath = file.storagePath.replace(file.name, `thumb_512_${file.name}`);
      const sub = timer(0, 1000)
        .pipe(this.takeUntil)
        .subscribe(()=>{

        this.bizFire.afStorage.ref(thumbPath).getDownloadURL().subscribe(data =>{
          if(data){
            sub.unsubscribe();
            resolve(data);
          }
          else  {
            sub.unsubscribe();
            resolve(null);
          }
        }, error1 => {
          console.error('retry failed, ', currentCount, error1 && error1.code);
          if(currentCount <= 0){
            console.error('reached max image download count.');
            sub.unsubscribe();
            resolve(null);
          }

          currentCount --;

        });
      });
    });
  }

  onLoad(e){
    //console.log(e, e.target.value);
    this.imgLoad$.next('loaded');

    const data = {
      file: this.file,
      width: null,
      height: null
    };

    if(e && e.target){
      const width = e.target.naturalWidth;
      const height = e.target.naturalHeight;
      data.width = width;
      data.height = height;
    }

    this.imgDidLoad.emit(data);
  }

}
