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
  maskModelIdForTelemetry,
  maskModelIdsInRecord,
} from "../../utils/model/modelCatalog/catalogEntries.js";
import { getMainLoopModel } from "../../utils/model/model.js";
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
import { withEventModel } from "./metadata.js";
import { trackDatadogEvent } from "./datadog.js";
import { stripProtoFields, attachAnalyticsSink } from "./index.js";
import { logForDebugging } from "../../utils/debug.js";
import { isMaskHydrationSettled, hydrateMaskedIds } from "../../utils/model/modelCatalog/maskedIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m42zcgyq.js:235-291 placement
/**
 * 导出函数 `maskModelFields`：参数 e, n，返回 maskModelIdsInRecord(e); } export { initializeAnalyticsSink, tyn }。
 */
function maskModelFields(metadata, currentModel) {
  try {
    maskModelIdForTelemetry(currentModel ?? getMainLoopModel());
  } catch {}
  return maskModelIdsInRecord(metadata);
}
//@ chunk-ryc3zkv1.js:455-864 callgraph-fingerprint (2.1.88 match: DATADOG_GATE_NAME, 0.155)
/**
 * Datadog 门名 tengu_log_datadog_events，以及需要附 tengu_quizzical_giraffe 标记的事件（tengu_started、OAuth 刷新、tengu_api_error 等）。
 */
var DATADOG_GATE_NAME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TENGU_QUIZZICAL_GIRAFFE;
var GIRAFFE_TAGGED_EVENTS;
deferInit("chunk-ryc3zkv1.js:455", () => {
  DATADOG_GATE_NAME = "tengu_log_datadog_events";
  TENGU_QUIZZICAL_GIRAFFE = "tengu_quizzical_giraffe";
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
});
//@ chunk-ryc3zkv1.js:864-939 fingerprint (2.1.88 match: shouldTrackDatadog, 1)
/**
 * Datadog 是否启用：killswitch tengu_frond_boric.datadog 未开且 GrowthBook 门 tengu_log_datadog_events 为真。
 */
function shouldTrackDatadog() {
  if (isSinkKilled("datadog")) return false;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(DATADOG_GATE_NAME, false);
  } catch {
    return false;
  }
}
//@ chunk-ryc3zkv1.js:939-1109 layout
function addGiraffeTag(eventName, metadata) {
  if (!GIRAFFE_TAGGED_EVENTS.has(eventName)) return metadata;
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      TENGU_QUIZZICAL_GIRAFFE,
      false,
    );
    let unset = source === "fallback" || source === "disabled";
    return {
      ...metadata,
      [TENGU_QUIZZICAL_GIRAFFE]: fromEnum(unset ? "unset" : flagValue === true ? "on" : "off"),
    };
  } catch {
    return metadata;
  }
}
//@ chunk-ryc3zkv1.js:1109-1304 layout
/**
 * 计算事件采样率：查 tengu_event_sampling_config[event]；tengu_feature_ok 再按 event:feature_name 二级采样；返回 null 表示不采样，0 表示丢弃。
 */
function getEventSampleRate(eventName, metadata) {
  let baseRate = shouldSampleEvent(eventName);
  if (baseRate === 0 || eventName !== "tengu_feature_ok" || metadata.feature_name === undefined)
    return baseRate;
  let featureRate = rollSampleRate(
    getEventSamplingConfig()[`${eventName}:${metadata.feature_name}`]?.sample_rate,
  );
  if (featureRate === null) return baseRate;
  return baseRate === null ? featureRate : baseRate * featureRate;
}
//@ chunk-ryc3zkv1.js:1304-1333 layout
function isAnySinkEnabled(sinks) {
  return sinks || is1PEventLoggingEnabled();
}
//@ chunk-ryc3zkv1.js:1333-1350 layout
function logEventToOtherSinks(eventName, metadataWithSampleRate) {}
//@ chunk-ryc3zkv1.js:1350-1393 layout
function getCurrentModelSafe() {
  try {
    return getMainLoopModel();
  } catch {
    return;
  }
}
//@ chunk-ryc3zkv1.js:1393-1547 layout (2.1.88 match: logEventImpl, 1)
function logEventImpl(eventName, metadata, eventSampleRate, readSinks) {
  let sinks = readSinks();
  if (!isAnySinkEnabled(sinks)) return;
  let currentModel = getCurrentModelSafe();
  let maskedMetadata = addGiraffeTag(eventName, maskModelFields(metadata, currentModel));
  let metadataWithSampleRate =
    eventSampleRate !== null
      ? {
          ...maskedMetadata,
          sample_rate: eventSampleRate,
        }
      : maskedMetadata;
  withEventModel(currentModel, () => {
    if (sinks) trackDatadogEvent(eventName, stripProtoFields(metadataWithSampleRate));
    logEventTo1P(eventName, metadataWithSampleRate);
    logEventToOtherSinks(eventName, metadataWithSampleRate);
  });
}
//@ chunk-ryc3zkv1.js:1547-1556 layout
var isCollectingMetadata = false;
//@ chunk-ryc3zkv1.js:1556-1959 layout
/**
 * 同步分发：防止元数据收集中重入 logEvent；采样为 0 直接丢弃；GrowthBook 未就绪时等其初始化后再发。
 */
