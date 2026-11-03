/**
 * plugins/bundled/agentsMd/agentsMd.ts
 *
 * 2.1.316 新增。内置插件：把 AGENTS.md 作为项目指令加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8jbcmznm.js (29)
 * attribution: placement 29
 */
import {
  AGENTS_MD_MODES,
  MAIN_THREAD,
  T$s,
  k$s,
  DEFAULT_AGENTS_MD_MODE,
  v$s,
  isClaudeMdAtDir,
  CLAUDE_MD_FILENAMES,
  AGENTS_MD_FILENAMES,
  dedupeInstructionFiles,
  flattenProjectInstructionParts,
  insertAgentsMdFiles,
  E$s,
  hAo,
  resolveIncludePath,
  iGn,
  excludeDirs,
  mAo,
} from "./agentsMdFiles.js";
import { isMcpServerFromProjectOrLocalSettings } from "../../../services/mcp/headersHelper.js";

//@ chunk-8jbcmznm.js:5228-5433 placement
var PLUGIN_DESCRIPTION =
  "AGENTS.md as project instructions: by default loaded where the project has no CLAUDE.md; by its instructionFiles option, loaded beside CLAUDE.md, left out, or with the project instructions dropped";
//@ chunk-8jbcmznm.js:5433-5523 placement = isEnvTruthy (1)
var ce = new Set(["1", "true", "yes", "on"]),
  isSwitchedOn = (e) => e !== void 0 && ce.has(e.trim().toLowerCase());
//@ chunk-8jbcmznm.js:5523-5541 placement
var FEATURE_NAME = "agents_md";
//@ chunk-8jbcmznm.js:5541-5737 placement
function loadCountsOf(e, t, o) {
  let reduced = e.reduce((f, s) => f + (s.parent === void 0 ? 0 : 1), 0);
  return {
    fileCount: e.length - reduced,
    importCount: reduced,
    totalContentLength: e.reduce((f, s) => f + s.content.length, 0),
    isYielded: t,
    isWalkFailed: o,
  };
}
//@ chunk-8jbcmznm.js:5737-5760 placement
var LOAD_EVENT = "agents_md_load";
//@ chunk-8jbcmznm.js:5760-5780 placement
var WALK_FAILED_REASON = "walk_failed";
//@ chunk-8jbcmznm.js:5780-5860 placement
var loadMarkOf = (e) =>
  e.isWalkFailed
    ? { feature: FEATURE_NAME, kind: "sad", reason: WALK_FAILED_REASON }
    : { feature: FEATURE_NAME, kind: "ok" };
