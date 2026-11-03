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
import { unlink, unlink as unlink_2 } from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { isToolUseResultMessage, createAwaySummaryMessage } from "../utils/messages.js";
import { noe, xGo, AGo, mRt, vGo, RGo, MGo, CGo, TGo, _Go, pRt } from "./notifs/startupNotificationSpecs.js";
import { countToolCallsSince_2 } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o, u, T, M, A } from "../../vendor/zod/v4/classic/schemas.js";
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
import { y, R, P, j } from "../../vendor/react/cjs/react.production.js";
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
import { Cr, useAppState } from "../state/AppState.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import {
  getTerminalFocus as getTerminalFocus_2,
  onTerminalFocusChanged,
} from "../ink/terminal-focus-state.js";
import { generateAwaySummary } from "../services/awaySummary.js";
import { countPendingBackgroundWork } from "../components/messages/SystemTextMessage.js";
import { bM } from "../state/promptInputStore.js";
import { fileHistoryEnabled, fileHistoryRestoreStateFromLog } from "../utils/fileHistory.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getPlatform } from "../utils/platform.js";
import { uiSignals } from "../state/uiSignals.js";

//@ chunk-18hwfzwa.js:1792115-1792200 fingerprint = hasSummarySinceLastUserTurn (0.725)
function hasSummarySinceLastUserTurn(messages) {
  let at = messages.at(-1);
  return at?.type === "system" && at.subtype === "away_summary";
}
/**
 * 最近一轮是否以工具错误收尾
 */
//@ chunk-18hwfzwa.js:1792200-1792532 placement
function isLastTurnFailing(h) {
  let x = new Set();
  for (let D = h.length - 1; D >= 0; D--) {
    let L = h[D];
    if (L.type === "user") {
      if (isToolUseResultMessage(L)) {
        for (let ee of L.message.content) if (ee.type === "tool_result" && ee.is_error) x.add(ee.tool_use_id);
      } else if (noe(L)) return !1;
      continue;
    }
    if (L.type !== "assistant") continue;
    for (let ee of L.message.content) if (countToolCallsSince_2(ee, x) !== null) return !0;
  }
  return !1;
}
/**
 * 自上次摘要以来人类回合是否足够
 */
//@ chunk-18hwfzwa.js:1792532-1792785 placement
function hasEnoughTurnsForAwaySummary(h) {
  let x = 0,
    D = -1;
  for (let ee = 0; ee < h.length; ee++) {
    let ke = h[ee];
    if (noe(ke)) x++;
    if (ke.type === "system" && ke.subtype === "away_summary") D = ee;
  }
  if (x < xGo) return !1;
  if (D === -1) return !0;
  let L = 0;
  for (let ee = D + 1; ee < h.length; ee++) if (noe(h[ee])) L++;
  return L >= AGo;
}
/**
 * 删除离开摘要标记后强制刷新
 */
//@ chunk-18hwfzwa.js:1792785-1792985 placement
async function clearAwaySummaryMarker(h, x, D, L) {
  if (x()) return;
  if (isStorageV5Enabled() && L !== void 0)
    try {
      let ee = await L.backend.delete(L.key);
      if (!ee.ok || !ee.value.existed) return;
    } catch {
      return;
    }
  else
    try {
      await unlink_2(h);
    } catch {
      return;
    }
  D({ force: !0 });
}
//@ chunk-18hwfzwa.js:1792985-1793128 placement
function getAwaySummaryDelayMs() {
  let h = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sedge_lantern_config", { delayMs: mRt })?.delayMs;
  return typeof h === "number" && Number.isFinite(h) ? Math.max(vGo, h) : mRt;
}
/**
 * 离开摘要的状态机：判定跳过原因、生成与追加摘要
 */
