import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("Prisma hot reload replaces an outdated resident client and reuses a current one", () => {
  const fields = { id: "id", idType: "idType", idNumber: "idNumber", otherIdType: "otherIdType" };
  let created = 0;
  class Client {
    resident = { fields };
    inventoryItem = { fields: { id: 'id', isMedicine: 'isMedicine' } };
    inventoryTransaction = { fields: { id: 'id', dispenseKey: 'dispenseKey' } };
    document = {};
    constructor() { created++; }
  }
  const modules: Record<string, unknown> = {
    "dotenv/config": {},
    "../app/generated/prisma/client": { PrismaClient: Client, Prisma: { ResidentScalarFieldEnum: fields,
      InventoryItemScalarFieldEnum: { id: 'id', isMedicine: 'isMedicine' },
      InventoryTransactionScalarFieldEnum: { id: 'id', dispenseKey: 'dispenseKey' },
    } },
    "@prisma/adapter-pg": { PrismaPg: class {} },
  };
  const compiled = ts.transpileModule(readFileSync("lib/prisma.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const globals: { prisma?: unknown } = { prisma: { document: {}, resident: { fields: { id: "id" } } } };
  const load = () => {
    const exports: { prisma?: Client } = {};
    runInNewContext(compiled, {
      exports, global: globals,
      process: { env: { DATABASE_URL: "postgresql://unused.invalid/test", NODE_ENV: "development" } },
      require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    });
    return exports.prisma;
  };
  const fresh = load();
  assert.equal(created, 1);
  assert.equal(globals.prisma, fresh);
  assert.ok(fresh?.resident.fields.idType);
  assert.equal(load(), fresh);
  assert.equal(created, 1);
  globals.prisma = { document: {}, resident: { fields }, inventoryItem: { fields: { id: 'id' } } };
  assert.notEqual(load(), fresh);
  assert.equal(created, 2);
});
