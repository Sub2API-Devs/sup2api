// The 2.1.318 anchors: where the CCGateway CLI changes CC's own functions.
// Every edit names a hash-bound module and one function in it, and replaces
// text that must occur exactly once there (once). Code and names that are
// the same for every version live in patch-cli.cjs and the support modules;
// what a new version needs is a new copy of this file with its own anchors,
// each re-derived and reviewed (docs/CLI-UPGRADE-RUNBOOK.md).
module.exports = ({ files, edit, once, surround, core, entryStub }) => {
  // The request command's entry ahead of the CLI entry's (Xe) own handling,
  // before its first fast-path branch (the GitHub stand-in, a): t is its
  // argument list and s the settings source of CC's fast-path policy.
  edit('cli.js', 'Xe', t => once(t, 'if(a!==void 0){', entryStub('t', 's') + 'if(a!==void 0){'));
  // The session ID is the request's (request-identity.js), else CC's own.
  edit('chunk-5ythzcas.js', 'Tt', t => once(t, 'id:lTo()??dpe()', 'id:ccgRequestSessionID()??lTo()??dpe()'));
  surround('chunk-5ythzcas.js', { imports: 'import {requestSessionID as ccgRequestSessionID} from "./ccgateway-request-identity.js";\n' });
  // Only reporting readers change. Resource admission, Git concurrency, process
  // memory accounting, identity and node:os itself keep their native behavior.
  edit('chunk-rf2v5y5r.js', 'Foa', t => {
    t = once(t, 'if(!CBr())return;let[e,r]=', 'if(!CBr())return;let ccgResources=ccgContainerResources();let[e,r]=');
    t = once(t, 'ke(f(t,{bigint:!0}),s).catch(()=>{return})',
      'ccgResources?Promise.resolve(void 0):ke(f(t,{bigint:!0}),s).catch(()=>{return})');
    t = once(t, 'let n=r===void 0?-1n:r.bavail*r.bsize;',
      'let n=ccgResources?(ccgResources.disk_free_gb===void 0?-1n:BigInt(ccgResources.disk_free_gb)*l):r===void 0?-1n:r.bavail*r.bsize;');
    t = once(t, 'else if(n<0n)', 'else if(n<0n&&!ccgResources)');
    return once(t, 'cpus:u(),memory_gb:Math.round(d()/Number(l))',
      'cpus:ccgResources?ccgResources.cpus:u(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(d()/Number(l))');
  });
  edit('chunk-eehtd1bk.js', 'N', t => {
    t = once(t, 'if(a.length===0)return null;', 'if(a.length===0)return null;let ccgResources=ccgContainerResources();');
    return once(t,
      'n.free_mem_mb=Math.round(M.freemem()/1048576),n.load_avg_1m=Math.round((M.loadavg()[0]??0)*100)/100,n.checkpoint_count=a.length;',
      'if(ccgResources){if(ccgResources.free_mem_mb!==void 0)n.free_mem_mb=ccgResources.free_mem_mb}else{n.free_mem_mb=Math.round(M.freemem()/1048576);n.load_avg_1m=Math.round((M.loadavg()[0]??0)*100)/100}n.checkpoint_count=a.length;');
  });
  for (const file of ['chunk-rf2v5y5r.js', 'chunk-eehtd1bk.js']) {
    surround(file, { imports: 'import {getContainerResources as ccgContainerResources} from "./ccgateway-container-resources.js";\n' });
  }
  // The client's custom tools are registered as CC tools (native-tools.js), so
  // CC's own policy sees them; their definitions stay the client's, verbatim: a
  // tool definition is the client's data, and CC's own assembly (strict/eager
  // fields, description hooks, provider stripping) applies only to CC's tools,
  // which never enter this branch.
  edit(core, 'YU', t => once(t, 'async function YU(e,n){', 'async function YU(e,n){if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);'));
  edit(core, 'Z_n', t => {
    // A probe run (request-build injectLayers) is CC's native request for the
    // layers given to a request that is not CC's: it keeps the native system,
    // tools and message pipeline, with the client's betas, and is never sent.
    const wire = '(ne.ccgatewayBuildOnly===true&&ne.ccgatewayNativeProbe!==true)';
    // External requests own their wire tools, including declaration order and
    // omitted fields. Native tool discovery still runs for native policy, but
    // its filtered/reordered catalogue is not the external request's payload.
    t = once(t, '...lc.tools!==void 0&&{tools:lc.tools},', '...(' + wire + '?ne.ccgatewayWireTools!==void 0&&{tools:structuredClone(ne.ccgatewayWireTools)}:lc.tools!==void 0&&{tools:lc.tools}),');
    // zRt reads CLAUDE_CODE_EXTRA_BODY. Do not let process-wide extra data replace
    // an external request after validation. Keep ordinary CLI behavior intact;
    // native parameter derivation below still operates on this fresh object.
    t = once(t, 'Qd=zRt(Bd);', 'Qd=ne.ccgatewayBuildOnly===true?{}:zRt(Bd);');
    // The model table no longer carries thinking-token-count (S1): the query
    // loop pushes it after this line, so build guards that push as well.
    t = once(t, 'if(Ee(()=>GRt(At))&&Nt.thinking.supported&&!It.includes(S1))It.push(S1);', 'if(ne.ccgatewayBuildOnly!==true&&Ee(()=>GRt(At))&&Nt.thinking.supported&&!It.includes(S1))It.push(S1);');
    t = once(t, 'let It=Ee(()=>XNn(ne.model,{isAgenticQuery:Et}));', 'let It=ne.ccgatewayBuildOnly===true?(ne.ccgatewayRequestBetas??[]).map(ccgateway_native_betaFromHeader):Ee(()=>XNn(ne.model,{isAgenticQuery:Et}));');
    // 2.1.318 appends program-use-case-ids after the model list when the
    // process's sticky beta state saw it sent: a build sends the client's betas.
    t = once(t, 'else if(pE(mt,dR)&&YNn())It=[...It,dR];', 'else if(ne.ccgatewayBuildOnly!==true&&pE(mt,dR)&&YNn())It=[...It,dR];');
    t = once(t, 'system:lc.system,', 'system:' + wire + '?ne.ccgatewaySystemBlocks:lc.system,');
    t = once(t, 'messages:uk!==null&&uk.sliceFrom>0?Yg.slice(ah[uk.sliceFrom]):Yg,', 'messages:' + wire + '?structuredClone(ne.ccgatewayWireMessages):uk!==null&&uk.sliceFrom>0?Yg.slice(ah[uk.sliceFrom]):Yg,');
    t = once(t, 'jy=nRr(', 'jy=' + wire + '?structuredClone(ne.ccgatewayWireMessages):nRr(');
    // Then the tool-provenance pass (Xgn) would rewrite ownership metadata in
    // the client's tool_addition blocks: wire messages skip it too.
    t = once(t, 'Yg=Oy=Xgn(', 'Yg=Oy=' + wire + '?jy:Xgn(');
    t = once(t, 'la={model:ne.model,', 'la={ccgatewayInput:' + wire + ',model:ne.model,');
    // Wwi hashes the first user prompt; external wire messages carry native
    // attachments as reminder blocks, which request-build skips (fingerprintMessages).
    t = once(t, 'let pSt=Wwi(cs),', 'let pSt=Wwi(ne.ccgatewayBuildOnly===true?ne.ccgatewayFingerprintMessages:cs),');
    t = once(t, 'fingerprint:pSt,agentContext:ne.agentContext,', 'fingerprint:pSt,ccgatewayCaptureBilling:ne.ccgatewayBuildOnly===true?ne.ccgatewayCaptureBilling:void 0,ccgatewayCapturePrefix:ne.ccgatewayBuildOnly===true?ne.ccgatewayCapturePrefix:void 0,agentContext:ne.agentContext,');
    return once(t, 'let zn=pxe(()=>uF({maxRetries:0,', 'if(ne.ccgatewayBuildOnly===true){yield{type:"ccgateway_request",body:VJn({model:ne.model,fastMode:false})};return}let zn=pxe(()=>uF({maxRetries:0,');
  });
  // External wire history has already been validated. Native repair, reminder
  // folding and media pruning are for CLI-owned records, not external messages.
  edit(core, 'X_n', t => once(t, 'function X_n(e,n,r){', 'function X_n(e,n,r){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,messagesForAPI:e,accountMemoryEpoch:0,midConvFallback:null,toolChangeFallback:null,inlineToolsFallback:null,keptForeignSignatures:true,blocksEligible:true};'));
  edit(core, 'sv', t => once(t, "case\"progress\":continue;case\"system\":", "case\"progress\":continue;case\"api_system\":{if(!s?.ccgatewayInput)continue;js();Fa();wn.push(Fo);continue}case\"system\":"));
  edit(core, 'nRr', t => once(t, "if(mt.type===\"api_system\"){", "if(mt.type===\"api_system\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));
  // The client factory (uF) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration. Its provider route
  // is kd here. After proxy auth it re-reads the stored login and re-decides
  // OAuth and the custom headers (Hn, kGe, Ka, hWe), rebuilding the client when
  // they changed: the API-key-only route skips that as it skips the first reads.
  edit('chunk-vn3g7zt8.js', 'uF', t => {
    t = once(t, 'async function uF(e){let{apiKey:n,', 'async function uF(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,X=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||kd(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let X=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'ae=jJt(),', 'ae=ccgatewayAPIKeyOnly?{}:jJt(),');
    t = once(t, 'let nr=await B_e({credentials:H,storageV5:J}),bt=Hn(),Ct=kGe({anthropicAuthEnabled:Ka(),oauthScopes:bt?.scopes}),', 'let nr=ccgatewayAPIKeyOnly?void 0:await B_e({credentials:H,storageV5:J}),bt=ccgatewayAPIKeyOnly?null:Hn(),Ct=ccgatewayAPIKeyOnly?false:kGe({anthropicAuthEnabled:Ka(),oauthScopes:bt?.scopes}),');
    t = once(t, 'if(!Ct&&!Vr())or=await HS(Ke,ye());await RZe();', 'if(!ccgatewayAPIKeyOnly&&!Ct&&!Vr())or=await HS(Ke,ye());if(!ccgatewayAPIKeyOnly)await RZe();else for(let name of Object.keys(Ke))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete Ke[name];');
    return once(t, 'let Vl=Hn();if(bt&&Vl?.accessToken!==bt.accessToken||Ct!==kGe({anthropicAuthEnabled:Ka(),oauthScopes:Vl?.scopes})||ft(Ke).value===void 0&&hWe())return uF(e);', 'if(!ccgatewayAPIKeyOnly){let Vl=Hn();if(bt&&Vl?.accessToken!==bt.accessToken||Ct!==kGe({anthropicAuthEnabled:Ka(),oauthScopes:Vl?.scopes})||ft(Ke).value===void 0&&hWe())return uF(e)}');
  });
  // The default headers' User-Agent is the client's own when the request keeps
  // the client's billing header (request-agent.js setClientUserAgent); any
  // other request gets CC's (g1), for the entrypoint set on the request.
  edit('chunk-vn3g7zt8.js', 'Wl', t => once(t, '"User-Agent":g1()', '"User-Agent":ccgatewayClientUserAgent()??g1()'));
  surround('chunk-vn3g7zt8.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
  // Capture the generated attribution and the identity line BEFORE system
  // grouping can replace them with the client's blocks. The native function
  // retains its opt-out rules, and the line is the one tcr selected for
  // recordedCliPrefix (null when the request carries none).
  edit('chunk-7pwjpdkw.js', 'tyi', t => once(t, 'd=Ia([s,n,...e].filter(Boolean));', 'd=Ia([s,n,...e].filter(Boolean));r.ccgatewayCaptureBilling?.(s);r.ccgatewayCapturePrefix?.(n);'));
  // The environment snapshot renders the proxy note the request asked for, and
  // none when it did not (ccgatewayEnvironment's ccgatewayProxyText): the note
  // is otherwise the process's own and would reach the content policy unasked.
  edit(core, 'vdo', t => once(t, 'sz(e)?Rfe(e):mdo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:sz(e)?Rfe(e):mdo()'));
  // The tools-used header (x-claude-code-sandy-plover, request_tools_used_v1;
  // SESSION-MEMORY-TOOLS-USED-DESIGN.md §6.3). The client factory's fetch
  // wrapper (XS) keeps its own gates (a Messages request, the first-party
  // route and ci(), tengu_silly_shore) and asks request-tools-used.js what to
  // send: undefined is CC's own value (no Worker context: an ordinary CLI or a
  // request run by hand), null is none (the Worker gave no tools_used, or the
  // User-Agent sent is older than 2.1.318), a string is the value: the
  // client's own as it came, else the native set's (Nf), which the request
  // command filled before sending.
  edit('chunk-vn3g7zt8.js', 'XS', t => once(t, 'if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")',
    'let ccgToolsUsed=ccgatewayToolsUsedHeader(H,()=>Nf(wf()));if(ccgToolsUsed===null)H.delete(Ulo);else if(H.set(Ulo,ccgToolsUsed??Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")'));
  surround('chunk-vn3g7zt8.js', { imports: 'import {ccgatewayToolsUsedHeader} from "./ccgateway-request-tools-used.js";\n' });
  // The history reader (nD) reads a compact summary's tools-used list only on
  // a record CC marks as the summary, and the wire has no such mark: the
  // request marks the user texts this module's own summary reader (Z, regex w)
  // recognizes. Z is not exported; the patch exports it as it is.
  const summaryReader = 'function Z(e){let t=e.match(w);return t===null?void 0:t[2]??t[3]}';
  if (files.get('chunk-sva49n74.js').split(summaryReader).length !== 2) throw Error('Expected the 2.1.318 compact summary reader Z in chunk-sva49n74.js');
  surround('chunk-sva49n74.js', { code: '\nexport {Z as ccgatewayCompactSummaryTools};\n' });
};
