import {BrowserMemoryStream} from '@int/geotoolkit/util/stream/BrowserMemoryStream.js';
import {LineReader} from '@int/geotoolkit/util/stream/LineReader.js';
import {Las20Stream} from '@int/geotoolkit/welllog/data/las/Las20Stream.js';
import {Range} from '@int/geotoolkit/util/Range.js';
import {DataTable} from '@int/geotoolkit/data/DataTable.js';
import {NumericalDataSeries} from '@int/geotoolkit/data/NumericalDataSeries.js';

import fs from 'fs';

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
    const table = new DataTable();
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
            const curve = new NumericalDataSeries({
                'name': info.getMnemonic(),
                'data': data,
                'id': info.getMnemonic(),
                'unit': info.getUnit(),
            });
            table.addColumn(curve);
        }
        table.setMetaData({
            'range': new Range(minIndex, maxIndex),
            'index': table.getColumnByName('DEPTH') != null || curveNames.length === 0 ? 'DEPTH' : table.getColumn(0).getName(),
        });
        resolve(table);
    } else {
        console.log('Error');
        reject(table);
    }
};

const streamParse = function(lineReader, resolve, reject) {
    new Las20Stream({
        'reader': lineReader,
    }).open(true).then(function(stream) {
        loadTable(stream, resolve, reject);
    }, function(err) {
        reject(err);
    });
};


export class DataStorage {
    constructor() {
        this._created = false;
        this._lasMap = new Map();
        this._wells = new Map();
        this._fileId = 0;
        this._minDistance = 3; // in pixels
        this._repeatWells = 33; // by 334 wells
        this._lasPath = './server/las/';
    }

    async readLAS(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(this._lasPath+fileName, 'utf8', function(err, data) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                const lineReader = new LineReader({
                    'stream': new BrowserMemoryStream({
                        'buffer': BrowserMemoryStream.stringToArrayBuffer(data),
                    }),
                });
                Las20Stream.isLAS20(lineReader)
                    .then(
                        function(result) {
                            streamParse(lineReader, resolve, reject);
                        },
                        function(result) {
                            reject(result);
                        });
            });
        });
    }

    async updateWellsMap() {
        return new Promise(async (resolve) => {
            fs.readdir(this._lasPath, async (err, files) => {
                const objects = files.filter((file) => file.indexOf('.las') !== -1 || file.indexOf('.LAS') !== -1).map(function(file) {
                    return {
                        'fileName': file,
                        'name': file,
                    };
                });
                for (const element of objects) {
                    if (!this._lasMap.has(element['fileName'])) {
                        element['data'] = await this.readLAS(element['fileName']);
                        this._lasMap.set(element['fileName'], element);
                    }
                }
                return resolve(this._lasMap);
            });
        });
    }

    async updateWells() {
        if (!this._created) {
            const wells = await this.updateWellsMap();
            // artificially repeat loaded wells
            for (let i=0; i < this._repeatWells; ++i) {
                wells.forEach((value, key) => {
                    this._wells.set(this._fileId, {
                        'name': value['name'],
                        'id': this._fileId,
                        'data': value['data'],
                    });
                    this._fileId++;
                });
            }
            this._created = true;
        }
        return this._wells;
    }

    async getCurveMinMax(wellId, curveId) {
        const wells = await this.updateWells();
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
    }

    async getCurveMetaData(wellId, curveId) {
        const wells = await this.updateWells();
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
    }

    async getCurvesList(wellId) {
        const wells = await this.updateWells();
        return new Promise((resolve) => {
            let curves;
            const well = wells.get(+wellId);
            if (well) {
                curves = getCurvesFromTable(well['data']);
            }
            resolve(curves);
        });
    }

    async getLogData(wellId, curves, range, scale, usedecimation) {
        const wells = await this.updateWells();
        let table = null;
        const well = wells.get(+wellId);
        if (well) {
            table = well['data'];
        }
        if (!table) return null;
        scale = scale || 1;
        usedecimation = !!usedecimation;
        const queryRange = new Range(+range['min'], +range['max']);
        const wholeRange = table.getMetaData()['range'];
        const depthsSeries = table.getColumnByName(table.getMetaData()['index']);
        const numberOfSamples = depthsSeries.getLength();
        const originalStep = wholeRange.getSize() / numberOfSamples;
        const span = queryRange.getSize() / 20;
        const startTime = Math.max(queryRange.getLow() - span, wholeRange.getLow());
        const endTime = Math.min(queryRange.getHigh() + span, wholeRange.getHigh());
        let startIndex = Math.floor((startTime - wholeRange.getLow()) / originalStep) - 1;
        if (startIndex < 0) startIndex = 0;
        let endIndex = Math.ceil((endTime - wholeRange.getLow()) / originalStep) + 1;
        // distance between samples in device
        let step = Math.ceil((this._minDistance / scale) / originalStep);
        if (step <= 0) {
            step = 1;
        }
        if (usedecimation === false) {
            step = 1;
        }
        startIndex = step * Math.floor(startIndex / step);
        endIndex = step * Math.ceil(endIndex / step);
        if ((endIndex + step) >= numberOfSamples - 1) {
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
        if (endIndex === numberOfSamples - 1) {
            for (j = 0; j < curvesCount; ++j) {
                if (cells[j][cells[j].length-1] !== curvesData[j][endIndex]) {
                    cells[j][k] = curvesData[j][endIndex];
                }
            }
        }
        return new Promise((resolve) => {
            resolve(cells);
        });
    }

    async getDataForWells(wells, usedecimation) {
        const data = [];
        for (const element of wells) {
            const wellData = await this.getLogData(element['wellId'], element['curves'], element['range'], element['scale'], usedecimation);
            data.push({
                'wellId': element['wellId'],
                'data': wellData,
            });
        }
        return data;
    }

    async getWells() {
        const wells = await this.updateWells();
        const output = [];
        wells.forEach((value, key) => output.push({
            'name': value['name'],
            'id': value['id'],
            'minDepth': value['data'].getMetaData()['range'].getLow(),
            'maxDepth': value['data'].getMetaData()['range'].getHigh(),
            'curves': getCurvesFromTable(value['data']),
        }));
        return output;
    }
}

