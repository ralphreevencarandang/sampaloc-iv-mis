/* eslint-disable @typescript-eslint/no-require-imports -- This Node.js test preload deliberately uses CommonJS. */
// Integration-test process only: redirect all application SQL to disposable cloned tables.
const { syncBuiltinESMExports } = require('node:module');
const schema = process.env.MIS_NEXT_FIXTURE_SCHEMA;
if (!/^resident_next_test_[a-f0-9]{32}$/.test(schema || '')) throw Error('Invalid test schema');
const pg = require('pg');
const originalQuery = pg.Client.prototype.query;
pg.Client.prototype.query = function (...args) {
  const input = args[0];
  let sql = typeof input === 'string' ? input : input?.text || '';
  sql = sql.replaceAll('"public".', '"' + schema + '".');
  for (const match of sql.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+"([^"]+)"\."([^"]+)"/gi)) {
    if (match[1] !== schema && match[1] !== 'pg_catalog' && match[1] !== 'information_schema') throw Error('Test schema boundary rejected query');
  }
  if (/\b(?:FROM|INTO|UPDATE|JOIN)\s+"[A-Z][^"]*"(?!\.)/i.test(sql)) throw Error('Unqualified application query rejected');
  args[0] = typeof input === 'string' ? sql : { ...input, text: sql };
  return originalQuery.apply(this, args);
};
// Record only newly uploaded fixture asset IDs so the parent can remove those exact assets.
const https = require('node:https');
const originalRequest = https.request;
https.request = function (...args) {
  const options = args[0];
  const host = typeof options === 'object' ? options.hostname || options.host : '';
  const path = typeof options === 'object' ? options.path || options.pathname || '' : String(options);
  const request = originalRequest.apply(this, args);
  if (String(host).includes('api.cloudinary.com') && path.includes('/image/upload')) {
    request.on('response', response => {
      let body = '';
      response.on('data', chunk => { body += String(chunk); });
      response.on('end', () => { try {
        const data = JSON.parse(body);
        if (typeof data.public_id === 'string') console.log('FIXTURE_ASSET ' + JSON.stringify({ publicId: data.public_id }));
      } catch {} });
    });
  }
  return request;
};
syncBuiltinESMExports();
