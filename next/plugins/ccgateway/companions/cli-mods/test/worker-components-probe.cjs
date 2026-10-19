const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const [workerBinary,cliBinary,output]=process.argv.slice(2);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cc-worker-v6-')),seen=[],reports=[];
const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);let bytes=Buffer.concat(chunks);if(req.headers['content-encoding']==='gzip')bytes=zlib.gunzipSync(bytes);
  const raw=bytes.toString('utf8'),body=JSON.parse(raw);seen.push({raw,body,headers:req.headers});
  if(body.probe==='error'){const status=body.error_status??429;res.writeHead(status,{'content-type':'application/json','retry-after':'3','x-should-retry':'true','set-cookie':'private'});res.end(JSON.stringify({type:'error',error:{type:'fixture_error',code:'fixture_'+status,message:'fixture'}}));return;}
  if(body.probe==='string-error'){
    const raw=JSON.stringify(body.nested?{error:'quota exceeded'}:'quota exceeded');
    res.writeHead(429,{'content-type':'application/json'});res.end(raw+(body.large?' '.repeat(70000):''));return;
  }
  const message={id:'msg_worker_test',type:'message',role:'assistant',model:body.model,content:[{type:'tool_use',id:'t_worker',name:'ClientTool',input:{value:'caller executes'}}],stop_reason:'tool_use',usage:{input_tokens:1,output_tokens:1}};
  if(body.stream){res.writeHead(200,{'content-type':'text/event-stream'});res.end(`event: message_start\ndata: ${JSON.stringify({type:'message_start',message})}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`);}
  else{res.setHeader('content-type','application/json');res.end(JSON.stringify(message));}
});
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)));
async function modeTest(mode){
  const reservation=http.createServer(),port=await listen(reservation);await new Promise(r=>reservation.close(r));
  const home=fs.mkdtempSync(path.join(root,mode+'-'));
  const child=spawn(workerBinary,[],{cwd:home,env:{PATH:process.env.PATH,HOME:home,CCG_BIND:`127.0.0.1:${port}`,CCG_API_KEY:'gateway-fake',CCG_ADMIN_KEY:'admin-fake',CCG_DATA_DIR:path.join(home,'data'),CLAUDE_CONFIG_DIR:path.join(home,'config'),CLAUDE_SECURESTORAGE_CONFIG_DIR:path.join(home,'config'),WORKER_CLI_PATH:cliBinary,CCG_REQUEST_MODE:mode,CCG_TIMEOUT:'30s',ANTHROPIC_API_KEY:'upstream-fake',ANTHROPIC_BASE_URL:`http://127.0.0.1:${server.address().port}`,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_AUTOUPDATER:'1'}});
  let stderr='';child.stderr.on('data',b=>stderr+=b);child.stdout.resume();
  const closed=new Promise(resolve=>child.on('close',resolve));
  const base=`http://127.0.0.1:${port}`;
  try{
    let ready=false;
    for(let i=0;i<300;i++){try{const h=await fetch(base+'/health');if(h.ok){ready=true;break;}}catch{}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
    assert.ok(ready,'worker not healthy: '+stderr);
    const top=[{type:'text',text:'GLOBAL_KEEP',cache_control:{type:'ephemeral'}}];
    const modern={role:'system',content:[{type:'text',text:'SYSTEM_ONE'},{type:'text',text:'SYSTEM_TWO',cache_control:{type:'ephemeral'}}],clear_at:'next_user_message'};
    const input={model:'claude-haiku-4-5-20251001',system:top,max_tokens:64,messages:[{role:'user',content:[{type:'text',text:'前 <system-reminder>OLD_CONTEXT</system-reminder> 后',cache_control:{type:'ephemeral'}}]},{role:'assistant',content:[{type:'tool_use',id:'t_old',name:'ClientTool',input:{value:'old'}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'t_old',content:[{type:'text',text:'<system-reminder>NESTED_CONTEXT</system-reminder>'}]}]},modern,{role:'user',content:[{type:'text',text:'LATEST'}]}],tools:[{name:'ClientTool',description:'client-owned',input_schema:{type:'object',properties:{value:{type:'string'}}}}]};
    const raw=JSON.stringify(input,null,1)+'\n';
    const before=seen.length;
    const response=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake','anthropic-beta':'mid-conversation-system-2026-04-07, mid-conversation-system-clear-at-2026-08-21,mid-conversation-system-2026-04-07','content-type':'application/json'},body:raw});
    const returned=await response.json();assert.equal(response.status,200,JSON.stringify(returned));assert.equal(returned.content[0].type,'tool_use');assert.equal(seen.length-before,1,'unexpected model loop');
    const request=seen.at(-1);assert.equal(request.headers['x-api-key'],'upstream-fake');assert.equal(request.headers['authorization'],undefined);
    assert.equal(request.headers['anthropic-beta'],'mid-conversation-system-2026-04-07,mid-conversation-system-clear-at-2026-08-21');
    assert.equal(request.headers['user-agent'],'ccgateway-request');
    for(const h of Object.keys(request.headers))assert.ok(!h.startsWith('x-stainless-')&&!h.startsWith('x-claude-'),h);
    if(mode==='direct')assert.equal(request.raw,raw);
    else{
      assert.deepEqual(request.body.system,top);assert.deepEqual(request.body.messages.find(m=>m.role==='system'),modern);
      const encoded=JSON.stringify(request.body.messages);for(const marker of ['OLD_CONTEXT','NESTED_CONTEXT','SYSTEM_ONE','SYSTEM_TWO','LATEST'])assert.equal(encoded.split(marker).length-1,1,marker);
      assert.ok(encoded.includes('前 <system-reminder>OLD_CONTEXT</system-reminder> 后'));
      assert.deepEqual(request.body.tools,input.tools);
      const logs=path.join(home,'data','request-logs');const componentFiles=fs.readdirSync(logs).map(p=>path.join(logs,p,'build-components.json')).filter(fs.existsSync);assert.equal(componentFiles.length,1);
      const component=JSON.parse(fs.readFileSync(componentFiles[0]));assert.equal(component.attachments.length,3);assert.ok(component.messages.some(m=>m.attachment));
    }
    const count=seen.length;
    const streamed=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake'},body:JSON.stringify({...input,stream:true})});const streamText=await streamed.text();assert.equal(streamed.status,200);assert.ok(streamText.includes('event: message_stop'));assert.equal(seen.length-count,1);
    const rejected=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'wrong'},body:raw});assert.equal(rejected.status,401);assert.equal(seen.length-count,1);
    if(mode==='build'){
      const unsafe=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake'},body:'{"model":"m","messages":[{"role":"user","content":"x"}],"large":9007199254740993}'});assert.equal(unsafe.status,400);assert.equal(seen.length-count,1);
    }
    for(const status of [400,401,403,429,500,529]){
      const response=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake'},body:JSON.stringify({...input,stream:false,probe:'error',error_status:status})});
      const error=await response.json();assert.equal(response.status,status);assert.equal(error.error.code,'fixture_'+status);assert.equal(response.headers.get('retry-after'),'3');assert.equal(response.headers.get('x-should-retry'),'true');assert.equal(response.headers.get('set-cookie'),null);
    }
    for(const nested of [false,true])for(const large of [false,true]){
      const response=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake'},body:JSON.stringify({...input,stream:false,probe:'string-error',nested,large})});
      const raw=await response.text();assert.equal(response.status,429);
      if(large)assert.equal(JSON.parse(raw).error.message,'quota exceeded');
      else assert.equal(raw,JSON.stringify(nested?{error:'quota exceeded'}:'quota exceeded'));
    }
    const invalidBeta=await fetch(base+'/v1/messages',{method:'POST',headers:{'x-api-key':'gateway-fake','anthropic-beta':'not a valid token'},body:JSON.stringify(input)});
    assert.equal(invalidBeta.status,400);assert.equal((await invalidBeta.json()).error.code,'cli_invalid_request');
    const beforeProbe=seen.length;
    const probe=await fetch(base+'/v1/ccgateway/probe',{method:'POST',headers:{'x-api-key':'gateway-fake'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:128,system:'Answer the user concisely.',messages:[{role:'user',content:'What is the capital of France?'}]})});
    assert.equal(probe.status,200);await probe.text();assert.equal(probe.headers.get('x-ccgateway-test-mode'),'native_build');assert.equal(seen.length-beforeProbe,1);assert.ok(JSON.stringify(seen.at(-1).body.system).includes('Answer the user concisely.'));assert.match(JSON.stringify(seen.at(-1).body.system), /You are (?:Claude Code|a Claude agent)/);assert.ok(JSON.stringify(seen.at(-1).body.system).includes('x-anthropic-billing-header:'));
    const logs=path.join(home,'data','request-logs');
    const records=fs.readdirSync(logs).map(n=>JSON.parse(fs.readFileSync(path.join(logs,n,'metadata.json'))));
    for(const status of [400,401,403,429,500,529])assert.ok(records.some(m=>m.status===status&&m.http_status===status&&m.error_code==='fixture_'+status),'missing accurate error log '+status);
    assert.equal(records.filter(m=>m.status===429&&m.error==='quota exceeded').length,4,'string errors must retain upstream text in diagnostics');
    reports.push({mode,passed:true,modelRequests:seen.length-before,bodyBytesEqual:request.raw===raw,systemAndRolesPreserved:true,headerPolicyPassed:true});
  }finally{child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),5000);await closed;clearTimeout(timer);}
}
(async()=>{await listen(server);try{await modeTest('build');await modeTest('direct');fs.writeFileSync(output,JSON.stringify({passed:true,reports},null,2));console.log(JSON.stringify({passed:true,reports}));}catch(error){fs.writeFileSync(output,JSON.stringify({passed:false,error:String(error),reports,last:seen.at(-1)},null,2));console.log(JSON.stringify({passed:false,error:String(error),reports,last:seen.at(-1)}));process.exitCode=1;}finally{server.closeAllConnections?.();server.close();}})();
