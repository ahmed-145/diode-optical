import assert from 'node:assert/strict';
// Real browser video/canvas pipeline with a synthetic optical source, not a physical camera.
export async function testCamera(browser) {
  const context=await browser.newContext({acceptDownloads:true}),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const source=await context.newPage();await source.goto('http://127.0.0.1:4173/sender.html');
  await source.locator('#profile').selectOption('iphone');
  const payload=Buffer.from('Synthetic camera transfer, through actual HTMLVideoElement.');
  await source.locator('#file').setInputFiles({name:'camera.txt',mimeType:'text/plain',buffer:payload});
  await source.locator('#prepare').click();await source.locator('#mode').filter({hasText:'READY'}).waitFor();
  const png=(await source.locator('#qr').screenshot()).toString('base64');
  const page=await context.newPage();
  await page.addInitScript(({png})=>{
    window.cameraTracks=[];window.cameraMode='qr';window.cameraDelay=false;window.labelsHang=true;
    navigator.mediaDevices.enumerateDevices=async()=>{if(window.labelsHang)return new Promise(()=>{});throw new Error('Device labels unavailable');};
    navigator.mediaDevices.getUserMedia=async()=>{
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=900;
      const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();
      canvas.width=Math.ceil(image.width*1.25);canvas.height=Math.ceil(image.height*1.25);
      const stream=canvas.captureStream(20);window.cameraTracks.push(...stream.getTracks());
      const timer=setInterval(()=>{
        if(stream.getVideoTracks()[0].readyState==='ended'){clearInterval(timer);return;}
        ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        if(window.cameraMode==='qr')ctx.drawImage(image,Math.floor((canvas.width-image.width)/2),Math.floor((canvas.height-image.height)/2));
      },50);
      if(window.cameraDelay)await new Promise(resolve=>{window.releaseCamera=resolve;});
      return stream;
    };
  },{png});
  await page.goto('http://127.0.0.1:4173/receiver.html');
  await page.locator('#start').click();await page.locator('#result').waitFor({timeout:20000});
  assert.match(await page.locator('#received-name').textContent(),/camera.txt/);
  assert.match(await page.locator('#scan-health').textContent(),/ZXing WASM worker/);
  assert(await page.evaluate(()=>window.cameraTracks.every(t=>t.readyState==='ended')),'Camera must release on completion');
  const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();
  const download=await downloadPromise;const {readFile}=await import('node:fs/promises');assert.deepEqual(await readFile(await download.path()),payload);
  // Stop during the permission request; a late stream must be discarded and stopped.
  await page.locator('#reset').click();await page.evaluate(()=>{window.cameraDelay=true;window.cameraMode='blank';});
  await page.locator('#start').click();await page.waitForFunction(()=>typeof window.releaseCamera==='function');
  await page.locator('#stop').click();await page.evaluate(()=>window.releaseCamera());
  await page.waitForFunction(()=>window.cameraTracks.every(t=>t.readyState==='ended'));
  assert.equal(await page.locator('#start').isEnabled(),true);assert.equal(await page.locator('#video').isHidden(),true);
  // Unexpected hardware end should offer recovery instead of keeping a dead video active.
  await page.evaluate(()=>{window.cameraDelay=false;});await page.locator('#start').click();
  await page.locator('#video').waitFor();
  await page.evaluate(()=>{const track=window.cameraTracks.at(-1);track.stop();track.dispatchEvent(new Event('ended'));});
  await page.locator('#status').filter({hasText:'Camera disconnected'}).waitFor();
  assert.equal(await page.locator('#start').isEnabled(),true);assert.equal(await page.locator('#video').isHidden(),true);
  // Reset while another permission request is pending, then accept a clean new stream.
  await page.evaluate(()=>{window.cameraDelay=true;delete window.releaseCamera;});await page.locator('#start').click();
  await page.waitForFunction(()=>typeof window.releaseCamera==='function');await page.locator('#reset').click();await page.evaluate(()=>window.releaseCamera());
  await page.waitForFunction(()=>window.cameraTracks.every(t=>t.readyState==='ended'));
  await page.evaluate(()=>{window.cameraDelay=false;window.cameraMode='qr';window.labelsHang=false;});await page.locator('#start').click();await page.locator('#result').waitFor();
  assert(await page.evaluate(()=>window.cameraTracks.every(t=>t.readyState==='ended')));
  assert.deepEqual(errors,[]);await context.close();
  console.log('Camera pipeline passed: live video QR recovery/download, missing device labels, stop/reset during pending permission, track-ended cleanup, restart.');
}

