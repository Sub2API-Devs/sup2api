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
import { getToastyBreezeConfig, LOW_PRIORITY_COPY } from "../services/lowPriority/headers.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getLastAssistantMessage } from "../utils/messages.js";
import { getGitWorktreeName, getRemoteUrl } from "../utils/git.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../remote/remoteMode.js";
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
import { maybeRefreshGatewayUsage, cachedGatewayUsage } from "../commands/cost/usagePeriods.js";
import { planWindowPercent, utilizationPercent } from "../utils/format.js";
import { createBaseHookInput, executeStatusLineCommand } from "../utils/hooks.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { getSessionProject, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../utils/effort.js";
import { isThinkingEffectivelyEnabled } from "../utils/thinking.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema, objectSchema, numberSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
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
import { MAX_TIMER_DELAY_MS } from "../utils/timerDelayClamp.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { applyCloudCwd } from "../utils/cwd.js";
import { getPromptCacheSummary, estimateRecacheTokens } from "../services/api/promptCacheBreakDetection.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useIsFullscreen, useRenderMode } from "../ink/renderModeContext.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useSession } from "../context/session.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useAppStoreDirect, useAppState } from "../state/AppState.js";
import {
  selectToolPermissionContextMode4,
  selectToolPermissionContextAdditionalWorkingDirectories,
  selectFastMode_2,
  selectThinkingEnabled,
  selectPrStatus2,
  selectRemoteSessionName,
  getEditorModes,
  isProjectTrustAccepted,
  capStatuslineIssueCount,
} from "./PromptInput/PromptInputFooterStatus.js";
import { useSettingsState } from "../hooks/useSettings.js";
import { getEffectiveStatusLine } from "../utils/hooks/hooksConfigSnapshot.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../hooks/useMainLoopModel.js";
import { useFastModeOnForModel } from "../hooks/usePromptSuggestion.js";
import { useQueuedMessageText } from "../context/QueuedMessageContext.js";
import {
  useState,
  useEffect,
  memo,
  init_react_production,
  useContext,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { CollapseLabel } from "./TokenWarning.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { noticeDialogSlot } from "./PromptInput/Notifications.js";
import { rootSessionSlot } from "../context/replRootContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:186950-187013 affinity
function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}
//@ chunk-hwmsct5x.js:187013-187320 fingerprint (2.1.88 match: statusLineShouldDisplay, 0.301)
function statusLineShouldDisplay() {
  let toastyBreezeConfig = getToastyBreezeConfig();
  return {
    label: textOrFallback(toastyBreezeConfig.label, LOW_PRIORITY_COPY.label),
    noticeLine: textOrFallback(toastyBreezeConfig.noticeLine, LOW_PRIORITY_COPY.noticeLine),
    statusLine: textOrFallback(toastyBreezeConfig.statusLine, LOW_PRIORITY_COPY.statusLine),
    allowanceNote: textOrFallback(toastyBreezeConfig.allowanceNote, LOW_PRIORITY_COPY.allowanceNote),
    waitBanner: textOrFallback(toastyBreezeConfig.waitBanner, LOW_PRIORITY_COPY.waitBanner),
    budgetExhaustedCopy: textOrFallback(
      toastyBreezeConfig.budgetExhaustedCopy,
      LOW_PRIORITY_COPY.budgetExhaustedCopy,
    ),
  };
}
//@ chunk-e6aww6q8.js:3685449-3685470 placement
var STATUS_LINE_SETTLE_MS = 300;
var STATUS_LINE_REDRAW_MS = 1000;
//@ chunk-e6aww6q8.js:3685470-3685535 placement
function logStatusLineEventOnce(ref, event, getFields, logFn) {
  if (!ref.current) return;
  ref.current = false;
  logFn(event, getFields());
}
//@ chunk-e6aww6q8.js:3685535-3685902 placement
/**
 * 运行一次状态栏命令：未被中止时回调结果，并（去重后）上报输出字符数、显示宽度、行数与命令长度。
 */
