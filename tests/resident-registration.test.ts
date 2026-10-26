import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as validation from "../validations/resident.validation";
import * as images from "../lib/valid-id-image";
import { getRegistrationAge, getRegistrationVotingFields, VALID_ID_TYPES } from "../lib/resident-registration";
import * as registration from "../lib/resident-registration";
import * as inputs from "../components/ui/resident-inputs";
import * as demographics from "../lib/resident-demographics";

const today = new Date("2026-10-15T04:00:00Z");
const base = {
  email: "registration-test@example.invalid", password: "Example123!", confirmPassword: "Example123!",
  firstName: "Test", lastName: "Resident", middleName: "", birthDate: "2000-01-01",
  gender: "Female", civilStatus: "Single", street: "Test", houseNumber: "1", subdivision: "", phase: "",
  contactNumber: "09123456789", occupation: "", citizenship: "Filipino", isVoter: "No", precinctNumber: "",
  is4Ps: "No", isPwd: "No", pwdCondition: "", validIDImageName: "id.png",
  idType: "National ID", idNumber: "0012-AB", otherIdType: "",
};

test("age uses calendar birthdays and rejects invalid/future dates", () => {
  assert.equal(getRegistrationAge("2011-10-15", today), 15);
  assert.equal(getRegistrationAge("2011-10-16", today), 14);
  assert.equal(getRegistrationAge("2011-10-14", today), 15);
  for (const date of ["", "invalid", "2011-02-29", "2027-01-01"]) assert.equal(getRegistrationAge(date, today), null);
});

test("birthdate changes reset incompatible voter details without auto-selecting Yes", () => {
  assert.deepEqual(getRegistrationVotingFields("2000-01-01", "", ""), { isVoter: "", precinctNumber: "" });
  assert.deepEqual(getRegistrationVotingFields("2000-01-01", "Yes", "001"), { isVoter: "Yes", precinctNumber: "001" });
  assert.deepEqual(getRegistrationVotingFields("2020-01-01", "Yes", "001"), { isVoter: "No", precinctNumber: "" });
  assert.deepEqual(getRegistrationVotingFields("", "Yes", "001"), { isVoter: "", precinctNumber: "" });
});

test("shared validation requires ID details, Other specification, and explicit voter choice", () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  const fifteenthBirthday = `${Number(part("year")) - 15}-${part("month")}-${part("day")}`;
  assert.ok(validation.residentRegistrationSchema.safeParse({ ...base, birthDate: fifteenthBirthday, isVoter: "Yes", precinctNumber: "001" }).success);
  for (const idType of VALID_ID_TYPES) {
    const parsed = validation.residentRegistrationSchema.safeParse({ ...base, idType, otherIdType: idType === "Other" ? "Passport" : "" });
    assert.ok(parsed.success);
    assert.equal(parsed.data.idNumber, "0012-AB");
  }
  for (const patch of [{ idType: "" }, { idType: "Unknown" }, { idNumber: " " }, { idType: "Other" }, { isVoter: "" }, { isVoter: "Yes", precinctNumber: "" }, { birthDate: "2020-01-01", isVoter: "Yes", precinctNumber: "123" }]) {
    assert.equal(validation.residentRegistrationSchema.safeParse({ ...base, ...patch }).success, false);
  }
  assert.ok(validation.residentRegistrationSchema.safeParse({ ...base, birthDate: "2020-01-01" }).success);
});

