'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/render\(\);loadRemote\(\);\s*$/,'');
const data=fs.readFileSync(path.join(__dirname,'../data/activities.json'),'utf8');
const doc={
  getElementById(id){return id==='seed'?{textContent:data}:{innerHTML:'',textContent:'',hidden:true}},
  addEventListener(){},
  querySelectorAll(){return []}
};
const app=new Function('document','structuredClone',source+
  ';return {setTrack, toggleMultiPlan, chosenPlanNames, filtered, multiPlanBar, gantt, planPage, addSample:a=>items.push(a)};')(doc,structuredClone);

test('all plans are shown in one chronological Gantt, without group sections',()=>{
 app.setTrack('all');
 const rows=app.filtered();
 assert.equal(rows.length,21);
 assert.ok(rows.every((r,i)=>i===0||rows[i-1].startDate<=r.startDate));
 const markup=app.gantt(rows);
 assert.equal((markup.match(/class="gantt-row /g)||[]).length,21);
 assert.equal((markup.match(/class="group-row/g)||[]).length,0);
 assert.ok(markup.includes('row-S'));
 assert.ok(markup.includes('row-E'));
 assert.ok(markup.includes('ต.ค.'));
 assert.ok(markup.includes('ก.ย.'));
});

test('multiple plan choices are additive, and can exclude other populated plans',()=>{
 app.addSample({id:'C-NEW',track:'สภาการพยาบาล',name:'กิจกรรมใหม่',detail:'',owner:'QA',
   startDate:'2027-01-12',endDate:'2027-01-12',status:'not_started'});
 app.setTrack('สมศ.');
 assert.equal(app.filtered().length,13);
 app.toggleMultiPlan('EdPEx');
 assert.equal(app.filtered().length,21);
 assert.ok(app.chosenPlanNames().includes('สมศ.'));
 assert.ok(app.chosenPlanNames().includes('EdPEx'));
 assert.ok(!app.chosenPlanNames().includes('สภาการพยาบาล'));
 app.setTrack('all');
 assert.equal(app.filtered().length,22);
});

test('plan picker exposes only available plans but supports multiselect',()=>{
 app.setTrack('all');
 const markup=app.multiPlanBar();
 assert.ok(markup.includes('data-multi-plan="สมศ."'));
 assert.ok(markup.includes('data-multi-plan="EdPEx"'));
 assert.ok(markup.includes('data-multi-plan="สภาการพยาบาล"'));
 assert.ok(markup.includes('data-multi-all'));
});
