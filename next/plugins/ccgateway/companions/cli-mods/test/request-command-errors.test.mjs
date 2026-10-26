import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { installSupport, linkNatives } from './support.mjs';

test('CLI stores complete opaque HTTP error bodies and reserves envelopes for local failures', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-http-errors-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, ['request-command', 'request-options', 'request-output', 'request-error', 'request-policy', 'request-agent']);
    for (const [name, code] of Object.entries({
      'stub-transport.js': 'export class AnthropicClient {} export const createClient=async()=>new AnthropicClient(); export const modelFetch=()=>{};',
      'stub-context.js': 'export const mainAgentContext=()=>({});export const modelBetas=()=>[];',
      'stub-betas.js': 'export const betasAllowed=()=>true;',
      'stub-session.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
      'ccgateway-request-build.js': 'export const buildRequest=async body=>({body,headers:{},clientBetas:[],addedBetas:[]});',
      'ccgateway-model-request.js': `import fs from 'node:fs/promises';
        let body,offset=0;
        export const checkModelRequest=()=>null;export const defaultTimeout=600000;export const requestCapture=()=>{throw Error('no capture was asked for')};
        export const openModelRequest=async()=>{body=await fs.readFile('fixture.body');return {id:'x',ok:false,status:400,headers:{'content-type':'application/octet-stream'}}};
        export const cancelModelResponse=async()=>{};
        export const readModelResponse=async(response,signal,binary)=>{
          if(!binary)throw Error('HTTP errors must use byte reads');
          if(process.env.CCG_FIXTURE_FAIL && offset>0)throw Object.assign(Error('read ECONNRESET'),{code:'ECONNRESET',stack:'private detail'});
          const bytes=body.subarray(offset,offset+40000);offset+=bytes.length;
          return {done:bytes.length===0,bytes};
        };`,
      'run.mjs': `import {runRequestCommand} from './ccgateway-request-command.js';
        process.exitCode=await runRequestCommand(process.argv.slice(2));`
    })) await fs.writeFile(path.join(dir, name), code);
    await linkNatives(dir);
    const run = args => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['run.mjs', ...args], { cwd: dir, env: { ...process.env, CCG_FIXTURE_FAIL: args.includes('fail.json') ? '1' : '' } });
      const out=[],err=[];
      child.stdout.on('data', b=>out.push(b)); child.stderr.on('data', b=>err.push(b));
      child.on('error', reject);
      child.on('close', code=>resolve({code,stdout:Buffer.concat(out),stderr:Buffer.concat(err).toString()}));
      child.stdin.end('{"model":"fixture","messages":[{"role":"user","content":"hi"}]}');
    });
    for (const mode of ['--direct','--build']) {
      for (const body of [Buffer.alloc(0), Buffer.from('<html>400</html>'), Buffer.from('{ "error":{"message":"original"} }\n'), Buffer.concat([Buffer.from([0xff,0,0x80]),Buffer.alloc(140000,0x61)])]) {
        await fs.writeFile(path.join(dir,'fixture.body'),body);
        const result=await run([mode,'--response-meta','response.json']);
        assert.equal(result.code,2,result.stderr);
        assert.equal(result.stdout.length,0);
        const frame=JSON.parse(result.stderr.slice('CCG_REQUEST_ERROR '.length));
        assert.equal(frame.source,'http');assert.equal(frame.bodyFile,true);assert.equal(frame.bodyBytes,body.length);
        assert.equal(frame.headers['content-type'],'application/octet-stream');
        assert.deepEqual(await fs.readFile(path.join(dir,'response.json.error-body')),body);
        assert.ok(!('body' in frame));assert.ok(!frame.truncated);
      }
    }
    const inline=await run(['--direct']);
    const encoded=JSON.parse(inline.stderr.slice('CCG_REQUEST_ERROR '.length));
    assert.deepEqual(Buffer.from(encoded.bodyBase64,'base64'),await fs.readFile(path.join(dir,'fixture.body')));
    const failed=await run(['--direct','--response-meta','fail.json']);
    const frame=JSON.parse(failed.stderr.slice('CCG_REQUEST_ERROR '.length));
    assert.equal(failed.code,1);assert.equal(frame.source,'transport');assert.equal(frame.error.code,'ECONNRESET');
    assert.equal(frame.error.message,'read ECONNRESET');
    assert.ok(!('bodyFile' in frame));assert.ok(!failed.stderr.includes('private detail'));
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
