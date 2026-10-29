// Derives patches/2.1.312.cjs from patches/2.1.310.cjs: every anchor and the
// local names in its replacement, as the 2.1.312 review established them
// (docs/CLAUDE-CODE-2.1.312-MIGRATION.md section 3). Each replacement must
// match exactly the expected number of times, so a stale assumption fails here,
// and no 2.1.310 name may remain in an anchor.
//   node tools/upgrade/examples/derive-anchors-2.1.312.cjs <cli-mods dir>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
let t = fs.readFileSync(path.join(dir, 'patches/2.1.310.cjs'), 'utf8');
const rep = (a, b, n = 1) => { const c = t.split(a).length - 1; if (c !== n) throw Error(c + ' x ' + a); t = t.split(a).join(b); };

rep('// The 2.1.310 anchors', '// The 2.1.312 anchors');
// cli.js: Ye -> Ke; the GitHub stand-in is a, the fast-path settings source r.
rep("CLI entry's (Ye) own handling", "CLI entry's (Ke) own handling");
rep('(the GitHub stand-in, r): e is its', '(the GitHub stand-in, a): e is its');
rep("argument list and s the settings source", "argument list and r the settings source");
rep("edit('cli.js', 'Ye', t => once(t, 'if(r!==void 0){', entryStub('e', 's') + 'if(r!==void 0){'));",
  "edit('cli.js', 'Ke', t => once(t, 'if(a!==void 0){', entryStub('e', 'r') + 'if(a!==void 0){'));");
// Session root: Fr -> Rt (chunk-zpsbh0wk.js); _Yt -> t8t, uie -> jae.
rep("edit('chunk-wrtp8qz8.js', 'Fr', t => once(t, 'id:_Yt()??uie()', 'id:ccgRequestSessionID()??_Yt()??uie()'));",
  "edit('chunk-zpsbh0wk.js', 'Rt', t => once(t, 'id:t8t()??jae()', 'id:ccgRequestSessionID()??t8t()??jae()'));");
rep("surround('chunk-wrtp8qz8.js'", "surround('chunk-zpsbh0wk.js'");
// Container resources: nki -> YOi (chunk-7cks3gqr.js, ahr -> pwr); X -> V
// (chunk-rjc7jjmb.js, the node:os import H -> F).
rep("edit('chunk-c6dz8eqs.js', 'nki'", "edit('chunk-7cks3gqr.js', 'YOi'");
rep("'if(!ahr())return;let[e,r]=', 'if(!ahr())return;let ccgResources", "'if(!pwr())return;let[e,r]=', 'if(!pwr())return;let ccgResources");
rep("edit('chunk-c57c64b0.js', 'X'", "edit('chunk-rjc7jjmb.js', 'V'");
rep('H.freemem()', 'F.freemem()', 2);
rep('H.loadavg()', 'F.loadavg()', 2);
rep("for (const file of ['chunk-c6dz8eqs.js', 'chunk-c57c64b0.js'])", "for (const file of ['chunk-7cks3gqr.js', 'chunk-rjc7jjmb.js'])");
// Core (chunk-7dmym6x9.js): rH -> YH.
rep("edit(core, 'rH', t => once(t, 'async function rH(e,n){', 'async function rH(e,n){", "edit(core, 'YH', t => once(t, 'async function YH(e,n){', 'async function YH(e,n){");
// Core query: rSn -> Qmn, its request builder Ceo -> x9n; Q stays the query
// options; the other locals as the review found them.
const qs = t.indexOf("  edit(core, 'rSn'"), qe = t.indexOf('  // External wire history');
if (qs < 0 || qe < 0) throw Error('rSn block');
let q = t.slice(qs, qe);
for (const [a, b] of [["'rSn'", "'Qmn'"], ['Jh.', 'Wl.'], ['sl=K2(Rl);', 'fl=jK(Ll);'], ['sl=Q.ccgatewayBuildOnly===true?{}:K2(Rl);', 'fl=Q.ccgatewayBuildOnly===true?{}:jK(Ll);'],
  ['// K2 reads', '// jK reads'], ['let St=', 'let ht='], ['be(()=>hnr(Q.model,{isAgenticQuery:kt}))', 'Se(()=>xvn(Q.model,{isAgenticQuery:St}))'],
  ['kS!==null&&kS.sliceFrom>0?ep.slice(Hi[kS.sliceFrom]):ep,', 'oS!==null&&oS.sliceFrom>0?qu.slice(Nh[oS.sliceFrom]):qu,'],
  ['ep=xT=', 'qu=u_='], ['Tkr(', 'Xmr('], ['fs={', 'cl={'], ['let cyt=fWs(', 'let wW=oYs('], [':ou),', ':su),'], ['(ou),', '(su),'],['fingerprint:cyt,', 'fingerprint:wW,'],
  ['// fWs hashes', '// oYs hashes'], ['let Qn=hRe(()=>m$({maxRetries:0,', 'let Kn=Hve(()=>K$({maxRetries:0,'], ['body:Ceo(', 'body:x9n(']]) {
  if (!q.includes(a)) throw Error('rSn ' + a);
  q = q.split(a).join(b);
}
for (const stale of ['Jh.', 'sl=', 'K2(', 'Rl', 'St=', 'hnr', 'kt}', 'kS', 'ep.', 'ep=', 'Hi[', 'Tkr', 'fs={', 'cyt', 'fWs', 'ou)', 'Qn=', 'hRe', 'm$', 'Ceo']) if (q.includes(stale)) throw Error('rSn still has ' + stale);
// 2.1.312 moved thinking-token-count out of the model beta table (2.1.310
// chunk-ajtyjx88.js QH: {beta:aZ,when:interleavedThinking…}) into a push in the
// query loop after the model betas, past the line build replaces with the
// client's betas. Build sends the client's betas and only those its body
// needs (v27), so the push keeps the build guard the table had through that
// replacement; CC's own requests are unchanged.
const betasLine = "    t = once(t, 'let ht=Se(()=>xvn(Q.model,{isAgenticQuery:St})),'";
if (q.split(betasLine).length !== 2) throw Error('Qmn betas line');
q = q.replace(betasLine, "    // The model table no longer carries thinking-token-count (uF): the query\n    // loop pushes it after this line, so build guards that push as well.\n    t = once(t, 'if(Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);', 'if(Q.ccgatewayBuildOnly!==true&&Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);');\n" + betasLine);
t = t.slice(0, qs) + q + t.slice(qe);
// tSn -> Kmn (same return fields); UC -> Kk (its flush helpers Pr/ls -> Yr/Qr,
// the record list jn -> Yn, the loop record dr -> Mr); Tkr -> Xmr (mt as before).
rep("edit(core, 'tSn', t => once(t, 'function tSn(e,n){', 'function tSn(e,n){", "edit(core, 'Kmn', t => once(t, 'function Kmn(e,n){', 'function Kmn(e,n){");
rep(`edit(core, 'UC', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;Pr();ls();jn.push(dr);continue}case\\"system\\":"));`,
  `edit(core, 'Kk', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;Yr();Qr();Yn.push(Mr);continue}case\\"system\\":"));`);
