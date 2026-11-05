/**
 * services/analytics/firstPartyEventLogger.ts
 *
 * 1P 事件日志：初始化 OTel LoggerProvider + 导出器，按 tengu_1p_event_batch_config 批量，预初始化队列、killswitch、GrowthBook 实验曝光事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/firstPartyEventLogger.ts
 * pieces: chunk-exfmq47h.js (30)
 * attribution: affinity 1, fingerprint 3, facade-exports 11, layout 14, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import {
  getDynamicConfig_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  buildCoreUserData,
} from "./growthbook.js";
import { SINK_KILLSWITCH_CONFIG_NAME } from "./sinkKillswitch.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { principalStampForEvent } from "./privacyLevel.js";
import { getEventMetadata } from "./metadata.js";
import { getOrCreateUserID } from "../../utils/config.js";
import {
  isDisklessHost,
  otelSdkModule,
  wrapExporterFailures,
  ExportFailureCounter,
} from "./anthropicTelemetryExport.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { nodeModuleA, nodeModuleB } from "./growthbookClient.js";
import { profileCheckpoint } from "../../utils/startupProfiler.js";
import { parseNumberOrDefault } from "../../utils/envUtils.js";
import { getPlatform, getWslVersion } from "../../utils/platform.js";
import { FirstPartyEventLoggingExporter } from "./firstPartyEventLoggingExporter.js";
import { BatchLogRecordProcessor } from "../../../vendor/@opentelemetry/sdk-logs/build/esm/platform/node/export/BatchLogRecordProcessor.js";
import { LoggerProvider } from "../../../vendor/@opentelemetry/sdk-logs/build/src/LoggerProvider.js";
import { withDeadline } from "../../utils/sleep.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:917603-917646 affinity
/**
 * sink killswitch：动态配置 tengu_frond_boric 中对应 sink（datadog / firstParty）为 true 时停发。
 */
function isSinkKilled(sink) {
  return getDynamicConfig_CACHED_MAY_BE_STALE(SINK_KILLSWITCH_CONFIG_NAME, {})?.[sink] === true;
}
//@ chunk-exfmq47h.js:917646-917683 fingerprint (2.1.88 match: EVENT_SAMPLING_CONFIG_NAME, 1)
/**
 * 事件采样动态配置名 tengu_event_sampling_config（{<event>: {sample_rate}}）。
 */
var EVENT_SAMPLING_CONFIG_NAME = "tengu_event_sampling_config";
//@ chunk-exfmq47h.js:917683-917715 facade-exports
function getEventSamplingConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(EVENT_SAMPLING_CONFIG_NAME, {});
}
//@ chunk-exfmq47h.js:917715-917790 facade-exports (2.1.88 match: logEventImpl, 1)
/**
 * 按采样率随机决定是否发送，返回实际采样率或 0。
 */
function shouldSampleEvent(eventName) {
  let rate = getEventSamplingConfig()[eventName];
  if (!rate) return null;
  return rollSampleRate(rate.sample_rate);
}
//@ chunk-exfmq47h.js:917790-917920 facade-exports (2.1.88 match: shouldSampleEvent, 0.568)
function rollSampleRate(sampleRate) {
  if (typeof sampleRate !== "number" || !(sampleRate >= 0 && sampleRate <= 1)) return null;
  if (sampleRate >= 1) return null;
  if (sampleRate <= 0) return 0;
  return Math.random() < sampleRate ? sampleRate : 0;
}
//@ chunk-exfmq47h.js:917920-917965 fingerprint (2.1.88 match: BATCH_CONFIG_NAME, 1)
var DEFAULT_1P_BATCH_DELAY_MS = 2000;
var TENGU_1P_EVENT_BATCH_CONFIG = "tengu_1p_event_batch_config";
//@ chunk-exfmq47h.js:917965-917996 layout
/**
 * 读取 1P 批量配置 tengu_1p_event_batch_config（动态配置，可能是旧值）。
 */
