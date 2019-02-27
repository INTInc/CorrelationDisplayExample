const fs = require('fs');
module.exports = function() {
    const minDistance = 1; // in pixels
    const RepeatWells = 10;
    const lasPath = './server/las/';
    const __lasMap = new Map();
    const __wells = new Map();
    let __fileId = 0;
    let __created = false;
    const getCurvesFromTable = function(table) {
        const curves = [];
        for (let i=0; i < table.getNumberOfColumns(); ++i) {
            const column = table.getColumn(i);
            curves.push({
                'name': column.getName(),
                'type': column.getType(),
                'unit': column.getUnit().getSymbol(),
                'min': column.getMin(),
                'max': column.getMax(),
            });
        }
        return curves;
    };
    const querySectionByName = function(sections, name) {
        for (let i = 0; i < sections.length; ++i) {
            if (sections[i].getName().toLowerCase().indexOf(name.toLowerCase()) >= 0) {
                return sections[i];
            }
        }
        return null;
    };

    const queryDataByKey = function(data, key) {
        for (let i = 0; i < data.length; ++i) {
            if (data[i].getMnemonic().toLowerCase() === key.toLowerCase()) {
                return data[i];
            }
        }
        return null;
    };
    const loadTable = function(parser, resolve, reject) {
        const table = new geotoolkit.data.DataTable();
        const wellSection = querySectionByName(parser.getSections(), 'WELL');
        const minIndex = parseFloat(queryDataByKey(wellSection.getData(), 'STRT').getValue());
        const maxIndex = parseFloat(queryDataByKey(wellSection.getData(), 'STOP').getValue());
        const sections = parser.getSectionGroups();
        let curveSection = querySectionByName(sections, 'LAS2');
        if (curveSection == null) {
            curveSection = querySectionByName(sections, 'Main Section');
        }
        if (curveSection != null) {
            const curveNames = curveSection.getCurveMnemonics();
            for (let i = 0; i < curveNames.length; ++i) {
                const data = curveSection.getCurveData(i);
                const info = curveSection.getCurveInfo(i);
                const curve = new geotoolkit.data.NumericalDataSeries({
                    'name': info.getMnemonic(),
                    'data': data,
                    'id': info.getMnemonic(),
                    'unit': info.getUnit(),
                });
                table.addColumn(curve);
            }
            table.setMetaData({
                'range': new geotoolkit.util.Range(minIndex, maxIndex),
                'index': table.getColumnByName('DEPTH') != null || curveNames.length === 0 ? 'DEPTH' : table.getColumn(0).getName(),
            });
            resolve(table);
        } else {
            console.log('Error');
            reject(table);
        }
    };
    const streamParse = function(lineReader, resolve, reject) {
        new geotoolkit.welllog.data.las.Las20Stream({
            'reader': lineReader,
        }).open(true).then(function(stream) {
            loadTable(stream, resolve, reject);
        }, function(err) {
            reject(err);
        });
    };
    const readLAS = async function(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(lasPath+fileName, 'utf8', function(err, data) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                const lineReader = new geotoolkit.util.stream.LineReader({
                    'stream': new geotoolkit.util.stream.BrowserMemoryStream({
                        'buffer': geotoolkit.util.stream.BrowserMemoryStream.stringToArrayBuffer(data),
                    }),
                });
                geotoolkit.welllog.data.las.Las20Stream.isLAS20(lineReader)
                    .then(
                        function(result) {
                            streamParse(lineReader, resolve, reject);
                        },
                        function(result) {
                            reject(result);
                        });
            });
        });
    };
    const updateWellsMap = async function() {
        return new Promise(async (resolve) => {
            fs.readdir(lasPath, async (err, files) => {
                const objects = files.map(function(file) {
                    return {
                        'fileName': file,
                        'name': file,
                    };
                });
                for (const element of objects) {
                    if (!__lasMap.has(element['fileName'])) {
                        const parsedData = await readLAS(element['fileName']);
                        element['data'] = parsedData;
                        __lasMap.set(element['fileName'], element);
                    }
                };
                return resolve(__lasMap);
            });
        });
    };
    const updateWells = async function() {
        if (!__created) {
            const wells = await updateWellsMap();
            // artificially repeat loaded wells
            for (let i=0; i < RepeatWells; ++i) {
                wells.forEach((value, key) => {
                    __wells.set(__fileId, {
                        'name': value['name'],
                        'id': __fileId,
                        'data': value['data'],
                    });
                    __fileId++;
                });
            }
            __created = true;
        }
        return __wells;
    };
    const Range = function(low, high) {
        this._low = low;
        this._high = high;
    };
    Range.prototype.getLow = function() {
        return this._low;
    };
    Range.prototype.getHigh = function() {
        return this._high;
    };
    Range.prototype.getSize = function() {
        return this._high - this._low;
    };

    const DataStorage = function() {
    };
    DataStorage.prototype.getCurveMinMax = async function(wellId, curveId) {
        const wells = await updateWells();
        return new Promise((resolve) => {
            const well = wells.get(+wellId);
            if (well) {
                const table = well['data'];
                for (let i=0; i < table.getNumberOfColumns(); ++i) {
                    const column = table.getColumn(i);
                    if (column.getName() === curveId) {
                        resolve({
                            'name': curveId,
                            'min': column.getMin(),
                            'max': column.getMax(),
                        });
                    }
                }
            }
            resolve({'name': curveId, 'min': NaN, 'max': NaN});
        });
    };
    DataStorage.prototype.getCurveMetaData = async function(wellId, curveId) {
        const wells = await updateWells();
        return new Promise((resolve) => {
            const well = wells.get(+wellId);
            if (well) {
                const table = well['data'];
                for (let i=0; i < table.getNumberOfColumns(); ++i) {
                    const column = table.getColumn(i);
                    if (column.getName() === curveId) {
                        resolve({
                            'name': column.getName(),
                            'type': column.getType(),
                            'unit': column.getUnit().getSymbol(),
                            'min': column.getMin(),
                            'max': column.getMax(),
                        });
                    }
                }
            }
            resolve({'name': curveId});
        });
    };
    DataStorage.prototype.getCurvesList = async function(wellId) {
        const wells = await updateWells();
        return new Promise((resolve) => {
            let curves;
            const well = wells.get(+wellId);
            if (well) {
                const table = well['data'];
                curves = getCurvesFromTable(table);
            }
            resolve(curves);
        });
    };
    DataStorage.prototype.getLogData = async function(wellId, curves, range, scale, usedecimation) {
        const wells = await updateWells();
        let table = null;
        const well = wells.get(+wellId);
        if (well) {
            table = well['data'];
        }
        if (!table) return null;
        scale = scale || 1;
        usedecimation = !!usedecimation;
        const queryRange = new geotoolkit.util.Range(+range['min'], +range['max']);
        const wholeRange = table.getMetaData()['range'];
        const depthsSeries = table.getColumnByName(table.getMetaData()['index']);
        const numberOfSamples = depthsSeries.getLength();
        const originalStep = wholeRange.getSize() / numberOfSamples;
        const span = queryRange.getSize() / 20;
        const startTime = Math.max(queryRange.getLow() - span, wholeRange.getLow());
        const endTime = Math.min(queryRange.getHigh() + span, wholeRange.getHigh());
        let startIndex = Math.floor((startTime - wholeRange.getLow()) / originalStep);
        if (startIndex < 0) startIndex = 0;
        let endIndex = Math.ceil((endTime - wholeRange.getLow()) / originalStep);
        // distance between samples in device
        let step = Math.ceil((minDistance / scale) / originalStep);
        if (step <= 0) {
            step = 1;
        }
        if (usedecimation === false) {
            step = 1;
        }
        startIndex = step * Math.floor(startIndex / step);
        endIndex = step * Math.ceil(endIndex / step);
        if (endIndex >= numberOfSamples) {
            endIndex = numberOfSamples - 1;
        }
        const cells = []; let i; let j; let k;
        const curvesCount = curves.length;
        const curvesData = [];
        for (i = 0; i < curvesCount; ++i) {
            cells[i] = [];
            const curveData = table.getColumnByName(curves[i]);
            curvesData[i] = curveData.toArray(false);
        }
        k = 0;
        for (i = startIndex; i <= endIndex; i = i + step) {
            for (j = 0; j < curvesCount; ++j) {
                cells[j][k] = curvesData[j][i];
            }
            k++;
        }
        return new Promise((resolve) => {
            resolve(cells);
        });
    };
    DataStorage.prototype.getData = function(wellId, curves, range, scale, usedecimation) {
        return this.getLogData(wellId, curves, range, scale, usedecimation);
    };
    DataStorage.prototype.getWells = async function() {
        const wells = await updateWells();
        const output = [];
        wells.forEach((value, key) => output.push({
            'name': value['name'],
            'id': value['id'],
            'minDepth': value['data'].getMetaData()['range'].getLow(),
            'maxDepth': value['data'].getMetaData()['range'].getHigh(),
            'curves': getCurvesFromTable(value['data']),
        }));
        return output;
    };
    DataStorage.create = function() {
        return new DataStorage();
    };
    return DataStorage;
};
