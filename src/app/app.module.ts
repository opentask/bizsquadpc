import { BizFireService } from './../providers/biz-fire/biz-fire';
import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';
//electron
import { Electron } from '../providers/electron/electron';

import { LoadingProvider } from '../providers';
import { AlertProvider } from '../providers/alert/alert';

//firebase
import { AngularFireModule } from '@angular/fire';
import { environment } from './../environments/environments';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { TokenProvider } from '../providers/token/token';
import { GroupColorProvider } from '../providers/group-color';
import { HttpClientModule } from '@angular/common/http';
import { CacheService } from '../providers/cache/cache';
import { ToastProvider } from '../providers/toast/toast';
import { UserStatusProvider } from '../providers/user-status';

@NgModule({
  declarations: [
    MyApp,
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireAuthModule,
    HttpClientModule,
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
  ],
  providers: [
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    Electron,
    LoadingProvider,
    BizFireService,
    AlertProvider,
    TokenProvider,
    GroupColorProvider,
    CacheService,
    ToastProvider,
    UserStatusProvider
  ]
})
export class AppModule {}
