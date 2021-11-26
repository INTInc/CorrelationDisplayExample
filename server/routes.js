import '@int/geotoolkit/environment.js';
import {getCurvesList} from './src/getcurveslist.js';
import {getCurvesData} from './src/getcurvesdata.js';
import {getCurvesMetaData} from './src/getcurvemetadata.js';
import {getCurveMinMax} from './src/getcurveminmax.js';
import {getTemplate} from './src/gettemplate.js';
import {getWellsList} from './src/getwellslist.js';
import {getTopsList} from './src/gettopslist.js';
import {getCurvesWellsData} from './src/getcurveswellsdata.js';
import {DataStorage} from './data/datastorage.js';

export const loadRoutes = function(app) {
    // Wells
    const dataStorage = new DataStorage();
    app.get('/api/v1/wells', getWellsList(dataStorage));
    // Curves
    app.post('/api/v1/curves/data', getCurvesWellsData(dataStorage));
    app.post('/api/v1/wells/:wellId/curves/data', getCurvesData(dataStorage));
    app.get('/api/v1/wells/:wellId/curves', getCurvesList(dataStorage));
    app.get('/api/v1/wells/:wellId/curves/:id', getCurvesMetaData(dataStorage));
    app.get('/api/v1/wells/:wellId/curves/:id/range', getCurveMinMax(dataStorage));
    // Templates
    app.get('/api/v1/templates/:id', getTemplate());
    // Tops
    app.get('/api/v1/tops', getTopsList(dataStorage));
};
