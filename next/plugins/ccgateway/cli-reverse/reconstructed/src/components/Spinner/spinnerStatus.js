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
import {
  init_react_production,
  createContext,
  useRef,
  useContext,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { createSignal } from "../../utils/signal.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { import_arrayMap, isArrayAlias } from "../../../vendor/lodash-es/toString.js";
import { keysAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { createStore } from "../../state/store.js";
import { getSpinnerVerbs } from "../../constants/spinnerVerbs.js";
import { SESSION_START_HOOKS_MESSAGE } from "../../utils/processUserInput/processSlashCommand.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hbc3mvx0.js:708-712 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hbc3mvx0.js:708", () => {
  init_react_production();
});
//@ chunk-hbc3mvx0.js:712-732 placement
var spinnerStatusSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SPINNER_STATUS_MAX_MS;
deferInit("chunk-hbc3mvx0.js:712", () => {
  spinnerStatusSlot = createContext(null);
  SPINNER_STATUS_MAX_MS = 20;
});
//@ chunk-hbc3mvx0.js:732-1331 placement
function AutoModeDenialsProvider(props) {
  let $ = useMemoCache(8);
  let { children } = props;
  let initialDenials;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialDenials = [];
    $[0] = initialDenials;
  } else initialDenials = $[0];
  let denialsRef = useRef(initialDenials);
  let signal;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    signal = createSignal();
    $[1] = signal;
  } else signal = $[1];
  let statusSignal = signal;
  let getDenials;
  let recordDenial;
  let removeDenial;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    getDenials = () => denialsRef.current;
    recordDenial = (denial) => {
      denialsRef.current = [denial, ...denialsRef.current.slice(0, SPINNER_STATUS_MAX_MS - 1)];
      statusSignal.emit();
    };
    removeDenial = (denial) => {
      denialsRef.current = denialsRef.current.filter(
        (state) => state.toolName !== denial.toolName || state.inputKey !== denial.inputKey,
      );
      statusSignal.emit();
    };
    $[2] = getDenials;
    $[3] = recordDenial;
    $[4] = removeDenial;
  } else {
    getDenials = $[2];
    recordDenial = $[3];
    removeDenial = $[4];
  }
  let statusValue;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    statusValue = {
      getDenials,
      recordDenial,
      removeDenial,
      subscribe: statusSignal.subscribe,
      rowTexts: new WeakMap(),
    };
    $[5] = statusValue;
  } else statusValue = $[5];
  let value = statusValue;
  let spinnerStatusSlotElement;
  if ($[6] !== children) {
    spinnerStatusSlotElement = jsxProd_default(spinnerStatusSlot.Provider, {
      value,
      children,
    });
    $[6] = children;
    $[7] = spinnerStatusSlotElement;
  } else spinnerStatusSlotElement = $[7];
  return spinnerStatusSlotElement;
}
//@ chunk-hbc3mvx0.js:1331-1357 placement
function noopUnsubscribe() {
  return () => {};
}
//@ chunk-hbc3mvx0.js:1357-1549 placement
function useHasAutoModeDenialFor(agentId) {
  let $ = useMemoCache(3);
  let store = useContext(spinnerStatusSlot);
  let hasDenial;
  if ($[0] !== agentId || $[1] !== store) {
    hasDenial = () => store?.getDenials().some((state) => agentId.includes(state.toolUseId)) ?? false;
    $[0] = agentId;
    $[1] = store;
    $[2] = hasDenial;
  } else hasDenial = $[2];
  let denial = hasDenial;
  return useSyncExternalStore(store?.subscribe ?? noopUnsubscribe, denial, denial);
}
//@ chunk-hbc3mvx0.js:1549-1748 placement
function useAutoModeDenialsContext() {
  let store = useContext(spinnerStatusSlot);
  if (!store) {
    throw ReferenceError(
      "useAutoModeDenials and useDenialRowTexts cannot be called outside of an <AutoModeDenialsProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return store;
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
function randomIntInclusive(min, max) {
  return min + floor(random() * (max - min + 1));
}
//@ chunk-hbc3mvx0.js:1881-1890 placement
var randomInt = randomIntInclusive;
//@ chunk-hbc3mvx0.js:1890-1948 placement
function sampleOne(items) {
  var length = items.length;
  return length ? items[randomInt(0, length - 1)] : undefined;
}
//@ chunk-hbc3mvx0.js:1948-1957 placement
var sample = sampleOne;
//@ chunk-hbc3mvx0.js:1957-2013 placement
function mapIndices(values, indices) {
  return import_arrayMap(indices, function (index) {
    return values[index];
  });
}
//@ chunk-hbc3mvx0.js:2013-2022 placement
var mapValues = mapIndices;
//@ chunk-hbc3mvx0.js:2022-2067 placement
function valuesArray(record) {
  return record == null ? [] : mapValues(record, keysAlias(record));
}
//@ chunk-hbc3mvx0.js:2067-2076 placement
var values = valuesArray;
//@ chunk-hbc3mvx0.js:2076-2106 placement
function sampleValue(record) {
  return sample(values(record));
}
//@ chunk-hbc3mvx0.js:2106-2115 placement
var sampleValueAlias = sampleValue;
//@ chunk-hbc3mvx0.js:2115-2158 placement
function sampleBy(value) {
  var sampler = isArrayAlias(value) ? sample : sampleValueAlias;
  return sampler(value);
}
//@ chunk-hbc3mvx0.js:2158-2168 placement
/**
 * 导出值：sampleAlias（sample 导出别名）。
 */
var sampleAlias = sampleBy;
//@ chunk-hbc3mvx0.js:2168-2172 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hbc3mvx0.js:2168", () => {
  init_react_production();
});
//@ chunk-hbc3mvx0.js:4751-4771 placement
/**
 * 导出值：API_ERROR_TEXT（"API error"）。
 */
var API_ERROR_TEXT = "API error";
//@ chunk-hbc3mvx0.js:4771-5263 placement
function classifyRetryStatus(spinnerState) {
  try {
    let retryStatus = readRetryStatus(spinnerState);
    if (
      retryStatus === null ||
      retryStatus === "not_a_retry_status" ||
      spinnerState === null ||
      spinnerState.kind !== "retrying"
    )
      return {
        status: retryStatus === null ? spinnerState : null,
        malformed: retryStatus,
      };
    if (![spinnerState.attempt, spinnerState.maxRetries, spinnerState.deadline].every(Number.isFinite))
      return {
        status: null,
        malformed: "counters_are_not_numbers",
      };
    let error = spinnerState.error;
    let status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
    return {
      status: {
        ...spinnerState,
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
function reportIgnoredRetryStatus(reason) {
  logError(new MalformedRetryStatusError(RETRY_STATUS_IGNORE_REASONS[reason]));
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
let MalformedRetryStatusError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hbc3mvx0.js:6744", () => {
  MalformedRetryStatusError = class MalformedRetryStatusError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(message) {
      super(message);
      this.name = "MalformedRetryStatusError";
    }
  };
});
//@ chunk-hbc3mvx0.js:6825-7782 placement
function readRetryStatus(value) {
  if (value === null) return null;
  let kind = typeof value === "object" && "kind" in value ? value.kind : undefined;
  if (!isKnownStatusKind(kind)) return "not_a_retry_status";
  if (!RETRY_STATUS_KINDS[kind]) return null;
  let error = typeof value === "object" && "error" in value ? value.error : undefined;
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
var RESPONDING_STATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hbc3mvx0.js:7844", () => {
  RESPONDING_STATE = Object.freeze({
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
});
//@ chunk-hbc3mvx0.js:8182-11886 placement
/**
 * Spinner 状态存储（requesting/thinking/重试等，畸形重试状态回调，约 3.7 KB）。
 */
function createSpinnerStatusStore({ onMalformedRetryStatus = reportIgnoredRetryStatus } = {}) {
  let store = createStore({});
  let seen = new Set();
  function updateEntry(key, updater, { materialize = true } = {}) {
    store.setState((state) => {
      let hasKey = key in state;
      if (!hasKey && !materialize) return state;
      let entry = state[key] ?? {
        ...RESPONDING_STATE,
        defaultVerb: sampleAlias(getSpinnerVerbs()) ?? "",
      };
      let nextEntry = updater(entry);
      if (nextEntry === entry && hasKey) return state;
      return {
        ...state,
        [key]: nextEntry,
      };
    });
  }
  function makeUpdater(key) {
    function setMode(mode, recovery) {
      let now = Date.now();
      let outputLimitRecovery = mode === "requesting" ? (recovery ?? null) : null;
      updateEntry(key, (entry) =>
        entry.mode === mode && entry.outputLimitRecovery === outputLimitRecovery
          ? entry
          : {
              ...entry,
              mode,
              thinkingStartedAt: mode === "thinking" ? now : null,
              outputLimitRecovery,
            },
      );
    }
    function setOverrideMessage(message, heading = null) {
      updateEntry(key, (entry) =>
        entry.overrideMessage === message &&
        entry.overrideHeading?.words === heading?.words &&
        entry.overrideHeading?.detail === heading?.detail
          ? entry
          : {
              ...entry,
              overrideMessage: message,
              overrideHeading: heading,
            },
      );
    }
    function setOverrideColors(color, shimmerColor) {
      updateEntry(key, (state) =>
        state.overrideColor === color && state.overrideShimmerColor === shimmerColor
          ? state
          : {
              ...state,
              overrideColor: color,
              overrideShimmerColor: shimmerColor,
            },
      );
    }
    function setTurnEffort(effort, model = null) {
      updateEntry(
        key,
        (entry) =>
          entry.turnEffort === effort && entry.turnModel === model
            ? entry
            : {
                ...entry,
                turnEffort: effort,
                turnModel: model,
              },
        {
          materialize: effort !== null || model !== null,
        },
      );
    }
    function setSentEffort(effort) {
      updateEntry(key, (entry) =>
        entry.sentEffort === effort
          ? entry
          : {
              ...entry,
              sentEffort: effort,
            },
      );
    }
    function setRetryStatus(rawStatus) {
      let { status, malformed } = classifyRetryStatus(rawStatus);
      if (malformed !== null && !seen.has(malformed)) {
        seen.add(malformed);
        try {
          onMalformedRetryStatus(malformed);
        } catch {}
      }
      updateEntry(key, (entry) =>
        entry.retryStatus === status
          ? entry
          : {
              ...entry,
              retryStatus: status,
            },
      );
    }
    function setCompacting(compacting, hintText = null) {
      let now = Date.now();
      updateEntry(key, (entry) => {
        if (entry.isCompacting === compacting && entry.compactingHintText === hintText) return entry;
        let compactingStartTime = compacting ? (entry.compactingStartTime ?? now) : null;
        return {
          ...entry,
          isCompacting: compacting,
          compactingHintText: hintText,
          compactingStartTime,
        };
      });
    }
    function resetCompacting() {
      updateEntry(key, (entry) =>
        entry.overrideMessage === null &&
        entry.overrideColor === null &&
        entry.overrideShimmerColor === null &&
        !entry.isCompacting &&
        entry.compactingHintText === null &&
        entry.compactingStartTime === null
          ? entry
          : {
              ...entry,
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
    function setResponseHeld(held) {
      updateEntry(key, (entry) =>
        entry.isResponseHeld === held
          ? entry
          : {
              ...entry,
              isResponseHeld: held,
            },
      );
    }
    function resetAll() {
      let defaultVerb = sampleAlias(getSpinnerVerbs()) ?? "";
      updateEntry(key, (entry) => ({
        ...entry,
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
    function applyCompactProgress(progress) {
      switch (progress.type) {
        case "hooks_start":
          setOverrideColors("claudeBlue_FOR_SYSTEM_SPINNER", "claudeBlueShimmer_FOR_SYSTEM_SPINNER");
          setOverrideMessage(
            progress.hookType === "pre_compact"
              ? "Running PreCompact hooks\u2026"
              : progress.hookType === "post_compact"
                ? "Running PostCompact hooks\u2026"
                : SESSION_START_HOOKS_MESSAGE,
          );
          return;
        case "compact_start":
          setOverrideMessage("Compacting conversation");
          setCompacting(true, progress.hintText ?? null);
          return;
        case "compact_end":
          resetCompacting();
          return;
      }
    }
    return {
      setMode,
      setMessage: setOverrideMessage,
      setColors: setOverrideColors,
      setTurnEffort,
      setSentEffort,
      setRetryStatus,
      setCompacting,
      setResponseHeld,
      resetOverrides: resetAll,
      applyCompactProgress,
    };
  }
  let main = {
    setMode: (mode, recovery) => makeUpdater(mainAgentId()).setMode(mode, recovery),
    setMessage: (message, heading) => makeUpdater(mainAgentId()).setMessage(message, heading),
    setColors: (color, shimmerColor) => makeUpdater(mainAgentId()).setColors(color, shimmerColor),
    setTurnEffort: (effort, model) => makeUpdater(mainAgentId()).setTurnEffort(effort, model),
    setSentEffort: (effort) => makeUpdater(mainAgentId()).setSentEffort(effort),
    setRetryStatus: (status) => makeUpdater(mainAgentId()).setRetryStatus(status),
    setCompacting: (compacting, hintText) => makeUpdater(mainAgentId()).setCompacting(compacting, hintText),
    setResponseHeld: (held) => makeUpdater(mainAgentId()).setResponseHeld(held),
    resetOverrides: () => makeUpdater(mainAgentId()).resetOverrides(),
    applyCompactProgress: (progress) => makeUpdater(mainAgentId()).applyCompactProgress(progress),
  };
  return {
    getSnapshot: store.getSnapshot,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    get(key) {
      return store.getState()[key ?? mainAgentId()] ?? RESPONDING_STATE;
    },
    bind: makeUpdater,
    main,
    evict(key) {
      store.setState((state) => {
        if (!(key in state)) return state;
        let { [key]: removed, ...next } = state;
        return next;
      });
    },
    applyEvent(event) {
      switch (event.kind) {
        case "agent-mode":
          makeUpdater(event.agentId).setMode(event.mode, event.outputLimitRecovery);
          return;
        case "agent-retry-status":
          makeUpdater(event.agentId).setRetryStatus(event.retryStatus);
          return;
        case "agent-turn-effort":
          makeUpdater(event.agentId).setTurnEffort(event.turnEffort, event.turnModel);
          return;
        case "main-message":
          main.setMessage(event.message);
          return;
        case "main-colors":
          main.setColors(event.color, event.shimmerColor);
          return;
        case "main-response-held":
          main.setResponseHeld(event.held);
          return;
      }
    },
  };
}
//@ chunk-hbc3mvx0.js:11886-11903 placement
/**
 * 导出值：statusOverrideSlot（状态覆盖槽）。
 */
var statusOverrideSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hbc3mvx0.js:11886", () => {
  statusOverrideSlot = createContext(null);
});
//@ chunk-hbc3mvx0.js:11903-12080 placement
function useSpinnerStore() {
  let store = useContext(statusOverrideSlot);
  if (!store)
    throw ReferenceError(
      "useSpinnerStore cannot be called outside of a SpinnerStoreContext provider (mounted by <AppStateProvider />)",
    );
  return store;
}
//@ chunk-hbc3mvx0.js:12080-12140 placement
/**
 * 函数 useSpinnerStatus（取某会话的 spinner 状态）。
 */
function useSpinnerStatus(agentId) {
  let targetAgentId = agentId ?? mainAgentId();
  return useStoreSelector(useSpinnerStore(), (states) => states[targetAgentId] ?? RESPONDING_STATE);
}
//@ chunk-hbc3mvx0.js:12140-12206 placement
/**
 * 函数 useThinkingStartedAt（思考开始时间）。
 */
function useThinkingStartedAt(agentId) {
  return useStoreSelector(
    useSpinnerStore(),
    (states) => (states[agentId] ?? RESPONDING_STATE).thinkingStartedAt,
  );
}
//@ chunk-hbc3mvx0.js:12206-12266 placement
/**
 * 函数 useRetryStatus（重试状态）。
 */
function useRetryStatus(agentId) {
  return useStoreSelector(useSpinnerStore(), (state) => (state[agentId] ?? RESPONDING_STATE).retryStatus);
}
//@ chunk-hbc3mvx0.js:12266-12328 placement
/**
 * 函数 useStatusField（取状态的某个字段）。
 */
function useStatusField(field) {
  let agentId = mainAgentId();
  return useStoreSelector(useSpinnerStore(), (states) => (states[agentId] ?? RESPONDING_STATE)[field]);
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
