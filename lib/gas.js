'use strict';

/** Server-only gateway to the user-deployed QA2570 Google Apps Script Web App. */
const configured = () => {
  const url=process.env.GAS_WEB_APP_URL||'';
  const secret=process.env.GAS_API_SECRET||'';
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url) && secret.length>=32;
};

async function call(action,params={}) {
  if(!configured())throw Error('ยังไม่ได้กำหนด GAS_API_SECRET ให้ตรงกับ QA_API_SECRET ใน Apps Script');
  const response=await fetch(process.env.GAS_WEB_APP_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...params,action,secret:process.env.GAS_API_SECRET}),
    cache:'no-store',
    redirect:'follow',
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('ไม่สามารถติดต่อ Google Apps Script ได้ ('+response.status+')');
  const text=await response.text();
  let result;
  try{result=JSON.parse(text)}catch{throw Error('Google Apps Script ส่งข้อมูลที่ไม่ใช่ JSON โปรดตรวจสอบการตั้งค่า Web App และสิทธิ์ Anyone')}
  if(!result||typeof result!=='object')throw Error('รูปแบบคำตอบ Google Apps Script ไม่ถูกต้อง');
  if(result.success!==true){
    if(result.error==='Unauthorized')throw Error('รหัส GAS_API_SECRET ไม่ตรงกับ QA_API_SECRET ใน Apps Script');
    throw Error(String(result.error||'Google Apps Script ไม่สามารถดำเนินการได้').slice(0,250));
  }
  return result;
}

module.exports={configured,call};
