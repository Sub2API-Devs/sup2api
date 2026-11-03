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
  resolveAgentsMdMode,
  instructionModeLabel,
  DEFAULT_AGENTS_MD_MODE,
  isProjectLocalMcpSource,
  isClaudeMdAtDir,
  CLAUDE_MD_FILENAMES,
  AGENTS_MD_FILENAMES,
  dedupeInstructionFiles,
  flattenProjectInstructionParts,
  insertAgentsMdFiles,
  CLAUDE_MD_RESET_EVENTS,
  appendInstructionParts,
  resolveIncludePath,
  isPathUnder,
  excludeDirs,
  isSamePathEntry,
} from "./agentsMdFiles.js";
import { isMcpServerFromProjectOrLocalSettings } from "../../../services/mcp/headersHelper.js";

//@ chunk-8jbcmznm.js:5228-5433 placement
var PLUGIN_DESCRIPTION =
  "AGENTS.md as project instructions: by default loaded where the project has no CLAUDE.md; by its instructionFiles option, loaded beside CLAUDE.md, left out, or with the project instructions dropped";
//@ chunk-8jbcmznm.js:5433-5523 placement = isEnvTruthy (1)
/**
 * 1/true/yes/on
 */
var TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
var isSwitchedOn = (e) => e !== undefined && TRUTHY_ENV_VALUES.has(e.trim().toLowerCase());
//@ chunk-8jbcmznm.js:5523-5541 placement
var FEATURE_NAME = "agents_md";
//@ chunk-8jbcmznm.js:5541-5737 placement
function loadCountsOf(e, isYielded, isWalkFailed) {
  let reduced = e.reduce((acc, s) => acc + (s.parent === undefined ? 0 : 1), 0);
  return {
    fileCount: e.length - reduced,
    importCount: reduced,
    totalContentLength: e.reduce((acc, s) => acc + s.content.length, 0),
    isYielded,
    isWalkFailed,
  };
}
//@ chunk-8jbcmznm.js:5737-5760 placement
var LOAD_EVENT = "agents_md_load";
//@ chunk-8jbcmznm.js:5760-5780 placement
var WALK_FAILED_REASON = "walk_failed";
//@ chunk-8jbcmznm.js:5780-5860 placement
var loadMarkOf = (countsOf) =>
  countsOf.isWalkFailed
    ? {
        feature: FEATURE_NAME,
        kind: "sad",
        reason: WALK_FAILED_REASON,
      }
    : {
        feature: FEATURE_NAME,
        kind: "ok",
      };
