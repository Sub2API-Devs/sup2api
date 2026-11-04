/**
 * services/policyLimits/startupGate.ts
 *
 * 2.1.316 新增。启动时策略门控。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (30)
 * attribution: placement 30
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { isDisklessProcess, onProcessRootHost } from "../../bootstrap/state.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logError } from "../../utils/log.js";
import { toError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { logEventAsync, logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7t4fmt2f.js:5202-5240 placement
var ERROR_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;
//@ chunk-7t4fmt2f.js:5240-5347 placement
/**
 * 错误名（合法时）或类型，用于遥测。
 */
function errorKindForTelemetry(error) {
  if (error instanceof Error) return ERROR_NAME_REGEX.test(error.name) ? error.name : "Error";
  return error === null ? "null" : typeof error;
}
//@ chunk-7t4fmt2f.js:5347-5662 placement
/**
 * 托管配置启动状态（设置/策略结果与屏障、阻塞计数、影子日志）。
 */
class ManagedConfigStartupState {
  settings = undefined;
  policy = undefined;
  settingsBarrier = undefined;
  policyBarrier = undefined;
  isDefaultCommand = undefined;
  openStartupBlocks = 0;
  policyGate = undefined;
  settingsReader = undefined;
  orgGateShadow = undefined;
  orgGateShadowSettle = undefined;
  orgGateShadowLogged = false;
  unregisterOrgGateShadowExitFlush = undefined;
  logged = false;
  unregisterExitFlush = undefined;
}
//@ chunk-7t4fmt2f.js:5662-5687 placement
var startupGateStateSlots; // deferred: uses ManagedConfigStartupState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7t4fmt2f.js:5662", () => {
  startupGateStateSlots = new HostScoped(() => new ManagedConfigStartupState());
});
//@ chunk-7t4fmt2f.js:5687-5753 placement
/**
 * 相对启动的毫秒时间戳，无盘会话不记录。
 */
function elapsedMsSinceStart(startTimestamp = performance.now()) {
  return isDisklessProcess() ? undefined : Math.round(startTimestamp);
}
//@ chunk-7t4fmt2f.js:5753-5821 placement
/**
 * 取两个时间中较晚者，任一未定义则 undefined。
 */
function laterOf(firstMs, secondMs) {
  return firstMs === undefined || secondMs === undefined ? undefined : Math.max(firstMs, secondMs);
}
//@ chunk-7t4fmt2f.js:5821-5947 placement
function withStartupState(fn) {
  try {
    let startupState = onProcessRootHost(startupGateStateSlots);
    if (startupState.logged) return;
    startupState.unregisterExitFlush ??= registerCleanup(() =>
      withStartupState((startupState) => emitManagedConfigReady(startupState, "exit")),
    );
    fn(startupState);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-7t4fmt2f.js:5947-5996 placement
/**
 * 记录「是否默认命令」（只设一次）。
 */
function setDefaultCommandFlag(isDefaultCommand) {
  withStartupState((startupState) => {
    startupState.isDefaultCommand ??= isDefaultCommand;
  });
}
//@ chunk-7t4fmt2f.js:5996-6038 placement
/**
 * 记录策略门控对象（只设一次）。
 */
function setPolicyGate(policyGate) {
  withStartupState((startupState) => {
    startupState.policyGate ??= policyGate;
  });
}
//@ chunk-7t4fmt2f.js:6038-6085 placement
/**
 * 记录设置读取器（只设一次）。
 */
function setSettingsReader(settingsOutcomeFields) {
  withStartupState((startupState) => {
    startupState.settingsReader ??= settingsOutcomeFields;
  });
}
//@ chunk-7t4fmt2f.js:6085-6159 placement
/**
 * 设置组织门控影子模式（只记录不拦截）。
 */
function setOrgGateShadow(orgGateShadow, orgGateShadowSettle) {
  withStartupState((startupState) => {
    startupState.orgGateShadow ??= orgGateShadow;
    startupState.orgGateShadowSettle ??= orgGateShadowSettle;
  });
}
//@ chunk-7t4fmt2f.js:6159-6203 placement
var SUPERSEDED_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7t4fmt2f.js:6159", () => {
  SUPERSEDED_SOURCES = new Set(["ineligible", "superseded"]);
});
//@ chunk-7t4fmt2f.js:6203-6315 placement
/**
 * 记录设置或策略的加载结果。
 */
