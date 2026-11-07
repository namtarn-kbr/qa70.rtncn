'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const seed=require('../data/activities.json');
const s=require('../lib/storage');
test('initial schedule includes 21 dated activities from 2 populated plans',()=>{
 assert.equal(seed.length,21);assert.equal(seed.filter(x=>x.track==='สมศ.').length,13);assert.equal(seed.filter(x=>x.track==='EdPEx').length,8);
 assert.equal(seed.filter(x=>['สภาการพยาบาล','AUN-QA'].includes(x.track)).length,0);
});
test('validates dates in Oct 2569 to Sep 2570 and supports all four plan types',()=>{
 const a={name:'รายการทดสอบ',detail:'รายละเอียด',owner:'ฝ่ายเลขาฯ',track:'AUN-QA',status:'not_started',startDate:'2026-10-01',endDate:'2027-09-30'};
 assert.equal(s.validation(a).track,'AUN-QA');
 assert.throws(()=>s.validation({...a,endDate:'2027-10-01'}));
 assert.throws(()=>s.validation({...a,endDate:'2026-09-30'}));
 assert.throws(()=>s.validation({...a,startDate:'2027-06-01',endDate:'2027-05-01'}));
});
test('keeps original task data while sorting only by start date',()=>{
 const rev=[seed[5],seed[0],seed[1]];const result=s.sortRows(rev);
 assert.ok(result.every((row,i)=>i===0||row.startDate>=result[i-1].startDate));
 assert.equal(result.length,3);
});
test('pin is checked from server environment',()=>{
 process.env.ADMIN_PIN='12345';assert.equal(s.pinOkay('12345'),true);assert.equal(s.pinOkay('11111'),false);
});