//@ chunk-18hwfzwa.js:1793128-1796873 placement
class AwaySummaryController {
  #e;
  #t = !1;
  #o = !1;
  #n = null;
  #s = null;
  #r = null;
  #c = !1;
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
  #b = !1;
  #g = !1;
  constructor(h) {
    this.#e = h;
  }
  setInputs({ enabled: h, isLoading: x }) {
    let D = x !== this.#o;
    if (!this.#o && x && !this.#c) this.#T();
    if (this.#o && !x) ((this.#n = this.#e.now()), (this.#i = 0), (this.#s = getLastMainThreadCacheTtlMs()));
    this.#o = x;
    let L = h !== this.#t;
    if (L)
      if (((this.#t = h), h)) this.#C();
      else this.#w();
    if (D || L) this.#k();
  }
  markUserScrolled() {
    this.#l = this.#e.now();
  }
  dispose() {
    if (this.#t) ((this.#t = !1), this.#w());
    this.#M();
  }
  async #v(h) {
    if (!this.#t) return;
    let x = this.#n,
      D = this.#s;
    if (x === null || D === null) {
      logForDebugging("[awaySummary] skipped: cache age unknown");
      return;
    }
    let max = Math.max(x, getLastMainThreadCacheRenewedAt() ?? -1 / 0);
    if (this.#e.now() - max > D * 0.9) {
      logForDebugging("[awaySummary] skipped: cache stale");
      return;
    }
    if (!h?.force && !0 && getCurrentLimits().status !== "allowed") {
      logForDebugging("[awaySummary] skipped: at or near rate limit");
      return;
    }
    if (!h?.force && this.#e.promptInput.getState().value !== "") {
      logForDebugging("[awaySummary] skipped: draft input present");
      return;
    }
    if (!h?.force) {
      let { pendingAgents: pendingAgents, pendingWorkflows: pendingWorkflows } =
        this.#e.getPendingBackgroundWork();
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
    if (!h?.force && this.#i >= RGo) {
      logForDebugging("[awaySummary] skipped: failing repeatedly this turn");
      return;
    }
    let snapshot = this.#e.transcript.getSnapshot();
    if (!h?.force && !hasEnoughTurnsForAwaySummary(snapshot)) return;
    if (hasSummarySinceLastUserTurn(snapshot)) return;
    if (isLastTurnFailing(snapshot)) {
      logForDebugging("[awaySummary] skipped: StructuredOutput recap present");
      return;
    }
    this.#T();
    let abortController = new AbortController();
    ((this.#r = abortController), (this.#c = h?.force === !0));
    let Re;
    try {
      Re = await this.#e.generate(abortController.signal);
    } finally {
      if (this.#r === abortController) ((this.#r = null), (this.#c = !1));
    }
    if (abortController.signal.aborted) return;
    if (Re.kind !== "ok") {
      (this.#i++, logFeatureBad("away_summary_generate", "generate_failed"));
      return;
    }
    let Be = this.#a < MGo ? `${Re.text} (disable recaps in /config)` : Re.text;
    if (
      (this.#a++,
      this.#e.transcript.apply({ type: "append", messages: [createAwaySummaryMessage(Be)] }),
      Re.capped)
    )
      logFeatureSad("away_summary_generate", "capped");
    else logFeatureOk("away_summary_generate");
  }
  #C() {
    ((this.#p = this.#e.focus.subscribe(this.#R)),
      (this.#u = this.#e.transcript.subscribe(this.#P)),
      this.#R(),
      this.#A());
  }
  #w() {
    (this.#p?.(),
      (this.#p = null),
      this.#u?.(),
      (this.#u = null),
      this.#m?.(),
      (this.#m = null),
      this.#T(),
      (this.#i = 0),
      (this.#S = null),
      this.#_());
  }
  #T() {
    (this.#r?.abort(), (this.#r = null), (this.#c = !1));
  }
  #x() {
    let h = this.#s ?? CGo;
    return Math.min(getAwaySummaryDelayMs(), h * 0.8);
  }
  #k() {
    if ((this.#M(), !this.#t || this.#o)) return;
    let h = this.#n;
    if (h === null) return;
    let now = this.#e.now(),
      D = this.#S,
      max = Math.max(0, this.#x() - (now - h), D === null ? 0 : TGo - (now - D));
    this.#d = this.#e.clock.setTimeout(() => {
      if (((this.#d = null), this.#e.focus.getSnapshot() === "blurred" && !this.#o)) this.#v();
    }, max);
  }
  #M() {
    (this.#d?.(), (this.#d = null));
  }
  #R = () => {
    let snapshot = this.#e.focus.getSnapshot();
    if (snapshot === "blurred") {
      let now = this.#e.now();
      ((this.#f = now), (this.#S ??= now), this.#k());
      return;
    }
    if (snapshot === "focused") {
      if (((this.#S = null), this.#M(), this.#T(), this.#f === null)) return;
      let now = this.#e.now(),
        D = now - this.#f;
      if (D >= _Go) {
        ((this.#h = now), (this.#y = D), (this.#b = !0));
        let snapshot = this.#e.transcript.getSnapshot();
        this.#g = hasSummarySinceLastUserTurn(snapshot) || isLastTurnFailing(snapshot);
      }
      this.#f = null;
    }
  };
  #P = () => {
    if (!this.#b) return;
    let at = this.#e.transcript.getSnapshot().at(-1);
    if (!at || !noe(at)) return;
    let x = this.#h;
    if (x === null) return;
    (logEvent("tengu_return_to_session", {
      msSinceFocus: this.#e.now() - x,
      blurDurationMs: this.#y ?? 0,
      hadRecap: this.#g,
      scrolledBeforeSubmit: this.#l > x,
      isFullscreen: this.#e.presentation === "fullscreen",
    }),
      this.#_());
  };
  #_() {
    ((this.#b = !1), (this.#h = null), (this.#f = null), (this.#y = null), (this.#g = !1));
  }
  #A() {
    {
      if (!isBgSession()) return;
      let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
      if (!CLAUDE_JOB_DIR) return;
      let x = join_12(CLAUDE_JOB_DIR, RECAP_TRIGGER_FILE),
        D = () => this.#o,
        L = (We) => this.#v(We),
        { clock: clock, storageV5: storageV5 } = this.#e,
        Re =
          isStorageV5Enabled() && storageV5 !== void 0
            ? jobKeyFor(CLAUDE_JOB_DIR, [RECAP_TRIGGER_FILE])
            : void 0,
        Be = storageV5 !== void 0 && Re !== void 0 ? { backend: storageV5, key: Re } : void 0,
        He = clock.setTimeout(function We() {
          try {
            clearAwaySummaryMarker(x, D, L, Be);
          } finally {
            He = clock.setTimeout(We, pRt);
          }
        }, pRt);
      this.#m = () => He();
    }
  }
}
/**
 * 离开摘要控制器 hook，连接焦点、时钟与存储
 */
//@ chunk-18hwfzwa.js:1796873-1797385 placement
function useAwaySummaryController(h, x, D = !0) {
  let L = useRenderMode(),
    ee = useClock(),
    ke = useSession(),
    Re = Cr(),
    Be = Nu(),
    { storageV5: storageV5 } = Me(),
    We = useAppState((rt) => rt.awaySummaryEnabled),
    ze = D && We,
    [Xe] = y(
      () =>
        new AwaySummaryController({
          presentation: L,
          transcript: h,
          focus: { getSnapshot: () => getTerminalFocus_2(), subscribe: (rt) => onTerminalFocusChanged(rt) },
          clock: ee,
          now: () => Date.now(),
          generate: (rt) => generateAwaySummary(rt),
          getPendingBackgroundWork: () =>
            countPendingBackgroundWork({ tasks: Re.getState().tasks, queuedCommands: Be.getCommandQueue() }),
          promptInput: bM(ke),
          storageV5: storageV5,
        }),
    );
  return (
    P(() => {
      Xe.setInputs({ enabled: ze, isLoading: x });
    }, [Xe, ze, x]),
    P(() => () => Xe.dispose(), [Xe]),
    Xe
  );
}
//@ chunk-18hwfzwa.js:1797385-1797389 placement
j();
//@ chunk-18hwfzwa.js:1797389-1797488 placement
function useAwaySummaryOnce(h, x) {
  let D = R(!1);
  P(() => {
    if (!fileHistoryEnabled() || D.current) return;
    if (((D.current = !0), h)) fileHistoryRestoreStateFromLog(h, x);
  }, [h, x]);
}
//@ chunk-18hwfzwa.js:1797521-1797525 placement
j();
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
var installedSummaries = new HostScoped(() => new InstalledSummaryRegistry()),
  NGo =
    getPlatform() === "windows" ? /^[A-Za-z0-9/\\][A-Za-z0-9_.+:\\?/-]*$/ : /^[A-Za-z0-9/][A-Za-z0-9_.+/-]*$/;
//@ chunk-fpjsca9n.js:264-441 fingerprint = useAwaySummary (0.66)
function useAwaySummary(e) {
  if (e) uiSignals.terminalFocusGainedAt = Date.now();
  if (!e && uiSignals.terminalFocus === "blurred") return;
  ((uiSignals.terminalFocus = e ? "focused" : "blurred"),
    setTerminalFocusForState(e),
    uiSignals.terminalFocusChanged.emit());
}

export { useAwaySummaryController, useAwaySummaryOnce, NGo, installedSummaries, useAwaySummary };
