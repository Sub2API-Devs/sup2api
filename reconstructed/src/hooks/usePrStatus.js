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
import { watch } from "fs";
import { HistorySearchInput } from "../components/PromptInput/HistorySearchInput.js";
import { init_react_production, y, P, Q, yt } from "../../vendor/react/cjs/react.production.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
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
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../ink/components/Text.js";
import { useAppState } from "../state/AppState.js";
import { MAX_UNKEYED_FOOTER_LINKS } from "../components/PromptInput/footerLinks.js";
import { string, u, literal } from "../../vendor/zod/v4/classic/schemas.js";
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
import { getPrStatus, currentPrStatusFetcher } from "../utils/ghPrStatus.js";
import { getPrStatusColor } from "../components/PrBadge.js";

//@ chunk-18hwfzwa.js:814630-814642 placement
var HistorySearchInputRef = HistorySearchInput;
//@ chunk-18hwfzwa.js:814642-814646 placement
init_react_production();
//@ chunk-18hwfzwa.js:814675-815319 placement
function useBgSessionPr() {
  let [h, x] = y(null);
  let storageV5 = useTheme_2().storageV5;
  P(() => {
    if (!isBgSession() || isRemoteSessionAvailable()) return;
    let ownJobShortId = getOwnJobShortId();
    let jobDir = getJobDir(ownJobShortId);
    let ke;
    let Re = async () => {
      let found = (await readJobState(jobDir, storageV5))?.children?.find(
        (child) => child.kind !== "frame" && !ANY_CONTROL_CHAR_RE.test(child.href),
      );
      let We = found ? Number(found.id) : NaN;
      if (!found || !Number.isFinite(We)) return;
      x((ze) =>
        ze?.number === We && ze.url === found.href
          ? ze
          : {
              number: We,
              url: found.href,
            },
      );
    };
    if (storageV5 && isValidKeySegment(ownJobShortId))
      return watchJobStateFile(storageV5, ownJobShortId, Re, "[useBgSessionPr]");
    try {
      ke = watch(jobDir, (Be, He) => {
        if (He && !He.startsWith("state.json")) return;
        Re();
      });
      ke.on("error", (Be) =>
        logForDebugging(`[useBgSessionPr] watcher error: ${errorMessage(Be)}`, {
          level: "warn",
        }),
      );
      ke.unref();
    } catch (error) {
      logForDebugging(`[useBgSessionPr] watch skipped: ${errorMessage(error)}`);
    }
    Re();
    return () => ke?.close();
  }, [storageV5]);
  return h;
}
//@ chunk-18hwfzwa.js:815319-816131 placement
function FooterLink(props) {
  let $ = w(17);
  let { link } = props;
  let L;
  if ($[0] !== link.prefix) {
    L =
      link.prefix !== undefined &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: link.prefix,
          }),
          " ",
        ],
      });
    $[0] = link.prefix;
    $[1] = L;
  } else L = $[1];
  const dimColor = !link.color;
  let fallback;
  if ($[2] !== link.color || $[3] !== link.label || $[4] !== dimColor) {
    fallback = jsxProd_default(Text, {
      color: link.color,
      dimColor,
      children: link.label,
    });
    $[2] = link.color;
    $[3] = link.label;
    $[4] = dimColor;
    $[5] = fallback;
  } else fallback = $[5];
  const dimColor_2 = !link.color;
  let children;
  if ($[6] !== link.color || $[7] !== link.label || $[8] !== dimColor_2) {
    children = jsxProd_default(Text, {
      color: link.color,
      dimColor: dimColor_2,
      underline: true,
      children: link.label,
    });
    $[6] = link.color;
    $[7] = link.label;
    $[8] = dimColor_2;
    $[9] = children;
  } else children = $[9];
  let He;
  if ($[10] !== link.url || $[11] !== fallback || $[12] !== children) {
    He = jsxProd_default(Link, {
      url: link.url,
      fallback,
      assumeSupport: true,
      children,
    });
    $[10] = link.url;
    $[11] = fallback;
    $[12] = children;
    $[13] = He;
  } else He = $[13];
  let We;
  if ($[14] !== L || $[15] !== He) {
    We = jsxProd_default_2(Text, {
      children: [L, He],
    });
    $[14] = L;
    $[15] = He;
    $[16] = We;
  } else We = $[16];
  return We;
}
//@ chunk-18hwfzwa.js:816131-816135 placement
init_react_production();
//@ chunk-18hwfzwa.js:816135-816302 placement
function useFooterLinks(h) {
  let x = useAppState((L) => L.footerLinks);
  let D = h?.excludeKeyed === true;
  return Q(() => {
    let L = D ? x.filter((ee) => ee.key === undefined) : x;
    return L.length <= MAX_UNKEYED_FOOTER_LINKS ? L : L.slice(0, MAX_UNKEYED_FOOTER_LINKS);
  }, [x, D]);
}
//@ chunk-18hwfzwa.js:816302-816306 placement
init_react_production();
//@ chunk-18hwfzwa.js:816306-816399 placement
var PR_POLL_SLOW_MS = 4000;
var PR_INTERACTION_CACHE_MS = 3600000;
var PR_NOT_MODIFIED_RESET_MS = 60000;
var PR_MAX_CONSECUTIVE_ERRORS = 3;
var PR_STALE_MS = 300000;
var EMPTY_PR_STATUS_STATE = {
  pr: null,
  needsAuth: false,
  lastUpdated: 0,
};
//@ chunk-18hwfzwa.js:816399-819009 placement
class PrStatusPoller {
  #e;
  #t;
  #o = EMPTY_PR_STATUS_STATE;
  #n = createSignal();
  #s = 0;
  #r = false;
  #c = null;
  #i = 0;
  #a = false;
  #l = null;
  #d = 0;
  #m = 0;
  #p = -1;
  #u = 0;
  constructor(h, x) {
    this.#e = h;
    this.#t = x;
  }
  getSnapshot = () => this.#o;
  subscribe = (h) => {
    let x = this.#n.subscribe(h);
    this.#s++;
    if (!this.#r) this.#f();
    let D = false;
    return () => {
      if (D) return;
      D = true;
      x();
      this.#s--;
      if (this.#s === 0) this.#S();
    };
  };
  setInputs(h) {
    let x = this.#t;
    this.#t = h;
    if (!this.#r) return;
    if (h.enabled && !x.enabled) {
      this.#m = 0;
      this.#e.shared.pollerNotModifiedStreak = 0;
    }
    if ((h.focused !== x.focused && this.#y()) || h.isLoading !== x.isLoading || h.enabled !== x.enabled)
      this.#h();
  }
  #f() {
    this.#r = true;
    this.#a = false;
    this.#c = this.#e.shared.bump.subscribe(() => {
      if (this.#e.shared.pollerDisabled) return;
      this.#m = 0;
      this.#d = 0;
      this.#h();
    });
    this.#g();
  }
  #S() {
    this.#r = false;
    this.#a = false;
    this.#c?.();
    this.#c = null;
    this.#b();
  }
  #h() {
    if (this.#a) return;
    this.#a = true;
    queueMicrotask(() => {
      if (!this.#a) return;
      this.#a = false;
      this.#g();
    });
  }
  #y() {
    if (!this.#t.focused || this.#e.shared.pollerDisabled) return false;
    if (this.#d === 0) return false;
    this.#e.shared.pollerNotModifiedStreak = 0;
    if (this.#e.now() - this.#d >= PR_NOT_MODIFIED_RESET_MS) {
      this.#m = 0;
      this.#d = 0;
    }
    return true;
  }
  #b() {
    this.#i++;
    if (this.#l) {
      this.#l();
      this.#l = null;
    }
  }
  #g() {
    this.#b();
    if (!this.#t.enabled) return;
    if (this.#e.shared.pollerDisabled) return;
    let h = this.#i;
    this.#p = -1;
    this.#u = this.#e.now();
    let x = this.#w(true);
    let D = this.#e.now() - this.#d;
    if (D >= x) this.#C(h);
    else this.#v(h, x - D);
  }
  #v(h, x) {
    this.#l = this.#e.setTimeout(() => {
      this.#l = null;
      this.#C(h);
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
    let { now, shared } = this.#e;
    let lastInteractionTime = this.#e.getLastInteractionTime();
    if (this.#p !== lastInteractionTime) {
      this.#p = lastInteractionTime;
      this.#u = now();
    } else if (now() - this.#u >= PR_INTERACTION_CACHE_MS) return;
    let ee = now();
    let ke;
    try {
      ke = await this.#e.fetchPrStatus();
    } catch (error) {
      logError(error);
      ke = null;
    }
    let Re = ke;
    if (h !== this.#i) return;
    this.#d = ee;
    let Be = Re === "needs-auth" || Re === "gh-missing";
    let He = Be ? Re : false;
    let We = Re === "fetch-failed";
    let ze = null;
    let Xe = false;
    if (!Be && !We && Re !== null) {
      let { notModified = false, ...At } = Re;
      Xe = notModified;
      ze = At;
    }
    this.#m = He ? 1 : ze === null ? this.#m + 1 : 0;
    shared.pollerBadStreak = We ? shared.pollerBadStreak + 1 : 0;
    shared.pollerNotModifiedStreak = Xe ? shared.pollerNotModifiedStreak + 1 : 0;
    this.#x(ze, He);
    if (shared.pollerBadStreak >= PR_MAX_CONSECUTIVE_ERRORS) {
      shared.pollerDisabled = true;
      logFeatureSad("github_pr_status_direct", "bad_streak_disabled");
      return;
    }
    let rt = now() - ee;
    if (rt > PR_POLL_SLOW_MS) {
      shared.pollerDisabled = true;
      logFeatureSad("github_pr_status_direct", "slow_disabled", {
        elapsed_ms: rt,
      });
      return;
    }
    this.#v(h, this.#w(false));
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
    this.#o = {
      pr: h,
      needsAuth: x,
      lastUpdated: this.#e.now(),
    };
    try {
      this.#n.emit();
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-18hwfzwa.js:819009-819222 placement
/**
 * 根据空闲时长、连续未变化次数等计算 PR 状态轮询间隔（90 秒到 30 分钟，取各项最大值）。
 */
function computePrPollIntervalMs(focused, x, D, pollerNotModifiedStreak) {
  let ee = x < 30000 ? 90000 : x < 300000 ? 180000 : x < 1800000 ? 600000 : 1800000;
  let ke = D <= 0 ? 90000 : D === 1 ? 300000 : D === 2 ? 900000 : 1800000;
  let Re =
    pollerNotModifiedStreak <= 0
      ? 90000
      : pollerNotModifiedStreak === 1
        ? 120000
        : pollerNotModifiedStreak === 2
          ? 240000
          : 300000;
  return Math.max(ee, ke, Re, focused ? 0 : PR_STALE_MS);
}
//@ chunk-18hwfzwa.js:819222-819564 placement
/**
 * 创建并订阅 PrStatusPoller：按加载状态、启用开关与终端焦点调整轮询，返回当前分支 PR 状态快照。
 */
function usePrStatus(isLoading, x = true) {
  let clock = useClock();
  let host = useHost();
  let terminalFocus = useTerminalFocus();
  let [ke] = y(
    () =>
      new PrStatusPoller(
        {
          setTimeout: (Re, Be) => clock.setTimeout(Re, Be),
          now: () => Date.now(),
          getLastInteractionTime: () => getLastInteractionTime(),
          fetchPrStatus: () => getPrStatus(host),
          shared: currentPrStatusFetcher(),
        },
        {
          isLoading,
          enabled: x,
          focused: terminalFocus,
        },
      ),
  );
  P(() => {
    ke.setInputs({
      isLoading,
      enabled: x,
      focused: terminalFocus,
    });
  }, [ke, isLoading, x, terminalFocus]);
  return yt(ke.subscribe, ke.getSnapshot);
}
//@ chunk-18hwfzwa.js:819564-819568 placement
init_react_production();
//@ chunk-qgpgvvwv.js:624-808 fingerprint = INITIAL_STATE (0.568)
function INITIAL_STATE(s, o) {
  if (!s || !o) return null;
  let d = s.kind === "cr" && false;
  let u = s.kind === "mr";
  return {
    prefix: u ? "MR" : "PR",
    label: `${u ? "!" : "#"}${s.number}`,
    url: o,
    dedupUrl: s.url,
    color: getPrStatusColor(s.reviewState),
  };
}
export { usePrStatus, useBgSessionPr, INITIAL_STATE, HistorySearchInputRef, useFooterLinks, FooterLink };
