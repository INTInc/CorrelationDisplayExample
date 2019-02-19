module.exports = function(dataStorage) {
    return async function(req, res, next) {
        if (!req.body) {
            res.status(400);
            return res.json('Get curves list error');
        }
        const wellId = req.params.wellId;
        const testData = await dataStorage.getCurvesList(wellId);
        res.status(200);
        res.json({'data': testData});
    };
};
