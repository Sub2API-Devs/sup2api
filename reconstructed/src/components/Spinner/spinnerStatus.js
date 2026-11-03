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
import { init_react_production, qt, R, Se, yt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { createSignal } from "../../utils/signal.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-hbc3mvx0.js:712-732 placement
var spinnerStatusSlot = qt(null);
var SPINNER_STATUS_MAX_MS = 20;
//@ chunk-hbc3mvx0.js:732-1331 placement
function AutoModeDenialsProvider(props) {
  let o = w(8);
  let { children } = props;
  let g;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    g = [];
    o[0] = g;
  } else g = o[0];
  let s = R(g);
  let p;
  if (o[1] === MEMO_CACHE_SENTINEL) {
    p = createSignal();
    o[1] = p;
  } else p = o[1];
  let n = p;
  let getDenials;
  let recordDenial;
  let removeDenial;
  if (o[2] === MEMO_CACHE_SENTINEL) {
    getDenials = () => s.current;
    recordDenial = (T) => {
      s.current = [T, ...s.current.slice(0, SPINNER_STATUS_MAX_MS - 1)];
      n.emit();
    };
    removeDenial = (y) => {
      s.current = s.current.filter((h) => h.toolName !== y.toolName || h.inputKey !== y.inputKey);
      n.emit();
    };
    o[2] = getDenials;
    o[3] = recordDenial;
    o[4] = removeDenial;
  } else {
    getDenials = o[2];
    recordDenial = o[3];
    removeDenial = o[4];
  }
  let x;
  if (o[5] === MEMO_CACHE_SENTINEL) {
    x = {
      getDenials,
      recordDenial,
      removeDenial,
      subscribe: n.subscribe,
      rowTexts: new WeakMap(),
    };
    o[5] = x;
  } else x = o[5];
  let value = x;
  let A;
  if (o[6] !== children) {
    A = jsxProd_default(spinnerStatusSlot.Provider, {
      value,
      children,
    });
    o[6] = children;
    o[7] = A;
  } else A = o[7];
  return A;
}
//@ chunk-hbc3mvx0.js:1331-1357 placement
function noopUnsubscribe() {
  return () => {};
}
//@ chunk-hbc3mvx0.js:1357-1549 placement
function useHasAutoModeDenialFor(t) {
  let o = w(3);
  let r = Se(spinnerStatusSlot);
  let g;
  if (o[0] !== t || o[1] !== r) {
    g = () => r?.getDenials().some((s) => t.includes(s.toolUseId)) ?? false;
    o[0] = t;
    o[1] = r;
    o[2] = g;
  } else g = o[2];
  let p = g;
  return yt(r?.subscribe ?? noopUnsubscribe, p, p);
}
//@ chunk-hbc3mvx0.js:1549-1748 placement
function useAutoModeDenialsContext() {
  let t = Se(spinnerStatusSlot);
  if (!t) {
    throw ReferenceError(
      "useAutoModeDenials and useDenialRowTexts cannot be called outside of an <AutoModeDenialsProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return t;
}
//@ chunk-hbc3mvx0.js:1748-1774 placement
/**
 * 函数 statusSnapshot（spinner 状态快照）。
 */
function statusSnapshot() {
  return useAutoModeDenialsContext();
}
//@ chunk-hbc3mvx0.js:1774-1809 placement
/**
 * 函数 statusRowTexts（spinner 行文本）。
 */
function statusRowTexts() {
  return useAutoModeDenialsContext().rowTexts;
}
//@ chunk-hbc3mvx0.js:1809-1838 placement
var { floor, random } = Math;
//@ chunk-hbc3mvx0.js:1838-1881 placement
function randomIntInclusive(t, r) {
  return t + floor(random() * (r - t + 1));
}
//@ chunk-hbc3mvx0.js:1881-1890 placement
var randomInt = randomIntInclusive;
//@ chunk-hbc3mvx0.js:1890-1948 placement
function sampleOne(t) {
  var r = t.length;
  return r ? t[randomInt(0, r - 1)] : undefined;
}
//@ chunk-hbc3mvx0.js:1948-1957 placement
var sample = sampleOne;
//@ chunk-hbc3mvx0.js:1957-2013 placement
function mapIndices(t, r) {
  return s9e(r, function (o) {
    return t[o];
  });
}
//@ chunk-hbc3mvx0.js:2013-2022 placement
var mapValues = mapIndices;
//@ chunk-hbc3mvx0.js:2022-2067 placement
function valuesArray(t) {
  return t == null ? [] : mapValues(t, Jve(t));
}
//@ chunk-hbc3mvx0.js:2067-2076 placement
var values = valuesArray;
//@ chunk-hbc3mvx0.js:2076-2106 placement
function sampleValue(t) {
  return sample(values(t));
}
//@ chunk-hbc3mvx0.js:2106-2115 placement
var sampleValueAlias = sampleValue;
//@ chunk-hbc3mvx0.js:2115-2158 placement
function sampleBy(t) {
  var r = ME(t) ? sample : sampleValueAlias;
  return r(t);
}
//@ chunk-hbc3mvx0.js:2158-2168 placement
/**
 * 导出值：sampleAlias（sample 导出别名）。
 */
var sampleAlias = sampleBy;
//@ chunk-hbc3mvx0.js:2168-2172 placement
init_react_production();
//@ chunk-hbc3mvx0.js:4751-4771 placement
/**
 * 导出值：API_ERROR_TEXT（"API error"）。
 */
var API_ERROR_TEXT = "API error";
//@ chunk-hbc3mvx0.js:4771-5263 placement
function classifyRetryStatus(t) {
  try {
    let retryStatus = readRetryStatus(t);
    if (retryStatus === null || retryStatus === "not_a_retry_status" || t === null || t.kind !== "retrying")
      return {
        status: retryStatus === null ? t : null,
        malformed: retryStatus,
      };
    if (![t.attempt, t.maxRetries, t.deadline].every(Number.isFinite))
      return {
        status: null,
        malformed: "counters_are_not_numbers",
      };
    let error = t.error;
    let status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
    return {
      status: {
        ...t,
        error: {
          ...EMPTY_RETRY_STATUS,
          status: typeof status === "number" && Number.isFinite(status) ? status : undefined,
        },
      },
      malformed: retryStatus,
    };
  } catch {
    return {
      status: null,
      malformed: "unreadable",
    };
  }
}
//@ chunk-hbc3mvx0.js:5263-5293 placement
function reportIgnoredRetryStatus(t) {
  logError(new MalformedRetryStatusError(RETRY_STATUS_IGNORE_REASONS[t]));
}
//@ chunk-hbc3mvx0.js:5293-6744 placement
/**
 * Spinner 无法绘制 API 重试状态时的说明文本。
 */
var RETRY_STATUS_KINDS = {
  retrying: true,
  stalled: false,
  auto_mode_unavailable: false,
  low_priority_waiting: false,
};
var EMPTY_RETRY_STATUS = {
  message: API_ERROR_TEXT,
  status: undefined,
  requestId: undefined,
  formatted: API_ERROR_TEXT,
  connection: null,
  isNetworkDown: false,
  rateLimits: null,
  noResponse: null,
};
var IGNORED_STATUS_PREFIX = "Spinner ignored an API retry status it could not draw (session unaffected): ";
var REPLACED_STATUS_PREFIX =
  "Spinner replaced the error details of an API retry status it could not draw (session unaffected): ";
var RETRY_STATUS_IGNORE_REASONS = {
  not_a_retry_status: IGNORED_STATUS_PREFIX + "it is not an object with a known kind",
  unreadable: IGNORED_STATUS_PREFIX + "reading it threw",
  counters_are_not_numbers:
    IGNORED_STATUS_PREFIX + "its error field is unusable and its counters are not numbers",
  error_is_nullish: REPLACED_STATUS_PREFIX + "its error field is undefined or null",
  error_is_a_string: REPLACED_STATUS_PREFIX + "its error field is a string",
  error_is_not_an_object:
    REPLACED_STATUS_PREFIX + "its error field is a number, boolean, bigint, symbol or function",
  formatted_is_not_a_string: REPLACED_STATUS_PREFIX + "error.formatted is set but is not a string",
  rate_limit_type_is_not_a_string:
    REPLACED_STATUS_PREFIX + "error.rateLimits.rateLimitType is set but is not a string",
  error_is_an_error_instance: REPLACED_STATUS_PREFIX + "error.formatted is undefined on an Error instance",
  error_has_no_keys: REPLACED_STATUS_PREFIX + "error.formatted is undefined on an object with no keys",
  error_has_api_error_keys:
    REPLACED_STATUS_PREFIX +
    "error.formatted is undefined on an object that has the headers or requestID key of an SDK APIError",
  error_has_snapshot_keys:
    REPLACED_STATUS_PREFIX +
    "error.formatted is undefined on an object that has the connection or isNetworkDown key of an error snapshot",
  error_is_another_object: REPLACED_STATUS_PREFIX + "error.formatted is undefined on another kind of object",
};
//@ chunk-hbc3mvx0.js:6744-6825 placement
class MalformedRetryStatusError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(message) {
    super(message);
    this.name = "MalformedRetryStatusError";
  }
}
//@ chunk-hbc3mvx0.js:6825-7782 placement
function readRetryStatus(t) {
  if (t === null) return null;
  let kind = typeof t === "object" && "kind" in t ? t.kind : undefined;
  if (!isKnownStatusKind(kind)) return "not_a_retry_status";
  if (!RETRY_STATUS_KINDS[kind]) return null;
  let error = typeof t === "object" && "error" in t ? t.error : undefined;
  if (error === undefined || error === null) return "error_is_nullish";
  if (typeof error === "string") return "error_is_a_string";
  if (typeof error !== "object") return "error_is_not_an_object";
  let formatted = "formatted" in error ? error.formatted : undefined;
  if (typeof formatted === "string") {
    let rateLimits = "rateLimits" in error ? error.rateLimits : undefined;
    let rateLimitType =
      (typeof rateLimits === "object" || typeof rateLimits === "function") &&
      rateLimits !== null &&
      "rateLimitType" in rateLimits
        ? rateLimits.rateLimitType
        : undefined;
    return rateLimitType === undefined || rateLimitType === null || typeof rateLimitType === "string"
      ? null
      : "rate_limit_type_is_not_a_string";
  }
  if (formatted !== undefined) return "formatted_is_not_a_string";
  return error instanceof Error
    ? "error_is_an_error_instance"
    : Object.keys(error).length === 0
      ? "error_has_no_keys"
      : "headers" in error || "requestID" in error
        ? "error_has_api_error_keys"
        : "connection" in error || "isNetworkDown" in error
          ? "error_has_snapshot_keys"
          : "error_is_another_object";
}
//@ chunk-hbc3mvx0.js:7782-7844 placement
function isKnownStatusKind(kind) {
  return typeof kind === "string" && Object.hasOwn(RETRY_STATUS_KINDS, kind);
}
//@ chunk-hbc3mvx0.js:7844-8182 placement
var RESPONDING_STATE = Object.freeze({
  mode: "responding",
  overrideMessage: null,
  overrideHeading: null,
  overrideColor: null,
  overrideShimmerColor: null,
  isCompacting: false,
  isResponseHeld: false,
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
//@ chunk-hbc3mvx0.js:8182-11886 placement
/**
 * Spinner 状态存储（requesting/thinking/重试等，畸形重试状态回调，约 3.7 KB）。
 */
function createSpinnerStatusStore({ onMalformedRetryStatus: t = reportIgnoredRetryStatus } = {}) {
  let store = createStore({});
  let o = new Set();
  function g(n, d, { materialize: _ = true } = {}) {
    store.setState((c) => {
      let T = n in c;
      if (!T && !_) return c;
      let y = c[n] ?? {
        ...RESPONDING_STATE,
        defaultVerb: sampleAlias(getSpinnerVerbs()) ?? "",
      };
      let h = d(y);
      if (h === y && T) return c;
      return {
        ...c,
        [n]: h,
      };
    });
  }
  function s(n) {
    function d(i, a) {
      let now = Date.now();
      let m = i === "requesting" ? (a ?? null) : null;
      g(n, (v) =>
        v.mode === i && v.outputLimitRecovery === m
          ? v
          : {
              ...v,
              mode: i,
              thinkingStartedAt: i === "thinking" ? now : null,
              outputLimitRecovery: m,
            },
      );
    }
    function _(i, a = null) {
      g(n, (u) =>
        u.overrideMessage === i &&
        u.overrideHeading?.words === a?.words &&
        u.overrideHeading?.detail === a?.detail
          ? u
          : {
              ...u,
              overrideMessage: i,
              overrideHeading: a,
            },
      );
    }
    function c(i, a) {
      g(n, (u) =>
        u.overrideColor === i && u.overrideShimmerColor === a
          ? u
          : {
              ...u,
              overrideColor: i,
              overrideShimmerColor: a,
            },
      );
    }
    function T(i, a = null) {
      g(
        n,
        (u) =>
          u.turnEffort === i && u.turnModel === a
            ? u
            : {
                ...u,
                turnEffort: i,
                turnModel: a,
              },
        {
          materialize: i !== null || a !== null,
        },
      );
    }
    function y(i) {
      g(n, (a) =>
        a.sentEffort === i
          ? a
          : {
              ...a,
              sentEffort: i,
            },
      );
    }
    function h(i) {
      let { status, malformed } = classifyRetryStatus(i);
      if (malformed !== null && !o.has(malformed)) {
        o.add(malformed);
        try {
          t(malformed);
        } catch {}
      }
      g(n, (m) =>
        m.retryStatus === status
          ? m
          : {
              ...m,
              retryStatus: status,
            },
      );
    }
    function x(i, a = null) {
      let now = Date.now();
      g(n, (m) => {
        if (m.isCompacting === i && m.compactingHintText === a) return m;
        let compactingStartTime = i ? (m.compactingStartTime ?? now) : null;
        return {
          ...m,
          isCompacting: i,
          compactingHintText: a,
          compactingStartTime,
        };
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
              isCompacting: false,
              compactingHintText: null,
              compactingStartTime: null,
            },
      );
    }
    function A(i) {
      g(n, (a) =>
        a.isResponseHeld === i
          ? a
          : {
              ...a,
              isResponseHeld: i,
            },
      );
    }
    function ee() {
      let defaultVerb = sampleAlias(getSpinnerVerbs()) ?? "";
      g(n, (a) => ({
        ...a,
        overrideMessage: null,
        overrideHeading: null,
        overrideColor: null,
        overrideShimmerColor: null,
        isCompacting: false,
        isResponseHeld: false,
        compactingHintText: null,
        compactingStartTime: null,
        turnEffort: null,
        turnModel: null,
        sentEffort: null,
        retryStatus: null,
        outputLimitRecovery: null,
        defaultVerb,
      }));
    }
    function te(i) {
      switch (i.type) {
        case "hooks_start":
          c("claudeBlue_FOR_SYSTEM_SPINNER", "claudeBlueShimmer_FOR_SYSTEM_SPINNER");
          _(
            i.hookType === "pre_compact"
              ? "Running PreCompact hooks\u2026"
              : i.hookType === "post_compact"
                ? "Running PostCompact hooks\u2026"
                : SESSION_START_HOOKS_MESSAGE,
          );
          return;
        case "compact_start":
          _("Compacting conversation");
          x(true, i.hintText ?? null);
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
    getSnapshot: store.getSnapshot,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    get(n) {
      return store.getState()[n ?? mainAgentId()] ?? RESPONDING_STATE;
    },
    bind: s,
    main: p,
    evict(n) {
      store.setState((d) => {
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
/**
 * 导出值：statusOverrideSlot（状态覆盖槽）。
 */
var statusOverrideSlot = qt(null);
//@ chunk-hbc3mvx0.js:11903-12080 placement
function useSpinnerStore() {
  let t = Se(statusOverrideSlot);
  if (!t)
    throw ReferenceError(
      "useSpinnerStore cannot be called outside of a SpinnerStoreContext provider (mounted by <AppStateProvider />)",
    );
  return t;
}
//@ chunk-hbc3mvx0.js:12080-12140 placement
/**
 * 函数 useSpinnerStatus（取某会话的 spinner 状态）。
 */
function useSpinnerStatus(agentId) {
  let r = agentId ?? mainAgentId();
  return useStoreSelector(useSpinnerStore(), (o) => o[r] ?? RESPONDING_STATE);
}
//@ chunk-hbc3mvx0.js:12140-12206 placement
/**
 * 函数 useThinkingStartedAt（思考开始时间）。
 */
function useThinkingStartedAt(t) {
  return useStoreSelector(useSpinnerStore(), (r) => (r[t] ?? RESPONDING_STATE).thinkingStartedAt);
}
//@ chunk-hbc3mvx0.js:12206-12266 placement
/**
 * 函数 useRetryStatus（重试状态）。
 */
function useRetryStatus(agentId) {
  return useStoreSelector(useSpinnerStore(), (r) => (r[agentId] ?? RESPONDING_STATE).retryStatus);
}
//@ chunk-hbc3mvx0.js:12266-12328 placement
/**
 * 函数 useStatusField（取状态的某个字段）。
 */
function useStatusField(t) {
  let r = mainAgentId();
  return useStoreSelector(useSpinnerStore(), (o) => (o[r] ?? RESPONDING_STATE)[t]);
}
export {
  useStatusField,
  useSpinnerStore,
  API_ERROR_TEXT,
  useRetryStatus,
  statusSnapshot,
  sampleAlias,
  useSpinnerStatus,
  statusOverrideSlot,
  useHasAutoModeDenialFor,
  useThinkingStartedAt,
  createSpinnerStatusStore,
  AutoModeDenialsProvider,
  statusRowTexts,
};
