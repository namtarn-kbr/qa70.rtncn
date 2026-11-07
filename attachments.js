'use strict';
const crypto=require('node:crypto');
const {configured,pinOkay,readActivities,updateActivities,allowedOrigin,json,pinHeader,ghPut,ghRead,ghDelete}=require('../lib/storage');
const limit=2*1024*1024;
function safeUrl(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(u.hostname))throw Error('กรุณาใช้ลิงก์เอกสาร Google Drive');
 return u.toString();
}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
 if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์สำหรับบันทึก'});
 if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
 try{
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||typeof b!=='object')throw Error('ข้อมูลเอกสารไม่ถูกต้อง');
  const activityId=String(b.activityId||'');const action=String(b.action||'');
  const name=String(b.name||'').trim();
  if(!/^[a-zA-Z0-9_-]{1,60}$/.test(activityId))throw Error('รหัสกิจกรรมไม่ถูกต้อง');
  if(!['addLink','rename','delete','upload','replace'].includes(action))throw Error('ไม่รองรับการแก้ไขเอกสารรูปแบบนี้');
  if(['addLink','rename','upload','replace'].includes(action)&&(!name||name.length>180))throw Error('ชื่อเอกสารต้องมีความยาว 1–180 ตัวอักษร');
  let target=undefined;let previous=undefined;
  if(['upload','replace'].includes(action)){
   if(!/^[a-zA-Z0-9+/]+={0,2}$/.test(b.contentBase64||''))throw Error('รูปแบบไฟล์ไม่ถูกต้อง');
   const bytes=Buffer.from(b.contentBase64,'base64');
   if(bytes.length<1||bytes.length>limit)throw Error('ไฟล์ต้องมีขนาดไม่เกิน 2 MB โปรดใช้ Google Drive สำหรับไฟล์ขนาดใหญ่');
   const path=`data/evidence/${activityId}/${crypto.randomUUID()}.bin`;
   const success=await ghPut(path,bytes,null,'chore(qa): upload evidence');
   if(!success)throw Error('ไม่สามารถสร้างไฟล์แนบได้');
   const mime=String(b.mimeType||'application/octet-stream').slice(0,100);
   target={id:crypto.randomUUID(),name,kind:'file',path,url:'/api/download?path='+encodeURIComponent(path),mimeType:mime,size:bytes.length};
  }
  const activities=await updateActivities(rows=>rows.map(a=>{
   if(String(a.id)!==activityId)return a;
   const docs=[...(a.attachments||[])];const idx=Number(b.index);
   if(['rename','delete','replace'].includes(action)&&(!Number.isInteger(idx)||idx<0||idx>=docs.length))throw Error('ไม่พบเอกสารที่ต้องการแก้ไข');
   if(action==='addLink')docs.push({id:crypto.randomUUID(),name,kind:'link',url:safeUrl(String(b.url||''))});
   if(action==='upload')docs.push(target);
   if(action==='rename')docs[idx]={...docs[idx],name};
   if(action==='replace'){previous=docs[idx];docs[idx]=target;}
   if(action==='delete'){previous=docs[idx];docs.splice(idx,1)}
   return {...a,attachments:docs};
  }));
  if(!activities.some(a=>String(a.id)===activityId))throw Error('ไม่พบกิจกรรม');
  // Best-effort blob cleanup after metadata update. GitHub history still retains past versions.
  if(previous?.path){try{const file=await ghRead(previous.path);if(file)await ghDelete(previous.path,file.sha)}catch(e){console.error('Orphan blob cleanup failed',e.message)}}
  return json(res,200,{success:true,activities,persistent:true});
 }catch(e){return json(res,400,{error:e.message})}
};
