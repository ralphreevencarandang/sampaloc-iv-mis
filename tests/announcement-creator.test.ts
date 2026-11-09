import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as hookForm from 'react-hook-form';
import * as selectUI from '../components/ui/select';
import * as creators from '../lib/announcement-creator';
import * as validation from '../validations/announcement.validation';
import * as rbac from '../lib/rbac';
import { AdminRole } from '../app/generated/prisma/enums';

function load(path: string, modules: Record<string, unknown>) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, FormData, File, console, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return exports;
}

test('creator assignment checks authenticated role/email, validates Admin selection and preserves edits except explicit Admin replacement', async () => {
  let role: AdminRole | null = null, email = '';
  let matches = 1, writes = 0, lookups = 0;
  let saved: Record<string, unknown> = {}, lookedUp = '';
  const modules: Record<string, unknown> = {
    '@/lib/cloudinary': { CloudinaryUploadError: class extends Error {}, uploadImageToCloudinary: () => { throw Error('Unexpected upload'); } },
    '@/lib/admin-session': { getCurrentAdminFromSession: async () => role ? { role, email } : null },
    '@/lib/admin-authorization': { hasAdminPermission: async () => rbac.canAccessResource(role, 'announcements', 'write') },
    '@/lib/rbac': rbac, '@/lib/announcement-creator': creators, '@/validations/announcement.validation': validation,
    '@/server/announcements/announcements': { announcementSelect: {}, mapAnnouncementRecord: (value: unknown) => value },
    '@/lib/prisma': {
      official: { findMany: async ({where}: {where: {firstName: {equals:string}; lastName:{equals:string}; isArchive:boolean;isActive:boolean}}) => {
        lookups++;lookedUp=where.firstName.equals+' '+where.lastName.equals;
        assert.equal(where.isArchive,false);assert.equal(where.isActive,true);
        return Array.from({length:matches},()=>({id:lookedUp}));
      } },
      announcement: {
        findUnique: async () => ({id:'existing',image:null,createdById:'original-official'}),
        create: async ({data}:{data:Record<string,unknown>}) => {writes++;saved=data;return data;},
        update: async ({data}:{data:Record<string,unknown>}) => {writes++;saved=data;return data;},
      },
    },
  };
  const actions=load('server/actions/announcement.actions.ts',modules) as typeof import('../server/actions/announcement.actions');
  const form=new FormData();form.set('title','Announcement');form.set('content','Content');form.set('createdById','forged-id');
  for(const denied of [null,AdminRole.HEALTH_WORKER,AdminRole.PEACE_AND_ORDER,AdminRole.PUNONG_BARANGAY]){
    role=denied;email='admin@sampalociv.com';
    assert.equal((await actions.createAnnouncementAction(form)).success,false);
    assert.equal((await actions.updateAnnouncementAction('existing',form)).success,false);
  }
  assert.equal(writes,0);assert.equal(lookups,0);
  role=AdminRole.ADMIN;email='admin@sampalociv.com';
  for(const name of ['', 'Arbitrary Official','Belen Movido']){
    form.set('creatorName',name);const result=await actions.createAnnouncementAction(form);
    assert.equal(result.success,false);assert.ok(result.fieldErrors?.creatorName);
  }
  assert.equal(writes,0);assert.equal(lookups,0);
  for(const official of creators.ANNOUNCEMENT_OFFICIALS){
    form.set('creatorName',official.name);
    assert.equal((await actions.createAnnouncementAction(form)).success,true);
    assert.equal(saved.createdById,official.firstName+' '+official.lastName);
    assert.equal((await actions.updateAnnouncementAction('existing',form)).success,true);
    assert.equal(saved.createdById,official.firstName+' '+official.lastName);
  }
  form.delete('creatorName');const beforeLookups=lookups;
  assert.equal((await actions.updateAnnouncementAction('existing',form)).success,true);
  assert.equal('createdById' in saved,false);assert.equal(lookups,beforeLookups);
  form.set('creatorName','Arbitrary Official');
  assert.equal((await actions.updateAnnouncementAction('existing',form)).success,false);
  for(const [current,address,expected] of [
    [AdminRole.ADMIN,'belen.movido@sampaloc4.gov.ph','Belen Movido'],
    [AdminRole.CLERK,'admin@sampalociv.com','Alice Joy Lopez'],
    [AdminRole.SK,'sk@example.invalid','Jedrick Narvaez'],
  ] as const){
    role=current;email=address;
    // Both a forged creator name and the old relationship ID must be ignored.
    assert.equal((await actions.createAnnouncementAction(form)).success,true);
    assert.equal(saved.createdById,expected);
    assert.equal((await actions.updateAnnouncementAction('existing',form)).success,true);
    assert.equal('createdById' in saved,false);
  }
  role=AdminRole.ADMIN;email='other-admin@example.invalid';
  assert.equal((await actions.createAnnouncementAction(form)).success,false);
  email='belen.movido@sampaloc4.gov.ph';
  for(const count of [0,2]){matches=count;const before:number=writes;assert.equal((await actions.createAnnouncementAction(form)).success,false);assert.equal(writes,before);}
  email='admin@sampalociv.com';form.set('creatorName','Imelda M. Villa');
  assert.ok((await actions.updateAnnouncementAction('existing',form)).fieldErrors?.creatorName);
  form.set('title','');assert.equal((await actions.createAnnouncementAction(form)).success,false);
});