//@ chunk-8jbcmznm.js:5860-5890 placement
var modeChoiceOf = (e) => ({ value: e, of: AGENTS_MD_MODES });
//@ chunk-8jbcmznm.js:5890-6073 placement
var loadRowOf = (e, t) => ({
  event: LOAD_EVENT,
  props: {
    mode: modeChoiceOf(e),
    file_count: t.fileCount,
    import_count: t.importCount,
    total_content_length: t.totalContentLength,
    yielded: t.isYielded,
    walk_failed: t.isWalkFailed,
  },
});
//@ chunk-8jbcmznm.js:6073-6096 placement
var MODE_EVENT = "agents_md_mode";
//@ chunk-8jbcmznm.js:6096-6157 placement
var modeRowOf = (e, t) => ({ event: MODE_EVENT, props: { mode: modeChoiceOf(e), is_interactive: t } });
//@ chunk-8jbcmznm.js:6157-6182 placement
var NESTED_EVENT = "agents_md_nested";
//@ chunk-8jbcmznm.js:6182-6239 placement
var nestedRowOf = (e, t) => ({ event: NESTED_EVENT, props: { mode: modeChoiceOf(e), file_count: t } });
//@ chunk-8jbcmznm.js:6239-6298 placement
var quietly = (e) => {
  Promise.resolve()
    .then(e)
    .catch(() => {
      return;
    });
};
//@ chunk-8jbcmznm.js:6298-6404 placement = isFileReadDenied (0.778)
function holdPending(e, t, o) {
  let i = e.pending.get(t) ?? new Map();
  e.pending.set(t, i);
  for (let f of o) i.set(f.path, "read");
}
//@ chunk-8jbcmznm.js:6404-6440 placement
var PENDING_STAGES = ["read", "submitted", "riding"];
//@ chunk-8jbcmznm.js:6440-6457 placement
var RIDING = ["riding"];
//@ chunk-8jbcmznm.js:6457-6591 placement
function takeBack(e, t, o) {
  let i = e.pending.get(t),
    f = e.given.get(t);
  for (let [s, y] of i ?? []) if (o === void 0 || o.includes(y)) (f?.delete(s), i?.delete(s));
}
//@ chunk-8jbcmznm.js:6591-6775 placement
function settlePending(e, t, o) {
  let i = e.pending.get(t),
    s = [...(i?.values() ?? [])].includes("riding") ? RIDING : void 0;
  if (o.isAborted) takeBack(e, t, s);
  for (let [y, h] of [...(i ?? [])]) if (s === void 0 || s.includes(h)) i?.delete(y);
}
//@ chunk-8jbcmznm.js:6775-6886 placement
function stagePending(e, t, o) {
  let i = e.pending.get(t),
    index = PENDING_STAGES.indexOf(o);
  for (let [s, y] of [...(i ?? [])]) if (PENDING_STAGES.indexOf(y) < index) i?.set(s, o);
}
//@ chunk-8jbcmznm.js:6886-6974 placement
function startOver(e) {
  e.given.clear();
  for (let [t, o] of e.pending) e.given.set(t, new Set(o.keys()));
}
//@ chunk-8jbcmznm.js:6974-7071 placement
var touchedOf = (e, t, o) => ({
  path: e,
  road: o,
  loop: t.agentId ?? MAIN_THREAD,
  isWhole: t.offset === void 0 && t.limit === void 0,
});
//@ chunk-8jbcmznm.js:7071-7228 placement
var walkOf = (e) => ({
  mode: e,
  isFallback: e === "claude-md-or-agents-md",
  given: new Map(),
  pending: new Map(),
  inContext: [],
  home: void 0,
  isClaudeProject: void 0,
  rootSeen: void 0,
});
//@ chunk-8jbcmznm.js:7228-7242 placement
var v = [],
  A = {};
/**
 * 在 session.start 时把 AGENTS.md 作为项目指令加载。
 */