function get1PEventBatchConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_1P_EVENT_BATCH_CONFIG, {});
}
//@ chunk-exfmq47h.js:917996-918023 layout
var MAX_PRE_INIT_QUEUE = 1024;
var OUTPUT_CLEAR_TIMEOUT_MS = 2000;
var OUTPUT_CLEAR_RETRY_MS = 150;
//@ chunk-exfmq47h.js:918023-918252 layout
class FirstPartyLoggerState {
  firstPartyEventLogger = null;
  firstPartyEventLoggerProvider = null;
  firstPartyEventExporter = null;
  lastBatchConfig = null;
  retainedStorageV5 = undefined;
  preInitQueue = [];
  emitsInFlight = new Set();
  loggerBeingReplaced = null;
  reinitInFlight = null;
}
//@ chunk-exfmq47h.js:918252-918277 layout
var firstPartyLoggerStateByHost; // deferred: uses FirstPartyLoggerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:918252", () => {
  firstPartyLoggerStateByHost = new HostScoped(() => new FirstPartyLoggerState());
});
//@ chunk-exfmq47h.js:918277-918384 facade-exports
async function settle1PEventLoggingBeforeExit() {
  let { firstPartyEventExporter } = firstPartyLoggerStateByHost.of(getRootSession().host);
  try {
    await firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
  } catch {}
}
//@ chunk-exfmq47h.js:918384-918667 facade-exports
/**
 * 强制 flush 1P logger provider 与 exporter。
 */
async function shutdown1PEventLogging() {
  let state = firstPartyLoggerStateByHost.of(getRootSession().host);
  let { firstPartyEventLoggerProvider, firstPartyEventExporter } = state;
  if (!firstPartyEventLoggerProvider) return;
  try {
    if (state.loggerBeingReplaced !== null) {
      state.firstPartyEventLogger = state.loggerBeingReplaced;
      flushPreInitQueue(state);
      await waitForEmits(state, OUTPUT_CLEAR_RETRY_MS);
    }
    let shutdownPromise = firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
    await firstPartyEventLoggerProvider.shutdown();
    await shutdownPromise;
  } catch {}
}
//@ chunk-exfmq47h.js:918667-918716 layout
function shouldAttachAuthWithoutProfileScope() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_swift_whistle", false);
}
//@ chunk-exfmq47h.js:918716-918742 facade-exports
/**
 * 1P 事件日志是否允许：!Ey()，即隐私级别为 default、API 提供方为第一方（或宿主托管）、未走网关、未设 CLAUDE_CODE_CUSTOM_OAUTH_URL。
 */
function is1PEventLoggingEnabled() {
  return !isFirstPartyTelemetryBlocked();
}
//@ chunk-exfmq47h.js:918742-919061 fingerprint (2.1.88 match: logEventTo1PAsync, 0.665)
/**
 * 把事件转成 1P 格式（to1PEventFormat：event_name、client_timestamp、env、process、auth、additional_metadata 等）后作为 OTel LogRecord 发给 com.anthropic.claude_code.events logger。
 */
async function logEventTo1PAsync(
  firstPartyEventLogger,
  eventName,
  metadata = {},
  principalStamp = principalStampForEvent(eventName),
) {
  try {
    let coreMetadata = await getEventMetadata({
      model: metadata.model,
      betas: metadata.betas,
    });
    let attributes = {
      event_name: eventName,
      event_id: randomUUID(),
      core_metadata: coreMetadata,
      user_metadata: buildCoreUserData(true),
      event_metadata: metadata,
      ...(principalStamp !== undefined && {
        principal_stamp: principalStamp,
      }),
    };
    let userId = getOrCreateUserID();
    if (userId) attributes.user_id = userId;
    let date = new Date();
    firstPartyEventLogger.emit({
      timestamp: date,
      observedTimestamp: date,
      body: eventName,
      attributes,
    });
  } catch (error) {}
}
//@ chunk-exfmq47h.js:919061-919313 facade-exports
/**
 * 同步发 1P 事件：不允许时直接返回；logger 未初始化时进入 preInitQueue（上限 1024）；killswitch 开启时丢弃；否则交给 logEventTo1PAsync。
 */
