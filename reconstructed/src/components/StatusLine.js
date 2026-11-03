/**
 * components/StatusLine.tsx
 *
 * 自定义状态栏：构造状态栏命令的 JSON 输入（会话、模型、成本、rate_limits、prompt_cache 等），按 refreshInterval 运行用户命令并显示输出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/StatusLine.tsx
 * pieces: chunk-18hwfzwa.js (10), chunk-e6aww6q8.js (13), chunk-hwmsct5x.js (2)
 * attribution: placement 15, fingerprint 3, layout 5, sole-consumer 1, affinity 1
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { getLastAssistantMessage } from "../utils/messages.js";
import { getGitWorktreeName, getRemoteUrl } from "../utils/git.js";
import { wt, Jn } from "../remote/remoteMode.js";
import { parseGitRemote } from "../utils/detectRepository.js";
import {
  getMainThreadAgentType,
  getSdkBetas,
  getTotalCostUSD,
  getTotalDuration,
  getTotalAPIDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  onAttacherCapsChange,
} from "../bootstrap/state.js";
import { getCurrentWorktreeSession } from "../utils/worktree.js";
import { getRuntimeMainLoopModel } from "../utils/model/planModeModel.js";
import { DEFAULT } from "../constants/outputStyles.js";
import {
  getLastApiUsage,
  buildContextWindowStatus,
  doesMostRecentAssistantMessageExceed200k,
  getContextTokenCount,
} from "../utils/tokens.js";
import { getContextWindow } from "../utils/model/configs.js";
import { getCurrentSessionDisplayTitle } from "../utils/sessionStorage.js";
import { getRawUtilization, lastLimitsObservationAt } from "../services/claudeAiLimits.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { Y0t, LXn } from "../commands/cost/usagePeriods.js";
import { planWindowPercent, utilizationPercent } from "../utils/format.js";
import { createBaseHookInput, executeStatusLineCommand } from "../utils/hooks.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { xo, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../utils/effort.js";
import { isThinkingEffectivelyEnabled } from "../utils/thinking.js";
import { logForDebugging } from "../utils/debug.js";
import { o, u, E, T } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage, getErrnoCode } from "../utils/errors.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { logError } from "../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logSetupIssues } from "../utils/notifications/setupIssues.js";
import { ec } from "../utils/timerDelayClamp.js";
import { Us } from "../services/projects/threadRows.js";
import { Qut } from "../utils/cwd.js";
import { getPromptCacheSummary, estimateRecacheTokens } from "../services/api/promptCacheBreakDetection.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsFullscreen, useRenderMode } from "../ink/renderModeContext.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useSession } from "../context/session.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { Cr, useAppState } from "../state/AppState.js";
import {
  selectToolPermissionContextMode4,
  selectToolPermissionContextAdditionalWorkingDirectories,
  bZt,
  selectThinkingEnabled,
  selectPrStatus2,
  selectRemoteSessionName,
  CZt,
  _Zt,
  capStatuslineIssueCount,
} from "./PromptInput/PromptInputFooterStatus.js";
import { qd } from "../hooks/useSettings.js";
import { getEffectiveStatusLine } from "../utils/hooks/hooksConfigSnapshot.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../hooks/useMainLoopModel.js";
import { sDe } from "../hooks/usePromptSuggestion.js";
import { dg } from "../context/QueuedMessageContext.js";
import { y, P, Rh, j, Se, yt } from "../../vendor/react/cjs/react.production.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { CollapseLabel } from "./TokenWarning.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { Ztn } from "./PromptInput/Notifications.js";
import { lVt } from "../context/replRootContext.js";
import { pi, jn } from "../services/lowPriority/headers.js";

//@ chunk-e6aww6q8.js:3685449-3685470 placement
var fDr = 300,
  pDr = 1000;
//@ chunk-e6aww6q8.js:3685470-3685535 placement
function QMn(e, n, r, s) {
  if (!e.current) return;
  ((e.current = !1), s(n, r()));
}
/**
 * 运行一次状态栏命令：未被中止时回调结果，并（去重后）上报输出字符数、显示宽度、行数与命令长度。
 */
