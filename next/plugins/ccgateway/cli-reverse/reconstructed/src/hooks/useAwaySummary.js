/**
 * hooks/useAwaySummary.ts
 *
 * 终端失焦后再聚焦时生成"离开期间摘要"的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useAwaySummary.ts
 * pieces: chunk-czq1j3j2.js (12), chunk-mjq27gpa.js (1)
 * attribution: placement 11, fingerprint 2
 */
import { unlink } from "fs/promises";
import { join } from "path";
import { uiSignals } from "../state/uiSignals.js";
import {
  setTerminalFocusForState,
  getLastMainThreadCacheTtlMs,
  getLastMainThreadCacheRenewedAt,
} from "../bootstrap/state.js";
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
} from "../../vendor/react/cjs/react.production.js";
import { isToolUseResultMessage, createAwaySummaryMessage } from "../utils/messages.js";
import {
  isRealUserMessage,
  STARTUP_GRACE_TURNS,
  STARTUP_GRACE_TURNS_MIN,
  STARTUP_FLAG_TTL_MS,
  STARTUP_MIN_INTERVAL_MS,
  MAX_STARTUP_NOTICES,
  STARTUP_GRACE_TURNS_MAX,
  STARTUP_MAX_INTERVAL_MS,
  STARTUP_BACKOFF_MS,
  STARTUP_SESSION_BUDGET_MS,
  STARTUP_CHECK_STEP_MS,
} from "./notifs/startupNotificationSpecs.js";
import { structuredOutputText } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema, objectSchema, literal, array } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../utils/errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getCurrentLimits } from "../services/claudeAiLimits.js";
import { hasLoopTask } from "../utils/loop/loopWakeups.js";
import { getPlatform } from "../utils/platform.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { plural } from "../utils/stringUtils.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { RECAP_TRIGGER_FILE } from "../daemon/jobs/killJob.js";
import { jobKeyFor } from "../services/daemon/jobState.js";
import { useRenderMode } from "../ink/renderModeContext.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useSession } from "../context/session.js";
import { useAppStoreDirect, useAppState } from "../state/AppState.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import {
  getTerminalFocus as getTerminalFocus_2,
  onTerminalFocusChanged,
} from "../ink/terminal-focus-state.js";
import { generateAwaySummary } from "../services/awaySummary.js";
import { countPendingBackgroundWork } from "../components/messages/SystemTextMessage.js";
import { promptInputStoreFor } from "../state/promptInputStore.js";
import { fileHistoryEnabled, fileHistoryRestoreStateFromLog } from "../utils/fileHistory.js";
import { HostScoped } from "../utils/hostScoped.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mjq27gpa.js:264-441 fingerprint (2.1.88 match: useAwaySummary, 0.66)
function useAwaySummary(isFocused) {
  if (isFocused) uiSignals.terminalFocusGainedAt = Date.now();
  if (!isFocused && uiSignals.terminalFocus === "blurred") return;
  uiSignals.terminalFocus = isFocused ? "focused" : "blurred";
  setTerminalFocusForState(isFocused);
  uiSignals.terminalFocusChanged.emit();
}
//@ chunk-czq1j3j2.js:1798856-1798860 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1798856", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1837750-1837754 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1837750", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1840094-1840179 fingerprint (2.1.88 match: hasSummarySinceLastUserTurn, 0.726)
function hasSummarySinceLastUserTurn(messages) {
  let last = messages.at(-1);
  return last?.type === "system" && last.subtype === "away_summary";
}
//@ chunk-czq1j3j2.js:1840179-1840511 placement
/**
 * 最近一轮是否以工具错误收尾
 */
function isLastTurnFailing(messages) {
  let erroredToolUseIds = new Set();
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type === "user") {
      if (isToolUseResultMessage(message)) {
        for (let block of message.message.content)
          if (block.type === "tool_result" && block.is_error) erroredToolUseIds.add(block.tool_use_id);
      } else if (isRealUserMessage(message)) return false;
      continue;
    }
    if (message.type !== "assistant") continue;
    for (let block of message.message.content)
      if (structuredOutputText(block, erroredToolUseIds) !== null) return true;
  }
  return false;
}
//@ chunk-czq1j3j2.js:1840511-1840764 placement
/**
 * 自上次摘要以来人类回合是否足够
 */