function logEventToSinks(eventName, metadata, shouldTrackDatadog) {
  if (isCollectingMetadata) {
    logForDebugging(
      `logEvent reentered while collecting metadata \u2014 dropped ${eventName}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,
      {
        level: "error",
      },
    );
    return;
  }
  isCollectingMetadata = true;
  try {
    let eventSampleRate = getEventSampleRate(eventName, metadata);
    if (eventSampleRate === 0) return;
    if (isMaskHydrationSettled()) {
      logEventImpl(eventName, metadata, eventSampleRate, shouldTrackDatadog);
      return;
    }
    let runAfterHydration = () => {
      isCollectingMetadata = true;
      try {
        logEventImpl(eventName, metadata, eventSampleRate, shouldTrackDatadog);
      } finally {
        isCollectingMetadata = false;
      }
    };
    hydrateMaskedIds().then(runAfterHydration, runAfterHydration);
  } finally {
    isCollectingMetadata = false;
  }
}
//@ chunk-ryc3zkv1.js:1959-2209 layout (2.1.88 match: logEventImpl, 1)
/**
 * 异步分发：采样、等待 GrowthBook，然后并行发 Datadog 与 1P（logEventTo1PQueued），等待全部完成。
 */
async function dispatchEventToSinksAsync(eventName, metadata, readSinks) {
  let sampleResult = getEventSampleRate(eventName, metadata);
  if (sampleResult === 0) return;
  if (!isMaskHydrationSettled()) await hydrateMaskedIds();
  let sinks = readSinks();
  if (!isAnySinkEnabled(sinks)) return;
  let currentModel = getCurrentModelSafe();
  let maskedMetadata = addGiraffeTag(eventName, maskModelFields(metadata, currentModel));
  let metadataWithSampleRate =
    sampleResult !== null
      ? {
          ...maskedMetadata,
          sample_rate: sampleResult,
        }
      : maskedMetadata;
  let pending = [];
  withEventModel(currentModel, () => {
    if (sinks) pending.push(trackDatadogEvent(eventName, stripProtoFields(metadataWithSampleRate)));
    pending.push(logEventTo1PAwaitable(eventName, metadataWithSampleRate));
    logEventToOtherSinks(eventName, metadataWithSampleRate);
  });
  await Promise.all(pending);
}
//@ chunk-ryc3zkv1.js:2209-2234 facade-exports
/**
 * 构造 sink：logEvent/logEventAsync 先按 tengu_event_sampling_config 采样（0 丢弃），等 GrowthBook 就绪后附加 sample_rate 并分发到 Datadog 与 1P。
 */
function initializeAnalyticsSink() {
  attachAnalyticsSink(initializeAnalyticsSink_2(shouldTrackDatadog));
}
//@ chunk-ryc3zkv1.js:2234-2311 fingerprint (2.1.88 match: initializeAnalyticsSink, 1)
function initializeAnalyticsSink_2(shouldTrackDatadog) {
  return {
    logEvent: (eventName, metadata) => logEventToSinks(eventName, metadata, shouldTrackDatadog),
    logEventAsync: (eventName, metadata) =>
      dispatchEventToSinksAsync(eventName, metadata, shouldTrackDatadog),
  };
}
export { initializeAnalyticsSink, maskModelFields };
