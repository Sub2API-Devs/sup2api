// Derives patches/2.1.318.cjs from patches/2.1.316.cjs: every anchor and the
// local names in its replacement, as the 2.1.318 review established them
// (docs/CLAUDE-CODE-2.1.318-MIGRATION.md section 3; artifacts/claude-2.1.318/
// review/g1-query.md, g2-core.md). Each replacement must match exactly the
// expected number of times, so a stale assumption fails here, and no 2.1.316
// name may remain. In 2.1.318 almost every 2.1.316 name still exists with
// another meaning, so a name left behind would not fail at patch time:
// Z and Q are imports of the new core (Z.ccgatewayBuildOnly would be always
// false), g5n is fs/promises' open, Mg lstat, lRn/MN/AU other modules'
// bindings, RV/YSr/DEe unrelated core functions; in the query, It is now the
// beta list and Nt the model facts; in the resource reader a is the error
// logger and l the GiB constant; in the startup report p is a mark, a the
// marks. The checks at the end name them.
//   node tools/upgrade/examples/derive-anchors-2.1.318.cjs <cli-mods dir>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
let t = fs.readFileSync(path.join(dir, 'patches/2.1.316.cjs'), 'utf8');
const count = (s, a) => s.split(a).length - 1;
const rep = (a, b, n = 1) => { const c = count(t, a); if (c !== n) throw Error(c + ' x ' + a); t = t.split(a).join(b); };
// An identifier (or name followed by '.') not part of a longer identifier.
const ident = (s, name) => new RegExp('(?<![A-Za-z0-9_$])' + name.replace(/[$.()[\]{}?*+]/g, '\\$&') + (/[A-Za-z0-9_$]$/.test(name) ? '(?![A-Za-z0-9_$])' : '')).test(s);
const between = (from, to) => { const a = t.indexOf(from), b = t.indexOf(to, a + 1); if (a < 0 || b < 0) throw Error('block ' + from); return t.slice(a, b); };

rep('// The 2.1.316 anchors', '// The 2.1.318 anchors');
// cli.js: qe -> Xe; the argument list is still t, the fast-path settings
// source o -> s; the GitHub stand-in is still a.
rep("CLI entry's (qe) own handling", "CLI entry's (Xe) own handling");
rep('argument list and o the settings source', 'argument list and s the settings source');
rep("edit('cli.js', 'qe', t => once(t, 'if(a!==void 0){', entryStub('t', 'o') + 'if(a!==void 0){'));",
  "edit('cli.js', 'Xe', t => once(t, 'if(a!==void 0){', entryStub('t', 's') + 'if(a!==void 0){'));");
// Session root: Rt -> Tt, now in chunk-5ythzcas.js; p7t -> lTo (which now also
// declines nested sessions), Ude -> dpe.
rep("edit('chunk-ndmse9kj.js', 'Rt', t => once(t, 'id:p7t()??Ude()', 'id:ccgRequestSessionID()??p7t()??Ude()'));",
  "edit('chunk-5ythzcas.js', 'Tt', t => once(t, 'id:lTo()??dpe()', 'id:ccgRequestSessionID()??lTo()??dpe()'));");
rep("surround('chunk-ndmse9kj.js'", "surround('chunk-5ythzcas.js'");
// Container resources: BWi -> Foa (chunk-rf2v5y5r.js): Pxr -> CBr, the timeout
// wrapper Ce -> ke, the statfs reader u -> f, cpus d -> u, memory p -> d and
// the GiB constant a -> l (a is now the error logger). Z -> N
// (chunk-eehtd1bk.js): node:os F -> M, the marks p -> a (p is now one mark).
rep("edit('chunk-5mav84cq.js', 'BWi'", "edit('chunk-rf2v5y5r.js', 'Foa'");
rep('Pxr()', 'CBr()', 2);
rep('Ce(u(t,{bigint:!0}),s).catch(()=>{return})', 'ke(f(t,{bigint:!0}),s).catch(()=>{return})', 2);
rep('BigInt(ccgResources.disk_free_gb)*a)', 'BigInt(ccgResources.disk_free_gb)*l)');
rep("'cpus:d(),memory_gb:Math.round(p()/Number(a))'", "'cpus:u(),memory_gb:Math.round(d()/Number(l))'");
rep("cpus:ccgResources?ccgResources.cpus:d(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(p()/Number(a))'",
  "cpus:ccgResources?ccgResources.cpus:u(),memory_gb:ccgResources?ccgResources.memory_gb:Math.round(d()/Number(l))'");