test("registration UI redirects only on success and updates disabled voting and ID controls", () => {
  type Element = { type: unknown; props: Record<string, unknown> };
  type State = Record<string, unknown>;
  const states: unknown[] = [];
  let cursor = 0;
  let mutation: { onSuccess: (result: unknown) => void };
  const navigation: string[] = [];
  const react = {
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next: unknown) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect: () => {}, useRef: () => ({ current: null }),
    createElement: (type: unknown, props: State, ...children: unknown[]) => ({ type, props: { ...props, children } }),
  };
  const modules: Record<string, unknown> = {
    react,
    "react-hook-form": { useForm: () => ({ register: () => ({ ref: () => {} }), handleSubmit: (fn: unknown) => fn }) },
    "@hookform/resolvers/zod": { zodResolver: () => {} },
    "@/components/ui/resident-inputs": inputs,
    "@tanstack/react-query": { useMutation: (options: typeof mutation) => { mutation = options; return { isPending: false }; } },
    "next/navigation": { useRouter: () => ({ replace: (url: string) => navigation.push(url) }) },
    "next/image": {}, "next/link": {}, "@/public/images/sampaloc-logo.png": {},
    "@/server/actions/auth.actions": { registerResidentAction: () => {} },
    "@/lib/valid-id-image": images, "@/validations/resident.validation": validation,
    "@/lib/resident-registration": registration, "@/lib/resident-demographics": demographics,
  };
  const source = readFileSync("app/(Resident)/register/page.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports: { default?: () => Element } = {};
  runInNewContext(compiled, { exports, console, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const render = () => { cursor = 0; return exports.default!(); };
  const find = (tree: unknown, predicate: (element: Element) => boolean): Element | undefined => {
    if (!tree || typeof tree !== "object") return;
    if (Array.isArray(tree)) { for (const child of tree) { const found = find(child, predicate); if (found) return found; } return; }
    const element = tree as Element;
    return predicate(element) ? element : find(element.props?.children, predicate);
  };
  const field = (tree: Element, name: string) => find(tree, (item) => item.props?.name === name)!;
  const change = (name: string, value: string) => {
    const input = field(render(), name);
    (input.props.onChange as (event: unknown) => void)({ target: { name, value } });
  };
  let tree = render();
  assert.equal(field(tree, "isVoter").props.disabled, true);
  assert.equal(field(tree, "idNumber").props.disabled, true);
  change("idType", "Other");
  tree = render();
  assert.equal(field(tree, "idNumber").props.disabled, false);
  assert.equal(field(tree, "otherIdType").props.required, true);
  change("birthDate", "2000-01-01");
  assert.equal(field(render(), "isVoter").props.disabled, false);
  assert.equal((states[0] as State).isVoter, "");
  change("isVoter", "Yes");
  change("precinctNumber", "001");
  change("birthDate", "2020-01-01");
  assert.equal(field(render(), "isVoter").props.disabled, true);
  assert.equal((states[0] as State).isVoter, "No");
  assert.equal((states[0] as State).precinctNumber, "");
  mutation!.onSuccess({ success: false, message: "Registration failed." });
  assert.equal(navigation.length, 0);
  mutation!.onSuccess({ success: true });
  assert.deepEqual(navigation, ["/Login"]);
});

test("registration action saves ID strings and file reference; rejects bypasses before writing", async () => {
  const writes: Record<string, unknown>[] = [];
  let uploads = 0;
  const prisma = {
    resident: { findUnique: async () => null, findFirst: async () => null },
    admin: { findUnique: async () => null },
    $transaction: async (callback: (tx: unknown) => Promise<void>) => callback({ resident: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); } } }),
  };
  const modules: Record<string, unknown> = {
    bcryptjs: { hash: async () => "test-hash" },
    "@/lib/prisma": prisma,
    "@/lib/cloudinary": { CloudinaryUploadError: class extends Error {}, uploadImageToCloudinary: async () => { uploads++; return { secure_url: "https://example.invalid/id.png" }; } },
    "@/lib/valid-id-image": images,
    "@/validations/resident.validation": validation,
    "@/lib/admin-session": {}, "@/app/generated/prisma/enums": {},
    "next/cache": {}, "@/lib/nodemailer": {}, "@/lib/admin-authorization": {},
  };
  const source = readFileSync("server/actions/resident.actions.ts", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports: { createResidentAccount?: (data: FormData) => Promise<{ success: boolean }> } = {};
  runInNewContext(compiled, { exports, File, FormData, console, require: (name: string) => {
    assert.ok(name in modules, `Unexpected dependency (including session creation): ${name}`);
    return modules[name];
  } });
  const submit = async (patch: Record<string, string> = {}, file: File | null = new File(["image"], "id.png", { type: "image/png" })) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ ...base, ...patch })) form.set(key, value);
    if (file) form.set("validIDImage", file);
    return exports.createResidentAccount!(form);
  };
  assert.ok((await submit({ idType: "Other", otherIdType: "Passport", birthDate: "2020-01-01", precinctNumber: "stale" })).success);
  assert.equal(writes[0].idType, "Other");
  assert.equal(writes[0].otherIdType, "Passport");
  assert.equal(writes[0].idNumber, "0012-AB");
  assert.equal(writes[0].validIDImage, "https://example.invalid/id.png");
  assert.equal(writes[0].contactNumber, "+639123456789");
  assert.equal(writes[0].isVoter, false);
  assert.equal(writes[0].precinctNumber, null);
  assert.ok((await submit({ otherIdType: "stale" })).success);
  assert.equal(writes[1].otherIdType, null);
  assert.equal((await submit({ idType: "Other" })).success, false);
  assert.equal((await submit({ idNumber: "" })).success, false);
  assert.equal((await submit({ birthDate: "2020-01-01", isVoter: "Yes", precinctNumber: "001" })).success, false);
  assert.equal((await submit({}, null)).success, false);
  assert.equal((await submit({}, new File(["bad"], "id.pdf", { type: "application/pdf" }))).success, false);
  assert.equal((await submit({}, new File([new Uint8Array(images.MAX_VALID_ID_IMAGE_SIZE_BYTES + 1)], "id.png", { type: "image/png" }))).success, false);
  const invalidInputs: Record<string, string>[] = [{firstName:'Juan2'}, {middleName:'Reyes!'}, {lastName:'123'}, {contactNumber:'+638123456789'}, {contactNumber:'91234567890'}, {contactNumber:'abc9123456789'}];
  for (const patch of invalidInputs) {
    assert.equal((await submit(patch)).success, false);
  }
  assert.equal(writes.length, 2);
  assert.equal(uploads, 2);
});
