import {FountainDecoder, openObject} from './decode.js';
import {formatBytes, MAX_FILE} from './common.js';
const $ = id => document.getElementById(id);
const decoder = new FountainDecoder(), scanCanvas = document.createElement('canvas');
const scanContext = scanCanvas.getContext('2d', {willReadFrequently: true});
let stream, loop, videoCallback, token = 0, epoch = 0, processing = false, object, verified, downloadUrl, imageBusy = false;
let scanCount = 0, qrCount = 0, invalidCount = 0, announced = -1, lastUseful = 0, lastHealth = 0, failed = false;
function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = String(error); }
function stop() {
  token++; clearTimeout(loop);
  if (videoCallback !== undefined && $('video').cancelVideoFrameCallback) $('video').cancelVideoFrameCallback(videoCallback);
  videoCallback = undefined;
  if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
  $('video').pause(); $('video').srcObject = null; $('video').hidden = true; $('camera-empty').hidden = false;
  $('start').disabled = false; $('stop').disabled = true; $('camera').disabled = false;
}
function reset() {
  stop(); epoch++; decoder.reset(); object = verified = null; processing = false; failed = false;
  scanCount = qrCount = invalidCount = 0; announced = -1; lastUseful = lastHealth = 0;
  $('result').hidden = $('unlock').hidden = true; $('unlock').disabled = false; $('progress').value = 0;
  $('recovered').textContent = '0%'; $('count').textContent = '0'; $('image').value = '';
  $('scan-health').textContent = 'Waiting for a QR stream. Keep the code’s white border visible.';
  if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null;
  status('Transfer reset. Ready for a new stream.');
}
async function unlock() {
  if (!object || processing) return;
  processing = true; $('unlock').disabled = true; const current = epoch, captured = object;
  try {
    const file = await openObject(captured, $('passphrase').value);
    if (current !== epoch || captured !== object) return;
    verified = file; $('received-name').textContent = `${file.name} · ${formatBytes(file.bytes.length)}`;
    $('hash').textContent = `SHA-256 ${file.sha256}`; $('result').hidden = false; $('unlock').hidden = true;
    status('File verified. Save it when you are ready.');
  } catch (e) { if (current === epoch) { $('unlock').hidden = false; status(e.message, true); } }
  finally { if (current === epoch) { processing = false; $('unlock').disabled = false; } }
}
async function accept(text, capturedEpoch = epoch) {
  if (capturedEpoch !== epoch || object || processing || failed || !/^DIO[12]:/.test(text)) return;
  let added;
  try { added = decoder.accept(text); }
  catch (e) {
    invalidCount++;
    if (e.message.startsWith('Different transfer')) status(e.message, true);
    return; // A damaged optical frame is expected; recovery uses the next good one.
  }
  if (!added) return;
  lastUseful = Date.now();
  $('progress').value = decoder.progress;
  const percent = Math.floor(decoder.progress * 100);
  $('recovered').textContent = `${percent}%`; $('count').textContent = decoder.rank.toLocaleString();
  if (percent !== announced) { announced = percent; status(`Collecting ${decoder.rank.toLocaleString()} independent symbols. Keep the whole code in view.`); }
  if (decoder.progress === 1) {
    processing = true; const current = epoch;
    try {
      const result = await decoder.recover(); if (current !== epoch) return;
      object = result; stop(); processing = false;
      $('scan-health').textContent = `Stream recovered · ${decoder.rank.toLocaleString()} useful symbols. Camera released.`;
      await unlock();
    } catch (e) { if (current === epoch) { processing = false; failed = true; stop(); status(`${e.message}. Reset before retrying.`, true); } }
  }
}
function health() {
  const now = Date.now(); if (now - lastHealth < 1000) return; lastHealth = now;
  const hint = lastUseful && now - lastUseful > 6000 ? ' Progress stalled: reduce sender speed, move closer, or use Robust.' : !qrCount ? ' Move closer and keep the full white border in view.' : '';
  $('scan-health').textContent = `${scanCount} camera frames checked · ${qrCount} QR codes seen · ${invalidCount} invalid transfer frames.${hint}`;
}
async function scan(source, width, height, capturedEpoch = epoch, camera = false) {
  if (!width || !height || capturedEpoch !== epoch) return;
  // Preserve enough modules for the dense profile without processing full 4K camera frames.
  const scale = Math.min(1, 1440 / Math.max(width, height)); scanCanvas.width = Math.round(width * scale); scanCanvas.height = Math.round(height * scale);
  scanContext.drawImage(source, 0, 0, scanCanvas.width, scanCanvas.height);
  const pixels = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
  const result = jsQR(pixels.data, pixels.width, pixels.height, {inversionAttempts: 'dontInvert'});
  if (camera) scanCount++;
  if (result) { if (camera) qrCount++; await accept(result.data, capturedEpoch); }
  if (camera && !object) health();
}
$('start').onclick = async () => {
  if (object || failed) { status('Save or reset the completed transfer before starting another.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { status('Camera access requires HTTPS or localhost in a supported browser. QR image import is also available.', true); return; }
  stop(); const current = token; $('start').disabled = true; $('stop').disabled = false; $('camera').disabled = true;
  status('Waiting for camera permission…');
  try {
    const opened = await navigator.mediaDevices.getUserMedia({video: $('camera').value ? {deviceId: {exact: $('camera').value}} : {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, frameRate: {ideal: 30}}, audio: false});
    if (current !== token) { opened.getTracks().forEach(t => t.stop()); return; }
    stream = opened;
    for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => {
      if (current === token) { stop(); status('Camera disconnected or permission revoked. Reconnect it and start again; your progress is retained.', true); }
    }, {once: true});
    $('video').srcObject = stream; await $('video').play();
    if (current !== token) return;
    $('video').hidden = false; $('camera-empty').hidden = true;
    status('Camera active. Point it at the sender’s QR code.');
    function schedule() {
      if (current !== token) return;
      if ($('video').requestVideoFrameCallback) videoCallback = $('video').requestVideoFrameCallback(tick);
      else loop = setTimeout(tick, 40);
    }
    async function tick() {
      if (current !== token) return;
      try { if ($('video').readyState >= 2) await scan($('video'), $('video').videoWidth, $('video').videoHeight, epoch, true); }
      catch (e) { if (current === token) { stop(); status(`Camera scan failed: ${e.message}`, true); } return; }
      schedule();
    }
    schedule();
    // Optional metadata must never delay scanning, including a promise that never resolves.
    Promise.resolve().then(() => navigator.mediaDevices.enumerateDevices?.() || []).then(devices => {
      if (current !== token || !stream) return;
      const selected = stream.getVideoTracks()[0]?.getSettings().deviceId;
      const cameras = devices.filter(d => d.kind === 'videoinput');
      $('camera').replaceChildren(new Option('Rear camera (default)', ''), ...cameras.map((d, i) => new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
      $('camera').value = selected || '';
    }).catch(() => {});
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
  const files = [...$('image').files], current = epoch;
  try {
    for (const file of files) {
      if (current !== epoch || object) break;
      if (file.size > 12 * MAX_FILE) { status('QR image is too large.', true); continue; }
      const bitmap = await createImageBitmap(file);
      try { if (bitmap.width * bitmap.height > 24000000) throw new Error('QR image dimensions are too large'); if (current === epoch) await scan(bitmap, bitmap.width, bitmap.height, current); }
      finally { bitmap.close(); }
    }
  } catch (e) { if (current === epoch) status(`Could not scan image: ${e.message}`, true); }
  finally { imageBusy = false; $('image').disabled = false; $('image').value = ''; }
};
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden && (stream || $('start').disabled)) { stop(); status('Camera stopped while this page was hidden.'); } });
