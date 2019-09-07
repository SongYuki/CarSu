import * as fs from 'fs-promise';
import * as path from 'path';
import { sequelize, Sequelize } from './db';
import {singularize} from 'inflection';

function getModelName(table){
  return singularize(table);
}

const TYPE_MAP = {
  int: () => 'INTEGER',
  varchar: size => `STRING(${size})`,
  enum: values => `ENUM(${values})`,
  decimal: values=> `DECIMAL(${values})`,
  datetime: values => 'DATE',
  mediumtext: values => 'TEXT',
  text: values => 'TEXT',
};

function renderType(typeString) {
  const [_, type, value] = /^(\w+)(?:\((.+)\))?$/.exec(typeString);
  return `DataTypes.${TYPE_MAP[type](value)}`
}

function renderDefault(value) {
  return JSON.stringify(value);
}

function renderField({Field, Type, Default, Null, Comment}) {
  return `    ${Field}: {
      type: ${renderType(Type)},
      defaultValue: ${renderDefault(Default)},
      allowNull: ${Null==='YES'},
      comment: ${JSON.stringify(Comment)},
    },
`;
}

const HIDDEN_FIELDS = {
  id: true,
  createdAt: true,
  updatedAt: true,
};

function renderFields(fields, foreignKeys) {
  const foreignKeyMap = {};

  for (let {COLUMN_NAME} of foreignKeys) {
    foreignKeyMap[COLUMN_NAME] = true;
  }

  return fields
    .filter(v => !HIDDEN_FIELDS[v.Field] && !foreignKeyMap[v.Field])
    .map(renderField)
    .join('');
}

function renderIndex({primary, unique, name, fields}) {
  return `      {
        primary: ${primary},
        unique: ${unique},
        name: ${JSON.stringify(name)},
        fields: ${JSON.stringify(fields)},
      },
`;
}

function renderIndexes(indexes) {
  return indexes.map(renderIndex).join('');
}

function renderAssociate(modelName, {REFERENCED_TABLE_NAME, COLUMN_NAME, REFERENCED_COLUMN_NAME}, tableNameMap) {
  const refModel = getModelName(tableNameMap[REFERENCED_TABLE_NAME.toLowerCase()]);
  const match = /^(\w+)Id$/.exec(COLUMN_NAME);

  return `        models.${modelName}.belongsTo(models.${refModel}, {
          as: ${JSON.stringify(match ? match[1] : COLUMN_NAME)},
          foreignKey: ${JSON.stringify(COLUMN_NAME)},
${REFERENCED_COLUMN_NAME === 'id' ? '' : `          targetKey: ${JSON.stringify(REFERENCED_COLUMN_NAME)},        
`}        });
`;
}

function renderAssociates(modelName, foreignKeys, tableNameMap) {
  return foreignKeys.map(v=>renderAssociate(modelName, v, tableNameMap)).join('');
}

function renderModel(tableName, modelName, fields, indexes, foreignKeys, tableNameMap) {
  return `/**********************************************
 * Auto generated code by magic *
 **********************************************/
 
// Do not modify this file by hand, it could be overridden later.

/* eslint-disable */

module.exports = (sequelize, DataTypes) => 
  sequelize.define('${modelName}', {
${renderFields(fields, foreignKeys)}  }, {
    indexes: [
${renderIndexes(indexes)}
    ],
    classMethods: {
      associate: function (models) {
${renderAssociates(modelName, foreignKeys, tableNameMap)}      },
    },
  });
`;
}

export default async function generateModels() {
  const base = path.join(__dirname, '../../models');

  if (!await fs.exists(base)) {
    await fs.mkdir(base);
  }

  const files = await fs.readdir(base);

  for (const file of files) {
    if (/^[^\.].+\.js$/.test(file)) {
      await fs.unlink(path.join(base, file));
    }
  }

  const schemas = await sequelize.query('SHOW TABLES', {
    type: sequelize.QueryTypes.SHOWTABLES
  });
  const tableNameMap = {};

  for (const table of schemas) {
    if (table === 'Migrates') {
      // Ignore `Migrates` table
      continue;
    }
    tableNameMap[table.toLowerCase()] = table;
  }

  for (const table of schemas) {
    if (table === 'Migrates') {
      // Ignore `Migrates` table
      continue;
    }

    const fields = await sequelize.query(`SHOW FULL COLUMNS FROM \`${table}\``, {
      type: sequelize.QueryTypes.SELECT,
    });

    // indexes
    const indexes = await sequelize.query(`SHOW INDEXES FROM \`${table}\``, {
      type: sequelize.QueryTypes.SHOWINDEXES,
    });

    // foreign keys
    const foreignKeys = await sequelize.query(`select * from INFORMATION_SCHEMA.KEY_COLUMN_USAGE where CONSTRAINT_SCHEMA=DATABASE() and TABLE_NAME=? and REFERENCED_COLUMN_NAME is not null`, {
      replacements: [table],
      type: sequelize.QueryTypes.SELECT,
    })

    const modelName = getModelName(table);

    await fs.writeFile(path.join(base, modelName+'.js'), renderModel(table, modelName, fields, indexes, foreignKeys, tableNameMap), 'utf-8');
  }
}

