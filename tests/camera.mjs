import assert from 'node:assert/strict';
// Real browser video/canvas pipeline with a synthetic optical source, not a physical camera.
export async function testCamera(browser) {
  const context=await browser.newContext({acceptDownloads:true}),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const source=await context.newPage();await source.goto('http://127.0.0.1:4173/sender.html');
  await source.locator('#profile').selectOption('balanced');
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
      canvas.width=image.width;canvas.height=image.height;
      const stream=canvas.captureStream(20);window.cameraTracks.push(...stream.getTracks());
      const timer=setInterval(()=>{
        if(stream.getVideoTracks()[0].readyState==='ended'){clearInterval(timer);return;}
        ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        if(window.cameraMode==='qr')ctx.drawImage(image,0,0);
      },50);
      if(window.cameraDelay)await new Promise(resolve=>{window.releaseCamera=resolve;});
      return stream;
    };
  },{png});
  await page.goto('http://127.0.0.1:4173/receiver.html');
  await page.locator('#start').click();await page.locator('#result').waitFor({timeout:20000});
  assert.match(await page.locator('#received-name').textContent(),/camera.txt/);
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
