'use strict';
/**
 * QA 2570 — One-page A3 landscape Gantt PDF.
 * Browser canvas renders Thai with Sarabun, then embeds a high-resolution image
 * in a self-contained single-page PDF without external PDF libraries.
 */
(function (root) {
  const PAGE={width:3508,height:2480,pdfWidth:1190.55,pdfHeight:841.89};
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
  function render(ctx,rows,selected,opts,logo){
    const {width:W,height:H}=PAGE;
    box(ctx,0,0,W,H,'#ffffff');
    box(ctx,0,0,W,242,COLORS.navy);
    box(ctx,0,239,W,9,COLORS.orange);
    if(logo){
      box(ctx,87,37,171,171,'#ffffff',86);
      ctx.drawImage(logo,101,51,143,143);
    }
    const textX=logo?288:100;
    draw(ctx,'แผนการดำเนินงานประกันคุณภาพการศึกษา',textX,92,63,'#ffffff',700);
    draw(ctx,'วิทยาลัยพยาบาลกองทัพเรือ · ปีงบประมาณ 2570',textX,163,36,'#dfeaf4',500);

    const x=98,right=W-98,labelWidth=1445,gridX=x+labelWidth,gridWidth=right-gridX;
    draw(ctx,'GANTT CHART',x,305,30,COLORS.navy,700);
    draw(ctx,'ตุลาคม 2569 – กันยายน 2570',x+252,305,26,COLORS.sub,500);
    draw(ctx,rows.length+' กิจกรรม',right,303,30,COLORS.navy,700,'right');

    const legendY=370;
    let legendX=x;
    const used=new Set(selected);
    for(const name of selected){
      const color=(opts.colors||{})[name]||'#647e96';
      box(ctx,legendX,legendY-13,23,23,color,6);
      draw(ctx,name,legendX+34,legendY,24,COLORS.ink,600);
      legendX+=Math.min(340,Math.max(187,65+name.length*26));
    }
    if(!used.size)draw(ctx,'ไม่ได้เลือกแผนงาน',x,legendY,24,COLORS.sub,400);
    draw(ctx,'เรียงตามวันที่เริ่มต้น',right,legendY,24,COLORS.sub,400,'right');

    const headY=427,headH=75,firstRow=headY+headH;
    box(ctx,x,headY,right-x,headH,COLORS.navyDark,9);
    draw(ctx,'ลำดับ / รายการกิจกรรม',x+25,headY+headH/2,27,'#ffffff',700);
    const monthW=gridWidth/12;
    MONTHS.forEach(([month,year],i)=>{
      const bx=gridX+monthW*(i+.5);
      draw(ctx,month+' '+year,bx,headY+headH/2,26,'#ffffff',600,'center');
      if(i>0)line(ctx,gridX+monthW*i,headY,gridX+monthW*i,firstRow,'#45617a',1.7);
    });

    const footerTop=H-141;
    const available=footerTop-firstRow-12;
    const rowH=rows.length?Math.min(87,available/rows.length):87;
    const fontSize=Math.max(15,Math.min(27,rowH*.325));
    const metaSize=Math.max(11,Math.min(20,rowH*.225));
    const twoLine=rowH>=66;
    const rowBottom=firstRow+rows.length*rowH;
    for(let i=0;i<rows.length;i++){
      const item=rows[i],top=firstRow+i*rowH;
      const color=(opts.colors||{})[item.track]||'#6485a2';
      if(i%2===1)box(ctx,x,top,right-x,rowH,'#f6f9fc');
      if(i===0)line(ctx,x,top,right,top,COLORS.grid,1.8);
      line(ctx,x,top+rowH,right,top+rowH,COLORS.grid,1.6);
      draw(ctx,String(i+1).padStart(2,'0'),x+25,top+rowH/2,metaSize+2,'#8092a7',600);
      box(ctx,x+94,top+Math.max(8,(rowH-42)/2),6,Math.min(42,rowH-15),color,3);
      const titleX=x+117,titleMax=labelWidth-149;
      const titleLines=textRows(ctx,item.name,titleMax,twoLine?2:1,fontSize,600);
      const titleY=top+(twoLine?rowH*.235:rowH*.36);
      const lineStep=Math.min(30,fontSize*1.12);
      titleLines.forEach((t,k)=>draw(ctx,t,titleX,titleY+k*lineStep,fontSize,COLORS.ink,600));
      if(twoLine){
        const meta=item.track+'  ·  '+shortDate(item.startDate)+'  ·  '+(STATUS[item.status]||'');
        draw(ctx,meta,titleX,top+rowH-16,metaSize,COLORS.sub,400);
      }
      // Calendar grid.
      for(let j=0;j<=12;j++){
        const gx=gridX+j*monthW;
        line(ctx,gx,top,gx,top+rowH,j===0?'#b7c8d7':COLORS.grid,j===0?2.1:1.3);
      }
      const sx=gridX+gridWidth*dateFraction(item.startDate);
      const ex=gridX+gridWidth*dateFraction(item.endDate,true);
      const bw=Math.max(12,ex-sx);
      const barH=Math.max(8,Math.min(22,rowH*.29));
      box(ctx,sx,top+(rowH-barH)/2,bw,barH,color,Math.min(barH/2,7));
      if(bw>65&&item.status==='done')box(ctx,sx+bw-9,top+(rowH-barH)/2,9,barH,'#ffffff66',2);
    }
    if(!rows.length)draw(ctx,'ไม่มีรายการกิจกรรมในแผนที่เลือก',x+20,firstRow+84,31,COLORS.sub,500);
    if(rows.length>0)line(ctx,x,firstRow,right,firstRow,COLORS.grid,1.4);
    // Footer anchored for consistent A3 page regardless of data count.
    line(ctx,x,footerTop+15,right,footerTop+15,'#d5e0ea',2);
    draw(ctx,'คณะกรรมการประกันคุณภาพการศึกษา',x,footerTop+65,24,COLORS.sub,600);
    draw(ctx,'A3 แนวนอน · 1 หน้า · Sarabun',right,footerTop+65,22,COLORS.sub,400,'right');
    if(rowBottom>footerTop+4)throw Error('จำนวนกิจกรรมมากเกินพื้นที่ 1 หน้า');
  }
  function ascii(str){return new TextEncoder().encode(str);}
  function makePdf(jpg,width,height){
    // PDF 1.4: One A3 landscape page with a full-bleed, high-resolution DCT image.
    const parts=[],offsets=[0];let position=0;
    function write(v){const bytes=typeof v==='string'?ascii(v):v;parts.push(bytes);position+=bytes.byteLength;}
    const w=PAGE.pdfWidth,h=PAGE.pdfHeight;
    write('%PDF-1.4\n%QA2570\n');
    function openObj(n){offsets[n]=position;write(n+' 0 obj\n');}
    function closeObj(){write('\nendobj\n');}
    openObj(1);write('<< /Type /Catalog /Pages 2 0 R >>');closeObj();
    openObj(2);write('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');closeObj();
    openObj(3);write('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');closeObj();
    openObj(4);write('<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
    write(jpg);write('\nendstream');closeObj();
    const commands='q\n'+w+' 0 0 '+h+' 0 0 cm\n/Im0 Do\nQ\n';
    openObj(5);write('<< /Length '+ascii(commands).length+' >>\nstream\n'+commands+'endstream');closeObj();
    const xrefPosition=position;
    write('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)write(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    write('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xrefPosition+'\n%%EOF\n');
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
    if(activities.length>70)throw Error('มากกว่า 70 กิจกรรมต่อหน้า กรุณาเลือกเฉพาะบางแผนเพื่อให้ PDF อ่านได้ชัดเจน');
    // Ensure Sarabun is available before rasterising Thai. Normal page CSS loads it from Google Fonts.
    if(document.fonts){
      await Promise.all([
        document.fonts.load('700 63px Sarabun'),
        document.fonts.load('600 27px Sarabun'),
        document.fonts.load('400 22px Sarabun')
      ]);
      await document.fonts.ready;
    }
    const sorted=[...activities].sort((a,b)=>a.startDate.localeCompare(b.startDate)||String(a.id).localeCompare(String(b.id)));
    const canvas=document.createElement('canvas');
    canvas.width=PAGE.width;canvas.height=PAGE.height;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('อุปกรณ์ไม่รองรับการสร้าง PDF');
    render(ctx,sorted,selected,opts,await loadLogo());
    const jpg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
    if(!jpg)throw Error('แปลงข้อมูล Gantt เป็น PDF ไม่สำเร็จ');
    const pdf=makePdf(new Uint8Array(await jpg.arrayBuffer()),canvas.width,canvas.height);
    const url=URL.createObjectURL(pdf);
    const a=document.createElement('a');
    a.href=url;
    a.download='QA2570_Gantt_'+(selected.length===1?selected[0].replace(/[^\wก-๙-]/g,''):'AllPlans')+'.pdf';
    a.style.display='none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    return {bytes:pdf.size,rows:sorted.length,pages:1};
  }
  root.QAPdf={download,makePdf,PAGE};
})(window);
