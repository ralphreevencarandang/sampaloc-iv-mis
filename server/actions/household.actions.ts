"use server";
import prisma from "@/lib/prisma";
import { getCurrentAdminFromSession } from "@/lib/admin-session";
import { AdminRole } from "@/app/generated/prisma/enums";
import { householdRelationships } from "@/validations/household.validation";
import { z } from "zod";
import { revalidatePath } from "next/cache";

async function staff() { const admin = await getCurrentAdminFromSession(); return admin && (admin.role === AdminRole.ADMIN || admin.role === AdminRole.CLERK) ? admin : null; }
export async function searchHouseholdsAction(query: string) {
 if (!await staff()) return { success:false as const, message:"You do not have permission to view households." };
 const q = query.trim();
 const rows = await prisma.household.findMany({ where:q ? { OR:[{number:{contains:q,mode:"insensitive"}},{members:{some:{isHead:true,removedAt:null,OR:[{firstName:{contains:q,mode:"insensitive"}},{lastName:{contains:q,mode:"insensitive"}}]}}}] } : {}, orderBy:{createdAt:"desc"}, take:100, include:{members:{where:{removedAt:null},include:{resident:{select:{id:true,firstName:true,middleName:true,lastName:true,street:true,houseNumber:true,subdivision:true,phase:true}}},orderBy:{createdAt:"asc"}}} });
 return { success:true as const, households:rows };
}
const householdIdSchema = z.string().cuid();
export async function getHouseholdDetailsAction(householdId: string) {
 if (!await staff()) return { success:false as const, message:"You do not have permission to view households.", notFound:false as const };
 const parsed = householdIdSchema.safeParse(householdId);
 if (!parsed.success) return { success:false as const, message:"Household not found.", notFound:true as const };
 const household = await prisma.household.findUnique({
   where:{id:parsed.data},
   include:{members:{where:{removedAt:null},include:{resident:{select:{id:true,firstName:true,middleName:true,lastName:true,birthDate:true,gender:true,contactNumber:true,street:true,houseNumber:true,subdivision:true,phase:true}}},orderBy:[{isHead:"desc"},{createdAt:"asc"}] }},
 });
 return household ? {success:true as const,household} : {success:false as const,message:"Household not found.",notFound:true as const};
}
export async function searchUnlinkedResidentsAction(query:string){
 if(!await staff())return {success:false as const,message:"You do not have permission to view residents."};
 const q=query.trim(); if(q.length<2)return {success:true as const,residents:[]};
 const residents=await prisma.resident.findMany({where:{isArchived:false,OR:[{firstName:{contains:q,mode:"insensitive"}},{lastName:{contains:q,mode:"insensitive"}}],householdMemberships:{none:{removedAt:null}}},select:{id:true,firstName:true,middleName:true,lastName:true},take:20,orderBy:{lastName:"asc"}});
 return {success:true as const,residents};
}
const attachSchema=z.object({ householdId:z.string().min(1), residentId:z.string().min(1), relationship:z.enum(householdRelationships).refine(r=>r!=="Head"), otherRelationship:z.string().trim().max(100).optional() });
export async function attachResidentToHouseholdAction(input: unknown) {
 if (!await staff()) return {success:false,message:"You do not have permission to manage households."};
 const p=attachSchema.safeParse(input); if(!p.success)return {success:false,message:"Select a resident and valid relationship."};
 try { await prisma.$transaction(async tx=>{
   const resident=await tx.resident.findUnique({where:{id:p.data.residentId},select:{id:true,firstName:true,middleName:true,lastName:true,birthDate:true,gender:true,contactNumber:true}});
   const household=await tx.household.findUnique({where:{id:p.data.householdId}}); if(!resident||!household)throw new Error("NOT_FOUND");
   if(await tx.householdMember.findFirst({where:{residentId:resident.id,removedAt:null}}))throw new Error("ALREADY_LINKED");
   await tx.householdMember.create({data:{householdId:household.id,residentId:resident.id,firstName:resident.firstName,middleName:resident.middleName,lastName:resident.lastName,birthDate:resident.birthDate,sex:resident.gender,contactNumber:resident.contactNumber,relationship:p.data.relationship,otherRelationship:p.data.relationship==="Other"?p.data.otherRelationship:null}});
 }); revalidatePath("/admin/households"); return {success:true,message:"Resident added to household."}; }
 catch(e){return {success:false,message:e instanceof Error&&e.message==="ALREADY_LINKED"?"This resident already belongs to an active household.":"Unable to add resident to household."};}
}
export async function removeHouseholdMemberAction(memberId:string) {
 if (!await staff()) return {success:false,message:"You do not have permission to manage households."};
 const member=await prisma.householdMember.findFirst({where:{id:memberId,removedAt:null}}); if(!member)return {success:false,message:"Household member not found."};
 if(member.isHead)return {success:false,message:"Assign another household head before removing the current head."};
 await prisma.householdMember.update({where:{id:memberId},data:{removedAt:new Date()}}); revalidatePath("/admin/households"); return {success:true,message:"Member removed. The resident account was preserved."};
}
const headSchema=z.object({householdId:z.string().min(1),memberId:z.string().min(1)});
export async function assignHouseholdHeadAction(input:unknown){
 if(!await staff())return {success:false,message:"You do not have permission to manage households."};
 const p=headSchema.safeParse(input);if(!p.success)return {success:false,message:"Select a valid household member."};
 try{await prisma.$transaction(async tx=>{
   const member=await tx.householdMember.findFirst({where:{id:p.data.memberId,householdId:p.data.householdId,removedAt:null}});if(!member)throw new Error("NOT_FOUND");
   const currentHead=await tx.householdMember.findFirst({where:{householdId:p.data.householdId,isHead:true,removedAt:null}});
   const currentMembers=await tx.householdMember.findMany({where:{householdId:p.data.householdId,removedAt:null}});
   const currentHeadName=currentHead?[currentHead.firstName,currentHead.lastName].join(" "):"the previous household head";
   for(const existing of currentMembers){
     if(existing.id===member.id)continue;
     const previousRelation=existing.isHead?"Former household head":`Previously ${existing.relationship==="Other"?existing.otherRelationship??"Other":existing.relationship} to ${currentHeadName}; update relationship to new head.`;
     await tx.householdMember.update({where:{id:existing.id},data:{isHead:false,relationship:"Other",otherRelationship:previousRelation}});
   }
   await tx.householdMember.update({where:{id:member.id},data:{isHead:true,relationship:"Head",otherRelationship:null}});
 });revalidatePath("/admin/households");return {success:true,message:"Household head updated. Review other members’ relationships to the new head."}}catch{return {success:false,message:"Unable to assign household head."}}
}

