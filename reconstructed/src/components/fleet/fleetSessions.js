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
import { isAbsolute, isAbsolute as isAbsolute_2 } from "path";
import { count } from "../../utils/collections.js";
import { CCR_LIST_TARGET_VISIBLE } from "../../services/cloudSessions/ccrSessionList.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError, getLogDisplayTitle } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { nmt, respawnBgSession } from "../../cli/bg/bgSpare.js";
import { errorMessage, isFsInaccessible } from "../../utils/errors.js";
import { zZ, ZR } from "../../history.js";
import { prunePastedContents, bn } from "./fleetRows.js";
import {
  getProjectConfigRoot,
  getLastInteractionTime,
  getCliSessionConfigCarried,
  getOriginalCwd,
} from "../../bootstrap/state.js";
import { resolveLauncher } from "../../commands/restart/restart.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { gAr, buildDispatchArgs, ace } from "../../cli/bg/bgSpawnEnv.js";
import { xT } from "../../services/daemon/relaunchArgs.js";
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
import { Dr, ANY_CONTROL_CHAR_RE, getFirstLine, firstLineOf } from "../../utils/stringUtils.js";
import { qa } from "../../utils/stripAnsi.js";
import { Lu } from "../../utils/networkPaths.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { getEnabledModelOptions } from "../../utils/model/modelOptions.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getPlatform } from "../../utils/platform.js";
import { getImageFromClipboard } from "../../utils/imagePaste.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { listJobs } from "../../services/daemon/jobState.js";
import { resolveDispatchDefaults, gi } from "./dispatchDefaults.js";
import { parseEffortLevel, EFFORT_LEVELS } from "../../utils/effort.js";

//@ chunk-93kwxas0.js:46084-46106 placement
var wh = 90000,
  Sh = 45000;
/**
 * 清理已不存在会话的回复草稿。
 */
//@ chunk-93kwxas0.js:46106-46425 placement
function sweepReplyDrafts({
  drafts: drafts,
  observedAbsenceMs: observedAbsenceMs,
  isGuarded: isGuarded,
  now: now,
  lastSweepAt: lastSweepAt,
}) {
  let T = now - lastSweepAt,
    A = T < 0 || T > Sh ? 0 : T,
    L = !1;
  for (let V of drafts.keys()) {
    if (isGuarded(V)) {
      observedAbsenceMs.delete(V);
      continue;
    }
    let D = observedAbsenceMs.get(V);
    if (D === void 0) observedAbsenceMs.set(V, 0);
    else if (D + A >= wh) (drafts.delete(V), observedAbsenceMs.delete(V), (L = !0));
    else observedAbsenceMs.set(V, D + A);
  }
  for (let V of observedAbsenceMs.keys()) if (!drafts.has(V)) observedAbsenceMs.delete(V);
  return L;
}
/**
 * 按当前会话集合修剪回复草稿。
 */
