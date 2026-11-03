/**
 * components/Spinner/spinnerStatus.tsx
 *
 * 2.1.316 新增：Spinner 状态存储：API 重试状态的解析与容错（MalformedRetryStatusError）、自动模式拒绝行的上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hbc3mvx0.js (37)
 * attribution: placement 37
 */
import { j, qt, R, Se, yt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { createSignal } from "../../utils/signal.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { s9e, ME } from "../../../vendor/lodash-es/toString.js";
import { Jve } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { createStore } from "../../state/store.js";
import { getSpinnerVerbs } from "../../constants/spinnerVerbs.js";
import { SESSION_START_HOOKS_MESSAGE } from "../../utils/processUserInput/processSlashCommand.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";

//@ chunk-hbc3mvx0.js:708-712 placement
j();
//@ chunk-hbc3mvx0.js:712-732 placement
var b = qt(null),
  N = 20;
//@ chunk-hbc3mvx0.js:732-1331 placement
function AutoModeDenialsProvider(t) {
  let o = w(8),
    { children: children } = t,
    g;
  if (o[0] === MEMO_CACHE_SENTINEL) ((g = []), (o[0] = g));
  else g = o[0];
  let s = R(g),
    p;
  if (o[1] === MEMO_CACHE_SENTINEL) ((p = createSignal()), (o[1] = p));
  else p = o[1];
  let n = p,
    d,
    _,
    c;
  if (o[2] === MEMO_CACHE_SENTINEL)
    ((d = () => s.current),
      (_ = (T) => {
        ((s.current = [T, ...s.current.slice(0, N - 1)]), n.emit());
      }),
      (c = (y) => {
        ((s.current = s.current.filter((h) => h.toolName !== y.toolName || h.inputKey !== y.inputKey)),
          n.emit());
      }),
      (o[2] = d),
      (o[3] = _),
      (o[4] = c));
  else ((d = o[2]), (_ = o[3]), (c = o[4]));
  let x;
  if (o[5] === MEMO_CACHE_SENTINEL)
    ((x = {
      getDenials: d,
      recordDenial: _,
      removeDenial: c,
      subscribe: n.subscribe,
      rowTexts: new WeakMap(),
    }),
      (o[5] = x));
  else x = o[5];
  let L = x,
    A;
  if (o[6] !== children)
    ((A = e(b.Provider, { value: L, children: children })), (o[6] = children), (o[7] = A));
  else A = o[7];
  return A;
}
//@ chunk-hbc3mvx0.js:1331-1357 placement
function F() {
  return () => {};
}
//@ chunk-hbc3mvx0.js:1357-1549 placement
function useHasAutoModeDenialFor(t) {
  let o = w(3),
    r = Se(b),
    g;
  if (o[0] !== t || o[1] !== r)
    ((g = () => r?.getDenials().some((s) => t.includes(s.toolUseId)) ?? !1),
      (o[0] = t),
      (o[1] = r),
      (o[2] = g));
  else g = o[2];
  let p = g;
  return yt(r?.subscribe ?? F, p, p);
}
//@ chunk-hbc3mvx0.js:1549-1748 placement
function useAutoModeDenialsContext() {
  let t = Se(b);
  if (!t) {
    throw ReferenceError(
      "useAutoModeDenials and useDenialRowTexts cannot be called outside of an <AutoModeDenialsProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return t;
}
//@ chunk-hbc3mvx0.js:1748-1774 placement
function UWe() {
  return useAutoModeDenialsContext();
}
//@ chunk-hbc3mvx0.js:1774-1809 placement
function $nn() {
  return useAutoModeDenialsContext().rowTexts;
}
//@ chunk-hbc3mvx0.js:1809-1838 placement
var { floor: floor, random: random } = Math;
//@ chunk-hbc3mvx0.js:1838-1881 placement
function ue(t, r) {
  return t + floor(random() * (r - t + 1));
}
//@ chunk-hbc3mvx0.js:1881-1890 placement
var U = ue;
//@ chunk-hbc3mvx0.js:1890-1948 placement
function ge(t) {
  var r = t.length;
  return r ? t[U(0, r - 1)] : void 0;
}
//@ chunk-hbc3mvx0.js:1948-1957 placement
var D = ge;
//@ chunk-hbc3mvx0.js:1957-2013 placement
function de(t, r) {
  return s9e(r, function (o) {
    return t[o];
  });
}
//@ chunk-hbc3mvx0.js:2013-2022 placement
var W = de;
//@ chunk-hbc3mvx0.js:2022-2067 placement
function pe(t) {
  return t == null ? [] : W(t, Jve(t));
}
//@ chunk-hbc3mvx0.js:2067-2076 placement
var K = pe;
//@ chunk-hbc3mvx0.js:2076-2106 placement
function ce(t) {
  return D(K(t));
}
//@ chunk-hbc3mvx0.js:2106-2115 placement
var Y = ce;
//@ chunk-hbc3mvx0.js:2115-2158 placement
function me(t) {
  var r = ME(t) ? D : Y;
  return r(t);
}
//@ chunk-hbc3mvx0.js:2158-2168 placement
var wz = me;
//@ chunk-hbc3mvx0.js:2168-2172 placement
j();
//@ chunk-hbc3mvx0.js:4751-4771 placement
var yUn = "API error";
//@ chunk-hbc3mvx0.js:4771-5263 placement
function classifyRetryStatus(t) {
  try {
    let r = readRetryStatus(t);
    if (r === null || r === "not_a_retry_status" || t === null || t.kind !== "retrying")
      return { status: r === null ? t : null, malformed: r };
    if (![t.attempt, t.maxRetries, t.deadline].every(Number.isFinite))
      return { status: null, malformed: "counters_are_not_numbers" };
    let error = t.error,
      g = typeof error === "object" && error !== null && "status" in error ? error.status : void 0;
    return {
      status: { ...t, error: { ...fe, status: typeof g === "number" && Number.isFinite(g) ? g : void 0 } },
      malformed: r,
    };
  } catch {
    return { status: null, malformed: "unreadable" };
  }
}
//@ chunk-hbc3mvx0.js:5263-5293 placement
function J(t) {
  logError(new MalformedRetryStatusError(_e[t]));
}
/**
 * Spinner 无法绘制 API 重试状态时的说明文本。
 */
//@ chunk-hbc3mvx0.js:5293-6744 placement
var RETRY_STATUS_KINDS = { retrying: !0, stalled: !1, auto_mode_unavailable: !1, low_priority_waiting: !1 },
  fe = {
    message: yUn,
    status: void 0,
    requestId: void 0,
    formatted: yUn,
    connection: null,
    isNetworkDown: !1,
    rateLimits: null,
    noResponse: null,
  },
  H = "Spinner ignored an API retry status it could not draw (session unaffected): ",
  f = "Spinner replaced the error details of an API retry status it could not draw (session unaffected): ",
  _e = {
    not_a_retry_status: H + "it is not an object with a known kind",
    unreadable: H + "reading it threw",
    counters_are_not_numbers: H + "its error field is unusable and its counters are not numbers",
    error_is_nullish: f + "its error field is undefined or null",
    error_is_a_string: f + "its error field is a string",
    error_is_not_an_object: f + "its error field is a number, boolean, bigint, symbol or function",
    formatted_is_not_a_string: f + "error.formatted is set but is not a string",
    rate_limit_type_is_not_a_string: f + "error.rateLimits.rateLimitType is set but is not a string",
    error_is_an_error_instance: f + "error.formatted is undefined on an Error instance",
    error_has_no_keys: f + "error.formatted is undefined on an object with no keys",
    error_has_api_error_keys:
      f +
      "error.formatted is undefined on an object that has the headers or requestID key of an SDK APIError",
    error_has_snapshot_keys:
      f +
      "error.formatted is undefined on an object that has the connection or isNetworkDown key of an error snapshot",
    error_is_another_object: f + "error.formatted is undefined on another kind of object",
  };
//@ chunk-hbc3mvx0.js:6744-6825 placement
class MalformedRetryStatusError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(t) {
    super(t);
    this.name = "MalformedRetryStatusError";
  }
}
//@ chunk-hbc3mvx0.js:6825-7782 placement
function readRetryStatus(t) {
  if (t === null) return null;
  let r = typeof t === "object" && "kind" in t ? t.kind : void 0;
  if (!Re(r)) return "not_a_retry_status";
  if (!RETRY_STATUS_KINDS[r]) return null;
  let o = typeof t === "object" && "error" in t ? t.error : void 0;
  if (o === void 0 || o === null) return "error_is_nullish";
  if (typeof o === "string") return "error_is_a_string";
  if (typeof o !== "object") return "error_is_not_an_object";
  let g = "formatted" in o ? o.formatted : void 0;
  if (typeof g === "string") {
    let s = "rateLimits" in o ? o.rateLimits : void 0,
      p =
        (typeof s === "object" || typeof s === "function") && s !== null && "rateLimitType" in s
          ? s.rateLimitType
          : void 0;
    return p === void 0 || p === null || typeof p === "string" ? null : "rate_limit_type_is_not_a_string";
  }
  if (g !== void 0) return "formatted_is_not_a_string";
  return o instanceof Error
    ? "error_is_an_error_instance"
    : Object.keys(o).length === 0
      ? "error_has_no_keys"
      : "headers" in o || "requestID" in o
        ? "error_has_api_error_keys"
        : "connection" in o || "isNetworkDown" in o
          ? "error_has_snapshot_keys"
          : "error_is_another_object";
}
//@ chunk-hbc3mvx0.js:7782-7844 placement
function Re(t) {
  return typeof t === "string" && Object.hasOwn(RETRY_STATUS_KINDS, t);
}
//@ chunk-hbc3mvx0.js:7844-8182 placement
var RESPONDING_STATE = Object.freeze({
  mode: "responding",
  overrideMessage: null,
  overrideHeading: null,
  overrideColor: null,
  overrideShimmerColor: null,
  isCompacting: !1,
  isResponseHeld: !1,
  compactingHintText: null,
  compactingStartTime: null,
  turnEffort: null,
  turnModel: null,
  sentEffort: null,
  retryStatus: null,
  thinkingStartedAt: null,
  outputLimitRecovery: null,
  defaultVerb: "",
});
/**
 * Spinner 状态存储（requesting/thinking/重试等，畸形重试状态回调，约 3.7 KB）。
 */
//@ chunk-hbc3mvx0.js:8182-11886 placement
function createSpinnerStatusStore({ onMalformedRetryStatus: t = J } = {}) {
  let r = createStore({}),
    o = new Set();
  function g(n, d, { materialize: _ = !0 } = {}) {
    r.setState((c) => {
      let T = n in c;
      if (!T && !_) return c;
      let y = c[n] ?? { ...RESPONDING_STATE, defaultVerb: wz(getSpinnerVerbs()) ?? "" },
        h = d(y);
      if (h === y && T) return c;
      return { ...c, [n]: h };
    });
  }
  function s(n) {
    function d(i, a) {
      let now = Date.now(),
        m = i === "requesting" ? (a ?? null) : null;
      g(n, (v) =>
        v.mode === i && v.outputLimitRecovery === m
          ? v
          : { ...v, mode: i, thinkingStartedAt: i === "thinking" ? now : null, outputLimitRecovery: m },
      );
    }
    function _(i, a = null) {
      g(n, (u) =>
        u.overrideMessage === i &&
        u.overrideHeading?.words === a?.words &&
        u.overrideHeading?.detail === a?.detail
          ? u
          : { ...u, overrideMessage: i, overrideHeading: a },
      );
    }
    function c(i, a) {
      g(n, (u) =>
        u.overrideColor === i && u.overrideShimmerColor === a
          ? u
          : { ...u, overrideColor: i, overrideShimmerColor: a },
      );
    }
    function T(i, a = null) {
      g(n, (u) => (u.turnEffort === i && u.turnModel === a ? u : { ...u, turnEffort: i, turnModel: a }), {
        materialize: i !== null || a !== null,
      });
    }
    function y(i) {
      g(n, (a) => (a.sentEffort === i ? a : { ...a, sentEffort: i }));
    }
    function h(i) {
      let { status: status, malformed: malformed } = classifyRetryStatus(i);
      if (malformed !== null && !o.has(malformed)) {
        o.add(malformed);
        try {
          t(malformed);
        } catch {}
      }
      g(n, (m) => (m.retryStatus === status ? m : { ...m, retryStatus: status }));
    }
    function x(i, a = null) {
      let now = Date.now();
      g(n, (m) => {
        if (m.isCompacting === i && m.compactingHintText === a) return m;
        let v = i ? (m.compactingStartTime ?? now) : null;
        return { ...m, isCompacting: i, compactingHintText: a, compactingStartTime: v };
      });
    }
    function L() {
      g(n, (i) =>
        i.overrideMessage === null &&
        i.overrideColor === null &&
        i.overrideShimmerColor === null &&
        !i.isCompacting &&
        i.compactingHintText === null &&
        i.compactingStartTime === null
          ? i
          : {
              ...i,
              overrideMessage: null,
              overrideHeading: null,
              overrideColor: null,
              overrideShimmerColor: null,
              isCompacting: !1,
              compactingHintText: null,
              compactingStartTime: null,
            },
      );
    }
    function A(i) {
      g(n, (a) => (a.isResponseHeld === i ? a : { ...a, isResponseHeld: i }));
    }
    function ee() {
      let i = wz(getSpinnerVerbs()) ?? "";
      g(n, (a) => ({
        ...a,
        overrideMessage: null,
        overrideHeading: null,
        overrideColor: null,
        overrideShimmerColor: null,
        isCompacting: !1,
        isResponseHeld: !1,
        compactingHintText: null,
        compactingStartTime: null,
        turnEffort: null,
        turnModel: null,
        sentEffort: null,
        retryStatus: null,
        outputLimitRecovery: null,
        defaultVerb: i,
      }));
    }
    function te(i) {
      switch (i.type) {
        case "hooks_start":
          (c("claudeBlue_FOR_SYSTEM_SPINNER", "claudeBlueShimmer_FOR_SYSTEM_SPINNER"),
            _(
              i.hookType === "pre_compact"
                ? "Running PreCompact hooks\u2026"
                : i.hookType === "post_compact"
                  ? "Running PostCompact hooks\u2026"
                  : SESSION_START_HOOKS_MESSAGE,
            ));
          return;
        case "compact_start":
          (_("Compacting conversation"), x(!0, i.hintText ?? null));
          return;
        case "compact_end":
          L();
          return;
      }
    }
    return {
      setMode: d,
      setMessage: _,
      setColors: c,
      setTurnEffort: T,
      setSentEffort: y,
      setRetryStatus: h,
      setCompacting: x,
      setResponseHeld: A,
      resetOverrides: ee,
      applyCompactProgress: te,
    };
  }
  let p = {
    setMode: (n, d) => s(mainAgentId()).setMode(n, d),
    setMessage: (n, d) => s(mainAgentId()).setMessage(n, d),
    setColors: (n, d) => s(mainAgentId()).setColors(n, d),
    setTurnEffort: (n, d) => s(mainAgentId()).setTurnEffort(n, d),
    setSentEffort: (n) => s(mainAgentId()).setSentEffort(n),
    setRetryStatus: (n) => s(mainAgentId()).setRetryStatus(n),
    setCompacting: (n, d) => s(mainAgentId()).setCompacting(n, d),
    setResponseHeld: (n) => s(mainAgentId()).setResponseHeld(n),
    resetOverrides: () => s(mainAgentId()).resetOverrides(),
    applyCompactProgress: (n) => s(mainAgentId()).applyCompactProgress(n),
  };
  return {
    getSnapshot: r.getSnapshot,
    getState: r.getState,
    setState: r.setState,
    subscribe: r.subscribe,
    get(n) {
      return r.getState()[n ?? mainAgentId()] ?? RESPONDING_STATE;
    },
    bind: s,
    main: p,
    evict(n) {
      r.setState((d) => {
        if (!(n in d)) return d;
        let { [n]: _, ...c } = d;
        return c;
      });
    },
    applyEvent(n) {
      switch (n.kind) {
        case "agent-mode":
          s(n.agentId).setMode(n.mode, n.outputLimitRecovery);
          return;
        case "agent-retry-status":
          s(n.agentId).setRetryStatus(n.retryStatus);
          return;
        case "agent-turn-effort":
          s(n.agentId).setTurnEffort(n.turnEffort, n.turnModel);
          return;
        case "main-message":
          p.setMessage(n.message);
          return;
        case "main-colors":
          p.setColors(n.color, n.shimmerColor);
          return;
        case "main-response-held":
          p.setResponseHeld(n.held);
          return;
      }
    },
  };
}
//@ chunk-hbc3mvx0.js:11886-11903 placement
var Kmt = qt(null);
//@ chunk-hbc3mvx0.js:11903-12080 placement
function useSpinnerStore() {
  let t = Se(Kmt);
  if (!t)
    throw ReferenceError(
      "useSpinnerStore cannot be called outside of a SpinnerStoreContext provider (mounted by <AppStateProvider />)",
    );
  return t;
}
//@ chunk-hbc3mvx0.js:12080-12140 placement
function A0t(t) {
  let r = t ?? mainAgentId();
  return useStoreSelector(useSpinnerStore(), (o) => o[r] ?? RESPONDING_STATE);
}
//@ chunk-hbc3mvx0.js:12140-12206 placement
function x_o(t) {
  return useStoreSelector(useSpinnerStore(), (r) => (r[t] ?? RESPONDING_STATE).thinkingStartedAt);
}
//@ chunk-hbc3mvx0.js:12206-12266 placement
function P_o(t) {
  return useStoreSelector(useSpinnerStore(), (r) => (r[t] ?? RESPONDING_STATE).retryStatus);
}
//@ chunk-hbc3mvx0.js:12266-12328 placement
function _Un(t) {
  let r = mainAgentId();
  return useStoreSelector(useSpinnerStore(), (o) => (o[r] ?? RESPONDING_STATE)[t]);
}

export {
  useSpinnerStore,
  yUn,
  _Un,
  P_o,
  UWe,
  wz,
  A0t,
  Kmt,
  useHasAutoModeDenialFor,
  x_o,
  createSpinnerStatusStore,
  AutoModeDenialsProvider,
  $nn,
};
