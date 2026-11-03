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
var startupGateStateSlots = new HostScoped(() => new ManagedConfigStartupState());
//@ chunk-7t4fmt2f.js:5687-5753 placement
/**
 * 相对启动的毫秒时间戳，无盘会话不记录。
 */
function elapsedMsSinceStart(e = performance.now()) {
  return isDisklessProcess() ? undefined : Math.round(e);
}
//@ chunk-7t4fmt2f.js:5753-5821 placement
/**
 * 取两个时间中较晚者，任一未定义则 undefined。
 */
function laterOf(e, r) {
  return e === undefined || r === undefined ? undefined : Math.max(e, r);
}
//@ chunk-7t4fmt2f.js:5821-5947 placement
function withStartupState(e) {
  try {
    let r = onProcessRootHost(startupGateStateSlots);
    if (r.logged) return;
    r.unregisterExitFlush ??= registerCleanup(() =>
      withStartupState((n) => emitManagedConfigReady(n, "exit")),
    );
    e(r);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-7t4fmt2f.js:5947-5996 placement
/**
 * 记录「是否默认命令」（只设一次）。
 */
function setDefaultCommandFlag(e) {
  withStartupState((r) => {
    r.isDefaultCommand ??= e;
  });
}
//@ chunk-7t4fmt2f.js:5996-6038 placement
/**
 * 记录策略门控对象（只设一次）。
 */
function setPolicyGate(e) {
  withStartupState((r) => {
    r.policyGate ??= e;
  });
}
//@ chunk-7t4fmt2f.js:6038-6085 placement
/**
 * 记录设置读取器（只设一次）。
 */
function setSettingsReader(settingsOutcomeFields) {
  withStartupState((r) => {
    r.settingsReader ??= settingsOutcomeFields;
  });
}
//@ chunk-7t4fmt2f.js:6085-6159 placement
/**
 * 设置组织门控影子模式（只记录不拦截）。
 */
function setOrgGateShadow(e, r) {
  withStartupState((n) => {
    n.orgGateShadow ??= e;
    n.orgGateShadowSettle ??= r;
  });
}
//@ chunk-7t4fmt2f.js:6159-6203 placement
var SUPERSEDED_SOURCES = new Set(["ineligible", "superseded"]);
//@ chunk-7t4fmt2f.js:6203-6315 placement
/**
 * 记录设置或策略的加载结果。
 */
function recordManagedConfigResult(e, r) {
  withStartupState((n) => {
    let o = n[e];
    if (o !== undefined && !SUPERSEDED_SOURCES.has(o.source)) return;
    n[e] = {
      ...r,
      settledMs: elapsedMsSinceStart(),
    };
    maybeEmitWhenResolved(n);
  });
}
//@ chunk-7t4fmt2f.js:6315-6391 placement
/**
 * 记录一次设置/策略加载屏障，并在可能时上报。
 */
function recordLoadBarrier(e, r, { since: n, supersede: o = false } = {}) {
  withStartupState((u) => {
    recordBarrier(u, e, r, n, o);
    maybeEmitWhenResolved(u);
  });
}
//@ chunk-7t4fmt2f.js:6391-6575 placement
/**
 * 开始一个启动阻塞，返回结束回调（记录屏障）。
 */
function beginStartupBlock(e, { supersede: r = false } = {}) {
  let startTime = performance.now();
  let o = false;
  withStartupState((u) => {
    u.openStartupBlocks++;
    o = true;
  });
  return (u) =>
    withStartupState((p) => {
      if (!o) return;
      o = false;
      p.openStartupBlocks--;
      recordBarrier(p, e, u, startTime, r);
      maybeEmitWhenResolved(p);
    });
}
//@ chunk-7t4fmt2f.js:6575-6799 placement
function recordBarrier(e, r, n, o, u) {
  let p = r === "settings" ? "settingsBarrier" : "policyBarrier";
  if (e[p] !== undefined && !u) return;
  let startTime = performance.now();
  e[p] = {
    result: typeof n === "function" ? n() : n,
    waitMs: o === undefined ? 0 : Math.round(startTime - o),
    crossedMs: elapsedMsSinceStart(startTime),
  };
}
//@ chunk-7t4fmt2f.js:6799-6941 placement
/**
 * 退出时上报 tengu_managed_config_ready。
 */
function emitManagedConfigReadyAtExit() {
  let resolved = Promise.resolve();
  withStartupState((r) => {
    let gateFields = readGateFieldsSafe(r.policyGate);
    resolved = logEventAsync(
      TENGU_MANAGED_CONFIG_READY,
      buildManagedConfigReadyEvent(r, "exit", gateFields),
    ).catch((error) => {
      logError(toError(error));
    });
    maybeLogOrgGateShadow(r, gateFields, "exit");
  });
  return resolved;
}
//@ chunk-7t4fmt2f.js:6941-6985 placement
/**
 * 首条提示时上报托管配置就绪。
 */
function logFirstPromptReady() {
  withStartupState((e) => emitManagedConfigReady(e, "first_prompt"));
}
//@ chunk-7t4fmt2f.js:6985-7161 placement
function maybeEmitWhenResolved(e) {
  if (
    e.settings &&
    e.policy &&
    e.settingsBarrier &&
    e.policyBarrier &&
    !SUPERSEDED_SOURCES.has(e.settings.source) &&
    !SUPERSEDED_SOURCES.has(e.policy.source) &&
    e.openStartupBlocks === 0
  )
    emitManagedConfigReady(e, "both_resolved");
}
//@ chunk-7t4fmt2f.js:7161-7231 placement
var TENGU_MANAGED_CONFIG_READY = "tengu_managed_config_ready";
var TENGU_ORG_CONFIG_GATE_SHADOW = "tengu_org_config_gate_shadow";
//@ chunk-7t4fmt2f.js:7231-7297 placement
/**
 * 上报托管配置就绪事件，并记录组织门控影子结果。
 */
function emitManagedConfigReady(e, r) {
  let gateFields = readGateFieldsSafe(e.policyGate);
  logEvent(TENGU_MANAGED_CONFIG_READY, buildManagedConfigReadyEvent(e, r, gateFields));
  maybeLogOrgGateShadow(e, gateFields, r);
}
//@ chunk-7t4fmt2f.js:7297-7651 placement
/**
 * 组织门控影子结果等待落定后上报。
 */
function maybeLogOrgGateShadow(e, policyGateFields, n) {
  if (e.orgGateShadow === undefined || e.orgGateShadowLogged) return;
  if (n !== "exit" && e.orgGateShadowSettle !== undefined) {
    if (e.unregisterOrgGateShadowExitFlush !== undefined) return;
    e.unregisterOrgGateShadowExitFlush = registerCleanup(async () =>
      logOrgGateShadow(e, readGateFieldsSafe(e.policyGate), "exit"),
    );
    e.orgGateShadowSettle()
      .catch(() => {})
      .then(() => logOrgGateShadow(e, readGateFieldsSafe(e.policyGate), "settled"));
    return;
  }
  logOrgGateShadow(e, policyGateFields, n);
}
//@ chunk-7t4fmt2f.js:7651-8036 placement
/**
 * 上报组织门控影子结论（读取器出错记错误）。
 */
function logOrgGateShadow(e, policyGateFields, n) {
  if (e.orgGateShadow === undefined || e.orgGateShadowLogged) return;
  e.orgGateShadowLogged = true;
  e.unregisterOrgGateShadowExitFlush?.();
  try {
    logEvent(TENGU_ORG_CONFIG_GATE_SHADOW, {
      ...e.orgGateShadow({
        settings: e.settings,
        policy: e.policy,
        policyGateFields,
      }),
      shadow_trigger: fromEnum(n),
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
function buildManagedConfigReadyEvent(e, r, gateFields) {
  e.logged = true;
  e.unregisterExitFlush?.();
  let { settings, policy, settingsBarrier, policyBarrier } = e;
  return {
    trigger: fromEnum(r),
    emitted_ms: elapsedMsSinceStart(),
    is_default_command: e.isDefaultCommand,
    settled_ms: laterOf(settings?.settledMs, policy?.settledMs),
    barrier_crossed_ms: laterOf(settingsBarrier?.crossedMs, policyBarrier?.crossedMs),
    ...sourceFields("settings", settings),
    ...barrierFields("settings", settingsBarrier),
    ...readGateFieldsSafe(e.settingsReader),
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
function sourceFields(e, r) {
  return {
    [`${e}_source`]: r ? fromEnum(r.source) : fromEnum("pending"),
    [`${e}_had_cache`]: r?.hadCache,
    [`${e}_awaited`]: r?.awaited,
    [`${e}_fetch_ms`]: r?.fetchMs,
    [`${e}_settled_ms`]: r?.settledMs,
  };
}
//@ chunk-7t4fmt2f.js:8819-8927 placement
function barrierFields(e, r) {
  return {
    [`${e}_barrier`]: r ? fromEnum(r.result) : fromEnum("not_reached"),
    [`${e}_barrier_wait_ms`]: r?.waitMs,
  };
}
//@ chunk-7t4fmt2f.js:8927-9017 placement
/**
 * 把一次请求包成可中止的 attempt（abort 时中止）。
 */
function abortableAttempt(e) {
  let abortController = new AbortController();
  return {
    attempt: e(abortController.signal),
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
    let E = false;
    let R;
    let S = 1;
    let K;
    let b;
    let w = (P) => {
      E = true;
      clearTimeout(timer);
      first.abort();
      R?.abort();
      if (P.ok)
        resolve({
          result: P.value,
          hedged: R !== undefined,
        });
      else reject(P.error);
    };
    let A = (attempt) => {
      attempt.then(
        (value) =>
          O({
            ok: true,
            value,
          }),
        (error) =>
          O({
            ok: false,
            error,
          }),
      );
    };
    let O = (P) => {
      if (E) return;
      S--;
      let M = S > 0;
      if (P.ok && isAnswer(P.value, M)) {
        w(b && !isAnswer(P.value, true) ? b : P);
        return;
      }
      if (M) {
        if (P.ok && isAnswer(P.value, false))
          K ??= {
            value: P.value,
          };
        else if (P.ok && retryFollows) b ??= P;
        return;
      }
      w(
        K && !(P.ok && retryFollows)
          ? {
              ok: true,
              value: K.value,
            }
          : P,
      );
    };
    let timer = setTimeout(() => {
      if (E || !stillWanted()) return;
      S++;
      R = abortableAttempt(send);
      A(R.attempt);
    }, delayMs);
    A(first.attempt);
  });
}
//@ chunk-7t4fmt2f.js:9627-10080 placement
/**
 * 预取请求槽：60 秒内且键匹配时复用，否则中止。
 */
class PrefetchSlot {
  entry = null;
  set(key, r, n = () => true) {
    this.clear();
    let o = abortableAttempt(r);
    let u = {
      key,
      inFlight: o,
      sentAtMs: Date.now(),
      failed: false,
    };
    o.attempt.then(
      (p) => {
        u.failed = !n(p);
      },
      () => {
        u.failed = true;
      },
    );
    this.entry = u;
  }
  get pending() {
    return this.entry !== null;
  }
  take(e) {
    let entry = this.entry;
    this.entry = null;
    if (entry === null) return;
    let n = Math.abs(Date.now() - entry.sentAtMs) <= 60000;
    if (!entry.failed && n && e(entry.key)) return entry.inFlight;
    entry.inFlight.abort();
    return;
  }
  clear() {
    this.entry?.inFlight.abort();
    this.entry = null;
  }
}
export {
  emitManagedConfigReadyAtExit,
  setDefaultCommandFlag,
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
