'use strict';
const gas=require('../lib/gas');
const {configured,pinOkay,sortRows,allowedOrigin,json,pinHeader}=require('../lib/storage');

function safeDriveUrl(raw){
  let url;
  try{url=new URL(String(raw||''))}catch{throw Error('โปรดระบุลิงก์ Google Drive ที่ถูกต้อง')}
  if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname))throw Error('รองรับเฉพาะลิงก์ Google Drive / Google Docs');
  return url.toString();
}

module.exports=async(req,res)=>{
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
  if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Apps Script และรหัสลับ'});
  if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!b||typeof b!=='object')throw Error('ข้อมูลเอกสารไม่ถูกต้อง');
    const activityId=String(b.activityId||''),action=String(b.action||'');
    if(!/^[a-zA-Z0-9_-]{1,60}$/.test(activityId))throw Error('รหัสกิจกรรมไม่ถูกต้อง');
    const actionMap={addLink:'addLink',rename:'renameLink',replace:'replaceLink',delete:'deleteLink'};
    if(!Object.hasOwn(actionMap,action))throw Error('รองรับเฉพาะลิงก์ Google Drive ไม่รองรับการอัปโหลดไฟล์เข้าเว็บไซต์');
    const args={activityId};
    if(action!=='delete'){
      args.name=String(b.name||'').trim();
      if(!args.name||args.name.length>180||args.name.startsWith('='))throw Error('ชื่อเอกสารไม่ถูกต้อง');
    }
    if(['addLink','replace'].includes(action))args.url=safeDriveUrl(b.url);
    if(action!=='addLink'){
      const index=Number(b.index);
      if(!Number.isInteger(index)||index<0)throw Error('ลำดับเอกสารไม่ถูกต้อง');
      args.index=index;
    }
    const result=await gas.call(actionMap[action],args);
    if(!Array.isArray(result.activities))throw Error('Apps Script ไม่ส่งข้อมูลหลังแก้ไขเอกสาร');
    return json(res,200,{success:true,persistent:true,activities:sortRows(result.activities)});
  }catch(e){console.error('GAS attachment update failed',e.message);return json(res,400,{error:e.message});}
};
