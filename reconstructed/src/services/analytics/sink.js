/**
 * services/analytics/sink.ts
 *
 * 分析 sink：采样（tengu_event_sampling_config）、Datadog 门控、分发到 Datadog 与 1P。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/sink.ts
 * pieces: chunk-m42zcgyq.js (1), chunk-ryc3zkv1.js (13)
 * attribution: placement 1, callgraph-fingerprint 1, fingerprint 2, layout 9, facade-exports 1
 */
import {
  isSinkKilled,
  shouldSampleEvent,
  rollSampleRate,
  getEventSamplingConfig,
  is1PEventLoggingEnabled,
  logEventTo1P,
  logEventTo1PAwaitable,
} from "./firstPartyEventLogger.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "./growthbook.js";
import { fromEnum } from "./safeMetadata.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { withEventModel } from "./metadata.js";
import { trackDatadogEvent } from "./datadog.js";
import { stripProtoFields, attachAnalyticsSink } from "./index.js";
import { logForDebugging } from "../../utils/debug.js";
import { isMaskHydrationSettled, hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import {
  maskModelIdForTelemetry,
  maskModelIdsInRecord,
} from "../../utils/model/modelCatalog/catalogEntries.js";

/**
 * Datadog 门名 tengu_log_datadog_events，以及需要附 tengu_quizzical_giraffe 标记的事件（tengu_started、OAuth 刷新、tengu_api_error 等）。
 */
//@ chunk-ryc3zkv1.js:455-864 callgraph-fingerprint = DATADOG_GATE_NAME (0.155)
var DATADOG_GATE_NAME = "tengu_log_datadog_events",
  TENGU_QUIZZICAL_GIRAFFE = "tengu_quizzical_giraffe",
  GIRAFFE_TAGGED_EVENTS = new Set([
    "tengu_started",
    "tengu_oauth_success",
    "tengu_oauth_token_refresh_lock_acquiring",
    "tengu_oauth_token_refresh_starting",
    "tengu_oauth_token_refresh_success",
    "tengu_oauth_token_refresh_failure",
    "tengu_oauth_token_refresh_race_recovered",
    "tengu_oauth_refresh_token_cleared_on_disk",
    "tengu_api_error",
    "tengu_feature_bad",
    "tengu_feature_sad",
  ]);
/**
 * Datadog 是否启用：killswitch tengu_frond_boric.datadog 未开且 GrowthBook 门 tengu_log_datadog_events 为真。
 */
//@ chunk-ryc3zkv1.js:864-939 fingerprint = shouldTrackDatadog (1)
function shouldTrackDatadog() {
  if (isSinkKilled("datadog")) return !1;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(DATADOG_GATE_NAME, !1);
  } catch {
    return !1;
  }
}
//@ chunk-ryc3zkv1.js:939-1109 layout
function addGiraffeTag(e, o) {
  if (!GIRAFFE_TAGGED_EVENTS.has(e)) return o;
  try {
    let { value: n, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
        TENGU_QUIZZICAL_GIRAFFE,
        !1,
      ),
      a = source === "fallback" || source === "disabled";
    return { ...o, [TENGU_QUIZZICAL_GIRAFFE]: fromEnum(a ? "unset" : n === !0 ? "on" : "off") };
  } catch {
    return o;
  }
}
/**
 * 计算事件采样率：查 tengu_event_sampling_config[event]；tengu_feature_ok 再按 event:feature_name 二级采样；返回 null 表示不采样，0 表示丢弃。
 */
