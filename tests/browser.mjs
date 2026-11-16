import assert from 'node:assert/strict';
import {testCamera} from './camera.mjs';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
const engine = process.env.BROWSER_ENGINE || 'chromium';
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
if (!['chromium','firefox','webkit'].includes(engine)) throw new Error('Unsupported browser engine');
const server = spawn(process.execPath, ['scripts/serve.mjs'], {stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject) => {server.stdout.on('data',d=>{if(d.toString().includes('Diode:'))resolve();});server.on('exit',code=>reject(new Error(`Server exited ${code}`)));});
let browser;
async function waitPrepared(page) {
  await page.waitForFunction(() => document.getElementById('status').dataset.error === 'true' || (!document.getElementById('qr').hidden && !document.getElementById('prepare').disabled));
  assert.equal(await page.locator('#status').getAttribute('data-error'), 'false', await page.locator('#status').textContent());
}
try {
  browser = await engines[engine].launch({headless:true});
  const context = await browser.newContext({acceptDownloads:true}), errors=[], external=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  context.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:4173/')&&!req.url().startsWith('blob:'))external.push(req.url());});
  const sender=await context.newPage(),receiver=await context.newPage();
  await sender.goto('http://127.0.0.1:4173/sender.html');
  await receiver.goto('http://127.0.0.1:4173/receiver.html');
  assert.equal(await sender.locator('#prepare').isDisabled(),true);
  const payload=Buffer.from('Optical browser round trip\n'.repeat(3));
  await sender.locator('#file').setInputFiles({name:'browser-check.txt',mimeType:'text/plain',buffer:payload});
  await sender.locator('#passphrase').fill('browser test passphrase');
  await sender.locator('#compress').uncheck();
  await sender.locator('#prepare').click();
  await waitPrepared(sender);
  await sender.locator('#speed').press('Home');
  await sender.locator('#speed').dispatchEvent('input');
  assert.equal(await sender.locator('#speed-label').textContent(),'1');
  // Scan real screenshots of the rendered canvas, through the image import UI.
  for(let i=0;i<12 && await receiver.locator('#result').isHidden() && await receiver.locator('#unlock').isHidden();i++){
    if(i>0){await sender.locator('#play').click();await sender.waitForTimeout(1100);await sender.locator('#play').click();}
    const image=await sender.locator('#qr').screenshot();
    await receiver.locator('#image').setInputFiles({name:`frame-${i}.png`,mimeType:'image/png',buffer:image});
    await receiver.waitForFunction(()=>!document.getElementById('image').disabled);
  }
  await receiver.locator('#unlock').waitFor();
  await receiver.locator('#passphrase').fill('wrong passphrase');await receiver.locator('#unlock').click();
  await receiver.locator('#status').filter({hasText:'Wrong passphrase'}).waitFor();
  assert.equal(await receiver.locator('#result').isHidden(),true);
  await receiver.locator('#passphrase').fill('browser test passphrase');await receiver.locator('#unlock').click();
  await receiver.locator('#result').waitFor();
  assert.match(await receiver.locator('#received-name').textContent(),/browser-check.txt/);
  const downloadPromise=receiver.waitForEvent('download');await receiver.locator('#save').click();
  const download=await downloadPromise;assert.deepEqual(await readFile(await download.path()),payload);
  await receiver.locator('#reset').click();assert.equal(await receiver.locator('#recovered').textContent(),'0%');assert.equal(await receiver.locator('#result').isHidden(),true);
  for (const profile of ['robust','dense']) {
    const bytes=Buffer.from('Profile check: '+profile);
    await sender.locator('#profile').selectOption(profile);
    await sender.locator('#file').setInputFiles({name:'profile.bin',mimeType:'application/octet-stream',buffer:bytes});
    await sender.locator('#passphrase').fill('');await sender.locator('#prepare').click();
    await waitPrepared(sender);
    const image=await sender.locator('#qr').screenshot();
    await receiver.locator('#image').setInputFiles({name:profile+'.png',mimeType:'image/png',buffer:image});
    await receiver.locator('#result').waitFor();
    const promise=receiver.waitForEvent('download');await receiver.locator('#save').click();
    const file=await promise;assert.deepEqual(await readFile(await file.path()),bytes);
    await receiver.locator('#reset').click();
  }
  await receiver.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError');};});
  await receiver.reload();await receiver.locator('#start').click();await receiver.locator('#status').filter({hasText:'Could not start camera'}).waitFor();assert.equal(await receiver.locator('#start').isEnabled(),true);
  // Network independence after the initial page load.
  await context.setOffline(true);await sender.locator('#demo').click();await sender.locator('#passphrase').fill('');await sender.locator('#prepare').click();await waitPrepared(sender);
  await sender.locator('#play').click();await sender.waitForTimeout(1200);await sender.locator('#play').click();assert(Number(await sender.locator('#frames').textContent())>0);
  await mkdir('test-results',{recursive:true});
  for(const width of [390,1440]){
    await sender.setViewportSize({width,height:1000});
    assert(await sender.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await sender.screenshot({path:`test-results/sender-${width}.png`,fullPage:true});
  }
  await receiver.screenshot({path:'test-results/receiver.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await context.close();
  if (engine === 'chromium') await testCamera(browser);
  await writeFile('test-results/browser-result.json',JSON.stringify({passed:true,engine,browser:browser.version(),syntheticCamera:engine==='chromium'?'passed':'not run',checks:['all three profiles through real QR screenshots','AES-GCM wrong/right passphrase','verified file download byte comparison','reset','camera denial','offline playback','mobile/desktop overflow','no page errors or external requests']},null,2));
  console.log('Browser checks passed: optical UI round trip, encryption, download, reset, camera denial, offline operation, responsive layout.');
} catch (error) {
  if (browser) {
    await mkdir('test-results',{recursive:true});
    for (const [i,page] of browser.contexts().flatMap(c=>c.pages()).entries()) {
      console.error('Browser failure state',i,await page.locator('#status').textContent().catch(()=>''),await page.locator('#mode').textContent().catch(()=>''));
      await page.screenshot({path:`test-results/failure-${i}.png`,fullPage:true}).catch(()=>{});
    }
  }
  throw error;
} finally {if(browser)await browser.close();server.kill();}
