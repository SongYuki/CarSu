import { sequelize, Sequelize } from './db';
import * as fs from 'fs-promise';
import * as path from 'path';

const Migrate = sequelize.define('Migrate', {});

const regMigrate = /^(\d+).*\.sql$/;

export default async function doMigrate() {
  // First, sync migrate table.
  await Migrate.sync();

  // Read all migrates and sort them
  const base = path.join(__dirname, '../../migrates');
  const files = await fs.readdir(base);

  const matches = files.map( file => {
    const m = regMigrate.exec(file);
    if (!m) {
      return;
    }
    const id = parseInt(m[1]);
    return {
      id,
      file,
    }
  }).filter(v=>v);

  matches.sort((a, b) => a.id - b.id);

  // check there's no 2 matches with same id.
  const hash = {};
  for (const {id, file} of matches) {
    if (hash[id]) {
      throw new Error(`Duplicated migrate id ${id} with ${file} and ${hash[id]}`);
    }
    hash[id] = file;
  }

  // Run migrates.
  for (const {id, file} of matches) {
    const count = await Migrate.count({where:{id}});

    if (count === 0) {
      // Run new migrate
      console.log(`Migrating: ${file}`);
      const content = await fs.readFile(path.join(base, file), 'utf8');

      for (const sql of content.split(';').map(v=>v.trim()).filter(v=>v)) {
        await sequelize.query(sql);
      }
      await Migrate.create({id});
    }
  }
}
