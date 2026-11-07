'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../pdf-export.js'),'utf8');
const seed=require('../data/activities.json');
const browser={};
new Function('window',src)(browser);

test('PDF is A4 landscape and activity title prints at 15pt Sarabun',()=>{
  assert.equal(browser.QAPdf.PAGE.pdfWidth,841.89);
  assert.equal(browser.QAPdf.PAGE.pdfHeight,595.28);
  assert.equal(browser.QAPdf.PAGE.width,2526);
  assert.equal(browser.QAPdf.PAGE.height,1785);
  assert.equal(browser.QAPdf.TITLE_PT,15);
  assert.match(src,/font[s]?\.load\('600 15px Sarabun'/);
  assert.match(src,/กิจกรรมวิทยาลัยพยาบาลกองทัพเรือ/);
});
test('multipage PDF has A4 landscape MediaBoxes, 2 images and valid xref',async()=>{
  const jpg=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const sample=[{jpg,width:2526,height:1785},{jpg,width:2526,height:1785}];
  const file=browser.QAPdf.makePdf(sample);
  const bytes=Buffer.from(await file.arrayBuffer());
  const pdf=bytes.toString('latin1');
  assert.match(pdf,/^%PDF-1\.4/);
  assert.match(pdf,/\/Count 2\b/);
  assert.equal((pdf.match(/\/Type \/Page \/Parent/g)||[]).length,2);
  assert.equal((pdf.match(/\/MediaBox \[0 0 841\.89 595\.28\]/g)||[]).length,2);
  const match=/startxref\n(\d+)\n%%EOF/.exec(pdf);
  assert.ok(match);
  assert.equal(pdf.slice(Number(match[1]),Number(match[1])+4),'xref');
});
test('21 seeded activities paginate by actual wrapped row height',()=>{
  const ctx={font:'',measureText(text){
    const size=Number((this.font.match(/(\d+)px/)||[])[1]||15);
    return {width:Array.from(String(text)).length*size*.47};
  }};
  const pages=browser.QAPdf.paginate(ctx,seed);
  assert.equal(pages.flat().length,seed.length);
  assert.ok(pages.length>=2&&pages.length<=3);
  assert.ok(pages.every(p=>p.length>0));
  assert.ok(pages.flat().every(row=>row.height>=34));
});
