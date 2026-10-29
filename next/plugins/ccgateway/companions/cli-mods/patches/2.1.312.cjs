// The 2.1.312 anchors: where the CCGateway CLI changes CC's own functions.
// Every edit names a hash-bound module and one function in it, and replaces
// text that must occur exactly once there (once). Code and names that are
// the same for every version live in patch-cli.cjs and the support modules;
// what a new version needs is a new copy of this file with its own anchors,
// each re-derived and reviewed (docs/CLI-UPGRADE-RUNBOOK.md).
module.exports = ({ edit, once, surround, core, entryStub }) => {
  // The request command's entry ahead of the CLI entry's (Ke) own handling,
  // before its first fast-path branch (the GitHub stand-in, a): e is its
  // argument list and r the settings source of CC's fast-path policy.
  edit('cli.js', 'Ke', t => once(t, 'if(a!==void 0){', entryStub('e', 'r') + 'if(a!==void 0){'));
  // The session ID is the request's (request-identity.js), else CC's own.
  edit('chunk-zpsbh0wk.js', 'Rt', t => once(t, 'id:t8t()??jae()', 'id:ccgRequestSessionID()??t8t()??jae()'));
  surround('chunk-zpsbh0wk.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
  // Only reporting readers change. Resource admission, Git concurrency, process
  // memory accounting, identity and node:os itself keep their native behavior.
  edit('chunk-7cks3gqr.js', 'YOi', t => {
    t = once(t, 'if(!pwr())return;let[e,r]=', 'if(!pwr())return;let ccgResources=ccgContainerResources();let[e,r]=');
    t = once(t, 'Pe(u(t,{bigint:!0}),s).catch(()=>{return})',
      'ccgResources?Promise.resolve(void 0):Pe(u(t,{bigint:!0}),s).catch(()=>{return})');
    t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
      'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*a):r===void 0?-1n:r.bavail*r.bsize;');
    t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
    return once(t, 'cpus:d(),memory_gb:Math.round(p()/Number(a))',
      'cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))');
  });
  edit('chunk-rjc7jjmb.js', 'V', t => {
    t = once(t, 'if(p.length===0)return null;', 'if(p.length===0)return null;let ccgResources=ccgContainerResources();');
    return once(t,
      'n.free_mem_mb=Math.round(F.freemem()/1048576),n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100,n.checkpoint_count=p.length;',
      'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(F.freemem()/1048576);n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100}n.checkpoint_count=p.length;');
  });
  for (const file of ['chunk-7cks3gqr.js', 'chunk-rjc7jjmb.js']) {
    surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
  }
  // The client's custom tools are registered as CC tools (native-tools.js), so
  // CC's own policy sees them; their definitions stay the client's, verbatim: a
  // tool definition is the client's data, and CC's own assembly (strict/eager
  // fields, description hooks, provider stripping) applies only to CC's tools,
  // which never enter this branch.
  edit(core, 'YH', t => once(t, 'async function YH(e,n){', 'async function YH(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  edit(core, 'Qmn', t => {
    // A probe run (request-build injectLayers) is CC's native request for the
    // layers given to a request that is not CC's: it keeps the native system,
    // tools and message pipeline, with the client's betas, and is never sent.
    const wire = '(Q.ccgatewayBuildOnly===true&&Q.ccgatewayNativeProbe!==true)';
    // External requests own their wire tools, including declaration order and
    // omitted fields. Native tool discovery still runs for native policy, but
    // its filtered/reordered catalogue is not the external request's payload.
    t = once(t, '...Wl.tools!==void 0&&{tools:Wl.tools},', '...(' + wire + '?Q.ccgatewayWireTools!==void 0&&{tools:structuredClone(Q.ccgatewayWireTools)}:Wl.tools!==void 0&&{tools:Wl.tools}),');
    // jK reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
    // an external request after validation. Keep ordinary CLI behavior intact;
    // native parameter derivation below still operates on this fresh object.
    t = once(t, 'fl=jK(Ll);', 'fl=Q.ccgatewayBuildOnly===true?{}:jK(Ll);');
    // The model table no longer carries thinking-token-count (uF): the query
    // loop pushes it after this line, so build guards that push as well.
    t = once(t, 'if(Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);', 'if(Q.ccgatewayBuildOnly!==true&&Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);');
    t = once(t, 'let ht=Se(()=>xvn(Q.model,{isAgenticQuery:St})),', 'let ht=Q.ccgatewayBuildOnly===true?(Q.ccgatewayRequestBetas??[]).map(ccgateway_native_betaFromHeader):Se(()=>xvn(Q.model,{isAgenticQuery:St})),');
    t = once(t, 'system:Wl.system,', 'system:' + wire + '?Q.ccgatewaySystemBlocks:Wl.system,');
    t = once(t, 'messages:oS!==null&&oS.sliceFrom>0?qu.slice(Nh[oS.sliceFrom]):qu,', 'messages:' + wire + '?structuredClone(Q.ccgatewayWireMessages):oS!==null&&oS.sliceFrom>0?qu.slice(Nh[oS.sliceFrom]):qu,');
    t = once(t, 'qu=u_=Xmr(', 'qu=u_=' + wire + '?structuredClone(Q.ccgatewayWireMessages):Xmr(');
    t = once(t, 'cl={model:Q.model,', 'cl={ccgatewayInput:' + wire + ',model:Q.model,');
    // oYs hashes the first user prompt; external wire messages carry native
    // attachments as reminder blocks, which request-build skips (fingerprintMessages).
    t = once(t, 'let wW=oYs(su),', 'let wW=oYs(Q.ccgatewayBuildOnly===true?Q.ccgatewayFingerprintMessages:su),');
    t = once(t, 'fingerprint:wW,agentContext:Q.agentContext,', 'fingerprint:wW,ccgatewayCaptureBilling:Q.ccgatewayBuildOnly===true?Q.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:Q.ccgatewayBuildOnly===true?Q.ccgatewayCapturePrefix:void 0,agentContext:Q.agentContext,');
    return once(t, 'let Kn=Hve(()=>K$({maxRetries:0,', 'if(Q.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:x9n({model:Q.model,fastMode:false})};return}let Kn=Hve(()=>K$({maxRetries:0,');
  });
  // External wire history has already been validated. Native repair, reminder
  // folding and media pruning are for CLI-owned records, not external messages.
  edit(core, 'Kmn', t => once(t, 'function Kmn(e,n){', 'function Kmn(e,n){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
  edit(core, 'Kk', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;Yr();Qr();Yn.push(Mr);continue}case\"system\":"));
  edit(core, 'Xmr', t => once(t, "if(mt.type===\"api_system\"){", "if(mt.type===\"api_system\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));
  // The client factory (K$) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration.
  edit('chunk-yagw4eem.js', 'K$', t => {
    t = once(t, 'async function K$(e){let{apiKey:n,', 'async function K$(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,Q=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Ud(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let Q=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'se=wzt(),', 'se=ccgatewayAPIKeyOnly?{}:wzt(),');
    t = once(t, 'let Jn=await lpe({credentials:H,storageV5:V}),xt=$n(),_n=tot({anthropicAuthEnabled:sl(),oauthScopes:xt?.scopes}),', 'let Jn=ccgatewayAPIKeyOnly?void 0:await lpe({credentials:H,storageV5:V}),xt=ccgatewayAPIKeyOnly?null:$n(),_n=ccgatewayAPIKeyOnly?false:tot({anthropicAuthEnabled:sl(),oauthScopes:xt?.scopes}),');
    return once(t, 'if(!_n&&!Kr())Qn=await tw(Qe,be());await W5e();', 'if(!ccgatewayAPIKeyOnly&&!_n&&!Kr())Qn=await tw(Qe,be());if(!ccgatewayAPIKeyOnly)await W5e();else for(let name of Object.keys(Qe))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete Qe[name];');
  });
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header (request-agent.js setClientUserAgent); any
  // other request gets CC's (lF), for the entrypoint set on the request.
  edit('chunk-yagw4eem.js', 'Ml', t => once(t, '"User-Agent":lF()', '"User-Agent":ccgatewayClientUserAgent()??lF()'));
  surround('chunk-yagw4eem.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
  // Capture the generated attribution and the identity line BEFORE system
  // grouping can replace them with the client's blocks. The native function
  // retains its opt-out rules, and the line is the one b6n selected for
  // recordedCliPrefix (null when the request carries none).
  edit('chunk-pd06as9s.js', 'd2s', t => once(t, 'd=Qi([s,n,...e].filter(Boolean));', 'd=Qi([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
  // The environment snapshot renders the proxy note the request asked for, and
  // none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
  // is otherwise the process's own and would reach the content policy unasked.
  edit(core, 'boo', t => once(t, 'k1(e)?ile(e):goo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:k1(e)?ile(e):goo()'));
};