function hasEnoughTurnsForAwaySummary(messages) {
  let userTurnCount = 0;
  let lastSummaryIndex = -1;
  for (let idx = 0; idx < messages.length; idx++) {
    let message = messages[idx];
    if (isRealUserMessage(message)) userTurnCount++;
    if (message.type === "system" && message.subtype === "away_summary") lastSummaryIndex = idx;
  }
  if (userTurnCount < STARTUP_GRACE_TURNS) return false;
  if (lastSummaryIndex === -1) return true;
  let turnsSinceSummary = 0;
  for (let idx = lastSummaryIndex + 1; idx < messages.length; idx++)
    if (isRealUserMessage(messages[idx])) turnsSinceSummary++;
  return turnsSinceSummary >= STARTUP_GRACE_TURNS_MIN;
}
//@ chunk-czq1j3j2.js:1840764-1840964 placement
/**
 * 删除离开摘要标记后强制刷新
 */
async function clearAwaySummaryMarker(markerPath, isBusy, generate, markerStorage) {
  if (isBusy()) return;
  if (isStorageV5Enabled() && markerStorage !== undefined)
    try {
      let deleteResult = await markerStorage.backend.delete(markerStorage.key);
      if (!deleteResult.ok || !deleteResult.value.existed) return;
    } catch {
      return;
    }
  else
    try {
      await unlink(markerPath);
    } catch {
      return;
    }
  generate({
    force: true,
  });
}
//@ chunk-czq1j3j2.js:1840964-1841107 placement
function getAwaySummaryDelayMs() {
  let delayMs = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sedge_lantern_config", {
    delayMs: STARTUP_FLAG_TTL_MS,
  })?.delayMs;
  return typeof delayMs === "number" && Number.isFinite(delayMs)
    ? Math.max(STARTUP_MIN_INTERVAL_MS, delayMs)
    : STARTUP_FLAG_TTL_MS;
}
//@ chunk-czq1j3j2.js:1841107-1844852 placement
/**
 * 离开摘要的状态机：判定跳过原因、生成与追加摘要
 */
