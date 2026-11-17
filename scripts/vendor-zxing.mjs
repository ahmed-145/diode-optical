// Maintainer-only vendoring helper. Runtime pages never download from a CDN.
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const version='3.1.7';
const taskDir=await mkdtemp(join(tmpdir(),'diode-zxing-'));
const pack=JSON.parse(execFileSync('npm',['pack',`zxing-wasm@${version}`,'--ignore-scripts','--json'],{cwd:taskDir,encoding:'utf8'}))[0];
const archive=join(taskDir,pack.filename);
await mkdir('vendor',{recursive:true});
for(const [path,destination] of [['package/dist/iife/reader/index.js','vendor/zxing-reader.js'],['package/dist/reader/zxing_reader.wasm','vendor/zxing-reader.wasm'],['package/LICENSE','vendor/zxing.LICENSE']]){
  const data=execFileSync('tar',['-xOf',archive,path],{maxBuffer:16*1024*1024});await writeFile(destination,data);
  console.log(destination,createHash('sha256').update(data).digest('hex'));
}
const wasm=await readFile('vendor/zxing-reader.wasm');if(!WebAssembly.validate(wasm))throw new Error('Invalid WASM');
await writeFile('vendor/zxing-manifest.json',JSON.stringify({package:'zxing-wasm',version,integrity:pack.integrity,wasmSha256:createHash('sha256').update(wasm).digest('hex'),source:'https://github.com/Sec-ant/zxing-wasm',wasmSource:'https://github.com/zxing-cpp/zxing-cpp',licenses:['MIT (wrapper)','Apache-2.0 (ZXing-C++)']},null,2)+'\n');