const updateMemberSchema=z.object({memberId:z.string().cuid(),relationship:z.enum(householdRelationships),otherRelationship:z.string().trim().max(100).optional().default("")}).superRefine((v,ctx)=>{
 if(v.relationship==="Head")ctx.addIssue({code:"custom",path:["relationship"],message:"Use Make head to change the household head."});
 if(v.relationship==="Other"&&!v.otherRelationship.trim())ctx.addIssue({code:"custom",path:["otherRelationship"],message:"Specify the relationship."});
});
export async function updateHouseholdMemberAction(input:unknown){
 if(!await staff())return {success:false,message:"You do not have permission to manage households."};
 const parsed=updateMemberSchema.safeParse(input);if(!parsed.success)return {success:false,message:parsed.error.issues[0]?.message??"Enter valid member details."};
 const member=await prisma.householdMember.findFirst({where:{id:parsed.data.memberId,removedAt:null}});if(!member)return {success:false,message:"Household member not found."};
 if(member.isHead)return {success:false,message:"The household head relationship cannot be changed here."};
 await prisma.householdMember.update({where:{id:member.id},data:{relationship:parsed.data.relationship,otherRelationship:parsed.data.relationship==="Other"?parsed.data.otherRelationship.trim():null}});
 revalidatePath(`/admin/households/${member.householdId}`);revalidatePath("/admin/households");return {success:true,message:"Household relationship updated."};
}
