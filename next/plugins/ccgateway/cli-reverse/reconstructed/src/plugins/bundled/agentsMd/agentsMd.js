/**
 * plugins/bundled/agentsMd/agentsMd.ts
 *
 * 2.1.316 新增。内置插件：把 AGENTS.md 作为项目指令加载。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pyd7te4t.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { MCP_SETTINGS_SCOPE_KINDS } from "../../../services/mcp/headersHelper.js";
import { beginDeferredInits, runDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./agentsMdFiles.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/plugins/bundled/agentsMd/agentsMdFiles.js");
//@ chunk-pyd7te4t.js:5536-5741 placement
var PLUGIN_DESCRIPTION =
  "AGENTS.md as project instructions: by default loaded where the project has no CLAUDE.md; by its instructionFiles option, loaded beside CLAUDE.md, left out, or with the project instructions dropped";
//@ chunk-pyd7te4t.js:5741-5831 placement (2.1.88 match: isEnvTruthy, 1)
/**
 * 1/true/yes/on
 */
var TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
var isSwitchedOn = (value) => value !== undefined && TRUTHY_ENV_VALUES.has(value.trim().toLowerCase());
//@ chunk-pyd7te4t.js:5831-5849 placement
var FEATURE_NAME = "agents_md";
//@ chunk-pyd7te4t.js:5849-6045 placement
function loadCountsOf(entries, isYielded, isWalkFailed) {
  let reduced = entries.reduce((acc, entry) => acc + (entry.parent === undefined ? 0 : 1), 0);
  return {
    fileCount: entries.length - reduced,
    importCount: reduced,
    totalContentLength: entries.reduce((acc, entry) => acc + entry.content.length, 0),
    isYielded,
    isWalkFailed,
  };
}
//@ chunk-pyd7te4t.js:6045-6068 placement
var LOAD_EVENT = "agents_md_load";
//@ chunk-pyd7te4t.js:6068-6088 placement
var WALK_FAILED_REASON = "walk_failed";
//@ chunk-pyd7te4t.js:6088-6168 placement
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
//@ chunk-pyd7te4t.js:6168-6198 placement
var modeChoiceOf = (value) => ({
  value,
  of: AGENTS_MD_MODES,
});
//@ chunk-pyd7te4t.js:6198-6381 placement
var loadRowOf = (state, countsOf) => ({
  event: LOAD_EVENT,
  props: {
    mode: modeChoiceOf(state),
    file_count: countsOf.fileCount,
    import_count: countsOf.importCount,
    total_content_length: countsOf.totalContentLength,
    yielded: countsOf.isYielded,
    walk_failed: countsOf.isWalkFailed,
  },
});
//@ chunk-pyd7te4t.js:6381-6404 placement
var MODE_EVENT = "agents_md_mode";
//@ chunk-pyd7te4t.js:6404-6465 placement
var modeRowOf = (state, isInteractive) => ({
  event: MODE_EVENT,
  props: {
    mode: modeChoiceOf(state),
    is_interactive: isInteractive,
  },
});
//@ chunk-pyd7te4t.js:6465-6490 placement
var NESTED_EVENT = "agents_md_nested";
//@ chunk-pyd7te4t.js:6490-6547 placement
var nestedRowOf = (mode, fileCount) => ({
  event: NESTED_EVENT,
  props: {
    mode: modeChoiceOf(mode),
    file_count: fileCount,
  },
});
//@ chunk-pyd7te4t.js:6547-6606 placement
var quietly = (fn) => {
  Promise.resolve()
    .then(fn)
    .catch(() => {
      return;
    });
};
//@ chunk-pyd7te4t.js:6606-6712 placement (2.1.88 match: isFileReadDenied, 0.78)
function holdPending(state, loop, files) {
  let byPath = state.pending.get(loop) ?? new Map();
  state.pending.set(loop, byPath);
  for (let file of files) byPath.set(file.path, "read");
}
//@ chunk-pyd7te4t.js:6712-6748 placement
var PENDING_STAGES = ["read", "submitted", "riding"];
//@ chunk-pyd7te4t.js:6748-6765 placement
var RIDING = ["riding"];
//@ chunk-pyd7te4t.js:6765-6899 placement
function takeBack(state, loop, stages) {
  let pendingByPath = state.pending.get(loop);
  let givenByPath = state.given.get(loop);
  for (let [filePath, stage] of pendingByPath ?? [])
    if (stages === undefined || stages.includes(stage)) {
      givenByPath?.delete(filePath);
      pendingByPath?.delete(filePath);
    }
}
//@ chunk-pyd7te4t.js:6899-7083 placement
function settlePending(state, loop, signal) {
  let pendingByPath = state.pending.get(loop);
  let stages = [...(pendingByPath?.values() ?? [])].includes("riding") ? RIDING : undefined;
  if (signal.isAborted) takeBack(state, loop, stages);
  for (let [filePath, stage] of [...(pendingByPath ?? [])])
    if (stages === undefined || stages.includes(stage)) pendingByPath?.delete(filePath);
}
//@ chunk-pyd7te4t.js:7083-7194 placement
function stagePending(state, loop, stage) {
  let pendingByPath = state.pending.get(loop);
  let index = PENDING_STAGES.indexOf(stage);
  for (let [filePath, currentStage] of [...(pendingByPath ?? [])])
    if (PENDING_STAGES.indexOf(currentStage) < index) pendingByPath?.set(filePath, stage);
}
//@ chunk-pyd7te4t.js:7194-7282 placement
function startOver(state) {
  state.given.clear();
  for (let [loop, stages] of state.pending) state.given.set(loop, new Set(stages.keys()));
}
//@ chunk-pyd7te4t.js:7282-7379 placement
var touchedOf = (path, touched, road) => ({
  path,
  road,
  loop: touched.agentId ?? MAIN_THREAD,
  isWhole: touched.offset === undefined && touched.limit === undefined,
});
//@ chunk-pyd7te4t.js:7379-7536 placement
var walkOf = (mode) => ({
  mode,
  isFallback: mode === "claude-md-or-agents-md",
  given: new Map(),
  pending: new Map(),
  inContext: [],
  home: undefined,
  isClaudeProject: undefined,
  rootSeen: undefined,
});
//@ chunk-pyd7te4t.js:7536-7550 placement
/**
 * agentsMd 插件里使用的空数组与空对象占位。
 */
