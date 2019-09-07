require("babel-polyfill");

global.__DEV__ = process.env.NODE_ENV !== 'production';

const doMigrate = require('../lib/models/migrate').default;
const sequelize = require('../lib/models/db').sequelize;

doMigrate()
    .then(() => {
        sequelize.close();
        console.log('Done.');
    }, err => {
        setImmediate(() => {
            throw err;
        });
    });