rep("edit(core, 'Tkr', t =>", "edit(core, 'Xmr', t =>");
// Transport (chunk-yagw4eem.js): m$ -> K$ (container id Q, provider Ud, custom
// headers wzt, credentials lpe/$n/tot, headers object Qe, proxy auth W5e);
// ml -> Ml, M$ -> lF.
const ts = t.indexOf("  // The client factory (m$)"), te = t.indexOf("  // The default headers' User-Agent");
if (ts < 0 || te < 0) throw Error('m$ block');
t = t.slice(0, ts) + `  // The client factory (K$) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration.
  edit('chunk-yagw4eem.js', 'K$', t => {
    t = once(t, 'async function K$(e){let{apiKey:n,', 'async function K$(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,Q=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Ud(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let Q=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'se=wzt(),', 'se=ccgatewayAPIKeyOnly?{}:wzt(),');
    t = once(t, 'let Jn=await lpe({credentials:H,storageV5:V}),xt=$n(),_n=tot({anthropicAuthEnabled:sl(),oauthScopes:xt?.scopes}),', 'let Jn=ccgatewayAPIKeyOnly?void 0:await lpe({credentials:H,storageV5:V}),xt=ccgatewayAPIKeyOnly?null:$n(),_n=ccgatewayAPIKeyOnly?false:tot({anthropicAuthEnabled:sl(),oauthScopes:xt?.scopes}),');
    return once(t, 'if(!_n&&!Kr())Qn=await tw(Qe,be());await W5e();', 'if(!ccgatewayAPIKeyOnly&&!_n&&!Kr())Qn=await tw(Qe,be());if(!ccgatewayAPIKeyOnly)await W5e();else for(let name of Object.keys(Qe))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete Qe[name];');
  });
` + t.slice(te);
rep("// other request gets CC's (M$)", "// other request gets CC's (lF)");
rep(`edit('chunk-bbw420pv.js', 'ml', t => once(t, '"User-Agent":M$()', '"User-Agent":ccgatewayClientUserAgent()??M$()'));`,
  `edit('chunk-yagw4eem.js', 'Ml', t => once(t, '"User-Agent":lF()', '"User-Agent":ccgatewayClientUserAgent()??lF()'));`);
rep("surround('chunk-bbw420pv.js'", "surround('chunk-yagw4eem.js'");
// Billing attribution: EFs -> d2s (chunk-pd06as9s.js), Li -> Qi, $Vn -> b6n.
rep('the one $Vn selected', 'the one b6n selected');
rep("edit('chunk-f7aya6cs.js', 'EFs', t => once(t, 'd=Li([s,n,...e].filter(Boolean));', 'd=Li([s,n,...e].filter(Boolean));",
  "edit('chunk-pd06as9s.js', 'd2s', t => once(t, 'd=Qi([s,n,...e].filter(Boolean));', 'd=Qi([s,n,...e].filter(Boolean));");
// Environment fields renderer: yao -> boo (ZW/ede/cao -> k1/ile/goo).
rep(`edit(core, 'yao', t => once(t, 'ZW(e)?ede(e):cao()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:ZW(e)?ede(e):cao()'));`,
  `edit(core, 'boo', t => once(t, 'k1(e)?ile(e):goo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:k1(e)?ile(e):goo()'));`);
for (const stale of ['chunk-wrtp8qz8', 'chunk-c6dz8eqs', 'chunk-c57c64b0', 'chunk-bbw420pv', 'chunk-f7aya6cs', "'rH'", "'rSn'", "'tSn'", "'UC'", "'Tkr'", "'yao'", 'M$()', 'm$']) if (t.includes(stale)) throw Error('still ' + stale);
fs.writeFileSync(path.join(dir, 'patches/2.1.312.cjs'), t);
console.log('ok');
