import fs from 'fs';

export const getTopsList = function() {
    return function(req, res, next) {
        const path = './server/data/tops.json';
        fs.readFile(path, function(error, data) {
            if (error) {
                res.status(400);
                return res.json('Get data error');
            }
            res.status(200);
            res.json(JSON.parse(data));
        });
    };
};
