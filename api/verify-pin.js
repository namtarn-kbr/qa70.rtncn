'use strict';
const {configured,pinOkay,allowedOrigin,json}=require('../lib/storage');
const recent=new Map();
module.exports=async(req,res)=>{
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!allowedOrigin(req))return json(res,403,{error:'Origin ไม่ได้รับอนุญาต'});
 if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์สำหรับบันทึก'});
 const ip=String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'unknown').split(',')[0].trim();
 const now=Date.now();let attempt=recent.get(ip)||{n:0,t:now};if(now-attempt.t>900000)attempt={n:0,t:now};
 if(attempt.n>=6)return json(res,429,{error:'กรอกรหัสผิดหลายครั้ง โปรดลองอีกครั้งภายหลัง'});
 let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return json(res,400,{error:'ข้อมูลไม่ถูกต้อง'})}
 if(!pinOkay(body.pin)){attempt.n++;recent.set(ip,attempt);return json(res,401,{error:'รหัสผ่านไม่ถูกต้อง'})}
 recent.delete(ip);return json(res,200,{verified:true});
};
