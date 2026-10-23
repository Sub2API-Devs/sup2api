// Inserted only into the independently hash-bound 2.1.304 core module.
// All readers and renderers below are native bindings verified for that build.
export async function ccgatewayEnvironment(context, selected) {
  const wanted = new Set(selected);
  const unavailableFields = [];
  const override = cle();
  if (override !== undefined) {
    let proxy = null;
    if (wanted.has('agent_proxy')) {
      try { proxy = l1(override) ? ule(override) : foo(); }
      catch { unavailableFields.push('agent_proxy'); }
    }
    return {
      text: zkt({ ...override, ccgatewayProxyText: proxy }),
      fieldText: { agent_proxy: proxy },
      unavailableFields,
    };
  }
  const snapshot = {
    platform: a.platform, additionalWorkingDirectories: [],
    ccgatewayProxyText: null,
  };
  async function read(field, key, reader) {
    if (!wanted.has(field)) return;
    try { snapshot[key] = await reader(); }
    catch { unavailableFields.push(field); }
  }
  if (['primary_directory', 'git_repository', 'worktree'].some(field => wanted.has(field))) {
    snapshot.workingDirectory = context.workingDirectory;
    snapshot.isGitRepo = false;
    snapshot.isWorktree = false;
  }
  await read('git_repository', 'isGitRepo', () => gH());
  await read('worktree', 'isWorktree', () => Cl() !== null || hK(context.workingDirectory));
  await read('additional_directories', 'additionalWorkingDirectories', () => [...context.additionalWorkingDirectories]);
  await read('shell', 'shell', () => uoo());
  await read('os_version', 'osVersion', () => poo());
  await read('scratchpad_directory', 'scratchpadDirectory', () => moo());
  await read('github_cli', 'githubCli', () => Nkt());
  await read('agent_proxy', 'ccgatewayProxyText', () => foo());
  return {
    text: zkt(snapshot),
    fieldText: { agent_proxy: snapshot.ccgatewayProxyText },
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
// (request-build-2.1.304.js injectLayers). The system prompt is the native
// main thread's: the default prompt for the tools it will carry (wx) through
// r1e, which adds the tool-dependent sections and puts an appended prompt (the
// client's own system, as --append-system-prompt) after the dynamic boundary.
// The attachments are the ones CC sends on a session's first turn, made by the
// same native producers as eIr and the query loop: the environment snapshot
// (Wkt, as Dvn), the model identity (eSt, as Lvn), the token budget (u7t, as
// JDr) and the date (POo, as the date attachment of the query loop). They are
// rendered and placed by the native message pipeline, never here.
export const ccgatewayDefaultPrompt = async (tools, model, appendSystemPrompt) => ki(r1e(await wx(tools, model), { tools, appendSystemPrompt }));
export async function ccgatewayLayerAttachments(kinds, { model, workingDirectory, additionalWorkingDirectories, records }) {
  const wanted = new Set(kinds), out = [];
  if (wanted.has('environment')) out.push({ type: 'environment', snapshot: await Wkt({ cwd: workingDirectory, additionalWorkingDirectories }) });
  if (wanted.has('model')) out.push(await eSt(Jkt(ah({ permissionMode: 'default', mainLoopModel: model, exceeds200kTokens: false }))));
  if (wanted.has('total_tokens')) {
    const mode = DJ(model, void 0);
    // A new session's countdown: the context window (countdown) or the
    // session budget (padded-countdown) less what the records already used.
    if (mode !== 'off') out.push({ type: 'total_tokens_reminder', text: u7t(mode, (mode === 'countdown' ? bm(model, Of()) : mode === 'padded-countdown' ? NJ() : 0) - DZ(records)) });
  }
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
  return {
    attachments: {
      environment: [PNe + '\n' + ooo.trimEnd()],
      model: [before(Eoo({ modelId: mark })), before(RBs({ modelId: mark }))],
      total_tokens: [before(u7t('countdown', 0).replace('0', mark))],
      date: [before(fSt({ date: mark })), before(fSt({ date: mark, changed: true }))],
    },
    systemPrompt: p4n,
    loopHeaders: { prev_tool_durations: m4t, cc_compaction_request: c4t, claude_code_compaction: f4t, cc_context_compacted: u4t, claude_code_context_compacted: p4t },
  };
}
