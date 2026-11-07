'use strict';
const crypto=require('node:crypto');
const sheets=require('../lib/sheets');
const {configured,pinOkay,validation,readActivities,allowedOrigin,json,pinHeader}=require('../lib/storage');

module.exports=async(req,res)=>{
  if(req.method==='GET'){
    try{
      const data=await readActivities();
      return json(res,200,{activities:data.activities,persistent:data.persistent});
    }catch(err){console.error('Activities read error',err.message);return json(res,503,{error:'ยังไม่สามารถอ่านฐานข้อมูล Google Sheets ได้'});}
  }
  if(!['POST','PATCH'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
  if(!configured())return json(res,503,{error:'Google Sheets ยังไม่เชื่อมต่อครบถ้วน'});
  if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const fields=validation(body);
    const now=sheets.nowSerial();
    let id=String(body.id||'');
    if(req.method==='POST'){
      id=crypto.randomUUID();
      const values=[id,fields.track,fields.name,fields.detail,sheets.toSerial(fields.startDate),sheets.toSerial(fields.endDate),fields.owner,fields.status,2570,now,now];
      await sheets.appendRow('Activities','K',values);
      await sheets.audit('CREATE_ACTIVITY','Activities',id,null,fields);
    }else{
      if(!id) return json(res,400,{error:'ไม่พบรหัสกิจกรรม'});
      const rows=await sheets.getRows('Activities','L');
      const row=rows.find(entry=>String(entry.values[0])===id);
      if(!row)return json(res,404,{error:'ไม่พบกิจกรรม'});
      const before={track:row.values[1],name:row.values[2],detail:row.values[3],startDate:sheets.toISO(row.values[4]),endDate:sheets.toISO(row.values[5]),owner:row.values[6],status:row.values[7]};
      const originalCreated=typeof row.values[9]==='number'?row.values[9]:now;
      const values=[id,fields.track,fields.name,fields.detail,sheets.toSerial(fields.startDate),sheets.toSerial(fields.endDate),fields.owner,fields.status,2570,originalCreated,now];
      await sheets.updateRow('Activities',row.row,'K',values);
      await sheets.audit('UPDATE_ACTIVITY','Activities',id,before,fields);
    }
    const {activities}=await readActivities();
    return json(res,200,{success:true,activity:activities.find(x=>x.id===id),activities,persistent:true});
  }catch(err){
    console.error('Activity write failed',err.message);
    return json(res,err.message.includes('Google Sheets API')||err.message.includes('authentication failed')?503:400,{error:err.message});
  }
};
