import {FountainDecoder, openObject} from './decode.js';
import {formatBytes, MAX_FILE} from './common.js';
const $ = id => document.getElementById(id);
const decoder = new FountainDecoder(), scanCanvas = document.createElement('canvas');
const scanContext = scanCanvas.getContext('2d', {willReadFrequently: true});
let stream, loop, token = 0, processing = false, object, verified, downloadUrl, imageBusy = false;
function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = String(error); }
function stop() {
  token++; clearTimeout(loop); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
  $('video').pause(); $('video').srcObject = null; $('video').hidden = true; $('camera-empty').hidden = false;
  $('start').disabled = false; $('stop').disabled = true; $('camera').disabled = false;
}
function reset() {
  stop(); decoder.reset(); object = verified = null; processing = false;
  $('result').hidden = $('unlock').hidden = true; $('progress').value = 0;
  $('recovered').textContent = '0%'; $('count').textContent = '0'; $('image').value = '';
  if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null;
  status('Transfer reset. Ready for a new stream.');
}
async function unlock() {
  if (!object || processing) return;
  processing = true; $('unlock').disabled = true; const current = token, captured = object;
  try {
    const file = await openObject(captured, $('passphrase').value);
    if (current !== token || captured !== object) return;
    verified = file; $('received-name').textContent = `${file.name} · ${formatBytes(file.bytes.length)}`;
    $('hash').textContent = `SHA-256 ${file.sha256}`; $('result').hidden = false; $('unlock').hidden = true;
    status('File verified. Save it when you are ready.');
  } catch (e) { if (current === token) { $('unlock').hidden = false; status(e.message, true); } }
  finally { if (current === token) { processing = false; $('unlock').disabled = false; } }
}
async function accept(text) {
  if (object || processing || !text.startsWith('DIO1:')) return;
  let added;
  try { added = decoder.accept(text); }
  catch (e) { status(e.message, true); return; }
  if (!added) return;
  $('progress').value = decoder.progress; $('recovered').textContent = `${Math.floor(decoder.progress * 100)}%`;
  $('count').textContent = decoder.rank.toLocaleString();
  status(`Collecting ${decoder.rank.toLocaleString()} independent symbols. Keep the whole code in view.`);
  if (decoder.progress === 1) {
    processing = true; const current = token;
    try { const result = await decoder.recover(); if (current !== token) return; object = result; stop(); processing = false; await unlock(); }
    catch (e) { if (current === token) { processing = false; stop(); status(`${e.message}. Reset before retrying.`, true); } }
  }
}
async function scan(source, width, height) {
  if (!width || !height) return;
  const scale = Math.min(1, 1000 / Math.max(width, height)); scanCanvas.width = Math.round(width * scale); scanCanvas.height = Math.round(height * scale);
  scanContext.drawImage(source, 0, 0, scanCanvas.width, scanCanvas.height);
  const pixels = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
  const result = jsQR(pixels.data, pixels.width, pixels.height, {inversionAttempts: 'dontInvert'});
  if (result) await accept(result.data);
}
$('start').onclick = async () => {
  if (object) { status('Save or reset the completed transfer before starting another.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { status('Camera access requires HTTPS or localhost in a supported browser. QR image import is also available.', true); return; }
  stop(); const current = token; $('start').disabled = true; $('camera').disabled = true;
  status('Waiting for camera permission…');
  try {
    const opened = await navigator.mediaDevices.getUserMedia({video: $('camera').value ? {deviceId: {exact: $('camera').value}} : {facingMode: {ideal: 'environment'}, width: {ideal: 1280}}, audio: false});
    if (current !== token) { opened.getTracks().forEach(t => t.stop()); return; }
    stream = opened; $('video').srcObject = stream; await $('video').play();
    if (current !== token) return;
    $('video').hidden = false; $('camera-empty').hidden = true; $('stop').disabled = false;
    status('Camera active. Point it at the sender’s QR code.');
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    if (current !== token) return;
    const selected = stream.getVideoTracks()[0]?.getSettings().deviceId;
    $('camera').replaceChildren(new Option('Rear camera (default)', ''), ...devices.map((d, i) => new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
    $('camera').value = selected || '';
    async function tick() {
      if (current !== token) return;
      try { if ($('video').readyState >= 2) await scan($('video'), $('video').videoWidth, $('video').videoHeight); }
      catch (e) { if (current === token) { stop(); status(`Camera scan failed: ${e.message}`, true); } return; }
      if (current === token) loop = setTimeout(tick, 80);
    }
    tick();
  } catch (e) { if (current === token) { stop(); status(`Could not start camera: ${e.message}`, true); } }
};
$('stop').onclick = () => { stop(); status('Camera stopped. Your recovery progress is retained.'); };
$('reset').onclick = reset;
$('unlock').onclick = unlock;
$('save').onclick = () => {
  if (!verified) return; if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(new Blob([verified.bytes], {type: 'application/octet-stream'}));
  const a = document.createElement('a'); a.href = downloadUrl; a.download = verified.name; a.click();
};
$('image').onchange = async () => {
  if (imageBusy) return; imageBusy = true; $('image').disabled = true;
  const files = [...$('image').files], current = token;
  try {
    for (const file of files) {
      if (current !== token || object) break;
      if (file.size > 12 * MAX_FILE) { status('QR image is too large.', true); continue; }
      const bitmap = await createImageBitmap(file);
      try { if (bitmap.width * bitmap.height > 24000000) throw new Error('QR image dimensions are too large'); if (current === token) await scan(bitmap, bitmap.width, bitmap.height); }
      finally { bitmap.close(); }
    }
  } catch (e) { status(`Could not scan image: ${e.message}`, true); }
  finally { imageBusy = false; $('image').disabled = false; $('image').value = ''; }
};
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden && stream) { stop(); status('Camera stopped while this page was hidden.'); } });
