// The 2.1.316 anchors: where the CCGateway CLI changes CC's own functions.
// Every edit names a hash-bound module and one function in it, and replaces
// text that must occur exactly once there (once). Code and names that are
// the same for every version live in patch-cli.cjs and the support modules;
// what a new version needs is a new copy of this file with its own anchors,
// each re-derived and reviewed (docs/CLI-UPGRADE-RUNBOOK.md).
module.exports = ({ edit, once, surround, core, entryStub }) => {
  // The request command's entry ahead of the CLI entry's (qe) own handling,
  // before its first fast-path branch (the GitHub stand-in, a): t is its
  // argument list and o the settings source of CC's fast-path policy.
  edit('cli.js', 'qe', t => once(t, 'if(a!==void 0){', entryStub('t', 'o') + 'if(a!==void 0){'));
  // The session ID is the request's (request-identity.js), else CC's own.
  edit('chunk-ndmse9kj.js', 'Rt', t => once(t, 'id:p7t()??Ude()', 'id:ccgRequestSessionID()??p7t()??Ude()'));
  surround('chunk-ndmse9kj.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
  // Only reporting readers change. Resource admission, Git concurrency, process
  // memory accounting, identity and node:os itself keep their native behavior.
  edit('chunk-5mav84cq.js', 'BWi', t => {
    t = once(t, 'if(!Pxr())return;let[e,r]=', 'if(!Pxr())return;let ccgResources=ccgContainerResources();let[e,r]=');
    t = once(t, 'Ce(u(t,{bigint:!0}),s).catch(()=>{return})',
      'ccgResources?Promise.resolve(void 0):Ce(u(t,{bigint:!0}),s).catch(()=>{return})');
    t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
      'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*a):r===void 0?-1n:r.bavail*r.bsize;');
    t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
    return once(t, 'cpus:d(),memory_gb:Math.round(p()/Number(a))',
      'cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))');
  });
  edit('chunk-eweqvj83.js', 'Z', t => {
    t = once(t, 'if(p.length===0)return null;', 'if(p.length===0)return null;let ccgResources=ccgContainerResources();');
    return once(t,
      'n.free_mem_mb=Math.round(F.freemem()/1048576),n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100,n.checkpoint_count=p.length;',
      'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(F.freemem()/1048576);n.load_avg_1m=Math.round((F.loadavg()[0]??0)*100)/100}n.checkpoint_count=p.length;');
  });
  for (const file of ['chunk-5mav84cq.js', 'chunk-eweqvj83.js']) {
    surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
  }
  // The client's custom tools are registered as CC tools (native-tools.js), so
  // CC's own policy sees them; their definitions stay the client's, verbatim: a
  // tool definition is the client's data, and CC's own assembly (strict/eager
  // fields, description hooks, provider stripping) applies only to CC's tools,
  // which never enter this branch.
  edit(core, 'gB', t => once(t, 'async function gB(e,n){', 'async function gB(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  edit(core, 'e_n', t => {
    // A probe run (request-build injectLayers) is CC's native request for the
    // layers given to a request that is not CC's: it keeps the native system,
    // tools and message pipeline, with the client's betas, and is never sent.
    const wire = '(Z.ccgatewayBuildOnly===true&&Z.ccgatewayNativeProbe!==true)';
    // External requests own their wire tools, including declaration order and
    // omitted fields. Native tool discovery still runs for native policy, but
    // its filtered/reordered catalogue is not the external request's payload.
    t = once(t, '...Nu.tools!==void 0&&{tools:Nu.tools},', '...(' + wire + '?Z.ccgatewayWireTools!==void 0&&{tools:structuredClone(Z.ccgatewayWireTools)}:Nu.tools!==void 0&&{tools:Nu.tools}),');
    // RV reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
    // an external request after validation. Keep ordinary CLI behavior intact;
    // native parameter derivation below still operates on this fresh object.
    t = once(t, 'nd=RV(Yl);', 'nd=Z.ccgatewayBuildOnly===true?{}:RV(Yl);');
    // The model table no longer carries thinking-token-count (AU): the query
    // loop pushes it after this line, so build guards that push as well.
    t = once(t, 'if(ke(()=>_Jn(pt))&&It.thinking.supported&&!gt.includes(AU))gt.push(AU);', 'if(Z.ccgatewayBuildOnly!==true&&ke(()=>_Jn(pt))&&It.thinking.supported&&!gt.includes(AU))gt.push(AU);');
    t = once(t, 'let gt=ke(()=>lRn(Z.model,{isAgenticQuery:Et})),', 'let gt=Z.ccgatewayBuildOnly===true?(Z.ccgatewayRequestBetas??[]).map(ccgateway_native_betaFromHeader):ke(()=>lRn(Z.model,{isAgenticQuery:Et})),');
    t = once(t, 'system:Nu.system,', 'system:' + wire + '?Z.ccgatewaySystemBlocks:Nu.system,');
    t = once(t, 'messages:L_!==null&&L_.sliceFrom>0?Mg.slice(Of[L_.sliceFrom]):Mg,', 'messages:' + wire + '?structuredClone(Z.ccgatewayWireMessages):L_!==null&&L_.sliceFrom>0?Mg.slice(Of[L_.sliceFrom]):Mg,');
    t = once(t, 'Mg=HS=YSr(', 'Mg=HS=' + wire + '?structuredClone(Z.ccgatewayWireMessages):YSr(');
    t = once(t, 'Kc={model:Z.model,', 'Kc={ccgatewayInput:' + wire + ',model:Z.model,');
    // Vei hashes the first user prompt; external wire messages carry native
    // attachments as reminder blocks, which request-build skips (fingerprintMessages).
    t = once(t, 'let uI=Vei(_s),', 'let uI=Vei(Z.ccgatewayBuildOnly===true?Z.ccgatewayFingerprintMessages:_s),');
    t = once(t, 'fingerprint:uI,agentContext:Z.agentContext,', 'fingerprint:uI,ccgatewayCaptureBilling:Z.ccgatewayBuildOnly===true?Z.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:Z.ccgatewayBuildOnly===true?Z.ccgatewayCapturePrefix:void 0,agentContext:Z.agentContext,');
    return once(t, 'let Wn=DEe(()=>MN({maxRetries:0,', 'if(Z.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:g5n({model:Z.model,fastMode:false})};return}let Wn=DEe(()=>MN({maxRetries:0,');
  });
  // External wire history has already been validated. Native repair, reminder
  // folding and media pruning are for CLI-owned records, not external messages.
  edit(core, 'Qyn', t => once(t, 'function Qyn(e,n){', 'function Qyn(e,n){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
  edit(core, 'AT', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;rs();fs();Kn.push(jo);continue}case\"system\":"));
  edit(core, 'YSr', t => once(t, "if(At.type===\"api_system\"){", "if(At.type===\"api_system\"){if(At.ccgatewayWireSystem!==void 0)return structuredClone(At.ccgatewayWireSystem);"));
  // The client factory (MN) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration. Its provider route
  // is Od here (2.1.312's Ud; this module's Ud is the first-party URL check).
  // After proxy auth it re-reads the stored login and re-decides OAuth and the
  // custom headers (Pn, hUe, fl, sFe), rebuilding the client when they changed:
  // the API-key-only route skips that as it skips the first reads.
  edit('chunk-hwmsct5x.js', 'MN', t => {
    t = once(t, 'async function MN(e){let{apiKey:n,', 'async function MN(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,J=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Od(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let J=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'se=v4t(),', 'se=ccgatewayAPIKeyOnly?{}:v4t(),');
    t = once(t, 'let Qn=await fge({credentials:H,storageV5:j}),pt=Pn(),kt=hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes}),', 'let Qn=ccgatewayAPIKeyOnly?void 0:await fge({credentials:H,storageV5:j}),pt=ccgatewayAPIKeyOnly?null:Pn(),kt=ccgatewayAPIKeyOnly?false:hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes}),');
    t = once(t, 'if(!kt&&!Lr())Zn=await lw(ze,_e());await I8e();', 'if(!ccgatewayAPIKeyOnly&&!kt&&!Lr())Zn=await lw(ze,_e());if(!ccgatewayAPIKeyOnly)await I8e();else for(let name of Object.keys(ze))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete ze[name];');
    return once(t, 'let Bl=Pn();if(pt&&Bl?.accessToken!==pt.accessToken||kt!==hUe({anthropicAuthEnabled:fl(),oauthScopes:Bl?.scopes})||lt(ze).value===void 0&&sFe())return MN(e);', 'if(!ccgatewayAPIKeyOnly){let Bl=Pn();if(pt&&Bl?.accessToken!==pt.accessToken||kt!==hUe({anthropicAuthEnabled:fl(),oauthScopes:Bl?.scopes})||lt(ze).value===void 0&&sFe())return MN(e)}');
  });
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header (request-agent.js setClientUserAgent); any
  // other request gets CC's (wU), for the entrypoint set on the request.
  edit('chunk-hwmsct5x.js', 'Fl', t => once(t, '"User-Agent":wU()', '"User-Agent":ccgatewayClientUserAgent()??wU()'));
  surround('chunk-hwmsct5x.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
  // Capture the generated attribution and the identity line BEFORE system
  // grouping can replace them with the client's blocks. The native function
  // retains its opt-out rules, and the line is the one p7n selected for
  // recordedCliPrefix (null when the request carries none).
  edit('chunk-w5ndchqs.js', 'JXs', t => once(t, 'd=ca([s,n,...e].filter(Boolean));', 'd=ca([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
  // The environment snapshot renders the proxy note the request asked for, and
  // none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
  // is otherwise the process's own and would reach the content policy unasked.
  edit(core, 'Sio', t => once(t, 'Y1(e)?qde(e):cio()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:Y1(e)?qde(e):cio()'));
};
