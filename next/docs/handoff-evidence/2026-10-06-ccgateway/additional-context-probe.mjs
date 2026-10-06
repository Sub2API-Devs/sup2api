import fs from 'node:fs';
import crypto from 'node:crypto';
import { query } from './package/sdk.mjs';
const root=fs.mkdtempSync('/work/additional-context-probe-');
const hooks=[],results=[];let current=0;let wake;const queue=[];
const code1='MAPLE_'+crypto.randomBytes(5).toString('hex');
const code2='CEDAR_'+crypto.randomBytes(5).toString('hex');
const prompt='Report the currently configured example language and verification code. Reply only with JSON {"language":"...","code":"..."}. If no code has been configured, use UNKNOWN. Use the latest application configuration.';
const plans=[null,`Application configuration updated: the example language is now Java and the verification code is ${code1}. This configuration remains in effect for subsequent turns until another application update.`,null,`Application configuration updated: the example language is now Python and the verification code is ${code2}. This replaces the previous application configuration for this and subsequent turns.`,null];
async function* input(){while(true){if(!queue.length)await new Promise(r=>wake=r); const text=queue.shift();if(text===null)return;yield {type:'user',message:{role:'user',content:text},parent_tool_use_id:null,session_id:''};}}
const push=text=>{queue.push(text);wake?.();wake=null;};
const callback=async data=>{const context=plans[current];hooks.push({turn:current+1,event:data.hook_event_name,additionalContext:context});return context?{hookSpecificOutput:{hookEventName:'UserPromptSubmit',additionalContext:context}}:{};};
const options={pathToClaudeCodeExecutable:'/usr/local/bin/claude',cwd:root,model:'claude-opus-5-5',tools:[],mcpServers:{},strictMcpConfig:true,settingSources:[],maxTurns:2,systemPrompt:'You are a test assistant. Initial application configuration: example language Ruby; no verification code is configured. Application system reminders carry configuration updates. Use the latest application configuration.',hooks:{UserPromptSubmit:[{hooks:[callback]}]},stderr:s=>fs.appendFileSync(root+'/stderr.txt',s)};
const out=fs.createWriteStream(root+'/output.jsonl');
const q=query({prompt:input(),options});
const timer=setTimeout(()=>{q.close();console.error('TIMEOUT');process.exitCode=1;},240000);
push(prompt);
let sid;
try{for await(const m of q){out.write(JSON.stringify(m)+'\n');if(m.type!=='result')continue;sid=m.session_id;const r={turn:current+1,result:m.result,subtype:m.subtype,is_error:m.is_error};results.push(r);console.log(JSON.stringify(r));if(m.is_error||++current===plans.length){push(null);q.close();break;}push(prompt);}}
finally{clearTimeout(timer);out.end();}
if(results.length===5&&!results.some(r=>r.is_error)){
 const qr=query({prompt,options:{...options,resume:sid,hooks:{}}});
 const rt=setTimeout(()=>qr.close(),90000);
 try{for await(const m of qr){fs.appendFileSync(root+'/resume-output.jsonl',JSON.stringify(m)+'\n');if(m.type==='result'){const r={turn:6,resumed:true,result:m.result,subtype:m.subtype,is_error:m.is_error};results.push(r);console.log(JSON.stringify(r));}}}finally{clearTimeout(rt);qr.close();}
}
const summary={root,sdk:'0.3.291',cli:'2.1.288',model:options.model,code1,code2,hooks,results};
fs.writeFileSync(root+'/summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({artifacts:root,hooks,expected:[['Ruby','UNKNOWN'],['Java',code1],['Java',code1],['Python',code2],['Python',code2],['Python',code2]]}));
