export const getCurvesWellsData = function(dataStorage) {
    return async function(req, res, next) {
        if (!req.body) {
            res.status(400);
            return res.json('Get data error');
        }
        const wells = req.body.wells;
        const useDecimation = req.body.usedecimation;
        const testData = await dataStorage.getDataForWells(wells, useDecimation);
        res.status(200);
        res.json(testData);
    };
};
