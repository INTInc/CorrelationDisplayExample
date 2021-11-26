export const getCurvesData = function(dataStorage) {
    return async function(req, res, next) {
        if (!req.body) {
            res.status(400);
            return res.json('Get data error');
        }
        const wellId = req.params.wellId;
        const curves = req.body.curves;
        const range = req.body.range;
        const scale = req.body.scale;
        const useDecimation = req.body.usedecimation;
        const testData = await dataStorage.getLogData(wellId, curves, range, scale, useDecimation);
        res.status(200);
        res.json(testData);
    };
};
