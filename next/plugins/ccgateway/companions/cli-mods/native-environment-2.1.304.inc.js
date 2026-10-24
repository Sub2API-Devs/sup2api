// Inserted only into the independently hash-bound 2.1.304 core module.
// All readers and renderers below are native bindings verified for that build.
//
// The snapshot keys this reader fills: the fields the native environment
// collector (Wkt) builds, which zkt then renders (test/native-environment.test.mjs
// checks them against the recovered Wkt), and the one key the patched renderer
// reads (`ccgatewayProxyText`: the proxy note as it was or was not requested).
// Wkt itself is not called: it reads every field, and one failing reader would
// fail the whole snapshot instead of leaving that field unavailable, while a
// request that wants one field must not run the others (Git detection in
// particular).
export const ccgatewayEnvironmentSnapshotKeys = ['workingDirectory', 'isWorktree', 'isGitRepo', 'additionalWorkingDirectories', 'platform', 'shell', 'osVersion', 'scratchpadDirectory', 'githubCli'];
// The on-demand readers, in the native snapshot's order: the requested field
// that needs it, the snapshot key it fills, and its reader.
const ccgatewayEnvironmentReaders = context => [
  ['git_repository', 'isGitRepo', () => gH()],
  ['worktree', 'isWorktree', () => Cl() !== null || hK(context.workingDirectory)],
  ['additional_directories', 'additionalWorkingDirectories', () => [...context.additionalWorkingDirectories]],
  ['shell', 'shell', () => uoo()],
  ['os_version', 'osVersion', () => poo()],
  ['scratchpad_directory', 'scratchpadDirectory', () => moo()],
  ['github_cli', 'githubCli', () => Nkt()],
];
export async function ccgatewayEnvironment(context, selected) {
  const wanted = new Set(selected);
  const unavailableFields = [];
  // The proxy note is rendered only when it is requested: the patched renderer
  // reads ccgatewayProxyText (null suppresses the line), so content-policy can
  // parse the snapshot without an unrequested proxy paragraph.
  const override = cle();
  if (override !== undefined) {
    let proxy = null;
    if (wanted.has('agent_proxy')) {
      try { proxy = l1(override) ? ule(override) : foo(); }
      catch { unavailableFields.push('agent_proxy'); }
    }
    return { text: zkt({ ...override, ccgatewayProxyText: proxy }), fieldText: { agent_proxy: proxy }, unavailableFields };
  }
  let proxy = null;
  if (wanted.has('agent_proxy')) {
    try { proxy = foo(); }
    catch { unavailableFields.push('agent_proxy'); }
  }
  const snapshot = { platform: a.platform, additionalWorkingDirectories: [], ccgatewayProxyText: proxy };
  // primary_directory, git_repository and worktree are facts about the working
  // directory: left absent unless one of them is wanted.
  if (['primary_directory', 'git_repository', 'worktree'].some(field => wanted.has(field))) {
    snapshot.workingDirectory = context.workingDirectory;
    snapshot.isGitRepo = false;
    snapshot.isWorktree = false;
  }
  for (const [field, key, read] of ccgatewayEnvironmentReaders(context)) {
    if (!wanted.has(field)) continue;
    try { snapshot[key] = await read(); }
    catch { unavailableFields.push(field); }
  }
  return {
    text: zkt(snapshot),
    fieldText: { agent_proxy: proxy },
    unavailableFields,
  };
}

