const DOMParser = require('xmldom').DOMParser;
const jsdom = require('jsdom');
const {Canvas} = require('canvas');

// Load geotoolkit by reading a requirejs config and extracting the actual file path from it
// The actual loading is then delegated to nodejs 'require'
// eslint-disable-next-line prefer-const
// Specify instances of jsdom and Canvas
global.geotoolkit = {
    'jsdom': jsdom,
    'Canvas': Canvas,
};
// global.jsdom = jsdom;
require('@int/es5/geotoolkit');
global.DOMParser = DOMParser;
global.window.DOMParser = DOMParser;
require('@int/es5/geotoolkit.data');
require('@int/es5/geotoolkit.welllog');
require('@int/es5/geotoolkit.welllog.las');
global.geotoolkit = window.geotoolkit;