//@ chunk-e6aww6q8.js:3685535-3685902 placement
async function runStatusLineCommand(e) {
  let {
      signal: signal,
      executeCommand: executeCommand,
      getCommandLength: getCommandLength,
      pendingResultLogRef: pendingResultLogRef,
      onResult: onResult,
      logFn: logFn,
    } = e,
    w = getCommandLength();
  try {
    let L = await executeCommand();
    if (signal.aborted) return;
    if ((onResult(L), L))
      QMn(
        pendingResultLogRef,
        "tengu_status_line_result",
        () => {
          let parts = L.split(`
`),
            q = 0;
          for (let Z of parts) {
            let Se = bunStringWidth(Z);
            if (Se > q) q = Se;
          }
          return { char_length: L.length, visual_width: q, line_count: parts.length, command_length: w };
        },
        logFn,
      );
  } catch {}
}
//@ chunk-e6aww6q8.js:3686171-3686212 placement
function getLastAssistantMessageId(messages) {
  return getLastAssistantMessage(messages)?.uuid ?? null;
}
/**
 * 并行取 git worktree 名与（非特殊环境下的）远程地址，返回 {gitWorktree, repo}。
 */
//@ chunk-e6aww6q8.js:3686212-3686344 placement
async function getStatusLineGitInfo(e) {
  let [n, r] = await Promise.all([getGitWorktreeName(e), wt() ? Promise.resolve(null) : getRemoteUrl()]);
  return { gitWorktree: n, repo: r ? parseGitRemote(r) : null };
}
//@ chunk-e6aww6q8.js:3686344-3688795 fingerprint = buildStatusLineCommandInput (0.609)
function buildStatusLineCommandInput({
  session: session,
  permissionMode: permissionMode,
  exceeds200kTokens: exceeds200kTokens,
  fastMode: fastMode,
  settings: settings,
  messages: messages,
  addedDirs: addedDirs,
  mainLoopModel: mainLoopModel,
  gitWorktree: gitWorktree,
  repo: repo,
  prStatus: prStatus,
  vimModeEnabled: vimModeEnabled,
  vimMode: vimMode,
  cwd: cwd,
  effortValue: effortValue,
  thinkingEnabled: thinkingEnabled,
  remoteSessionName: remoteSessionName,
  credentials: credentials,
}) {
  let agentType = getMainThreadAgentType(),
    worktreeSession = getCurrentWorktreeSession(),
    runtimeModel = getRuntimeMainLoopModel({
      permissionMode: permissionMode,
      mainLoopModel: mainLoopModel,
      exceeds200kTokens: exceeds200kTokens,
    }),
    lt = settings?.outputStyle || DEFAULT,
    currentUsage = getLastApiUsage(messages),
    contextWindowSize = getContextWindow(runtimeModel, getSdkBetas()),
    pt = remoteSessionName ?? getCurrentSessionDisplayTitle(session.id),
    sessionId = getRawUtilization(),
    yt;
  if (getAPIProvider() === "gateway" && sessionId.overage) {
    Y0t(lastLimitsObservationAt(), credentials);
    let rawUtil = LXn();
    yt =
      rawUtil !== void 0 &&
      (rawUtil.resetsAt === null ||
        Math.floor(Date.parse(rawUtil.resetsAt) / 1000) === sessionId.overage.resets_at)
        ? rawUtil
        : void 0;
  }
  let gt = {
    ...(sessionId.five_hour && {
      five_hour: {
        used_percentage: planWindowPercent(sessionId.five_hour.utilization),
        resets_at: sessionId.five_hour.resets_at,
      },
    }),
    ...(sessionId.seven_day && {
      seven_day: {
        used_percentage: planWindowPercent(sessionId.seven_day.utilization),
        resets_at: sessionId.seven_day.resets_at,
      },
    }),
    ...(getAPIProvider() === "gateway" &&
      sessionId.overage && {
        spend_limit: {
          used_percentage: utilizationPercent(sessionId.overage.utilization),
          resets_at: sessionId.overage.resets_at,
          ...(yt &&
            yt.currency === "USD" && {
              used_usd: yt.used / 100,
              limit_usd: yt.limit / 100,
              ...(yt.period && { period: yt.period }),
            }),
        },
      }),
  };
  return {
    ...createBaseHookInput(session, cwd),
    ...(pt && { session_name: pt }),
    model: { id: runtimeModel, display_name: renderModelName(runtimeModel) },
    workspace: {
      current_dir: cwd,
      project_dir: xo(session).originalCwd,
      added_dirs: addedDirs,
      ...(gitWorktree && { git_worktree: gitWorktree }),
      ...(repo && { repo: repo }),
    },
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    output_style: { name: lt },
    cost: {
      total_cost_usd: getTotalCostUSD(),
      ...!1,
      total_duration_ms: getTotalDuration(),
      total_api_duration_ms: getTotalAPIDuration(),
      total_lines_added: getTotalLinesAdded(),
      total_lines_removed: getTotalLinesRemoved(),
    },
    context_window: buildContextWindowStatus(currentUsage, contextWindowSize),
    exceeds_200k_tokens: exceeds200kTokens,
    ...buildPromptCacheStatus(),
    fast_mode: fastMode,
    ...(modelSupportsEffort(runtimeModel) && {
      effort: { level: getEffortLevelOrHigh(runtimeModel, effortValue) },
    }),
    thinking: { enabled: isThinkingEffectivelyEnabled(runtimeModel, thinkingEnabled) },
    ...((gt.five_hour || gt.seven_day || gt.spend_limit) && { rate_limits: gt }),
    ...(vimModeEnabled && { vim: { mode: vimMode ?? "INSERT" } }),
    ...(agentType && { agent: { name: agentType } }),
    ...(Jn() !== null && { remote: { session_id: session.id } }),
    ...(prStatus && {
      pr: {
        number: prStatus.number,
        url: prStatus.url,
        ...(prStatus.reviewState && { review_state: prStatus.reviewState }),
        ...(prStatus.kind && { kind: prStatus.kind }),
      },
    }),
    ...(worktreeSession && {
      worktree: {
        name: worktreeSession.worktreeName,
        path: worktreeSession.worktreePath,
        branch: worktreeSession.worktreeBranch,
        original_cwd: worktreeSession.originalCwd,
        original_branch: worktreeSession.originalBranch,
      },
    }),
  };
}
//@ chunk-e6aww6q8.js:3688795-3688821 layout
class JMn {
  lastText = void 0;
}
/**
 * 状态栏上次输出的存储，以及会触发状态栏刷新的状态字段名。
 */
