'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/activities');

const URL='https://script.google.com/macros/s/TEST_DEPLOYMENT_123/exec';
const SECRET='unit-test-'.repeat(5);
function setup(){
 const old={url:process.env.GAS_WEB_APP_URL,secret:process.env.GAS_API_SECRET,pin:process.env.EDIT_PIN,fetch:global.fetch};
 process.env.GAS_WEB_APP_URL=URL;
 process.env.GAS_API_SECRET=SECRET;
 process.env.EDIT_PIN='internal-test-pin-not-for-production';
 return ()=>{
  for(const [name,val] of [['GAS_WEB_APP_URL',old.url],['GAS_API_SECRET',old.secret],['EDIT_PIN',old.pin]]){
   if(val===undefined)delete process.env[name];else process.env[name]=val;
  }
  global.fetch=old.fetch;
 };
}
function response(){
 return {code:0,payload:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(v){this.code=v;return this},json(v){this.payload=v;return this}};
}
test('DELETE requires valid PIN and never contacts GAS on unauthorized requests',async()=>{
 const restore=setup();
 try{
  let calls=0;global.fetch=async()=>{calls++;throw Error('should not call')};
  const res=response();
  await handler({method:'DELETE',body:{id:'S01'},headers:{'x-admin-pin':'wrong'}},res);
  assert.equal(res.code,401);assert.equal(calls,0);
 }finally{restore()}
});
test('DELETE calls GAS deleteActivity and returns the updated list',async()=>{
 const restore=setup();
 try{
  let call;
  global.fetch=async(url,options)=>{
   call={url,options,request:JSON.parse(options.body)};
   return {ok:true,status:200,text:async()=>JSON.stringify({success:true,deletedId:'S01',persistent:true,activities:[]})};
  };
  const res=response();
  await handler({method:'DELETE',body:{id:'S01'},headers:{'x-admin-pin':process.env.EDIT_PIN}},res);
  assert.equal(res.code,200);assert.equal(res.payload.deletedId,'S01');
  assert.deepEqual(res.payload.activities,[]);
  assert.equal(call.request.action,'deleteActivity');
  assert.equal(call.request.id,'S01');
  assert.equal(call.request.secret,SECRET);
  assert.equal(call.options.method,'POST');
 }finally{restore()}
});
test('DELETE rejects malicious and missing activity IDs',async()=>{
 const restore=setup();
 try{
  let calls=0;global.fetch=async()=>{calls++;throw Error('should not call')};
  const res=response();
  await handler({method:'DELETE',body:{id:'=HYPERLINK()'},headers:{'x-admin-pin':process.env.EDIT_PIN}},res);
  assert.equal(res.code,400);assert.equal(calls,0);
 }finally{restore()}
});
