'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../pdf-export.js'),'utf8');
const root={};
new Function('window',source)(root);

test('A3 landscape PDF generator contains one page and valid PDF xref',async()=>{
 const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xe0,0,0x10,0xff,0xd9]);
 const blob=root.QAPdf.makePdf(jpeg,3508,2480);
 assert.equal(blob.type,'application/pdf');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const text=new TextDecoder('latin1').decode(bytes);
 assert.ok(text.startsWith('%PDF-1.4'));
 assert.ok(text.includes('/Count 1'));
 assert.ok(text.includes('/MediaBox [0 0 1190.55 841.89]'));
 assert.ok(text.includes('/Width 3508 /Height 2480'));
 assert.ok(text.includes('/Length 8'));
 const xref=/startxref\n(\d+)\n%%EOF/.exec(text);
 assert.ok(xref,'xref must be declared');
 assert.equal(text.slice(Number(xref[1]),Number(xref[1])+4),'xref');
});

test('PDF layout is A3 landscape, with a one-page image resolution above 200dpi',()=>{
 assert.equal(root.QAPdf.PAGE.pdfWidth,1190.55);
 assert.equal(root.QAPdf.PAGE.pdfHeight,841.89);
 assert.ok(root.QAPdf.PAGE.width>root.QAPdf.PAGE.height);
 assert.ok(root.QAPdf.PAGE.width>=3500);
});