// ccgatewayEnvironmentVocabulary is the CC wording content-policy.js
// recognizes, taken from the native code above: its constants, and its
// renderers run with marker values, so the mods carry none of that wording.
// A change in the renderers' shape fails here instead of misrecognizing.
export function ccgatewayEnvironmentVocabulary() {
  const value = 'CCGATEWAYVALUE', was = 'CCGATEWAYWAS', path = '/CCGATEWAYDIR/ca.pem';
  const unexpected = () => { throw Error('Unexpected native environment wording'); };
  const around = (text, marker) => { const parts = text.split(marker); return parts.length === 2 ? parts : unexpected(); };
  const only = list => list.length === 1 ? list[0] : unexpected();
  const bullets = text => text.split('\n').filter(line => line.startsWith(' - ')).map(line => line.slice(3));
  const label = (text, marker) => around(only(bullets(text).filter(line => line.includes(marker))), marker)[0];
  const withdrawn = (snapshot, field) => only(bullets(Kkt(snapshot, [{ field }])));
  const base = { workingDirectory: value + 'P', isWorktree: false, isGitRepo: true, additionalWorkingDirectories: [value + 'A'],
    platform: value + 'L', shell: value + 'S', osVersion: value + 'O' };
  const full = _oo(base), lines = full.split('\n'), listed = lines.indexOf('  - ' + value + 'A');
  if (listed < 1 || !lines[listed - 1].startsWith(' - ')) unexpected();
  const notGit = bullets(_oo({ ...base, isGitRepo: false }));
  const git = only(bullets(full).filter(line => !notGit.includes(line)));
  if (!git.endsWith('true')) unexpected();
  const primary = label(full, value + 'P');
  // The proxy line has a variable CA path, an optional README clause between
  // its middle and end, and an optional list of preconfigured CLIs.
  const proxy = (hasReadme, installedClis) => xNe({ caBundlePath: path, hasReadme, installedClis });
  const plain = proxy(false, []), readme = proxy(true, []);
  const [start] = around(plain, path);
  let common = 0;
  while (common < plain.length && plain[common] === readme[common]) common++;
  const end = plain.slice(common);
  if (!readme.endsWith(end) || common <= start.length + path.length) unexpected();
  return {
    heading: PNe, intro: ooo, updateHeading: roo,
    labels: {
      primary_directory: primary,
      git_repository: git.slice(0, -'true'.length),
      additional_directories: lines[listed - 1].slice(3),
      platform_name: label(full, value + 'L'), shell: label(full, value + 'S'), os_version: label(full, value + 'O'),
    },
    was: around(around(only(bullets(Kkt(base, [{ field: 'workingDirectory', from: was }]))), primary + value + 'P')[1], was),
    additionalChanged: bullets(Kkt(base, [{ field: 'additionalWorkingDirectories', added: [value + '1'], removed: [value + '2'] }])),
    worktree: jkt, stash: Ukt,
    withdrawal: {
      primary_directory: withdrawn({ ...base, workingDirectory: undefined }, 'workingDirectory'),
      worktree: withdrawn(base, 'isWorktree'),
      scratchpad_directory: withdrawn(base, 'scratchpadDirectory'),
      github_cli: withdrawn(base, 'githubCli'),
      agent_proxy: withdrawn(base, 'agentProxy'),
    },
    scratchpad: around(Gkt(value), value),
    github: [...new Set(Array.from({ length: 16 }, (_, bits) =>
      ANe(iys({ enterprise: (bits & 1) > 0, anyHost: (bits & 2) > 0, noJq: (bits & 4) > 0, runner: (bits & 8) > 0 }))))],
    githubReplaces: aoo,
    proxy: {
      start, middle: plain.slice(start.length + path.length, common), end,
      readme: around(readme.slice(common, readme.length - end.length), guo(path)),
      clis: around(proxy(false, [value]).slice(plain.length), value),
    },
  };
}

// The pieces build adds to a request that is not Claude Code's
// (request-build.js injectLayers). The system prompt is the one the
// non-interactive main thread sends (xh): the default prompt for the tools it
// will carry (wx) through r1e, which adds the tool-dependent sections, and the
// appended prompt (the client's own system, as --append-system-prompt) after
// it, past the dynamic boundary. The client's blocks are joined as the CLI
// joins two appended prompts (ccgatewayJoinAppend, its own pr). The
// attachments are the ones CC sends on a session's first turn, made by the
// same native producers as eIr and the query loop: the environment snapshot
// (Wkt, as Dvn), the model identity (eSt, as Lvn), the token budget (JDr) and
// the date (POo, as the date attachment of the query loop). They are rendered
// and placed by the native message pipeline, never here.
export const ccgatewayDefaultPrompt = async (tools, model, appended) => {
  const append = appended.reduce((joined, text) => ccgatewayJoinAppend(joined, text), undefined);
  return ki([...r1e(await wx(tools, model), { tools, memoryMechanicsPrompt: null, appendSystemPrompt: void 0 }), ...append ? [append] : []]);
};
// The permission context a fresh non-interactive session starts with.
export const ccgatewayPermissionContext = () => gd();
export async function ccgatewayLayerAttachments(kinds, { model, workingDirectory, additionalWorkingDirectories, records, session }) {
  const wanted = new Set(kinds), out = [];
  if (wanted.has('environment')) out.push({ type: 'environment', snapshot: await Wkt({ cwd: workingDirectory, additionalWorkingDirectories }) });
  if (wanted.has('model')) out.push(await eSt(Jkt(ah({ permissionMode: 'default', mainLoopModel: model, exceeds200kTokens: false }))));
  // A session's first turn: the main thread, without a task budget.
  if (wanted.has('total_tokens')) out.push(...JDr(session, records, model, void 0, false, void 0, false));
  if (wanted.has('date')) out.push({ type: 'date', date: ccgDate() });
  return out;
}

