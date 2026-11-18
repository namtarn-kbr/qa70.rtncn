'use strict';
const gas=require('../lib/gas');
const {configured,json}=require('../lib/storage');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 if(!configured())return json(res,503,{error:'ยังไม่ได้ตั้งค่า Google Apps Script สำหรับคลังหลักฐาน'});
 try{
  const data=await gas.call('listEvidence');
  if(!Array.isArray(data.plans))throw Error('GAS ไม่ส่งข้อมูลคลังหลักฐาน');
  const plans=data.plans.map(p=>({
   name:String(p.name||''),id:String(p.id||''),rootUrl:String(p.rootUrl||''),rootId:String(p.rootId||''),
   error:String(p.error||''),folderCount:Number(p.folderCount||0),fileCount:Number(p.fileCount||0),
   items:(Array.isArray(p.items)?p.items:[]).map(x=>({
    id:String(x.id||''),name:String(x.name||''),kind:x.kind==='folder'?'folder':'file',
    url:String(x.url||''),mimeType:String(x.mimeType||''),modifiedTime:String(x.modifiedTime||''),
    path:String(x.path||''),parentId:String(x.parentId||''),depth:Math.max(0,Math.min(20,Number(x.depth||0)))
   }))
  }));
  return json(res,200,{success:true,plans,updatedAt:String(data.updatedAt||new Date().toISOString()),
   partial:!!data.partial,itemsTotal:Number(data.itemsTotal||0),version:String(data.version||'')});
 }catch(err){
  console.error('Evidence Drive sync failed:',err.message);
  if(/Unsupported action/i.test(err.message))return json(res,409,{error:'GAS ยังไม่รองรับการอ่านไฟล์ใน Drive กรุณาติดตั้ง QA2570_GAS_Code_v4.gs แล้ว Deploy เวอร์ชันใหม่'});
  return json(res,502,{error:'ไม่สามารถอ่าน Google Drive ผ่าน GAS ได้: '+err.message});
 }
};
