'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const seed=require('../data/activities.json');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8')
 .replace(/render\(\);loadRemote\(\);loadEvidence\(\);setInterval\(.*$/s,'');
const dom={seed:{textContent:JSON.stringify(seed)},root:{innerHTML:''},
 sideTracks:{innerHTML:''},currentPageTitle:{textContent:''}};
const doc={
 getElementById(id){return dom[id]||{innerHTML:'',textContent:''}},
 querySelectorAll(){return []},addEventListener(){}
};
const app=new Function('document','structuredClone','location',source+
 ';return {render,homePage,overviewPage,evidencePage,filtered,chosenPlanNames,setEvidence:d=>{evidenceData=d;evidenceStatus="ready"},setScope:x=>{selectedPlans=x},setPage:x=>{page=x},activeTracks};'
)(doc,structuredClone,{protocol:'file:'});

test('hybrid portal exposes Home, Overview, Gantt, and evidence-first shortcuts',()=>{
 app.render();
 assert.match(dom.root.innerHTML,/ระบบประกันคุณภาพการศึกษา/);
 assert.match(dom.root.innerHTML,/data-go="evidence"/);
 assert.match(dom.root.innerHTML,/data-go="plan"/);
 assert.match(app.overviewPage(),/ความก้าวหน้า/);
});

test('live evidence includes nested Drive files and plans with documents only',()=>{
 app.setEvidence({updatedAt:'2026-11-18T02:00:00Z',plans:[{
  name:'สภาการพยาบาล',
  rootUrl:'https://drive.google.com/drive/folders/AA_1',
  items:[{id:'file001',name:'คู่มือประกันคุณภาพ',kind:'file',
   url:'https://drive.google.com/file/d/file001/view',
   path:'โฟลเดอร์หลัก / เอกสาร',modifiedTime:'2026-11-17T12:00:00Z'},
   {id:'folder002',name:'เอกสารหลักฐาน',kind:'folder',
    url:'https://drive.google.com/drive/folders/folder002',path:'โฟลเดอร์หลัก'}]
 }]});
 assert.equal(app.activeTracks().length,3);
 app.setScope(['สภาการพยาบาล']);
 const markup=app.evidencePage();
 assert.match(markup,/คู่มือประกันคุณภาพ/);
 assert.match(markup,/เอกสารหลักฐาน/);
 assert.match(markup,/data-refresh-evidence/);
 assert.doesNotMatch(markup,/EdPEx<\/h3>/);
});