test('official names, credential distinction and create/edit validation use the shared allowlist',()=>{
  assert.equal(creators.ANNOUNCEMENT_OFFICIALS.length,11);
  assert.equal(new Set(creators.ANNOUNCEMENT_OFFICIALS.map(o=>o.name)).size,11);
  assert.equal(creators.canSelectAnnouncementCreator({role:AdminRole.ADMIN,email:' ADMIN@SAMPALOCIV.COM '}),true);
  assert.equal(creators.canSelectAnnouncementCreator({role:AdminRole.CLERK,email:'admin@sampalociv.com'}),false);
  assert.equal(creators.canSelectAnnouncementCreator({role:AdminRole.ADMIN,email:'belen.movido@sampaloc4.gov.ph'}),false);
  assert.equal(creators.getAccountAnnouncementCreator({role:AdminRole.ADMIN,email:'belen.movido@sampaloc4.gov.ph'})?.name,'Belen P. Movido');
  assert.equal(creators.getAccountAnnouncementCreator({role:AdminRole.ADMIN,email:'admin@sampalociv.com'}),null);
  for(const official of creators.ANNOUNCEMENT_OFFICIALS)assert.equal(creators.getAnnouncementCreatorName(official),official.name);
  assert.equal(creators.getAnnouncementCreatorName({firstName:'Former',lastName:'Official'}),'Former Official');
  const input={title:'Title',content:'Content',creatorName:''};
  assert.equal(validation.announcementFormSchema(true,false).safeParse(input).success,false);
  assert.equal(validation.announcementFormSchema(true,true).safeParse(input).success,true);
  assert.equal(validation.announcementFormSchema(false,false).safeParse(input).success,true);
});

test('Admin renders a selector and Secretary/other roles render the fixed or original creator read-only',()=>{
  let role:AdminRole=AdminRole.ADMIN,email='admin@sampalociv.com';
  const modules:Record<string,unknown>={
    react:React,'@hookform/resolvers/zod':{zodResolver:()=>{}},
    '@tanstack/react-query':{useQueryClient:()=>({}),useMutation:()=>({isPending:false})},
    'lucide-react':{Upload:()=>null,X:()=>null},'next/image':{default:()=>null,__esModule:true},
    'react-hook-form':hookForm,'@/components/ui/select':selectUI,'@/lib/valid-id-image':{},'@/server/actions/announcement.actions':{},
    '@/components/providers/admin-rbac-provider':{useAdminRbac:()=>({role,email})},
    '@/lib/announcement-creator':creators,'@/validations/announcement.validation':validation,
  };
  const Component=(load('components/ui/Admin/AnnouncementModalForm.tsx',modules) as typeof import('../components/ui/Admin/AnnouncementModalForm')).default;
  const props={isOpen:true,mode:'create' as const,onClose:()=>{}};
  let html=renderToStaticMarkup(React.createElement(Component,props));
  assert.match(html,/role="combobox"/);assert.match(html,/Select an official/);assert.equal(html.includes('readOnly=""'),false);
  for(const [current,address,name] of [[AdminRole.ADMIN,'belen.movido@sampaloc4.gov.ph','Belen P. Movido'],[AdminRole.CLERK,'clerk@example.invalid','Alice Joy J. Lopez'],[AdminRole.SK,'sk@example.invalid','Jedrick Narvaez']] as const){
    role=current;email=address;html=renderToStaticMarkup(React.createElement(Component,props));
    assert.ok(html.includes('readOnly=""'));assert.ok(html.includes(name));assert.equal(html.includes('role="combobox"'),false);
  }
  const original={id:'existing',title:'Title',content:'Content',image:null,isArchive:false,createdAt:new Date().toISOString(),createdById:'former',createdBy:{firstName:'Former',lastName:'Official',position:'Former position'}};
  html=renderToStaticMarkup(React.createElement(Component,{...props,mode:'edit',initialData:original}));assert.ok(html.includes('value="Former Official"'));
  role=AdminRole.ADMIN;email='admin@sampalociv.com';
  html=renderToStaticMarkup(React.createElement(Component,{...props,mode:'edit',initialData:original}));assert.match(html,/Former Official/);assert.match(html,/role="combobox"/);
});
