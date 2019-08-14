import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
/**
 * Generated class for the SanitizingHtmlPipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'sanitizingHtml',
})
export class SanitizingHtmlPipe implements PipeTransform {
  /**
   * Takes a value and makes it lowercase.
   */
  constructor(private _sanitizer:DomSanitizer) { }

  transform(v:string):SafeHtml {
    return this._sanitizer.bypassSecurityTrustHtml(v);
  }
}
