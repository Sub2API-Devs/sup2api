/**
 * components/fleet/fleetSessions.ts
 *
 * 2.1.316 新增：Agents 视图编辑器状态（查询、光标、粘贴、回复草稿、错误/提示）；根据输入生成派发建议（模板、routine、仓库、worktree、技能、模型）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-avy0g5d4.js (47)
 * attribution: placement 47
 */
import { isAbsolute } from "path";
import { countWhere } from "../../utils/collections.js";
import { CCR_LIST_TARGET_VISIBLE } from "../../services/cloudSessions/ccrSessionList.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError, getLogDisplayTitle } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isFleetDispatchEnabled, respawnBgSession } from "../../cli/bg/bgSpare.js";
import { errorMessage, isFsInaccessible } from "../../utils/errors.js";
import { registerPasteCarrier, mintPasteId } from "../../history.js";
import { prunePastedContents, validChildren } from "./fleetRows.js";
import {
  getProjectConfigRoot,
  getLastInteractionTime,
  getCliSessionConfigCarried,
  getOriginalCwd,
} from "../../bootstrap/state.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { resolveLauncher } from "../../commands/restart/restart.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { spareExtraArgs, buildDispatchArgs, DEFAULT_BG_AGENT_TEMPLATE } from "../../cli/bg/bgSpawnEnv.js";
import { flagArgs } from "../../services/daemon/relaunchArgs.js";
import { AGENT_VIEW_RELAUNCH_ENV_KEY, isPastSessionsExperimentEnabled } from "../../utils/fleetGates.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { sequential } from "../../utils/sequential.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { ensureCatalogDecision } from "../../utils/model/servedModelCatalog.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { getWorktreePaths } from "../../utils/getWorktreePaths.js";
import { loadSameRepoMessageLogs } from "../../utils/sessionStorage.js";
import {
  collapseWhitespace,
  ANY_CONTROL_CHAR_RE,
  getFirstLine,
  firstLineOf,
} from "../../utils/stringUtils.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { getEnabledModelOptions } from "../../utils/model/modelOptions.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getPlatform } from "../../utils/platform.js";
import { getImageFromClipboard } from "../../utils/imagePaste.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { listJobs } from "../../services/daemon/jobState.js";
import { resolveDispatchDefaults, dispatchDefaultsFromJob } from "./dispatchDefaults.js";
import { parseEffortLevel, EFFORT_LEVELS } from "../../utils/effort.js";

//@ chunk-avy0g5d4.js:46137-46159 placement
var DRAFT_ABSENCE_MS = 90000;
var DRAFT_SWEEP_INTERVAL_MS = 45000;
//@ chunk-avy0g5d4.js:46159-46478 placement
/**
 * 清理已不存在会话的回复草稿。
 */
function sweepReplyDrafts({ drafts, observedAbsenceMs, isGuarded, now, lastSweepAt }) {
  let elapsedMs = now - lastSweepAt;
  let deltaMs = elapsedMs < 0 || elapsedMs > DRAFT_SWEEP_INTERVAL_MS ? 0 : elapsedMs;
  let prunedAny = false;
  for (let key of drafts.keys()) {
    if (isGuarded(key)) {
      observedAbsenceMs.delete(key);
      continue;
    }
    let absenceMs = observedAbsenceMs.get(key);
    if (absenceMs === undefined) observedAbsenceMs.set(key, 0);
    else if (absenceMs + deltaMs >= DRAFT_ABSENCE_MS) {
      drafts.delete(key);
      observedAbsenceMs.delete(key);
      prunedAny = true;
    } else observedAbsenceMs.set(key, absenceMs + deltaMs);
  }
  for (let key of observedAbsenceMs.keys()) if (!drafts.has(key)) observedAbsenceMs.delete(key);
  return prunedAny;
}
//@ chunk-avy0g5d4.js:46478-47015 placement
/**
 * 按当前会话集合修剪回复草稿。
 */
function pruneReplyDrafts(editor, roster, { jobs, pendings, adoptedPeers, remoteJobs, remoteListLoaded }) {
  if (!jobs || !editor.hasReplyDrafts()) {
    editor.sweepReplyDrafts({
      now: Date.now(),
      isGuarded: null,
    });
    return;
  }
  let knownJobIds = new Set();
  for (let jobList of [jobs, pendings, adoptedPeers, remoteJobs])
    for (let job of jobList) knownJobIds.add(job.id);
  let settledRemoteCount = countWhere(remoteJobs, (remoteJob) => !remoteJob.id.startsWith("remote-pending-"));
  let remoteListComplete =
    !remoteListLoaded ||
    roster.getSnapshot().remoteListFailure !== null ||
    settledRemoteCount === 0 ||
    settledRemoteCount >= CCR_LIST_TARGET_VISIBLE;
  editor.sweepReplyDrafts({
    now: Date.now(),
    isGuarded: (draftKey) =>
      knownJobIds.has(draftKey) ||
      roster.isDeleting(draftKey) ||
      roster.isHolding(draftKey) ||
      roster.isArchiving(draftKey) ||
      (draftKey.startsWith("remote-")
        ? remoteListComplete
        : draftKey.startsWith("peer-")
          ? adoptedPeers.length === 0
          : jobs.length === 0),
  });
}
//@ chunk-avy0g5d4.js:47015-47160 placement
var EDITOR_PERSIST_DELAY_MS = 30000;
var EDITOR_SNAPSHOT_KEYS = [
  "query",
  "cursorOffset",
  "mode",
  "sessionModel",
  "sessionEffort",
  "sessionFastMode",
  "error",
  "hint",
  "replyError",
  "expandHintPasteId",
];
//@ chunk-avy0g5d4.js:47160-47217 placement
function clampCursor(text, offset) {
  return Math.max(0, Math.min(text.length, offset));
}
//@ chunk-avy0g5d4.js:47217-50409 placement
/**
 * Agents 视图编辑器状态（查询、光标、粘贴、回复草稿、错误/提示）。
 */