//@ chunk-ryc3zkv1.js:1109-1304 layout
function getEventSampleRate(e, o) {
  let n = shouldSampleEvent(e);
  if (n === 0 || e !== "tengu_feature_ok" || o.feature_name === void 0) return n;
  let r = rollSampleRate(getEventSamplingConfig()[`${e}:${o.feature_name}`]?.sample_rate);
  if (r === null) return n;
  return n === null ? r : n * r;
}
//@ chunk-ryc3zkv1.js:1304-1333 layout
function isAnySinkEnabled(e) {
  return e || is1PEventLoggingEnabled();
}
//@ chunk-ryc3zkv1.js:1333-1350 layout
function logEventToOtherSinks(e, o) {}
//@ chunk-ryc3zkv1.js:1350-1393 layout
function getCurrentModelSafe() {
  try {
    return getMainLoopModel();
  } catch {
    return;
  }
}
//@ chunk-ryc3zkv1.js:1393-1547 layout = logEventImpl (1)
function logEventImpl(e, o, n, r) {
  let a = r();
  if (!isAnySinkEnabled(a)) return;
  let u = getCurrentModelSafe(),
    s = addGiraffeTag(e, tyn(o, u)),
    metadataWithSampleRate = n !== null ? { ...s, sample_rate: n } : s;
  withEventModel(u, () => {
    if (a) trackDatadogEvent(e, stripProtoFields(metadataWithSampleRate));
    (logEventTo1P(e, metadataWithSampleRate), logEventToOtherSinks(e, metadataWithSampleRate));
  });
}
//@ chunk-ryc3zkv1.js:1547-1556 layout
var isCollectingMetadata = !1;
/**
 * 同步分发：防止元数据收集中重入 logEvent；采样为 0 直接丢弃；GrowthBook 未就绪时等其初始化后再发。
 */
//@ chunk-ryc3zkv1.js:1556-1959 layout
function logEventToSinks(e, o, n) {
  if (isCollectingMetadata) {
    logForDebugging(
      `logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,
      { level: "error" },
    );
    return;
  }
  isCollectingMetadata = !0;
  try {
    let r = getEventSampleRate(e, o);
    if (r === 0) return;
    if (isMaskHydrationSettled()) {
      logEventImpl(e, o, r, n);
      return;
    }
    let a = () => {
      isCollectingMetadata = !0;
      try {
        logEventImpl(e, o, r, n);
      } finally {
        isCollectingMetadata = !1;
      }
    };
    hydrateMaskedIds().then(a, a);
  } finally {
    isCollectingMetadata = !1;
  }
}
/**
 * 异步分发：采样、等待 GrowthBook，然后并行发 Datadog 与 1P（logEventTo1PQueued），等待全部完成。
 */
//@ chunk-ryc3zkv1.js:1959-2209 layout = logEventImpl (1)
async function dispatchEventToSinksAsync(e, o, n) {
  let r = getEventSampleRate(e, o);
  if (r === 0) return;
  if (!isMaskHydrationSettled()) await hydrateMaskedIds();
  let a = n();
  if (!isAnySinkEnabled(a)) return;
  let u = getCurrentModelSafe(),
    s = addGiraffeTag(e, tyn(o, u)),
    metadataWithSampleRate = r !== null ? { ...s, sample_rate: r } : s,
    d = [];
  (withEventModel(u, () => {
    if (a) d.push(trackDatadogEvent(e, stripProtoFields(metadataWithSampleRate)));
    (d.push(logEventTo1PAwaitable(e, metadataWithSampleRate)),
      logEventToOtherSinks(e, metadataWithSampleRate));
  }),
    await Promise.all(d));
}
/**
 * 构造 sink：logEvent/logEventAsync 先按 tengu_event_sampling_config 采样（0 丢弃），等 GrowthBook 就绪后附加 sample_rate 并分发到 Datadog 与 1P。
 */
//@ chunk-ryc3zkv1.js:2209-2234 facade-exports
function initializeAnalyticsSink() {
  attachAnalyticsSink(initializeAnalyticsSink_2(shouldTrackDatadog));
}
//@ chunk-ryc3zkv1.js:2234-2311 fingerprint = initializeAnalyticsSink (1)
function initializeAnalyticsSink_2(e) {
  return {
    logEvent: (o, n) => logEventToSinks(o, n, e),
    logEventAsync: (o, n) => dispatchEventToSinksAsync(o, n, e),
  };
}
//@ chunk-m42zcgyq.js:235-291 placement
function tyn(e, n) {
  try {
    maskModelIdForTelemetry(n ?? getMainLoopModel());
  } catch {}
  return maskModelIdsInRecord(e);
}

export { initializeAnalyticsSink, tyn };
