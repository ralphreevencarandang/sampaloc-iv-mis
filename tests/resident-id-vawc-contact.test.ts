import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import * as vawcValidation from "../validations/vawc.validation";
import * as residentValidation from "../validations/resident.validation";
import { AdminRole } from "../app/generated/prisma/enums";

function load<T>(file: string, modules: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, FormData, File, console, Buffer, URL, Response, AbortSignal, ...globals,
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return exports as T;
}
const base = {
  victimName: "Synthetic Victim", victimAge: "30", victimSex: "Female", victimCivilStatus: "Single", victimAddress: "Synthetic street",
  respondentName: "Synthetic Respondent", respondentAge: "31", respondentSex: "Male", respondentAddress: "Synthetic street",
  relationshipToVictim: "OTHER", abuseType: "PHYSICAL", narrative: "Synthetic test narrative", incidentDate: "2026-11-09T10:00", incidentLocation: "Synthetic location", status: "REPORTED",
};
const form = (data: Record<string, string>) => { const result = new FormData(); for (const [key, value] of Object.entries(data)) result.set(key, value); return result; };

test("VAWC optional phones normalize accepted legacy formats and reject invalid provided numbers in both fields", () => {
  for (const field of ["victimContactNumber", "respondentContactNumber"] as const) {
    for (const value of [undefined, null, "", "   "]) {
      const parsed = vawcValidation.vawcSchema.safeParse({ ...base, [field]: value });
      assert.ok(parsed.success); assert.equal(parsed.data[field], undefined);
    }
    for (const value of ["9123456789", "09123456789", "639123456789", "+639123456789", "+63 912-345-6789", "(0912) 345 6789"]) {
      const parsed = vawcValidation.vawcSchema.safeParse({ ...base, [field]: value });
      assert.ok(parsed.success); assert.equal(parsed.data[field], "+639123456789");
    }
    for (const value of ["8123456789", "912345678", "91234567890", "abc9123456789", "9!123456789", "+649123456789", 9123456789]) {
      const parsed = vawcValidation.vawcSchema.safeParse({ ...base, [field]: value });
      assert.equal(parsed.success, false);
      if (!parsed.success) assert.ok(parsed.error.issues.some(issue => issue.path[0] === field));
    }
  }
});

test("actual VAWC create/edit actions reject invalid phone submissions and persist normalized or empty values", async () => {
  let saved: Record<string, unknown> = {};
  let writes = 0;
  const save = async ({ data }: { data: Record<string, unknown> }) => { writes++; saved = data; return {}; };
  const action = load<typeof import("../server/actions/vawc.actions")>("server/actions/vawc.actions.ts", {
    "@/app/generated/prisma/client": {}, "@/validations/vawc.validation": vawcValidation,
    "@/lib/cloudinary": { CloudinaryUploadError: class extends Error {} },
    "@/lib/admin-authorization": { hasAdminPermission: async () => true },
    "@/lib/prisma": { vawcRecord: { count: async () => 0, create: save, update: save, findUnique: async () => ({ vawcImage: null, status: "REPORTED" }) }, vawcStatusHistory: { create: async () => ({}) } },
  });
  for (const mutate of [action.createVawc, (data: FormData) => action.updateVawc("synthetic", data)]) {
    for (const field of ["victimContactNumber", "respondentContactNumber"]) {
      const before: number = writes;
      const result = await mutate(form({ ...base, [field]: "bad" }));
      assert.equal(result.success, false); assert.ok(result.fieldErrors?.[field as "victimContactNumber"]); assert.equal(writes, before);
    }
    assert.equal((await mutate(form({ ...base, victimContactNumber: "09123456789", respondentContactNumber: "+63 912-345-6789" }))).success, true);
    assert.equal(saved.victimContactNumber, "+639123456789"); assert.equal(saved.respondentContactNumber, "+639123456789");
    assert.equal((await mutate(form(base))).success, true);
    assert.equal(saved.victimContactNumber, null); assert.equal(saved.respondentContactNumber, null);
  }
});

