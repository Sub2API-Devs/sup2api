// The 2.1.304 anchors: where the CCGateway CLI changes CC's own functions.
// Every edit names a hash-bound module and one function in it, and replaces
// text that must occur exactly once there (once). Code and names that are
// the same for every version live in patch-cli.cjs and the support modules;
// what a new version needs is a new copy of this file with its own anchors,
// each re-derived and reviewed (docs/CLI-UPGRADE-RUNBOOK.md).
module.exports = ({ edit, once, surround, core, entryStub }) => {
  // The request command's entry ahead of the CLI entry's (Ve) own handling:
  // e is its argument list and s the settings source of CC's fast-path policy.
  edit('cli.js', 'Ve', t => once(t, 'if(n!==void 0){', entryStub('e', 's') + 'if(n!==void 0){'));
  // The session ID is the request's (request-identity.js), else CC's own.
  edit('chunk-dxktn51d.js', 'Yi', t => once(t, 'id:ier()??Ure()', 'id:ccgRequestSessionID()??ier()??Ure()'));
  surround('chunk-dxktn51d.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
  // Only reporting readers change. Resource admission, Git concurrency, process
  // memory accounting, identity and node:os itself keep their native behavior.
  edit('chunk-yqea5hk4.js', 'Ali', t => {
    t = once(t, 'if(!qir())return;let[e,r]=', 'if(!qir())return;let ccgResources=ccgContainerResources();let[e,r]=');
    t = once(t, 'Ne(u(t,{bigint:!0}),s).catch(()=>{return})',
      'ccgResources?Promise.resolve(void 0):Ne(u(t,{bigint:!0}),s).catch(()=>{return})');
    t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
      'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*a):r===void 0?-1n:r.bavail*r.bsize;');
    t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
    return once(t, 'cpus:d(),memory_gb:Math.round(p()/Number(a))',
      'cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))');
  });
  edit('chunk-sx3g9k86.js', 'V', t => {
    t = once(t, 'if(p.length===0)return null;', 'if(p.length===0)return null;let ccgResources=ccgContainerResources();');
    return once(t,
      'n.free_mem_mb=Math.round(F.freemem()/1048576),n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100,n.checkpoint_count=p.length;',
      'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(F.freemem()/1048576);n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100}n.checkpoint_count=p.length;');
  });
  for (const file of ['chunk-yqea5hk4.js', 'chunk-sx3g9k86.js']) {
    surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
  }
  // The client's custom tools are registered as CC tools (native-tools.js), so
  // CC's own policy sees them; their definitions stay the client's, verbatim: a
  // tool definition is the client's data, and CC's own assembly (strict/eager
  // fields, description hooks, provider stripping) applies only to CC's tools,
  // which never enter this branch.
  edit(core, 'FH', t => once(t, 'async function FH(e,n){', 'async function FH(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  edit(core, 'qmn', t => {
    // A probe run (request-build injectLayers) is CC's native request for the
    // layers given to a request that is not CC's: it keeps the native system,
    // tools and message pipeline, with the client's betas, and is never sent.
    const wire = '(J.ccgatewayBuildOnly===true&&J.ccgatewayNativeProbe!==true)';
    // External requests own their wire tools, including declaration order and
    // omitted fields. Native tool discovery still runs for native policy, but
    // its filtered/reordered catalogue is not the external request's payload.
    t = once(t, '...jh.tools!==void 0&&{tools:jh.tools},', '...(' + wire + '?J.ccgatewayWireTools!==void 0&&{tools:structuredClone(J.ccgatewayWireTools)}:jh.tools!==void 0&&{tools:jh.tools}),');
    // z2 reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
    // an external request after validation. Keep ordinary CLI behavior intact;
    // native parameter derivation below still operates on this fresh object.
    t = once(t, 'Xa=z2(yl);', 'Xa=J.ccgatewayBuildOnly===true?{}:z2(yl);');
    t = once(t, 'let mt=ke(()=>S8n(J.model,{isAgenticQuery:wt})),', 'let mt=J.ccgatewayBuildOnly===true?(J.ccgatewayRequestBetas??[]).map(ccgateway_native_betaFromHeader):ke(()=>S8n(J.model,{isAgenticQuery:wt})),');
    t = once(t, 'system:jh.system,', 'system:' + wire + '?J.ccgatewaySystemBlocks:jh.system,');
    t = once(t, 'messages:Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,', 'messages:' + wire + '?structuredClone(J.ccgatewayWireMessages):Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,');
    t = once(t, 'Gf=sb=Xfr(', 'Gf=sb=' + wire + '?structuredClone(J.ccgatewayWireMessages):Xfr(');
    t = once(t, 'fi={model:J.model,', 'fi={ccgatewayInput:' + wire + ',model:J.model,');
    // RIs hashes the first user prompt; external wire messages carry native
    // attachments as reminder blocks, which request-build skips (fingerprintMessages).
    t = once(t, 'let tF=RIs(Aa),', 'let tF=RIs(J.ccgatewayBuildOnly===true?J.ccgatewayFingerprintMessages:Aa),');
    t = once(t, 'fingerprint:tF,agentContext:J.agentContext,', 'fingerprint:tF,ccgatewayCaptureBilling:J.ccgatewayBuildOnly===true?J.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:J.ccgatewayBuildOnly===true?J.ccgatewayCapturePrefix:void 0,agentContext:J.agentContext,');
    return once(t, 'let eo=HTe(()=>sF({maxRetries:0,', 'if(J.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:uXn({model:J.model,fastMode:false})};return}let eo=HTe(()=>sF({maxRetries:0,');
  });
  // External wire history has already been validated. Native repair, reminder
  // folding and media pruning are for CLI-owned records, not external messages.
  edit(core, 'Gmn', t => once(t, 'function Gmn(e,n){', 'function Gmn(e,n){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
  edit(core, 'jA', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;or();Br();po.push(Lo);continue}case\"system\":"));
  edit(core, 'Xfr', t => once(t, "if(ft.type===\"api_system\"){", "if(ft.type===\"api_system\"){if(ft.ccgatewayWireSystem!==void 0)return structuredClone(ft.ccgatewayWireSystem);"));
  edit('chunk-38xgev2z.js', 'sF', t => {
    t = once(t, 'async function sF({apiKey:e,', 'async function sF({ccgatewayAPIKeyOnly=false,apiKey:e,');
    t = once(t, '}){let J=process.env.CLAUDE_CODE_CONTAINER_ID,', '}){if(ccgatewayAPIKeyOnly&&(!e||Sd(n)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let J=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'te=xFt(),', 'te=ccgatewayAPIKeyOnly?{}:xFt(),');
    t = once(t, 'let $e=await Zle({credentials:C,storageV5:O}),Xe=Mn(),Kt=q6n({anthropicAuthEnabled:ll(),oauthScopes:Xe?.scopes}),', 'let $e=ccgatewayAPIKeyOnly?void 0:await Zle({credentials:C,storageV5:O}),Xe=ccgatewayAPIKeyOnly?null:Mn(),Kt=ccgatewayAPIKeyOnly?false:q6n({anthropicAuthEnabled:ll(),oauthScopes:Xe?.scopes}),');
    return once(t, 'if(!Kt&&!Gr())Pt=await ty(me,Se());await T2e();', 'if(!ccgatewayAPIKeyOnly&&!Kt&&!Gr())Pt=await ty(me,Se());if(!ccgatewayAPIKeyOnly)await T2e();else for(let name of Object.keys(me))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete me[name];');
  });
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header (request-agent.js setClientUserAgent); any
  // other request gets CC's (dN), for the entrypoint set on the request.
  edit('chunk-38xgev2z.js', 'nl', t => once(t, '"User-Agent":dN()', '"User-Agent":ccgatewayClientUserAgent()??dN()'));
  surround('chunk-38xgev2z.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
  // Capture the generated attribution and the identity line BEFORE system
  // grouping can replace them with the client's blocks. The native function
  // retains its opt-out rules, and the line is the one n1n selected for
  // recordedCliPrefix (null when the request carries none).
  edit('chunk-t61vswm2.js', 'PAs', t => once(t, 'd=ki([s,n,...e].filter(Boolean));', 'd=ki([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
  // The environment snapshot renders the proxy note the request asked for, and
  // none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
  // is otherwise the process's own and would reach the content policy unasked.
  edit(core, '_oo', t => once(t, 'l1(e)?ule(e):foo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:l1(e)?ule(e):foo()'));
};
