"use client";

import { useMemo, useState } from "react";

type DeliverableDraft = {
  title: string;
  description: string;
  type: string;
  required: boolean;
  deadline: string;
  rewardAmount: string;
  instructions: string;
  requiredText: string;
  destinationUrl: string;
  trackingUrl: string;
  contentRequirements: string;
  prohibitedModifications: string;
  timing: string;
  submissionRequirements: string;
};

const blank = (): DeliverableDraft => ({title:"",description:"",type:"other",required:true,deadline:"",rewardAmount:"",instructions:"",requiredText:"",destinationUrl:"",trackingUrl:"",contentRequirements:"",prohibitedModifications:"",timing:"",submissionRequirements:""});

export function DeliverablesEditor({ initial = [] }: { initial?: Partial<DeliverableDraft>[] }) {
  const [rows, setRows] = useState<DeliverableDraft[]>(initial.length ? initial.map(v => ({...blank(), ...v})) : [blank()]);
  const value = useMemo(() => JSON.stringify(rows.filter(r => r.title.trim()).map(r => ({
    ...r,
    title:r.title.trim(), description:r.description.trim(), rewardAmount:r.rewardAmount.trim() || null,
  }))), [rows]);
  const patch = (index:number, key:keyof DeliverableDraft, value:string|boolean) => setRows(current => current.map((row,i) => i === index ? {...row,[key]:value} : row));
  return <div className="full" style={{display:"grid",gap:12}}>
    <input type="hidden" name="deliverablesJson" value={value}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><p className="eyebrow">DELIVERABLES</p><strong>Tasks community admins must complete</strong><p className="form-note">Keep each task specific. Required tasks must be approved before the participation can earn its committed reward.</p></div><button type="button" className="admin-secondary" onClick={() => setRows(r => [...r,blank()])}>+ Add task</button></div>
    {rows.map((row,index)=><article key={index} style={{border:"1px solid var(--line)",borderRadius:12,padding:14,display:"grid",gap:10,background:"var(--surface)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><strong>Deliverable {index+1}</strong>{rows.length>1&&<button type="button" className="admin-danger" onClick={() => setRows(r => r.filter((_,i)=>i!==index))}>Remove</button>}</div>
      <div className="form-grid" style={{marginTop:0}}>
        <label>Title<input required={index===0} value={row.title} onChange={e=>patch(index,"title",e.target.value)} /></label>
        <label>Type<select value={row.type} onChange={e=>patch(index,"type",e.target.value)}><option value="post_message">Post campaign message</option><option value="share_link">Share campaign link</option><option value="instagram_story">Instagram story</option><option value="whatsapp_post">WhatsApp post</option><option value="telegram_post">Telegram post</option><option value="discord_announcement">Discord announcement</option><option value="screenshot_proof">Screenshot proof</option><option value="url_proof">URL proof</option><option value="other">Other</option></select></label>
        <label>Deadline<input type="datetime-local" value={row.deadline} onChange={e=>patch(index,"deadline",e.target.value)} /></label>
        <label>Reward allocation (optional)<input type="number" min="0" step="0.01" value={row.rewardAmount} onChange={e=>patch(index,"rewardAmount",e.target.value)} placeholder="Leave blank to use campaign reward" /></label>
        <label className="check-row"><input type="checkbox" checked={row.required} onChange={e=>patch(index,"required",e.target.checked)} /> Required</label>
        <label className="full">Description<textarea rows={2} value={row.description} onChange={e=>patch(index,"description",e.target.value)} /></label>
        <label className="full">Instructions<textarea rows={3} value={row.instructions} onChange={e=>patch(index,"instructions",e.target.value)} placeholder="What exactly should the admin do?" /></label>
        <label>Required text<textarea rows={2} value={row.requiredText} onChange={e=>patch(index,"requiredText",e.target.value)} /></label>
        <label>Timing<textarea rows={2} value={row.timing} onChange={e=>patch(index,"timing",e.target.value)} /></label>
        <label>Destination URL<input type="url" value={row.destinationUrl} onChange={e=>patch(index,"destinationUrl",e.target.value)} /></label>
        <label>Tracking URL<input type="url" value={row.trackingUrl} onChange={e=>patch(index,"trackingUrl",e.target.value)} /></label>
        <label>Content requirements<textarea rows={2} value={row.contentRequirements} onChange={e=>patch(index,"contentRequirements",e.target.value)} /></label>
        <label>Prohibited modifications<textarea rows={2} value={row.prohibitedModifications} onChange={e=>patch(index,"prohibitedModifications",e.target.value)} /></label>
        <label className="full">Submission requirements<textarea rows={2} value={row.submissionRequirements} onChange={e=>patch(index,"submissionRequirements",e.target.value)} placeholder="Screenshot, URL, note, etc." /></label>
      </div>
    </article>)}
  </div>;
}
