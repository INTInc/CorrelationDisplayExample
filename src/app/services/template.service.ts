import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RequestService } from './request.service';
import { AppConfig } from '../app.config';

@Injectable()
export class TemplateService {
    constructor(private http: HttpClient, @Inject(AppConfig) private config: AppConfig, private requestService: RequestService) { }
    public async getTemplate(file: string) {
        const url = this.config.get('apiEndpoint') + '/api/v1/templates/' + file;
        const response = await this.http.get(url, this.getOptions()).toPromise();
        return response;
    }
    // private helper methods
    private getOptions(): any {
        return { headers: this.requestService.getJsonHeaders(), responseType: 'json' };
    }
}
