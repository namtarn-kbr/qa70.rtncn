'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT=__dirname;const PORT=Number(process.env.PORT||3000);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(/^\/api\/(activities|verify-pin|attachments|download)$/.test(pathname)){
   const api=pathname.split('/').at(-1);let chunks=[],size=0;
   if(req.method!=='GET'){for await(const part of req){size+=part.length;if(size>3.5*1024*1024){res.writeHead(413);res.end('Request body too large');return}chunks.push(part)}}
   req.body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};
   res.status=function(code){this.statusCode=code;return this};
   res.json=function(payload){this.setHeader('Content-Type','application/json; charset=utf-8');this.end(JSON.stringify(payload));return this};
   return require('./api/'+api)(req,res);
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
  if(pathname.includes('..')||pathname.split('/').some(segment=>segment.startsWith('.'))||pathname.startsWith('/api/')||pathname.startsWith('/lib/')||pathname.startsWith('/data/')||pathname.startsWith('/tests/')){res.writeHead(403);res.end();return}
  const filepath=path.join(ROOT,pathname==='/'?'index.html':pathname);
  const st=await fs.stat(filepath);if(!st.isFile())throw Error('Not found');
  const bytes=await fs.readFile(filepath);res.setHeader('Content-Type',MIME[path.extname(filepath)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');return res.end(bytes);
 }catch(err){res.writeHead(err instanceof SyntaxError?400:404,{'Content-Type':'text/plain; charset=utf-8'});res.end(err.message)}
}).listen(PORT,'127.0.0.1',()=>console.log('QA70 local: http://127.0.0.1:'+PORT));