//@ chunk-8jbcmznm.js:7242-10262 placement
function loadAgentsMdInstructions(e, t) {
  let o = T$s(t.instructionFiles),
    i = k$s(t.projectInstructions),
    f = i !== void 0 && o === DEFAULT_AGENTS_MD_MODE,
    s = f ? i : o,
    y = i === void 0,
    h = s !== "claude-md" && s !== "managed-only",
    withResolvers = Promise.withResolvers(),
    T = !1;
  if (
    (e("session.start", (d, r, a) => {
      if (
        ((T = !0),
        quietly(async () => {
          let n = A;
          try {
            let m = r.isInteractive ? A : await getUsageRowsDedupKey(d, s),
              { key: key, noted: noted } = m,
              P =
                key !== void 0 && typeof noted === "string" && (noted === key || noted.startsWith(`${key} `));
            if (!P) await d.telemetry.log(modeRowOf(s, r.isInteractive));
            if (((n = m), !P && !h && key !== void 0)) await d.store.set("usage-rows-queued", key);
          } finally {
            withResolvers.resolve(n);
          }
        }),
        !y)
      )
        ((y = !0),
          d.ui.log(
            f
              ? `option projectInstructions in settings is honoured for now, read as instructionFiles ${s}; set instructionFiles to ${s} and remove projectInstructions`
              : `option projectInstructions in settings is not read: instructionFiles ${s} is set; remove projectInstructions`,
          ));
      return a(r);
    }),
    s === "claude-md")
  )
    return;
  if (s === "managed-only") {
    e("prompt.context", { instructionFiles: { kind: isMcpServerFromProjectOrLocalSettings } }, (d, r, a) =>
      a({ ...r, instructionFiles: r.instructionFiles?.filter(v$s) }),
    );
    return;
  }
  let p = walkOf(s),
    { isFallback: isFallback, given: given } = p,
    N,
    c = !1;
  (e("prompt.context", async (d, r, a) => {
    let instructionFiles = r.instructionFiles;
    if (instructionFiles === void 0)
      return a(r).finally(() => {
        startOver(p);
      });
    let m = isFallback ? await d.session.root() : void 0;
    p.rootSeen = m ?? p.rootSeen;
    let l = !1,
      u =
        m !== void 0 &&
        (instructionFiles.some((g) => isClaudeMdAtDir(g, m)) ||
          (await d.fs.ancestors({ names: CLAUDE_MD_FILENAMES }).then(
            (g) => g.length > 0,
            () => ((l = !0), !0),
          )));
    p.isClaudeProject = u;
    let P = u ? v : await d.fs.ancestors({ names: AGENTS_MD_FILENAMES }).catch(() => ((l = !0), v)),
      L = dedupeInstructionFiles(flattenProjectInstructionParts(P), instructionFiles);
    if (!c) {
      c = !0;
      let g = loadCountsOf(L, u && !l, l);
      quietly(async () => {
        let { key: key, noted: noted } = await withResolvers.promise,
          J = loadMarkOf(g),
          M = key && `${key} ${J.kind}`;
        if (M !== void 0 && noted === M) return;
        if ((await Promise.all([d.telemetry.log(loadRowOf(s, g)), d.telemetry.mark(J)]), M !== void 0))
          await d.store.set("usage-rows-queued", M);
      });
    }
    if (m !== void 0 && m !== N && L.length > 0)
      ((N = m),
        d.ui.log(
          "no CLAUDE.md found; AGENTS.md loaded: " +
            L.filter((g) => g.parent === void 0)
              .map((g) => g.path)
              .join(", "),
          { to: "debug" },
        ));
    let Y = insertAgentsMdFiles(instructionFiles, L);
    return a({ ...r, instructionFiles: Y }).finally(() => {
      (startOver(p), (p.inContext = Y));
    });
  }),
    e("command.run", { command: E$s }, async (d, r, a) => {
      let n = await a(r);
      return (given.clear(), p.pending.clear(), n);
    }),
    e("session.compact", async (d, r, a) => {
      let n = await a(r);
      if (n.skip === void 0) takeBack(p, r.agentId ?? MAIN_THREAD);
      return n;
    }),
    e(
      "prompt.submit",
      (d, r, a) => (takeBack(p, MAIN_THREAD, ["submitted"]), stagePending(p, MAIN_THREAD, "submitted"), a(r)),
    ),
    e("turn.start", (d, r, a) => {
      if (!T) withResolvers.resolve(A);
      if (r.agentId === void 0) stagePending(p, MAIN_THREAD, "riding");
      return a(r);
    }),
    e("turn.complete", (d, r, a) => (settlePending(p, r.agentId ?? MAIN_THREAD, r), a(r))),
    e("agent.spawn", { fork: !0 }, async (d, r, a) => {
      let n = await a(r);
      if (r.resume === void 0 && n.agentId !== void 0) {
        let m = given.get(r.parentAgentId ?? MAIN_THREAD),
          l = given.get(n.agentId);
        given.set(n.agentId, new Set([...(m ?? []), ...(l ?? [])]));
      }
      return n;
    }),
    e("tool.call", { tool: "Read" }, async (d, r, a) => {
      let n = await a(r);
      if (r.tool !== "Read" || n.deny !== void 0 || n.isError) return n;
      let l = touchedOf(r.file_path, r, "read"),
        u = await agentsMdForMention(d, l, p);
      return u.length > 0 ? { ...n, context: hAo(n.context, u) } : n;
    }),
    e("prompt.mention", async (d, r, a) => {
      let n = await a(r),
        m = touchedOf(r.path, r, "mention");
      if ((takeBack(p, m.loop, ["submitted"]), n.deny !== void 0 || n.type === "pdf_reference")) return n;
      let u = await agentsMdForMention(d, m, p);
      return u.length > 0 ? { ...n, context: hAo(n.context, u) } : n;
    }));
}
//@ chunk-8jbcmznm.js:10262-11156 placement
async function agentsMdForMention(e, t, o) {
  if (!(await isAgentsMdAttachmentEnabled(e))) return [];
  let [i, f] = await Promise.all([e.session.root(), e.session.cwd()]);
  o.home ??= await getHomeDir(e, f);
  let s = resolveIncludePath(t.path, f, o.home);
  if (i !== o.rootSeen) ((o.rootSeen = i), (o.isClaudeProject = void 0), o.given.clear(), o.pending.clear());
  if (
    ((o.isClaudeProject ??=
      o.isFallback && (await e.fs.ancestors({ names: CLAUDE_MD_FILENAMES })).length > 0),
    o.isClaudeProject || !iGn(s, i))
  )
    return [];
  let [h, O] = await Promise.all([
      e.fs.ancestors({ names: AGENTS_MD_FILENAMES, of: s, below: i }),
      e.fs.ancestors({ names: CLAUDE_MD_FILENAMES, of: s, below: i }),
    ]).catch(() => [v, v]),
    T = o.given.get(t.loop) ?? new Set();
  o.given.set(t.loop, T);
  let filtered = (o.isFallback ? excludeDirs(h, O) : h).filter((c) => iGn(c.dir, i)),
    filtered_2 = dedupeInstructionFiles(flattenProjectInstructionParts(filtered), [
      ...o.inContext,
      ...flattenProjectInstructionParts(O),
    ]).filter((c) => !T.has(c.path)),
    filtered_3 = filtered_2.filter((c) => !mAo(c, s)),
    filtered_4 = filtered_2.filter((c) => filtered_3.includes(c) || (mAo(c, s) && t.isWhole));
  for (let c of filtered_4) T.add(c.path);
  if (t.road === "mention") holdPending(o, t.loop, filtered_4);
  if (filtered_3.length > 0) quietly(() => e.telemetry.log(nestedRowOf(o.mode, filtered_3.length)));
  return filtered_3;
}
/**
 * CLAUDE_CODE_SIMPLE 与 CLAUDE_CODE_DISABLE_ATTACHMENTS 都未开启时为 true。
 */