//@ chunk-93kwxas0.js:46425-46962 placement
function pruneReplyDrafts(
  h,
  E,
  {
    jobs: jobs,
    pendings: pendings,
    adoptedPeers: adoptedPeers,
    remoteJobs: remoteJobs,
    remoteListLoaded: remoteListLoaded,
  },
) {
  if (!jobs || !h.hasReplyDrafts()) {
    h.sweepReplyDrafts({ now: Date.now(), isGuarded: null });
    return;
  }
  let L = new Set();
  for (let U of [jobs, pendings, adoptedPeers, remoteJobs]) for (let N of U) L.add(N.id);
  let V = count(remoteJobs, (U) => !U.id.startsWith("remote-pending-")),
    D =
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
var EDITOR_PERSIST_DELAY_MS = 30000,
  EDITOR_SNAPSHOT_KEYS = [
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
function kh(h, E) {
  return Math.max(0, Math.min(h.length, E));
}
/**
 * Agents 视图编辑器状态（查询、光标、粘贴、回复草稿、错误/提示）。
 */
//@ chunk-93kwxas0.js:47164-50355 placement
class FleetEditorStore {
  #n = createSignal();
  #e;
  #l = 0;
  #t = null;
  #r = !1;
  #i = {};
  #c = null;
  #s = null;
  #a = new Map();
  #o = new Map();
  #m = Date.now();
  #g = new Map();
  #u = null;
  constructor(h = {}) {
    let E = h.query ?? "",
      k = nmt() && E.startsWith("!"),
      C = k ? E.slice(1) : E;
    this.#e = {
      query: C,
      cursorOffset: C.length,
      mode: k ? "bash" : "prompt",
      sessionModel: h.sessionModel,
      sessionEffort: void 0,
      sessionFastMode: void 0,
      error: null,
      hint: null,
      replyError: null,
      expandHintPasteId: null,
    };
  }
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  #d(h) {
    let E = this.#e,
      k = { ...E, ...h };
    if (EDITOR_SNAPSHOT_KEYS.every((C) => Object.is(k[C], E[C]))) return;
    ((this.#e = k), this.#n.emit());
  }
  attachView() {
    if (this.#l++ === 0)
      ((this.#t = zZ(() => [this.#e.query, ...this.#a.values()])),
        (this.#r = !1),
        (this.#m = Date.now()),
        this.#o.clear());
    let h = !1;
    return () => {
      if (h) return;
      if (((h = !0), this.#l--, this.#l === 0))
        (this.#t?.(),
          (this.#t = null),
          (this.#r = !1),
          (this.#s = null),
          this.#g.clear(),
          (this.#u = null),
          (this.#e = {
            ...this.#e,
            cursorOffset: this.#e.query.length,
            error: null,
            hint: null,
            replyError: null,
            expandHintPasteId: null,
          }));
    };
  }
  setQuery(h) {
    this.#d({ query: h, cursorOffset: h.length });
  }
  setQueryAndCursor(h, E) {
    this.#d({ query: h, cursorOffset: kh(h, E) });
  }
  insertText(h) {
    let { query: query, cursorOffset: cursorOffset } = this.#e;
    this.#d({
      query: query.slice(0, cursorOffset) + h + query.slice(cursorOffset),
      cursorOffset: cursorOffset + h.length,
    });
  }
  setMode(h) {
    this.#d({ mode: h });
  }
  dropDraft() {
    (this.setQuery(""), this.setMode("prompt"), this.pruneOrphanedPastes({ pruneTextPastes: !0 }));
  }
  draftForDisk() {
    let { query: query, mode: mode } = this.#e;
    return mode === "bash" ? `!${query}` : query;
  }
  beginProgrammaticChange() {
    this.#r = !0;
  }
  takeProgrammaticChange() {
    let h = this.#r;
    return ((this.#r = !1), h);
  }
  setSessionModel(h) {
    this.#d({ sessionModel: h });
  }
  setSessionEffort(h) {
    this.#d({ sessionEffort: h });
  }
  setSessionFastMode(h) {
    this.#d({ sessionFastMode: h });
  }
  setError = (h) => {
    this.#d({ error: h });
  };
  setHint = (h) => {
    this.#d({ hint: h });
  };
  setArchiveLine(h) {
    if ((this.clearArchiveLine(), "error" in h)) (this.setError(h.error), (this.#u = h.error));
    else (this.setHint(h.hint), (this.#u = h.hint));
  }
  clearArchiveLine() {
    let h = this.#u;
    if (((this.#u = null), h !== null && this.#e.error === h)) this.setError(null);
    if (h !== null && this.#e.hint === h) this.setHint(null);
  }
  setReplyError(h, E, k = "send") {
    this.#d({ replyError: E === null ? null : { jobId: h, error: E, kind: k } });
  }
  setExpandHintPasteId(h) {
    this.#d({ expandHintPasteId: h });
  }
  get pastes() {
    return this.#i;
  }
  replacePastes(h) {
    this.#i = h;
  }
  mergeRestoredPastes(h) {
    this.#i = { ...h, ...this.#i };
  }
  get lastMintedPasteId() {
    return this.#c;
  }
  noteMintedPaste = (h) => {
    this.#c = h;
  };
  mintTextPaste(h) {
    let E = ZR(this.#e.query, this.#i);
    return ((this.#c = E), (this.#i[E] = { id: E, type: "text", content: h }), E);
  }
  registerLivePeekQuery(h) {
    return (
      (this.#s = h),
      () => {
        if (this.#s === h) this.#s = null;
      }
    );
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
  sweepReplyDrafts({ now: h, isGuarded: E }) {
    let k = this.#m;
    if (((this.#m = h), E === null || this.#a.size === 0)) {
      this.#o.clear();
      return;
    }
    if (
      sweepReplyDrafts({ drafts: this.#a, observedAbsenceMs: this.#o, now: h, lastSweepAt: k, isGuarded: E })
    )
      this.pruneOrphanedPastes();
  }
  isRetryOfRecentReplyFailure(h, E) {
    let k = this.#g.get(h);
    return k !== void 0 && E - k < EDITOR_PERSIST_DELAY_MS;
  }
  noteReplyFailure(h, E) {
    this.#g.set(h, E);
  }
  clearReplyFailure(h) {
    this.#g.delete(h);
  }
}
//@ chunk-93kwxas0.js:50355-50400 placement
function Rs(h, E) {
  return (h.editor ??= new FleetEditorStore(E));
}
//@ chunk-93kwxas0.js:50400-50465 placement
var ks = 3600000,
  Hc = 21600000,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT = "CLAUDE_AGENTS_AUTO_RELAUNCHED_AT";
/**
 * 切换到最新构建时重新启动 Agents 视图。
 */
//@ chunk-93kwxas0.js:50465-51849 placement
function relaunchAgentsView(
  h,
  {
    cwdFilter: cwdFilter,
    dispatchDefaults: dispatchDefaults,
    typedAgent: typedAgent,
    activeTab: activeTab,
    onError: onError,
  },
) {
  if (getProjectConfigRoot() !== null) {
    if (h === "manual")
      onError(
        "Couldn't switch to the latest build. This agent view was started with --project-config-root, and a relaunched one would not get that flag. To update, quit and start the agent view again.",
      );
    return;
  }
  (logEvent("tengu_bg_agent_action", { action: fromEnum(`fleetview_update_${h}`) }),
    resolveLauncher()
      .then((A) => {
        if (h === "auto" && Date.now() - getLastInteractionTime() < ks) return;
        return relaunchClaudeCode({
          launcher: A,
          args: [
            "agents",
            ...(cwdFilter ? ["--cwd", cwdFilter] : []),
            ...gAr(),
            ...buildDispatchArgs(
              dispatchDefaults?.permissionModeInherited && dispatchDefaults.permissionMode === "default"
                ? { ...dispatchDefaults, permissionMode: void 0, permissionModeInherited: void 0 }
                : dispatchDefaults,
            ),
            ...xT("--agent", typedAgent),
          ],
          env: {
            [AGENT_VIEW_RELAUNCH_ENV_KEY]: "1",
            ...(h === "auto" && { [CLAUDE_AGENTS_AUTO_RELAUNCHED_AT]: String(Date.now()) }),
            ...{},
            ...getScreenReaderEnv(),
          },
          preSpawn: () =>
            process.stdout.write(
              sequential.dim(`
Switching from ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} to latest\u2026

`),
            ),
        });
      })
      .catch((A) => {
        if ((logError(A), h === "manual"))
          onError(`Couldn't switch to the latest build \u2014 ${errorMessage(A)}`);
      }));
}
/**
 * Agents 视图启动时组合 policy limits 客户端。
 */
//@ chunk-93kwxas0.js:51849-52212 placement
async function composePolicyLimitsForFleet(h) {
  if (getProviderState().catalogDecision === void 0) {
    let {
      awaitPolicyLimitsColdStart: awaitPolicyLimitsColdStart,
      composePolicyLimitsClient: composePolicyLimitsClient,
    } = await import("./chunk-qchbrsbw.js");
    if (isStorageV5Enabled() && h?.storageV5 !== void 0)
      try {
        composePolicyLimitsClient(h);
      } catch (error) {
        logForDebugging(
          `Policy limits: start-up composition in the agents view failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "warn" },
        );
      }
    await awaitPolicyLimitsColdStart();
  }
  await ensureCatalogDecision({ headless: isPlainNonInteractive() });
}
//@ chunk-93kwxas0.js:52390-52401 placement
var vh = 200;
//@ chunk-93kwxas0.js:52401-52434 placement
function vs() {
  return wd() && isPastSessionsExperimentEnabled();
}
//@ chunk-93kwxas0.js:52434-52468 placement
function wd() {
  return !isSafeMode() && !getCliSessionConfigCarried();
}
/**
 * 枚举可恢复的历史会话。
 */
//@ chunk-93kwxas0.js:52468-52954 placement
async function listPastSessions(h, E, k) {
  try {
    let C = getOriginalCwd(),
      x = await getWorktreePaths(C);
    return (await loadSameRepoMessageLogs(x, void 0, E ? vh : void 0, k)).flatMap((L) => {
      if (!L.sessionId || !L.fullPath) return [];
      if (h.has(L.sessionId)) return [];
      if (!E && L.sessionKind === "bg") return [];
      return [
        {
          sessionId: L.sessionId,
          fullPath: L.fullPath,
          title: Dr(qa(getLogDisplayTitle(L))) || L.sessionId.slice(0, 8),
          modified: L.modified,
          cwd: L.relocatedCwd ?? L.projectPath ?? C,
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
var yd = /(?:^|\s)(?:[aso]:|n:(?!\\))/gi;
//@ chunk-93kwxas0.js:53028-53079 placement
function hr(h) {
  return h.trimStart().search(yd) === 0;
}
/**
 * 解析 “n:” 新会话前缀，返回去掉前缀的文本或 null。
 */
//@ chunk-93kwxas0.js:53079-53246 placement
function parseNewSessionPrefix(h) {
  let trimStart = h.trimStart();
  if (hr(trimStart)) return trimStart[0]?.toLowerCase() === "n" ? trimStart.slice(2) : null;
  if (nmt() && trimStart.startsWith("!")) return null;
  return hr(`n:${trimStart}`) ? `n:${trimStart}` : null;
}
/**
 * 解析派发输入里的短标志（-a/-s/-n/-g 等）。
 */
//@ chunk-93kwxas0.js:53246-53654 placement
function parseDispatchFlags(h) {
  let E,
    k,
    C,
    x,
    T,
    A,
    L,
    V = [];
  for (let D of h.trim().split(/\s+/)) {
    let lower = D.toLowerCase(),
      N = hr(D) ? lower[0] : void 0,
      sliced = lower.slice(2);
    if (N === "a") E = sliced || void 0;
    else if (N === "s") k = sliced || void 0;
    else if (N === "n") C = sliced || void 0;
    else if (N === "g") x = sliced || void 0;
    else if (N === "o") T = sliced;
    else if (parsePrNumber(D)) A = parsePrNumber(D);
    else if (_s(D)) L = _s(D);
    else V.push(D);
  }
  return {
    template: E,
    state: k,
    name: C,
    group: x,
    output: T,
    pr: A,
    url: L,
    text: V.join(" ").toLowerCase(),
  };
}
/**
 * 从 “#123”、/pull/123、/-/merge_requests/123 中取 PR 号。
 */
//@ chunk-93kwxas0.js:53654-53825 placement
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
function Is(h) {
  return new RegExp(`\\/(?:pull|-\\/merge_requests)\\/${h}(?!\\d)`);
}
/**
 * 会话的子项或输出是否引用了该 PR。
 */
//@ chunk-93kwxas0.js:53906-54039 placement
function jobReferencesPr(h, E, k = Is(E)) {
  return (
    bn(h.children).some((C) => C.id === E || k.test(C.href)) ||
    Object.values(h.output ?? {}).some((C) => k.test(C))
  );
}
//@ chunk-93kwxas0.js:54039-54121 placement
function _s(h) {
  let trimmed = h.trim();
  return !/\s/.test(trimmed) && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
//@ chunk-93kwxas0.js:54121-54198 placement
function Rd(h, E) {
  return h.intent.includes(E) || !!h.initialPrompt?.includes(E);
}
/**
 * 解析派发输入：! 命令、@ 提及（仓库/agent）、/ 技能等。
 */
//@ chunk-93kwxas0.js:54198-54983 placement
function parseDispatchInput(h, E, k = {}, C = []) {
  let trimmed = h.trim();
  if (nmt() && trimmed.startsWith("!")) {
    let trimmed_2 = trimmed.slice(1).trim();
    return { template: ace, intent: "", matched: !!trimmed_2, exec: trimmed_2 };
  }
  if (hr(trimmed)) return null;
  let T,
    A,
    L,
    keys = Object.keys(k),
    trimmed_2 = trimmed
      .replace(/(?:^|\s)@(\S+)/g, (K, W) => {
        let lower = W.toLowerCase(),
          found = E.find((ne) => ne.name.toLowerCase() === lower);
        if (found) return ((T ??= found), "");
        let found_2 = C.find((ne) => ne.name.toLowerCase() === lower);
        if (found_2) return ((L ??= found_2.name), "");
        let found_3 = keys.find((ne) => ne.toLowerCase() === lower);
        if (found_3) return ((A ??= k[found_3]), "");
        return K;
      })
      .trim(),
    search = trimmed_2.search(/\s/),
    lower = (search < 0 ? trimmed_2 : trimmed_2.slice(0, search)).toLowerCase(),
    X = T ? void 0 : E.find((K) => K.name.toLowerCase() === lower);
  if (X)
    return {
      template: X,
      intent: search < 0 ? "" : trimmed_2.slice(search + 1).trim(),
      matched: !0,
      cwd: A,
      routine: L,
    };
  if (T) return { template: T, intent: trimmed_2, matched: !0, cwd: A, routine: L };
  return { template: ace, intent: trimmed_2, matched: !1, cwd: A, routine: L };
}
/**
 * 文本是 http(s) 链接或绝对路径时转成可打开的 URL。
 */
//@ chunk-93kwxas0.js:54983-55128 placement
function toOpenableUrl(h) {
  let trimmed = h.trim();
  if (/\s/.test(trimmed)) return null;
  if (/^https?:\/\//.test(trimmed)) return ANY_CONTROL_CHAR_RE.test(trimmed) ? null : trimmed;
  let k = Lu(trimmed);
  return isAbsolute_2(k) ? toSafeFileUrl(k) : null;
}
/**
 * 输入里 “n:” 前缀的高亮区间。
 */
//@ chunk-93kwxas0.js:55128-55251 placement
function newSessionPrefixRanges(h) {
  if (!hr(h)) return [];
  let E = [];
  for (let k of h.matchAll(yd)) {
    let C = k.index + k[0].length;
    E.push([C - 2, C]);
  }
  return E;
}
/**
 * 输入中 @提及（已知名字）的高亮区间。
 */
//@ chunk-93kwxas0.js:55251-55423 placement
function mentionRanges(h, E) {
  let k = [];
  for (let C of h.matchAll(/(?:^|\s)@(\S+)/g)) {
    if (!E.has(C[1].toLowerCase())) continue;
    let x = C.index + C[0].length;
    k.push([x - C[1].length - 1, x]);
  }
  return k;
}
//@ chunk-93kwxas0.js:55423-55487 placement
function zc(h, E, k) {
  return h.replace(/[@/]\S*$/, () => `${E}${k} `);
}
/**
 * 找输入中第一个 @提及的模板（跳过同名 agent/技能）。
 */
//@ chunk-93kwxas0.js:55487-55742 placement
function findMentionedTemplate(h, E, k = [], C = []) {
  let x = new Set([...k, ...C].map((A) => A.name.toLowerCase())),
    keys = Object.keys(E);
  for (let A of h.matchAll(/(?:^|\s)@(\S+)/g)) {
    let lower = A[1].toLowerCase();
    if (x.has(lower)) continue;
    let found = keys.find((D) => D.toLowerCase() === lower);
    if (found) return E[found];
  }
  return;
}
/**
 * 派发建议种类标签与触发字符。
 */
//@ chunk-93kwxas0.js:55742-56282 placement
var SUGGESTION_KIND_LABELS = {
    agent: "background",
    repo: "repo",
    worktree: "worktree",
    skill: "skill",
    command: "command",
    workflow: "workflow",
    routine: "routine",
    model: "model",
  },
  Id = {
    agent: "@",
    repo: "@",
    worktree: "@",
    routine: "@",
    skill: "/",
    command: "/",
    workflow: "/",
    model: "/",
  },
  _h = {
    kind: "model",
    name: "model",
    description: "Set model for new sessions from this window (not saved)",
  },
  Xc = new Map([
    ["effort", "Set effort for new sessions from this window (not saved)"],
    ["fast", "Turn fast mode on or off for new sessions from this window (not saved)"],
    ["resume", "Resume a past session"],
  ]);
/**
 * 派发建议里的模型列表（含 “default”）。
 */
//@ chunk-93kwxas0.js:56282-56484 placement
function modelSuggestions() {
  return [
    ...getEnabledModelOptions()
      .filter((h) => h.value)
      .map((h) => ({ kind: "model", name: String(h.value), description: getFirstLine(h.description) })),
    { kind: "model", name: "default", description: "Reset to configured default" },
  ];
}
//@ chunk-93kwxas0.js:56484-56500 placement
var Od = [],
  Os = [];
//@ chunk-93kwxas0.js:56500-56578 placement
function vd(h) {
  return { kind: "agent", name: h.name, description: getFirstLine(h.description) };
}
/**
 * 按名字（不区分大小写）去重合并两组建议。
 */
//@ chunk-93kwxas0.js:56578-56735 placement
function mergeSuggestionsByName(h, E) {
  if (h === E || E.length === 0) return h;
  let k = new Set(h.map((C) => C.name.toLowerCase()));
  return [...h, ...E.filter((C) => !k.has(C.name.toLowerCase()))];
}
/**
 * 按 agentLastUsed 倒序、再按名字排序。
 */
//@ chunk-93kwxas0.js:56735-56901 placement
function sortAgentsByLastUsed(h) {
  let E = getGlobalConfig().agentLastUsed ?? {};
  return h.slice().sort((k, C) => {
    let x = E[k.name] ?? 0,
      T = E[C.name] ?? 0;
    if (x !== T) return T - x;
    return k.name.localeCompare(C.name);
  });
}
/**
 * 仓库或 worktree 建议项。
 */
//@ chunk-93kwxas0.js:56901-57032 placement
function repoOrWorktreeSuggestion(h, E, k) {
  let C = k[h];
  return C === void 0
    ? { kind: "repo", name: h, description: E[h] }
    : { kind: "worktree", name: h, description: C || E[h] };
}
/**
 * 根据输入生成派发建议（模板、routine、仓库、worktree、技能、模型）。
 */
//@ chunk-93kwxas0.js:57032-58896 placement
function buildDispatchSuggestions(
  h,
  {
    templates: templates = [],
    routines: routines = [],
    repos: repos = {},
    worktreeBranches: worktreeBranches = {},
    skills: skills = [],
    models: models = [],
    dispatch: dispatch,
    showAllAgents: showAllAgents = !1,
  },
) {
  let lower = firstLineOf(h, " ").toLowerCase(),
    startsWith = lower.startsWith("/"),
    match = h.match(/(?:^|\s)@(\S*)$/),
    X = match?.[1]?.toLowerCase(),
    K = match && findMentionedTemplate(h.slice(0, -match[0].length), repos, templates, routines) !== void 0,
    W = new Set(templates.map((we) => we.name.toLowerCase())),
    z = new Set([...W, ...routines.map((we) => we.name.toLowerCase())]),
    filtered = Object.keys(repos).filter((we) => !z.has(we.toLowerCase()) && !/\s/.test(we)),
    ge =
      X === void 0
        ? []
        : [
            ...sortAgentsByLastUsed(templates)
              .filter((we) => we.name.toLowerCase().startsWith(X))
              .map(vd),
            ...routines
              .filter((we) => we.name.toLowerCase().startsWith(X))
              .sort((we, Re) => we.name.localeCompare(Re.name)),
            ...(K
              ? []
              : filtered
                  .filter((we) => we.toLowerCase().startsWith(X))
                  .sort((we, Re) => we.localeCompare(Re))
                  .map((we) => repoOrWorktreeSuggestion(we, repos, worktreeBranches))),
          ],
    match_2 = h.match(/(?:^|\s)\/(\S*)$/),
    ne = match_2?.[1]?.toLowerCase(),
    ae =
      ne === void 0
        ? []
        : [...(startsWith ? [_h] : []), ...skills]
            .filter((we) => we.name.toLowerCase().includes(ne))
            .sort((we, Re) => {
              let startsWith = we.name.toLowerCase().startsWith(ne),
                startsWith_2 = Re.name.toLowerCase().startsWith(ne);
              return startsWith !== startsWith_2 ? (startsWith ? -1 : 1) : we.name.localeCompare(Re.name);
            }),
    match_3 = h.match(/^\s*\/model\s+(\S*)$/i),
    Je = match_3?.[1]?.toLowerCase(),
    le = Je === void 0 ? [] : models.filter((we) => we.name.toLowerCase().startsWith(Je)),
    Oe = startsWith
      ? []
      : [
          ...templates
            .filter((we) => we.name.toLowerCase().startsWith(lower))
            .sort((we, Re) => we.name.localeCompare(Re.name))
            .map(vd),
          ...routines
            .filter((we) => we.name.toLowerCase().startsWith(lower))
            .sort((we, Re) => we.name.localeCompare(Re.name)),
          ...filtered
            .filter((we) => we.toLowerCase().startsWith(lower))
            .sort((we, Re) => we.localeCompare(Re))
            .map((we) => repoOrWorktreeSuggestion(we, repos, worktreeBranches)),
          ...skills
            .filter((we) => we.name.toLowerCase().startsWith(lower))
            .sort((we, Re) => we.name.localeCompare(Re.name)),
        ],
    De =
      !dispatch || dispatch.exec !== void 0
        ? []
        : match_3
          ? le
          : match
            ? ge
            : match_2
              ? ae
              : showAllAgents && !h
                ? sortAgentsByLastUsed(templates).map(vd)
                : !dispatch.matched && lower && !h.includes(" ")
                  ? Oe
                  : [];
  return {
    firstWord: lower,
    isSlashQuery: startsWith,
    atMatch: match !== null,
    slashMatch: match_2 !== null,
    modelArgMatch: match_3 !== null,
    templateNames: W,
    repoNames: filtered,
    suggestions: De,
  };
}
/**
 * 平台对应的粘贴图片快捷键（非 Windows 用 Ctrl+V，Windows/WSL 用 Alt+V）。
 */
//@ chunk-93kwxas0.js:58896-59045 placement
function isPasteImageKey(h) {
  if (h.key !== "v") return !1;
  let E = getPlatform();
  if (h.ctrl && !h.meta) return E !== "windows";
  if (h.meta && !h.ctrl) return E === "windows" || E === "wsl";
  return !1;
}
/**
 * 从剪贴板读图片，成功回调，失败给出提示并记录。
 */
//@ chunk-93kwxas0.js:59045-59285 placement
function pasteImageFromClipboard(h, E) {
  getImageFromClipboard(imageLimitsForModel(getMainLoopModel()))
    .then((k) => {
      if (k) h(k);
      else (logFeatureBad("input_image_paste", "not_found"), E("No image found in clipboard"));
    })
    .catch((k) => {
      (logFeatureBad("input_image_paste", "clipboard_read_failed"),
        logError(k),
        E("Couldn't read an image from the clipboard"));
    });
}
/**
 * 回填 agentLastUsed 配置。
 */
//@ chunk-93kwxas0.js:59285-59669 placement
async function backfillAgentLastUsed(h) {
  let E = await listJobs(void 0, h).catch(() => []),
    k = !1;
  return (
    saveGlobalConfig((C) => {
      let x = C.agentLastUsed ?? {},
        T = { ...x };
      for (let A of E) {
        if (A.state.template === ace.name) continue;
        if (x[A.state.template] !== void 0) continue;
        let parse = Date.parse(A.state.createdAt);
        if (Number.isNaN(parse)) continue;
        if (parse > (T[A.state.template] ?? 0)) ((T[A.state.template] = parse), (k = !0));
      }
      if (!k) return C;
      return { ...C, agentLastUsed: T };
    }, h),
    k
  );
}
//@ chunk-93kwxas0.js:59669-59788 placement
var MAX_SPAWN_RETRIES = 4,
  STILL_STARTING_MESSAGE = "Still starting \u2014 try again in a moment",
  TRANSIENT_SOCKET_ERRORS = new Set(["EPIPE", "ECONNRESET", "ECONNREFUSED", "ENOTCONN"]);
/**
 * 调 respawnBgSession，异常转成 {ok:false, error}。
 */
//@ chunk-93kwxas0.js:59788-59894 placement
function safeRespawnBgSession(...h) {
  return respawnBgSession(...h).catch((E) => ({
    ok: !1,
    error: `Couldn't respawn \u2014 ${errorMessage(E)}`,
    alive: !1,
  }));
}
//@ chunk-93kwxas0.js:59894-59920 placement
var Ph = 150,
  weakMap = new WeakMap();
/**
 * 标记一次派发在同一事件循环片段内（微任务后清除）。
 */
//@ chunk-93kwxas0.js:59920-60026 placement
function markDispatchChunk(h) {
  let E = { sameChunk: !0, at: performance.now() };
  (weakMap.set(h, E),
    queueMicrotask(() => {
      E.sameChunk = !1;
    }));
}
//@ chunk-93kwxas0.js:60026-60117 placement
function Ah(h) {
  let E = weakMap.get(h);
  return E !== void 0 && (E.sameChunk || performance.now() - E.at < Ph);
}
/**
 * 设置新会话的模型/effort 并提示。
 */
//@ chunk-93kwxas0.js:60117-61243 placement
function setDispatchWindowValue(h, E, k, C, x) {
  let T = () => resolveDispatchDefaults({ launch: E, window: gi(h.getSnapshot()) }),
    A = C === "default";
  if (k === "model")
    (h.setSessionModel(A ? void 0 : C),
      h.setHint(
        A
          ? `Model for new sessions reset to ${T().model}`
          : `Model set to ${C} for new sessions from this window (not saved)`,
      ));
  else if (k === "effort") {
    let L = A ? void 0 : parseEffortLevel(C);
    h.setSessionEffort(L);
    let { model: model, effort: effort, effortOverridden: effortOverridden } = T();
    if (L === void 0)
      h.setHint(
        effort === void 0
          ? "Effort for new sessions reset to the default"
          : `Effort for new sessions reset to ${effort}`,
      );
    else {
      let N =
        effort === void 0
          ? ` \u2014 ${model} doesn't use an effort setting`
          : effort === L
            ? ""
            : effortOverridden
              ? ` \u2014 CLAUDE_CODE_EFFORT_LEVEL sets it to ${effort}`
              : ` \u2014 ${model} runs at ${effort}`;
      h.setHint(`Effort set to ${L} for new sessions from this window (not saved)${N}`);
    }
  } else {
    h.setSessionFastMode(A ? void 0 : C === "on");
    let { fast: fast, fastBlockedReason: fastBlockedReason } = T();
    h.setHint(
      A
        ? `Fast mode for new sessions reset to ${fast ?? "off"}`
        : `Fast mode ${C} for new sessions from this window (not saved)${x ? ". Cloud sessions don't get it" : ""}${fastBlockedReason ? `. Not applied here: ${fastBlockedReason}` : C === "on" ? ". It draws from usage credits at a higher rate." : ""}`,
    );
  }
  logFeatureOk("fleet_view_new_session_settings", { setting: fromEnum(k) });
}
/**
 * 生成模型/effort 选择项。
 */
//@ chunk-93kwxas0.js:61243-61752 placement
function buildDispatchValueOptions(h, E) {
  let {
      editor: editor,
      view: view,
      dispatchDefaults: dispatchDefaults,
      modelSuggestions: modelSuggestions,
    } = h,
    A = gi(editor.getSnapshot()),
    L = resolveDispatchDefaults({ launch: dispatchDefaults, window: A }),
    V = { value: "default", description: "Reset to configured default" },
    D =
      E === "model"
        ? modelSuggestions.map((N) => ({ value: N.name, description: N.description }))
        : E === "effort"
          ? [...EFFORT_LEVELS.map((N) => ({ value: N })), V]
          : [{ value: "on" }, { value: "off" }, V],
    U = E === "model" ? A.model : E === "effort" ? L.effort : (L.fast ?? "off");
  (editor.setError(null),
    editor.setHint(null),
    view.openSettingPicker(
      { setting: E, options: D },
      Math.max(
        0,
        D.findIndex((N) => N.value === U),
      ),
    ));
}

export {
  setDispatchWindowValue,
  STILL_STARTING_MESSAGE,
  parseNewSessionPrefix,
  isPasteImageKey,
  pasteImageFromClipboard,
  Xc,
  Rs,
  vs,
  listPastSessions,
  modelSuggestions,
  Od,
  Os,
  findMentionedTemplate,
  mergeSuggestionsByName,
  relaunchAgentsView,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT,
  Hc,
  ks,
  buildDispatchSuggestions,
  Id,
  zc,
  pruneReplyDrafts,
  backfillAgentLastUsed,
  SUGGESTION_KIND_LABELS,
  mentionRanges,
  newSessionPrefixRanges,
  composePolicyLimitsForFleet,
  safeRespawnBgSession,
  Ah,
  markDispatchChunk,
  buildDispatchValueOptions,
  wd,
  parseDispatchInput,
  MAX_SPAWN_RETRIES,
  TRANSIENT_SOCKET_ERRORS,
  parsePrNumber,
  Is,
  _s,
  jobReferencesPr,
  Rd,
  parseDispatchFlags,
  toOpenableUrl,
};
