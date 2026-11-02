// Derives patches/2.1.316.cjs from patches/2.1.312.cjs: every anchor and the
// local names in its replacement, as the 2.1.316 review established them
// (docs/CLAUDE-CODE-2.1.316-MIGRATION.md section 3). Each replacement must
// match exactly the expected number of times, so a stale assumption fails here,
// and no 2.1.312 name may remain in an anchor. Three 2.1.312 names still exist
// in the 2.1.316 tree with another meaning, so leaving one behind would not
// fail at patch time: Q (the old query options; the new core imports an
// unrelated Q, so Q.ccgatewayBuildOnly would be always false), Kmn (the new
// core's sandbox_instructions attachment, which the old anchor text matches
// once) and Ud (in the new client module the first-party URL check; the
// provider route is Od). Ml is a different function there too (its anchor
// would fail, but it is checked anyway).
//   node tools/upgrade/examples/derive-anchors-2.1.316.cjs <cli-mods dir>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
let t = fs.readFileSync(path.join(dir, 'patches/2.1.312.cjs'), 'utf8');
const count = (s, a) => s.split(a).length - 1;
const rep = (a, b, n = 1) => { const c = count(t, a); if (c !== n) throw Error(c + ' x ' + a); t = t.split(a).join(b); };
// An identifier (or name followed by '.') not part of a longer identifier.
const ident = (s, name) => new RegExp('(?<![A-Za-z0-9_$])' + name.replace(/[$.()[\]{}?*+]/g, '\\$&') + (/[A-Za-z0-9_$]$/.test(name) ? '(?![A-Za-z0-9_$])' : '')).test(s);

rep('// The 2.1.312 anchors', '// The 2.1.316 anchors');
// cli.js: Ke -> qe; the argument list e -> t, the fast-path settings source
// r -> o; the GitHub stand-in is still a.
rep("CLI entry's (Ke) own handling", "CLI entry's (qe) own handling");
rep('(the GitHub stand-in, a): e is its', '(the GitHub stand-in, a): t is its');
rep('argument list and r the settings source', 'argument list and o the settings source');
rep("edit('cli.js', 'Ke', t => once(t, 'if(a!==void 0){', entryStub('e', 'r') + 'if(a!==void 0){'));",
  "edit('cli.js', 'qe', t => once(t, 'if(a!==void 0){', entryStub('t', 'o') + 'if(a!==void 0){'));");
// Session root: Rt stays Rt, now in chunk-ndmse9kj.js; t8t -> p7t, jae -> Ude.
rep("edit('chunk-zpsbh0wk.js', 'Rt', t => once(t, 'id:t8t()??jae()', 'id:ccgRequestSessionID()??t8t()??jae()'));",
  "edit('chunk-ndmse9kj.js', 'Rt', t => once(t, 'id:p7t()??Ude()', 'id:ccgRequestSessionID()??p7t()??Ude()'));");
