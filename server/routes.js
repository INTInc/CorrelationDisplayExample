const express = require('express');
const router = express.Router(); /* eslint-disable-line */
const getCurvesData = require('./src/getcurvesdata');
const getCurvesList = require('./src/getcurveslist');
const getCurvesMetaData = require('./src/getcurvemetadata');
const getCurveMinMax = require('./src/getcurveminmax');
const DataStorage = require('./data/datastorage')();
const getTemplate = require('./src/gettemplate');
const getWellsList = require('./src/getwellslist');
const getTopsList = require('./src/gettopslist');
const getCurvesWellsData = require('./src/getcurveswellsdata');
module.exports = function(app) {
    // Wells
    const dataStorage = DataStorage.create();
    router.get('/v1/wells', getWellsList(dataStorage));
    // Curves
    router.post('/v1/curves/data', getCurvesWellsData(dataStorage));
    router.post('/v1/wells/:wellId/curves/data', getCurvesData(dataStorage));
    router.get('/v1/wells/:wellId/curves', getCurvesList(dataStorage));
    router.get('/v1/wells/:wellId/curves/:id', getCurvesMetaData(dataStorage));
    router.get('/v1/wells/:wellId/curves/:id/range', getCurveMinMax(dataStorage));
    // Templates
    router.get('/v1/templates/:id', getTemplate());
    // Tops
    router.get('/v1/tops', getTopsList(dataStorage));
    return router;
};
