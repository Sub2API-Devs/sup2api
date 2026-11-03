/**
 * components/fleet/fleetSessions.ts
 *
 * 2.1.316 新增：Agents 视图编辑器状态（查询、光标、粘贴、回复草稿、错误/提示）；根据输入生成派发建议（模板、routine、仓库、worktree、技能、模型）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (47)
 * attribution: placement 47
 */
import { isAbsolute } from "path";
import { count } from "../../utils/collections.js";
import { CCR_LIST_TARGET_VISIBLE } from "../../services/cloudSessions/ccrSessionList.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError, getLogDisplayTitle } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
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

//@ chunk-93kwxas0.js:46084-46106 placement
var DRAFT_ABSENCE_MS = 90000;
var DRAFT_SWEEP_INTERVAL_MS = 45000;
//@ chunk-93kwxas0.js:46106-46425 placement
/**
 * 清理已不存在会话的回复草稿。
 */
function sweepReplyDrafts({ drafts, observedAbsenceMs, isGuarded, now, lastSweepAt }) {
  let T = now - lastSweepAt;
  let A = T < 0 || T > DRAFT_SWEEP_INTERVAL_MS ? 0 : T;
  let L = false;
  for (let key of drafts.keys()) {
    if (isGuarded(key)) {
      observedAbsenceMs.delete(key);
      continue;
    }
    let D = observedAbsenceMs.get(key);
    if (D === undefined) observedAbsenceMs.set(key, 0);
    else if (D + A >= DRAFT_ABSENCE_MS) {
      drafts.delete(key);
      observedAbsenceMs.delete(key);
      L = true;
    } else observedAbsenceMs.set(key, D + A);
  }
  for (let key of observedAbsenceMs.keys()) if (!drafts.has(key)) observedAbsenceMs.delete(key);
  return L;
}
//@ chunk-93kwxas0.js:46425-46962 placement
/**
 * 按当前会话集合修剪回复草稿。
 */
