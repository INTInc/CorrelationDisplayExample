module.exports = function(dataStorage) {
    return async function(req, res, next) {
        if (!req.params.id || !(typeof req.params.id === 'string')) {
            res.status(400);
            return res.json('Param id is missing');
        }
        const wellId = req.params.wellId;
        const curveId = req.params.id;
        const minMax = await dataStorage.getCurveMinMax(wellId, curveId);
        res.status(200);
        res.json(minMax);
    };
};
