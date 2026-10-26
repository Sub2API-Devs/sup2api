// Derives patches/2.1.310.cjs from patches/2.1.304.cjs: every anchor and the
// local names in its replacement, as the reviews established them
// (artifacts/claude-2.1.310/review/rev-*.md). Each replacement must match
// exactly the expected number of times, so a stale assumption fails here.
//   node derive-anchors-310.cjs <cli-mods dir>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
let t = fs.readFileSync(path.join(dir, 'patches/2.1.304.cjs'), 'utf8');
const rep = (a, b, n = 1) => { const c = t.split(a).length - 1; if (c !== n) throw Error(c + ' x ' + a); t = t.split(a).join(b); };

rep('// The 2.1.304 anchors', '// The 2.1.310 anchors');
// cli.js: Ve → Ye; the GitHub stand-in branch is `r` now.
rep("  // The request command's entry ahead of the CLI entry's (Ve) own handling:\n  // e is its argument list and s the settings source of CC's fast-path policy.\n  edit('cli.js', 'Ve', t => once(t, 'if(n!==void 0){', entryStub('e', 's') + 'if(n!==void 0){'));",
  "  // The request command's entry ahead of the CLI entry's (Ye) own handling,\n  // before its first fast-path branch (the GitHub stand-in, r): e is its\n  // argument list and s the settings source of CC's fast-path policy.\n  edit('cli.js', 'Ye', t => once(t, 'if(r!==void 0){', entryStub('e', 's') + 'if(r!==void 0){'));");
// Session root: Yi → Fr (chunk-wrtp8qz8.js).
rep("edit('chunk-dxktn51d.js', 'Yi', t => once(t, 'id:ier()??Ure()', 'id:ccgRequestSessionID()??ier()??Ure()'));",
  "edit('chunk-wrtp8qz8.js', 'Fr', t => once(t, 'id:_Yt()??uie()', 'id:ccgRequestSessionID()??_Yt()??uie()'));");
rep("surround('chunk-dxktn51d.js'", "surround('chunk-wrtp8qz8.js'");
// Container resources: Ali → nki, V → X.
rep("edit('chunk-yqea5hk4.js', 'Ali'", "edit('chunk-c6dz8eqs.js', 'nki'");
rep("'if(!qir())return;let[e,r]=', 'if(!qir())return;let ccgResources", "'if(!ahr())return;let[e,r]=', 'if(!ahr())return;let ccgResources");
rep("t = once(t, 'Ne(u(t,{bigint:!0}),s).catch(()=>{return})',\n      'ccgResources?Promise.resolve(void 0):Ne(u(t,{bigint:!0}),s).catch(()=>{return})');",
  "t = once(t, 'Pe(u(t,{bigint:!0}),s).catch(()=>{return})',\n      'ccgResources?Promise.resolve(void 0):Pe(u(t,{bigint:!0}),s).catch(()=>{return})');");
rep("edit('chunk-sx3g9k86.js', 'V'", "edit('chunk-c57c64b0.js', 'X'");
rep('F.freemem()', 'H.freemem()', 2);
rep('F.loadavg()', 'H.loadavg()', 2);
rep("for (const file of ['chunk-yqea5hk4.js', 'chunk-sx3g9k86.js'])", "for (const file of ['chunk-c6dz8eqs.js', 'chunk-c57c64b0.js'])");
// Core: FH → rH.
rep("edit(core, 'FH', t => once(t, 'async function FH(e,n){', 'async function FH(e,n){", "edit(core, 'rH', t => once(t, 'async function rH(e,n){', 'async function rH(e,n){");
// Core query: qmn → rSn, its builder uXn → Ceo, locals per rev-query §1.
const qs = t.indexOf("  edit(core, 'qmn'"), qe = t.indexOf('  // External wire history');
if (qs < 0 || qe < 0) throw Error('qmn block');
let q = t.slice(qs, qe);
for (const [a, b] of [["'qmn'", "'rSn'"], ['J.', 'Q.'], ['jh.', 'Jh.'], ['Xa=z2(yl);', 'sl=K2(Rl);'], ['Xa=Q.ccgatewayBuildOnly===true?{}:z2(yl);', 'sl=Q.ccgatewayBuildOnly===true?{}:K2(Rl);'],
  ['let mt=', 'let St='], ['ke(()=>S8n(Q.model,{isAgenticQuery:wt}))', 'be(()=>hnr(Q.model,{isAgenticQuery:kt}))'],
  ['Rk!==null&&Rk.sliceFrom>0?Gf.slice(_i[Rk.sliceFrom]):Gf,', 'kS!==null&&kS.sliceFrom>0?ep.slice(Hi[kS.sliceFrom]):ep,'],
  ['Gf=sb=', 'ep=xT='], ['Xfr(', 'Tkr('], ['fi={', 'fs={'], ['let tF=RIs(', 'let cyt=fWs('], [':Aa),', ':ou),'], ['(Aa),', '(ou),'], ['fingerprint:tF,', 'fingerprint:cyt,'],
  ['let eo=HTe(()=>sF({maxRetries:0,', 'let Qn=hRe(()=>m$({maxRetries:0,'], ['body:uXn(', 'body:Ceo('], ['// z2 reads', '// K2 reads'], ['// RIs hashes', '// fWs hashes']]) {
  if (!q.includes(a)) throw Error('qmn ' + a);
  q = q.split(a).join(b);
}
for (const stale of ['J.', 'jh.', 'Xa=', 'mt=', 'Rk', 'Gf', '_i[', 'fi={', 'tF', 'Aa', 'eo=', 'uXn', 'S8n', 'wt}']) if (q.includes(stale)) throw Error('qmn still has ' + stale);
t = t.slice(0, qs) + q + t.slice(qe);
rep("edit(core, 'Gmn', t => once(t, 'function Gmn(e,n){', 'function Gmn(e,n){", "edit(core, 'tSn', t => once(t, 'function tSn(e,n){', 'function tSn(e,n){");
rep(`edit(core, 'jA', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;or();Br();po.push(Lo);continue}case\\"system\\":"));`,
  `edit(core, 'UC', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;Pr();ls();jn.push(dr);continue}case\\"system\\":"));`);
