'use strict';
const crypto=require('node:crypto');
const seed=require('../data/activities.json');
const TRACKS=['สมศ.','EdPEx','สภาการพยาบาล','AUN-QA'];
const STATUSES=['not_started','in_progress','done'];
const sheets=require('./sheets');
const configured=()=>sheets.configured()&&Boolean(process.env.EDIT_PIN||process.env.ADMIN_PIN);
const pinOkay=pin=>{
  if(typeof pin!=='string'||!(process.env.EDIT_PIN||process.env.ADMIN_PIN))return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(pin).digest(),crypto.createHash('sha256').update((process.env.EDIT_PIN||process.env.ADMIN_PIN)).digest());
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

async function readActivities(){
  if(!configured())return {activities:sortRows(seed),persistent:false};
  const [activityRows,attachmentRows]=await Promise.all([
    sheets.getRows('Activities','L'),sheets.getRows('Attachments','I')
  ]);
  const docs=new Map();
  for(const entry of attachmentRows){
    const a=entry.values;
    const activityId=String(a[1]||'');
    if(!activityId||!a[0])continue;
    if(!docs.has(activityId))docs.set(activityId,[]);
    docs.get(activityId).push({id:String(a[0]),kind:'link',name:String(a[2]||''),url:String(a[3]||'')});
  }
  const activities=activityRows.map(entry=>{
    const r=entry.values;
    return {id:String(r[0]||''),track:String(r[1]||''),name:String(r[2]||''),detail:String(r[3]||''),startDate:sheets.toISO(r[4]),endDate:sheets.toISO(r[5]),owner:String(r[6]||''),status:String(r[7]||'not_started'),attachments:docs.get(String(r[0]))||[]};
  }).filter(a=>a.id&&a.startDate&&a.endDate);
  return {activities:sortRows(activities),persistent:true};
}
const allowedOrigin=req=>{const origin=req.headers.origin;if(!origin)return true;try{const host=new URL(origin).host;return host===req.headers.host||host===req.headers['x-forwarded-host']}catch{return false}};
const json=(res,code,payload)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(code).json(payload)};
const pinHeader=req=>req.headers['x-admin-pin'];
module.exports={configured,pinOkay,sortRows,validation,readActivities,allowedOrigin,json,pinHeader};
