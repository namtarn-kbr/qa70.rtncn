'use strict';
/**
 * QA 2570 — One-page A3 landscape Gantt PDF.
 * Browser canvas renders Thai with Sarabun, then embeds a high-resolution image
 * in a self-contained single-page PDF without external PDF libraries.
 */
(function (root) {
  const PAGE={width:2526,height:1785,pdfWidth:841.89,pdfHeight:595.28,scale:3};
  const COLORS={navy:'#193a5d',navyDark:'#142c49',ink:'#1a3856',sub:'#647e96',
    faint:'#eef3f7',grid:'#dfe8f0',orange:'#e59a53',white:'#ffffff'};
  const MONTHS=[
    ['ต.ค.','69'],['พ.ย.','69'],['ธ.ค.','69'],['ม.ค.','70'],
    ['ก.พ.','70'],['มี.ค.','70'],['เม.ย.','70'],['พ.ค.','70'],
    ['มิ.ย.','70'],['ก.ค.','70'],['ส.ค.','70'],['ก.ย.','70']
  ];
  const STATUS={not_started:'ยังไม่เริ่ม',in_progress:'กำลังดำเนินการ',done:'เสร็จสิ้น'};
  const FONT='Sarabun, "TH Sarabun New", Tahoma, sans-serif';

  function font(size,weight=400){return weight+' '+Math.round(size)+'px '+FONT;}
  function box(ctx,x,y,w,h,color,r=0){
    ctx.fillStyle=color;
    if(r&&ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    else ctx.fillRect(x,y,w,h);
  }
  function line(ctx,x,y,xe,ye,color=COLORS.grid,width=2){
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xe,ye);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function draw(ctx,str,x,y,size,color=COLORS.ink,weight=400,align='left'){
    ctx.save();ctx.textBaseline='middle';ctx.textAlign=align;
    ctx.font=font(size,weight);ctx.fillStyle=color;ctx.fillText(String(str),x,y);ctx.restore();
  }
  function textRows(ctx,text,maxWidth,maxLines,size,weight=600){
    const str=String(text||'').replace(/\s+/g,' ').trim();
    if(!str)return [''];
    let pieces;
    if(typeof Intl!=='undefined'&&Intl.Segmenter){
      const segmenter=new Intl.Segmenter('th',{granularity:'word'});
      pieces=Array.from(segmenter.segment(str),a=>a.segment);
    }else pieces=Array.from(str);
    ctx.font=font(size,weight);
    const lines=[];
    let current='';
    for(const segment of pieces){
      const candidate=current+segment;
      if(ctx.measureText(candidate).width<=maxWidth){current=candidate;continue}
      if(current){lines.push(current.trim());current=''}
      if(ctx.measureText(segment).width<=maxWidth){current=segment.trimStart();continue}
      for(const glyph of Array.from(segment)){
        if(ctx.measureText(current+glyph).width>maxWidth&&current){lines.push(current.trim());current=''}
        current+=glyph;
      }
    }
    if(current)lines.push(current.trim());
    if(lines.length>maxLines){
      const taken=lines.slice(0,maxLines);
      let last=taken[maxLines-1];
      while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);
      taken[maxLines-1]=last+'…';
      return taken;
    }
    return lines;
  }
  // Horizontal coordinates use equal-width calendar months, as the live Gantt does.
  function dateFraction(iso,end=false){
    const [y,m,d]=iso.split('-').map(Number);
    const idx=(y-2026)*12+(m-10);
    const days=new Date(Date.UTC(y,m,0)).getUTCDate();
    return Math.max(0,Math.min(1,(idx+(d-1+(end?1:0))/days)/12));
  }
  function shortDate(iso){
    const [y,m,d]=iso.split('-').map(Number);
    const thai=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return d+' '+thai[m-1]+' '+(y+543);
  }

  // Physical layout coordinates are A4 landscape PDF points.
  // Render at 3px per point (216dpi), so 15px canvas glyphs print as 15pt.
  const LAYOUT={left:24,right:817,labelW:397,headTop:137,headH:30,bodyBottom:561};
  const TITLE_PT=15;
  function activityLayout(ctx,a) {
    const lines=textRows(ctx,a.name,LAYOUT.labelW-70,12,TITLE_PT,600);
    const rowHeight=16+lines.length*18;
    return {item:a,lines,height:Math.max(34,rowHeight)};
  }
  function paginate(ctx,items) {
    const pages=[];
    let rows=[],used=0;
    const available=LAYOUT.bodyBottom-(LAYOUT.headTop+LAYOUT.headH);
    for(const item of items){
      const measured=activityLayout(ctx,item);
      if(measured.height>available)throw Error('ชื่อกิจกรรมยาวเกินขนาดกระดาษ A4');
      if(rows.length&&used+measured.height>available){
        pages.push(rows);rows=[];used=0;
      }
      rows.push(measured);used+=measured.height;
    }
    if(rows.length)pages.push(rows);
    return pages;
  }
  function render(ctx,pageRows,selected,opts,logo,pageIndex,pageCount,total){
    const W=PAGE.pdfWidth,H=PAGE.pdfHeight;
    const x=LAYOUT.left,right=LAYOUT.right,gridX=x+LAYOUT.labelW;
    const gridW=right-gridX,monthW=gridW/12;
    box(ctx,0,0,W,H,'#ffffff');
    box(ctx,0,0,W,75,COLORS.navy);
    box(ctx,0,73,W,3,COLORS.orange);
    if(logo){
      box(ctx,23,12,55,55,'#ffffff',28);
      ctx.drawImage(logo,28,17,45,45);
    }
    draw(ctx,'แผนการดำเนินงานประกันคุณภาพการศึกษา',90,26,18,'#ffffff',700);
    draw(ctx,'วิทยาลัยพยาบาลกองทัพเรือ · ปีงบประมาณ 2570',90,52,11.5,'#dce8f3',500);

    draw(ctx,'GANTT CHART',x,96,11,COLORS.navy,700);
    draw(ctx,'ตุลาคม 2569 - กันยายน 2570',x+108,96,10,COLORS.sub,500);
    draw(ctx,'รวม '+total+' กิจกรรม · หน้า '+(pageIndex+1)+'/'+pageCount,right,96,10.5,COLORS.navy,700,'right');

    let lx=x;
    for(const name of selected){
      const color=(opts.colors||{})[name]||'#647e96';
      box(ctx,lx,114,8,8,color,2);
      draw(ctx,name,lx+13,118,9,COLORS.ink,600);
      lx+=Math.min(130,Math.max(68,24+String(name).length*10));
    }
    draw(ctx,'เรียงตามวันที่เริ่มต้น',right,119,9,COLORS.sub,400,'right');

    box(ctx,x,LAYOUT.headTop,right-x,LAYOUT.headH,COLORS.navyDark,4);
    draw(ctx,'ลำดับ / รายการกิจกรรม',x+13,LAYOUT.headTop+15,10,'#ffffff',700);
    MONTHS.forEach(([month,year],i)=>{
      const cx=gridX+monthW*(i+.5);
      draw(ctx,month+' '+year,cx,LAYOUT.headTop+15,8.6,'#ffffff',600,'center');
      if(i>0)line(ctx,gridX+monthW*i,LAYOUT.headTop,gridX+monthW*i,LAYOUT.headTop+LAYOUT.headH,'#45617a',.55);
    });

    let top=LAYOUT.headTop+LAYOUT.headH;
    for(let i=0;i<pageRows.length;i++){
      const {item,lines:titles,height:h}=pageRows[i];
      const index=(opts.firstRow||0)+i+1;
      const color=(opts.colors||{})[item.track]||'#6485a2';
      if(i%2===1)box(ctx,x,top,right-x,h,'#f6f9fc');
      line(ctx,x,top+h,right,top+h,COLORS.grid,.55);
      draw(ctx,String(index).padStart(2,'0'),x+12,top+h/2,8.5,'#788da4',600);
      box(ctx,x+36,top+8,3,h-16,color,1.5);
      for(let k=0;k<titles.length;k++){
        draw(ctx,titles[k],x+49,top+12+k*18,TITLE_PT,COLORS.ink,600);
      }
      const meta=item.track+' · '+shortDate(item.startDate)+' · '+(STATUS[item.status]||'');
      draw(ctx,meta,x+49,top+h-7.5,8.1,COLORS.sub,400);
      for(let j=0;j<=12;j++){
        const gx=gridX+j*monthW;
        line(ctx,gx,top,gx,top+h,j===0?'#b5c7d8':COLORS.grid,j===0?.8:.4);
      }
      const bx=gridX+gridW*dateFraction(item.startDate);
      const ex=gridX+gridW*dateFraction(item.endDate,true);
      const bw=Math.max(3,ex-bx);
      const bh=9.5;
      box(ctx,bx,top+(h-bh)/2,bw,bh,color,3);
      top+=h;
    }
    line(ctx,x,572,right,572,'#d5e0ea',.7);
    draw(ctx,'คณะกรรมการประกันคุณภาพการศึกษา',x,582,8.7,COLORS.sub,600);
    draw(ctx,'A4 แนวนอน · Sarabun · '+(pageIndex+1)+'/'+pageCount,right,582,8.7,COLORS.sub,400,'right');
  }
  function ascii(str){return new TextEncoder().encode(str);}

  function makePdf(images){
    // One A4 landscape page per JPEG. Multi-page PDF without external libraries.
    if(images instanceof Uint8Array)throw Error('makePdf expects an array of JPEG page images');
    if(!Array.isArray(images)||!images.length)throw Error('ไม่มีหน้า PDF');
    const parts=[],offsets=[0];let position=0;
    function write(v){const bytes=typeof v==='string'?ascii(v):v;parts.push(bytes);position+=bytes.byteLength;}
    const w=PAGE.pdfWidth,h=PAGE.pdfHeight;
    write('%PDF-1.4\n%QA2570\n');
    function openObj(n){offsets[n]=position;write(n+' 0 obj\n');}
    function closeObj(){write('\nendobj\n');}
    openObj(1);write('<< /Type /Catalog /Pages 2 0 R >>');closeObj();
    const kids=images.map((_,i)=>(3+i*3)+' 0 R').join(' ');
    openObj(2);write('<< /Type /Pages /Kids ['+kids+'] /Count '+images.length+' >>');closeObj();
    images.forEach((image,i)=>{
      const page=3+i*3,object=page+1,content=page+2;
      openObj(page);
      write('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+object+' 0 R >> >> /Contents '+content+' 0 R >>');
      closeObj();
      openObj(object);
      write('<< /Type /XObject /Subtype /Image /Width '+image.width+' /Height '+image.height+
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.jpg.length+' >>\nstream\n');
      write(image.jpg);write('\nendstream');closeObj();
      const commands='q\n'+w+' 0 0 '+h+' 0 0 cm\n/Im0 Do\nQ\n';
      openObj(content);
      write('<< /Length '+ascii(commands).length+' >>\nstream\n'+commands+'endstream');
      closeObj();
    });
    const totalObjects=2+images.length*3;
    const xrefPosition=position;
    write('xref\n0 '+(totalObjects+1)+'\n0000000000 65535 f \n');
    for(let i=1;i<=totalObjects;i++)write(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    write('trailer\n<< /Size '+(totalObjects+1)+' /Root 1 0 R >>\nstartxref\n'+xrefPosition+'\n%%EOF\n');
    return new Blob(parts,{type:'application/pdf'});
  }
  async function loadLogo(){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src='assets/rtncn-logo.png?v=20261107b';
    });
  }

  async function download(activities,selected,opts={}){
    if(!Array.isArray(activities)||!activities.length)throw Error('ไม่มีรายการกิจกรรม');
    if(!document.fonts)throw Error('เบราว์เซอร์ไม่รองรับการตรวจสอบฟอนต์ Sarabun');
    try{
      const faces=await Promise.all([
        document.fonts.load('700 18px Sarabun','แผนการดำเนินงานประกันคุณภาพการศึกษา'),
        document.fonts.load('600 15px Sarabun','กิจกรรมวิทยาลัยพยาบาลกองทัพเรือ'),
        document.fonts.load('400 9px Sarabun','คณะกรรมการประกันคุณภาพการศึกษา')
      ]);
      await document.fonts.ready;
      if(faces.some(arr=>!arr||arr.length===0)||
        !document.fonts.check('600 15px Sarabun','กิจกรรม')){
        throw Error('ตรวจสอบการโหลดฟอนต์ไม่สำเร็จ');
      }
    }catch(err){throw Error('ไม่สามารถโหลด Sarabun กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');}
    const ordered=[...activities].sort((a,b)=>a.startDate.localeCompare(b.startDate)||String(a.id).localeCompare(String(b.id)));
    const canvas=document.createElement('canvas');
    canvas.width=PAGE.width;canvas.height=PAGE.height;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('อุปกรณ์ไม่รองรับการสร้าง PDF');
    ctx.scale(PAGE.scale,PAGE.scale);
    const pages=paginate(ctx,ordered);
    const logo=await loadLogo();
    const images=[];
    let firstRow=0;
    for(let i=0;i<pages.length;i++){
      const pageRows=pages[i];
      render(ctx,pageRows,selected,{...opts,firstRow},logo,i,pages.length,ordered.length);
      const jpg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
      if(!jpg)throw Error('สร้างหน้า PDF ไม่สำเร็จ');
      images.push({jpg:new Uint8Array(await jpg.arrayBuffer()),width:canvas.width,height:canvas.height});
      firstRow+=pageRows.length;
    }
    const pdf=makePdf(images);
    const url=URL.createObjectURL(pdf);
    const link=document.createElement('a');
    link.href=url;
    link.download='QA2570_Gantt_A4_'+(selected.length===1?selected[0].replace(/[^\wก-๙-]/g,''):'AllPlans')+'.pdf';
    link.style.display='none';
    document.body.append(link);
    link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    return {bytes:pdf.size,rows:ordered.length,pages:pages.length,paper:'A4 landscape',font:'Sarabun',titlePt:TITLE_PT};
  }
  root.QAPdf={download,makePdf,PAGE,paginate,TITLE_PT};
})(window);
