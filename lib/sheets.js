'use strict';
const crypto = require('node:crypto');
const ID = () => process.env.GOOGLE_SHEET_ID || '';
const configured = () => Boolean(ID() && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
let cached = null;
const b64 = data => Buffer.from(data).toString('base64url');
async function accessToken() {
  if (!configured()) throw new Error('ยังไม่ได้ตั้งค่า Google Service Account ใน Vercel');
  if (cached && cached.expiry > Date.now() + 60000) return cached.value;
  const now = Math.floor(Date.now()/1000);
  const payload = {iss:process.env.GOOGLE_CLIENT_EMAIL,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=b64(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64(JSON.stringify(payload));
  const key=process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n');
  const signature=crypto.sign('RSA-SHA256',Buffer.from(unsigned),key).toString('base64url');
  const body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
  if (!res.ok) throw new Error('Google Service Account authentication failed ('+res.status+')');
  const data=await res.json();
  if(!data.access_token) throw new Error('Google did not return an access token');
  cached={value:data.access_token,expiry:Date.now()+Math.min(3300,Number(data.expires_in||3600))*1000};
  return cached.value;
}
async function request(method, route, payload) {
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(ID())+route;
  const headers={Authorization:'Bearer '+await accessToken()};
  if(payload!==undefined)headers['Content-Type']='application/json';
  const res=await fetch(url,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload),cache:'no-store'});
  if(!res.ok){
    const details=await res.text();
    console.error('Sheets API error',res.status,details.slice(0,300));
    throw new Error('Google Sheets API ไม่สำเร็จ ('+res.status+')');
  }
  return res.status===204?{}:res.json();
}
async function getRows(tab,lastColumn) {
  const path='/values/'+encodeURIComponent(tab+'!A2:'+lastColumn+'1000')+'?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';
  const data=await request('GET',path);
  return (data.values||[]).map((values,i)=>({row:i+2,values})).filter(x=>x.values.some(v=>v!==''&&v!==null&&v!==undefined));
}
async function appendRow(tab,columns,values) {
  const range=tab+'!A:'+columns;
  const route='/values/'+encodeURIComponent(range)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  return request('POST',route,{majorDimension:'ROWS',values:[values]});
}
async function updateRow(tab,index,columns,values) {
  const range=tab+'!A'+index+':'+columns+index;
  return request('PUT','/values/'+encodeURIComponent(range)+'?valueInputOption=RAW',{majorDimension:'ROWS',values:[values]});
}
async function clearRow(tab,index,columns) {
  const range=tab+'!A'+index+':'+columns+index;
  return request('POST','/values/'+encodeURIComponent(range)+':clear',{});
}
function toSerial(iso) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw new Error('วันที่ไม่ถูกต้อง');
  return (Date.parse(iso+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;
}
function toISO(value) {
  if(typeof value==='number'&&Number.isFinite(value)) return new Date(Date.UTC(1899,11,30)+Math.round(value)*86400000).toISOString().slice(0,10);
  const s=String(value||'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const date=new Date(s);
  return isNaN(date)?'':date.toISOString().slice(0,10);
}
function nowSerial() {return (Date.now()-Date.UTC(1899,11,30))/86400000;}
async function audit(action,entityType,entityId,before,after) {
  try {
    await appendRow('Audit_Log','I',[crypto.randomUUID(),nowSerial(),action,entityType,entityId,'ผู้ดูแลผ่านรหัส',JSON.stringify(before||null),JSON.stringify(after||null),'']);
  }catch(err){console.error('Audit log write failed:',err.message)}
}
module.exports={configured,getRows,appendRow,updateRow,clearRow,toSerial,toISO,nowSerial,audit};