async function runStatusLineCommand(options) {
  let { signal, executeCommand, getCommandLength, pendingResultLogRef, onResult, logFn } = options;
  let commandLength = getCommandLength();
  try {
    let result = await executeCommand();
    if (signal.aborted) return;
    onResult(result);
    if (result)
      logStatusLineEventOnce(
        pendingResultLogRef,
        "tengu_status_line_result",
        () => {
          let lines = result.split(`
`);
          let command = 0;
          for (let line of lines) {
            let fields = bunStringWidth(line);
            if (fields > command) command = fields;
          }
          return {
            char_length: result.length,
            visual_width: command,
            line_count: lines.length,
            command_length: commandLength,
          };
        },
        logFn,
      );
  } catch {}
}
//@ chunk-e6aww6q8.js:3686171-3686212 placement
function getLastAssistantMessageId(messages) {
  return getLastAssistantMessage(messages)?.uuid ?? null;
}
//@ chunk-e6aww6q8.js:3686212-3686344 placement
/**
 * 并行取 git worktree 名与（非特殊环境下的）远程地址，返回 {gitWorktree, repo}。
 */
async function getStatusLineGitInfo(cwd) {
  let [gitWorktreeName, remoteUrl] = await Promise.all([
    getGitWorktreeName(cwd),
    isRemoteSessionAvailable() ? Promise.resolve(null) : getRemoteUrl(),
  ]);
  return {
    gitWorktree: gitWorktreeName,
    repo: remoteUrl ? parseGitRemote(remoteUrl) : null,
  };
}
//@ chunk-e6aww6q8.js:3686344-3688795 fingerprint (2.1.88 match: buildStatusLineCommandInput, 0.609)
function buildStatusLineCommandInput({
  session,
  permissionMode,
  exceeds200kTokens,
  fastMode,
  settings,
  messages,
  addedDirs,
  mainLoopModel,
  gitWorktree,
  repo,
  prStatus,
  vimModeEnabled,
  vimMode,
  cwd,
  effortValue,
  thinkingEnabled,
  remoteSessionName,
  credentials,
}) {
  let agentType = getMainThreadAgentType();
  let worktreeSession = getCurrentWorktreeSession();
  let runtimeModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel,
    exceeds200kTokens,
  });
  let outputStyleName = settings?.outputStyle || DEFAULT;
  let currentUsage = getLastApiUsage(messages);
  let contextWindowSize = getContextWindow(runtimeModel, getSdkBetas());
  let sessionName = remoteSessionName ?? getCurrentSessionDisplayTitle(session.id);
  let sessionId = getRawUtilization();
  let rawUtil;
  if (getAPIProvider() === "gateway" && sessionId.overage) {
    maybeRefreshGatewayUsage(lastLimitsObservationAt(), credentials);
    let rawUtil_2 = cachedGatewayUsage();
    rawUtil =
      rawUtil_2 !== undefined &&
      (rawUtil_2.resetsAt === null ||
        Math.floor(Date.parse(rawUtil_2.resetsAt) / 1000) === sessionId.overage.resets_at)
        ? rawUtil_2
        : undefined;
  }
  let rateLimits = {
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
          ...(rawUtil &&
            rawUtil.currency === "USD" && {
              used_usd: rawUtil.used / 100,
              limit_usd: rawUtil.limit / 100,
              ...(rawUtil.period && {
                period: rawUtil.period,
              }),
            }),
        },
      }),
  };
  return {
    ...createBaseHookInput(session, cwd),
    ...(sessionName && {
      session_name: sessionName,
    }),
    model: {
      id: runtimeModel,
      display_name: renderModelName(runtimeModel),
    },
    workspace: {
      current_dir: cwd,
      project_dir: getSessionProject(session).originalCwd,
      added_dirs: addedDirs,
      ...(gitWorktree && {
        git_worktree: gitWorktree,
      }),
      ...(repo && {
        repo,
      }),
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
    output_style: {
      name: outputStyleName,
    },
    cost: {
      total_cost_usd: getTotalCostUSD(),
      ...false,
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
      effort: {
        level: getEffortLevelOrHigh(runtimeModel, effortValue),
      },
    }),
    thinking: {
      enabled: isThinkingEffectivelyEnabled(runtimeModel, thinkingEnabled),
    },
    ...((rateLimits.five_hour || rateLimits.seven_day || rateLimits.spend_limit) && {
      rate_limits: rateLimits,
    }),
    ...(vimModeEnabled && {
      vim: {
        mode: vimMode ?? "INSERT",
      },
    }),
    ...(agentType && {
      agent: {
        name: agentType,
      },
    }),
    ...(getRemoteCaps() !== null && {
      remote: {
        session_id: session.id,
      },
    }),
    ...(prStatus && {
      pr: {
        number: prStatus.number,
        url: prStatus.url,
        ...(prStatus.reviewState && {
          review_state: prStatus.reviewState,
        }),
        ...(prStatus.kind && {
          kind: prStatus.kind,
        }),
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
class StatusLineLastTextStore {
  lastText = undefined;
}
//@ chunk-e6aww6q8.js:3688821-3688985 layout
/**
 * 状态栏上次输出的存储，以及会触发状态栏刷新的状态字段名。
 */
var statusLineLastTextStore; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var STATUS_LINE_DEPENDENCY_KEYS;
deferInit("chunk-e6aww6q8.js:3688821", () => {
  statusLineLastTextStore = new SessionRootSlot(() => new StatusLineLastTextStore());
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
});
//@ chunk-e6aww6q8.js:3688985-3689068 layout
function statusLineRefreshMs(statusLine) {
  let refreshInterval = statusLine?.refreshInterval;
  return refreshInterval === undefined ? null : Math.max(1, refreshInterval) * 1000;
}
//@ chunk-e6aww6q8.js:3689068-3689291 layout
function getEarliestRateLimitReset(utilization) {
  let filtered = [
    utilization.rate_limits?.five_hour?.resets_at,
    utilization.rate_limits?.seven_day?.resets_at,
    utilization.rate_limits?.spend_limit?.resets_at,
  ].filter((resetAt) => resetAt !== undefined && Number.isFinite(resetAt));
  return filtered.length === 0 ? null : Math.min(...filtered) * 1000;
}
//@ chunk-e6aww6q8.js:3689291-3689495 layout
function getNextStatusLineRefreshAt(utilization) {
  let filtered = [
    getEarliestRateLimitReset(utilization),
    utilization.prompt_cache?.warm && utilization.prompt_cache.expires_at !== null
      ? utilization.prompt_cache.expires_at * 1000
      : null,
  ].filter((resetAt) => resetAt !== null && Number.isFinite(resetAt));
  return filtered.length === 0 ? null : Math.min(...filtered);
}
//@ chunk-e6aww6q8.js:3689495-3692443 fingerprint (2.1.88 match: StatusLineInner, 0.455)
class StatusLineInner {
  #e;
  #t;
  #n;
  #o = createSignal();
  #r = 0;
  #i = false;
  #s = undefined;
  #a = null;
  #d = null;
  #c = null;
  #l = null;
  #u = null;
  #m = false;
  #g = true;
  #S = {
    current: true,
  };
  #y = {
    current: true,
  };
  #p = false;
  constructor(executor, initialInputs) {
    this.#e = executor;
    this.#t = initialInputs;
    this.#n = {
      text: executor.memory.lastText,
    };
  }
  getSnapshot = () => this.#n;
  subscribe = (onChanged) => {
    let unsubscribeStore = this.#o.subscribe(onChanged);
    this.#r++;
    if (!this.#i) this.#h();
    let isReleased = false;
    return () => {
      if (isReleased) return;
      isReleased = true;
      unsubscribeStore();
      this.#r--;
      if (this.#r === 0) this.#v();
    };
  };
  setInputs(nextInputs) {
    let previousInputs = this.#t;
    this.#t = nextInputs;
    if (!this.#i) return;
    let any = STATUS_LINE_DEPENDENCY_KEYS.some((key) => !Object.is(previousInputs[key], nextInputs[key]));
    let messageChanged =
      !Object.is(previousInputs.lastAssistantMessageId, nextInputs.lastAssistantMessageId) &&
      nextInputs.lastAssistantMessageId !== this.#u;
    if (any || messageChanged) this.#_();
    if (statusLineRefreshMs(previousInputs.statusLine) !== statusLineRefreshMs(nextInputs.statusLine))
      this.#f();
    if (previousInputs.statusLine?.command !== nextInputs.statusLine?.command) {
      this.#g = true;
      this.#S.current = true;
      this.#y.current = true;
      this.#b();
    }
    this.#k();
  }
  #h() {
    this.#i = true;
    this.#f();
    this.#k();
    this.#b();
  }
  #v() {
    this.#i = false;
    this.#a?.();
    this.#a = null;
    this.#d?.();
    this.#d = null;
    this.#w(null);
    this.#s?.abort();
    this.#s = undefined;
  }
  #k() {
    let { statusLine, settings } = this.#t;
    if (!statusLine) return;
    logStatusLineEventOnce(
      this.#S,
      "tengu_status_line_mount",
      () => ({
        command_length: statusLine.command.length,
        padding: statusLine.padding,
      }),
      this.#e.logEvent,
    );
    if (this.#p) return;
    this.#p = true;
    if (settings?.disableAllHooks === true)
      logForDebugging("Status line is configured but disableAllHooks is true", {
        level: "warn",
      });
    if (!this.#e.isTrustAccepted()) {
      logSetupIssues("statusline", 1);
      this.#e.onTrustBlocked();
      logForDebugging("Status line command skipped: workspace trust not accepted", {
        level: "warn",
      });
    }
  }
  #_() {
    this.#a?.();
    this.#a = this.#e.setTimeout(() => {
      this.#a = null;
      this.#b();
    }, STATUS_LINE_SETTLE_MS);
  }
  #f() {
    this.#d?.();
    this.#d = null;
    let refreshMs = statusLineRefreshMs(this.#t.statusLine);
    if (refreshMs === null) return;
    let min = Math.min(MAX_TIMER_DELAY_MS, refreshMs);
    let tick = () => {
      this.#_();
      this.#d = this.#e.setTimeout(tick, min);
    };
    this.#d = this.#e.setTimeout(tick, min);
  }
  #w(nextRefreshAt) {
    if (nextRefreshAt === this.#l) return;
    this.#c?.();
    this.#c = null;
    this.#l = nextRefreshAt;
    if (nextRefreshAt === null) return;
    let min = Math.min(MAX_TIMER_DELAY_MS, Math.max(0, nextRefreshAt + STATUS_LINE_REDRAW_MS - Date.now()));
    this.#c = this.#e.setTimeout(() => {
      this.#c = null;
      this.#l = null;
      this.#_();
    }, min);
  }
  #b() {
    this.#s?.abort();
    let abortController = new AbortController();
    this.#s = abortController;
    let messages = messagesSinceCompactBoundary(this.#e.getMessages());
    let forceRefresh = this.#g;
    this.#g = false;
    let lastAssistantMessageId = getLastAssistantMessageId(messages);
    if (lastAssistantMessageId !== this.#u) {
      this.#u = lastAssistantMessageId;
      this.#m = doesMostRecentAssistantMessageExceed200k(messages);
    }
    this.#E(abortController.signal, messages, forceRefresh, this.#m).catch(logError);
  }
  async #E(signal, messages, isCommandRefresh, exceeds200kTokens) {
    let { session } = this.#e;
    let cwd = getSessionProject(session).cwd;
    let { gitWorktree, repo } = await this.#e.getWorkspaceGit(cwd);
    await runStatusLineCommand({
      signal,
      executeCommand: () => {
        let inputs = this.#t;
        let statusLineCommandInput = buildStatusLineCommandInput({
          session,
          permissionMode: inputs.permissionMode,
          exceeds200kTokens,
          fastMode: inputs.fastMode,
          settings: inputs.settings,
          messages,
          addedDirs: Array.from(inputs.additionalWorkingDirectories.keys()),
          mainLoopModel: inputs.mainLoopModel,
          gitWorktree,
          repo,
          prStatus: inputs.prStatus,
          vimModeEnabled: this.#e.isVimModeEnabled(),
          vimMode: inputs.vimMode,
          cwd: applyCloudCwd(cwd),
          effortValue: inputs.effortValue,
          thinkingEnabled: inputs.thinkingEnabled,
          remoteSessionName: inputs.remoteSessionName,
          credentials: this.#e.credentials,
        });
        if (!signal.aborted) this.#w(getNextStatusLineRefreshAt(statusLineCommandInput));
        return this.#e.execute(statusLineCommandInput, signal, isCommandRefresh);
      },
      getCommandLength: () => this.#t.statusLine?.command.length,
      pendingResultLogRef: this.#y,
      onResult: (result) => this.#T(result),
      logFn: this.#e.logEvent,
    });
  }
  #T(text) {
    if (this.#n.text === text) return;
    this.#n = {
      text,
    };
    this.#e.memory.lastText = text;
    this.#o.emit();
  }
}
//@ chunk-e6aww6q8.js:3692443-3693330 sole-consumer
/**
 * 构造状态栏输入里的 prompt_cache 段：是否热、TTL、过期时间、请求/未命中次数、命中率、写入与重建 token、最近一次未命中原因等。
 */
