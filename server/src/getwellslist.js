export const getWellsList = function(dataStorage) {
    return async function(req, res, next) {
        if (!req.body) {
            res.status(400);
            return res.json('Get curves list error');
        }
        const testData = await dataStorage.getWells();
        res.status(200);
        res.json({'data': testData});
    };
};