rep("surround('chunk-zpsbh0wk.js'", "surround('chunk-ndmse9kj.js'");
// Container resources: YOi -> BWi (chunk-5mav84cq.js, pwr -> Pxr, the timeout
// wrapper Pe -> Ce); V -> Z (chunk-eweqvj83.js, the node:os import stays F).
rep("edit('chunk-7cks3gqr.js', 'YOi'", "edit('chunk-5mav84cq.js', 'BWi'");
rep("'if(!pwr())return;let[e,r]=', 'if(!pwr())return;let ccgResources", "'if(!Pxr())return;let[e,r]=', 'if(!Pxr())return;let ccgResources");
rep('Pe(u(t,{bigint:!0}),s).catch(()=>{return})', 'Ce(u(t,{bigint:!0}),s).catch(()=>{return})', 2);
rep("edit('chunk-rjc7jjmb.js', 'V'", "edit('chunk-eweqvj83.js', 'Z'");
rep("for (const file of ['chunk-7cks3gqr.js', 'chunk-rjc7jjmb.js'])", "for (const file of ['chunk-5mav84cq.js', 'chunk-eweqvj83.js'])");
// Core (chunk-e6aww6q8.js): YH -> gB.
rep("edit(core, 'YH', t => once(t, 'async function YH(e,n){', 'async function YH(e,n){", "edit(core, 'gB', t => once(t, 'async function gB(e,n){', 'async function gB(e,n){");
// Core query: Qmn -> e_n, its request builder x9n -> g5n; the query options
// Q -> Z. The wrapper and the clock swapped names (old Se wrapper / ke clock,
// new ke wrapper / Se clock); the other locals as the review found them.
const qs = t.indexOf("  edit(core, 'Qmn'"), qe = t.indexOf('  // External wire history');
if (qs < 0 || qe < 0) throw Error('Qmn block');
let q = t.slice(qs, qe);
for (const [a, b, n] of [["'Qmn'", "'e_n'", 1], ['Q.', 'Z.', 25], ['Wl.', 'Nu.', 6], ['jK(Ll)', 'RV(Yl)', 2], ['fl=', 'nd=', 2], ['// jK reads', '// RV reads', 1],
  ['Se(()=>CYn(vt))&&It.thinking.supported&&!ht.includes(uF))ht.push(uF);', 'ke(()=>_Jn(pt))&&It.thinking.supported&&!gt.includes(AU))gt.push(AU);', 2],
  ['thinking-token-count (uF)', 'thinking-token-count (AU)', 1], ['let ht=', 'let gt=', 2],
  ['Se(()=>xvn(Z.model,{isAgenticQuery:St}))', 'ke(()=>lRn(Z.model,{isAgenticQuery:Et}))', 2],
  ['oS!==null&&oS.sliceFrom>0?qu.slice(Nh[oS.sliceFrom]):qu,', 'L_!==null&&L_.sliceFrom>0?Mg.slice(Of[L_.sliceFrom]):Mg,', 2],
  ['qu=u_=', 'Mg=HS=', 2], ['Xmr(', 'YSr(', 2], ['cl={', 'Kc={', 2], ['let wW=oYs(', 'let uI=Vei(', 2], [':su),', ':_s),', 1], ['(su),', '(_s),', 1],
  ['fingerprint:wW,', 'fingerprint:uI,', 2], ['// oYs hashes', '// Vei hashes', 1],
  ['let Kn=Hve(()=>K$({maxRetries:0,', 'let Wn=DEe(()=>MN({maxRetries:0,', 2], ['body:x9n(', 'body:g5n(', 1]]) {
  const c = count(q, a);
  if (c !== n) throw Error('Qmn ' + c + ' x ' + a);
  q = q.split(a).join(b);
}
// Q is the trap: the new core imports an unrelated Q (chunk-p86mcgbc.js).
for (const stale of ['Q', 'Wl', 'jK', 'Ll', 'fl', 'ht', 'CYn', 'vt', 'uF', 'xvn', 'St', 'oS', 'qu', 'u_', 'Nh', 'Xmr', 'cl', 'wW', 'oYs', 'su', 'Kn', 'Hve', 'K$', 'x9n', 'Qmn']) {
  if (ident(q, stale)) throw Error('e_n still has ' + stale);
}
if (/(?<![A-Za-z0-9_$])Se\(/.test(q)) throw Error('e_n uses Se( (the clock in 2.1.316)');
if (count(q, 'Z.ccgateway') !== 18) throw Error('e_n Z.ccgateway ' + count(q, 'Z.ccgateway'));
t = t.slice(0, qs) + q + t.slice(qe);
// Kmn -> Qyn (same return fields). The new core still has a function Kmn, the
// unrelated sandbox_instructions attachment: the edit must name Qyn.
rep("edit(core, 'Kmn', t => once(t, 'function Kmn(e,n){', 'function Kmn(e,n){", "edit(core, 'Qyn', t => once(t, 'function Qyn(e,n){', 'function Qyn(e,n){");
// Kk -> AT: its flush helpers Yr/Qr -> rs/fs, the record list Yn -> Kn, the
// loop record Mr -> jo. Xmr -> YSr: the mapped message mt -> At.
rep(`edit(core, 'Kk', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;Yr();Qr();Yn.push(Mr);continue}case\\"system\\":"));`,
  `edit(core, 'AT', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;rs();fs();Kn.push(jo);continue}case\\"system\\":"));`);
rep(`edit(core, 'Xmr', t => once(t, "if(mt.type===\\"api_system\\"){", "if(mt.type===\\"api_system\\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));`,
  `edit(core, 'YSr', t => once(t, "if(At.type===\\"api_system\\"){", "if(At.type===\\"api_system\\"){if(At.ccgatewayWireSystem!==void 0)return structuredClone(At.ccgatewayWireSystem);"));`);
// Transport (chunk-hwmsct5x.js): K$ -> MN (container id Q -> J; the provider
// route Ud -> Od, while this module's Ud is the old Od; custom headers wzt ->
// v4t; credentials lpe/$n/tot/sl -> fge/Pn/hUe/fl; headers object Qe -> ze;
// proxy auth W5e -> I8e). New anchor 6: after proxy auth 2.1.316 re-reads the
// stored login, re-decides OAuth and re-reads the custom headers, rebuilding
// the client when they changed; API-key-only skips it like the first reads.
// Ml -> Fl, lF -> wU (the new module's Ml is another function).
const ts = t.indexOf('  // The client factory (K$)'), te = t.indexOf("  // The default headers' User-Agent");
if (ts < 0 || te < 0) throw Error('K$ block');
t = t.slice(0, ts) + `  // The client factory (MN) takes its options whole and destructures them in
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
` + t.slice(te);
rep("// other request gets CC's (lF)", "// other request gets CC's (wU)");
rep(`edit('chunk-yagw4eem.js', 'Ml', t => once(t, '"User-Agent":lF()', '"User-Agent":ccgatewayClientUserAgent()??lF()'));`,
  `edit('chunk-hwmsct5x.js', 'Fl', t => once(t, '"User-Agent":wU()', '"User-Agent":ccgatewayClientUserAgent()??wU()'));`);
rep("surround('chunk-yagw4eem.js'", "surround('chunk-hwmsct5x.js'");
// Billing attribution: d2s -> JXs (chunk-w5ndchqs.js), Qi -> ca, b6n -> p7n.
rep('the one b6n selected', 'the one p7n selected');
rep("edit('chunk-pd06as9s.js', 'd2s', t => once(t, 'd=Qi([s,n,...e].filter(Boolean));', 'd=Qi([s,n,...e].filter(Boolean));",
  "edit('chunk-w5ndchqs.js', 'JXs', t => once(t, 'd=ca([s,n,...e].filter(Boolean));', 'd=ca([s,n,...e].filter(Boolean));");
// Environment fields renderer: boo -> Sio (k1/ile/goo -> Y1/qde/cio).
rep(`edit(core, 'boo', t => once(t, 'k1(e)?ile(e):goo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:k1(e)?ile(e):goo()'));`,
  `edit(core, 'Sio', t => once(t, 'Y1(e)?qde(e):cio()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:Y1(e)?qde(e):cio()'));`);
for (const stale of ['chunk-zpsbh0wk', 'chunk-7cks3gqr', 'chunk-rjc7jjmb', 'chunk-yagw4eem', 'chunk-pd06as9s', "'Ke'", "'YH'", "'Qmn'", "'Kmn'", "'Kk'", "'Xmr'", "'boo'", "'K$'", "'Ml'", "'d2s'", "'YOi'", "'V'",
  'Ud(s)', 'lF()', 'K$', 'wzt', 'W5e', 'lpe', 'tot(', 'Qe[', 'Qe,', 't8t', 'jae', 'pwr', 'Pe(u(', 'Yr();', 'Yn.push', 'mt.', 'k1(e)', 'Qi(', 'b6n', 'x9n', 'oYs', 'Hve']) {
  if (t.includes(stale)) throw Error('still ' + stale);
}
for (const stale of ['Q', 'Kmn', 'Ml', 'Kk', 'Xmr', 'YH']) if (ident(t, stale)) throw Error('still ' + stale);
for (const must of ['function Qyn(e,n){if(n.ccgatewayInput===true)', 'Od(s)!=="firstParty"', 'if(!ccgatewayAPIKeyOnly){let Bl=Pn();', '"User-Agent":ccgatewayClientUserAgent()??wU()']) {
  if (count(t, must) !== 1) throw Error('expected once: ' + must);
}
fs.writeFileSync(path.join(dir, 'patches/2.1.316.cjs'), t);
console.log('ok');
