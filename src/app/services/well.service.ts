import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RequestService } from './request.service';
import { AppConfig } from '../app.config';
@Injectable()
export class WellService {
    constructor(private http: HttpClient, @Inject(AppConfig) private config: AppConfig, private requestService: RequestService) { }
    public async getWellsList() {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/';
        return this.http.get(url, this.getOptions()).toPromise();
    }
    // private helper methods
    private getOptions(): any {
        return {
            headers: this.requestService.getJsonHeaders(),
            responseType: 'json'
        };
    }
}