//@ chunk-e6aww6q8.js:3688821-3688985 layout
var statusLineLastTextStore = new SessionRootSlot(() => new JMn()),
  STATUS_LINE_DEPENDENCY_KEYS = [
    "tokenUsage",
    "permissionMode",
    "vimMode",
    "mainLoopModel",
    "fastMode",
    "effortValue",
    "thinkingEnabled",
    "prStatus",
    "remoteSessionName",
  ];
//@ chunk-e6aww6q8.js:3688985-3689068 layout
function zot(e) {
  let n = e?.refreshInterval;
  return n === void 0 ? null : Math.max(1, n) * 1000;
}
//@ chunk-e6aww6q8.js:3689068-3689291 layout
function getEarliestRateLimitReset(e) {
  let filtered = [
    e.rate_limits?.five_hour?.resets_at,
    e.rate_limits?.seven_day?.resets_at,
    e.rate_limits?.spend_limit?.resets_at,
  ].filter((r) => r !== void 0 && Number.isFinite(r));
  return filtered.length === 0 ? null : Math.min(...filtered) * 1000;
}
//@ chunk-e6aww6q8.js:3689291-3689495 layout
function getNextStatusLineRefreshAt(e) {
  let filtered = [
    getEarliestRateLimitReset(e),
    e.prompt_cache?.warm && e.prompt_cache.expires_at !== null ? e.prompt_cache.expires_at * 1000 : null,
  ].filter((r) => r !== null && Number.isFinite(r));
  return filtered.length === 0 ? null : Math.min(...filtered);
}
//@ chunk-e6aww6q8.js:3689495-3692443 fingerprint = StatusLineInner (0.455)
class StatusLineInner {
  #e;
  #t;
  #n;
  #o = createSignal();
  #r = 0;
  #i = !1;
  #s = void 0;
  #a = null;
  #d = null;
  #c = null;
  #l = null;
  #u = null;
  #m = !1;
  #g = !0;
  #S = { current: !0 };
  #y = { current: !0 };
  #p = !1;
  constructor(e, n) {
    ((this.#e = e), (this.#t = n), (this.#n = { text: e.memory.lastText }));
  }
  getSnapshot = () => this.#n;
  subscribe = (e) => {
    let subscribe = this.#o.subscribe(e);
    if ((this.#r++, !this.#i)) this.#h();
    let r = !1;
    return () => {
      if (r) return;
      if (((r = !0), subscribe(), this.#r--, this.#r === 0)) this.#v();
    };
  };
  setInputs(e) {
    let n = this.#t;
    if (((this.#t = e), !this.#i)) return;
    let any = STATUS_LINE_DEPENDENCY_KEYS.some((h) => !Object.is(n[h], e[h])),
      s =
        !Object.is(n.lastAssistantMessageId, e.lastAssistantMessageId) &&
        e.lastAssistantMessageId !== this.#u;
    if (any || s) this.#_();
    if (zot(n.statusLine) !== zot(e.statusLine)) this.#f();
    if (n.statusLine?.command !== e.statusLine?.command)
      ((this.#g = !0), (this.#S.current = !0), (this.#y.current = !0), this.#b());
    this.#k();
  }
  #h() {
    ((this.#i = !0), this.#f(), this.#k(), this.#b());
  }
  #v() {
    ((this.#i = !1),
      this.#a?.(),
      (this.#a = null),
      this.#d?.(),
      (this.#d = null),
      this.#w(null),
      this.#s?.abort(),
      (this.#s = void 0));
  }
  #k() {
    let { statusLine: statusLine, settings: settings } = this.#t;
    if (!statusLine) return;
    if (
      (QMn(
        this.#S,
        "tengu_status_line_mount",
        () => ({ command_length: statusLine.command.length, padding: statusLine.padding }),
        this.#e.logEvent,
      ),
      this.#p)
    )
      return;
    if (((this.#p = !0), settings?.disableAllHooks === !0))
      logForDebugging("Status line is configured but disableAllHooks is true", { level: "warn" });
    if (!this.#e.isTrustAccepted())
      (logSetupIssues("statusline", 1),
        this.#e.onTrustBlocked(),
        logForDebugging("Status line command skipped: workspace trust not accepted", { level: "warn" }));
  }
  #_() {
    (this.#a?.(),
      (this.#a = this.#e.setTimeout(() => {
        ((this.#a = null), this.#b());
      }, fDr)));
  }
  #f() {
    (this.#d?.(), (this.#d = null));
    let e = zot(this.#t.statusLine);
    if (e === null) return;
    let min = Math.min(ec, e),
      r = () => {
        (this.#_(), (this.#d = this.#e.setTimeout(r, min)));
      };
    this.#d = this.#e.setTimeout(r, min);
  }
  #w(e) {
    if (e === this.#l) return;
    if ((this.#c?.(), (this.#c = null), (this.#l = e), e === null)) return;
    let min = Math.min(ec, Math.max(0, e + pDr - Date.now()));
    this.#c = this.#e.setTimeout(() => {
      ((this.#c = null), (this.#l = null), this.#_());
    }, min);
  }
  #b() {
    this.#s?.abort();
    let abortController = new AbortController();
    this.#s = abortController;
    let n = Us(this.#e.getMessages()),
      r = this.#g;
    this.#g = !1;
    let s = getLastAssistantMessageId(n);
    if (s !== this.#u) ((this.#u = s), (this.#m = doesMostRecentAssistantMessageExceed200k(n)));
    this.#E(abortController.signal, n, r, this.#m).catch(logError);
  }
  async #E(e, n, r, s) {
    let { session: session } = this.#e,
      cwd = xo(session).cwd,
      { gitWorktree: gitWorktree, repo: repo } = await this.#e.getWorkspaceGit(cwd);
    await runStatusLineCommand({
      signal: e,
      executeCommand: () => {
        let L = this.#t,
          G = buildStatusLineCommandInput({
            session: session,
            permissionMode: L.permissionMode,
            exceeds200kTokens: s,
            fastMode: L.fastMode,
            settings: L.settings,
            messages: n,
            addedDirs: Array.from(L.additionalWorkingDirectories.keys()),
            mainLoopModel: L.mainLoopModel,
            gitWorktree: gitWorktree,
            repo: repo,
            prStatus: L.prStatus,
            vimModeEnabled: this.#e.isVimModeEnabled(),
            vimMode: L.vimMode,
            cwd: Qut(cwd),
            effortValue: L.effortValue,
            thinkingEnabled: L.thinkingEnabled,
            remoteSessionName: L.remoteSessionName,
            credentials: this.#e.credentials,
          });
        if (!e.aborted) this.#w(getNextStatusLineRefreshAt(G));
        return this.#e.execute(G, e, r);
      },
      getCommandLength: () => this.#t.statusLine?.command.length,
      pendingResultLogRef: this.#y,
      onResult: (L) => this.#T(L),
      logFn: this.#e.logEvent,
    });
  }
  #T(e) {
    if (this.#n.text === e) return;
    ((this.#n = { text: e }), (this.#e.memory.lastText = e), this.#o.emit());
  }
}
/**
 * 构造状态栏输入里的 prompt_cache 段：是否热、TTL、过期时间、请求/未命中次数、命中率、写入与重建 token、最近一次未命中原因等。
 */
//@ chunk-e6aww6q8.js:3692443-3693330 sole-consumer
function buildPromptCacheStatus(now = Date.now()) {
  let summary = getPromptCacheSummary(void 0, now);
  if (summary.requests === 0 || summary.lastRequest === null) return {};
  return {
    prompt_cache: {
      warm: summary.warm,
      caching_observed: summary.cachingObserved,
      ttl: summary.lastRequest.ttl,
      expires_at: summary.expiresAt === null ? null : Math.ceil(summary.expiresAt / 1000),
      requests: summary.requests,
      misses: summary.misses,
      expected_rebuilds: summary.expectedRebuilds,
      hit_ratio: summary.hitRatio,
      cache_write_tokens: summary.cacheWriteTokens,
      miss_recache_tokens: summary.missRecacheTokens,
      last_miss_at: summary.lastMissAt === null ? null : Math.floor(summary.lastMissAt / 1000),
      last_miss_cause:
        summary.lastMissAttribution === null
          ? null
          : {
              causes: summary.lastMissAttribution.causes,
              ...(summary.lastMissAttribution.toolsAdded !== void 0 && {
                tools_added: summary.lastMissAttribution.toolsAdded,
                tools_removed: summary.lastMissAttribution.toolsRemoved ?? 0,
              }),
              ...(summary.lastMissAttribution.systemCharDelta !== void 0 && {
                system_char_delta: summary.lastMissAttribution.systemCharDelta,
              }),
            },
      miss_causes: summary.missCauses,
      recache_tokens_if_cold: estimateRecacheTokens(),
    },
  };
}
//@ chunk-18hwfzwa.js:802710-804967 placement
function StatusLine(h) {
  let $ = w(43),
    { transcript: transcript, vimMode: vimMode } = h,
    L = useIsFullscreen(),
    ee = useStoreSelector(transcript, getLastAssistantMessageId),
    ke = useStoreSelector(transcript, getContextTokenCount),
    Re = useSession(),
    { credentials: credentials } = Me(),
    He = useClock(),
    We = Cr(),
    ze = useAppState(selectToolPermissionContextMode4),
    Xe = useAppState(selectToolPermissionContextAdditionalWorkingDirectories),
    rt = qd();
  const kt = rt?.statusLine;
  let It;
  if ($[0] !== kt) ((It = getEffectiveStatusLine(kt)), ($[0] = kt), ($[1] = It));
  else It = $[1];
  let Ot = It,
    Et = useMainLoopModel_3(),
    Dt = useAppState(bZt),
    Lt = sDe(Dt, Et),
    oo = dg(),
    Xt = useAppState(selectThinkingEnabled),
    io = useAppState(selectPrStatus2),
    so = useAppState(selectRemoteSessionName),
    po;
  if (
    $[2] !== Xe ||
    $[3] !== He ||
    $[4] !== credentials ||
    $[5] !== oo ||
    $[6] !== Lt ||
    $[7] !== ee ||
    $[8] !== Et ||
    $[9] !== ze ||
    $[10] !== io ||
    $[11] !== so ||
    $[12] !== Re ||
    $[13] !== rt ||
    $[14] !== Ot ||
    $[15] !== We ||
    $[16] !== Xt ||
    $[17] !== ke ||
    $[18] !== transcript.getSnapshot ||
    $[19] !== vimMode
  )
    ((po = () =>
      new StatusLineInner(
        {
          session: Re,
          getMessages: transcript.getSnapshot,
          setTimeout: (ao, co) => He.setTimeout(ao, co),
          memory: statusLineLastTextStore.of(Re),
          execute: (bo, Ao, Bo) => executeStatusLineCommand(Re, bo, Ao, Bo),
          getWorkspaceGit: getStatusLineGitInfo,
          isVimModeEnabled: CZt,
          isTrustAccepted: _Zt,
          onTrustBlocked: () => We.setState(capStatuslineIssueCount),
          logEvent: logEvent,
          credentials: credentials,
        },
        {
          statusLine: Ot,
          settings: rt,
          lastAssistantMessageId: ee,
          tokenUsage: ke,
          permissionMode: ze,
          vimMode: vimMode,
          mainLoopModel: Et,
          fastMode: Lt,
          effortValue: oo,
          thinkingEnabled: Xt,
          prStatus: io,
          remoteSessionName: so,
          additionalWorkingDirectories: Xe,
        },
      )),
      ($[2] = Xe),
      ($[3] = He),
      ($[4] = credentials),
      ($[5] = oo),
      ($[6] = Lt),
      ($[7] = ee),
      ($[8] = Et),
      ($[9] = ze),
      ($[10] = io),
      ($[11] = so),
      ($[12] = Re),
      ($[13] = rt),
      ($[14] = Ot),
      ($[15] = We),
      ($[16] = Xt),
      ($[17] = ke),
      ($[18] = transcript.getSnapshot),
      ($[19] = vimMode),
      ($[20] = po));
  else po = $[20];
  let [Ro] = y(po),
    Ho,
    Io;
  if (
    $[21] !== Xe ||
    $[22] !== oo ||
    $[23] !== Lt ||
    $[24] !== ee ||
    $[25] !== Et ||
    $[26] !== ze ||
    $[27] !== io ||
    $[28] !== so ||
    $[29] !== Ro ||
    $[30] !== rt ||
    $[31] !== Ot ||
    $[32] !== Xt ||
    $[33] !== ke ||
    $[34] !== vimMode
  )
    ((Ho = () => {
      Ro.setInputs({
        statusLine: Ot,
        settings: rt,
        lastAssistantMessageId: ee,
        tokenUsage: ke,
        permissionMode: ze,
        vimMode: vimMode,
        mainLoopModel: Et,
        fastMode: Lt,
        effortValue: oo,
        thinkingEnabled: Xt,
        prStatus: io,
        remoteSessionName: so,
        additionalWorkingDirectories: Xe,
      });
    }),
      (Io = [Ro, Ot, rt, ee, ke, ze, vimMode, Et, Lt, oo, Xt, io, so, Xe]),
      ($[21] = Xe),
      ($[22] = oo),
      ($[23] = Lt),
      ($[24] = ee),
      ($[25] = Et),
      ($[26] = ze),
      ($[27] = io),
      ($[28] = so),
      ($[29] = Ro),
      ($[30] = rt),
      ($[31] = Ot),
      ($[32] = Xt),
      ($[33] = ke),
      ($[34] = vimMode),
      ($[35] = Ho),
      ($[36] = Io));
  else ((Ho = $[35]), (Io = $[36]));
  P(Ho, Io);
  let text = useStoreSelector(Ro).text,
    mn = Ot?.padding ?? 0,
    Cn;
  if ($[37] !== L || $[38] !== text)
    ((Cn = text ? e(StatusLineOutput, { text: text }) : L ? e(Text, { children: " " }) : null),
      ($[37] = L),
      ($[38] = text),
      ($[39] = Cn));
  else Cn = $[39];
  let No;
  if ($[40] !== mn || $[41] !== Cn)
    ((No = e(Box, { paddingX: mn, gap: 2, children: Cn })), ($[40] = mn), ($[41] = Cn), ($[42] = No));
  else No = $[42];
  return No;
}
/**
 * 渲染状态栏命令输出：单行直接截断显示，多行逐行展示（每行带上前几行累积的 ANSI 样式）。
 */
//@ chunk-18hwfzwa.js:804967-805476 placement
function StatusLineOutput(props) {
  let $ = w(11),
    { text: text } = props,
    Container,
    direction,
    rows,
    earlyResult;
  if ($[0] !== text) {
    earlyResult = EARLY_RETURN_SENTINEL;
    ze: {
      let lines = carryAnsiAcrossLines(text);
      if (lines.length === 1) {
        const He = e(Ansi, { children: text });
        let We;
        if ($[5] !== He)
          ((We = e(Text, { dimColor: !0, wrap: "truncate", children: He })), ($[5] = He), ($[6] = We));
        else We = $[6];
        earlyResult = We;
        break ze;
      }
      Container = Box;
      direction = "column";
      rows = lines.map(CollapseLabel);
    }
    (($[0] = text), ($[1] = Container), ($[2] = direction), ($[3] = rows), ($[4] = earlyResult));
  } else ((Container = $[1]), (direction = $[2]), (rows = $[3]), (earlyResult = $[4]));
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let He;
  if ($[7] !== Container || $[8] !== direction || $[9] !== rows)
    ((He = e(Container, { flexDirection: direction, children: rows })),
      ($[7] = Container),
      ($[8] = direction),
      ($[9] = rows),
      ($[10] = He));
  else He = $[10];
  return He;
}
//@ chunk-18hwfzwa.js:805476-805537 placement
var hZt = /\x1b\[[\d;]*m|\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/g;
//@ chunk-18hwfzwa.js:805537-805707 placement
function carryAnsiAcrossLines(h) {
  let parts = h.split(`
`);
  if (parts.length === 1) return parts;
  let D = [parts[0]],
    L = "";
  for (let ee = 1; ee < parts.length; ee++)
    ((L += (parts[ee - 1].match(hZt) ?? []).join("")), D.push(L + parts[ee]));
  return D;
}
//@ chunk-18hwfzwa.js:805707-805723 placement
var the = Rh(StatusLine);
//@ chunk-18hwfzwa.js:805723-805727 placement
j();
/**
 * 读取渲染模式、终端行数与附着端能力等状态（结果未使用），恒返回 false。
 */
//@ chunk-18hwfzwa.js:805727-805840 placement
function useStatusLineSuppressed() {
  let h = useRenderMode(),
    rows = useTerminalSize().rows,
    D = Se(Ztn) ?? rows,
    L = yt(onAttacherCapsChange, () => !1);
  yt(xZt, () => !1);
  let ee = Se(lVt) !== null;
  return !1;
}
//@ chunk-18hwfzwa.js:805840-805868 placement
function xZt() {
  return () => {};
}
//@ chunk-18hwfzwa.js:805868-805872 placement
j();
//@ chunk-18hwfzwa.js:805872-805876 placement
j();
//@ chunk-hwmsct5x.js:186950-187013 affinity
function Vn(e, n) {
  return typeof e === "string" && e.trim() !== "" ? e : n;
}
//@ chunk-hwmsct5x.js:187013-187320 fingerprint = statusLineShouldDisplay (0.301)
function statusLineShouldDisplay() {
  let e = pi();
  return {
    label: Vn(e.label, jn.label),
    noticeLine: Vn(e.noticeLine, jn.noticeLine),
    statusLine: Vn(e.statusLine, jn.statusLine),
    allowanceNote: Vn(e.allowanceNote, jn.allowanceNote),
    waitBanner: Vn(e.waitBanner, jn.waitBanner),
    budgetExhaustedCopy: Vn(e.budgetExhaustedCopy, jn.budgetExhaustedCopy),
  };
}

export { statusLineShouldDisplay, useStatusLineSuppressed, the };
