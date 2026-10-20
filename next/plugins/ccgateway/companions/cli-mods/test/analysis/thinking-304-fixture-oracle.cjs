#!/usr/bin/env node
// Scoped oracle for one fixed assembly fixture, not a universal model oracle.
// Executes the pristine native decision helpers and native uXn branches with
// explicitly recorded fresh-firstParty assumptions. Does not inspect outbound
// requests and does not alter CLI environment or implementation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../../../../../..'), restored=path.join(root,'artifacts/claude-2.1.304/linux-restored');
const parser=createRequire(path.join(root,'next/web/package.json'))('@babel/parser');
const docs=new Map(),evidence=[];
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const[k,v]of Object.entries(n)){if(['loc','extra','comments','leadingComments','trailingComments','innerComments'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn)}}
function read(file){if(docs.has(file))return docs.get(file);const text=fs.readFileSync(path.join(restored,file),'utf8'),ast=parser.parse(text,{sourceType:'module'}),sha256=crypto.createHash('sha256').update(text).digest('hex'),doc={file,text,ast,sha256};docs.set(file,doc);return doc}
function record(doc,node,name){const source=doc.text.slice(node.start,node.end);evidence.push({file:'artifacts/claude-2.1.304/linux-restored/'+doc.file,name,source_sha256:doc.sha256,node_sha256:crypto.createHash('sha256').update(source).digest('hex'),start:node.start,end:node.end,line:node.loc.start.line,column:node.loc.start.column,source});return source}
function extract(file,name){const doc=read(file),found=[];walk(doc.ast,n=>{if(n.type==='FunctionDeclaration'&&n.id?.name===name)found.push(n)});if(found.length!==1)throw Error('nonunique '+name);return record(doc,found[0],name)}
const helpers=[['chunk-7p6jp6kj.js','AQe'],['chunk-7p6jp6kj.js','z$o'],['chunk-7p6jp6kj.js','kqs'],['chunk-7p6jp6kj.js','h8n'],['chunk-pr2cfg7g.js','eK'],['chunk-4qs43hr1.js','I4'],['chunk-rncrmfyt.js','Hun'],['chunk-rncrmfyt.js','udr'],['chunk-rncrmfyt.js','Y7e']].map(([file,name])=>extract(file,name));
// Additional facts proving why the controlled environment has no negative
// capability override. X_ may still return true from a native catalog; both
// possible catalog results are checked below.
for(const[file,name]of[['chunk-7p6jp6kj.js','eHe'],['chunk-7p6jp6kj.js','l0'],['chunk-pr2cfg7g.js','GWo'],['chunk-pr2cfg7g.js','Qbt'],['chunk-pr2cfg7g.js','X_'],['chunk-pr2cfg7g.js','Lmn'],['chunk-pr2cfg7g.js','Pe'],['chunk-dxktn51d.js','IKe'],['chunk-4qs43hr1.js','VB'],['chunk-4qs43hr1.js','qB'],['chunk-7p6jp6kj.js','Run']])extract(file,name);
const core=read('chunk-rncrmfyt.js'),branches=[];
walk(core.ast,n=>{if(n.type==='VariableDeclarator'&&n.id?.name==='uXn')branches.push(n)});if(branches.length!==1)throw Error('nonunique uXn');
let thinkingBranch,displayBranch;
walk(branches[0],n=>{if(n.type==='IfStatement'&&n.test.type==='LogicalExpression'&&n.test.left?.name==='zy'&&n.test.right?.type==='MemberExpression'&&n.test.right.property?.name==='supported')thinkingBranch=n;if(n.type==='SwitchStatement'&&n.discriminant?.name==='RA')displayBranch=n});
if(!thinkingBranch||!displayBranch)throw Error('native thinking assembly shape changed');
const thinkingCode=record(core,thinkingBranch,'uXn.thinking-type-budget-branch'),displayCode=record(core,displayBranch,'uXn.display-switch');
const assumptions={provider:'firstParty',requestedModel:'claude-sonnet-4-6',canonicalModel:'claude-sonnet-4-6',freshProcess:true,thinkingTypeRuntimeOverride:'absent',capabilityEnvOverrides:'absent',modelCapabilitiesEnv:'absent',disableThinking:false,disableAdaptiveThinking:false,experimentalBetasAllowed:true,showThinkingSummaries:false,thinkingDisplayUpdates:'unset (native default true)',clientThinking:{type:'enabled',budget_tokens:1024},maxTokens:2048,extraBodyThinking:'absent',displayBetaRejectedLatch:false,displayRetryState:'idle',simulateProxyUsage:false};
function calculate(catalogCapability){
  const model=assumptions.canonicalModel, context=vm.createContext({
    a:{},qe:x=>x,Sd:()=> 'firstParty',Pe:()=> 'firstParty',yL:()=>false,
    eHe:()=>undefined,X_:()=>catalogCapability,IKe:()=>undefined,Run:()=>false,VB:()=>false,
    q$o:()=>{throw Error('firstParty I4 should short-circuit q$o')},
    zy:true,ft:{thinking:{supported:true}},J:{model},st:model,vt:model,
    nn:{type:'enabled',budgetTokens:1024},db:2048,Jk:undefined,kf:undefined,
    Sqs:()=>{throw Error('adaptive branch must not read a budget default')},dc:()=>false,
    zr:[],yne:{header:'native-display-updates'},Xa:{},lt:{},Rm:()=>false,IR:'idle',Qs:'firstParty',XTe:()=>{},AA:()=>{},
  });
  vm.runInContext(helpers.join('\n'),context,{timeout:1000});
  context.ft.thinking.supported=context.kqs(model);
  vm.runInContext(thinkingCode,context,{timeout:1000});
  context.RA=context.Hun(undefined,false);
  vm.runInContext(displayCode,context,{timeout:1000});
  const result=JSON.parse(JSON.stringify(context.kf));
  if(JSON.stringify(result)!==JSON.stringify({type:'adaptive',display:'updates'}))throw Error('Unexpected scoped native result '+JSON.stringify(result));
  return {catalogCapability:catalogCapability===undefined?'unspecified':true,supported:context.ft.thinking.supported,adaptive:context.AQe({resolvedModel:model,canonicalModel:model}),displayMode:context.RA,expectedThinking:result};
}
const result={schema:'ccgateway.thinking-fixture-oracle.v1',case_id:'params.thinking_enabled_budget',assumptions,evaluations:[calculate(undefined),calculate(true)],expected:{thinking:{type:'adaptive',display:'updates'}},scope:'Only this explicit controlled firstParty fixture. No wire output was used as the oracle; enabled budget is intentionally omitted because native AQe selects adaptive.',evidence};
const out=path.join(root,'artifacts/claude-2.1.304/assembly-audit/thinking-enabled-fixture-oracle.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output:out,expected:result.expected,evaluations:result.evaluations.length,sourceNodes:evidence.length}));
