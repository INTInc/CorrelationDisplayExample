import fs from 'fs';

export const getTemplate = function() {
    return function(req, res, next) {
        const path = './server/data/';
        const fileId = req.params.id;
        if (!fileId) {
            res.status(400);
            return res.json('Get data error');
        }
        fs.readFile(path + fileId, function(error, data) {
            if (error) {
                res.status(400);
                return res.json('Get data error');
            }
            res.status(200);
            res.json(JSON.parse(data));
        });
    };
};