function logEventTo1P(eventName, metadata = {}, principalStamp = principalStampForEvent(eventName)) {
  if (!is1PEventLoggingEnabled()) return;
  let { firstPartyEventLogger, preInitQueue, emitsInFlight } = firstPartyLoggerStateByHost.of(
    getRootSession().host,
  );
  if (!firstPartyEventLogger) {
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE)
      preInitQueue.push({
        eventName,
        metadata,
        principalStamp,
      });
    return;
  }
  if (isSinkKilled("firstParty")) return;
  trackInFlightEmit(emitsInFlight, firstPartyEventLogger, eventName, metadata, principalStamp);
}
//@ chunk-exfmq47h.js:919313-919397 layout
function trackInFlightEmit(emitsInFlight, firstPartyEventLogger, eventName, metadata, principalStamp) {
  let promise = logEventTo1PAsync(firstPartyEventLogger, eventName, metadata, principalStamp).finally(() =>
    emitsInFlight.delete(promise),
  );
  emitsInFlight.add(promise);
  return promise;
}
//@ chunk-exfmq47h.js:919397-919662 facade-exports
/**
 * 异步发 1P 事件（logEventAsync 路径），逻辑同 logEventTo1PSync 但返回发送 promise。
 */
async function logEventTo1PAwaitable(eventName, metadataWithSampleRate = {}) {
  if (!is1PEventLoggingEnabled()) return;
  let stamp = principalStampForEvent(eventName);
  let { firstPartyEventLogger, preInitQueue, emitsInFlight } = firstPartyLoggerStateByHost.of(
    getRootSession().host,
  );
  if (!firstPartyEventLogger) {
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE)
      preInitQueue.push({
        eventName,
        metadata: metadataWithSampleRate,
        principalStamp: stamp,
      });
    return;
  }
  if (isSinkKilled("firstParty")) return;
  return trackInFlightEmit(emitsInFlight, firstPartyEventLogger, eventName, metadataWithSampleRate, stamp);
}
//@ chunk-exfmq47h.js:919662-919695 layout (2.1.88 match: getEnvironmentForGrowthBook, 1)
/**
 * GrowthBook 实验事件的 environment，外部构建恒为 production。
 */
function getEnvironmentForGrowthBook() {
  return "production";
}
//@ chunk-exfmq47h.js:919695-920476 facade-exports (2.1.88 match: logGrowthBookExperimentTo1P, 0.825)
/**
 * 把 GrowthBook 实验曝光作为 GrowthbookExperimentEvent 发到 1P 事件日志（experiment_id、variation_id、user_attributes、device_id、session_id 等）。
 */
function logGrowthBookExperimentTo1P(data) {
  if (!is1PEventLoggingEnabled() || isSinkKilled("firstParty") || isDisklessHost()) return true;
  let { firstPartyEventLogger, lastBatchConfig, preInitQueue } = firstPartyLoggerStateByHost.of(
    getRootSession().host,
  );
  if (!firstPartyEventLogger) {
    if (lastBatchConfig === null) return true;
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE) {
      preInitQueue.push({
        exposure: data,
      });
      return true;
    }
    return false;
  }
  let userId = getOrCreateUserID();
  let { accountUuid, organizationUuid } = buildCoreUserData(true);
  let attributes = {
    event_type: "GrowthbookExperimentEvent",
    event_id: randomUUID(),
    experiment_id: data.experimentId,
    variation_id: data.variationId,
    ...(userId && {
      device_id: userId,
    }),
    ...(accountUuid && {
      account_uuid: accountUuid,
    }),
    ...(organizationUuid && {
      organization_uuid: organizationUuid,
    }),
    ...(data.userAttributes && {
      session_id: data.userAttributes.sessionId,
      user_attributes: jsonStringify({
        appVersion: data.userAttributes.appVersion,
      }),
    }),
    ...(data.experimentMetadata && {
      experiment_metadata: jsonStringify(data.experimentMetadata),
    }),
    environment: getEnvironmentForGrowthBook(),
  };
  let date = new Date();
  firstPartyEventLogger.emit({
    timestamp: date,
    observedTimestamp: date,
    body: "growthbook_experiment",
    attributes,
  });
  return true;
}
//@ chunk-exfmq47h.js:920476-920635 layout
var OTEL_LOG_LIMIT_ENV_VARS = [
  "OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT",
  "OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT",
  "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT",
  "OTEL_ATTRIBUTE_COUNT_LIMIT",
];
//@ chunk-exfmq47h.js:920635-921296 layout
class FirstPartyLogger {
  processor;
  resource;
  instrumentationScope;
  constructor(processor, resource, instrumentationScope) {
    this.processor = processor;
    this.resource = resource;
    this.instrumentationScope = instrumentationScope;
  }
  emit(record) {
    let now = Date.now();
    let attributes = {};
    for (let [key, value] of Object.entries(record.attributes ?? {}))
      if (
        value !== null &&
        key.length > 0 &&
        (nodeModuleA.isAttributeValue(value) ||
          (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0))
      )
        attributes[key] = value;
    this.processor.onEmit({
      hrTime: nodeModuleA.timeInputToHrTime(record.timestamp ?? now),
      hrTimeObserved: nodeModuleA.timeInputToHrTime(record.observedTimestamp ?? now),
      severityText: record.severityText,
      severityNumber: record.severityNumber,
      body: record.body,
      eventName: record.eventName,
      attributes,
      resource: this.resource,
      instrumentationScope: this.instrumentationScope,
      droppedAttributesCount: 0,
    });
  }
}
//@ chunk-exfmq47h.js:921296-922452 layout
function create1PLogger(firstPartyEventLoggerProvider, processor, resource) {
  return OTEL_LOG_LIMIT_ENV_VARS.some((envVar) => nodeModuleA.getStringFromEnv(envVar) !== undefined)
    ? firstPartyEventLoggerProvider.getLogger(
        "com.anthropic.claude_code.events",
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      )
    : new FirstPartyLogger(processor, resource, {
        name: "com.anthropic.claude_code.events",
        version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      });
}
//@ chunk-exfmq47h.js:922452-922486 layout
/**
 * 一方遥测导出器的默认值：导出间隔 10 s、批量 200、队列 8192、单次刷新上限 1024。
 */
