import Sequelize from 'sequelize';

const env       = process.env.NODE_ENV || 'development';

let sequelize;
if (env === 'development') {
  var config    = require('../../config/database.json')[env];
  sequelize = new Sequelize(config.database, config.username, config.password, config);
} else {
  sequelize = new Sequelize(process.env['MYSQL']);
}

export {
  sequelize,
  Sequelize,
};
