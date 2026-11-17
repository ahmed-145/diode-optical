// Build injects pinned local WASM and worker source; no CDN or runtime fetch.
export function createScanner(config) {
  let worker,workerUrl,ready,pending,sequence=0,mainReady,backend='starting',serial=Promise.resolve();
  function main() {
    backend='ZXing WASM';
    return mainReady ||= ZXingWASM.prepareZXingModule({overrides:{wasmBinary:config.bytes},fireImmediately:true});
  }
  function init() {
    if(ready)return ready;
    ready=(async()=>{
      if(typeof Worker==='undefined')return main();
      try{
        workerUrl=URL.createObjectURL(new Blob([config.workerSource],{type:'text/javascript'}));
        worker=new Worker(workerUrl);URL.revokeObjectURL(workerUrl);workerUrl=null;
        await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error('Scanner worker initialization timed out')),10000);
          worker.onmessage=({data})=>{
            if(data.type==='ready'){clearTimeout(timeout);resolve();return;}
            if(data.type==='error'&&!data.id){clearTimeout(timeout);reject(new Error(data.error));return;}
            if(pending && data.id===pending.id){const request=pending;pending=null;data.type==='error'?request.reject(new Error(data.error)):request.resolve(data.results);}
          };
          worker.onerror=event=>{event.preventDefault?.();clearTimeout(timeout);const error=new Error(event.message||'Scanner worker failed');worker?.terminate();worker=null;if(pending){pending.reject(error);pending=null;}reject(error);};
          const bytes=config.bytes.slice();worker.postMessage({type:'init',bytes:bytes.buffer},[bytes.buffer]);
        });
        backend='ZXing WASM worker';
      }catch{
        worker?.terminate();worker=null;if(workerUrl)URL.revokeObjectURL(workerUrl);workerUrl=null;
        await main();
      }
    })();return ready;
  }
  async function scan(image,robust,maxSymbols) {
    await init();
    if(!worker){await main();const results=await ZXingWASM.readBarcodes(image,{formats:['QRCode'],tryHarder:robust,tryRotate:false,tryInvert:false,tryDownscale:false,maxNumberOfSymbols:maxSymbols,textMode:'Plain'});return results.map(result=>({bytes:result.bytes,position:result.position}));}
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timeout=setTimeout(()=>{worker?.terminate();worker=null;pending=null;reject(new Error('Scanner worker timed out; retry to use the fallback'));},5000);
      pending={id,resolve:results=>{clearTimeout(timeout);resolve(results);},reject:error=>{clearTimeout(timeout);reject(error);}};
      worker.postMessage({type:'scan',id,width:image.width,height:image.height,pixels:image.data.buffer,robust,maxSymbols},[image.data.buffer]);
    });
  }
  return {
    get backend(){return backend;},
    scan(image,robust=false,maxSymbols=1){maxSymbols=maxSymbols===2?2:1;const result=serial.then(()=>scan(image,robust,maxSymbols));serial=result.catch(()=>{});return result;}
  };
}