function pruneReplyDrafts(h, E, { jobs, pendings, adoptedPeers, remoteJobs, remoteListLoaded }) {
  if (!jobs || !h.hasReplyDrafts()) {
    h.sweepReplyDrafts({
      now: Date.now(),
      isGuarded: null,
    });
    return;
  }
  let L = new Set();
  for (let U of [jobs, pendings, adoptedPeers, remoteJobs]) for (let N of U) L.add(N.id);
  let V = count(remoteJobs, (U) => !U.id.startsWith("remote-pending-"));
  let D =
    !remoteListLoaded ||
    E.getSnapshot().remoteListFailure !== null ||
    V === 0 ||
    V >= CCR_LIST_TARGET_VISIBLE;
  h.sweepReplyDrafts({
    now: Date.now(),
    isGuarded: (U) =>
      L.has(U) ||
      E.isDeleting(U) ||
      E.isHolding(U) ||
      E.isArchiving(U) ||
      (U.startsWith("remote-") ? D : U.startsWith("peer-") ? adoptedPeers.length === 0 : jobs.length === 0),
  });
}
//@ chunk-93kwxas0.js:46962-47107 placement
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
//@ chunk-93kwxas0.js:47107-47164 placement
function clampCursor(h, E) {
  return Math.max(0, Math.min(h.length, E));
}
//@ chunk-93kwxas0.js:47164-50355 placement
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
  #c = null;
  #s = null;
  #a = new Map();
  #o = new Map();
  #m = Date.now();
  #g = new Map();
  #u = null;
  constructor(h = {}) {
    let query = h.query ?? "";
    let k = isFleetDispatchEnabled() && query.startsWith("!");
    let C = k ? query.slice(1) : query;
    this.#e = {
      query: C,
      cursorOffset: C.length,
      mode: k ? "bash" : "prompt",
      sessionModel: h.sessionModel,
      sessionEffort: undefined,
      sessionFastMode: undefined,
      error: null,
      hint: null,
      replyError: null,
      expandHintPasteId: null,
    };
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  #d(h) {
    let E = this.#e;
    let k = {
      ...E,
      ...h,
    };
    if (EDITOR_SNAPSHOT_KEYS.every((C) => Object.is(k[C], E[C]))) return;
    this.#e = k;
    this.#n.emit();
  }
  attachView() {
    if (this.#l++ === 0) {
      this.#t = registerPasteCarrier(() => [this.#e.query, ...this.#a.values()]);
      this.#r = false;
      this.#m = Date.now();
      this.#o.clear();
    }
    let h = false;
    return () => {
      if (h) return;
      h = true;
      this.#l--;
      if (this.#l === 0) {
        this.#t?.();
        this.#t = null;
        this.#r = false;
        this.#s = null;
        this.#g.clear();
        this.#u = null;
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
  setQuery(h) {
    this.#d({
      query: h,
      cursorOffset: h.length,
    });
  }
  setQueryAndCursor(h, E) {
    this.#d({
      query: h,
      cursorOffset: clampCursor(h, E),
    });
  }
  insertText(h) {
    let { query, cursorOffset } = this.#e;
    this.#d({
      query: query.slice(0, cursorOffset) + h + query.slice(cursorOffset),
      cursorOffset: cursorOffset + h.length,
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
    let h = this.#r;
    this.#r = false;
    return h;
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
  setArchiveLine(h) {
    this.clearArchiveLine();
    if ("error" in h) {
      this.setError(h.error);
      this.#u = h.error;
    } else {
      this.setHint(h.hint);
      this.#u = h.hint;
    }
  }
  clearArchiveLine() {
    let h = this.#u;
    this.#u = null;
    if (h !== null && this.#e.error === h) this.setError(null);
    if (h !== null && this.#e.hint === h) this.setHint(null);
  }
  setReplyError(jobId, E, kind = "send") {
    this.#d({
      replyError:
        E === null
          ? null
          : {
              jobId,
              error: E,
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
  replacePastes(h) {
    this.#i = h;
  }
  mergeRestoredPastes(h) {
    this.#i = {
      ...h,
      ...this.#i,
    };
  }
  get lastMintedPasteId() {
    return this.#c;
  }
  noteMintedPaste = (h) => {
    this.#c = h;
  };
  mintTextPaste(content) {
    let E = mintPasteId(this.#e.query, this.#i);
    this.#c = E;
    this.#i[E] = {
      id: E,
      type: "text",
      content,
    };
    return E;
  }
  registerLivePeekQuery(h) {
    this.#s = h;
    return () => {
      if (this.#s === h) this.#s = null;
    };
  }
  pruneOrphanedPastes = (h) => {
    prunePastedContents(this.#i, [this.#e.query, this.#s?.() ?? "", ...this.#a.values()], h);
  };
  replyDraft(h) {
    return this.#a.get(h);
  }
  saveReplyDraft(h, E) {
    if (E) this.#a.set(h, E);
    else this.#a.delete(h);
  }
  deleteReplyDraft(h) {
    this.#a.delete(h);
  }
  releaseReplyDraft(h) {
    if (this.#a.delete(h)) this.pruneOrphanedPastes();
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
  isRetryOfRecentReplyFailure(h, E) {
    let k = this.#g.get(h);
    return k !== undefined && E - k < EDITOR_PERSIST_DELAY_MS;
  }
  noteReplyFailure(h, E) {
    this.#g.set(h, E);
  }
  clearReplyFailure(h) {
    this.#g.delete(h);
  }
}
//@ chunk-93kwxas0.js:50355-50400 placement
function ensureFleetEditor(h, E) {
  return (h.editor ??= new FleetEditorStore(E));
}
//@ chunk-93kwxas0.js:50400-50465 placement
var RELAUNCH_RECENT_MS = 3600000;
var RELAUNCH_COOLDOWN_MS = 21600000;
var CLAUDE_AGENTS_AUTO_RELAUNCHED_AT = "CLAUDE_AGENTS_AUTO_RELAUNCHED_AT";
//@ chunk-93kwxas0.js:50465-51849 placement
/**
 * 切换到最新构建时重新启动 Agents 视图。
 */
function relaunchAgentsView(h, { cwdFilter, dispatchDefaults, typedAgent, activeTab, onError }) {
  if (getProjectConfigRoot() !== null) {
    if (h === "manual")
      onError(
        "Couldn't switch to the latest build. This agent view was started with --project-config-root, and a relaunched one would not get that flag. To update, quit and start the agent view again.",
      );
    return;
  }
  logEvent("tengu_bg_agent_action", {
    action: fromEnum(`fleetview_update_${h}`),
  });
  resolveLauncher()
    .then((launcher) => {
      if (h === "auto" && Date.now() - getLastInteractionTime() < RELAUNCH_RECENT_MS) return;
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
          ...(h === "auto" && {
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
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
      if (h === "manual") onError(`Couldn't switch to the latest build \u2014 ${errorMessage(error)}`);
    });
}
//@ chunk-93kwxas0.js:51849-52212 placement
/**
 * Agents 视图启动时组合 policy limits 客户端。
 */
async function composePolicyLimitsForFleet(h) {
  if (getProviderState().catalogDecision === undefined) {
    let { awaitPolicyLimitsColdStart, composePolicyLimitsClient } = await import("./chunk-qchbrsbw.js");
    if (isStorageV5Enabled() && h?.storageV5 !== undefined)
      try {
        composePolicyLimitsClient(h);
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
//@ chunk-93kwxas0.js:52390-52401 placement
var PAST_SESSION_LIMIT = 200;
//@ chunk-93kwxas0.js:52401-52434 placement
function shouldListPastSessions() {
  return canLoadPastSessions() && isPastSessionsExperimentEnabled();
}
//@ chunk-93kwxas0.js:52434-52468 placement
function canLoadPastSessions() {
  return !isSafeMode() && !getCliSessionConfigCarried();
}
//@ chunk-93kwxas0.js:52468-52954 placement
/**
 * 枚举可恢复的历史会话。
 */
async function listPastSessions(h, E, storageV5) {
  try {
    let originalCwd = getOriginalCwd();
    let worktreePaths = await getWorktreePaths(originalCwd);
    return (
      await loadSameRepoMessageLogs(worktreePaths, undefined, E ? PAST_SESSION_LIMIT : undefined, storageV5)
    ).flatMap((L) => {
      if (!L.sessionId || !L.fullPath) return [];
      if (h.has(L.sessionId)) return [];
      if (!E && L.sessionKind === "bg") return [];
      return [
        {
          sessionId: L.sessionId,
          fullPath: L.fullPath,
          title: collapseWhitespace(stripAnsiPerLine(getLogDisplayTitle(L))) || L.sessionId.slice(0, 8),
          modified: L.modified,
          cwd: L.relocatedCwd ?? L.projectPath ?? originalCwd,
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
//@ chunk-93kwxas0.js:52989-53028 placement
var NEW_SESSION_PREFIX_RE = /(?:^|\s)(?:[aso]:|n:(?!\\))/gi;
//@ chunk-93kwxas0.js:53028-53079 placement
function hasNewSessionPrefix(h) {
  return h.trimStart().search(NEW_SESSION_PREFIX_RE) === 0;
}
//@ chunk-93kwxas0.js:53079-53246 placement
/**
 * 解析 “n:” 新会话前缀，返回去掉前缀的文本或 null。
 */
function parseNewSessionPrefix(query) {
  let E = query.trimStart();
  if (hasNewSessionPrefix(E)) return E[0]?.toLowerCase() === "n" ? E.slice(2) : null;
  if (isFleetDispatchEnabled() && E.startsWith("!")) return null;
  return hasNewSessionPrefix(`n:${E}`) ? `n:${E}` : null;
}
//@ chunk-93kwxas0.js:53246-53654 placement
/**
 * 解析派发输入里的短标志（-a/-s/-n/-g 等）。
 */
function parseDispatchFlags(h) {
  let template;
  let state;
  let name;
  let group;
  let output;
  let pr;
  let url;
  let V = [];
  for (let D of h.trim().split(/\s+/)) {
    let lower = D.toLowerCase();
    let N = hasNewSessionPrefix(D) ? lower[0] : undefined;
    let sliced = lower.slice(2);
    if (N === "a") template = sliced || undefined;
    else if (N === "s") state = sliced || undefined;
    else if (N === "n") name = sliced || undefined;
    else if (N === "g") group = sliced || undefined;
    else if (N === "o") output = sliced;
    else if (parsePrNumber(D)) pr = parsePrNumber(D);
    else if (soloUrl(D)) url = soloUrl(D);
    else V.push(D);
  }
  return {
    template,
    state,
    name,
    group,
    output,
    pr,
    url,
    text: V.join(" ").toLowerCase(),
  };
}
//@ chunk-93kwxas0.js:53654-53825 placement
/**
 * 从 “#123”、/pull/123、/-/merge_requests/123 中取 PR 号。
 */
function parsePrNumber(h) {
  let trimmed = h.trim();
  if (/\s/.test(trimmed)) return null;
  return (
    (/^#(\d+)$/.exec(trimmed) ??
      /\/pull\/(\d+)(?!\d)/.exec(trimmed) ??
      /\/-\/merge_requests\/(\d+)(?!\d)/.exec(trimmed))?.[1] ?? null
  );
}
//@ chunk-93kwxas0.js:53825-53906 placement
function prUrlMatcher(h) {
  return new RegExp(`\\/(?:pull|-\\/merge_requests)\\/${h}(?!\\d)`);
}
//@ chunk-93kwxas0.js:53906-54039 placement
/**
 * 会话的子项或输出是否引用了该 PR。
 */
function jobReferencesPr(h, E, k = prUrlMatcher(E)) {
  return (
    validChildren(h.children).some((C) => C.id === E || k.test(C.href)) ||
    Object.values(h.output ?? {}).some((C) => k.test(C))
  );
}
//@ chunk-93kwxas0.js:54039-54121 placement
function soloUrl(h) {
  let trimmed = h.trim();
  return !/\s/.test(trimmed) && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
//@ chunk-93kwxas0.js:54121-54198 placement
function mentionsText(h, E) {
  return h.intent.includes(E) || !!h.initialPrompt?.includes(E);
}
//@ chunk-93kwxas0.js:54198-54983 placement
/**
 * 解析派发输入：! 命令、@ 提及（仓库/agent）、/ 技能等。
 */
function parseDispatchInput(h, templates, allRepos = {}, routines = []) {
  let trimmed = h.trim();
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
  let T;
  let cwd;
  let routine;
  let keys = Object.keys(allRepos);
  let trimmed_2 = trimmed
    .replace(/(?:^|\s)@(\S+)/g, (K, W) => {
      let lower = W.toLowerCase();
      let found = templates.find((ne) => ne.name.toLowerCase() === lower);
      if (found) {
        T ??= found;
        return "";
      }
      let found_2 = routines.find((ne) => ne.name.toLowerCase() === lower);
      if (found_2) {
        routine ??= found_2.name;
        return "";
      }
      let found_3 = keys.find((ne) => ne.toLowerCase() === lower);
      if (found_3) {
        cwd ??= allRepos[found_3];
        return "";
      }
      return K;
    })
    .trim();
  let U = trimmed_2.search(/\s/);
  let lower = (U < 0 ? trimmed_2 : trimmed_2.slice(0, U)).toLowerCase();
  let X = T ? undefined : templates.find((K) => K.name.toLowerCase() === lower);
  if (X)
    return {
      template: X,
      intent: U < 0 ? "" : trimmed_2.slice(U + 1).trim(),
      matched: true,
      cwd,
      routine,
    };
  if (T)
    return {
      template: T,
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
//@ chunk-93kwxas0.js:54983-55128 placement
/**
 * 文本是 http(s) 链接或绝对路径时转成可打开的 URL。
 */
function toOpenableUrl(h) {
  let trimmed = h.trim();
  if (/\s/.test(trimmed)) return null;
  if (/^https?:\/\//.test(trimmed)) return ANY_CONTROL_CHAR_RE.test(trimmed) ? null : trimmed;
  let k = expandTildeWithHome(trimmed);
  return isAbsolute(k) ? toSafeFileUrl(k) : null;
}
//@ chunk-93kwxas0.js:55128-55251 placement
/**
 * 输入里 “n:” 前缀的高亮区间。
 */
function newSessionPrefixRanges(query) {
  if (!hasNewSessionPrefix(query)) return [];
  let E = [];
  for (let k of query.matchAll(NEW_SESSION_PREFIX_RE)) {
    let C = k.index + k[0].length;
    E.push([C - 2, C]);
  }
  return E;
}
//@ chunk-93kwxas0.js:55251-55423 placement
/**
 * 输入中 @提及（已知名字）的高亮区间。
 */
function mentionRanges(query, E) {
  let k = [];
  for (let C of query.matchAll(/(?:^|\s)@(\S+)/g)) {
    if (!E.has(C[1].toLowerCase())) continue;
    let x = C.index + C[0].length;
    k.push([x - C[1].length - 1, x]);
  }
  return k;
}
//@ chunk-93kwxas0.js:55423-55487 placement
function replaceTrailingMention(query, E, name) {
  return query.replace(/[@/]\S*$/, () => `${E}${name} `);
}
//@ chunk-93kwxas0.js:55487-55742 placement
/**
 * 找输入中第一个 @提及的模板（跳过同名 agent/技能）。
 */
function findMentionedTemplate(h, E, k = [], C = []) {
  let x = new Set([...k, ...C].map((A) => A.name.toLowerCase()));
  let keys = Object.keys(E);
  for (let A of h.matchAll(/(?:^|\s)@(\S+)/g)) {
    let lower = A[1].toLowerCase();
    if (x.has(lower)) continue;
    let found = keys.find((D) => D.toLowerCase() === lower);
    if (found) return E[found];
  }
  return;
}
//@ chunk-93kwxas0.js:55742-56282 placement
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
//@ chunk-93kwxas0.js:56282-56484 placement
/**
 * 派发建议里的模型列表（含 “default”）。
 */
function modelSuggestions() {
  return [
    ...getEnabledModelOptions()
      .filter((h) => h.value)
      .map((h) => ({
        kind: "model",
        name: String(h.value),
        description: getFirstLine(h.description),
      })),
    {
      kind: "model",
      name: "default",
      description: "Reset to configured default",
    },
  ];
}
//@ chunk-93kwxas0.js:56484-56500 placement
var EMPTY_AGENT_SUGGESTIONS = [];
var EMPTY_SKILL_SUGGESTIONS = [];
//@ chunk-93kwxas0.js:56500-56578 placement
function agentSuggestions(h) {
  return {
    kind: "agent",
    name: h.name,
    description: getFirstLine(h.description),
  };
}
//@ chunk-93kwxas0.js:56578-56735 placement
/**
 * 按名字（不区分大小写）去重合并两组建议。
 */
function mergeSuggestionsByName(h, E) {
  if (h === E || E.length === 0) return h;
  let k = new Set(h.map((C) => C.name.toLowerCase()));
  return [...h, ...E.filter((C) => !k.has(C.name.toLowerCase()))];
}
//@ chunk-93kwxas0.js:56735-56901 placement
/**
 * 按 agentLastUsed 倒序、再按名字排序。
 */
function sortAgentsByLastUsed(templates) {
  let agentLastUsed = getGlobalConfig().agentLastUsed ?? {};
  return templates.slice().sort((k, C) => {
    let x = agentLastUsed[k.name] ?? 0;
    let T = agentLastUsed[C.name] ?? 0;
    if (x !== T) return T - x;
    return k.name.localeCompare(C.name);
  });
}
//@ chunk-93kwxas0.js:56901-57032 placement
/**
 * 仓库或 worktree 建议项。
 */
function repoOrWorktreeSuggestion(h, repos, worktreeBranches) {
  let C = worktreeBranches[h];
  return C === undefined
    ? {
        kind: "repo",
        name: h,
        description: repos[h],
      }
    : {
        kind: "worktree",
        name: h,
        description: C || repos[h],
      };
}
//@ chunk-93kwxas0.js:57032-58896 placement
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
  let U = lower.startsWith("/");
  let match = query.match(/(?:^|\s)@(\S*)$/);
  let lower_2 = match?.[1]?.toLowerCase();
  let K =
    match &&
    findMentionedTemplate(query.slice(0, -match[0].length), repos, templates, routines) !== undefined;
  let W = new Set(templates.map((template) => template.name.toLowerCase()));
  let z = new Set([...W, ...routines.map((routine) => routine.name.toLowerCase())]);
  let filtered = Object.keys(repos).filter((key) => !z.has(key.toLowerCase()) && !/\s/.test(key));
  let ge =
    lower_2 === undefined
      ? []
      : [
          ...sortAgentsByLastUsed(templates)
            .filter((we) => we.name.toLowerCase().startsWith(lower_2))
            .map(agentSuggestions),
          ...routines
            .filter((routine) => routine.name.toLowerCase().startsWith(lower_2))
            .sort((we, Re) => we.name.localeCompare(Re.name)),
          ...(K
            ? []
            : filtered
                .filter((we) => we.toLowerCase().startsWith(lower_2))
                .sort((we, Re) => we.localeCompare(Re))
                .map((we) => repoOrWorktreeSuggestion(we, repos, worktreeBranches))),
        ];
  let match_2 = query.match(/(?:^|\s)\/(\S*)$/);
  let lower_3 = match_2?.[1]?.toLowerCase();
  let ae =
    lower_3 === undefined
      ? []
      : [...(U ? [MODEL_SUGGESTION] : []), ...skills]
          .filter((we) => we.name.toLowerCase().includes(lower_3))
          .sort((we, Re) => {
            let je = we.name.toLowerCase().startsWith(lower_3);
            let st = Re.name.toLowerCase().startsWith(lower_3);
            return je !== st ? (je ? -1 : 1) : we.name.localeCompare(Re.name);
          });
  let match_3 = query.match(/^\s*\/model\s+(\S*)$/i);
  let lower_4 = match_3?.[1]?.toLowerCase();
  let le =
    lower_4 === undefined ? [] : models.filter((model) => model.name.toLowerCase().startsWith(lower_4));
  let Oe = U
    ? []
    : [
        ...templates
          .filter((template) => template.name.toLowerCase().startsWith(lower))
          .sort((we, Re) => we.name.localeCompare(Re.name))
          .map(agentSuggestions),
        ...routines
          .filter((routine) => routine.name.toLowerCase().startsWith(lower))
          .sort((we, Re) => we.name.localeCompare(Re.name)),
        ...filtered
          .filter((we) => we.toLowerCase().startsWith(lower))
          .sort((we, Re) => we.localeCompare(Re))
          .map((we) => repoOrWorktreeSuggestion(we, repos, worktreeBranches)),
        ...skills
          .filter((skill) => skill.name.toLowerCase().startsWith(lower))
          .sort((we, Re) => we.name.localeCompare(Re.name)),
      ];
  let suggestions =
    !dispatch || dispatch.exec !== undefined
      ? []
      : match_3
        ? le
        : match
          ? ge
          : match_2
            ? ae
            : showAllAgents && !query
              ? sortAgentsByLastUsed(templates).map(agentSuggestions)
              : !dispatch.matched && lower && !query.includes(" ")
                ? Oe
                : [];
  return {
    firstWord: lower,
    isSlashQuery: U,
    atMatch: match !== null,
    slashMatch: match_2 !== null,
    modelArgMatch: match_3 !== null,
    templateNames: W,
    repoNames: filtered,
    suggestions,
  };
}
//@ chunk-93kwxas0.js:58896-59045 placement
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
//@ chunk-93kwxas0.js:59045-59285 placement
/**
 * 从剪贴板读图片，成功回调，失败给出提示并记录。
 */
function pasteImageFromClipboard(h, setHint) {
  getImageFromClipboard(imageLimitsForModel(getMainLoopModel()))
    .then((imageFromClipboard) => {
      if (imageFromClipboard) h(imageFromClipboard);
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
//@ chunk-93kwxas0.js:59285-59669 placement
/**
 * 回填 agentLastUsed 配置。
 */
async function backfillAgentLastUsed(storageV5) {
  let E = await listJobs(undefined, storageV5).catch(() => []);
  let k = false;
  saveGlobalConfig((C) => {
    let agentLastUsed = C.agentLastUsed ?? {};
    let T = {
      ...agentLastUsed,
    };
    for (let A of E) {
      if (A.state.template === DEFAULT_BG_AGENT_TEMPLATE.name) continue;
      if (agentLastUsed[A.state.template] !== undefined) continue;
      let timestamp = Date.parse(A.state.createdAt);
      if (Number.isNaN(timestamp)) continue;
      if (timestamp > (T[A.state.template] ?? 0)) {
        T[A.state.template] = timestamp;
        k = true;
      }
    }
    if (!k) return C;
    return {
      ...C,
      agentLastUsed: T,
    };
  }, storageV5);
  return k;
}
//@ chunk-93kwxas0.js:59669-59788 placement
var MAX_SPAWN_RETRIES = 4;
var STILL_STARTING_MESSAGE = "Still starting \u2014 try again in a moment";
var TRANSIENT_SOCKET_ERRORS = new Set(["EPIPE", "ECONNRESET", "ECONNREFUSED", "ENOTCONN"]);
//@ chunk-93kwxas0.js:59788-59894 placement
/**
 * 调 respawnBgSession，异常转成 {ok:false, error}。
 */
function safeRespawnBgSession(...h) {
  return respawnBgSession(...h).catch((error) => ({
    ok: false,
    error: `Couldn't respawn \u2014 ${errorMessage(error)}`,
    alive: false,
  }));
}
//@ chunk-93kwxas0.js:59894-59920 placement
var DISPATCH_MARK_WINDOW_MS = 150;
var weakMap = new WeakMap();
//@ chunk-93kwxas0.js:59920-60026 placement
/**
 * 标记一次派发在同一事件循环片段内（微任务后清除）。
 */
function markDispatchChunk(editor) {
  let E = {
    sameChunk: true,
    at: performance.now(),
  };
  weakMap.set(editor, E);
  queueMicrotask(() => {
    E.sameChunk = false;
  });
}
//@ chunk-93kwxas0.js:60026-60117 placement
function isRecentDispatchMark(editor) {
  let E = weakMap.get(editor);
  return E !== undefined && (E.sameChunk || performance.now() - E.at < DISPATCH_MARK_WINDOW_MS);
}
//@ chunk-93kwxas0.js:60117-61243 placement
/**
 * 设置新会话的模型/effort 并提示。
 */
function setDispatchWindowValue(editor, launch, k, C, x) {
  let T = () =>
    resolveDispatchDefaults({
      launch,
      window: dispatchDefaultsFromJob(editor.getSnapshot()),
    });
  let A = C === "default";
  if (k === "model") {
    editor.setSessionModel(A ? undefined : C);
    editor.setHint(
      A
        ? `Model for new sessions reset to ${T().model}`
        : `Model set to ${C} for new sessions from this window (not saved)`,
    );
  } else if (k === "effort") {
    let L = A ? undefined : parseEffortLevel(C);
    editor.setSessionEffort(L);
    let { model, effort, effortOverridden } = T();
    if (L === undefined)
      editor.setHint(
        effort === undefined
          ? "Effort for new sessions reset to the default"
          : `Effort for new sessions reset to ${effort}`,
      );
    else {
      let N =
        effort === undefined
          ? ` \u2014 ${model} doesn't use an effort setting`
          : effort === L
            ? ""
            : effortOverridden
              ? ` \u2014 CLAUDE_CODE_EFFORT_LEVEL sets it to ${effort}`
              : ` \u2014 ${model} runs at ${effort}`;
      editor.setHint(`Effort set to ${L} for new sessions from this window (not saved)${N}`);
    }
  } else {
    editor.setSessionFastMode(A ? undefined : C === "on");
    let { fast, fastBlockedReason } = T();
    editor.setHint(
      A
        ? `Fast mode for new sessions reset to ${fast ?? "off"}`
        : `Fast mode ${C} for new sessions from this window (not saved)${x ? ". Cloud sessions don't get it" : ""}${fastBlockedReason ? `. Not applied here: ${fastBlockedReason}` : C === "on" ? ". It draws from usage credits at a higher rate." : ""}`,
    );
  }
  logFeatureOk("fleet_view_new_session_settings", {
    setting: fromEnum(k),
  });
}
//@ chunk-93kwxas0.js:61243-61752 placement
/**
 * 生成模型/effort 选择项。
 */
function buildDispatchValueOptions(h, E) {
  let { editor, view, dispatchDefaults, modelSuggestions } = h;
  let A = dispatchDefaultsFromJob(editor.getSnapshot());
  let dispatchDefaults_2 = resolveDispatchDefaults({
    launch: dispatchDefaults,
    window: A,
  });
  let V = {
    value: "default",
    description: "Reset to configured default",
  };
  let D =
    E === "model"
      ? modelSuggestions.map((modelSuggestion) => ({
          value: modelSuggestion.name,
          description: modelSuggestion.description,
        }))
      : E === "effort"
        ? [
            ...EFFORT_LEVELS.map((value) => ({
              value,
            })),
            V,
          ]
        : [
            {
              value: "on",
            },
            {
              value: "off",
            },
            V,
          ];
  let U =
    E === "model" ? A.model : E === "effort" ? dispatchDefaults_2.effort : (dispatchDefaults_2.fast ?? "off");
  editor.setError(null);
  editor.setHint(null);
  view.openSettingPicker(
    {
      setting: E,
      options: D,
    },
    Math.max(
      0,
      D.findIndex((N) => N.value === U),
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
  MAX_SPAWN_RETRIES,
  TRANSIENT_SOCKET_ERRORS,
  parsePrNumber,
  prUrlMatcher,
  soloUrl,
  jobReferencesPr,
  mentionsText,
  parseDispatchFlags,
  toOpenableUrl,
};
