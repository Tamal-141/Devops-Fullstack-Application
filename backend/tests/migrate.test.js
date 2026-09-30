const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listMigrations } = require('../src/migrate');

describe('listMigrations', () => {
  test('runs only NNN_name.sql files, in order', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    for (const file of ['002_orders.sql', '001_init.sql', '._001_init.sql', '001_init.sql~', 'notes.sql', 'README.md']) {
      fs.writeFileSync(path.join(dir, file), '');
    }

    expect(await listMigrations(dir)).toEqual(['001_init.sql', '002_orders.sql']);

    fs.rmSync(dir, { recursive: true });
  });

  test('finds the migrations shipped in the repo', async () => {
    expect(await listMigrations()).toEqual(['001_init.sql', '002_seed_products.sql']);
  });
});
