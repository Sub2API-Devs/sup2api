/**
 * hooks/usePrStatus.ts
 *
 * 当前分支 PR 状态轮询（初始状态）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePrStatus.ts
 * pieces: chunk-18hwfzwa.js (12), chunk-qgpgvvwv.js (1)
 * attribution: placement 12, fingerprint 1
 */
import { watch, watch as watch_2 } from "fs";
import { HistorySearchInput } from "../components/PromptInput/HistorySearchInput.js";
import { j, y, P, Q, yt } from "../../vendor/react/cjs/react.production.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { wt } from "../remote/remoteMode.js";
import { getOwnJobShortId, getJobDir, readJobState } from "../services/daemon/jobState.js";
import { ANY_CONTROL_CHAR_RE } from "../utils/stringUtils.js";
import { isValidKeySegment } from "../utils/storage/storageSpaces.js";
import { watchJobStateFile } from "../utils/background/jobStateNameSync.js";
import { logForDebugging } from "../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../ink/components/Text.js";
import { useAppState } from "../state/AppState.js";
import { QH } from "../components/PromptInput/footerLinks.js";
import { o, u, T } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useHost } from "../context/session.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { getLastInteractionTime } from "../bootstrap/state.js";
import { getPrStatus, zM } from "../utils/ghPrStatus.js";
import { getPrStatusColor } from "../components/PrBadge.js";

//@ chunk-18hwfzwa.js:814630-814642 placement
var khe = HistorySearchInput;
//@ chunk-18hwfzwa.js:814642-814646 placement
j();
//@ chunk-18hwfzwa.js:814675-815319 placement
function useBgSessionPr() {
  let [h, x] = y(null),
    storageV5 = Me().storageV5;
  return (
    P(() => {
      if (!isBgSession() || wt()) return;
      let L = getOwnJobShortId(),
        ee = getJobDir(L),
        ke,
        Re = async () => {
          let He = (await readJobState(ee, storageV5))?.children?.find(
              (ze) => ze.kind !== "frame" && !ANY_CONTROL_CHAR_RE.test(ze.href),
            ),
            We = He ? Number(He.id) : NaN;
          if (!He || !Number.isFinite(We)) return;
          x((ze) => (ze?.number === We && ze.url === He.href ? ze : { number: We, url: He.href }));
        };
      if (storageV5 && isValidKeySegment(L)) return watchJobStateFile(storageV5, L, Re, "[useBgSessionPr]");
      try {
        ((ke = watch_2(ee, (Be, He) => {
          if (He && !He.startsWith("state.json")) return;
          Re();
        })),
          ke.on("error", (Be) =>
            logForDebugging(`[useBgSessionPr] watcher error: ${errorMessage(Be)}`, { level: "warn" }),
          ),
          ke.unref());
      } catch (error) {
        logForDebugging(`[useBgSessionPr] watch skipped: ${errorMessage(error)}`);
      }
      return (Re(), () => ke?.close());
    }, [storageV5]),
    h
  );
}
//@ chunk-18hwfzwa.js:815319-816131 placement
function FooterLink(h) {
  let $ = w(17),
    { link: link } = h,
    L;
  if ($[0] !== link.prefix)
    ((L =
      link.prefix !== void 0 &&
      r(Fragment, { children: [e(Text, { dimColor: !0, children: link.prefix }), " "] })),
      ($[0] = link.prefix),
      ($[1] = L));
  else L = $[1];
  const ee = !link.color;
  let ke;
  if ($[2] !== link.color || $[3] !== link.label || $[4] !== ee)
    ((ke = e(Text, { color: link.color, dimColor: ee, children: link.label })),
      ($[2] = link.color),
      ($[3] = link.label),
      ($[4] = ee),
      ($[5] = ke));
  else ke = $[5];
  const Re = !link.color;
  let Be;
  if ($[6] !== link.color || $[7] !== link.label || $[8] !== Re)
    ((Be = e(Text, { color: link.color, dimColor: Re, underline: !0, children: link.label })),
      ($[6] = link.color),
      ($[7] = link.label),
      ($[8] = Re),
      ($[9] = Be));
  else Be = $[9];
  let He;
  if ($[10] !== link.url || $[11] !== ke || $[12] !== Be)
    ((He = e(Link, { url: link.url, fallback: ke, assumeSupport: !0, children: Be })),
      ($[10] = link.url),
      ($[11] = ke),
      ($[12] = Be),
      ($[13] = He));
  else He = $[13];
  let We;
  if ($[14] !== L || $[15] !== He)
    ((We = r(Text, { children: [L, He] })), ($[14] = L), ($[15] = He), ($[16] = We));
  else We = $[16];
  return We;
}
//@ chunk-18hwfzwa.js:816131-816135 placement
j();
//@ chunk-18hwfzwa.js:816135-816302 placement
function useFooterLinks(h) {
  let x = useAppState((L) => L.footerLinks),
    D = h?.excludeKeyed === !0;
  return Q(() => {
    let L = D ? x.filter((ee) => ee.key === void 0) : x;
    return L.length <= QH ? L : L.slice(0, QH);
  }, [x, D]);
}
//@ chunk-18hwfzwa.js:816302-816306 placement
j();
//@ chunk-18hwfzwa.js:816306-816399 placement
var Ceo = 4000,
  _eo = 3600000,
  Teo = 60000,
  Reo = 3,
  xeo = 300000,
  Peo = { pr: null, needsAuth: !1, lastUpdated: 0 };
