import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as creators from "../lib/announcement-creator";
import * as validation from "../validations/announcement.validation";
import * as rbac from "../lib/rbac";
import { AdminRole } from "../app/generated/prisma/enums";

test("announcement creation uses the authenticated role and edits cannot replace the creator", async () => {
  let role: AdminRole | null = null;
  let matches = 1;
  let writes = 0;
  let saved: Record<string, unknown> = {};
  const modules: Record<string, unknown> = {
    "@/lib/cloudinary": { CloudinaryUploadError: class extends Error {}, uploadImageToCloudinary: () => { throw Error("Unexpected upload"); } },
    "@/lib/admin-session": { getCurrentAdminFromSession: async () => role ? { role } : null },
    "@/lib/admin-authorization": { hasAdminPermission: async () => rbac.canAccessResource(role, "announcements", "write") },
    "@/lib/rbac": rbac,
    "@/lib/announcement-creator": creators,
    "@/validations/announcement.validation": validation,
    "@/server/announcements/announcements": { announcementSelect: {}, mapAnnouncementRecord: (value: unknown) => value },
    "@/lib/prisma": {
      official: { findMany: async (args: { where: { firstName: { equals: string }; lastName: { equals: string }; isArchive: boolean; isActive: boolean } }) => {
        const expected = creators.getAnnouncementCreator(role)!;
        assert.equal(args.where.firstName.equals, expected.firstName);
        assert.equal(args.where.lastName.equals, expected.lastName);
        assert.equal(args.where.isArchive, false);
        assert.equal(args.where.isActive, true);
        return Array.from({ length: matches }, () => ({ id: "assigned-official" }));
      } },
      announcement: {
        findUnique: async () => ({ id: "existing", image: null, createdById: "original-official" }),
        create: async ({ data }: { data: Record<string, unknown> }) => { writes++; saved = data; return data; },
        update: async ({ data }: { data: Record<string, unknown> }) => { writes++; saved = data; return data; },
      },
    },
  };
  const compiled = ts.transpileModule(readFileSync("server/actions/announcement.actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, FormData, File, console, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const actions = exports as typeof import("../server/actions/announcement.actions");
  const form = new FormData();
  form.set("title", "Announcement"); form.set("content", "Content"); form.set("createdById", "forged-official");
  for (const denied of [null, AdminRole.HEALTH_WORKER, AdminRole.PEACE_AND_ORDER, AdminRole.PUNONG_BARANGAY]) {
    role = denied;
    assert.equal((await actions.createAnnouncementAction(form)).success, false);
    assert.equal((await actions.updateAnnouncementAction("existing", form)).success, false);
  }
  assert.equal(writes, 0);
  for (const allowed of [AdminRole.ADMIN, AdminRole.CLERK, AdminRole.SK]) {
    role = allowed;
    assert.equal((await actions.createAnnouncementAction(form)).success, true);
    assert.equal(saved.createdById, "assigned-official");
    assert.equal((await actions.updateAnnouncementAction("existing", form)).success, true);
    assert.equal("createdById" in saved, false);
    form.delete("createdById");
    assert.equal((await actions.createAnnouncementAction(form)).success, true);
  }
  for (const count of [0, 2]) {
    matches = count;
    const before = writes;
    assert.equal((await actions.createAnnouncementAction(form)).success, false);
    assert.equal(writes, before);
  }
  form.set("title", "");
  assert.equal((await actions.createAnnouncementAction(form)).success, false);
});

test("all five role names are exact and unknown historical creators retain their names", () => {
  const expected = ["Belen Movido", "Jedrick Narvaez", "Ernesto C. Atienza", "Alice Joy J. Lopez", "Armando M. Movido"];
  assert.deepEqual(Object.values(creators.ANNOUNCEMENT_CREATORS).map(c => c.name), expected);
  assert.equal(creators.getAnnouncementCreator(AdminRole.HEALTH_WORKER), null);
  for (const creator of Object.values(creators.ANNOUNCEMENT_CREATORS)) assert.equal(creators.getAnnouncementCreatorName(creator), creator.name);
  assert.equal(creators.getAnnouncementCreatorName({ firstName: "Former", lastName: "Official" }), "Former Official");
});

test("creator control renders read-only for creation and preserves a different original author on edit", () => {
  let role: AdminRole = AdminRole.CLERK;
  const modules: Record<string, unknown> = {
    react: React,
    "@hookform/resolvers/zod": { zodResolver: () => {} },
    "@tanstack/react-query": { useQueryClient: () => ({}), useMutation: () => ({ isPending: false }) },
    "lucide-react": { Upload: () => null, X: () => null },
    "next/image": { default: () => null, __esModule: true },
    "react-hook-form": { useForm: () => ({ register: () => ({}), handleSubmit: () => () => {}, formState: { errors: {} } }) },
    "@/lib/valid-id-image": {},
    "@/server/actions/announcement.actions": {},
    "@/components/providers/admin-rbac-provider": { useAdminRbac: () => ({ role }) },
    "@/lib/announcement-creator": creators,
    "@/validations/announcement.validation": validation,
  };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync("components/ui/Admin/AnnouncementModalForm.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const Component = (exports as typeof import("../components/ui/Admin/AnnouncementModalForm")).default;
  for (const current of [AdminRole.ADMIN, AdminRole.CLERK, AdminRole.SK]) {
    role = current;
    const html = renderToStaticMarkup(React.createElement(Component, { isOpen: true, mode: "create", onClose: () => {} }));
    assert.ok(html.includes('readOnly=""'));
    assert.ok(html.includes(creators.getAnnouncementCreator(role)!.name));
    assert.equal(html.includes("<select"), false);
  }
  const original = { id: "existing", title: "Title", content: "Content", image: null, isArchive: false, createdAt: new Date().toISOString(), createdById: "former", createdBy: { firstName: "Former", lastName: "Official", position: "Former position" } };
  const html = renderToStaticMarkup(React.createElement(Component, { isOpen: true, mode: "edit", onClose: () => {}, initialData: original }));
  assert.ok(html.includes('value="Former Official"'));
  assert.ok(html.includes('readOnly=""'));
});