var DEFAULT_1P_EXPORT_INTERVAL_MS = 1e4;
var DEFAULT_MAX_EXPORT_BATCH = 200;
var DEFAULT_MAX_QUEUE = 8192;
var MAX_FLUSH_ITEMS = 1024;
//@ chunk-exfmq47h.js:922486-922572 layout
function clampMaxQueueSize(maxQueueSize) {
  return typeof maxQueueSize === "number" && Number.isInteger(maxQueueSize) && maxQueueSize > 0
    ? Math.min(maxQueueSize, MAX_FLUSH_ITEMS)
    : MAX_FLUSH_ITEMS;
}
//@ chunk-exfmq47h.js:922572-924091 facade-exports (2.1.88 match: initialize1PEventLogging, 0.565)
/**
 * 初始化 1P 事件日志：读 tengu_1p_event_batch_config（延迟、批大小、队列、path/baseUrl、skipAuth），创建 FirstPartyEventLoggingExporter + BatchLogRecordProcessor 和 LoggerProvider（resource service.name=claude-code）。不允许时清空预排队。
 */
function initialize1PEventLogging(storageV5, tenantGrant) {
  let state = firstPartyLoggerStateByHost.of(getRootSession().host);
  if (storageV5 !== undefined && state.retainedStorageV5 === undefined) state.retainedStorageV5 = storageV5;
  profileCheckpoint("1p_event_logging_start");
  if (!is1PEventLoggingEnabled()) {
    state.preInitQueue = null;
    return;
  }
  let batchConfig = get1PEventBatchConfig();
  profileCheckpoint("1p_event_after_growthbook_config");
  let scheduledDelayMillis =
    batchConfig.scheduledDelayMillis ||
    parseNumberOrDefault(process.env.OTEL_LOGS_EXPORT_INTERVAL, DEFAULT_1P_EXPORT_INTERVAL_MS);
  let maxExportBatchSize = batchConfig.maxExportBatchSize || DEFAULT_MAX_EXPORT_BATCH;
  let maxQueueSize = isDisklessHost()
    ? clampMaxQueueSize(batchConfig.maxQueueSize)
    : batchConfig.maxQueueSize || DEFAULT_MAX_QUEUE;
  let platform = getPlatform();
  let attributes = {
    [otelSdkModule.ATTR_SERVICE_NAME]: "claude-code",
    [otelSdkModule.ATTR_SERVICE_VERSION]: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
  if (platform === "wsl") {
    let wslVersion = getWslVersion();
    if (wslVersion) attributes["wsl.version"] = wslVersion;
  }
  let resource = nodeModuleB.resourceFromAttributes(attributes);
  let eventLoggingExporter = wrapExporterFailures(
    new FirstPartyEventLoggingExporter({
      maxBatchSize: maxExportBatchSize,
      skipAuth: batchConfig.skipAuth,
      attachAuthWithoutProfileScope: shouldAttachAuthWithoutProfileScope,
      maxAttempts: batchConfig.maxAttempts,
      path: batchConfig.path,
      baseUrl: batchConfig.baseUrl,
      isKilled: () => isSinkKilled("firstParty"),
      storageV5: state.retainedStorageV5,
      tenantGrant,
    }),
    new ExportFailureCounter("1P event logging"),
  );
  let logRecordProcessor = new BatchLogRecordProcessor(eventLoggingExporter, {
    scheduledDelayMillis,
    maxExportBatchSize,
    maxQueueSize,
  });
  state.firstPartyEventLoggerProvider = new LoggerProvider({
    resource,
    processors: [logRecordProcessor],
  });
  state.firstPartyEventExporter = eventLoggingExporter;
  state.firstPartyEventLogger = create1PLogger(
    state.firstPartyEventLoggerProvider,
    logRecordProcessor,
    resource,
  );
  state.lastBatchConfig = batchConfig;
  flushPreInitQueue(state);
}
//@ chunk-exfmq47h.js:924091-924162 layout
async function waitForEmits(state, timeoutMs) {
  await withDeadline(Promise.allSettled(state.emitsInFlight), timeoutMs);
}
//@ chunk-exfmq47h.js:924162-924349 layout
/**
 * 初始化后补发预初始化期间排队的事件与实验曝光。
 */
function flushPreInitQueue(state) {
  if (state.preInitQueue === null) return;
  let preInitQueue = state.preInitQueue;
  state.preInitQueue = null;
  for (let entry of preInitQueue)
    if ("exposure" in entry) logGrowthBookExperimentTo1P(entry.exposure);
    else logEventTo1P(entry.eventName, entry.metadata, entry.principalStamp);
}
//@ chunk-exfmq47h.js:924349-924472 facade-exports
function reinitialize1PEventLoggingIfConfigChanged() {
  let state = firstPartyLoggerStateByHost.of(getRootSession().host);
  state.reinitInFlight ??= reinitialize1PEventLoggingIfConfigChanged_2(state).finally(() => {
    state.reinitInFlight = null;
  });
  return state.reinitInFlight;
}
//@ chunk-exfmq47h.js:924472-925091 callgraph-fingerprint (2.1.88 match: reinitialize1PEventLoggingIfConfigChanged, 0.2)
async function reinitialize1PEventLoggingIfConfigChanged_2(host) {
  if (!is1PEventLoggingEnabled() || !host.firstPartyEventLoggerProvider) return;
  let newConfig = get1PEventBatchConfig();
  if (import_sortedIndex_2(newConfig, host.lastBatchConfig)) return;
  let { firstPartyEventLoggerProvider, firstPartyEventLogger, firstPartyEventExporter } = host;
  host.firstPartyEventLogger = null;
  host.loggerBeingReplaced = firstPartyEventLogger;
  host.preInitQueue ??= [];
  await waitForEmits(host, OUTPUT_CLEAR_TIMEOUT_MS);
  try {
    await firstPartyEventLoggerProvider.forceFlush();
  } catch {}
  host.firstPartyEventLoggerProvider = null;
  host.loggerBeingReplaced = null;
  try {
    initialize1PEventLogging();
  } catch (e) {
    host.firstPartyEventLoggerProvider = firstPartyEventLoggerProvider;
    host.firstPartyEventLogger = firstPartyEventLogger;
    host.firstPartyEventExporter = firstPartyEventExporter;
    flushPreInitQueue(host);
    logError(e);
    return;
  }
  if (firstPartyEventExporter) {
    host.firstPartyEventExporter?.adoptInflightRefreshFrom(firstPartyEventExporter);
    firstPartyEventExporter.beginShutdown();
  }
  firstPartyEventLoggerProvider.shutdown().catch(() => {});
}
export {
  shutdown1PEventLogging,
  rollSampleRate,
  isSinkKilled,
  shouldSampleEvent,
  getEventSamplingConfig,
  is1PEventLoggingEnabled,
  logEventTo1P,
  logEventTo1PAwaitable,
  initialize1PEventLogging,
  logGrowthBookExperimentTo1P,
  reinitialize1PEventLoggingIfConfigChanged,
  settle1PEventLoggingBeforeExit,
};