test("resident ID endpoint restricts metadata and bytes to Admin/Secretary and never redirects to a raw storage URL", async () => {
  let role: string | null = null;
  let reads = 0, fetches = 0;
  let reference: string | null = "https://res.cloudinary.com/synthetic/image/upload/id.png";
  let upstreamType = "image/png";
  const route = load<typeof import("../app/api/residents/[id]/valid-id/route")>("app/api/residents/[id]/valid-id/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/admin-session": { getCurrentAdminFromSession: async () => role ? { role } : null },
    "@/lib/prisma": { prisma: { resident: { findUnique: async () => { reads++; return { validIDImage: reference, idType: "Other", otherIdType: "Synthetic ID", idNumber: "synthetic-number" }; } } } },
  }, { process: { env: { CLOUDINARY_CLOUD_NAME: "synthetic" } }, fetch: async (_: unknown, args: RequestInit) => {
    fetches++; assert.equal(args.redirect, "error"); assert.equal(args.cache, "no-store");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": upstreamType } });
  } });
  const get = (image = false) => route.GET(new Request("https://example.invalid/api/residents/synthetic/valid-id" + (image ? "?image=1" : "")), { params: Promise.resolve({ id: "synthetic" }) });
  for (const denied of [null, "SK", "PEACE_AND_ORDER", "PUNONG_BARANGAY", "HEALTH_WORKER"]) {
    role = denied; assert.equal((await get()).status, 403); assert.equal((await get(true)).status, 403);
  }
  assert.equal(reads, 0); assert.equal(fetches, 0);
  for (const allowed of ["ADMIN", "CLERK"]) {
    role = allowed; const response = await get(); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const data = await response.json(); assert.equal(data.idType, "Synthetic ID"); assert.equal(data.idNumber, "synthetic-number");
    assert.equal(data.imageUrl, "/api/residents/synthetic/valid-id?image=1"); assert.equal(JSON.stringify(data).includes("cloudinary"), false);
    const image = await get(true); assert.equal(image.status, 200); assert.equal(image.headers.get("Content-Type"), "image/png"); assert.deepEqual([...new Uint8Array(await image.arrayBuffer())], [1, 2, 3]);
  }
  reference = null; assert.equal((await (await get()).json()).imageUrl, null); assert.equal((await get(true)).status, 404);
  for (const invalid of ["http://res.cloudinary.com/synthetic/image/upload/id.png", "https://evil.invalid/id.png", "https://res.cloudinary.com/other/image/upload/id.png", "https://res.cloudinary.com/synthetic/raw/upload/id.svg"]) {
    reference = invalid; const before: number = fetches; assert.equal((await get(true)).status, 502); assert.equal(fetches, before);
  }
  reference = "https://res.cloudinary.com/synthetic/image/upload/id.png"; upstreamType = "image/svg+xml";
  assert.equal((await get(true)).status, 502);
});

test("resident edit action ignores injected ID replacements and metadata changes", async () => {
  let saved: Record<string, unknown> = {};
  const action = load<typeof import("../server/actions/resident.actions")>("server/actions/resident.actions.ts", {
    bcryptjs: {}, "@/lib/cloudinary": {}, "@/lib/valid-id-image": {}, "@/validations/resident.validation": residentValidation,
    "next/cache": {}, "@/lib/nodemailer": {}, "@/lib/admin-authorization": { hasAdminPermission: async () => true },
    "@/lib/admin-session": {}, "@/app/generated/prisma/enums": { AdminRole },
    "@/lib/prisma": { resident: { findUnique: async () => ({ status: "APPROVED" }), update: async ({ data }: { data: Record<string, unknown> }) => { saved = data; return { status: "APPROVED" }; } } },
  });
  const result = await action.updateResidentAction("synthetic", form({
    email: "synthetic@example.invalid", status: "APPROVED", firstName: "Synthetic", lastName: "Resident", birthDate: "2000-01-01", gender: "Female", civilStatus: "Single", street: "Test", houseNumber: "1", contactNumber: "9123456789", citizenship: "Filipino", isVoter: "No", is4Ps: "No", isPwd: "No",
    validIDImage: "replacement", idType: "replacement", idNumber: "replacement", otherIdType: "replacement", removeImage: "true",
  }));
  assert.equal(result.success, true);
  for (const field of ["validIDImage", "idType", "idNumber", "otherIdType"]) assert.equal(field in saved, false);
});


test("resident detail and profile-update responses hide raw ID URLs from staff", async () => {
  let role: string | null = null;
  let owner = false;
  const resident = { id: "synthetic", validIDImage: "https://res.cloudinary.com/synthetic/image/upload/id.png" };
  const route = load<typeof import("../app/api/residents/[id]/route")>("app/api/residents/[id]/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/prisma": { prisma: { resident: { findUnique: async () => resident, update: async () => resident } } },
    "@/lib/admin-authorization": { hasAdminPermission: async () => !!role },
    "@/lib/admin-session": { getCurrentAdminFromSession: async () => role ? { role } : null },
    "@/lib/resident-session": { getCurrentResidentFromSession: async () => owner ? { id: "synthetic" } : null },
  });
  const context = { params: Promise.resolve({ id: "synthetic" }) };
  const get = () => route.GET(new Request("https://example.invalid/api/residents/synthetic"), context);
  const patch = () => route.PATCH(new Request("https://example.invalid/api/residents/synthetic", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: "synthetic-profile" }) }), context);
  assert.equal((await get()).status, 403);
  for (const current of ["ADMIN", "CLERK", "PUNONG_BARANGAY"]) {
    role = current;
    for (const call of [get, patch]) {
      const response = await call();
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal((await response.json()).validIDImage, current === "PUNONG_BARANGAY" ? null : "/api/residents/synthetic/valid-id?image=1");
    }
  }
  role = null; owner = true;
  assert.equal((await (await get()).json()).validIDImage, resident.validIDImage);
});
