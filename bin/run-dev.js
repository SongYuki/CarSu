require("babel-polyfill");
var fs = require('fs');
var path = require('path');

global.__DEV__ = process.env.NODE_ENV !== 'production';

require('babel-register')({
    ignore: filename => {
        var dir = path.dirname(filename);
        for (; dir !== path.dirname(dir); dir = path.dirname(dir)) {
            if (path.basename(dir) === 'node_modules' || path.basename(dir) === 'lib') {
                break;
            }
            if (fs.existsSync(path.join(dir, '.babelrc'))) {
                return false;
            }
        }
        return true;
    },
});

function doPiping() {
    if (__DEV__) {
        return require('piping')({
            hook: true,
            ignore: /(\/\.|~$|\.json|\.scss$)/i,
        });
    }
    return true;
}

// run
if (doPiping()) {
    require('../src');
}
