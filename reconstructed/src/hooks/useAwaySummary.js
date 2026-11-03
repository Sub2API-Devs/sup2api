/**
 * hooks/useAwaySummary.ts
 *
 * 终端失焦后再聚焦时生成"离开期间摘要"的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useAwaySummary.ts
 * pieces: chunk-18hwfzwa.js (12), chunk-fpjsca9n.js (1)
 * attribution: fingerprint 2, placement 11
 */
import { unlink } from "fs/promises";
import { join } from "path";
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
import { countToolCallsSince_2 } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { string, u, literal, M, array } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../utils/errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { y, R, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  getLastMainThreadCacheTtlMs,
  getLastMainThreadCacheRenewedAt,
  setTerminalFocusForState,
} from "../bootstrap/state.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { getCurrentLimits } from "../services/claudeAiLimits.js";
import { hasLoopTask } from "../utils/loop/loopWakeups.js";
import { jsonStringify } from "../utils/slowOperations.js";
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
import { getPlatform } from "../utils/platform.js";
import { uiSignals } from "../state/uiSignals.js";

//@ chunk-18hwfzwa.js:1792115-1792200 fingerprint = hasSummarySinceLastUserTurn (0.725)
function hasSummarySinceLastUserTurn(messages) {
  let last = messages.at(-1);
  return last?.type === "system" && last.subtype === "away_summary";
}
//@ chunk-18hwfzwa.js:1792200-1792532 placement
/**
 * 最近一轮是否以工具错误收尾
 */
function isLastTurnFailing(h) {
  let sinceUuid = new Set();
  for (let idx = h.length - 1; idx >= 0; idx--) {
    let L = h[idx];
    if (L.type === "user") {
      if (isToolUseResultMessage(L)) {
        for (let ee of L.message.content)
          if (ee.type === "tool_result" && ee.is_error) sinceUuid.add(ee.tool_use_id);
      } else if (isRealUserMessage(L)) return false;
      continue;
    }
    if (L.type !== "assistant") continue;
    for (let ee of L.message.content) if (countToolCallsSince_2(ee, sinceUuid) !== null) return true;
  }
  return false;
}
//@ chunk-18hwfzwa.js:1792532-1792785 placement
/**
 * 自上次摘要以来人类回合是否足够
 */
function hasEnoughTurnsForAwaySummary(h) {
  let x = 0;
  let D = -1;
  for (let idx = 0; idx < h.length; idx++) {
    let ke = h[idx];
    if (isRealUserMessage(ke)) x++;
    if (ke.type === "system" && ke.subtype === "away_summary") D = idx;
  }
  if (x < STARTUP_GRACE_TURNS) return false;
  if (D === -1) return true;
  let L = 0;
  for (let idx = D + 1; idx < h.length; idx++) if (isRealUserMessage(h[idx])) L++;
  return L >= STARTUP_GRACE_TURNS_MIN;
}
//@ chunk-18hwfzwa.js:1792785-1792985 placement
/**
 * 删除离开摘要标记后强制刷新
 */
async function clearAwaySummaryMarker(h, x, D, L) {
  if (x()) return;
  if (isStorageV5Enabled() && L !== undefined)
    try {
      let ee = await L.backend.delete(L.key);
      if (!ee.ok || !ee.value.existed) return;
    } catch {
      return;
    }
  else
    try {
      await unlink(h);
    } catch {
      return;
    }
  D({
    force: true,
  });
}
//@ chunk-18hwfzwa.js:1792985-1793128 placement
function getAwaySummaryDelayMs() {
  let delayMs = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sedge_lantern_config", {
    delayMs: STARTUP_FLAG_TTL_MS,
  })?.delayMs;
  return typeof delayMs === "number" && Number.isFinite(delayMs)
    ? Math.max(STARTUP_MIN_INTERVAL_MS, delayMs)
    : STARTUP_FLAG_TTL_MS;
}
//@ chunk-18hwfzwa.js:1793128-1796873 placement
/**
 * 离开摘要的状态机：判定跳过原因、生成与追加摘要
 */
