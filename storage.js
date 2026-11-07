'use strict';
const crypto=require('node:crypto');
const seed=require('../data/activities.json');
const TRACKS=['สมศ.','EdPEx','สภาการพยาบาล','AUN-QA'];
const STATUSES=['not_started','in_progress','done'];
const branch=()=>process.env.GITHUB_BRANCH||'main';
const configured=()=>Boolean(process.env.GITHUB_TOKEN&&process.env.GITHUB_OWNER&&process.env.GITHUB_REPO&&process.env.ADMIN_PIN);
const pinOkay=pin=>{
  if(typeof pin!=='string'||!process.env.ADMIN_PIN)return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(pin).digest(),crypto.createHash('sha256').update(process.env.ADMIN_PIN).digest());
};
const sortRows=rows=>[...rows].sort((a,b)=>a.startDate.localeCompare(b.startDate)||String(a.id).localeCompare(String(b.id)));
const dateOkay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const inPeriod=s=>dateOkay(s)&&s>='2026-10-01'&&s<='2027-09-30';
const validation=body=>{
  if(!body||typeof body!=='object')throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
  const name=String(body.name||'').trim();const detail=String(body.detail||'').trim();
  const owner=String(body.owner||'').trim();const track=String(body.track||'');
  const status=String(body.status||'not_started');const startDate=String(body.startDate||'');const endDate=String(body.endDate||'');
  if(!name||name.length>180)throw Error('ชื่อรายการต้องมีความยาว 1–180 ตัวอักษร');
  if(detail.length>5000)throw Error('รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร');
  if(!owner||owner.length>300)throw Error('กรุณาระบุผู้รับผิดชอบ');
  if(!TRACKS.includes(track))throw Error('ประเภทแผนไม่ถูกต้อง');
  if(!STATUSES.includes(status))throw Error('สถานะไม่ถูกต้อง');
  if(!inPeriod(startDate)||!inPeriod(endDate)||startDate>endDate)throw Error('กรุณาเลือกวันที่ภายใน ต.ค. 2569–ก.ย. 2570 และวันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
  return {name,detail,owner,track,status,startDate,endDate};
};
function ghUrl(path,queryBranch=true){
 const owner=encodeURIComponent(process.env.GITHUB_OWNER),repo=encodeURIComponent(process.env.GITHUB_REPO);
 return `https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`+(queryBranch?`?ref=${encodeURIComponent(branch())}`:'');
}
const headers={get Authorization(){return `Bearer ${process.env.GITHUB_TOKEN}`;},'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'rtncn-qa70'};
async function ghRead(path){
 const r=await fetch(ghUrl(path),{headers,cache:'no-store'});
 if(r.status===404)return null;
 if(!r.ok)throw Error(`GitHub API อ่านข้อมูลไม่สำเร็จ (${r.status})`);
 const d=await r.json();if(!d.sha)throw Error('ข้อมูล GitHub ไม่ครบถ้วน');
 let encoded=d.content;
 if(!encoded){
   const owner=encodeURIComponent(process.env.GITHUB_OWNER),repo=encodeURIComponent(process.env.GITHUB_REPO);
   const blob=await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${encodeURIComponent(d.sha)}`,{headers,cache:'no-store'});
   if(!blob.ok)throw Error(`GitHub อ่านไฟล์ขนาดใหญ่ไม่สำเร็จ (${blob.status})`);
   const body=await blob.json();encoded=body.content;
 }
 if(typeof encoded!=='string')throw Error('GitHub ไม่คืนเนื้อหาไฟล์');
 return {data:Buffer.from(encoded.replace(/\s/g,''),'base64'),sha:d.sha};
}
async function ghPut(path,buffer,sha,message){
 const body={message,content:Buffer.from(buffer).toString('base64'),branch:branch()};if(sha)body.sha=sha;
 const r=await fetch(ghUrl(path,false),{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if([409,422].includes(r.status))return false;
 if(!r.ok){let message='';try{message=(await r.json()).message||''}catch{}throw Error(`GitHub บันทึกไม่สำเร็จ (${r.status}) ${message}`)}
 return true;
}
async function ghDelete(path,sha){
 const r=await fetch(ghUrl(path,false),{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'chore(qa): remove attachment blob',sha,branch:branch()})});
 if(!r.ok)throw Error(`GitHub ลบไฟล์ไม่สำเร็จ (${r.status})`);
}
async function readActivities(){
 if(!configured())return {activities:sortRows(seed),sha:null,persistent:false};
 const result=await ghRead('data/activities.json');
 if(!result)throw Error('ไม่พบ data/activities.json ใน GitHub');
 let activities=JSON.parse(result.data.toString('utf8'));
 if(!Array.isArray(activities))throw Error('ข้อมูลกิจกรรมใน GitHub ไม่ถูกต้อง');
 return {activities:sortRows(activities),sha:result.sha,persistent:true};
}
async function updateActivities(transform){
 if(!configured())throw Error('ยังไม่ได้ตั้งค่า GitHub Token และรหัส ADMIN_PIN');
 for(let tries=0;tries<3;tries++){
  const current=await readActivities();const next=transform(current.activities);
  if(!Array.isArray(next))throw Error('ข้อมูลรายการดำเนินงานไม่ถูกต้อง');
  if(await ghPut('data/activities.json',JSON.stringify(sortRows(next),null,2)+'\n',current.sha,'chore(qa): update QA2570 plan'))return sortRows(next);
 }
 throw Error('มีผู้แก้ไขข้อมูลพร้อมกัน กรุณาลองใหม่อีกครั้ง');
}
const allowedOrigin=req=>{const origin=req.headers.origin;if(!origin)return true;try{const host=new URL(origin).host;return host===req.headers.host||host===req.headers['x-forwarded-host']}catch{return false}};
const json=(res,code,payload)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(code).json(payload)};
const pinHeader=req=>req.headers['x-admin-pin'];
module.exports={configured,pinOkay,sortRows,validation,readActivities,updateActivities,allowedOrigin,json,pinHeader,ghRead,ghPut,ghDelete};
