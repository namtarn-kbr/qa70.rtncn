'use strict';
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  return res.status(410).json({error:'เอกสารแนบของระบบนี้ใช้ลิงก์ Google Drive โดยตรง'});
};