function buildPromptCacheStatus(now = Date.now()) {
  let summary = getPromptCacheSummary(undefined, now);
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
              ...(summary.lastMissAttribution.toolsAdded !== undefined && {
                tools_added: summary.lastMissAttribution.toolsAdded,
                tools_removed: summary.lastMissAttribution.toolsRemoved ?? 0,
              }),
              ...(summary.lastMissAttribution.systemCharDelta !== undefined && {
                system_char_delta: summary.lastMissAttribution.systemCharDelta,
              }),
            },
      miss_causes: summary.missCauses,
      recache_tokens_if_cold: estimateRecacheTokens(),
    },
  };
}
//@ chunk-18hwfzwa.js:802710-804967 placement
function StatusLine(props) {
  let $ = useMemoCache(43);
  let { transcript, vimMode } = props;
  let isFullscreen = useIsFullscreen();
  let storeSelector = useStoreSelector(transcript, getLastAssistantMessageId);
  let storeSelector_2 = useStoreSelector(transcript, getContextTokenCount);
  let statusLineInput = useSession();
  let { credentials } = useTheme_2();
  let clock = useClock();
  let appStoreDirect = useAppStoreDirect();
  let appState = useAppState(selectToolPermissionContextMode4);
  let appState_2 = useAppState(selectToolPermissionContextAdditionalWorkingDirectories);
  let settingsState = useSettingsState();
  const statusLine = settingsState?.statusLine;
  let effectiveStatusLine;
  if ($[0] !== statusLine) {
    effectiveStatusLine = getEffectiveStatusLine(statusLine);
    $[0] = statusLine;
    $[1] = effectiveStatusLine;
  } else effectiveStatusLine = $[1];
  let statusLineConfig = effectiveStatusLine;
  let mainLoopModel = useMainLoopModel_3();
  let appState_3 = useAppState(selectFastMode_2);
  let fastModeOnForModel = useFastModeOnForModel(appState_3, mainLoopModel);
  let queuedMessageText = useQueuedMessageText();
  let appState_4 = useAppState(selectThinkingEnabled);
  let appState_5 = useAppState(selectPrStatus2);
  let appState_6 = useAppState(selectRemoteSessionName);
  let createStatusLine;
  if (
    $[2] !== appState_2 ||
    $[3] !== clock ||
    $[4] !== credentials ||
    $[5] !== queuedMessageText ||
    $[6] !== fastModeOnForModel ||
    $[7] !== storeSelector ||
    $[8] !== mainLoopModel ||
    $[9] !== appState ||
    $[10] !== appState_5 ||
    $[11] !== appState_6 ||
    $[12] !== statusLineInput ||
    $[13] !== settingsState ||
    $[14] !== statusLineConfig ||
    $[15] !== appStoreDirect ||
    $[16] !== appState_4 ||
    $[17] !== storeSelector_2 ||
    $[18] !== transcript.getSnapshot ||
    $[19] !== vimMode
  ) {
    createStatusLine = () =>
      new StatusLineInner(
        {
          session: statusLineInput,
          getMessages: transcript.getSnapshot,
          setTimeout: (fn, delayMs) => clock.setTimeout(fn, delayMs),
          memory: statusLineLastTextStore.of(statusLineInput),
          execute: (signal, timeoutMs, logResult) =>
            executeStatusLineCommand(statusLineInput, signal, timeoutMs, logResult),
          getWorkspaceGit: getStatusLineGitInfo,
          isVimModeEnabled: getEditorModes,
          isTrustAccepted: isProjectTrustAccepted,
          onTrustBlocked: () => appStoreDirect.setState(capStatuslineIssueCount),
          logEvent,
          credentials,
        },
        {
          statusLine: statusLineConfig,
          settings: settingsState,
          lastAssistantMessageId: storeSelector,
          tokenUsage: storeSelector_2,
          permissionMode: appState,
          vimMode,
          mainLoopModel,
          fastMode: fastModeOnForModel,
          effortValue: queuedMessageText,
          thinkingEnabled: appState_4,
          prStatus: appState_5,
          remoteSessionName: appState_6,
          additionalWorkingDirectories: appState_2,
        },
      );
    $[2] = appState_2;
    $[3] = clock;
    $[4] = credentials;
    $[5] = queuedMessageText;
    $[6] = fastModeOnForModel;
    $[7] = storeSelector;
    $[8] = mainLoopModel;
    $[9] = appState;
    $[10] = appState_5;
    $[11] = appState_6;
    $[12] = statusLineInput;
    $[13] = settingsState;
    $[14] = statusLineConfig;
    $[15] = appStoreDirect;
    $[16] = appState_4;
    $[17] = storeSelector_2;
    $[18] = transcript.getSnapshot;
    $[19] = vimMode;
    $[20] = createStatusLine;
  } else createStatusLine = $[20];
  let [statusLineStore] = useState(createStatusLine);
  let syncInputsEffect;
  let syncInputsDeps;
  if (
    $[21] !== appState_2 ||
    $[22] !== queuedMessageText ||
    $[23] !== fastModeOnForModel ||
    $[24] !== storeSelector ||
    $[25] !== mainLoopModel ||
    $[26] !== appState ||
    $[27] !== appState_5 ||
    $[28] !== appState_6 ||
    $[29] !== statusLineStore ||
    $[30] !== settingsState ||
    $[31] !== statusLineConfig ||
    $[32] !== appState_4 ||
    $[33] !== storeSelector_2 ||
    $[34] !== vimMode
  ) {
    syncInputsEffect = () => {
      statusLineStore.setInputs({
        statusLine: statusLineConfig,
        settings: settingsState,
        lastAssistantMessageId: storeSelector,
        tokenUsage: storeSelector_2,
        permissionMode: appState,
        vimMode,
        mainLoopModel,
        fastMode: fastModeOnForModel,
        effortValue: queuedMessageText,
        thinkingEnabled: appState_4,
        prStatus: appState_5,
        remoteSessionName: appState_6,
        additionalWorkingDirectories: appState_2,
      });
    };
    syncInputsDeps = [
      statusLineStore,
      statusLineConfig,
      settingsState,
      storeSelector,
      storeSelector_2,
      appState,
      vimMode,
      mainLoopModel,
      fastModeOnForModel,
      queuedMessageText,
      appState_4,
      appState_5,
      appState_6,
      appState_2,
    ];
    $[21] = appState_2;
    $[22] = queuedMessageText;
    $[23] = fastModeOnForModel;
    $[24] = storeSelector;
    $[25] = mainLoopModel;
    $[26] = appState;
    $[27] = appState_5;
    $[28] = appState_6;
    $[29] = statusLineStore;
    $[30] = settingsState;
    $[31] = statusLineConfig;
    $[32] = appState_4;
    $[33] = storeSelector_2;
    $[34] = vimMode;
    $[35] = syncInputsEffect;
    $[36] = syncInputsDeps;
  } else {
    syncInputsEffect = $[35];
    syncInputsDeps = $[36];
  }
  useEffect(syncInputsEffect, syncInputsDeps);
  let text = useStoreSelector(statusLineStore).text;
  let paddingX = statusLineConfig?.padding ?? 0;
  let children;
  if ($[37] !== isFullscreen || $[38] !== text) {
    children = text
      ? jsxProd_default(StatusLineOutput, {
          text,
        })
      : isFullscreen
        ? jsxProd_default(Text, {
            children: " ",
          })
        : null;
    $[37] = isFullscreen;
    $[38] = text;
    $[39] = children;
  } else children = $[39];
  let boxElement;
  if ($[40] !== paddingX || $[41] !== children) {
    boxElement = jsxProd_default(Box, {
      paddingX,
      gap: 2,
      children,
    });
    $[40] = paddingX;
    $[41] = children;
    $[42] = boxElement;
  } else boxElement = $[42];
  return boxElement;
}
//@ chunk-18hwfzwa.js:804967-805476 placement
/**
 * 渲染状态栏命令输出：单行直接截断显示，多行逐行展示（每行带上前几行累积的 ANSI 样式）。
 */
