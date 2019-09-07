require("babel-polyfill");

global.__DEV__ = process.env.NODE_ENV !== 'production';

require('../lib');

