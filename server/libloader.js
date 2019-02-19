const fs = require('fs');
const path = require('path');
const DOMParser = require('xmldom').DOMParser;
const jsdom = require('jsdom');
const Canvas = require('canvas-prebuilt');

// Load geotoolkit by reading a requirejs config and extracting the actual file path from it
// The actual loading is then delegated to nodejs 'require'
// eslint-disable-next-line prefer-const
let requirejsConfig = null;
const requireconfig = fs.readFileSync(path.join(__dirname, 'commons.adv.js'), 'utf8');
const geotoolkitConfig = requireconfig.replace(new RegExp('require.config', 'g'), 'requirejsConfig = ');
eval(geotoolkitConfig); // Populate requirejsConfig with the content of the config
// Specify instances of jsdom and Canvas
global.geotoolkit = {
    'jsdom': jsdom,
    'Canvas': Canvas,
};
// global.jsdom = jsdom;
require(requirejsConfig['paths']['geotoolkit'] + '.js');
global.DOMParser = DOMParser;
global.window.DOMParser = DOMParser;

require(requirejsConfig['paths']['geotoolkit.data'] + '.js');
require(requirejsConfig['paths']['geotoolkit.welllog'] + '.js');
require(requirejsConfig['paths']['geotoolkit.welllog.las'] + '.js');

global.geotoolkit = window.geotoolkit;

module.exports = requirejsConfig;