rep("edit('chunk-eweqvj83.js', 'Z'", "edit('chunk-eehtd1bk.js', 'N'");
rep('if(p.length===0)return null;', 'if(a.length===0)return null;', 2);
rep('F.freemem()', 'M.freemem()', 2);
rep('F.loadavg()', 'M.loadavg()', 2);
rep('n.checkpoint_count=p.length;', 'n.checkpoint_count=a.length;', 2);
rep("for (const file of ['chunk-5mav84cq.js', 'chunk-eweqvj83.js'])", "for (const file of ['chunk-rf2v5y5r.js', 'chunk-eehtd1bk.js'])");
// Core (chunk-5xgkngpb.js), review g2: gB -> YU; Qyn -> X_n, which takes a
// third parameter (r, a timing callback; the 8 returned fields are
// unchanged); AT -> sv with the flushes rs/fs -> js/Fa, the record list
// Kn -> wn, the loop record jo -> Fo; YSr -> nRr, whose record At -> mt; Sio ->
// vdo with Y1/qde/cio -> sz/Rfe/mdo. 2.1.318 still has functions named gB,
// Qyn and Sio, in which the old anchors match nowhere.
rep("edit(core, 'gB', t => once(t, 'async function gB(e,n){', 'async function gB(e,n){", "edit(core, 'YU', t => once(t, 'async function YU(e,n){', 'async function YU(e,n){");
rep("edit(core, 'Qyn', t => once(t, 'function Qyn(e,n){', 'function Qyn(e,n){", "edit(core, 'X_n', t => once(t, 'function X_n(e,n,r){', 'function X_n(e,n,r){");
rep(`edit(core, 'AT', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;rs();fs();Kn.push(jo);continue}case\\"system\\":"));`,
  `edit(core, 'sv', t => once(t, "case\\"progress\\":continue;case\\"system\\":", "case\\"progress\\":continue;case\\"api_system\\":{if(!s?.ccgatewayInput)continue;js();Fa();wn.push(Fo);continue}case\\"system\\":"));`);
rep(`edit(core, 'YSr', t => once(t, "if(At.type===\\"api_system\\"){", "if(At.type===\\"api_system\\"){if(At.ccgatewayWireSystem!==void 0)return structuredClone(At.ccgatewayWireSystem);"));`,
  `edit(core, 'nRr', t => once(t, "if(mt.type===\\"api_system\\"){", "if(mt.type===\\"api_system\\"){if(mt.ccgatewayWireSystem!==void 0)return structuredClone(mt.ccgatewayWireSystem);"));`);
rep(`edit(core, 'Sio', t => once(t, 'Y1(e)?qde(e):cio()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:Y1(e)?qde(e):cio()'));`,
  `edit(core, 'vdo', t => once(t, 'sz(e)?Rfe(e):mdo()', 'Object.hasOwn(e,"ccgatewayProxyText")?e.ccgatewayProxyText:sz(e)?Rfe(e):mdo()'));`);

