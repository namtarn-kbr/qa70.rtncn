'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=require('../data/activities.json');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8')
 .replace(/render\(\);loadRemote\(\);loadEvidence\(\);setInterval\(.*$/s,'');
const elements={
 root:{innerHTML:''},sideTracks:{innerHTML:''},
 currentPageTitle:{textContent:''},seed:{textContent:JSON.stringify(data)}
};
const handlers={};
const doc={
 getElementById:id=>elements[id]||{innerHTML:'',textContent:''},
 querySelectorAll:()=>[],addEventListener:(type,fn)=>{handlers[type]=fn;}
};
const app=new Function('document','structuredClone','location',source+
 ';return {setEvidence:d=>{evidenceData=d;evidenceStatus="ready"},setPage:v=>{page=v},setFolder:(name,id)=>{evidenceFolderByPlan[name]=id},setSearch:q=>{evidenceQuery=q},setSort:v=>{evidenceSort=v},evidencePage,evidenceEntries,evidenceCrumbs,render};'
)(doc,structuredClone,{protocol:'file:'});
const root='ROOT_101',f1='F_201',f2='F_202';
const plan={
 name:'สมศ.',rootId:root,rootUrl:'https://drive.google.com/drive/folders/'+root,items:[
 {id:f1,parentId:root,name:'โฟลเดอร์เอกสาร',kind:'folder',url:'https://drive.google.com/drive/folders/'+f1},
 {id:'a',parentId:root,name:'A-เอกสารที่โฟลเดอร์หลัก.pdf',kind:'file',url:'https://drive.google.com/file/d/a/view'},
 {id:'b',parentId:f1,name:'B-เอกสารภายใน.docx',kind:'file',url:'https://drive.google.com/file/d/b/view'},
 {id:f2,parentId:f1,name:'โฟลเดอร์ชั้นสอง',kind:'folder',url:'https://drive.google.com/drive/folders/'+f2},
 {id:'c',parentId:f2,name:'C-เอกสารชั้นสอง.pdf',kind:'file',url:'https://drive.google.com/file/d/c/view'}
 ]
};
app.setEvidence({plans:[plan],updatedAt:'2026-11-18T00:00:00Z'});
app.setPage('evidence');

test('top-level Google Drive directory shows direct folders and direct files only',()=>{
 app.setFolder('สมศ.',root);app.setSearch('');app.setSort('name');
 const html=app.evidencePage();
 assert.match(html,/โฟลเดอร์เอกสาร/);
 assert.match(html,/A-เอกสารที่โฟลเดอร์หลัก/);
 assert.doesNotMatch(html,/B-เอกสารภายใน/);
 assert.doesNotMatch(html,/C-เอกสารชั้นสอง/);
 const rows=app.evidenceEntries(plan);
 assert.deepEqual(rows.map(x=>x.kind),['folder','file']);
 assert.equal((html.match(/class="v3-explorer-row"/g)||[]).length,2);
 assert.ok(html.includes('data-evidence-folder="'+f1+'"'));
 assert.ok(html.includes('class="v3-item-icon folder"'));
 assert.ok(html.includes('class="v3-item-icon file"'));
});
test('folder drilldown and breadcrumbs show only direct children',()=>{
 app.setFolder('สมศ.',f1);
 let html=app.evidencePage();
 assert.match(html,/B-เอกสารภายใน/);
 assert.match(html,/โฟลเดอร์ชั้นสอง/);
 assert.doesNotMatch(html,/A-เอกสารที่โฟลเดอร์หลัก/);
 assert.doesNotMatch(html,/C-เอกสารชั้นสอง/);
 app.setFolder('สมศ.',f2);
 html=app.evidencePage();
 assert.match(html,/C-เอกสารชั้นสอง/);
 assert.doesNotMatch(html,/B-เอกสารภายใน/);
 assert.deepEqual(app.evidenceCrumbs(plan).map(x=>x.name),['สมศ.','โฟลเดอร์เอกสาร','โฟลเดอร์ชั้นสอง']);
});
test('search is scoped to current folder and old refresh explanation is not shown',()=>{
 app.setFolder('สมศ.',f1);app.setSearch('B-');
 const html=app.evidencePage();
 assert.match(html,/B-เอกสารภายใน/);
 assert.doesNotMatch(html,/โฟลเดอร์ชั้นสอง<\/strong>/);
 assert.doesNotMatch(html,/60 วินาที/);
 app.setSearch('');
});
test('clicking folder row and breadcrumb navigates without opening external Drive',async()=>{
 app.setFolder('สมศ.',root);app.setSearch('');
 let hit={dataset:{evidenceFolder:f1,evidencePlan:'สมศ.'},hasAttribute:key=>key==='data-evidence-folder'};
 await handlers.click({target:{closest:()=>hit,id:''}});
 assert.match(elements.root.innerHTML,/B-เอกสารภายใน/);
 assert.doesNotMatch(elements.root.innerHTML,/A-เอกสารที่โฟลเดอร์หลัก/);
 hit={dataset:{evidenceNavPlan:'สมศ.',evidenceNavFolder:root},hasAttribute:key=>key==='data-evidence-nav-plan'};
 await handlers.click({target:{closest:()=>hit,id:''}});
 assert.match(elements.root.innerHTML,/A-เอกสารที่โฟลเดอร์หลัก/);
 assert.doesNotMatch(elements.root.innerHTML,/B-เอกสารภายใน/);
});
