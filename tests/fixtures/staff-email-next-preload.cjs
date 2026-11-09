/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Next.js integration-test preload. */
const pg = require('pg');
const schema = process.env.MIS_EMAIL_FIXTURE_SCHEMA;
if (!/^staff_email_next_test_[a-f0-9]{32}$/.test(schema || '')) throw Error('Invalid test schema');
const original = pg.Client.prototype.query;
pg.Client.prototype.query = function (...args) {
  const input = args[0];
  let sql = typeof input === 'string' ? input : input?.text || '';
  sql = sql.replaceAll('"public".', '"' + schema + '".');
  sql = sql.replace('pg_advisory_xact_lock(74120937)', "pg_advisory_xact_lock(hashtextextended('" + schema + "',0))");
  for (const match of sql.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+"([^"]+)"\."([^"]+)"/gi)) {
    if (match[1] !== schema && match[1] !== 'pg_catalog' && match[1] !== 'information_schema') throw Error('Test schema boundary rejected query');
  }
  if (/\b(?:FROM|INTO|UPDATE|JOIN)\s+"[A-Z][^"]*"(?!\.)/i.test(sql)) throw Error('Unqualified application query rejected');
  args[0] = typeof input === 'string' ? sql : { ...input, text: sql };
  return original.apply(this, args);
};