// Core query, review g1: e_n -> Z_n, its request builder g5n -> VJn; the
// query options Z -> ne (the new core imports a Z and a Q). The model facts
// It -> Nt and the beta list gt -> It (so It.thinking moves first); the
// wrapper ke -> Ee. The model-list line now ends in ';' and is followed by a
// program-use-case-ids append (anchor 12, new). The message step is split in
// two (jy=nRr(…), then Yg=Oy=Xgn(jy,…), a tool-provenance pass): both are
// skipped for wire messages (7a, 7b), as 2.1.316 skipped YSr.
const qs = t.indexOf("  edit(core, 'e_n'"), qe = t.indexOf('  // External wire history');
if (qs < 0 || qe < 0) throw Error('e_n block');
let q = t.slice(qs, qe);
for (const [a, b, n] of [["'e_n'", "'Z_n'", 1], ['// RV reads', '// zRt reads', 1], ['thinking-token-count (AU)', 'thinking-token-count (S1)', 1], ['// Vei hashes', '// Wwi hashes', 1],
  ['Nu.', 'lc.', 6], ['nd=', 'Qd=', 2], ['RV(Yl)', 'zRt(Bd)', 2],
  ['ke(()=>_Jn(pt))', 'Ee(()=>GRt(At))', 2], ['It.thinking', 'Nt.thinking', 2], ['gt.includes(AU))gt.push(AU)', 'It.includes(S1))It.push(S1)', 2],
  ['let gt=', 'let It=', 2], ['ke(()=>lRn(', 'Ee(()=>XNn(', 2], ['Et})),', 'Et}));', 2],
  ['L_', 'uk', 6], ['Mg.slice(Of[', 'Yg.slice(ah[', 2], [':Mg,', ':Yg,', 2],
  ['Mg=HS=', 'jy=', 2], ['YSr(', 'nRr(', 2], ['Kc=', 'la=', 2],
  ['let uI=Vei(', 'let pSt=Wwi(', 2], ['(_s),', '(cs),', 1], [':_s),', ':cs),', 1], ['fingerprint:uI,', 'fingerprint:pSt,', 2],
  ['g5n(', 'VJn(', 1], ['let Wn=DEe(()=>MN(', 'let zn=pxe(()=>uF(', 2]]) {
  const c = count(q, a);
  if (c !== n) throw Error('Z_n ' + c + ' x ' + a);
  q = q.split(a).join(b);
}
// The query options last: every Z. in the block is the query's.
q = q.split('Z.').join('ne.');
const model = "    t = once(t, 'let It=Ee(()=>XNn(ne.model,{isAgenticQuery:Et}));', ";
if (count(q, model) !== 1) throw Error('model list line');
const at = q.indexOf('\n', q.indexOf(model)) + 1;
q = q.slice(0, at) + (

  "    // 2.1.318 appends program-use-case-ids after the model list when the\n" +
  "    // process's sticky beta state saw it sent: a build sends the client's betas.\n" +
  "    t = once(t, 'else if(pE(mt,dR)&&YNn())It=[...It,dR];', 'else if(ne.ccgatewayBuildOnly!==true&&pE(mt,dR)&&YNn())It=[...It,dR];');\n") + q.slice(at);
const seven = "    t = once(t, 'jy=nRr(', 'jy=' + wire + '?structuredClone(ne.ccgatewayWireMessages):nRr(');\n";
if (count(q, seven) !== 1) throw Error('7a line');
q = q.replace(seven, () => seven +
  "    // Then the tool-provenance pass (Xgn) would rewrite ownership metadata in\n" +
  "    // the client's tool_addition blocks: wire messages skip it too.\n" +
  "    t = once(t, 'Yg=Oy=Xgn(', 'Yg=Oy=' + wire + '?jy:Xgn(');\n");
t = t.slice(0, qs) + q + t.slice(qe);

// The client factory (chunk-vn3g7zt8.js): MN -> uF; the container id J -> X,
// the provider route Od -> kd, v4t -> jJt (se -> ae), fge/Pn/hUe/fl ->
// B_e/Hn/kGe/Ka with the login pt -> bt and OAuth kt -> Ct, the custom headers
// ze -> Ke, lw/Lr/_e/I8e -> HS/Vr/ye/RZe, the re-read Bl -> Vl with lt/sFe ->
// ft/hWe. Fl -> Wl with the UA wU -> g1.
rep(`  // The client factory (MN) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration. Its provider route
  // is Od here (2.1.312's Ud; this module's Ud is the first-party URL check).
  // After proxy auth it re-reads the stored login and re-decides OAuth and the
  // custom headers (Pn, hUe, fl, sFe), rebuilding the client when they changed:
  // the API-key-only route skips that as it skips the first reads.`,
`  // The client factory (uF) takes its options whole and destructures them in
  // its body; the API-key check follows that declaration. Its provider route
  // is kd here. After proxy auth it re-reads the stored login and re-decides
  // OAuth and the custom headers (Hn, kGe, Ka, hWe), rebuilding the client when
  // they changed: the API-key-only route skips that as it skips the first reads.`);
