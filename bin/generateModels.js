require("babel-polyfill");

global.__DEV__ = process.env.NODE_ENV !== 'production';

const generateModels = require('../lib/models/generateModels').default;
const sequelize = require('../lib/models/db').sequelize;

generateModels()
    .then(() => {
        sequelize.close();
        console.log('Done.');
    }, err => {
        setImmediate(() => {
            throw err;
        });
    });