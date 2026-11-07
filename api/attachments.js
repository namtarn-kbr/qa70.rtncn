'use strict';
const crypto=require('node:crypto');
const sheets=require('../lib/sheets');
const {configured,pinOkay,readActivities,allowedOrigin,json,pinHeader}=require('../lib/storage');
function safeDriveUrl(raw) {
  let url;
  try{url=new URL(String(raw||''))}catch{throw Error('โปรดระบุลิงก์ Google Drive ที่ถูกต้อง')}
  if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname))throw Error('รองรับเฉพาะลิงก์ Google Drive หรือ Google Docs');
  return url.toString();
}
module.exports=async(req,res)=>{
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
  if(!configured())return json(res,503,{error:'Google Sheets ยังไม่เชื่อมต่อครบถ้วน'});
  if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!b||typeof b!=='object')throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
    const activityId=String(b.activityId||'');
    const action=String(b.action||'');
    const name=String(b.name||'').trim();
    if(!/^[a-zA-Z0-9_-]{1,60}$/.test(activityId))throw Error('Activity ID ไม่ถูกต้อง');
    if(!['addLink','rename','delete','replace'].includes(action))throw Error('โปรดอัปโหลดเอกสารไว้ใน Google Drive แล้วเพิ่มลิงก์แทน');
    if(['addLink','rename','replace'].includes(action)&&(!name||name.length>180))throw Error('ชื่อเอกสารต้องมีความยาว 1–180 ตัวอักษร');
    const activities=await sheets.getRows('Activities','A');
    if(!activities.some(x=>String(x.values[0])===activityId))return json(res,404,{error:'ไม่พบกิจกรรม'});
    const docs=(await sheets.getRows('Attachments','I')).filter(x=>String(x.values[1])===activityId);
    const now=sheets.nowSerial();
    let before=null,after=null,entityId='';
    if(action==='addLink'){
      const url=safeDriveUrl(b.url);
      entityId=crypto.randomUUID();
      after={name,url};
      await sheets.appendRow('Attachments','I',[entityId,activityId,name,url,'Google Drive',now,'ผู้ดูแลผ่านรหัส',now,'']);
    }else{
      const index=Number(b.index);
      if(!Number.isInteger(index)||index<0||index>=docs.length)throw Error('ไม่พบเอกสารที่ต้องการแก้ไข');
      const target=docs[index],v=target.values;
      entityId=String(v[0]);
      before={name:String(v[2]||''),url:String(v[3]||'')};
      if(action==='delete'){
        await sheets.clearRow('Attachments',target.row,'I');
      }else{
        const url=action==='replace'?safeDriveUrl(b.url):String(v[3]||'');
        after={name,url};
        await sheets.updateRow('Attachments',target.row,'I',[entityId,activityId,name,url,String(v[4]||'Google Drive'),typeof v[5]==='number'?v[5]:now,String(v[6]||'ผู้ดูแลผ่านรหัส'),now,String(v[8]||'')]);
      }
    }
    await sheets.audit(action.toUpperCase()+'_LINK','Attachments',entityId,before,after);
    const data=await readActivities();
    return json(res,200,{success:true,activities:data.activities,persistent:true});
  }catch(err){
    console.error('Attachment update failed',err.message);
    return json(res,err.message.includes('Google Sheets API')||err.message.includes('authentication failed')?503:400,{error:err.message});
  }
};