rep("edit('chunk-hwmsct5x.js', 'MN'", "edit('chunk-vn3g7zt8.js', 'uF'");
rep('async function MN(e){', 'async function uF(e){', 2);
rep("'}=e,J=process.env.CLAUDE_CODE_CONTAINER_ID,'", "'}=e,X=process.env.CLAUDE_CODE_CONTAINER_ID,'");
rep('let J=process.env.CLAUDE_CODE_CONTAINER_ID,', 'let X=process.env.CLAUDE_CODE_CONTAINER_ID,');
rep('Od(s)!==\\"firstParty\\"', 'kd(s)!==\\"firstParty\\"', 0);
rep('Od(s)!=="firstParty"', 'kd(s)!=="firstParty"');
rep("'se=v4t(),', 'se=ccgatewayAPIKeyOnly?{}:v4t(),'", "'ae=jJt(),', 'ae=ccgatewayAPIKeyOnly?{}:jJt(),'");
rep('let Qn=', 'let nr=', 2);
rep('fge({credentials:H,storageV5:j})', 'B_e({credentials:H,storageV5:J})', 2);
rep('pt=Pn()', 'bt=Hn()');
rep('pt=ccgatewayAPIKeyOnly?null:Pn()', 'bt=ccgatewayAPIKeyOnly?null:Hn()');
rep('kt=hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes})', 'Ct=kGe({anthropicAuthEnabled:Ka(),oauthScopes:bt?.scopes})');
rep('kt=ccgatewayAPIKeyOnly?false:hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes})', 'Ct=ccgatewayAPIKeyOnly?false:kGe({anthropicAuthEnabled:Ka(),oauthScopes:bt?.scopes})');
rep('!kt&&!Lr())Zn=await lw(ze,_e());', '!Ct&&!Vr())or=await HS(Ke,ye());', 2);
rep('await I8e();', 'await RZe();', 2);
rep('Object.keys(ze))', 'Object.keys(Ke))');
rep('delete ze[name]', 'delete Ke[name]');
rep('let Bl=Pn();if(pt&&Bl?.accessToken!==pt.accessToken||kt!==hUe({anthropicAuthEnabled:fl(),oauthScopes:Bl?.scopes})||lt(ze).value===void 0&&sFe())return MN(e)',
  'let Vl=Hn();if(bt&&Vl?.accessToken!==bt.accessToken||Ct!==kGe({anthropicAuthEnabled:Ka(),oauthScopes:Vl?.scopes})||ft(Ke).value===void 0&&hWe())return uF(e)', 2);
rep("other request gets CC's (wU)", "other request gets CC's (g1)");
rep(`edit('chunk-hwmsct5x.js', 'Fl', t => once(t, '"User-Agent":wU()', '"User-Agent":ccgatewayClientUserAgent()??wU()'));`,
  `edit('chunk-vn3g7zt8.js', 'Wl', t => once(t, '"User-Agent":g1()', '"User-Agent":ccgatewayClientUserAgent()??g1()'));`);
rep("surround('chunk-hwmsct5x.js'", "surround('chunk-vn3g7zt8.js'");
// Billing: JXs -> tyi (chunk-7pwjpdkw.js), ca -> Ia; the identity line is tcr's.
rep('the line is the one p7n selected', 'the line is the one tcr selected');
rep(`edit('chunk-w5ndchqs.js', 'JXs', t => once(t, 'd=ca([s,n,...e].filter(Boolean));', 'd=ca([s,n,...e].filter(Boolean));`,
  `edit('chunk-7pwjpdkw.js', 'tyi', t => once(t, 'd=Ia([s,n,...e].filter(Boolean));', 'd=Ia([s,n,...e].filter(Boolean));`);

// New in 2.1.318 (v49): the tools-used header (x-claude-code-sandy-plover,
// request_tools_used_v1; SESSION-MEMORY-TOOLS-USED-DESIGN.md §6, artifacts/
// claude-2.1.318/review/sp-spec.md). 2.1.316 has the same header behind a flag
// that is off by default and no anchor for it, so these are written here, not
// derived; each is checked below. The anchor files see the module texts
// (files) for the summary reader check.
rep('module.exports = ({ edit, once, surround, core, entryStub }) => {', 'module.exports = ({ files, edit, once, surround, core, entryStub }) => {');
const toolsUsed = String.raw`  // The tools-used header (x-claude-code-sandy-plover, request_tools_used_v1;
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
`;
if (!/\n};\n?$/.test(t)) throw Error('anchor file end');
t = t.replace(/\n};\n?$/, () => '\n' + toolsUsed + '};\n');

