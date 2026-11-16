import {prepare} from './encode.js';
import {formatBytes, MAX_FILE, PROFILES} from './common.js';
const $ = id => document.getElementById(id);
let selected, encoder, timer, sent = 0, busy = false, started = 0, burstFrames = 0;
function status(message, error = false) { $('status').textContent = message; $('status').dataset.error = String(error); }
function pause() { clearTimeout(timer); timer = null; $('play').textContent = 'Start stream'; $('mode').textContent = encoder ? 'PAUSED' : 'STANDBY'; }
function select(file) {
  pause(); encoder = null; selected = file; sent = 0; $('frames').textContent = '0'; $('encoded').textContent = '—';
  $('play').disabled = $('fullscreen').disabled = true; $('qr').hidden = true; $('empty').hidden = false;
  const valid = file && file.size <= MAX_FILE;
  $('prepare').disabled = !valid || busy;
  $('file-info').textContent = file ? `${file.name} · ${formatBytes(file.size)}` : 'Choose a file.';
  status(valid ? 'File selected. Prepare the transfer to continue.' : 'Choose a file of 5 MB or smaller.', !valid);
}
$('file').addEventListener('change', () => select($('file').files[0]));
$('demo').onclick = () => { $('file').value = ''; select(new File(['Hello across the gap.\n\nThis file travelled through light, not a network.\n— Diode Optical\n'], 'hello-from-diode.txt', {type: 'text/plain'})); };
$('prepare').onclick = async () => {
  if (!selected || busy) return;
  pause(); busy = true; $('profile').disabled = $('passphrase').disabled = $('compress').disabled = true; $('prepare').disabled = true; $('file').disabled = $('demo').disabled = true;
  $('play').disabled = $('fullscreen').disabled = true; status('Preparing, compressing and checking the file…');
  try {
    encoder = await prepare(new Uint8Array(await selected.arrayBuffer()), selected.name, {compress: $('compress').checked, passphrase: $('passphrase').value, block: PROFILES[$('profile').value || 'balanced'].block});
    sent = 0; $('frames').textContent = '0'; $('encoded').textContent = formatBytes(encoder.object.length);
    $('empty').hidden = true; $('qr').hidden = false; render(encoder.frame(0));
    $('play').disabled = $('fullscreen').disabled = false; $('mode').textContent = 'READY'; estimate();
    status('Ready. Start the stream, then scan with another device.');
  } catch (e) { encoder = null; $('qr').hidden = true; $('empty').hidden = false; status(e.message, true); }
  finally { busy = false; $('profile').disabled = $('passphrase').disabled = $('compress').disabled = false; $('prepare').disabled = !selected || selected.size > MAX_FILE; $('file').disabled = $('demo').disabled = false; }
};
function render(text) {
  const code = qrcode(0, 'M'); code.addData(text, 'Byte'); code.make();
  const n = code.getModuleCount(), scale = 7, border = 4, canvas = $('qr'); canvas.width = canvas.height = (n + border * 2) * scale;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (code.isDark(y, x)) ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
}
function tick() {
  const before = Date.now();
  try {
    render(encoder.frame()); sent++; burstFrames++; $('frames').textContent = sent.toLocaleString();
    const elapsed = (Date.now() - started) / 1000;
    if (elapsed >= 1) $('playback-rate').textContent = `${(burstFrames / elapsed).toFixed(1)} frames/s displayed · ${formatBytes(Math.round(burstFrames * encoder.block / elapsed))}/s optical payload before losses`;
    timer = setTimeout(tick, Math.max(0, 1000 / Number($('speed').value) - (Date.now() - before)));
  }
  catch (e) { pause(); status(e.message, true); }
}
$('play').onclick = () => {
  if (timer) { pause(); status('Paused. Receivers keep their recovered symbols.'); }
  else if (encoder) { started = Date.now(); burstFrames = 0; $('play').textContent = 'Pause stream'; $('mode').textContent = 'TRANSMITTING'; status('Broadcasting. Continue until every receiver confirms its file is verified.'); tick(); }
};
function estimate() {
  const block = encoder?.block || PROFILES[$('profile').value || 'balanced'].block;
  const rate = block * Number($('speed').value);
  const seconds = encoder ? Math.ceil(encoder.blocks / Number($('speed').value)) : null;
  const duration = seconds === null ? '' : ` · at least ${seconds < 60 ? seconds + ' seconds' : Math.ceil(seconds / 60) + ' minutes'} for this file`;
  $('estimate').textContent = `Up to ${formatBytes(rate)}/s before camera losses${duration}. Actual recovery takes longer.`;
}
$('speed').oninput = () => { $('speed-label').value = $('speed').value; estimate(); };
$('profile').onchange = () => {
  const profile = PROFILES[$('profile').value];
  $('speed').value = String(profile.fps); $('speed-label').value = $('speed').value;
  if (selected) select(selected); estimate();
};
$('fullscreen').onclick = async () => { try { if (!document.fullscreenElement) await $('preview').requestFullscreen(); else await document.exitFullscreen(); } catch { status('Fullscreen is unavailable. You can still scan the code.', true); } };
for (const id of ['passphrase', 'compress']) $(id).addEventListener('change', () => { if (selected) select(selected); });
$('preview').addEventListener('dragover', e => { e.preventDefault(); });
$('preview').addEventListener('drop', e => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) { $('file').value = ''; select(e.dataTransfer.files[0]); } });
window.addEventListener('pagehide', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { $('speed').value = '1'; $('speed-label').value = '1'; }

estimate();