export async function testLiveOpticalStream(browser,profile='iphone') {
  // Two separate browsers keep both production pages visible and exercising their real render/capture loops.
  const sourceBrowser=await browser.browserType().launch({headless:true});
  const receiverContext=await browser.newContext({acceptDownloads:true});
  try{
    const source=await sourceBrowser.newPage();await source.goto('http://127.0.0.1:4173/sender.html');
    const payload=Buffer.from(Uint8Array.from({length:12288},(_,i)=>(i*71+(i>>>7))&255));
    await source.locator('#profile').selectOption(profile);await source.locator('#compress').uncheck();
    await source.locator('#file').setInputFiles({name:'live-optical.bin',mimeType:'application/octet-stream',buffer:payload});
    await source.locator('#prepare').click();await source.locator('#mode').filter({hasText:'READY'}).waitFor();
    await receiverContext.exposeBinding('nextOpticalFrame',async()=> (await source.locator('#qr').screenshot()).toString('base64'));
    await receiverContext.addInitScript(()=>{
      window.liveCameraTracks=[];
      navigator.mediaDevices.enumerateDevices=async()=>[];
      navigator.mediaDevices.getUserMedia=async()=>{
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=600;
        const stream=canvas.captureStream(30);window.liveCameraTracks=stream.getTracks();
        async function tick(){
          if(stream.getVideoTracks()[0].readyState==='ended')return;
          try{
            const image=new Image();image.src='data:image/png;base64,'+await window.nextOpticalFrame();await image.decode();
            if(stream.getVideoTracks()[0].readyState==='ended')return;
            const width=Math.ceil(image.width*1.25),height=Math.ceil(image.height*1.25);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
            ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,Math.floor((width-image.width)/2),Math.floor((height-image.height)/2));
          }catch(error){window.syntheticFrameError=String(error);}
          setTimeout(tick,50);
        }
        tick();return stream;
      };
    });
    const receiver=await receiverContext.newPage();await receiver.goto('http://127.0.0.1:4173/receiver.html');
    if(profile==='dual'){await receiver.locator('#framing').selectOption('wide');await receiver.locator('#scan-size').selectOption('1080');}
    await source.locator('#play').click();await source.waitForTimeout(600); // Receiver deliberately joins after the stream has begun.
    const started=Date.now();await receiver.locator('#start').click();await receiver.locator('#result').waitFor({timeout:30000});
    const elapsedMs=Date.now()-started;
    assert.match(await receiver.locator('#scan-health').textContent(),/ZXing WASM worker/);
    assert(await receiver.evaluate(()=>window.liveCameraTracks.every(t=>t.readyState==='ended')));
    const promise=receiver.waitForEvent('download');await receiver.locator('#save').click();const {readFile,writeFile}=await import('node:fs/promises');
    assert.deepEqual(await readFile(await (await promise).path()),payload);
    await writeFile(`test-results/live-optical-${profile}.json`,JSON.stringify({passed:true,profile,bytes:payload.length,elapsedMs,method:'Two actual browser pages, production refresh-paced sender, screenshot-relay synthetic video camera, worker scanner, late join, SHA-256 verified download. Driver overhead is included; this is not physical iPhone throughput.'},null,2));
    console.log('Continuous optical test passed:',payload.length,'bytes recovered in',elapsedMs,'ms via synthetic video, with late join and byte-identical download.');
  }finally{await receiverContext.close();await sourceBrowser.close();}
}
