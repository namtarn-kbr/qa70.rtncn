'use strict';
const crypto=require('node:crypto');
const {configured,pinOkay,sortRows,validation,readActivities,updateActivities,allowedOrigin,json,pinHeader}=require('../lib/storage');
module.exports=async (req,res)=>{
 if(req.method==='GET'){
  try{const data=await readActivities();return json(res,200,{activities:data.activities,persistent:data.persistent})}
  catch(e){return json(res,503,{error:e.message})}
 }
 if(!['POST','PATCH'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
 if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์สำหรับบันทึก'});
 if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const fields=validation(body);
  const id=req.method==='PATCH'?String(body.id||''):crypto.randomUUID();
  if(req.method==='PATCH'&&!id)return json(res,400,{error:'ไม่พบรหัสกิจกรรม'});
  const activities=await updateActivities(rows=>{
   if(req.method==='PATCH'){
    if(!rows.some(x=>String(x.id)===id))throw Error('ไม่พบกิจกรรม');
    return rows.map(x=>String(x.id)===id?{...x,...fields}:x);
   }
   return [...rows,{...fields,id,attachments:[]}];
  });
  return json(res,200,{success:true,activity:activities.find(x=>String(x.id)===id),activities,persistent:true});
 }catch(e){return json(res,400,{error:e.message})}
};
