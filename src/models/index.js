import * as fs from 'fs';
import * as path from 'path';

import { sequelize, Sequelize } from './db';
import extraDefinitions from "./extraDefinitions";

const db = {
  sequelize,
  Sequelize,
};

const modelBase = path.join(__dirname, '../../models');

fs
  .readdirSync(modelBase)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
  })
  .map(function(file) {
    var model = sequelize.import(path.join(modelBase, file));
    db[model.name] = model;
    return model
  }).forEach(v=>{
    if (v.associate) {
      v.associate(db);
    }
  });

extraDefinitions(db);

module.exports = db;