//@ chunk-8jbcmznm.js:5860-5890 placement
var modeChoiceOf = (value) => ({
  value,
  of: AGENTS_MD_MODES,
});
//@ chunk-8jbcmznm.js:5890-6073 placement
var loadRowOf = (e, countsOf) => ({
  event: LOAD_EVENT,
  props: {
    mode: modeChoiceOf(e),
    file_count: countsOf.fileCount,
    import_count: countsOf.importCount,
    total_content_length: countsOf.totalContentLength,
    yielded: countsOf.isYielded,
    walk_failed: countsOf.isWalkFailed,
  },
});
//@ chunk-8jbcmznm.js:6073-6096 placement
var MODE_EVENT = "agents_md_mode";
//@ chunk-8jbcmznm.js:6096-6157 placement
var modeRowOf = (e, isInteractive) => ({
  event: MODE_EVENT,
  props: {
    mode: modeChoiceOf(e),
    is_interactive: isInteractive,
  },
});
//@ chunk-8jbcmznm.js:6157-6182 placement
var NESTED_EVENT = "agents_md_nested";
//@ chunk-8jbcmznm.js:6182-6239 placement
var nestedRowOf = (mode, fileCount) => ({
  event: NESTED_EVENT,
  props: {
    mode: modeChoiceOf(mode),
    file_count: fileCount,
  },
});
//@ chunk-8jbcmznm.js:6239-6298 placement
var quietly = (e) => {
  Promise.resolve()
    .then(e)
    .catch(() => {
      return;
    });
};
//@ chunk-8jbcmznm.js:6298-6404 placement = isFileReadDenied (0.778)
function holdPending(e, loop, o) {
  let i = e.pending.get(loop) ?? new Map();
  e.pending.set(loop, i);
  for (let f of o) i.set(f.path, "read");
}
//@ chunk-8jbcmznm.js:6404-6440 placement
var PENDING_STAGES = ["read", "submitted", "riding"];
//@ chunk-8jbcmznm.js:6440-6457 placement
var RIDING = ["riding"];
//@ chunk-8jbcmznm.js:6457-6591 placement
function takeBack(e, t, o) {
  let i = e.pending.get(t);
  let f = e.given.get(t);
  for (let [s, y] of i ?? [])
    if (o === undefined || o.includes(y)) {
      f?.delete(s);
      i?.delete(s);
    }
}
//@ chunk-8jbcmznm.js:6591-6775 placement
function settlePending(e, t, o) {
  let i = e.pending.get(t);
  let s = [...(i?.values() ?? [])].includes("riding") ? RIDING : undefined;
  if (o.isAborted) takeBack(e, t, s);
  for (let [y, h] of [...(i ?? [])]) if (s === undefined || s.includes(h)) i?.delete(y);
}
//@ chunk-8jbcmznm.js:6775-6886 placement
function stagePending(e, t, o) {
  let i = e.pending.get(t);
  let index = PENDING_STAGES.indexOf(o);
  for (let [s, y] of [...(i ?? [])]) if (PENDING_STAGES.indexOf(y) < index) i?.set(s, o);
}
//@ chunk-8jbcmznm.js:6886-6974 placement
function startOver(e) {
  e.given.clear();
  for (let [t, o] of e.pending) e.given.set(t, new Set(o.keys()));
}
//@ chunk-8jbcmznm.js:6974-7071 placement
var touchedOf = (path, t, road) => ({
  path,
  road,
  loop: t.agentId ?? MAIN_THREAD,
  isWhole: t.offset === undefined && t.limit === undefined,
});
//@ chunk-8jbcmznm.js:7071-7228 placement
var walkOf = (e) => ({
  mode: e,
  isFallback: e === "claude-md-or-agents-md",
  given: new Map(),
  pending: new Map(),
  inContext: [],
  home: undefined,
  isClaudeProject: undefined,
  rootSeen: undefined,
});
//@ chunk-8jbcmznm.js:7228-7242 placement
/**
 * agentsMd 插件里使用的空数组与空对象占位。
 */
var EMPTY_LIST = [];
var EMPTY_OBJECT = {};
//@ chunk-8jbcmznm.js:7242-10262 placement
/**
 * 在 session.start 时把 AGENTS.md 作为项目指令加载。
 */
