/**
 * hooks/usePrStatus.ts
 *
 * 当前分支 PR 状态轮询（初始状态）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePrStatus.ts
 * pieces: chunk-84xc132a.js (1), chunk-czq1j3j2.js (12)
 * attribution: fingerprint 1, placement 12
 */
import { watch } from "fs";
import { getPrStatusColor } from "../components/PrBadge.js";
import {
  init_react_production,
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { HistorySearchInput } from "../components/PromptInput/HistorySearchInput.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getOwnJobShortId, getJobDir, readJobState } from "../services/daemon/jobState.js";
import { ANY_CONTROL_CHAR_RE, plural } from "../utils/stringUtils.js";
import { isValidKeySegment } from "../utils/storage/storageSpaces.js";
import { watchJobStateFile } from "../utils/background/jobStateNameSync.js";
import { logForDebugging } from "../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../ink/components/Text.js";
import { useAppState } from "../state/AppState.js";
import { MAX_UNKEYED_FOOTER_LINKS } from "../components/PromptInput/footerLinks.js";
import { stringSchema, objectSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useHost } from "../context/session.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { getLastInteractionTime } from "../bootstrap/state.js";
import { getPrStatus, currentPrStatusFetcher } from "../utils/ghPrStatus.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-84xc132a.js:625-809 fingerprint (2.1.88 match: INITIAL_STATE, 0.568)
function INITIAL_STATE(reference, url) {
  if (!reference || !url) return null;
  let isCrOnly = reference.kind === "cr" && false;
  let isMergeRequest = reference.kind === "mr";
  return {
    prefix: isMergeRequest ? "MR" : "PR",
    label: `${isMergeRequest ? "!" : "#"}${reference.number}`,
    url,
    dedupUrl: reference.url,
    color: getPrStatusColor(reference.reviewState),
  };
}
//@ chunk-czq1j3j2.js:838345-838349 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:838345", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:838349-838353 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:838349", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:839704-839708 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:839704", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:842758-842762 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:842758", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:847354-847366 placement
var HistorySearchInputRef = HistorySearchInput;
//@ chunk-czq1j3j2.js:847399-848043 placement
function useBgSessionPr() {
  let [pr, setPr] = useState(null);
  let storageV5 = useTheme_2().storageV5;
  useEffect(() => {
    if (!isBgSession() || isRemoteSessionAvailable()) return;
    let ownJobShortId = getOwnJobShortId();
    let jobDir = getJobDir(ownJobShortId);
    let watcher;
    let refresh = async () => {
      let found = (await readJobState(jobDir, storageV5))?.children?.find(
        (child) => child.kind !== "frame" && !ANY_CONTROL_CHAR_RE.test(child.href),
      );
      let number = found ? Number(found.id) : NaN;
      if (!found || !Number.isFinite(number)) return;
      setPr((prev) =>
        prev?.number === number && prev.url === found.href
          ? prev
          : {
              number,
              url: found.href,
            },
      );
    };
    if (storageV5 && isValidKeySegment(ownJobShortId))
      return watchJobStateFile(storageV5, ownJobShortId, refresh, "[useBgSessionPr]");
    try {
      watcher = watch(jobDir, (event, fileName) => {
        if (fileName && !fileName.startsWith("state.json")) return;
        refresh();
      });
      watcher.on("error", (error) =>
        logForDebugging(`[useBgSessionPr] watcher error: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
      watcher.unref();
    } catch (error) {
      logForDebugging(`[useBgSessionPr] watch skipped: ${errorMessage(error)}`);
    }
    refresh();
    return () => watcher?.close();
  }, [storageV5]);
  return pr;
}
//@ chunk-czq1j3j2.js:848043-848856 placement
function FooterLink(props) {
  let $ = useMemoCache(17);
  let { link } = props;
  let previous;
  if ($[0] !== link.prefix) {
    previous =
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
    $[1] = previous;
  } else previous = $[1];
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
  let inner;
  if ($[10] !== link.url || $[11] !== fallback || $[12] !== children) {
    inner = jsxProd_default(Link, {
      url: link.url,
      fallback,
      assumeSupport: true,
      children,
    });
    $[10] = link.url;
    $[11] = fallback;
    $[12] = children;
    $[13] = inner;
  } else inner = $[13];
  let linkElement;
  if ($[14] !== previous || $[15] !== inner) {
    linkElement = jsxProd_default_2(Text, {
      children: [previous, inner],
    });
    $[14] = previous;
    $[15] = inner;
    $[16] = linkElement;
  } else linkElement = $[16];
  return linkElement;
}
//@ chunk-czq1j3j2.js:848860-849027 placement
function useFooterLinks(options) {
  let links = useAppState((appState) => appState.footerLinks);
  let excludeKeyed = options?.excludeKeyed === true;
  return useMemo(() => {
    let filtered = excludeKeyed ? links.filter((link) => link.key === undefined) : links;
    return filtered.length <= MAX_UNKEYED_FOOTER_LINKS
      ? filtered
      : filtered.slice(0, MAX_UNKEYED_FOOTER_LINKS);
  }, [links, excludeKeyed]);
}
//@ chunk-czq1j3j2.js:849031-849124 placement
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
//@ chunk-czq1j3j2.js:849124-851734 placement
class PrStatusPoller {
  #e;
  #t;
  #o = EMPTY_PR_STATUS_STATE;
  #n = createSignal();
  #r = 0;
  #s = false;
  #l = null;
  #i = 0;
  #a = false;
  #c = null;
  #d = 0;
  #u = 0;
  #p = -1;
  #m = 0;
  constructor(deps, clock) {
    this.#e = deps;
    this.#t = clock;
  }
  getSnapshot = () => this.#o;
  subscribe = (fn) => {
    let unsubscribe = this.#n.subscribe(fn);
    this.#r++;
    if (!this.#s) this.#f();
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      unsubscribe();
      this.#r--;
      if (this.#r === 0) this.#S();
    };
  };
  setInputs(inputs) {
    let prev = this.#t;
    this.#t = inputs;
    if (!this.#s) return;
    if (inputs.enabled && !prev.enabled) {
      this.#u = 0;
      this.#e.shared.pollerNotModifiedStreak = 0;
    }
    if (
      (inputs.focused !== prev.focused && this.#y()) ||
      inputs.isLoading !== prev.isLoading ||
      inputs.enabled !== prev.enabled
    )
      this.#h();
  }
  #f() {
    this.#s = true;
    this.#a = false;
    this.#l = this.#e.shared.bump.subscribe(() => {
      if (this.#e.shared.pollerDisabled) return;
      this.#u = 0;
      this.#d = 0;
      this.#h();
    });
    this.#g();
  }
  #S() {
    this.#s = false;
    this.#a = false;
    this.#l?.();
    this.#l = null;
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
      this.#u = 0;
      this.#d = 0;
    }
    return true;
  }
  #b() {
    this.#i++;
    if (this.#c) {
      this.#c();
      this.#c = null;
    }
  }
  #g() {
    this.#b();
    if (!this.#t.enabled) return;
    if (this.#e.shared.pollerDisabled) return;
    let state = this.#i;
    this.#p = -1;
    this.#m = this.#e.now();
    let streak = this.#w(true);
    let elapsedMs = this.#e.now() - this.#d;
    if (elapsedMs >= streak) this.#C(state);
    else this.#v(state, streak - elapsedMs);
  }
  #v(status, notModified) {
    this.#c = this.#e.setTimeout(() => {
      this.#c = null;
      this.#C(status);
    }, notModified);
  }
  #C(focused) {
    this.#T(focused).catch(logError);
  }
  #w(setStreak) {
    return computePrPollIntervalMs(
      this.#t.focused,
      this.#e.now() - this.#e.getLastInteractionTime(),
      setStreak ? 0 : this.#u,
      this.#e.shared.pollerNotModifiedStreak,
    );
  }
  async #T(reason) {
    if (reason !== this.#i) return;
    let { now, shared } = this.#e;
    let lastInteractionTime = this.#e.getLastInteractionTime();
    if (this.#p !== lastInteractionTime) {
      this.#p = lastInteractionTime;
      this.#m = now();
    } else if (now() - this.#m >= PR_INTERACTION_CACHE_MS) return;
    let start = now();
    let result;
    try {
      result = await this.#e.fetchPrStatus();
    } catch (error) {
      logError(error);
      result = null;
    }
    let result_ = result;
    if (reason !== this.#i) return;
    this.#d = start;
    let needsSetup = result_ === "needs-auth" || result_ === "gh-missing";
    let statusText = needsSetup ? result_ : false;
    let isFetchFailed = result_ === "fetch-failed";
    let nextAt = null;
    let timedOut = false;
    if (!needsSetup && !isFetchFailed && result_ !== null) {
      let { notModified = false, ...rest } = result_;
      timedOut = notModified;
      nextAt = rest;
    }
    this.#u = statusText ? 1 : nextAt === null ? this.#u + 1 : 0;
    shared.pollerBadStreak = isFetchFailed ? shared.pollerBadStreak + 1 : 0;
    shared.pollerNotModifiedStreak = timedOut ? shared.pollerNotModifiedStreak + 1 : 0;
    this.#x(nextAt, statusText);
    if (shared.pollerBadStreak >= PR_MAX_CONSECUTIVE_ERRORS) {
      shared.pollerDisabled = true;
      logFeatureSad("github_pr_status_direct", "bad_streak_disabled");
      return;
    }
    let durationMs = now() - start;
    if (durationMs > PR_POLL_SLOW_MS) {
      shared.pollerDisabled = true;
      logFeatureSad("github_pr_status_direct", "slow_disabled", {
        elapsed_ms: durationMs,
      });
      return;
    }
    this.#v(reason, this.#w(false));
  }
  #x(delayMs, value) {
    let timer = this.#o;
    if (
      timer.lastUpdated > 0 &&
      timer.pr?.number === delayMs?.number &&
      timer.pr?.url === delayMs?.url &&
      timer.pr?.reviewState === delayMs?.reviewState &&
      timer.pr?.kind === delayMs?.kind &&
      timer.needsAuth === value
    )
      return;
    this.#o = {
      pr: delayMs,
      needsAuth: value,
      lastUpdated: this.#e.now(),
    };
    try {
      this.#n.emit();
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-czq1j3j2.js:851734-851947 placement
/**
 * 根据空闲时长、连续未变化次数等计算 PR 状态轮询间隔（90 秒到 30 分钟，取各项最大值）。
 */
function computePrPollIntervalMs(focused, baseMs, streak, pollerNotModifiedStreak) {
  let interval = baseMs < 30000 ? 90000 : baseMs < 300000 ? 180000 : baseMs < 1800000 ? 600000 : 1800000;
  let backoffMs = streak <= 0 ? 90000 : streak === 1 ? 300000 : streak === 2 ? 900000 : 1800000;
  let jittered =
    pollerNotModifiedStreak <= 0
      ? 90000
      : pollerNotModifiedStreak === 1
        ? 120000
        : pollerNotModifiedStreak === 2
          ? 240000
          : 300000;
  return Math.max(interval, backoffMs, jittered, focused ? 0 : PR_STALE_MS);
}
//@ chunk-czq1j3j2.js:851947-852289 placement
/**
 * 创建并订阅 PrStatusPoller：按加载状态、启用开关与终端焦点调整轮询，返回当前分支 PR 状态快照。
 */
function usePrStatus(isLoading, enabled = true) {
  let clock = useClock();
  let host = useHost();
  let terminalFocus = useTerminalFocus();
  let [poller] = useState(
    () =>
      new PrStatusPoller(
        {
          setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
          now: () => Date.now(),
          getLastInteractionTime: () => getLastInteractionTime(),
          fetchPrStatus: () => getPrStatus(host),
          shared: currentPrStatusFetcher(),
        },
        {
          isLoading,
          enabled,
          focused: terminalFocus,
        },
      ),
  );
  useEffect(() => {
    poller.setInputs({
      isLoading,
      enabled,
      focused: terminalFocus,
    });
  }, [poller, isLoading, enabled, terminalFocus]);
  return useSyncExternalStore(poller.subscribe, poller.getSnapshot);
}
export { usePrStatus, useBgSessionPr, INITIAL_STATE, HistorySearchInputRef, useFooterLinks, FooterLink };