function recordManagedConfigResult(sourceName, outcome) {
  withStartupState((startupState) => {
    let existing = startupState[sourceName];
    if (existing !== undefined && !SUPERSEDED_SOURCES.has(existing.source)) return;
    startupState[sourceName] = {
      ...outcome,
      settledMs: elapsedMsSinceStart(),
    };
    maybeEmitWhenResolved(startupState);
  });
}
//@ chunk-7t4fmt2f.js:6315-6391 placement
/**
 * 记录一次设置/策略加载屏障，并在可能时上报。
 */
function recordLoadBarrier(sourceName, crossed, { since: sinceMs, supersede = false } = {}) {
  withStartupState((startupState) => {
    recordBarrier(startupState, sourceName, crossed, sinceMs, supersede);
    maybeEmitWhenResolved(startupState);
  });
}
//@ chunk-7t4fmt2f.js:6391-6575 placement
/**
 * 开始一个启动阻塞，返回结束回调（记录屏障）。
 */
function beginStartupBlock(sourceName, { supersede = false } = {}) {
  let startTime = performance.now();
  let isOpen = false;
  withStartupState((startupState) => {
    startupState.openStartupBlocks++;
    isOpen = true;
  });
  return (result) =>
    withStartupState((startupState) => {
      if (!isOpen) return;
      isOpen = false;
      startupState.openStartupBlocks--;
      recordBarrier(startupState, sourceName, result, startTime, supersede);
      maybeEmitWhenResolved(startupState);
    });
}
//@ chunk-7t4fmt2f.js:6575-6799 placement
function recordBarrier(startupState, sourceName, result, sinceMs, supersede) {
  let barrierKey = sourceName === "settings" ? "settingsBarrier" : "policyBarrier";
  if (startupState[barrierKey] !== undefined && !supersede) return;
  let startTime = performance.now();
  startupState[barrierKey] = {
    result: typeof result === "function" ? result() : result,
    waitMs: sinceMs === undefined ? 0 : Math.round(startTime - sinceMs),
    crossedMs: elapsedMsSinceStart(startTime),
  };
}
//@ chunk-7t4fmt2f.js:6799-6941 placement
/**
 * 退出时上报 tengu_managed_config_ready。
 */
function emitManagedConfigReadyAtExit() {
  let resolved = Promise.resolve();
  withStartupState((startupState) => {
    let gateFields = readGateFieldsSafe(startupState.policyGate);
    resolved = logEventAsync(
      TENGU_MANAGED_CONFIG_READY,
      buildManagedConfigReadyEvent(startupState, "exit", gateFields),
    ).catch((error) => {
      logError(toError(error));
    });
    maybeLogOrgGateShadow(startupState, gateFields, "exit");
  });
  return resolved;
}
//@ chunk-7t4fmt2f.js:6941-6985 placement
/**
 * 首条提示时上报托管配置就绪。
 */
function logFirstPromptReady() {
  withStartupState((startupState) => emitManagedConfigReady(startupState, "first_prompt"));
}
//@ chunk-7t4fmt2f.js:6985-7161 placement
function maybeEmitWhenResolved(startupState) {
  if (
    startupState.settings &&
    startupState.policy &&
    startupState.settingsBarrier &&
    startupState.policyBarrier &&
    !SUPERSEDED_SOURCES.has(startupState.settings.source) &&
    !SUPERSEDED_SOURCES.has(startupState.policy.source) &&
    startupState.openStartupBlocks === 0
  )
    emitManagedConfigReady(startupState, "both_resolved");
}
//@ chunk-7t4fmt2f.js:7161-7231 placement
var TENGU_MANAGED_CONFIG_READY = "tengu_managed_config_ready";
var TENGU_ORG_CONFIG_GATE_SHADOW = "tengu_org_config_gate_shadow";
//@ chunk-7t4fmt2f.js:7231-7297 placement
/**
 * 上报托管配置就绪事件，并记录组织门控影子结果。
 */
