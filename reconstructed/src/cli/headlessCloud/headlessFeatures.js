/**
 * cli/headlessCloud/headlessFeatures.ts
 *
 * 2.1.316 新增：无头特性挂接与钩子合并。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-fe6rs39h.js:4090-4165 placement
function isServedToolsHeadlessEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_lapping", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-fe6rs39h.js:4165-4253 placement
function logHeadlessFeatureError(error) {
  if (isAbortError(error)) {
    logForDebugging("[headlessFeatures] a feature hook was aborted");
    return;
  }
  logError(error);
}
//@ chunk-fe6rs39h.js:4253-4299 placement
var HEADLESS_FEATURE_NAMES = ["settings", "hooks", "plugins", "tools"];
//@ chunk-fe6rs39h.js:4299-4526 placement
/**
 * 并发调用每个无头特性挂接函数（settings/hooks/plugins/tools），单个失败只记日志不影响其他特性。
 */
async function attachHeadlessFeatures(features, n) {
  return (
    await Promise.all(
      features.map((r) =>
        Promise.resolve()
          .then(() => r(n))
          .catch((error) => {
            logForDebugging(
              `[headlessFeatures] a feature did not attach (${n.trigger}): ${errorMessage(error)}`,
            );
            logHeadlessFeatureError(error);
            return;
          }),
      ),
    )
  ).flatMap((r) => (r === undefined ? [] : [r]));
}
//@ chunk-fe6rs39h.js:4526-4736 placement
function mergeFeatureHooks(e, n) {
  return n.reduce(
    (acc, h) =>
      Object.entries(h).reduce((acc, [S, w]) => {
        if (typeof w !== "function") return acc;
        let R = acc[S];
        acc[S] =
          R === undefined
            ? w
            : (...k) => {
                let I = R(...k);
                runFeatureCallbackSafely(() => w(...k));
                return I;
              };
        return acc;
      }, acc),
    {
      ...e,
    },
  );
}
//@ chunk-fe6rs39h.js:4736-6533 placement
/**
 * 收集各无头特性的句柄（attached），统一提供 homeSeed、报告与释放。
 */
class HeadlessFeatureHandles {
  attached = [];
  replied = false;
  adopt(e) {
    this.attached = [...this.attached, ...e];
  }
  handles() {
    return this.attached;
  }
  homeSeed() {
    return this.attached.find((e) => e.homeSeed !== undefined)?.homeSeed;
  }
  statusFeeds() {
    return this.attached.flatMap((e) => (e.status === undefined ? [] : [e.status]));
  }
  callbacks(e) {
    return mergeFeatureHooks(
      e,
      this.attached.flatMap((n) => (n.sessionCallbacks === undefined ? [] : [n.sessionCallbacks])),
    );
  }
  reports() {
    return Object.fromEntries(
      this.attached.flatMap((e) => {
        if (e.report === undefined) return [];
        try {
          return [[e.feature, e.report()]];
        } catch (error) {
          logHeadlessFeatureError(error);
          return [];
        }
      }),
    );
  }
  noteSession(e) {
    this.each((n) => n.onSession?.(e));
  }
  noteStreamConnected(e) {
    this.each((n) => n.onStreamConnected?.(e));
  }
  async noteHostSleep() {
    await this.settled(this.attached, (e) => e.onHostSleep?.());
  }
  noteHostWake() {
    let e = false;
    this.each((n) => {
      e = n.onHostWake?.() === true || e;
    });
    return e;
  }
  noteWorkerLive() {
    this.each((e) => e.onWorkerLive?.());
  }
  noteWorkerInit(e) {
    this.each((n) => n.onWorkerInit?.(e));
  }
  noteWorkerUp(e) {
    this.each((n) => n.onWorkerUp?.(e));
  }
  noteTurnInFlight() {
    this.each((e) => e.onTurnInFlight?.());
  }
  noteTurnEnded() {
    this.each((e) => e.onTurnEnded?.());
  }
  sendWait() {
    let filtered = this.attached.filter((n) => n.beforeSend !== undefined);
    if (filtered.length === 0) return null;
    return async () => {
      await this.settled(filtered, (n) => n.beforeSend?.());
    };
  }
  noteSessionCleared(e) {
    this.each((n) => n.onSessionCleared?.(e));
  }
  noteMessageSent(e) {
    this.each((n) => n.onMessageSent?.(e));
  }
  noteReply(e) {
    if (this.replied) return;
    this.replied = true;
    this.each((n) => n.afterFirstReply?.(e));
  }
  async dispose(e = {}) {
    let attached = this.attached;
    this.attached = [];
    await this.settled(attached, (s) => s.dispose?.(e));
  }
  settled(e, n) {
    return Promise.all(
      e.map((s) =>
        Promise.resolve()
          .then(() => n(s))
          .catch((error) => logHeadlessFeatureError(error)),
      ),
    );
  }
  each(e) {
    this.attached.forEach((n) => runFeatureCallbackSafely(() => e(n)));
  }
  onEachSettled(e) {
    this.each((n) => n.onSettled?.(() => runFeatureCallbackSafely(e)));
  }
  onEachReportChanged(e) {
    this.each((n) => n.onReportChanged?.(() => runFeatureCallbackSafely(e)));
  }
}
//@ chunk-fe6rs39h.js:6533-6622 placement
function runFeatureCallbackSafely(e) {
  try {
    let n = e();
    if (n instanceof Promise) n.catch((error) => logHeadlessFeatureError(error));
  } catch (error) {
    logHeadlessFeatureError(error);
  }
}
//@ chunk-fe6rs39h.js:6622-6638 placement
var SERVED_TOOLS_MAX_CALLS = 20;
var MAX_SERVED_TOOL_CALLS_LISTED = 64;
export {
  SERVED_TOOLS_MAX_CALLS,
  MAX_SERVED_TOOL_CALLS_LISTED,
  isServedToolsHeadlessEnabled,
  HEADLESS_FEATURE_NAMES,
  HeadlessFeatureHandles,
  attachHeadlessFeatures,
};
