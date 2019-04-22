import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
// MultiWell Component and Correlation Component
import { MultiWellComponent } from './components/index';
import { CorrelationComponent } from './components/index';
// Spinner
import { SpinnerComponent } from './components/index';

// Application config
import { AppConfig } from './app.config';
import { APP_TOKENS, AppTokens } from './app.tokens';

import { RequestService } from './services/index';
import { CurveService } from './services/index';
import { WellService } from './services/index';
import { TopsService } from './services/index';
import { TemplateService } from './services/index';

export function AppConfigFactory() {
  return AppConfig.getInstance(AppTokens.configFile);
};

@NgModule({
  declarations: [
    AppComponent,
    MultiWellComponent,
    CorrelationComponent,
    SpinnerComponent
  ],
  imports: [
    BrowserModule,
    HttpModule
  ],
  providers: [
    { provide: APP_TOKENS, useValue: AppTokens },
    { provide: AppConfig, useFactory: AppConfigFactory, multi: false },
    RequestService,
    CurveService,
    WellService,
    TopsService,
    TemplateService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
