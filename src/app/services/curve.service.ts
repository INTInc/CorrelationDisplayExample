import { Inject, Injectable } from '@angular/core';
import { Http, RequestOptions, Response } from '@angular/http';
import { RequestService } from './request.service';
import { AppConfig } from '../app.config';
@Injectable()
export class CurveService {
    constructor(private http: Http, @Inject(AppConfig) private config: AppConfig, private requestService: RequestService) { }
    public async getCurveMetaData(wellId : string, curveId: string) {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/' + wellId + '/curves/' + curveId;
        const response = await this.http.get(url, this.getOptions()).toPromise();
        return response.json();
    }
    public async getCurveRange(wellId: string, curveId: string) {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/' + wellId + '/curves/' + curveId + '/range';
        const response = await this.http.get(url, this.getOptions()).toPromise();
        return response.json();
    }
    public async getCurvesList(wellId: string) {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/' + wellId + '/curves/';
        const response = await this.http.get(url, this.getOptions()).toPromise();
        return response.json();
    }
    public async getCurvesData(wellId: string, curves, range, scale?, useDecimation?) {
        const url = this.config.get('apiEndpoint') + '/api/v1/wells/' + wellId + '/curves/data';
        const response = await this.http.post(url, JSON.stringify({
            'curves': curves,
            'range': {
                'min': range.getLow(),
                'max': range.getHigh()
            },
            'scale': scale,
            'usedecimation': useDecimation
        }), this.getOptions()).toPromise();
        return response.json();
    }
    // private helper methods
    private getOptions() {
        return new RequestOptions({ headers: this.requestService.getJsonHeaders() });
    }
}
