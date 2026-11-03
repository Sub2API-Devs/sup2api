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
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_lapping", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-fe6rs39h.js:4165-4253 placement
function logHeadlessFeatureError(e) {
  if (isAbortError(e)) {
    logForDebugging("[headlessFeatures] a feature hook was aborted");
    return;
  }
  logError(e);
}
//@ chunk-fe6rs39h.js:4253-4299 placement
var HEADLESS_FEATURE_NAMES = ["settings", "hooks", "plugins", "tools"];
/**
 * 并发调用每个无头特性挂接函数（settings/hooks/plugins/tools），单个失败只记日志不影响其他特性。
 */
//@ chunk-fe6rs39h.js:4299-4526 placement
async function attachHeadlessFeatures(e, n) {
  return (
    await Promise.all(
      e.map((r) =>
        Promise.resolve()
          .then(() => r(n))
          .catch((h) => {
            (logForDebugging(
              `[headlessFeatures] a feature did not attach (${n.trigger}): ${errorMessage(h)}`,
            ),
              logHeadlessFeatureError(h));
            return;
          }),
      ),
    )
  ).flatMap((r) => (r === void 0 ? [] : [r]));
}
//@ chunk-fe6rs39h.js:4526-4736 placement
function mergeFeatureHooks(e, n) {
  return n.reduce(
    (r, h) =>
      Object.entries(h).reduce((y, [S, w]) => {
        if (typeof w !== "function") return y;
        let R = y[S];
        return (
          (y[S] =
            R === void 0
              ? w
              : (...k) => {
                  let I = R(...k);
                  return (runFeatureCallbackSafely(() => w(...k)), I);
                }),
          y
        );
      }, r),
    { ...e },
  );
}
/**
 * 收集各无头特性的句柄（attached），统一提供 homeSeed、报告与释放。
 */
//@ chunk-fe6rs39h.js:4736-6533 placement
class HeadlessFeatureHandles {
  attached = [];
  replied = !1;
  adopt(e) {
    this.attached = [...this.attached, ...e];
  }
  handles() {
    return this.attached;
  }
  homeSeed() {
    return this.attached.find((e) => e.homeSeed !== void 0)?.homeSeed;
  }
  statusFeeds() {
    return this.attached.flatMap((e) => (e.status === void 0 ? [] : [e.status]));
  }
  callbacks(e) {
    return mergeFeatureHooks(
      e,
      this.attached.flatMap((n) => (n.sessionCallbacks === void 0 ? [] : [n.sessionCallbacks])),
    );
  }
  reports() {
    return Object.fromEntries(
      this.attached.flatMap((e) => {
        if (e.report === void 0) return [];
        try {
          return [[e.feature, e.report()]];
        } catch (error) {
          return (logHeadlessFeatureError(error), []);
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
    let e = !1;
    return (
      this.each((n) => {
        e = n.onHostWake?.() === !0 || e;
      }),
      e
    );
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
    let filtered = this.attached.filter((n) => n.beforeSend !== void 0);
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
    ((this.replied = !0), this.each((n) => n.afterFirstReply?.(e)));
  }
  async dispose(e = {}) {
    let attached = this.attached;
    ((this.attached = []), await this.settled(attached, (s) => s.dispose?.(e)));
  }
  settled(e, n) {
    return Promise.all(
      e.map((s) =>
        Promise.resolve()
          .then(() => n(s))
          .catch((r) => logHeadlessFeatureError(r)),
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
    if (n instanceof Promise) n.catch((s) => logHeadlessFeatureError(s));
  } catch (error) {
    logHeadlessFeatureError(error);
  }
}
//@ chunk-fe6rs39h.js:6622-6638 placement
var SERVED_TOOLS_MAX_CALLS = 20,
  Ps = 64;

export {
  SERVED_TOOLS_MAX_CALLS,
  Ps,
  isServedToolsHeadlessEnabled,
  HEADLESS_FEATURE_NAMES,
  HeadlessFeatureHandles,
  attachHeadlessFeatures,
};