class AwaySummaryController {
  #e;
  #t = false;
  #o = false;
  #n = null;
  #s = null;
  #r = null;
  #c = false;
  #i = 0;
  #a = 0;
  #l = 0;
  #d = null;
  #m = null;
  #p = null;
  #u = null;
  #f = null;
  #S = null;
  #h = null;
  #y = null;
  #b = false;
  #g = false;
  constructor(h) {
    this.#e = h;
  }
  setInputs({ enabled, isLoading }) {
    let D = isLoading !== this.#o;
    if (!this.#o && isLoading && !this.#c) this.#T();
    if (this.#o && !isLoading) {
      this.#n = this.#e.now();
      this.#i = 0;
      this.#s = getLastMainThreadCacheTtlMs();
    }
    this.#o = isLoading;
    let L = enabled !== this.#t;
    if (L) {
      this.#t = enabled;
      if (enabled) this.#C();
      else this.#w();
    }
    if (D || L) this.#k();
  }
  markUserScrolled() {
    this.#l = this.#e.now();
  }
  dispose() {
    if (this.#t) {
      this.#t = false;
      this.#w();
    }
    this.#M();
  }
  async #v(h) {
    if (!this.#t) return;
    let x = this.#n;
    let D = this.#s;
    if (x === null || D === null) {
      logForDebugging("[awaySummary] skipped: cache age unknown");
      return;
    }
    let max = Math.max(x, getLastMainThreadCacheRenewedAt() ?? -1 / 0);
    if (this.#e.now() - max > D * 0.9) {
      logForDebugging("[awaySummary] skipped: cache stale");
      return;
    }
    if (!h?.force && true && getCurrentLimits().status !== "allowed") {
      logForDebugging("[awaySummary] skipped: at or near rate limit");
      return;
    }
    if (!h?.force && this.#e.promptInput.getState().value !== "") {
      logForDebugging("[awaySummary] skipped: draft input present");
      return;
    }
    if (!h?.force) {
      let { pendingAgents, pendingWorkflows } = this.#e.getPendingBackgroundWork();
      if (pendingAgents > 0 || pendingWorkflows > 0) {
        logForDebugging("[awaySummary] skipped: background work pending");
        return;
      }
    }
    if (!h?.force && hasLoopTask()) {
      logForDebugging("[awaySummary] skipped: loop wakeup pending");
      return;
    }
    if (!h?.force && this.#r !== null) {
      logForDebugging("[awaySummary] skipped: generation in flight");
      return;
    }
    if (!h?.force && this.#i >= MAX_STARTUP_NOTICES) {
      logForDebugging("[awaySummary] skipped: failing repeatedly this turn");
      return;
    }
    let messages = this.#e.transcript.getSnapshot();
    if (!h?.force && !hasEnoughTurnsForAwaySummary(messages)) return;
    if (hasSummarySinceLastUserTurn(messages)) return;
    if (isLastTurnFailing(messages)) {
      logForDebugging("[awaySummary] skipped: StructuredOutput recap present");
      return;
    }
    this.#T();
    let abortController = new AbortController();
    this.#r = abortController;
    this.#c = h?.force === true;
    let Re;
    try {
      Re = await this.#e.generate(abortController.signal);
    } finally {
      if (this.#r === abortController) {
        this.#r = null;
        this.#c = false;
      }
    }
    if (abortController.signal.aborted) return;
    if (Re.kind !== "ok") {
      this.#i++;
      logFeatureBad("away_summary_generate", "generate_failed");
      return;
    }
    let content = this.#a < STARTUP_GRACE_TURNS_MAX ? `${Re.text} (disable recaps in /config)` : Re.text;
    this.#a++;
    this.#e.transcript.apply({
      type: "append",
      messages: [createAwaySummaryMessage(content)],
    });
    if (Re.capped) logFeatureSad("away_summary_generate", "capped");
    else logFeatureOk("away_summary_generate");
  }
  #C() {
    this.#p = this.#e.focus.subscribe(this.#R);
    this.#u = this.#e.transcript.subscribe(this.#P);
    this.#R();
    this.#A();
  }
  #w() {
    this.#p?.();
    this.#p = null;
    this.#u?.();
    this.#u = null;
    this.#m?.();
    this.#m = null;
    this.#T();
    this.#i = 0;
    this.#S = null;
    this.#_();
  }
  #T() {
    this.#r?.abort();
    this.#r = null;
    this.#c = false;
  }
  #x() {
    let h = this.#s ?? STARTUP_MAX_INTERVAL_MS;
    return Math.min(getAwaySummaryDelayMs(), h * 0.8);
  }
  #k() {
    this.#M();
    if (!this.#t || this.#o) return;
    let h = this.#n;
    if (h === null) return;
    let x = this.#e.now();
    let D = this.#S;
    let max = Math.max(0, this.#x() - (x - h), D === null ? 0 : STARTUP_BACKOFF_MS - (x - D));
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
      let x = this.#e.now();
      this.#f = x;
      this.#S ??= x;
      this.#k();
      return;
    }
    if (snapshot === "focused") {
      this.#S = null;
      this.#M();
      this.#T();
      if (this.#f === null) return;
      let x = this.#e.now();
      let D = x - this.#f;
      if (D >= STARTUP_SESSION_BUDGET_MS) {
        this.#h = x;
        this.#y = D;
        this.#b = true;
        let messages = this.#e.transcript.getSnapshot();
        this.#g = hasSummarySinceLastUserTurn(messages) || isLastTurnFailing(messages);
      }
      this.#f = null;
    }
  };
  #P = () => {
    if (!this.#b) return;
    let last = this.#e.transcript.getSnapshot().at(-1);
    if (!last || !isRealUserMessage(last)) return;
    let x = this.#h;
    if (x === null) return;
    logEvent("tengu_return_to_session", {
      msSinceFocus: this.#e.now() - x,
      blurDurationMs: this.#y ?? 0,
      hadRecap: this.#g,
      scrolledBeforeSubmit: this.#l > x,
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
      let x = join(CLAUDE_JOB_DIR, RECAP_TRIGGER_FILE);
      let D = () => this.#o;
      let L = (We) => this.#v(We);
      let { clock, storageV5 } = this.#e;
      let Re =
        isStorageV5Enabled() && storageV5 !== undefined
          ? jobKeyFor(CLAUDE_JOB_DIR, [RECAP_TRIGGER_FILE])
          : undefined;
      let Be =
        storageV5 !== undefined && Re !== undefined
          ? {
              backend: storageV5,
              key: Re,
            }
          : undefined;
      let He = clock.setTimeout(function We() {
        try {
          clearAwaySummaryMarker(x, D, L, Be);
        } finally {
          He = clock.setTimeout(We, STARTUP_CHECK_STEP_MS);
        }
      }, STARTUP_CHECK_STEP_MS);
      this.#m = () => He();
    }
  }
}
//@ chunk-18hwfzwa.js:1796873-1797385 placement
/**
 * 离开摘要控制器 hook，连接焦点、时钟与存储
 */
function useAwaySummaryController(transcript, isLoading, D = true) {
  let presentation = useRenderMode();
  let clock = useClock();
  let session = useSession();
  let appStoreDirect = useAppStoreDirect();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let { storageV5 } = useTheme_2();
  let We = useAppState((rt) => rt.awaySummaryEnabled);
  let ze = D && We;
  let [Xe] = y(
    () =>
      new AwaySummaryController({
        presentation,
        transcript,
        focus: {
          getSnapshot: () => getTerminalFocus_2(),
          subscribe: (rt) => onTerminalFocusChanged(rt),
        },
        clock,
        now: () => Date.now(),
        generate: (rt) => generateAwaySummary(rt),
        getPendingBackgroundWork: () =>
          countPendingBackgroundWork({
            tasks: appStoreDirect.getState().tasks,
            queuedCommands: commandQueueOrDefault.getCommandQueue(),
          }),
        promptInput: promptInputStoreFor(session),
        storageV5,
      }),
  );
  P(() => {
    Xe.setInputs({
      enabled: ze,
      isLoading,
    });
  }, [Xe, ze, isLoading]);
  P(() => () => Xe.dispose(), [Xe]);
  return Xe;
}
//@ chunk-18hwfzwa.js:1797385-1797389 placement
init_react_production();
//@ chunk-18hwfzwa.js:1797389-1797488 placement
function useAwaySummaryOnce(fileHistorySnapshots, onUpdateState) {
  let D = R(false);
  P(() => {
    if (!fileHistoryEnabled() || D.current) return;
    D.current = true;
    if (fileHistorySnapshots) fileHistoryRestoreStateFromLog(fileHistorySnapshots, onUpdateState);
  }, [fileHistorySnapshots, onUpdateState]);
}
//@ chunk-18hwfzwa.js:1797521-1797525 placement
init_react_production();
//@ chunk-18hwfzwa.js:1797558-1797664 placement
class InstalledSummaryRegistry {
  installed = new Map();
  lookup(h) {
    return this.installed.get(h);
  }
  remember(h, x) {
    this.installed.set(h, x);
  }
}
//@ chunk-18hwfzwa.js:1797664-1797785 placement
var installedSummaries = new HostScoped(() => new InstalledSummaryRegistry());
var SAFE_PATH_RE =
  getPlatform() === "windows" ? /^[A-Za-z0-9/\\][A-Za-z0-9_.+:\\?/-]*$/ : /^[A-Za-z0-9/][A-Za-z0-9_.+/-]*$/;
//@ chunk-fpjsca9n.js:264-441 fingerprint = useAwaySummary (0.66)
function useAwaySummary(e) {
  if (e) uiSignals.terminalFocusGainedAt = Date.now();
  if (!e && uiSignals.terminalFocus === "blurred") return;
  uiSignals.terminalFocus = e ? "focused" : "blurred";
  setTerminalFocusForState(e);
  uiSignals.terminalFocusChanged.emit();
}
export { useAwaySummaryController, useAwaySummaryOnce, SAFE_PATH_RE, installedSummaries, useAwaySummary };
