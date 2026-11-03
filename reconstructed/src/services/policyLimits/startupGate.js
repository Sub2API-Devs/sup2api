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
var ei = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;
/**
 * 错误名（合法时）或类型，用于遥测。
 */
//@ chunk-7t4fmt2f.js:5240-5347 placement
function errorKindForTelemetry(e) {
  if (e instanceof Error) return ei.test(e.name) ? e.name : "Error";
  return e === null ? "null" : typeof e;
}
/**
 * 托管配置启动状态（设置/策略结果与屏障、阻塞计数、影子日志）。
 */
//@ chunk-7t4fmt2f.js:5347-5662 placement
class ManagedConfigStartupState {
  settings = void 0;
  policy = void 0;
  settingsBarrier = void 0;
  policyBarrier = void 0;
  isDefaultCommand = void 0;
  openStartupBlocks = 0;
  policyGate = void 0;
  settingsReader = void 0;
  orgGateShadow = void 0;
  orgGateShadowSettle = void 0;
  orgGateShadowLogged = !1;
  unregisterOrgGateShadowExitFlush = void 0;
  logged = !1;
  unregisterExitFlush = void 0;
}
//@ chunk-7t4fmt2f.js:5662-5687 placement
var ti = new HostScoped(() => new ManagedConfigStartupState());
//@ chunk-7t4fmt2f.js:5687-5753 placement
function Ke(e = performance.now()) {
  return isDisklessProcess() ? void 0 : Math.round(e);
}
//@ chunk-7t4fmt2f.js:5753-5821 placement
function gt(e, r) {
  return e === void 0 || r === void 0 ? void 0 : Math.max(e, r);
}
//@ chunk-7t4fmt2f.js:5821-5947 placement
function withStartupState(e) {
  try {
    let r = onProcessRootHost(ti);
    if (r.logged) return;
    ((r.unregisterExitFlush ??= registerCleanup(() => withStartupState((n) => Ne(n, "exit")))), e(r));
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-7t4fmt2f.js:5947-5996 placement
function H_i(e) {
  withStartupState((r) => {
    r.isDefaultCommand ??= e;
  });
}
//@ chunk-7t4fmt2f.js:5996-6038 placement
function Ue(e) {
  withStartupState((r) => {
    r.policyGate ??= e;
  });
}
//@ chunk-7t4fmt2f.js:6038-6085 placement
function N_i(e) {
  withStartupState((r) => {
    r.settingsReader ??= e;
  });
}
//@ chunk-7t4fmt2f.js:6085-6159 placement
function $_i(e, r) {
  withStartupState((n) => {
    ((n.orgGateShadow ??= e), (n.orgGateShadowSettle ??= r));
  });
}
//@ chunk-7t4fmt2f.js:6159-6203 placement
var We = new Set(["ineligible", "superseded"]);
/**
 * 记录设置或策略的加载结果。
 */
//@ chunk-7t4fmt2f.js:6203-6315 placement
function recordManagedConfigResult(e, r) {
  withStartupState((n) => {
    let o = n[e];
    if (o !== void 0 && !We.has(o.source)) return;
    ((n[e] = { ...r, settledMs: Ke() }), maybeEmitWhenResolved(n));
  });
}
//@ chunk-7t4fmt2f.js:6315-6391 placement
function oat(e, r, { since: n, supersede: o = !1 } = {}) {
  withStartupState((u) => {
    (recordBarrier(u, e, r, n, o), maybeEmitWhenResolved(u));
  });
}
/**
 * 开始一个启动阻塞，返回结束回调（记录屏障）。
 */
//@ chunk-7t4fmt2f.js:6391-6575 placement
function beginStartupBlock(e, { supersede: r = !1 } = {}) {
  let startTime = performance.now(),
    o = !1;
  return (
    withStartupState((u) => {
      (u.openStartupBlocks++, (o = !0));
    }),
    (u) =>
      withStartupState((p) => {
        if (!o) return;
        ((o = !1), p.openStartupBlocks--, recordBarrier(p, e, u, startTime, r), maybeEmitWhenResolved(p));
      })
  );
}
//@ chunk-7t4fmt2f.js:6575-6799 placement
function recordBarrier(e, r, n, o, u) {
  let p = r === "settings" ? "settingsBarrier" : "policyBarrier";
  if (e[p] !== void 0 && !u) return;
  let startTime = performance.now();
  e[p] = {
    result: typeof n === "function" ? n() : n,
    waitMs: o === void 0 ? 0 : Math.round(startTime - o),
    crossedMs: Ke(startTime),
  };
}
/**
 * 退出时上报 tengu_managed_config_ready。
 */
//@ chunk-7t4fmt2f.js:6799-6941 placement
function emitManagedConfigReadyAtExit() {
  let resolved = Promise.resolve();
  return (
    withStartupState((r) => {
      let n = readGateFieldsSafe(r.policyGate);
      ((resolved = logEventAsync(
        TENGU_MANAGED_CONFIG_READY,
        buildManagedConfigReadyEvent(r, "exit", n),
      ).catch((o) => {
        logError(toError(o));
      })),
        maybeLogOrgGateShadow(r, n, "exit"));
    }),
    resolved
  );
}
//@ chunk-7t4fmt2f.js:6941-6985 placement
function F_i() {
  withStartupState((e) => Ne(e, "first_prompt"));
}
//@ chunk-7t4fmt2f.js:6985-7161 placement
function maybeEmitWhenResolved(e) {
  if (
    e.settings &&
    e.policy &&
    e.settingsBarrier &&
    e.policyBarrier &&
    !We.has(e.settings.source) &&
    !We.has(e.policy.source) &&
    e.openStartupBlocks === 0
  )
    Ne(e, "both_resolved");
}
//@ chunk-7t4fmt2f.js:7161-7231 placement
var TENGU_MANAGED_CONFIG_READY = "tengu_managed_config_ready",
  TENGU_ORG_CONFIG_GATE_SHADOW = "tengu_org_config_gate_shadow";
//@ chunk-7t4fmt2f.js:7231-7297 placement
function Ne(e, r) {
  let n = readGateFieldsSafe(e.policyGate);
  (logEvent(TENGU_MANAGED_CONFIG_READY, buildManagedConfigReadyEvent(e, r, n)),
    maybeLogOrgGateShadow(e, n, r));
}
/**
 * 组织门控影子结果等待落定后上报。
 */
//@ chunk-7t4fmt2f.js:7297-7651 placement
function maybeLogOrgGateShadow(e, r, n) {
  if (e.orgGateShadow === void 0 || e.orgGateShadowLogged) return;
  if (n !== "exit" && e.orgGateShadowSettle !== void 0) {
    if (e.unregisterOrgGateShadowExitFlush !== void 0) return;
    ((e.unregisterOrgGateShadowExitFlush = registerCleanup(async () =>
      logOrgGateShadow(e, readGateFieldsSafe(e.policyGate), "exit"),
    )),
      e
        .orgGateShadowSettle()
        .catch(() => {})
        .then(() => logOrgGateShadow(e, readGateFieldsSafe(e.policyGate), "settled")));
    return;
  }
  logOrgGateShadow(e, r, n);
}
/**
 * 上报组织门控影子结论（读取器出错记错误）。
 */
//@ chunk-7t4fmt2f.js:7651-8036 placement
function logOrgGateShadow(e, r, n) {
  if (e.orgGateShadow === void 0 || e.orgGateShadowLogged) return;
  ((e.orgGateShadowLogged = !0), e.unregisterOrgGateShadowExitFlush?.());
  try {
    logEvent(TENGU_ORG_CONFIG_GATE_SHADOW, {
      ...e.orgGateShadow({ settings: e.settings, policy: e.policy, policyGateFields: r }),
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
/**
 * 构造托管配置就绪事件字段。
 */
//@ chunk-7t4fmt2f.js:8036-8424 placement
function buildManagedConfigReadyEvent(e, r, n) {
  ((e.logged = !0), e.unregisterExitFlush?.());
  let {
    settings: settings,
    policy: policy,
    settingsBarrier: settingsBarrier,
    policyBarrier: policyBarrier,
  } = e;
  return {
    trigger: fromEnum(r),
    emitted_ms: Ke(),
    is_default_command: e.isDefaultCommand,
    settled_ms: gt(settings?.settledMs, policy?.settledMs),
    barrier_crossed_ms: gt(settingsBarrier?.crossedMs, policyBarrier?.crossedMs),
    ...sourceFields("settings", settings),
    ...barrierFields("settings", settingsBarrier),
    ...readGateFieldsSafe(e.settingsReader),
    ...sourceFields("policy", policy),
    ...barrierFields("policy", policyBarrier),
    ...n,
  };
}
//@ chunk-7t4fmt2f.js:8424-8630 placement
function readGateFieldsSafe(e) {
  if (e === void 0) return {};
  try {
    return e();
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: a registered gate-field reader threw (${errorKindForTelemetry(error)})`,
          "org-config gate: a registered gate-field reader threw",
        ),
      ),
      {}
    );
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
function nAn(e) {
  let abortController = new AbortController();
  return { attempt: e(abortController.signal), abort: () => abortController.abort() };
}
/**
 * 发出首个请求，若 delayMs 后仍需要则再发一个；按 isAnswer 判断结果是否可用，第一个可用结果胜出并中止另一个； 都失败时返回已收到的次优结果或错误。返回 {result, hedged}。
 */
//@ chunk-7t4fmt2f.js:9017-9627 placement
function hedgedRequest({
  first: first,
  send: send,
  isAnswer: isAnswer,
  delayMs: delayMs = 3000,
  stillWanted: stillWanted = () => !0,
  retryFollows: retryFollows = !0,
}) {
  return new Promise((h, y) => {
    let E = !1,
      R,
      S = 1,
      K,
      b,
      w = (P) => {
        if (((E = !0), clearTimeout(G), first.abort(), R?.abort(), P.ok))
          h({ result: P.value, hedged: R !== void 0 });
        else y(P.error);
      },
      A = (P) => {
        P.then(
          (M) => O({ ok: !0, value: M }),
          (M) => O({ ok: !1, error: M }),
        );
      },
      O = (P) => {
        if (E) return;
        S--;
        let M = S > 0;
        if (P.ok && isAnswer(P.value, M)) {
          w(b && !isAnswer(P.value, !0) ? b : P);
          return;
        }
        if (M) {
          if (P.ok && isAnswer(P.value, !1)) K ??= { value: P.value };
          else if (P.ok && retryFollows) b ??= P;
          return;
        }
        w(K && !(P.ok && retryFollows) ? { ok: !0, value: K.value } : P);
      },
      G = setTimeout(() => {
        if (E || !stillWanted()) return;
        (S++, (R = nAn(send)), A(R.attempt));
      }, delayMs);
    A(first.attempt);
  });
}
/**
 * 预取请求槽：60 秒内且键匹配时复用，否则中止。
 */
//@ chunk-7t4fmt2f.js:9627-10080 placement
class PrefetchSlot {
  entry = null;
  set(e, r, n = () => !0) {
    this.clear();
    let o = nAn(r),
      u = { key: e, inFlight: o, sentAtMs: Date.now(), failed: !1 };
    (o.attempt.then(
      (p) => {
        u.failed = !n(p);
      },
      () => {
        u.failed = !0;
      },
    ),
      (this.entry = u));
  }
  get pending() {
    return this.entry !== null;
  }
  take(e) {
    let entry = this.entry;
    if (((this.entry = null), entry === null)) return;
    let n = Math.abs(Date.now() - entry.sentAtMs) <= 60000;
    if (!entry.failed && n && e(entry.key)) return entry.inFlight;
    entry.inFlight.abort();
    return;
  }
  clear() {
    (this.entry?.inFlight.abort(), (this.entry = null));
  }
}

export {
  emitManagedConfigReadyAtExit,
  H_i,
  nAn,
  hedgedRequest,
  F_i,
  PrefetchSlot,
  N_i,
  recordManagedConfigResult,
  beginStartupBlock,
  errorKindForTelemetry,
  Ue,
  oat,
  $_i,
};
