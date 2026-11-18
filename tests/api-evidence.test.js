'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../api/evidence');
const envNames=['GAS_WEB_APP_URL','GAS_API_SECRET','EDIT_PIN'];
function res(){return {code:0,body:null,setHeader(){return this},status(code){this.code=code;return this},json(body){this.body=body;return this}};}
test('evidence GET requires server secret, never accepts unconfigured storage',async()=>{
 const old=Object.fromEntries(envNames.map(key=>[key,process.env[key]]));
 try{
  for(const key of envNames)delete process.env[key];
  const r=res();
  await api({method:'GET',headers:{}},r);
  assert.equal(r.code,503);
  assert.doesNotMatch(JSON.stringify(r.body),/GAS_API_SECRET=/);
 }finally{
  for(const key of envNames){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key]}
 }
});
test('evidence only supports GET',async()=>{
 const r=res();
 await api({method:'POST',headers:{}},r);
 assert.equal(r.code,405);
});