//@ chunk-8jbcmznm.js:11156-11303 placement
async function isAgentsMdAttachmentEnabled(e) {
  let [t, o] = await Promise.all([
    e.env.get("CLAUDE_CODE_SIMPLE"),
    e.env.get("CLAUDE_CODE_DISABLE_ATTACHMENTS"),
  ]);
  return !isSwitchedOn(t) && !isSwitchedOn(o);
}
/**
 * 用量行去重键（会话 id + 名字）；设置 CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS 或读取失败时每个进程都发送。
 */
//@ chunk-8jbcmznm.js:11303-11647 placement
async function getUsageRowsDedupKey(e, t) {
  try {
    return isSwitchedOn(await e.env.get("CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS"))
      ? A
      : { key: `${await e.session.id()} ${t}`, noted: await e.store.get("usage-rows-queued") };
  } catch (error) {
    return (
      e.ui.log(
        `AGENTS.md usage rows: could not read whether this session already sent them, so this process sends them (${String(error)})`,
        { to: "debug" },
      ),
      A
    );
  }
}
/**
 * 取 HOME 或 USERPROFILE（路径含反斜杠时优先 USERPROFILE）。
 */
//@ chunk-8jbcmznm.js:11647-11777 placement
async function getHomeDir(e, t) {
  let [o, i] = await Promise.all([e.env.get("HOME"), e.env.get("USERPROFILE")]);
  return t.includes("\\") ? (i ?? o) : (o ?? i);
}

export {
  PLUGIN_DESCRIPTION,
  FEATURE_NAME,
  LOAD_EVENT,
  MODE_EVENT,
  NESTED_EVENT,
  PENDING_STAGES,
  RIDING,
  WALK_FAILED_REASON,
  holdPending,
  isSwitchedOn,
  loadCountsOf,
  loadMarkOf,
  loadRowOf,
  modeChoiceOf,
  modeRowOf,
  nestedRowOf,
  quietly,
  loadAgentsMdInstructions,
  settlePending,
  stagePending,
  startOver,
  takeBack,
  touchedOf,
  walkOf,
};
