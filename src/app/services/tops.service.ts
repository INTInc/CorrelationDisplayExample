import { Inject, Injectable } from '@angular/core';
import { Http, RequestOptions, Response } from '@angular/http';
import { RequestService } from './request.service';
import { AppConfig } from '../app.config';
@Injectable()
export class TopsService {
    constructor(private http: Http, @Inject(AppConfig) private config: AppConfig, private requestService: RequestService) { }
    public async getTopsList() {
        const url = this.config.get('apiEndpoint') + '/api/v1/tops/';
        return this.http.get(url, this.getOptions()).toPromise();
    }
    // private helper methods
    private getOptions() {
        return new RequestOptions({ headers: this.requestService.getJsonHeaders() });
    }
}
