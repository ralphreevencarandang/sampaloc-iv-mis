"use client";
import { Plus, Trash2 } from "lucide-react";
import { householdRelationships } from "@/validations/household.validation";

export type HouseholdDraftMember = { firstName: string; middleName: string; lastName: string; suffix: string; birthDate: string; sex: string; relationship: typeof householdRelationships[number]; otherRelationship: string; contactNumber: string; isHead: boolean; residentId: string };
export type HouseholdDraft = { enabled: boolean; isHead: boolean; householdNumber: string; relationship: typeof householdRelationships[number]; otherRelationship: string; members: HouseholdDraftMember[] };
export const emptyHousehold: HouseholdDraft = { enabled: false, isHead: true, householdNumber: "", relationship: "Head", otherRelationship: "", members: [] };
const relations = householdRelationships;
const input = "w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary-500";
export default function HouseholdRegistrationFields({ value, onChange }: { value: HouseholdDraft; onChange: (value: HouseholdDraft) => void }) {
 const set = (patch: Partial<HouseholdDraft>) => onChange({ ...value, ...patch });
 const updateMember = (index: number, patch: Partial<HouseholdDraftMember>) => set({ members: value.members.map((m, i) => i === index ? { ...m, ...patch } : m) });
 const addMember = () => set({ members: [...value.members, { firstName:"", middleName:"", lastName:"", suffix:"", birthDate:"", sex:"", relationship:"Other", otherRelationship:"", contactNumber:"", isHead:false, residentId:"" }] });
 return <section className="space-y-4 rounded-lg border border-outline p-4">
  <h2 className="text-lg font-semibold text-content">Household &amp; Family Information</h2>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.enabled} onChange={e => set({ enabled:e.target.checked })}/> Include household information (optional)</label>
  {value.enabled && <>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.isHead} onChange={e => set({ isHead:e.target.checked, relationship:e.target.checked ? "Head" : "Spouse" })}/> Is this resident the household head?</label>
   <p className="text-sm text-content-muted">Household Number: assigned automatically after registration. To link this resident to an existing household, an authorized staff member can do so in Household Management.</p>
   {!value.isHead && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Relationship to Household Head<select className={input} aria-label="Relationship to household head" value={value.relationship} onChange={e=>set({relationship:e.target.value as HouseholdDraft["relationship"]})}>{relations.filter(r=>r!=="Head").map(r=><option key={r}>{r}</option>)}</select></label>{value.relationship === "Other" && <label className="space-y-1 text-sm">Specify relationship<input className={input} value={value.otherRelationship} onChange={e=>set({otherRelationship:e.target.value})}/></label>}</div>}
   <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-medium text-content">Family members</h3><button type="button" onClick={addMember} className="inline-flex items-center gap-2 rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700"><Plus className="h-4 w-4"/>Add Family Member</button></div>
    {value.members.map((m,i)=><fieldset key={i} className="space-y-3 rounded-lg border border-outline p-3"><div className="flex items-center justify-between"><legend className="text-sm font-semibold">Family member {i+1}</legend><button aria-label={`Remove family member ${i+1}`} type="button" onClick={()=>set({members:value.members.filter((_,j)=>j!==i)})} className="text-primary-700"><Trash2 className="h-4 w-4"/></button></div>
     {m.isHead && <p className="text-sm text-content-muted">Household head</p>}
     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(["firstName","middleName","lastName","suffix","birthDate","sex","contactNumber"] as const).map(field=><label key={field} className="space-y-1 text-sm">{field === "birthDate" ? "Birth Date" : field === "sex" ? "Sex" : field === "contactNumber" ? "Contact Number (optional)" : `${field.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase())}${field === "middleName" || field === "suffix" ? " (optional)" : ""}`} {field === "sex" ? <select required className={input} value={m.sex} onChange={e=>updateMember(i,{sex:e.target.value})}><option value="">Select sex</option><option>Male</option><option>Female</option><option>Other</option></select> : <input className={input} type={field === "birthDate" ? "date" : field === "contactNumber" ? "tel" : "text"} required={["firstName","lastName","birthDate"].includes(field)} value={m[field]} onChange={e=>updateMember(i,{[field]:e.target.value})}/>}</label>)}
      <label className="space-y-1 text-sm">Relationship to Household Head<select className={input} value={m.relationship} onChange={e=>updateMember(i,{relationship:e.target.value as HouseholdDraftMember["relationship"]})}>{relations.map(r=><option key={r}>{r}</option>)}</select></label>
      {m.relationship === "Other" && <label className="space-y-1 text-sm">Specify relationship<input required className={input} value={m.otherRelationship} onChange={e=>updateMember(i,{otherRelationship:e.target.value})}/></label>}
     </div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={m.isHead} onChange={e=>updateMember(i,{isHead:e.target.checked,relationship:e.target.checked?"Head":m.relationship === "Head" ? "Other" : m.relationship})}/>This family member is the household head</label>
    </fieldset>)}
    {!value.isHead && !value.members.some(member=>member.isHead) && <p className="text-sm text-stock-empty-text">Add and mark the household head to continue.</p>}
   </div>
  </>}
 </section>
}
