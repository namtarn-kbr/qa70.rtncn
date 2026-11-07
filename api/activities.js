'use strict';
const gas=require('../lib/gas');
const {configured,pinOkay,validation,readActivities,sortRows,allowedOrigin,json,pinHeader}=require('../lib/storage');

module.exports=async(req,res)=>{
  if(req.method==='GET'){
    try{
      const data=await readActivities();
      return json(res,200,{activities:data.activities,persistent:data.persistent});
    }catch(e){console.error('GAS read failed',e.message);return json(res,503,{error:'ไม่สามารถอ่านข้อมูลจาก Google Apps Script ได้'});}
  }
  if(!['POST','PATCH'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
  if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Apps Script และรหัสลับ'});
  if(!pinOkay(pinHeader(req)))return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const data=validation(body);
    let result;
    if(req.method==='POST'){
      result=await gas.call('createActivity',{data});
    }else{
      const id=String(body.id||'');
      if(!/^[a-zA-Z0-9_-]{1,60}$/.test(id))return json(res,400,{error:'รหัสกิจกรรมไม่ถูกต้อง'});
      result=await gas.call('updateActivity',{id,data});
    }
    if(!result.activity||!Array.isArray(result.activities))throw Error('Apps Script ไม่ส่งข้อมูลกิจกรรมหลังบันทึก');
    return json(res,200,{success:true,persistent:true,activity:result.activity,activities:sortRows(result.activities)});
  }catch(e){console.error('GAS activity write failed',e.message);return json(res,400,{error:e.message});}
};