function StatusLineOutput(props) {
  let $ = useMemoCache(11);
  let { text } = props;
  let Container;
  let direction;
  let rows;
  let earlyResult;
  if ($[0] !== text) {
    earlyResult = EARLY_RETURN_SENTINEL;
    ze: {
      let lines = carryAnsiAcrossLines(text);
      if (lines.length === 1) {
        const children = jsxProd_default(Ansi, {
          children: text,
        });
        let singleLine;
        if ($[5] !== children) {
          singleLine = jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children,
          });
          $[5] = children;
          $[6] = singleLine;
        } else singleLine = $[6];
        earlyResult = singleLine;
        break ze;
      }
      Container = Box;
      direction = "column";
      rows = lines.map(CollapseLabel);
    }
    $[0] = text;
    $[1] = Container;
    $[2] = direction;
    $[3] = rows;
    $[4] = earlyResult;
  } else {
    Container = $[1];
    direction = $[2];
    rows = $[3];
    earlyResult = $[4];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let containerElement;
  if ($[7] !== Container || $[8] !== direction || $[9] !== rows) {
    containerElement = jsxProd_default(Container, {
      flexDirection: direction,
      children: rows,
    });
    $[7] = Container;
    $[8] = direction;
    $[9] = rows;
    $[10] = containerElement;
  } else containerElement = $[10];
  return containerElement;
}
//@ chunk-18hwfzwa.js:805476-805537 placement
var ANSI_SEQUENCE_RE = /\x1b\[[\d;]*m|\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/g;
//@ chunk-18hwfzwa.js:805537-805707 placement
function carryAnsiAcrossLines(text) {
  let lines = text.split(`
`);
  if (lines.length === 1) return lines;
  let outLines = [lines[0]];
  let carriedAnsi = "";
  for (let idx = 1; idx < lines.length; idx++) {
    carriedAnsi += (lines[idx - 1].match(ANSI_SEQUENCE_RE) ?? []).join("");
    outLines.push(carriedAnsi + lines[idx]);
  }
  return outLines;
}
//@ chunk-18hwfzwa.js:805707-805723 placement
var StatusLineMemo; // deferred: uses StatusLine of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:805707", () => {
  StatusLineMemo = memo(StatusLine);
});
//@ chunk-18hwfzwa.js:805723-805727 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:805723", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:805727-805840 placement
/**
 * 读取渲染模式、终端行数与附着端能力等状态（结果未使用），恒返回 false。
 */
function useStatusLineSuppressed() {
  let renderMode = useRenderMode();
  let rows = useTerminalSize().rows;
  let noticeRows = useContext(noticeDialogSlot) ?? rows;
  let caps = useSyncExternalStore(onAttacherCapsChange, () => false);
  useSyncExternalStore(noopListener, () => false);
  let hasRootSession = useContext(rootSessionSlot) !== null;
  return false;
}
//@ chunk-18hwfzwa.js:805840-805868 placement
function noopListener() {
  return () => {};
}
//@ chunk-18hwfzwa.js:805868-805872 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:805868", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:805872-805876 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:805872", () => {
  init_react_production();
});
export { statusLineShouldDisplay, useStatusLineSuppressed, StatusLineMemo };