var EMPTY_LIST = [];
var EMPTY_OBJECT = {};
//@ chunk-pyd7te4t.js:7550-10570 placement
/**
 * 在 session.start 时把 AGENTS.md 作为项目指令加载。
 */
function register(on, options) {
  let agentsMdMode = resolveAgentsMdMode(options.instructionFiles);
  let projectModeLabel = instructionModeLabel(options.projectInstructions);
  let projectModeOverrides = projectModeLabel !== undefined && agentsMdMode === DEFAULT_AGENTS_MD_MODE;
  let mode = projectModeOverrides ? projectModeLabel : agentsMdMode;
  let projectModeWarned = projectModeLabel === undefined;
  let sendsUsageRows = mode !== "claude-md" && mode !== "managed-only";
  let deferred = Promise.withResolvers();
  let sessionStarted = false;
  on("session.start", (ctx, payload, next) => {
    sessionStarted = true;
    quietly(async () => {
      let dedupResult = EMPTY_OBJECT;
      try {
        let dedup = payload.isInteractive ? EMPTY_OBJECT : await getUsageRowsDedupKey(ctx, mode);
        let { key, noted } = dedup;
        let alreadyNoted =
          key !== undefined && typeof noted === "string" && (noted === key || noted.startsWith(`${key} `));
        if (!alreadyNoted) await ctx.telemetry.log(modeRowOf(mode, payload.isInteractive));
        dedupResult = dedup;
        if (!alreadyNoted && !sendsUsageRows && key !== undefined)
          await ctx.store.set("usage-rows-queued", key);
      } finally {
        deferred.resolve(dedupResult);
      }
    });
    if (!projectModeWarned) {
      projectModeWarned = true;
      ctx.ui.log(
        projectModeOverrides
          ? `option projectInstructions in settings is honoured for now, read as instructionFiles ${mode}; set instructionFiles to ${mode} and remove projectInstructions`
          : `option projectInstructions in settings is not read: instructionFiles ${mode} is set; remove projectInstructions`,
      );
    }
    return next(payload);
  });
  if (mode === "claude-md") return;
  if (mode === "managed-only") {
    on(
      "prompt.context",
      {
        instructionFiles: {
          kind: MCP_SETTINGS_SCOPE_KINDS,
        },
      },
      (ctx, payload, next) =>
        next({
          ...payload,
          instructionFiles: payload.instructionFiles?.filter(isProjectLocalMcpSource),
        }),
    );
    return;
  }
  let walkState = walkOf(mode);
  let { isFallback, given } = walkState;
  let lastRoot;
  let logCountsDone = false;
  on("prompt.context", async (ctx, payload, next) => {
    let instructionFiles = payload.instructionFiles;
    if (instructionFiles === undefined)
      return next(payload).finally(() => {
        startOver(walkState);
      });
    let root = isFallback ? await ctx.session.root() : undefined;
    walkState.rootSeen = root ?? walkState.rootSeen;
    let isWalkFailed = false;
    let isClaudeProject =
      root !== undefined &&
      (instructionFiles.some((instructionFile) => isClaudeMdAtDir(instructionFile, root)) ||
        (await ctx.fs
          .ancestors({
            names: CLAUDE_MD_FILENAMES,
          })
          .then(
            (ancestors) => ancestors.length > 0,
            () => {
              isWalkFailed = true;
              return true;
            },
          )));
    walkState.isClaudeProject = isClaudeProject;
    let agentsAncestors = isClaudeProject
      ? EMPTY_LIST
      : await ctx.fs
          .ancestors({
            names: AGENTS_MD_FILENAMES,
          })
          .catch(() => {
            isWalkFailed = true;
            return EMPTY_LIST;
          });
    let mergedInstructionFiles = dedupeInstructionFiles(
      flattenProjectInstructionParts(agentsAncestors),
      instructionFiles,
    );
    if (!logCountsDone) {
      logCountsDone = true;
      let countsOf = loadCountsOf(mergedInstructionFiles, isClaudeProject && !isWalkFailed, isWalkFailed);
      quietly(async () => {
        let { key, noted } = await deferred.promise;
        let markOf = loadMarkOf(countsOf);
        let rowKey = key && `${key} ${markOf.kind}`;
        if (rowKey !== undefined && noted === rowKey) return;
        await Promise.all([ctx.telemetry.log(loadRowOf(mode, countsOf)), ctx.telemetry.mark(markOf)]);
        if (rowKey !== undefined) await ctx.store.set("usage-rows-queued", rowKey);
      });
    }
    if (root !== undefined && root !== lastRoot && mergedInstructionFiles.length > 0) {
      lastRoot = root;
      ctx.ui.log(
        "no CLAUDE.md found; AGENTS.md loaded: " +
          mergedInstructionFiles
            .filter((file) => file.parent === undefined)
            .map((file) => file.path)
            .join(", "),
        {
          to: "debug",
        },
      );
    }
    let mergedFiles = insertAgentsMdFiles(instructionFiles, mergedInstructionFiles);
    return next({
      ...payload,
      instructionFiles: mergedFiles,
    }).finally(() => {
      startOver(walkState);
      walkState.inContext = mergedFiles;
    });
  });
  on(
    "command.run",
    {
      command: CLAUDE_MD_RESET_EVENTS,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      given.clear();
      walkState.pending.clear();
      return result;
    },
  );
  on("session.compact", async (ctx, payload, next) => {
    let result = await next(payload);
    if (result.skip === undefined) takeBack(walkState, payload.agentId ?? MAIN_THREAD);
    return result;
  });
  on("prompt.submit", (ctx, payload, next) => {
    takeBack(walkState, MAIN_THREAD, ["submitted"]);
    stagePending(walkState, MAIN_THREAD, "submitted");
    return next(payload);
  });
  on("turn.start", (ctx, payload, next) => {
    if (!sessionStarted) deferred.resolve(EMPTY_OBJECT);
    if (payload.agentId === undefined) stagePending(walkState, MAIN_THREAD, "riding");
    return next(payload);
  });
  on("turn.complete", (ctx, payload, next) => {
    settlePending(walkState, payload.agentId ?? MAIN_THREAD, payload);
    return next(payload);
  });
  on(
    "agent.spawn",
    {
      fork: true,
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (payload.resume === undefined && result.agentId !== undefined) {
        let parentGiven = given.get(payload.parentAgentId ?? MAIN_THREAD);
        let childGiven = given.get(result.agentId);
        given.set(result.agentId, new Set([...(parentGiven ?? []), ...(childGiven ?? [])]));
      }
      return result;
    },
  );
  on(
    "tool.call",
    {
      tool: "Read",
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (payload.tool !== "Read" || result.deny !== undefined || result.isError) return result;
      let touched = touchedOf(payload.file_path, payload, "read");
      let parts = await agentsMdForMention(ctx, touched, walkState);
      return parts.length > 0
        ? {
            ...result,
            context: appendInstructionParts(result.context, parts),
          }
        : result;
    },
  );
  on("prompt.mention", async (ctx, payload, next) => {
    let result = await next(payload);
    let touched = touchedOf(payload.path, payload, "mention");
    takeBack(walkState, touched.loop, ["submitted"]);
    if (result.deny !== undefined || result.type === "pdf_reference") return result;
    let parts = await agentsMdForMention(ctx, touched, walkState);
    return parts.length > 0
      ? {
          ...result,
          context: appendInstructionParts(result.context, parts),
        }
      : result;
  });
}
//@ chunk-pyd7te4t.js:10570-11464 placement
async function agentsMdForMention(ctx, touched, walkState) {
  if (!(await isAgentsMdAttachmentEnabled(ctx))) return [];
  let [root, cwd] = await Promise.all([ctx.session.root(), ctx.session.cwd()]);
  walkState.home ??= await getHomeDir(ctx, cwd);
  let includePath = resolveIncludePath(touched.path, cwd, walkState.home);
  if (root !== walkState.rootSeen) {
    walkState.rootSeen = root;
    walkState.isClaudeProject = undefined;
    walkState.given.clear();
    walkState.pending.clear();
  }
  walkState.isClaudeProject ??=
    walkState.isFallback &&
    (
      await ctx.fs.ancestors({
        names: CLAUDE_MD_FILENAMES,
      })
    ).length > 0;
  if (walkState.isClaudeProject || !isPathUnder(includePath, root)) return [];
  let [agentsAncestors, claudeAncestors] = await Promise.all([
    ctx.fs.ancestors({
      names: AGENTS_MD_FILENAMES,
      of: includePath,
      below: root,
    }),
    ctx.fs.ancestors({
      names: CLAUDE_MD_FILENAMES,
      of: includePath,
      below: root,
    }),
  ]).catch(() => [EMPTY_LIST, EMPTY_LIST]);
  let givenPaths = walkState.given.get(touched.loop) ?? new Set();
  walkState.given.set(touched.loop, givenPaths);
  let filtered = (
    walkState.isFallback ? excludeDirs(agentsAncestors, claudeAncestors) : agentsAncestors
  ).filter((file) => isPathUnder(file.dir, root));
  let filtered_2 = dedupeInstructionFiles(flattenProjectInstructionParts(filtered), [
    ...walkState.inContext,
    ...flattenProjectInstructionParts(claudeAncestors),
  ]).filter((file) => !givenPaths.has(file.path));
  let filtered_3 = filtered_2.filter((file) => !isSamePathEntry(file, includePath));
  let files = filtered_2.filter(
    (file) => filtered_3.includes(file) || (isSamePathEntry(file, includePath) && touched.isWhole),
  );
  for (let file of files) givenPaths.add(file.path);
  if (touched.road === "mention") holdPending(walkState, touched.loop, files);
  if (filtered_3.length > 0) quietly(() => ctx.telemetry.log(nestedRowOf(walkState.mode, filtered_3.length)));
  return filtered_3;
}
//@ chunk-pyd7te4t.js:11464-11611 placement
/**
 * CLAUDE_CODE_SIMPLE 与 CLAUDE_CODE_DISABLE_ATTACHMENTS 都未开启时为 true。
 */
