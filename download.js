'use strict';
const {configured,readActivities,ghRead}=require('../lib/storage');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 if(!configured())return res.status(503).end();
 const u=new URL(req.url,'http://localhost');const path=u.searchParams.get('path')||'';
 if(!/^data\/evidence\/[A-Za-z0-9_-]{1,60}\/[0-9a-f-]{36}\.bin$/.test(path))return res.status(400).end();
 try{
  const {activities}=await readActivities();let doc;
  for(const a of activities){const found=(a.attachments||[]).find(x=>x.path===path);if(found){doc=found;break}}
  if(!doc)return res.status(404).end();
  const result=await ghRead(path);if(!result)return res.status(404).end();
  const filename=String(doc.name||'evidence').replace(/[\r\n\"\\]/g,'_');
  res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition',`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, max-age=0, no-store');
  return res.status(200).end(result.data);
 }catch(e){console.error('Failed attachment download',e);return res.status(503).end()}
};