class AwaySummaryController {
  #e;
  #t = false;
  #o = false;
  #n = null;
  #r = null;
  #s = null;
  #l = false;
  #i = 0;
  #a = 0;
  #c = 0;
  #d = null;
  #u = null;
  #p = null;
  #m = null;
  #f = null;
  #S = null;
  #h = null;
  #y = null;
  #b = false;
  #g = false;
  constructor(env) {
    this.#e = env;
  }
  setInputs({ enabled, isLoading }) {
    let loadingChanged = isLoading !== this.#o;
    if (!this.#o && isLoading && !this.#l) this.#T();
    if (this.#o && !isLoading) {
      this.#n = this.#e.now();
      this.#i = 0;
      this.#r = getLastMainThreadCacheTtlMs();
    }
    this.#o = isLoading;
    let enabledChanged = enabled !== this.#t;
    if (enabledChanged) {
      this.#t = enabled;
      if (enabled) this.#C();
      else this.#w();
    }
    if (loadingChanged || enabledChanged) this.#k();
  }
  markUserScrolled() {
    this.#c = this.#e.now();
  }
  dispose() {
    if (this.#t) {
      this.#t = false;
      this.#w();
    }
    this.#M();
  }
  async #v(options) {
    if (!this.#t) return;
    let lastActiveAt = this.#n;
    let cacheTtlMs = this.#r;
    if (lastActiveAt === null || cacheTtlMs === null) {
      logForDebugging("[awaySummary] skipped: cache age unknown");
      return;
    }
    let max = Math.max(lastActiveAt, getLastMainThreadCacheRenewedAt() ?? -1 / 0);
    if (this.#e.now() - max > cacheTtlMs * 0.9) {
      logForDebugging("[awaySummary] skipped: cache stale");
      return;
    }
    if (!options?.force && true && getCurrentLimits().status !== "allowed") {
      logForDebugging("[awaySummary] skipped: at or near rate limit");
      return;
    }
    if (!options?.force && this.#e.promptInput.getState().value !== "") {
      logForDebugging("[awaySummary] skipped: draft input present");
      return;
    }
    if (!options?.force) {
      let { pendingAgents, pendingWorkflows } = this.#e.getPendingBackgroundWork();
      if (pendingAgents > 0 || pendingWorkflows > 0) {
        logForDebugging("[awaySummary] skipped: background work pending");
        return;
      }
    }
    if (!options?.force && hasLoopTask()) {
      logForDebugging("[awaySummary] skipped: loop wakeup pending");
      return;
    }
    if (!options?.force && this.#s !== null) {
      logForDebugging("[awaySummary] skipped: generation in flight");
      return;
    }
    if (!options?.force && this.#i >= MAX_STARTUP_NOTICES) {
      logForDebugging("[awaySummary] skipped: failing repeatedly this turn");
      return;
    }
    let messages = this.#e.transcript.getSnapshot();
    if (!options?.force && !hasEnoughTurnsForAwaySummary(messages)) return;
    if (hasSummarySinceLastUserTurn(messages)) return;
    if (isLastTurnFailing(messages)) {
      logForDebugging("[awaySummary] skipped: StructuredOutput recap present");
      return;
    }
    this.#T();
    let abortController = new AbortController();
    this.#s = abortController;
    this.#l = options?.force === true;
    let result;
    try {
      result = await this.#e.generate(abortController.signal);
    } finally {
      if (this.#s === abortController) {
        this.#s = null;
        this.#l = false;
      }
    }
    if (abortController.signal.aborted) return;
    if (result.kind !== "ok") {
      this.#i++;
      logFeatureBad("away_summary_generate", "generate_failed");
      return;
    }
    let content =
      this.#a < STARTUP_GRACE_TURNS_MAX ? `${result.text} (disable recaps in /config)` : result.text;
    this.#a++;
    this.#e.transcript.apply({
      type: "append",
      messages: [createAwaySummaryMessage(content)],
    });
    if (result.capped) logFeatureSad("away_summary_generate", "capped");
    else logFeatureOk("away_summary_generate");
  }
  #C() {
    this.#p = this.#e.focus.subscribe(this.#R);
    this.#m = this.#e.transcript.subscribe(this.#P);
    this.#R();
    this.#A();
  }
  #w() {
    this.#p?.();
    this.#p = null;
    this.#m?.();
    this.#m = null;
    this.#u?.();
    this.#u = null;
    this.#T();
    this.#i = 0;
    this.#S = null;
    this.#_();
  }
  #T() {
    this.#s?.abort();
    this.#s = null;
    this.#l = false;
  }
  #x() {
    let cacheTtl = this.#r ?? STARTUP_MAX_INTERVAL_MS;
    return Math.min(getAwaySummaryDelayMs(), cacheTtl * 0.8);
  }
  #k() {
    this.#M();
    if (!this.#t || this.#o) return;
    let blurredAt = this.#n;
    if (blurredAt === null) return;
    let now = this.#e.now();
    let lastCheckAt = this.#S;
    let max = Math.max(
      0,
      this.#x() - (now - blurredAt),
      lastCheckAt === null ? 0 : STARTUP_BACKOFF_MS - (now - lastCheckAt),
    );
    this.#d = this.#e.clock.setTimeout(() => {
      this.#d = null;
      if (this.#e.focus.getSnapshot() === "blurred" && !this.#o) this.#v();
    }, max);
  }
  #M() {
    this.#d?.();
    this.#d = null;
  }
  #R = () => {
    let snapshot = this.#e.focus.getSnapshot();
    if (snapshot === "blurred") {
      let now = this.#e.now();
      this.#f = now;
      this.#S ??= now;
      this.#k();
      return;
    }
    if (snapshot === "focused") {
      this.#S = null;
      this.#M();
      this.#T();
      if (this.#f === null) return;
      let now = this.#e.now();
      let blurDurationMs = now - this.#f;
      if (blurDurationMs >= STARTUP_SESSION_BUDGET_MS) {
        this.#h = now;
        this.#y = blurDurationMs;
        this.#b = true;
        let messages = this.#e.transcript.getSnapshot();
        this.#g = hasSummarySinceLastUserTurn(messages) || isLastTurnFailing(messages);
      }
      this.#f = null;
    }
  };
  #P = () => {
    if (!this.#b) return;
    let message = this.#e.transcript.getSnapshot().at(-1);
    if (!message || !isRealUserMessage(message)) return;
    let focusedAt = this.#h;
    if (focusedAt === null) return;
    logEvent("tengu_return_to_session", {
      msSinceFocus: this.#e.now() - focusedAt,
      blurDurationMs: this.#y ?? 0,
      hadRecap: this.#g,
      scrolledBeforeSubmit: this.#c > focusedAt,
      isFullscreen: this.#e.presentation === "fullscreen",
    });
    this.#_();
  };
  #_() {
    this.#b = false;
    this.#h = null;
    this.#f = null;
    this.#y = null;
    this.#g = false;
  }
  #A() {
    {
      if (!isBgSession()) return;
      let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
      if (!CLAUDE_JOB_DIR) return;
      let triggerPath = join(CLAUDE_JOB_DIR, RECAP_TRIGGER_FILE);
      let isLoading = () => this.#o;
      let generateCallback = (options) => this.#v(options);
      let { clock, storageV5 } = this.#e;
      let markerKey =
        isStorageV5Enabled() && storageV5 !== undefined
          ? jobKeyFor(CLAUDE_JOB_DIR, [RECAP_TRIGGER_FILE])
          : undefined;
      let markerStorage =
        storageV5 !== undefined && markerKey !== undefined
          ? {
              backend: storageV5,
              key: markerKey,
            }
          : undefined;
      let cancelPoll = clock.setTimeout(function pollMarker() {
        try {
          clearAwaySummaryMarker(triggerPath, isLoading, generateCallback, markerStorage);
        } finally {
          cancelPoll = clock.setTimeout(pollMarker, STARTUP_CHECK_STEP_MS);
        }
      }, STARTUP_CHECK_STEP_MS);
      this.#u = () => cancelPoll();
    }
  }
}
//@ chunk-czq1j3j2.js:1844852-1845364 placement
/**
 * 离开摘要控制器 hook，连接焦点、时钟与存储
 */