// Nothing of 2.1.316 is left: module names, function names, and the locals
// that now mean something else in 2.1.318.
for (const s of ['chunk-ndmse9kj', 'chunk-5mav84cq', 'chunk-eweqvj83', 'chunk-e6aww6q8', 'chunk-hwmsct5x', 'chunk-w5ndchqs', '2.1.316',
  "'qe'", "'Rt'", "'BWi'", "'Z'", "'gB'", "'e_n'", "'Qyn'", "'AT'", "'YSr'", "'Sio'", "'MN'", "'Fl'", "'JXs'",
  'p7t', 'Ude', 'Pxr', 'Ce(u(', 'F.freemem', 'F.loadavg', 'p.length', '*a)', 'Number(a)', 'p()/',
  'rs();fs();Kn.push(jo)', 'At.', 'Y1(e)', 'qde(', 'cio(',
  'Nu.', 'RV(', 'Yl', 'nd=', '_Jn', 'gt.', 'gt=', '(AU)', 'lRn', 'L_', 'Mg', 'Of[', 'HS=', 'YSr', 'Kc=', 'uI', 'Vei', '_s)', 'Wn=', 'DEe', 'g5n', 'It.thinking',
  'v4t', 'fge', 'Pn()', 'hUe', 'fl()', 'Lr()', 'lw(', '_e()', 'I8e', 'lt(ze)', 'sFe', 'ze[', 'Od(', 'wU()', 'ca([']) if (t.includes(s)) throw Error('still ' + s);
if (ident(t, 'Bl')) throw Error('still Bl');
const query = between("  edit(core, 'Z_n'", '  // External wire history');
for (const s of ['Z', 'Q', 'ke', 'gt', 'pt', 'MN', 'AU', 'Se']) if (ident(query, s + '.') || ident(query, s + '(') || ident(query, s)) throw Error('query still ' + s);
for (const [must, n, s = t] of [['ne.ccgateway', 19, query], ['Nt.thinking', 2, query], ['jy=nRr(', 1, query], ["'Yg=Oy=Xgn('", 1, query], ["'else if(pE(mt,dR)&&YNn())It=[...It,dR];'", 1, query],
  ['body:VJn({model:ne.model,fastMode:false})', 1, query],
  ['function X_n(e,n,r){if(n.ccgatewayInput===true)return{messagesPreNormalize:e,', 1], ['js();Fa();wn.push(Fo);', 1], ['mt.ccgatewayWireSystem', 2], ['sz(e)?Rfe(e):mdo()', 2],
  ['kd(s)!=="firstParty"', 1], ['if(!ccgatewayAPIKeyOnly){let Vl=Hn();', 1], ['Hn()', 4], ["entryStub('t', 's')", 1],
  ['BigInt(ccgResources.disk_free_gb)*l', 1], ['Math.round(d()/Number(l))', 2], ['n.checkpoint_count=a.length;', 2],
  ["edit('chunk-vn3g7zt8.js', 'XS'", 1], ['if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")', 1],
  ['let ccgToolsUsed=ccgatewayToolsUsedHeader(H,()=>Nf(wf()));if(ccgToolsUsed===null)H.delete(Ulo);else if(H.set(Ulo,ccgToolsUsed??Nf(wf())),', 1],
  ['from "./ccgateway-request-tools-used.js"', 1], ["surround('chunk-sva49n74.js', { code: '\\nexport {Z as ccgatewayCompactSummaryTools};\\n' });", 1],
  ['({ files, edit, once, surround, core, entryStub })', 1]]) if (count(s, must) !== n) throw Error(`expected ${n}x (${count(s, must)}): ${must}`);
fs.writeFileSync(path.join(dir, 'patches/2.1.318.cjs'), t);
console.log('wrote patches/2.1.318.cjs');