function emitManagedConfigReady(startupState, trigger) {
  let gateFields = readGateFieldsSafe(startupState.policyGate);
  logEvent(TENGU_MANAGED_CONFIG_READY, buildManagedConfigReadyEvent(startupState, trigger, gateFields));
  maybeLogOrgGateShadow(startupState, gateFields, trigger);
}
//@ chunk-7t4fmt2f.js:7297-7651 placement
/**
 * 组织门控影子结果等待落定后上报。
 */
function maybeLogOrgGateShadow(startupState, policyGateFields, trigger) {
  if (startupState.orgGateShadow === undefined || startupState.orgGateShadowLogged) return;
  if (trigger !== "exit" && startupState.orgGateShadowSettle !== undefined) {
    if (startupState.unregisterOrgGateShadowExitFlush !== undefined) return;
    startupState.unregisterOrgGateShadowExitFlush = registerCleanup(async () =>
      logOrgGateShadow(startupState, readGateFieldsSafe(startupState.policyGate), "exit"),
    );
    startupState
      .orgGateShadowSettle()
      .catch(() => {})
      .then(() => logOrgGateShadow(startupState, readGateFieldsSafe(startupState.policyGate), "settled"));
    return;
  }
  logOrgGateShadow(startupState, policyGateFields, trigger);
}
//@ chunk-7t4fmt2f.js:7651-8036 placement
/**
 * 上报组织门控影子结论（读取器出错记错误）。
 */