function useAwaySummaryController(transcript, isLoading, enabled = true) {
  let presentation = useRenderMode();
  let clock = useClock();
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let { storageV5 } = useTheme_2();
  let awaySummaryEnabled = useAppState((state) => state.awaySummaryEnabled);
  let isEnabled = enabled && awaySummaryEnabled;
  let [controller] = useState(
    () =>
      new AwaySummaryController({
        presentation,
        transcript,
        focus: {
          getSnapshot: () => getTerminalFocus_2(),
          subscribe: (listener) => onTerminalFocusChanged(listener),
        },
        clock,
        now: () => Date.now(),
        generate: (signal) => generateAwaySummary(signal),
        getPendingBackgroundWork: () =>
          countPendingBackgroundWork({
            tasks: appStoreDirect.getState().tasks,
            queuedCommands: commandQueueOrDefault.getCommandQueue(),
          }),
        promptInput: promptInputStoreFor(session),
        storageV5,
      }),
  );
  useEffect(() => {
    controller.setInputs({
      enabled: isEnabled,
      isLoading,
    });
  }, [controller, isEnabled, isLoading]);
  useEffect(() => () => controller.dispose(), [controller]);
  return controller;
}
//@ chunk-czq1j3j2.js:1845368-1845467 placement
function useAwaySummaryOnce(fileHistorySnapshots, onUpdateState) {
  let hasRestoredRef = useRef(false);
  useEffect(() => {
    if (!fileHistoryEnabled() || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    if (fileHistorySnapshots) fileHistoryRestoreStateFromLog(fileHistorySnapshots, onUpdateState);
  }, [fileHistorySnapshots, onUpdateState]);
}
//@ chunk-czq1j3j2.js:1845537-1845643 placement
class InstalledSummaryRegistry {
  installed = new Map();
  lookup(key) {
    return this.installed.get(key);
  }
  remember(key, summary) {
    this.installed.set(key, summary);
  }
}
//@ chunk-czq1j3j2.js:1845643-1845764 placement
var installedSummaries; // deferred: uses InstalledSummaryRegistry of its import cycle while loading; runs once the cycle is complete
var SAFE_PATH_RE;
deferInit("chunk-czq1j3j2.js:1845643", () => {
  installedSummaries = new HostScoped(() => new InstalledSummaryRegistry());
  SAFE_PATH_RE =
    getPlatform() === "windows" ? /^[A-Za-z0-9/\\][A-Za-z0-9_.+:\\?/-]*$/ : /^[A-Za-z0-9/][A-Za-z0-9_.+/-]*$/;
});
export { useAwaySummary, useAwaySummaryController, useAwaySummaryOnce, SAFE_PATH_RE, installedSummaries };