async function isAgentsMdAttachmentEnabled(ctx) {
  let [simpleMode, attachmentsDisabled] = await Promise.all([
    ctx.env.get("CLAUDE_CODE_SIMPLE"),
    ctx.env.get("CLAUDE_CODE_DISABLE_ATTACHMENTS"),
  ]);
  return !isSwitchedOn(simpleMode) && !isSwitchedOn(attachmentsDisabled);
}
//@ chunk-pyd7te4t.js:11611-11955 placement
/**
 * 用量行去重键（会话 id + 名字）；设置 CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS 或读取失败时每个进程都发送。
 */
async function getUsageRowsDedupKey(ctx, mode) {
  try {
    return isSwitchedOn(await ctx.env.get("CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS"))
      ? EMPTY_OBJECT
      : {
          key: `${await ctx.session.id()} ${mode}`,
          noted: await ctx.store.get("usage-rows-queued"),
        };
  } catch (error) {
    ctx.ui.log(
      `AGENTS.md usage rows: could not read whether this session already sent them, so this process sends them (${String(error)})`,
      {
        to: "debug",
      },
    );
    return EMPTY_OBJECT;
  }
}
//@ chunk-pyd7te4t.js:11955-12085 placement
/**
 * 取 HOME 或 USERPROFILE（路径含反斜杠时优先 USERPROFILE）。
 */
async function getHomeDir(ctx, cwd) {
  let [home, userProfile] = await Promise.all([ctx.env.get("HOME"), ctx.env.get("USERPROFILE")]);
  return cwd.includes("\\") ? (userProfile ?? home) : (home ?? userProfile);
}

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/plugins/bundled/agentsMd/agentsMd.js");
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
  register,
  settlePending,
  stagePending,
  startOver,
  takeBack,
  touchedOf,
  walkOf,
};
