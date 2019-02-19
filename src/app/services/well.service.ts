import { Inject, Injectable } from '@angular/core';
import { Http, RequestOptions, Response } from '@angular/http';
import { RequestService } from './request.service';
import { AppConfig } from '../app.config';
@Injectable()
export class WellService {
    constructor(private http: Http, @Inject(AppConfig) private config: AppConfig, private requestService: RequestService) { }
    public async getWellsList() {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/';
        return this.http.get(url, this.getOptions()).toPromise();
    }
    // private helper methods
    private getOptions() {
        return new RequestOptions({ headers: this.requestService.getJsonHeaders() });
    }
}