//@ chunk-18hwfzwa.js:816399-819009 placement
class PrStatusPoller {
  #e;
  #t;
  #o = Peo;
  #n = createSignal();
  #s = 0;
  #r = !1;
  #c = null;
  #i = 0;
  #a = !1;
  #l = null;
  #d = 0;
  #m = 0;
  #p = -1;
  #u = 0;
  constructor(h, x) {
    ((this.#e = h), (this.#t = x));
  }
  getSnapshot = () => this.#o;
  subscribe = (h) => {
    let subscribe = this.#n.subscribe(h);
    if ((this.#s++, !this.#r)) this.#f();
    let D = !1;
    return () => {
      if (D) return;
      if (((D = !0), subscribe(), this.#s--, this.#s === 0)) this.#S();
    };
  };
  setInputs(h) {
    let x = this.#t;
    if (((this.#t = h), !this.#r)) return;
    if (h.enabled && !x.enabled) ((this.#m = 0), (this.#e.shared.pollerNotModifiedStreak = 0));
    if ((h.focused !== x.focused && this.#y()) || h.isLoading !== x.isLoading || h.enabled !== x.enabled)
      this.#h();
  }
  #f() {
    ((this.#r = !0),
      (this.#a = !1),
      (this.#c = this.#e.shared.bump.subscribe(() => {
        if (this.#e.shared.pollerDisabled) return;
        ((this.#m = 0), (this.#d = 0), this.#h());
      })),
      this.#g());
  }
  #S() {
    ((this.#r = !1), (this.#a = !1), this.#c?.(), (this.#c = null), this.#b());
  }
  #h() {
    if (this.#a) return;
    ((this.#a = !0),
      queueMicrotask(() => {
        if (!this.#a) return;
        ((this.#a = !1), this.#g());
      }));
  }
  #y() {
    if (!this.#t.focused || this.#e.shared.pollerDisabled) return !1;
    if (this.#d === 0) return !1;
    if (((this.#e.shared.pollerNotModifiedStreak = 0), this.#e.now() - this.#d >= Teo))
      ((this.#m = 0), (this.#d = 0));
    return !0;
  }
  #b() {
    if ((this.#i++, this.#l)) (this.#l(), (this.#l = null));
  }
  #g() {
    if ((this.#b(), !this.#t.enabled)) return;
    if (this.#e.shared.pollerDisabled) return;
    let h = this.#i;
    ((this.#p = -1), (this.#u = this.#e.now()));
    let x = this.#w(!0),
      D = this.#e.now() - this.#d;
    if (D >= x) this.#C(h);
    else this.#v(h, x - D);
  }
  #v(h, x) {
    this.#l = this.#e.setTimeout(() => {
      ((this.#l = null), this.#C(h));
    }, x);
  }
  #C(h) {
    this.#T(h).catch(logError);
  }
  #w(h) {
    return computePrPollIntervalMs(
      this.#t.focused,
      this.#e.now() - this.#e.getLastInteractionTime(),
      h ? 0 : this.#m,
      this.#e.shared.pollerNotModifiedStreak,
    );
  }
  async #T(h) {
    if (h !== this.#i) return;
    let { now: now, shared: shared } = this.#e,
      lastInteractionTime = this.#e.getLastInteractionTime();
    if (this.#p !== lastInteractionTime) ((this.#p = lastInteractionTime), (this.#u = now()));
    else if (now() - this.#u >= _eo) return;
    let ee = now(),
      ke;
    try {
      ke = await this.#e.fetchPrStatus();
    } catch (error) {
      (logError(error), (ke = null));
    }
    let Re = ke;
    if (h !== this.#i) return;
    this.#d = ee;
    let Be = Re === "needs-auth" || Re === "gh-missing",
      He = Be ? Re : !1,
      We = Re === "fetch-failed",
      ze = null,
      Xe = !1;
    if (!Be && !We && Re !== null) {
      let { notModified: notModified = !1, ...At } = Re;
      ((Xe = notModified), (ze = At));
    }
    if (
      ((this.#m = He ? 1 : ze === null ? this.#m + 1 : 0),
      (shared.pollerBadStreak = We ? shared.pollerBadStreak + 1 : 0),
      (shared.pollerNotModifiedStreak = Xe ? shared.pollerNotModifiedStreak + 1 : 0),
      this.#x(ze, He),
      shared.pollerBadStreak >= Reo)
    ) {
      ((shared.pollerDisabled = !0), logFeatureSad("github_pr_status_direct", "bad_streak_disabled"));
      return;
    }
    let rt = now() - ee;
    if (rt > Ceo) {
      ((shared.pollerDisabled = !0),
        logFeatureSad("github_pr_status_direct", "slow_disabled", { elapsed_ms: rt }));
      return;
    }
    this.#v(h, this.#w(!1));
  }
  #x(h, x) {
    let D = this.#o;
    if (
      D.lastUpdated > 0 &&
      D.pr?.number === h?.number &&
      D.pr?.url === h?.url &&
      D.pr?.reviewState === h?.reviewState &&
      D.pr?.kind === h?.kind &&
      D.needsAuth === x
    )
      return;
    this.#o = { pr: h, needsAuth: x, lastUpdated: this.#e.now() };
    try {
      this.#n.emit();
    } catch (error) {
      logError(error);
    }
  }
}
/**
 * 根据空闲时长、连续未变化次数等计算 PR 状态轮询间隔（90 秒到 30 分钟，取各项最大值）。
 */
//@ chunk-18hwfzwa.js:819009-819222 placement
function computePrPollIntervalMs(h, x, D, L) {
  let ee = x < 30000 ? 90000 : x < 300000 ? 180000 : x < 1800000 ? 600000 : 1800000,
    ke = D <= 0 ? 90000 : D === 1 ? 300000 : D === 2 ? 900000 : 1800000,
    Re = L <= 0 ? 90000 : L === 1 ? 120000 : L === 2 ? 240000 : 300000;
  return Math.max(ee, ke, Re, h ? 0 : xeo);
}
/**
 * 创建并订阅 PrStatusPoller：按加载状态、启用开关与终端焦点调整轮询，返回当前分支 PR 状态快照。
 */
//@ chunk-18hwfzwa.js:819222-819564 placement
function usePrStatus(h, x = !0) {
  let D = useClock(),
    L = useHost(),
    ee = useTerminalFocus(),
    [ke] = y(
      () =>
        new PrStatusPoller(
          {
            setTimeout: (Re, Be) => D.setTimeout(Re, Be),
            now: () => Date.now(),
            getLastInteractionTime: () => getLastInteractionTime(),
            fetchPrStatus: () => getPrStatus(L),
            shared: zM(),
          },
          { isLoading: h, enabled: x, focused: ee },
        ),
    );
  return (
    P(() => {
      ke.setInputs({ isLoading: h, enabled: x, focused: ee });
    }, [ke, h, x, ee]),
    yt(ke.subscribe, ke.getSnapshot)
  );
}
//@ chunk-18hwfzwa.js:819564-819568 placement
j();
//@ chunk-qgpgvvwv.js:624-808 fingerprint = INITIAL_STATE (0.568)
function INITIAL_STATE(s, o) {
  if (!s || !o) return null;
  let d = s.kind === "cr" && !1,
    u = s.kind === "mr";
  return {
    prefix: u ? "MR" : "PR",
    label: `${u ? "!" : "#"}${s.number}`,
    url: o,
    dedupUrl: s.url,
    color: getPrStatusColor(s.reviewState),
  };
}

export { usePrStatus, useBgSessionPr, INITIAL_STATE, khe, useFooterLinks, FooterLink };
