'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const gas=require('../lib/gas');

const URL='https://script.google.com/macros/s/TEST_DEPLOYMENT_123/exec';
const SECRET='a'.repeat(40);
function setup(){
  const prevUrl=process.env.GAS_WEB_APP_URL;
  const prevSecret=process.env.GAS_API_SECRET;
  const prevFetch=global.fetch;
  process.env.GAS_WEB_APP_URL=URL;
  process.env.GAS_API_SECRET=SECRET;
  return ()=>{
    if(prevUrl===undefined)delete process.env.GAS_WEB_APP_URL;else process.env.GAS_WEB_APP_URL=prevUrl;
    if(prevSecret===undefined)delete process.env.GAS_API_SECRET;else process.env.GAS_API_SECRET=prevSecret;
    global.fetch=prevFetch;
  };
}

test('requires valid GAS exec URL and a 32+ character server secret',()=>{
  const restore=setup();
  try{
    assert.equal(gas.configured(),true);
    process.env.GAS_API_SECRET='short';
    assert.equal(gas.configured(),false);
    process.env.GAS_API_SECRET=SECRET;
    process.env.GAS_WEB_APP_URL='https://evil.example/exec';
    assert.equal(gas.configured(),false);
  }finally{restore()}
});

test('sends authenticated POST to GAS using server secret, not URL query',async()=>{
  const restore=setup();
  try{
    global.fetch=async (url,options)=>{
      assert.equal(url,URL);
      assert.equal(options.method,'POST');
      assert.equal(options.redirect,'follow');
      const request=JSON.parse(options.body);
      assert.deepEqual(request,{action:'list',secret:SECRET});
      return {ok:true,status:200,text:async()=>JSON.stringify({success:true,persistent:true,activities:[]})};
    };
    const result=await gas.call('list');
    assert.equal(result.persistent,true);
  }finally{restore()}
});

test('rejects GAS response when secret is invalid',async()=>{
  const restore=setup();
  try{
    global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({success:false,error:'Unauthorized'})});
    await assert.rejects(()=>gas.call('list'),/GAS_API_SECRET/);
  }finally{restore()}
});
