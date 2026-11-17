let scannerReady;
self.onmessage=async({data:message})=>{
  if(message.type==='init'){
    scannerReady=ZXingWASM.prepareZXingModule({overrides:{wasmBinary:new Uint8Array(message.bytes)},fireImmediately:true});
    try{await scannerReady;self.postMessage({type:'ready'});}catch(error){self.postMessage({type:'error',error:String(error.message||error)});}return;
  }
  if(message.type!=='scan')return;
  try{
    await scannerReady;
    const results=await ZXingWASM.readBarcodes({data:new Uint8ClampedArray(message.pixels),width:message.width,height:message.height},{formats:['QRCode'],tryHarder:message.robust,tryRotate:false,tryInvert:false,tryDownscale:false,maxNumberOfSymbols:message.maxSymbols===2?2:1,textMode:'Plain'});
    self.postMessage({type:'result',id:message.id,results:results.map(result=>({bytes:result.bytes,position:result.position}))});
  }catch(error){self.postMessage({type:'error',id:message.id,error:String(error.message||error)});}
};
