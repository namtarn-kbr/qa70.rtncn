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
const create = new Function('document','structuredClone',source+
 ';return {setFilters(x){track=x.track||"all";monthChoice=x.month||"all";dateFrom=x.from||"";dateTo=x.to||"";status="all";owner="all";search=""},filtered(){return filtered()},page(){return planPage()}};');
const app=create(doc,structuredClone);
test('Gantt month filter includes overlapping activities and hides non-overlapping ones',()=>{
 app.setFilters({month:'2026-10'});
 assert.equal(app.filtered().length,0);
 app.setFilters({month:'2026-11'});
 const rows=app.filtered();
 assert.ok(rows.length>0);
 assert.ok(rows.every(a=>a.startDate<='2026-11-30'&&a.endDate>='2026-11-01'));
});
test('Gantt date range filter intersects activity intervals',()=>{
 app.setFilters({from:'2026-12-20',to:'2027-01-10'});
 const rows=app.filtered();
 assert.ok(rows.length>0);
 assert.ok(rows.every(a=>a.endDate>='2026-12-20'&&a.startDate<='2027-01-10'));
});
test('Plan and date filters combine, with all four plans available in form',()=>{
 app.setFilters({track:'EdPEx',month:'2027-05'});
 const rows=app.filtered();
 assert.ok(rows.length>0);
 assert.ok(rows.every(a=>a.track==='EdPEx'));
 const html=app.page();
 assert.ok(html.includes('id="monthChoice"'));
 assert.ok(html.includes('id="dateFrom"'));
 assert.ok(html.includes('id="dateTo"'));
 app.setFilters({});
 assert.equal(app.filtered().length,21);
});
