/**
 * cli/headlessCloud/headlessFeatures.ts
 *
 * 2.1.316 新增：无头特性挂接与钩子合并。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-keyy05re.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-keyy05re.js:4211-4286 placement
function isServedToolsHeadlessEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_lapping", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-keyy05re.js:4286-4374 placement
function logHeadlessFeatureError(error) {
  if (isAbortError(error)) {
    logForDebugging("[headlessFeatures] a feature hook was aborted");
    return;
  }
  logError(error);
}
//@ chunk-keyy05re.js:4374-4420 placement
var HEADLESS_FEATURE_NAMES = ["settings", "hooks", "plugins", "tools"];
//@ chunk-keyy05re.js:4420-4647 placement
/**
 * 并发调用每个无头特性挂接函数（settings/hooks/plugins/tools），单个失败只记日志不影响其他特性。
 */
async function attachHeadlessFeatures(features, factories) {
  return (
    await Promise.all(
      features.map((context) =>
        Promise.resolve()
          .then(() => context(factories))
          .catch((error) => {
            logForDebugging(
              `[headlessFeatures] a feature did not attach (${factories.trigger}): ${errorMessage(error)}`,
            );
            logHeadlessFeatureError(error);
            return;
          }),
      ),
    )
  ).flatMap((feature) => (feature === undefined ? [] : [feature]));
}
//@ chunk-keyy05re.js:4647-4857 placement
function mergeFeatureHooks(base, layer) {
  return layer.reduce(
    (acc, groups) =>
      Object.entries(groups).reduce((acc, [name, fn]) => {
        if (typeof fn !== "function") return acc;
        let previous = acc[name];
        acc[name] =
          previous === undefined
            ? fn
            : (...args) => {
                let result = previous(...args);
                runFeatureCallbackSafely(() => fn(...args));
                return result;
              };
        return acc;
      }, acc),
    {
      ...base,
    },
  );
}
//@ chunk-keyy05re.js:4857-6654 placement
/**
 * 收集各无头特性的句柄（attached），统一提供 homeSeed、报告与释放。
 */
class HeadlessFeatureHandles {
  attached = [];
  replied = false;
  adopt(features) {
    this.attached = [...this.attached, ...features];
  }
  handles() {
    return this.attached;
  }
  homeSeed() {
    return this.attached.find((feature) => feature.homeSeed !== undefined)?.homeSeed;
  }
  statusFeeds() {
    return this.attached.flatMap((feature) => (feature.status === undefined ? [] : [feature.status]));
  }
  callbacks(feature) {
    return mergeFeatureHooks(
      feature,
      this.attached.flatMap((feature) =>
        feature.sessionCallbacks === undefined ? [] : [feature.sessionCallbacks],
      ),
    );
  }
  reports() {
    return Object.fromEntries(
      this.attached.flatMap((feature) => {
        if (feature.report === undefined) return [];
        try {
          return [[feature.feature, feature.report()]];
        } catch (error) {
          logHeadlessFeatureError(error);
          return [];
        }
      }),
    );
  }
  noteSession(error) {
    this.each((session) => session.onSession?.(error));
  }
  noteStreamConnected(feature) {
    this.each((streamFeature) => streamFeature.onStreamConnected?.(feature));
  }
  async noteHostSleep() {
    await this.settled(this.attached, (feature) => feature.onHostSleep?.());
  }
  noteHostWake() {
    let woke = false;
    this.each((feature) => {
      woke = feature.onHostWake?.() === true || woke;
    });
    return woke;
  }
  noteWorkerLive() {
    this.each((feature) => feature.onWorkerLive?.());
  }
  noteWorkerInit(feature) {
    this.each((initFeature) => initFeature.onWorkerInit?.(feature));
  }
  noteWorkerUp(feature) {
    this.each((turnFeature) => turnFeature.onWorkerUp?.(feature));
  }
  noteTurnInFlight() {
    this.each((features) => features.onTurnInFlight?.());
  }
  noteTurnEnded() {
    this.each((feature) => feature.onTurnEnded?.());
  }
  sendWait() {
    let filtered = this.attached.filter((feature) => feature.beforeSend !== undefined);
    if (filtered.length === 0) return null;
    return async () => {
      await this.settled(filtered, (feature) => feature.beforeSend?.());
    };
  }
  noteSessionCleared(session) {
    this.each((feature) => feature.onSessionCleared?.(session));
  }
  noteMessageSent(feature) {
    this.each((replyFeature) => replyFeature.onMessageSent?.(feature));
  }
  noteReply(reply) {
    if (this.replied) return;
    this.replied = true;
    this.each((feature) => feature.afterFirstReply?.(reply));
  }
  async dispose(options = {}) {
    let attached = this.attached;
    this.attached = [];
    await this.settled(attached, (feature) => feature.dispose?.(options));
  }
  settled(features, fn) {
    return Promise.all(
      features.map((feature) =>
        Promise.resolve()
          .then(() => fn(feature))
          .catch((error) => logHeadlessFeatureError(error)),
      ),
    );
  }
  each(fn) {
    this.attached.forEach((feature) => runFeatureCallbackSafely(() => fn(feature)));
  }
  onEachSettled(fn) {
    this.each((feature) => feature.onSettled?.(() => runFeatureCallbackSafely(fn)));
  }
  onEachReportChanged(fn) {
    this.each((feature) => feature.onReportChanged?.(() => runFeatureCallbackSafely(fn)));
  }
}
//@ chunk-keyy05re.js:6654-6743 placement
function runFeatureCallbackSafely(fn) {
  try {
    let result = fn();
    if (result instanceof Promise) result.catch((error) => logHeadlessFeatureError(error));
  } catch (error) {
    logHeadlessFeatureError(error);
  }
}
//@ chunk-keyy05re.js:6743-6759 placement
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