class FleetEditorStore {
  #n = createSignal();
  #e;
  #l = 0;
  #t = null;
  #r = false;
  #i = {};
  #u = null;
  #s = null;
  #a = new Map();
  #o = new Map();
  #m = Date.now();
  #g = new Map();
  #c = null;
  constructor(initialState = {}) {
    let query = initialState.query ?? "";
    let isBashMode = isFleetDispatchEnabled() && query.startsWith("!");
    let initialQuery = isBashMode ? query.slice(1) : query;
    this.#e = {
      query: initialQuery,
      cursorOffset: initialQuery.length,
      mode: isBashMode ? "bash" : "prompt",
      sessionModel: initialState.sessionModel,
      sessionEffort: undefined,
      sessionFastMode: undefined,
      error: null,
      hint: null,
      replyError: null,
      expandHintPasteId: null,
    };
  }
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#n.subscribe(listener);
  #d(patch) {
    let previous = this.#e;
    let next = {
      ...previous,
      ...patch,
    };
    if (EDITOR_SNAPSHOT_KEYS.every((key) => Object.is(next[key], previous[key]))) return;
    this.#e = next;
    this.#n.emit();
  }
  attachView() {
    if (this.#l++ === 0) {
      this.#t = registerPasteCarrier(() => [this.#e.query, ...this.#a.values()]);
      this.#r = false;
      this.#m = Date.now();
      this.#o.clear();
    }
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.#l--;
      if (this.#l === 0) {
        this.#t?.();
        this.#t = null;
        this.#r = false;
        this.#s = null;
        this.#g.clear();
        this.#c = null;
        this.#e = {
          ...this.#e,
          cursorOffset: this.#e.query.length,
          error: null,
          hint: null,
          replyError: null,
          expandHintPasteId: null,
        };
      }
    };
  }
  setQuery(query) {
    this.#d({
      query,
      cursorOffset: query.length,
    });
  }
  setQueryAndCursor(query, cursorOffset) {
    this.#d({
      query,
      cursorOffset: clampCursor(query, cursorOffset),
    });
  }
  insertText(text) {
    let { query, cursorOffset } = this.#e;
    this.#d({
      query: query.slice(0, cursorOffset) + text + query.slice(cursorOffset),
      cursorOffset: cursorOffset + text.length,
    });
  }
  setMode(mode) {
    this.#d({
      mode,
    });
  }
  dropDraft() {
    this.setQuery("");
    this.setMode("prompt");
    this.pruneOrphanedPastes({
      pruneTextPastes: true,
    });
  }
  draftForDisk() {
    let { query, mode } = this.#e;
    return mode === "bash" ? `!${query}` : query;
  }
  beginProgrammaticChange() {
    this.#r = true;
  }
  takeProgrammaticChange() {
    let changed = this.#r;
    this.#r = false;
    return changed;
  }
  setSessionModel(sessionModel) {
    this.#d({
      sessionModel,
    });
  }
  setSessionEffort(sessionEffort) {
    this.#d({
      sessionEffort,
    });
  }
  setSessionFastMode(sessionFastMode) {
    this.#d({
      sessionFastMode,
    });
  }
  setError = (error) => {
    this.#d({
      error,
    });
  };
  setHint = (hint) => {
    this.#d({
      hint,
    });
  };
  setArchiveLine(line) {
    this.clearArchiveLine();
    if ("error" in line) {
      this.setError(line.error);
      this.#c = line.error;
    } else {
      this.setHint(line.hint);
      this.#c = line.hint;
    }
  }
  clearArchiveLine() {
    let previousLine = this.#c;
    this.#c = null;
    if (previousLine !== null && this.#e.error === previousLine) this.setError(null);
    if (previousLine !== null && this.#e.hint === previousLine) this.setHint(null);
  }
  setReplyError(jobId, error, kind = "send") {
    this.#d({
      replyError:
        error === null
          ? null
          : {
              jobId,
              error,
              kind,
            },
    });
  }
  setExpandHintPasteId(expandHintPasteId) {
    this.#d({
      expandHintPasteId,
    });
  }
  get pastes() {
    return this.#i;
  }
  replacePastes(pastes) {
    this.#i = pastes;
  }
  mergeRestoredPastes(restored) {
    this.#i = {
      ...restored,
      ...this.#i,
    };
  }
  get lastMintedPasteId() {
    return this.#u;
  }
  noteMintedPaste = (pasteId) => {
    this.#u = pasteId;
  };
  mintTextPaste(content) {
    let pasteId = mintPasteId(this.#e.query, this.#i);
    this.#u = pasteId;
    this.#i[pasteId] = {
      id: pasteId,
      type: "text",
      content,
    };
    return pasteId;
  }
  registerLivePeekQuery(getQuery) {
    this.#s = getQuery;
    return () => {
      if (this.#s === getQuery) this.#s = null;
    };
  }
  pruneOrphanedPastes = (options) => {
    prunePastedContents(this.#i, [this.#e.query, this.#s?.() ?? "", ...this.#a.values()], options);
  };
  replyDraft(jobId) {
    return this.#a.get(jobId);
  }
  saveReplyDraft(jobId, draft) {
    if (draft) this.#a.set(jobId, draft);
    else this.#a.delete(jobId);
  }
  deleteReplyDraft(jobId) {
    this.#a.delete(jobId);
  }
  releaseReplyDraft(jobId) {
    if (this.#a.delete(jobId)) this.pruneOrphanedPastes();
  }
  hasReplyDrafts() {
    return this.#a.size > 0;
  }
  sweepReplyDrafts({ now, isGuarded }) {
    let lastSweepAt = this.#m;
    this.#m = now;
    if (isGuarded === null || this.#a.size === 0) {
      this.#o.clear();
      return;
    }
    if (
      sweepReplyDrafts({
        drafts: this.#a,
        observedAbsenceMs: this.#o,
        now,
        lastSweepAt,
        isGuarded,
      })
    )
      this.pruneOrphanedPastes();
  }
  isRetryOfRecentReplyFailure(jobId, nowMs) {
    let failedAt = this.#g.get(jobId);
    return failedAt !== undefined && nowMs - failedAt < EDITOR_PERSIST_DELAY_MS;
  }
  noteReplyFailure(jobId, timestamp) {
    this.#g.set(jobId, timestamp);
  }
  clearReplyFailure(jobId) {
    this.#g.delete(jobId);
  }
}
//@ chunk-avy0g5d4.js:50409-50454 placement
function ensureFleetEditor(visit, initialState) {
  return (visit.editor ??= new FleetEditorStore(initialState));
}
//@ chunk-avy0g5d4.js:50454-50519 placement
var RELAUNCH_RECENT_MS = 3600000;
var RELAUNCH_COOLDOWN_MS = 21600000;
var CLAUDE_AGENTS_AUTO_RELAUNCHED_AT = "CLAUDE_AGENTS_AUTO_RELAUNCHED_AT";
//@ chunk-avy0g5d4.js:50519-51902 placement
/**
 * 切换到最新构建时重新启动 Agents 视图。
 */
function relaunchAgentsView(reason, { cwdFilter, dispatchDefaults, typedAgent, activeTab, onError }) {
  if (getProjectConfigRoot() !== null) {
    if (reason === "manual")
      onError(
        "Couldn't switch to the latest build. This agent view was started with --project-config-root, and a relaunched one would not get that flag. To update, quit and start the agent view again.",
      );
    return;
  }
  logEvent("tengu_bg_agent_action", {
    action: fromEnum(`fleetview_update_${reason}`),
  });
  resolveLauncher()
    .then((launcher) => {
      if (reason === "auto" && Date.now() - getLastInteractionTime() < RELAUNCH_RECENT_MS) return;
      return relaunchClaudeCode({
        launcher,
        args: [
          "agents",
          ...(cwdFilter ? ["--cwd", cwdFilter] : []),
          ...spareExtraArgs(),
          ...buildDispatchArgs(
            dispatchDefaults?.permissionModeInherited && dispatchDefaults.permissionMode === "default"
              ? {
                  ...dispatchDefaults,
                  permissionMode: undefined,
                  permissionModeInherited: undefined,
                }
              : dispatchDefaults,
          ),
          ...flagArgs("--agent", typedAgent),
        ],
        env: {
          [AGENT_VIEW_RELAUNCH_ENV_KEY]: "1",
          ...(reason === "auto" && {
            [CLAUDE_AGENTS_AUTO_RELAUNCHED_AT]: String(Date.now()),
          }),
          ...{},
          ...getScreenReaderEnv(),
        },
        preSpawn: () =>
          process.stdout.write(
            sequential.dim(`
Switching from ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            } to latest\u2026

`),
          ),
      });
    })
    .catch((error) => {
      logError(error);
      if (reason === "manual") onError(`Couldn't switch to the latest build \u2014 ${errorMessage(error)}`);
    });
}
//@ chunk-avy0g5d4.js:51902-52265 placement
/**
 * Agents 视图启动时组合 policy limits 客户端。
 */
async function composePolicyLimitsForFleet(services) {
  if (getProviderState().catalogDecision === undefined) {
    let { awaitPolicyLimitsColdStart, composePolicyLimitsClient } =
      await import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
    if (isStorageV5Enabled() && services?.storageV5 !== undefined)
      try {
        composePolicyLimitsClient(services);
      } catch (error) {
        logForDebugging(
          `Policy limits: start-up composition in the agents view failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "warn",
          },
        );
      }
    await awaitPolicyLimitsColdStart();
  }
  await ensureCatalogDecision({
    headless: isPlainNonInteractive(),
  });
}
//@ chunk-avy0g5d4.js:52443-52454 placement
var PAST_SESSION_LIMIT = 200;
//@ chunk-avy0g5d4.js:52454-52487 placement
function shouldListPastSessions() {
  return canLoadPastSessions() && isPastSessionsExperimentEnabled();
}
//@ chunk-avy0g5d4.js:52487-52521 placement
function canLoadPastSessions() {
  return !isSafeMode() && !getCliSessionConfigCarried();
}
//@ chunk-avy0g5d4.js:52521-53008 placement
/**
 * 枚举可恢复的历史会话。
 */
async function listPastSessions(seenSessionIds, includeBackground, storage) {
  try {
    let originalCwd = getOriginalCwd();
    let worktreePaths = await getWorktreePaths(originalCwd);
    return (
      await loadSameRepoMessageLogs(
        worktreePaths,
        undefined,
        includeBackground ? PAST_SESSION_LIMIT : undefined,
        storage,
      )
    ).flatMap((log) => {
      if (!log.sessionId || !log.fullPath) return [];
      if (seenSessionIds.has(log.sessionId)) return [];
      if (!includeBackground && log.sessionKind === "bg") return [];
      return [
        {
          sessionId: log.sessionId,
          fullPath: log.fullPath,
          title: collapseWhitespace(stripAnsiPerLine(getLogDisplayTitle(log))) || log.sessionId.slice(0, 8),
          modified: log.modified,
          cwd: log.relocatedCwd ?? log.projectPath ?? originalCwd,
        },
      ];
    });
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[fleetview] past-session enumeration failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    return null;
  }
}
//@ chunk-avy0g5d4.js:53043-53082 placement
var NEW_SESSION_PREFIX_RE = /(?:^|\s)(?:[aso]:|n:(?!\\))/gi;
//@ chunk-avy0g5d4.js:53082-53133 placement
function hasNewSessionPrefix(query) {
  return query.trimStart().search(NEW_SESSION_PREFIX_RE) === 0;
}
//@ chunk-avy0g5d4.js:53133-53300 placement
/**
 * 解析 “n:” 新会话前缀，返回去掉前缀的文本或 null。
 */
function parseNewSessionPrefix(query) {
  let trimmed = query.trimStart();
  if (hasNewSessionPrefix(trimmed)) return trimmed[0]?.toLowerCase() === "n" ? trimmed.slice(2) : null;
  if (isFleetDispatchEnabled() && trimmed.startsWith("!")) return null;
  return hasNewSessionPrefix(`n:${trimmed}`) ? `n:${trimmed}` : null;
}
//@ chunk-avy0g5d4.js:53300-53708 placement
/**
 * 解析派发输入里的短标志（-a/-s/-n/-g 等）。
 */
function parseDispatchFlags(query) {
  let template;
  let state;
  let name;
  let group;
  let output;
  let pr;
  let url;
  let textParts = [];
  for (let token of query.trim().split(/\s+/)) {
    let lower = token.toLowerCase();
    let flag = hasNewSessionPrefix(token) ? lower[0] : undefined;
    let sliced = lower.slice(2);
    if (flag === "a") template = sliced || undefined;
    else if (flag === "s") state = sliced || undefined;
    else if (flag === "n") name = sliced || undefined;
    else if (flag === "g") group = sliced || undefined;
    else if (flag === "o") output = sliced;
    else if (parsePrNumber(token)) pr = parsePrNumber(token);
    else if (soloUrl(token)) url = soloUrl(token);
    else textParts.push(token);
  }
  return {
    template,
    state,
    name,
    group,
    output,
    pr,
    url,
    text: textParts.join(" ").toLowerCase(),
  };
}
//@ chunk-avy0g5d4.js:53708-53879 placement
/**
 * 从 “#123”、/pull/123、/-/merge_requests/123 中取 PR 号。
 */
function parsePrNumber(value) {
  let trimmed = value.trim();
  if (/\s/.test(trimmed)) return null;
  return (
    (/^#(\d+)$/.exec(trimmed) ??
      /\/pull\/(\d+)(?!\d)/.exec(trimmed) ??
      /\/-\/merge_requests\/(\d+)(?!\d)/.exec(trimmed))?.[1] ?? null
  );
}
//@ chunk-avy0g5d4.js:53879-53960 placement
function prUrlMatcher(prNumber) {
  return new RegExp(`\\/(?:pull|-\\/merge_requests)\\/${prNumber}(?!\\d)`);
}
//@ chunk-avy0g5d4.js:53960-54093 placement
/**
 * 会话的子项或输出是否引用了该 PR。
 */
function jobReferencesPr(job, prNumber, urlMatcher = prUrlMatcher(prNumber)) {
  return (
    validChildren(job.children).some((child) => child.id === prNumber || urlMatcher.test(child.href)) ||
    Object.values(job.output ?? {}).some((outputValue) => urlMatcher.test(outputValue))
  );
}
//@ chunk-avy0g5d4.js:54093-54175 placement
function soloUrl(text) {
  let trimmed = text.trim();
  return !/\s/.test(trimmed) && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
//@ chunk-avy0g5d4.js:54175-54252 placement
function mentionsText(jobState, needle) {
  return jobState.intent.includes(needle) || !!jobState.initialPrompt?.includes(needle);
}
//@ chunk-avy0g5d4.js:54252-55037 placement
/**
 * 解析派发输入：! 命令、@ 提及（仓库/agent）、/ 技能等。
 */
function parseDispatchInput(query, templates, allRepos = {}, routines = []) {
  let trimmed = query.trim();
  if (isFleetDispatchEnabled() && trimmed.startsWith("!")) {
    let trimmed_2 = trimmed.slice(1).trim();
    return {
      template: DEFAULT_BG_AGENT_TEMPLATE,
      intent: "",
      matched: !!trimmed_2,
      exec: trimmed_2,
    };
  }
  if (hasNewSessionPrefix(trimmed)) return null;
  let atTemplate;
  let cwd;
  let routine;
  let keys = Object.keys(allRepos);
  let trimmed_2 = trimmed
    .replace(/(?:^|\s)@(\S+)/g, (whole, mention) => {
      let lower = mention.toLowerCase();
      let found = templates.find((template) => template.name.toLowerCase() === lower);
      if (found) {
        atTemplate ??= found;
        return "";
      }
      let found_2 = routines.find((routine) => routine.name.toLowerCase() === lower);
      if (found_2) {
        routine ??= found_2.name;
        return "";
      }
      let found_3 = keys.find((repoKey) => repoKey.toLowerCase() === lower);
      if (found_3) {
        cwd ??= allRepos[found_3];
        return "";
      }
      return whole;
    })
    .trim();
  let spaceIndex = trimmed_2.search(/\s/);
  let lower = (spaceIndex < 0 ? trimmed_2 : trimmed_2.slice(0, spaceIndex)).toLowerCase();
  let leadingTemplate = atTemplate
    ? undefined
    : templates.find((template) => template.name.toLowerCase() === lower);
  if (leadingTemplate)
    return {
      template: leadingTemplate,
      intent: spaceIndex < 0 ? "" : trimmed_2.slice(spaceIndex + 1).trim(),
      matched: true,
      cwd,
      routine,
    };
  if (atTemplate)
    return {
      template: atTemplate,
      intent: trimmed_2,
      matched: true,
      cwd,
      routine,
    };
  return {
    template: DEFAULT_BG_AGENT_TEMPLATE,
    intent: trimmed_2,
    matched: false,
    cwd,
    routine,
  };
}
//@ chunk-avy0g5d4.js:55037-55182 placement
/**
 * 文本是 http(s) 链接或绝对路径时转成可打开的 URL。
 */
function toOpenableUrl(text) {
  let trimmed = text.trim();
  if (/\s/.test(trimmed)) return null;
  if (/^https?:\/\//.test(trimmed)) return ANY_CONTROL_CHAR_RE.test(trimmed) ? null : trimmed;
  let expandedPath = expandTildeWithHome(trimmed);
  return isAbsolute(expandedPath) ? toSafeFileUrl(expandedPath) : null;
}
//@ chunk-avy0g5d4.js:55182-55305 placement
/**
 * 输入里 “n:” 前缀的高亮区间。
 */
function newSessionPrefixRanges(query) {
  if (!hasNewSessionPrefix(query)) return [];
  let ranges = [];
  for (let match of query.matchAll(NEW_SESSION_PREFIX_RE)) {
    let end = match.index + match[0].length;
    ranges.push([end - 2, end]);
  }
  return ranges;
}
//@ chunk-avy0g5d4.js:55305-55477 placement
/**
 * 输入中 @提及（已知名字）的高亮区间。
 */
function mentionRanges(query, knownNames) {
  let ranges = [];
  for (let match of query.matchAll(/(?:^|\s)@(\S+)/g)) {
    if (!knownNames.has(match[1].toLowerCase())) continue;
    let end = match.index + match[0].length;
    ranges.push([end - match[1].length - 1, end]);
  }
  return ranges;
}
//@ chunk-avy0g5d4.js:55477-55541 placement
function replaceTrailingMention(query, prefix, name) {
  return query.replace(/[@/]\S*$/, () => `${prefix}${name} `);
}
//@ chunk-avy0g5d4.js:55541-55796 placement
/**
 * 找输入中第一个 @提及的模板（跳过同名 agent/技能）。
 */
function findMentionedTemplate(query, repos, templates = [], routines = []) {
  let knownNames = new Set([...templates, ...routines].map((entry) => entry.name.toLowerCase()));
  let keys = Object.keys(repos);
  for (let match of query.matchAll(/(?:^|\s)@(\S+)/g)) {
    let lower = match[1].toLowerCase();
    if (knownNames.has(lower)) continue;
    let found = keys.find((repoKey) => repoKey.toLowerCase() === lower);
    if (found) return repos[found];
  }
  return;
}
//@ chunk-avy0g5d4.js:55796-56336 placement
/**
 * 派发建议种类标签与触发字符。
 */
var SUGGESTION_KIND_LABELS_2 = {
  agent: "background",
  repo: "repo",
  worktree: "worktree",
  skill: "skill",
  command: "command",
  workflow: "workflow",
  routine: "routine",
  model: "model",
};
var SUGGESTION_KIND_LABELS = {
  agent: "@",
  repo: "@",
  worktree: "@",
  routine: "@",
  skill: "/",
  command: "/",
  workflow: "/",
  model: "/",
};
var MODEL_SUGGESTION = {
  kind: "model",
  name: "model",
  description: "Set model for new sessions from this window (not saved)",
};
var DISPATCH_FLAG_HINTS = new Map([
  ["effort", "Set effort for new sessions from this window (not saved)"],
  ["fast", "Turn fast mode on or off for new sessions from this window (not saved)"],
  ["resume", "Resume a past session"],
]);
//@ chunk-avy0g5d4.js:56336-56538 placement
/**
 * 派发建议里的模型列表（含 “default”）。
 */
function modelSuggestions() {
  return [
    ...getEnabledModelOptions()
      .filter((option) => option.value)
      .map((option) => ({
        kind: "model",
        name: String(option.value),
        description: getFirstLine(option.description),
      })),
    {
      kind: "model",
      name: "default",
      description: "Reset to configured default",
    },
  ];
}
//@ chunk-avy0g5d4.js:56538-56554 placement
var EMPTY_AGENT_SUGGESTIONS = [];
var EMPTY_SKILL_SUGGESTIONS = [];
//@ chunk-avy0g5d4.js:56554-56632 placement
function agentSuggestions(template) {
  return {
    kind: "agent",
    name: template.name,
    description: getFirstLine(template.description),
  };
}
//@ chunk-avy0g5d4.js:56632-56789 placement
/**
 * 按名字（不区分大小写）去重合并两组建议。
 */
function mergeSuggestionsByName(primary, extra) {
  if (primary === extra || extra.length === 0) return primary;
  let knownNames = new Set(primary.map((suggestion) => suggestion.name.toLowerCase()));
  return [...primary, ...extra.filter((suggestion) => !knownNames.has(suggestion.name.toLowerCase()))];
}
//@ chunk-avy0g5d4.js:56789-56955 placement
/**
 * 按 agentLastUsed 倒序、再按名字排序。
 */
function sortAgentsByLastUsed(templates) {
  let agentLastUsed = getGlobalConfig().agentLastUsed ?? {};
  return templates.slice().sort((templateA, templateB) => {
    let usedA = agentLastUsed[templateA.name] ?? 0;
    let usedB = agentLastUsed[templateB.name] ?? 0;
    if (usedA !== usedB) return usedB - usedA;
    return templateA.name.localeCompare(templateB.name);
  });
}
//@ chunk-avy0g5d4.js:56955-57086 placement
/**
 * 仓库或 worktree 建议项。
 */
function repoOrWorktreeSuggestion(name, repos, worktreeBranches) {
  let branch = worktreeBranches[name];
  return branch === undefined
    ? {
        kind: "repo",
        name,
        description: repos[name],
      }
    : {
        kind: "worktree",
        name,
        description: branch || repos[name],
      };
}
//@ chunk-avy0g5d4.js:57086-58950 placement
/**
 * 根据输入生成派发建议（模板、routine、仓库、worktree、技能、模型）。
 */
function buildDispatchSuggestions(
  query,
  {
    templates = [],
    routines = [],
    repos = {},
    worktreeBranches = {},
    skills = [],
    models = [],
    dispatch,
    showAllAgents = false,
  },
) {
  let lower = firstLineOf(query, " ").toLowerCase();
  let isSlashQuery = lower.startsWith("/");
  let match = query.match(/(?:^|\s)@(\S*)$/);
  let lower_2 = match?.[1]?.toLowerCase();
  let hasTemplateMention =
    match &&
    findMentionedTemplate(query.slice(0, -match[0].length), repos, templates, routines) !== undefined;
  let templateNames = new Set(templates.map((template) => template.name.toLowerCase()));
  let takenNames = new Set([...templateNames, ...routines.map((routine) => routine.name.toLowerCase())]);
  let filtered = Object.keys(repos).filter((key) => !takenNames.has(key.toLowerCase()) && !/\s/.test(key));
  let mentionSuggestions =
    lower_2 === undefined
      ? []
      : [
          ...sortAgentsByLastUsed(templates)
            .filter((template) => template.name.toLowerCase().startsWith(lower_2))
            .map(agentSuggestions),
          ...routines
            .filter((routine) => routine.name.toLowerCase().startsWith(lower_2))
            .sort((routineA, routineB) => routineA.name.localeCompare(routineB.name)),
          ...(hasTemplateMention
            ? []
            : filtered
                .filter((repoKey) => repoKey.toLowerCase().startsWith(lower_2))
                .sort((repoA, repoB) => repoA.localeCompare(repoB))
                .map((repoKey) => repoOrWorktreeSuggestion(repoKey, repos, worktreeBranches))),
        ];
  let match_2 = query.match(/(?:^|\s)\/(\S*)$/);
  let lower_3 = match_2?.[1]?.toLowerCase();
  let slashSuggestions =
    lower_3 === undefined
      ? []
      : [...(isSlashQuery ? [MODEL_SUGGESTION] : []), ...skills]
          .filter((skill) => skill.name.toLowerCase().includes(lower_3))
          .sort((skillA, skillB) => {
            let aStartsWith = skillA.name.toLowerCase().startsWith(lower_3);
            let bStartsWith = skillB.name.toLowerCase().startsWith(lower_3);
            return aStartsWith !== bStartsWith
              ? aStartsWith
                ? -1
                : 1
              : skillA.name.localeCompare(skillB.name);
          });
  let match_3 = query.match(/^\s*\/model\s+(\S*)$/i);
  let lower_4 = match_3?.[1]?.toLowerCase();
  let modelMatches =
    lower_4 === undefined ? [] : models.filter((model) => model.name.toLowerCase().startsWith(lower_4));
  let wordSuggestions = isSlashQuery
    ? []
    : [
        ...templates
          .filter((template) => template.name.toLowerCase().startsWith(lower))
          .sort((templateA, templateB) => templateA.name.localeCompare(templateB.name))
          .map(agentSuggestions),
        ...routines
          .filter((routine) => routine.name.toLowerCase().startsWith(lower))
          .sort((routineA, routineB) => routineA.name.localeCompare(routineB.name)),
        ...filtered
          .filter((repoKey) => repoKey.toLowerCase().startsWith(lower))
          .sort((repoA, repoB) => repoA.localeCompare(repoB))
          .map((repoKey) => repoOrWorktreeSuggestion(repoKey, repos, worktreeBranches)),
        ...skills
          .filter((skill) => skill.name.toLowerCase().startsWith(lower))
          .sort((skillA, skillB) => skillA.name.localeCompare(skillB.name)),
      ];
  let suggestions =
    !dispatch || dispatch.exec !== undefined
      ? []
      : match_3
        ? modelMatches
        : match
          ? mentionSuggestions
          : match_2
            ? slashSuggestions
            : showAllAgents && !query
              ? sortAgentsByLastUsed(templates).map(agentSuggestions)
              : !dispatch.matched && lower && !query.includes(" ")
                ? wordSuggestions
                : [];
  return {
    firstWord: lower,
    isSlashQuery,
    atMatch: match !== null,
    slashMatch: match_2 !== null,
    modelArgMatch: match_3 !== null,
    templateNames,
    repoNames: filtered,
    suggestions,
  };
}
//@ chunk-avy0g5d4.js:58950-59099 placement
/**
 * 平台对应的粘贴图片快捷键（非 Windows 用 Ctrl+V，Windows/WSL 用 Alt+V）。
 */
function isPasteImageKey(event) {
  if (event.key !== "v") return false;
  let platform = getPlatform();
  if (event.ctrl && !event.meta) return platform !== "windows";
  if (event.meta && !event.ctrl) return platform === "windows" || platform === "wsl";
  return false;
}
//@ chunk-avy0g5d4.js:59099-59339 placement
/**
 * 从剪贴板读图片，成功回调，失败给出提示并记录。
 */
function pasteImageFromClipboard(onPaste, setHint) {
  getImageFromClipboard(imageLimitsForModel(getMainLoopModel()))
    .then((imageFromClipboard) => {
      if (imageFromClipboard) onPaste(imageFromClipboard);
      else {
        logFeatureBad("input_image_paste", "not_found");
        setHint("No image found in clipboard");
      }
    })
    .catch((error) => {
      logFeatureBad("input_image_paste", "clipboard_read_failed");
      logError(error);
      setHint("Couldn't read an image from the clipboard");
    });
}
//@ chunk-avy0g5d4.js:59339-59723 placement
/**
 * 回填 agentLastUsed 配置。
 */
async function backfillAgentLastUsed(storageV5) {
  let jobs = await listJobs(undefined, storageV5).catch(() => []);
  let changed = false;
  saveGlobalConfig((config) => {
    let agentLastUsed = config.agentLastUsed ?? {};
    let nextLastUsed = {
      ...agentLastUsed,
    };
    for (let job of jobs) {
      if (job.state.template === DEFAULT_BG_AGENT_TEMPLATE.name) continue;
      if (agentLastUsed[job.state.template] !== undefined) continue;
      let timestamp = Date.parse(job.state.createdAt);
      if (Number.isNaN(timestamp)) continue;
      if (timestamp > (nextLastUsed[job.state.template] ?? 0)) {
        nextLastUsed[job.state.template] = timestamp;
        changed = true;
      }
    }
    if (!changed) return config;
    return {
      ...config,
      agentLastUsed: nextLastUsed,
    };
  }, storageV5);
  return changed;
}
//@ chunk-avy0g5d4.js:59723-59842 placement
/**
 * fleet 会话常量：MIN_SPAWN_INTENT_LENGTH=4 是“意图太短不给起”的最小长度阈值（原名 MAX_SPAWN_RETRIES 名不副实）；另有 STILL_STARTING_MESSAGE 与可重试的瞬态 socket 错误集。
 */
var MIN_SPAWN_INTENT_LENGTH = 4;
var STILL_STARTING_MESSAGE = "Still starting \u2014 try again in a moment";
var TRANSIENT_SOCKET_ERRORS = new Set(["EPIPE", "ECONNRESET", "ECONNREFUSED", "ENOTCONN"]);
//@ chunk-avy0g5d4.js:59842-59948 placement
/**
 * 调 respawnBgSession，异常转成 {ok:false, error}。
 */
function safeRespawnBgSession(...args) {
  return respawnBgSession(...args).catch((error) => ({
    ok: false,
    error: `Couldn't respawn \u2014 ${errorMessage(error)}`,
    alive: false,
  }));
}
//@ chunk-avy0g5d4.js:59948-59974 placement
var DISPATCH_MARK_WINDOW_MS = 150;
var weakMap = new WeakMap();
//@ chunk-avy0g5d4.js:59974-60080 placement
/**
 * 标记一次派发在同一事件循环片段内（微任务后清除）。
 */
function markDispatchChunk(editor) {
  let mark = {
    sameChunk: true,
    at: performance.now(),
  };
  weakMap.set(editor, mark);
  queueMicrotask(() => {
    mark.sameChunk = false;
  });
}
//@ chunk-avy0g5d4.js:60080-60171 placement
function isRecentDispatchMark(editor) {
  let mark = weakMap.get(editor);
  return mark !== undefined && (mark.sameChunk || performance.now() - mark.at < DISPATCH_MARK_WINDOW_MS);
}
//@ chunk-avy0g5d4.js:60171-61297 placement
/**
 * 设置新会话的模型/effort 并提示。
 */
function setDispatchWindowValue(editor, launch, setting, value, isCloud) {
  let resolveDefaults = () =>
    resolveDispatchDefaults({
      launch,
      window: dispatchDefaultsFromJob(editor.getSnapshot()),
    });
  let isReset = value === "default";
  if (setting === "model") {
    editor.setSessionModel(isReset ? undefined : value);
    editor.setHint(
      isReset
        ? `Model for new sessions reset to ${resolveDefaults().model}`
        : `Model set to ${value} for new sessions from this window (not saved)`,
    );
  } else if (setting === "effort") {
    let effortLevel = isReset ? undefined : parseEffortLevel(value);
    editor.setSessionEffort(effortLevel);
    let { model, effort, effortOverridden } = resolveDefaults();
    if (effortLevel === undefined)
      editor.setHint(
        effort === undefined
          ? "Effort for new sessions reset to the default"
          : `Effort for new sessions reset to ${effort}`,
      );
    else {
      let effortNote =
        effort === undefined
          ? ` \u2014 ${model} doesn't use an effort setting`
          : effort === effortLevel
            ? ""
            : effortOverridden
              ? ` \u2014 CLAUDE_CODE_EFFORT_LEVEL sets it to ${effort}`
              : ` \u2014 ${model} runs at ${effort}`;
      editor.setHint(
        `Effort set to ${effortLevel} for new sessions from this window (not saved)${effortNote}`,
      );
    }
  } else {
    editor.setSessionFastMode(isReset ? undefined : value === "on");
    let { fast, fastBlockedReason } = resolveDefaults();
    editor.setHint(
      isReset
        ? `Fast mode for new sessions reset to ${fast ?? "off"}`
        : `Fast mode ${value} for new sessions from this window (not saved)${isCloud ? ". Cloud sessions don't get it" : ""}${fastBlockedReason ? `. Not applied here: ${fastBlockedReason}` : value === "on" ? ". It draws from usage credits at a higher rate." : ""}`,
    );
  }
  logFeatureOk("fleet_view_new_session_settings", {
    setting: fromEnum(setting),
  });
}
//@ chunk-avy0g5d4.js:61297-61806 placement
/**
 * 生成模型/effort 选择项。
 */
function buildDispatchValueOptions(services, setting) {
  let { editor, view, dispatchDefaults, modelSuggestions } = services;
  let windowDefaults = dispatchDefaultsFromJob(editor.getSnapshot());
  let dispatchDefaults_2 = resolveDispatchDefaults({
    launch: dispatchDefaults,
    window: windowDefaults,
  });
  let resetOption = {
    value: "default",
    description: "Reset to configured default",
  };
  let options =
    setting === "model"
      ? modelSuggestions.map((modelSuggestion) => ({
          value: modelSuggestion.name,
          description: modelSuggestion.description,
        }))
      : setting === "effort"
        ? [
            ...EFFORT_LEVELS.map((value) => ({
              value,
            })),
            resetOption,
          ]
        : [
            {
              value: "on",
            },
            {
              value: "off",
            },
            resetOption,
          ];
  let currentValue =
    setting === "model"
      ? windowDefaults.model
      : setting === "effort"
        ? dispatchDefaults_2.effort
        : (dispatchDefaults_2.fast ?? "off");
  editor.setError(null);
  editor.setHint(null);
  view.openSettingPicker(
    {
      setting,
      options,
    },
    Math.max(
      0,
      options.findIndex((option) => option.value === currentValue),
    ),
  );
}
export {
  setDispatchWindowValue,
  STILL_STARTING_MESSAGE,
  parseNewSessionPrefix,
  isPasteImageKey,
  pasteImageFromClipboard,
  DISPATCH_FLAG_HINTS,
  ensureFleetEditor,
  shouldListPastSessions,
  listPastSessions,
  modelSuggestions,
  EMPTY_AGENT_SUGGESTIONS,
  EMPTY_SKILL_SUGGESTIONS,
  findMentionedTemplate,
  mergeSuggestionsByName,
  relaunchAgentsView,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT,
  RELAUNCH_COOLDOWN_MS,
  RELAUNCH_RECENT_MS,
  buildDispatchSuggestions,
  SUGGESTION_KIND_LABELS,
  replaceTrailingMention,
  pruneReplyDrafts,
  backfillAgentLastUsed,
  SUGGESTION_KIND_LABELS_2,
  mentionRanges,
  newSessionPrefixRanges,
  composePolicyLimitsForFleet,
  safeRespawnBgSession,
  isRecentDispatchMark,
  markDispatchChunk,
  buildDispatchValueOptions,
  canLoadPastSessions,
  parseDispatchInput,
  MIN_SPAWN_INTENT_LENGTH,
  TRANSIENT_SOCKET_ERRORS,
  parsePrNumber,
  prUrlMatcher,
  soloUrl,
  jobReferencesPr,
  mentionsText,
  parseDispatchFlags,
  toOpenableUrl,
};