function logOrgGateShadow(startupState, policyGateFields, trigger) {
  if (startupState.orgGateShadow === undefined || startupState.orgGateShadowLogged) return;
  startupState.orgGateShadowLogged = true;
  startupState.unregisterOrgGateShadowExitFlush?.();
  try {
    logEvent(TENGU_ORG_CONFIG_GATE_SHADOW, {
      ...startupState.orgGateShadow({
        settings: startupState.settings,
        policy: startupState.policy,
        policyGateFields,
      }),
      shadow_trigger: fromEnum(trigger),
    });
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: the shadow verdict readers threw (${errorKindForTelemetry(error)})`,
        "org-config gate: the shadow verdict readers threw",
      ),
    );
  }
}
//@ chunk-7t4fmt2f.js:8036-8424 placement
/**
 * 构造托管配置就绪事件字段。
 */
function buildManagedConfigReadyEvent(startupState, trigger, gateFields) {
  startupState.logged = true;
  startupState.unregisterExitFlush?.();
  let { settings, policy, settingsBarrier, policyBarrier } = startupState;
  return {
    trigger: fromEnum(trigger),
    emitted_ms: elapsedMsSinceStart(),
    is_default_command: startupState.isDefaultCommand,
    settled_ms: laterOf(settings?.settledMs, policy?.settledMs),
    barrier_crossed_ms: laterOf(settingsBarrier?.crossedMs, policyBarrier?.crossedMs),
    ...sourceFields("settings", settings),
    ...barrierFields("settings", settingsBarrier),
    ...readGateFieldsSafe(startupState.settingsReader),
    ...sourceFields("policy", policy),
    ...barrierFields("policy", policyBarrier),
    ...gateFields,
  };
}
//@ chunk-7t4fmt2f.js:8424-8630 placement
function readGateFieldsSafe(policyGate) {
  if (policyGate === undefined) return {};
  try {
    return policyGate();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `org-config gate: a registered gate-field reader threw (${errorKindForTelemetry(error)})`,
        "org-config gate: a registered gate-field reader threw",
      ),
    );
    return {};
  }
}
//@ chunk-7t4fmt2f.js:8630-8819 placement
function sourceFields(sourceName, outcome) {
  return {
    [`${sourceName}_source`]: outcome ? fromEnum(outcome.source) : fromEnum("pending"),
    [`${sourceName}_had_cache`]: outcome?.hadCache,
    [`${sourceName}_awaited`]: outcome?.awaited,
    [`${sourceName}_fetch_ms`]: outcome?.fetchMs,
    [`${sourceName}_settled_ms`]: outcome?.settledMs,
  };
}
//@ chunk-7t4fmt2f.js:8819-8927 placement
function barrierFields(sourceName, barrier) {
  return {
    [`${sourceName}_barrier`]: barrier ? fromEnum(barrier.result) : fromEnum("not_reached"),
    [`${sourceName}_barrier_wait_ms`]: barrier?.waitMs,
  };
}
//@ chunk-7t4fmt2f.js:8927-9017 placement
/**
 * 把一次请求包成可中止的 attempt（abort 时中止）。
 */
function abortableAttempt(startAttempt) {
  let abortController = new AbortController();
  return {
    attempt: startAttempt(abortController.signal),
    abort: () => abortController.abort(),
  };
}
//@ chunk-7t4fmt2f.js:9017-9627 placement
/**
 * 发出首个请求，若 delayMs 后仍需要则再发一个；按 isAnswer 判断结果是否可用，第一个可用结果胜出并中止另一个； 都失败时返回已收到的次优结果或错误。返回 {result, hedged}。
 */
function hedgedRequest({
  first,
  send,
  isAnswer,
  delayMs = 3000,
  stillWanted = () => true,
  retryFollows = true,
}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let hedgeAttempt;
    let pendingCount = 1;
    let provisionalResult;
    let retryResult;
    let finish = (outcome) => {
      settled = true;
      clearTimeout(timer);
      first.abort();
      hedgeAttempt?.abort();
      if (outcome.ok)
        resolve({
          result: outcome.value,
          hedged: hedgeAttempt !== undefined,
        });
      else reject(outcome.error);
    };
    let awaitAttempt = (attempt) => {
      attempt.then(
        (value) =>
          settle({
            ok: true,
            value,
          }),
        (error) =>
          settle({
            ok: false,
            error,
          }),
      );
    };
    let settle = (attemptOutcome) => {
      if (settled) return;
      pendingCount--;
      let morePending = pendingCount > 0;
      if (attemptOutcome.ok && isAnswer(attemptOutcome.value, morePending)) {
        finish(retryResult && !isAnswer(attemptOutcome.value, true) ? retryResult : attemptOutcome);
        return;
      }
      if (morePending) {
        if (attemptOutcome.ok && isAnswer(attemptOutcome.value, false))
          provisionalResult ??= {
            value: attemptOutcome.value,
          };
        else if (attemptOutcome.ok && retryFollows) retryResult ??= attemptOutcome;
        return;
      }
      finish(
        provisionalResult && !(attemptOutcome.ok && retryFollows)
          ? {
              ok: true,
              value: provisionalResult.value,
            }
          : attemptOutcome,
      );
    };
    let timer = setTimeout(() => {
      if (settled || !stillWanted()) return;
      pendingCount++;
      hedgeAttempt = abortableAttempt(send);
      awaitAttempt(hedgeAttempt.attempt);
    }, delayMs);
    awaitAttempt(first.attempt);
  });
}
//@ chunk-7t4fmt2f.js:9627-10080 placement
/**
 * 预取请求槽：60 秒内且键匹配时复用，否则中止。
 */
class PrefetchSlot {
  entry = null;
  set(key, send, isAnswer = () => true) {
    this.clear();
    let inFlight = abortableAttempt(send);
    let entry = {
      key,
      inFlight,
      sentAtMs: Date.now(),
      failed: false,
    };
    inFlight.attempt.then(
      (value) => {
        entry.failed = !isAnswer(value);
      },
      () => {
        entry.failed = true;
      },
    );
    this.entry = entry;
  }
  get pending() {
    return this.entry !== null;
  }
  take(acceptKey) {
    let entry = this.entry;
    this.entry = null;
    if (entry === null) return;
    let isFresh = Math.abs(Date.now() - entry.sentAtMs) <= 60000;
    if (!entry.failed && isFresh && acceptKey(entry.key)) return entry.inFlight;
    entry.inFlight.abort();
    return;
  }
  clear() {
    this.entry?.inFlight.abort();
    this.entry = null;
  }
}
export {
  setDefaultCommandFlag,
  emitManagedConfigReadyAtExit,
  abortableAttempt,
  hedgedRequest,
  logFirstPromptReady,
  PrefetchSlot,
  setSettingsReader,
  recordManagedConfigResult,
  beginStartupBlock,
  errorKindForTelemetry,
  setPolicyGate,
  recordLoadBarrier,
  setOrgGateShadow,
};
