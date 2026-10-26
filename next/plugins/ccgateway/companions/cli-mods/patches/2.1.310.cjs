// The 2.1.310 anchors: where the CCGateway CLI changes CC's own functions.
// Every edit names a hash-bound module and one function in it, and replaces
// text that must occur exactly once there (once). Code and names that are
// the same for every version live in patch-cli.cjs and the support modules;
// what a new version needs is a new copy of this file with its own anchors,
// each re-derived and reviewed (docs/CLI-UPGRADE-RUNBOOK.md).
module.exports = ({ edit, once, surround, core, entryStub }) => {
  // The request command's entry ahead of the CLI entry's (Ye) own handling,
  // before its first fast-path branch (the GitHub stand-in, r): e is its
  // argument list and s the settings source of CC's fast-path policy.
  edit('cli.js', 'Ye', t => once(t, 'if(r!==void 0){', entryStub('e', 's') + 'if(r!==void 0){'));
  // The session ID is the request's (request-identity.js), else CC's own.
  edit('chunk-wrtp8qz8.js', 'Fr', t => once(t, 'id:_Yt()??uie()', 'id:ccgRequestSessionID()??_Yt()??uie()'));
  surround('chunk-wrtp8qz8.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
  // Only reporting readers change. Resource admission, Git concurrency, process
  // memory accounting, identity and node:os itself keep their native behavior.
  edit('chunk-c6dz8eqs.js', 'nki', t => {
    t = once(t, 'if(!ahr())return;let[e,r]=', 'if(!ahr())return;let ccgResources=ccgContainerResources();let[e,r]=');
    t = once(t, 'Pe(u(t,{bigint:!0}),s).catch(()=>{return})',
      'ccgResources?Promise.resolve(void 0):Pe(u(t,{bigint:!0}),s).catch(()=>{return})');
    t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
      'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*a):r===void 0?-1n:r.bavail*r.bsize;');
    t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
    return once(t, 'cpus:d(),memory_gb:Math.round(p()/Number(a))',
      'cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))');
  });
  edit('chunk-c57c64b0.js', 'X', t => {
    t = once(t, 'if(p.length===0)return null;', 'if(p.length===0)return null;let ccgResources=ccgContainerResources();');
    return once(t,
      'n.free_mem_mb=Math.round(H.freemem()/1048576),n.load_avg_1m=Math.round((H.loadavg()[0]??0)*100)/100,n.checkpoint_count=p.length;',
      'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(H.freemem()/1048576);n.load_avg_1m=Math.round((H.loadavg()[0]??0)*100)/100}n.checkpoint_count=p.length;');
  });
  for (const file of ['chunk-c6dz8eqs.js', 'chunk-c57c64b0.js']) {
    surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
  }
  // The client's custom tools are registered as CC tools (native-tools.js), so
  // CC's own policy sees them; their definitions stay the client's, verbatim: a
  // tool definition is the client's data, and CC's own assembly (strict/eager
  // fields, description hooks, provider stripping) applies only to CC's tools,
  // which never enter this branch.
  edit(core, 'rH', t => once(t, 'async function rH(e,n){', 'async function rH(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  edit(core, 'rSn', t => {
    // A probe run (request-build injectLayers) is CC's native request for the
    // layers given to a request that is not CC's: it keeps the native system,
    // tools and message pipeline, with the client's betas, and is never sent.
    const wire = '(Q.ccgatewayBuildOnly===true&&Q.ccgatewayNativeProbe!==true)';
    // External requests own their wire tools, including declaration order and
    // omitted fields. Native tool discovery still runs for native policy, but
    // its filtered/reordered catalogue is not the external request's payload.
    t = once(t, '...Jh.tools!==void 0&&{tools:Jh.tools},', '...(' + wire + '?Q.ccgatewayWireTools!==void 0&&{tools:structuredClone(Q.ccgatewayWireTools)}:Jh.tools!==void 0&&{tools:Jh.tools}),');
    // K2 reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
    // an external request after validation. Keep ordinary CLI behavior intact;
    // native parameter derivation below still operates on this fresh object.
    t = once(t, 'sl=K2(Rl);', 'sl=Q.ccgatewayBuildOnly===true?{}:K2(Rl);');
    t = once(t, 'let St=be(()=>hnr(Q.model,{isAgenticQuery:kt})),', 'let St=Q.ccgatewayBuildOnly===true?(Q.ccgatewayRequestBetas??[]).map(ccgateway_native_betaFromHeader):be(()=>hnr(Q.model,{isAgenticQuery:kt})),');
    t = once(t, 'system:Jh.system,', 'system:' + wire + '?Q.ccgatewaySystemBlocks:Jh.system,');
    t = once(t, 'messages:kS!==null&&kS.sliceFrom>0?ep.slice(Hi[kS.sliceFrom]):ep,', 'messages:' + wire + '?structuredClone(Q.ccgatewayWireMessages):kS!==null&&kS.sliceFrom>0?ep.slice(Hi[kS.sliceFrom]):ep,');
    t = once(t, 'ep=xT=Tkr(', 'ep=xT=' + wire + '?structuredClone(Q.ccgatewayWireMessages):Tkr(');
    t = once(t, 'fs={model:Q.model,', 'fs={ccgatewayInput:' + wire + ',model:Q.model,');
    // fWs hashes the first user prompt; external wire messages carry native
    // attachments as reminder blocks, which request-build skips (fingerprintMessages).
    t = once(t, 'let cyt=fWs(ou),', 'let cyt=fWs(Q.ccgatewayBuildOnly===true?Q.ccgatewayFingerprintMessages:ou),');
    t = once(t, 'fingerprint:cyt,agentContext:Q.agentContext,', 'fingerprint:cyt,ccgatewayCaptureBilling:Q.ccgatewayBuildOnly===true?Q.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:Q.ccgatewayBuildOnly===true?Q.ccgatewayCapturePrefix:void 0,agentContext:Q.agentContext,');
    return once(t, 'let Qn=hRe(()=>m$({maxRetries:0,', 'if(Q.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:Ceo({model:Q.model,fastMode:false})};return}let Qn=hRe(()=>m$({maxRetries:0,');
  });
  // External wire history has already been validated. Native repair, reminder
  // folding and media pruning are for CLI-owned records, not external messages.
  edit(core, 'tSn', t => once(t, 'function tSn(e,n){', 'function tSn(e,n){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
  edit(core, 'UC', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;Pr();ls();jn.push(dr);continue}case\"system\":"));
  edit(core, 'Tkr', t => once(t, "if(mt.type===\"api_system\"){", "if(mt.type===\"api_system\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));
  // The client factory (m$) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration.
  edit('chunk-bbw420pv.js', 'm$', t => {
    t = once(t, 'async function m$(e){let{apiKey:n,', 'async function m$(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,ee=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Od(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let ee=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'Be=ljt(),', 'Be=ccgatewayAPIKeyOnly?{}:ljt(),');
    t = once(t, 'let Pt=await Eue({credentials:L,storageV5:j}),Vt=Ln(),un=xtt({anthropicAuthEnabled:tl(),oauthScopes:Vt?.scopes}),', 'let Pt=ccgatewayAPIKeyOnly?void 0:await Eue({credentials:L,storageV5:j}),Vt=ccgatewayAPIKeyOnly?null:Ln(),un=ccgatewayAPIKeyOnly?false:xtt({anthropicAuthEnabled:tl(),oauthScopes:Vt?.scopes}),');
    return once(t, 'if(!un&&!Wr())be=await yy(je,ye());await w4e();', 'if(!ccgatewayAPIKeyOnly&&!un&&!Wr())be=await yy(je,ye());if(!ccgatewayAPIKeyOnly)await w4e();else for(let name of Object.keys(je))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete je[name];');
  });
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header (request-agent.js setClientUserAgent); any
  // other request gets CC's (M$), for the entrypoint set on the request.
  edit('chunk-bbw420pv.js', 'ml', t => once(t, '"User-Agent":M$()', '"User-Agent":ccgatewayClientUserAgent()??M$()'));
  surround('chunk-bbw420pv.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
  // Capture the generated attribution and the identity line BEFORE system
  // grouping can replace them with the client's blocks. The native function
  // retains its opt-out rules, and the line is the one $Vn selected for
  // recordedCliPrefix (null when the request carries none).
  edit('chunk-f7aya6cs.js', 'EFs', t => once(t, 'd=Li([s,n,...e].filter(Boolean));', 'd=Li([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
  // The environment snapshot renders the proxy note the request asked for, and
  // none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
  // is otherwise the process's own and would reach the content policy unasked.
  edit(core, 'yao', t => once(t, 'ZW(e)?ede(e):cao()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:ZW(e)?ede(e):cao()'));
};