// ccgatewayMarkTurns gives a main thread's records what Claude Code's query
// loop gives each prompt (iws, h0n): its origin, and its position counted from
// the prompt before it. PAs writes the last prompt's as cc_turn_origin,
// cc_prompt_index and cc_turn_index. interactive is the terminal (cli, a human
// typing); otherwise the prompt comes from the SDK. Returns the last prompt's
// record (a3e), or undefined.
export function ccgatewayMarkTurns(records, interactive) {
  const origin = iws(interactive ? { origin: { kind: 'human' } } : { promptSource: 'sdk' });
  records.forEach((row, at) => {
    if (row?.type !== 'user' || !pde(row)) return;
    row.turnOrigin = origin;
    const position = h0n(records.slice(0, at), origin);
    if (position !== undefined) row.turnPosition = position;
  });
  const last = a3e(records);
  return last === -1 ? undefined : records[last];
}
// ccgatewayPromptTurn is the same for a Messages body (direct): its messages
// as CC's records, and the last prompt's origin and position.
export function ccgatewayPromptTurn(messages, interactive) {
  const records = messages.filter(message => message?.role === 'user' || message?.role === 'assistant')
    .map(message => ({ type: message.role, message: { ...message, content: typeof message.content === 'string' || Array.isArray(message.content) ? message.content : [] } }));
  const last = ccgatewayMarkTurns(records, interactive);
  return last && { turnOrigin: last.turnOrigin, turnPosition: last.turnPosition };
}

// ccgatewayLayerVocabulary is how build tells that a request already carries
// a layer, in CC's own wording: each attachment's opening, rendered by its
// native renderer with a marker value (the environment heading and intro, the
// model identity in both its wordings, the token budget, the date and its
// change notice); the security paragraph every main-thread system prompt
// carries (p4n); and the client loop headers CC sends as they are.
export function ccgatewayLayerVocabulary() {
  const mark = 'CCGATEWAYMARK7';
  const before = text => { const at = text.indexOf(mark); if (at <= 0) throw Error('Unexpected native attachment wording'); return text.slice(0, at); };
  // What two renderings share before their values differ.
  const common = (a, b) => { let at = 0; while (at < a.length && a[at] === b[at]) at++; if (!at) throw Error('Unexpected native attachment wording'); return a.slice(0, at); };
  // The environment's opening is what zkt renders ahead of the field lines.
  const snapshot = { platform: mark, additionalWorkingDirectories: [] }, environment = zkt(snapshot), fields = _oo(snapshot);
  if (!environment.endsWith(fields) || environment.length === fields.length) throw Error('Unexpected native attachment wording');
  return {
    attachments: {
      environment: [environment.slice(0, -fields.length).trimEnd()],
      model: [before(Eoo({ modelId: mark })), before(RBs({ modelId: mark }))],
      total_tokens: [common(u7t('countdown', 1), u7t('countdown', 2))],
      date: [before(fSt({ date: mark })), before(fSt({ date: mark, changed: true }))],
    },
    systemPrompt: p4n,
    loopHeaders: { prev_tool_durations: m4t, cc_compaction_request: c4t, claude_code_compaction: f4t, cc_context_compacted: u4t, claude_code_context_compacted: p4t },
  };
}