function loadAgentsMdInstructions(e, t) {
  let agentsMdMode = resolveAgentsMdMode(t.instructionFiles);
  let i = instructionModeLabel(t.projectInstructions);
  let f = i !== undefined && agentsMdMode === DEFAULT_AGENTS_MD_MODE;
  let s = f ? i : agentsMdMode;
  let y = i === undefined;
  let h = s !== "claude-md" && s !== "managed-only";
  let deferred = Promise.withResolvers();
  let T = false;
  e("session.start", (d, r, a) => {
    T = true;
    quietly(async () => {
      let n = EMPTY_OBJECT;
      try {
        let m = r.isInteractive ? EMPTY_OBJECT : await getUsageRowsDedupKey(d, s);
        let { key, noted } = m;
        let P =
          key !== undefined && typeof noted === "string" && (noted === key || noted.startsWith(`${key} `));
        if (!P) await d.telemetry.log(modeRowOf(s, r.isInteractive));
        n = m;
        if (!P && !h && key !== undefined) await d.store.set("usage-rows-queued", key);
      } finally {
        deferred.resolve(n);
      }
    });
    if (!y) {
      y = true;
      d.ui.log(
        f
          ? `option projectInstructions in settings is honoured for now, read as instructionFiles ${s}; set instructionFiles to ${s} and remove projectInstructions`
          : `option projectInstructions in settings is not read: instructionFiles ${s} is set; remove projectInstructions`,
      );
    }
    return a(r);
  });
  if (s === "claude-md") return;
  if (s === "managed-only") {
    e(
      "prompt.context",
      {
        instructionFiles: {
          kind: isMcpServerFromProjectOrLocalSettings,
        },
      },
      (d, r, a) =>
        a({
          ...r,
          instructionFiles: r.instructionFiles?.filter(isProjectLocalMcpSource),
        }),
    );
    return;
  }
  let p = walkOf(s);
  let { isFallback, given } = p;
  let N;
  let c = false;
  e("prompt.context", async (d, r, a) => {
    let instructionFiles = r.instructionFiles;
    if (instructionFiles === undefined)
      return a(r).finally(() => {
        startOver(p);
      });
    let m = isFallback ? await d.session.root() : undefined;
    p.rootSeen = m ?? p.rootSeen;
    let isWalkFailed = false;
    let u =
      m !== undefined &&
      (instructionFiles.some((instructionFile) => isClaudeMdAtDir(instructionFile, m)) ||
        (await d.fs
          .ancestors({
            names: CLAUDE_MD_FILENAMES,
          })
          .then(
            (g) => g.length > 0,
            () => {
              isWalkFailed = true;
              return true;
            },
          )));
    p.isClaudeProject = u;
    let P = u
      ? EMPTY_LIST
      : await d.fs
          .ancestors({
            names: AGENTS_MD_FILENAMES,
          })
          .catch(() => {
            isWalkFailed = true;
            return EMPTY_LIST;
          });
    let L = dedupeInstructionFiles(flattenProjectInstructionParts(P), instructionFiles);
    if (!c) {
      c = true;
      let countsOf = loadCountsOf(L, u && !isWalkFailed, isWalkFailed);
      quietly(async () => {
        let { key, noted } = await deferred.promise;
        let markOf = loadMarkOf(countsOf);
        let M = key && `${key} ${markOf.kind}`;
        if (M !== undefined && noted === M) return;
        await Promise.all([d.telemetry.log(loadRowOf(s, countsOf)), d.telemetry.mark(markOf)]);
        if (M !== undefined) await d.store.set("usage-rows-queued", M);
      });
    }
    if (m !== undefined && m !== N && L.length > 0) {
      N = m;
      d.ui.log(
        "no CLAUDE.md found; AGENTS.md loaded: " +
          L.filter((g) => g.parent === undefined)
            .map((g) => g.path)
            .join(", "),
        {
          to: "debug",
        },
      );
    }
    let Y = insertAgentsMdFiles(instructionFiles, L);
    return a({
      ...r,
      instructionFiles: Y,
    }).finally(() => {
      startOver(p);
      p.inContext = Y;
    });
  });
  e(
    "command.run",
    {
      command: CLAUDE_MD_RESET_EVENTS,
    },
    async (d, r, a) => {
      let n = await a(r);
      given.clear();
      p.pending.clear();
      return n;
    },
  );
  e("session.compact", async (d, r, a) => {
    let n = await a(r);
    if (n.skip === undefined) takeBack(p, r.agentId ?? MAIN_THREAD);
    return n;
  });
  e("prompt.submit", (d, r, a) => {
    takeBack(p, MAIN_THREAD, ["submitted"]);
    stagePending(p, MAIN_THREAD, "submitted");
    return a(r);
  });
  e("turn.start", (d, r, a) => {
    if (!T) deferred.resolve(EMPTY_OBJECT);
    if (r.agentId === undefined) stagePending(p, MAIN_THREAD, "riding");
    return a(r);
  });
  e("turn.complete", (d, r, a) => {
    settlePending(p, r.agentId ?? MAIN_THREAD, r);
    return a(r);
  });
  e(
    "agent.spawn",
    {
      fork: true,
    },
    async (d, r, a) => {
      let n = await a(r);
      if (r.resume === undefined && n.agentId !== undefined) {
        let m = given.get(r.parentAgentId ?? MAIN_THREAD);
        let l = given.get(n.agentId);
        given.set(n.agentId, new Set([...(m ?? []), ...(l ?? [])]));
      }
      return n;
    },
  );
  e(
    "tool.call",
    {
      tool: "Read",
    },
    async (d, r, a) => {
      let n = await a(r);
      if (r.tool !== "Read" || n.deny !== undefined || n.isError) return n;
      let l = touchedOf(r.file_path, r, "read");
      let u = await agentsMdForMention(d, l, p);
      return u.length > 0
        ? {
            ...n,
            context: appendInstructionParts(n.context, u),
          }
        : n;
    },
  );
  e("prompt.mention", async (d, r, a) => {
    let n = await a(r);
    let m = touchedOf(r.path, r, "mention");
    takeBack(p, m.loop, ["submitted"]);
    if (n.deny !== undefined || n.type === "pdf_reference") return n;
    let u = await agentsMdForMention(d, m, p);
    return u.length > 0
      ? {
          ...n,
          context: appendInstructionParts(n.context, u),
        }
      : n;
  });
}
//@ chunk-8jbcmznm.js:10262-11156 placement
async function agentsMdForMention(e, t, o) {
  if (!(await isAgentsMdAttachmentEnabled(e))) return [];
  let [i, f] = await Promise.all([e.session.root(), e.session.cwd()]);
  o.home ??= await getHomeDir(e, f);
  let includePath = resolveIncludePath(t.path, f, o.home);
  if (i !== o.rootSeen) {
    o.rootSeen = i;
    o.isClaudeProject = undefined;
    o.given.clear();
    o.pending.clear();
  }
  o.isClaudeProject ??=
    o.isFallback &&
    (
      await e.fs.ancestors({
        names: CLAUDE_MD_FILENAMES,
      })
    ).length > 0;
  if (o.isClaudeProject || !isPathUnder(includePath, i)) return [];
  let [h, O] = await Promise.all([
    e.fs.ancestors({
      names: AGENTS_MD_FILENAMES,
      of: includePath,
      below: i,
    }),
    e.fs.ancestors({
      names: CLAUDE_MD_FILENAMES,
      of: includePath,
      below: i,
    }),
  ]).catch(() => [EMPTY_LIST, EMPTY_LIST]);
  let T = o.given.get(t.loop) ?? new Set();
  o.given.set(t.loop, T);
  let filtered = (o.isFallback ? excludeDirs(h, O) : h).filter((c) => isPathUnder(c.dir, i));
  let filtered_2 = dedupeInstructionFiles(flattenProjectInstructionParts(filtered), [
    ...o.inContext,
    ...flattenProjectInstructionParts(O),
  ]).filter((c) => !T.has(c.path));
  let filtered_3 = filtered_2.filter((c) => !isSamePathEntry(c, includePath));
  let filtered_4 = filtered_2.filter(
    (c) => filtered_3.includes(c) || (isSamePathEntry(c, includePath) && t.isWhole),
  );
  for (let c of filtered_4) T.add(c.path);
  if (t.road === "mention") holdPending(o, t.loop, filtered_4);
  if (filtered_3.length > 0) quietly(() => e.telemetry.log(nestedRowOf(o.mode, filtered_3.length)));
  return filtered_3;
}
//@ chunk-8jbcmznm.js:11156-11303 placement
/**
 * CLAUDE_CODE_SIMPLE 与 CLAUDE_CODE_DISABLE_ATTACHMENTS 都未开启时为 true。
 */
async function isAgentsMdAttachmentEnabled(e) {
  let [t, o] = await Promise.all([
    e.env.get("CLAUDE_CODE_SIMPLE"),
    e.env.get("CLAUDE_CODE_DISABLE_ATTACHMENTS"),
  ]);
  return !isSwitchedOn(t) && !isSwitchedOn(o);
}
//@ chunk-8jbcmznm.js:11303-11647 placement
/**
 * 用量行去重键（会话 id + 名字）；设置 CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS 或读取失败时每个进程都发送。
 */
async function getUsageRowsDedupKey(e, t) {
  try {
    return isSwitchedOn(await e.env.get("CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS"))
      ? EMPTY_OBJECT
      : {
          key: `${await e.session.id()} ${t}`,
          noted: await e.store.get("usage-rows-queued"),
        };
  } catch (error) {
    e.ui.log(
      `AGENTS.md usage rows: could not read whether this session already sent them, so this process sends them (${String(error)})`,
      {
        to: "debug",
      },
    );
    return EMPTY_OBJECT;
  }
}
//@ chunk-8jbcmznm.js:11647-11777 placement
/**
 * 取 HOME 或 USERPROFILE（路径含反斜杠时优先 USERPROFILE）。
 */
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