rep(`edit(core, 'Xfr', t => once(t, "if(ft.type===\\"api_system\\"){", "if(ft.type===\\"api_system\\"){if(ft.ccgatewayWireSystem!==void 0)return structuredClone(ft.ccgatewayWireSystem);"));`,
  `edit(core, 'Tkr', t => once(t, "if(mt.type===\\"api_system\\"){", "if(mt.type===\\"api_system\\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));`);
// Transport: sF → m$ (options destructured in the body), nl → ml, dN → M$.
const ts = t.indexOf("  edit('chunk-38xgev2z.js', 'sF'"), te = t.indexOf("  // The default headers' User-Agent");
if (ts < 0 || te < 0) throw Error('sF block');
t = t.slice(0, ts) + `  // The client factory (m$) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration.
  edit('chunk-bbw420pv.js', 'm$', t => {
    t = once(t, 'async function m$(e){let{apiKey:n,', 'async function m$(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,ee=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Od(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let ee=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'Be=ljt(),', 'Be=ccgatewayAPIKeyOnly?{}:ljt(),');
    t = once(t, 'let Pt=await Eue({credentials:L,storageV5:j}),Vt=Ln(),un=xtt({anthropicAuthEnabled:tl(),oauthScopes:Vt?.scopes}),', 'let Pt=ccgatewayAPIKeyOnly?void 0:await Eue({credentials:L,storageV5:j}),Vt=ccgatewayAPIKeyOnly?null:Ln(),un=ccgatewayAPIKeyOnly?false:xtt({anthropicAuthEnabled:tl(),oauthScopes:Vt?.scopes}),');
    return once(t, 'if(!un&&!Wr())be=await yy(je,ye());await w4e();', 'if(!ccgatewayAPIKeyOnly&&!un&&!Wr())be=await yy(je,ye());if(!ccgatewayAPIKeyOnly)await w4e();else for(let name of Object.keys(je))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete je[name];');
  });
` + t.slice(te);
rep("// other request gets CC's (dN)", "// other request gets CC's (M$)");
rep(`edit('chunk-38xgev2z.js', 'nl', t => once(t, '"User-Agent":dN()', '"User-Agent":ccgatewayClientUserAgent()??dN()'));`,
  `edit('chunk-bbw420pv.js', 'ml', t => once(t, '"User-Agent":M$()', '"User-Agent":ccgatewayClientUserAgent()??M$()'));`);
rep("surround('chunk-38xgev2z.js'", "surround('chunk-bbw420pv.js'");
// Billing attribution: PAs → EFs (chunk-f7aya6cs.js), ki → Li.
rep('the one n1n selected', 'the one $Vn selected');
rep("edit('chunk-t61vswm2.js', 'PAs', t => once(t, 'd=ki([s,n,...e].filter(Boolean));', 'd=ki([s,n,...e].filter(Boolean));",
  "edit('chunk-f7aya6cs.js', 'EFs', t => once(t, 'd=Li([s,n,...e].filter(Boolean));', 'd=Li([s,n,...e].filter(Boolean));");
// Environment fields renderer: _oo → yao.
rep(`edit(core, '_oo', t => once(t, 'l1(e)?ule(e):foo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:l1(e)?ule(e):foo()'));`,
  `edit(core, 'yao', t => once(t, 'ZW(e)?ede(e):cao()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:ZW(e)?ede(e):cao()'));`);
for (const stale of ['chunk-38xgev2z', 'chunk-rncrmfyt', 'chunk-dxktn51d', 'chunk-yqea5hk4', 'chunk-sx3g9k86', 'chunk-t61vswm2', 'dN()']) if (t.includes(stale)) throw Error('still ' + stale);
fs.writeFileSync(path.join(dir, 'patches/2.1.310.cjs'), t);
console.log('ok');
