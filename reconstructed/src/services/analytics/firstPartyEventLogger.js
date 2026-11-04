/**
 * services/analytics/firstPartyEventLogger.ts
 *
 * 1P 事件日志：初始化 OTel LoggerProvider + 导出器，按 tengu_1p_event_batch_config 批量，预初始化队列、killswitch、GrowthBook 实验曝光事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/firstPartyEventLogger.ts
 * pieces: chunk-aepeg2w5.js (29)
 * attribution: affinity 2, fingerprint 4, facade-exports 11, layout 11, callgraph-fingerprint 1
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
import { _clearOutputsForTest } from "../../utils/task/diskOutput.js";
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:894709-894752 affinity
/**
 * sink killswitch：动态配置 tengu_frond_boric 中对应 sink（datadog / firstParty）为 true 时停发。
 */
function isSinkKilled(sink) {
  return getDynamicConfig_CACHED_MAY_BE_STALE(SINK_KILLSWITCH_CONFIG_NAME, {})?.[sink] === true;
}
//@ chunk-aepeg2w5.js:894752-894789 fingerprint = EVENT_SAMPLING_CONFIG_NAME (1)
/**
 * 事件采样动态配置名 tengu_event_sampling_config（{<event>: {sample_rate}}）。
 */
var EVENT_SAMPLING_CONFIG_NAME = "tengu_event_sampling_config";
//@ chunk-aepeg2w5.js:894789-894821 facade-exports
function getEventSamplingConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(EVENT_SAMPLING_CONFIG_NAME, {});
}
//@ chunk-aepeg2w5.js:894821-894896 facade-exports = logEventImpl (1)
/**
 * 按采样率随机决定是否发送，返回实际采样率或 0。
 */
function shouldSampleEvent(eventName) {
  let rate = getEventSamplingConfig()[eventName];
  if (!rate) return null;
  return rollSampleRate(rate.sample_rate);
}
//@ chunk-aepeg2w5.js:894896-895026 facade-exports = shouldSampleEvent (0.568)
function rollSampleRate(sampleRate) {
  if (typeof sampleRate !== "number" || !(sampleRate >= 0 && sampleRate <= 1)) return null;
  if (sampleRate >= 1) return null;
  if (sampleRate <= 0) return 0;
  return Math.random() < sampleRate ? sampleRate : 0;
}
//@ chunk-aepeg2w5.js:895026-895071 fingerprint = BATCH_CONFIG_NAME (1)
var DEFAULT_1P_BATCH_DELAY_MS = 2000;
var TENGU_1P_EVENT_BATCH_CONFIG = "tengu_1p_event_batch_config";
//@ chunk-aepeg2w5.js:895071-895102 layout
/**
 * 读取 1P 批量配置 tengu_1p_event_batch_config（动态配置，可能是旧值）。
 */
function get1PEventBatchConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_1P_EVENT_BATCH_CONFIG, {});
}
//@ chunk-aepeg2w5.js:895102-895129 layout
var MAX_PRE_INIT_QUEUE = 1024;
var OUTPUT_CLEAR_TIMEOUT_MS = 2000;
var OUTPUT_CLEAR_RETRY_MS = 150;
//@ chunk-aepeg2w5.js:895129-895358 layout
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
//@ chunk-aepeg2w5.js:895358-895383 layout
var firstPartyLoggerStateByHost; // deferred: uses FirstPartyLoggerState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:895358", () => {
  firstPartyLoggerStateByHost = new HostScoped(() => new FirstPartyLoggerState());
});
//@ chunk-aepeg2w5.js:895383-895490 facade-exports
async function settle1PEventLoggingBeforeExit() {
  let { firstPartyEventExporter } = firstPartyLoggerStateByHost.of(getRootSession().host);
  try {
    await firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
  } catch {}
}
//@ chunk-aepeg2w5.js:895490-895773 facade-exports
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
      await _clearOutputsForTest(state, OUTPUT_CLEAR_RETRY_MS);
    }
    let shutdownPromise = firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
    await firstPartyEventLoggerProvider.shutdown();
    await shutdownPromise;
  } catch {}
}
//@ chunk-aepeg2w5.js:895773-895822 layout
function shouldAttachAuthWithoutProfileScope() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_swift_whistle", false);
}
//@ chunk-aepeg2w5.js:895822-895848 facade-exports
/**
 * 1P 事件日志是否允许：!Ey()，即隐私级别为 default、API 提供方为第一方（或宿主托管）、未走网关、未设 CLAUDE_CODE_CUSTOM_OAUTH_URL。
 */
function is1PEventLoggingEnabled() {
  return !isFirstPartyTelemetryBlocked();
}
//@ chunk-aepeg2w5.js:895848-896167 fingerprint = logEventTo1PAsync (0.666)
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
//@ chunk-aepeg2w5.js:896167-896419 facade-exports
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
//@ chunk-aepeg2w5.js:896419-896503 layout
function trackInFlightEmit(emitsInFlight, firstPartyEventLogger, eventName, metadata, principalStamp) {
  let promise = logEventTo1PAsync(firstPartyEventLogger, eventName, metadata, principalStamp).finally(() =>
    emitsInFlight.delete(promise),
  );
  emitsInFlight.add(promise);
  return promise;
}
//@ chunk-aepeg2w5.js:896503-896768 facade-exports
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
//@ chunk-aepeg2w5.js:896768-896801 fingerprint = getEnvironmentForGrowthBook (1)
/**
 * GrowthBook 实验事件的 environment，外部构建恒为 production。
 */
function getEnvironmentForGrowthBook() {
  return "production";
}
//@ chunk-aepeg2w5.js:896801-897582 facade-exports = logGrowthBookExperimentTo1P (0.825)
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
//@ chunk-aepeg2w5.js:897582-897741 layout
var OTEL_LOG_LIMIT_ENV_VARS = [
  "OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT",
  "OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT",
  "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT",
  "OTEL_ATTRIBUTE_COUNT_LIMIT",
];
//@ chunk-aepeg2w5.js:897741-898402 layout
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
//@ chunk-aepeg2w5.js:898402-899558 layout
function create1PLogger(firstPartyEventLoggerProvider, processor, resource) {
  return OTEL_LOG_LIMIT_ENV_VARS.some((envVar) => nodeModuleA.getStringFromEnv(envVar) !== undefined)
    ? firstPartyEventLoggerProvider.getLogger(
        "com.anthropic.claude_code.events",
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      });
}
//@ chunk-aepeg2w5.js:899558-899592 layout
/**
 * 一方遥测导出器的默认值：导出间隔 10 s、批量 200、队列 8192、单次刷新上限 1024。
 */
var DEFAULT_1P_EXPORT_INTERVAL_MS = 1e4;
var DEFAULT_MAX_EXPORT_BATCH = 200;
var DEFAULT_MAX_QUEUE = 8192;
var MAX_FLUSH_ITEMS = 1024;
//@ chunk-aepeg2w5.js:899592-899678 layout
function clampMaxQueueSize(maxQueueSize) {
  return typeof maxQueueSize === "number" && Number.isInteger(maxQueueSize) && maxQueueSize > 0
    ? Math.min(maxQueueSize, MAX_FLUSH_ITEMS)
    : MAX_FLUSH_ITEMS;
}
//@ chunk-aepeg2w5.js:899678-901197 facade-exports = initialize1PEventLogging (0.565)
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
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
//@ chunk-aepeg2w5.js:901268-901455 affinity
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
//@ chunk-aepeg2w5.js:901455-901578 facade-exports
function reinitialize1PEventLoggingIfConfigChanged() {
  let state = firstPartyLoggerStateByHost.of(getRootSession().host);
  state.reinitInFlight ??= reinitialize1PEventLoggingIfConfigChanged_2(state).finally(() => {
    state.reinitInFlight = null;
  });
  return state.reinitInFlight;
}
//@ chunk-aepeg2w5.js:901578-902197 callgraph-fingerprint = reinitialize1PEventLoggingIfConfigChanged (0.2)
async function reinitialize1PEventLoggingIfConfigChanged_2(host) {
  if (!is1PEventLoggingEnabled() || !host.firstPartyEventLoggerProvider) return;
  let newConfig = get1PEventBatchConfig();
  if (import_sortedIndex_2(newConfig, host.lastBatchConfig)) return;
  let { firstPartyEventLoggerProvider, firstPartyEventLogger, firstPartyEventExporter } = host;
  host.firstPartyEventLogger = null;
  host.loggerBeingReplaced = firstPartyEventLogger;
  host.preInitQueue ??= [];
  await _clearOutputsForTest(host, OUTPUT_CLEAR_TIMEOUT_MS);
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
  rollSampleRate,
  is1PEventLoggingEnabled,
  logEventTo1PAwaitable,
  logGrowthBookExperimentTo1P,
  initialize1PEventLogging,
  shutdown1PEventLogging,
  isSinkKilled,
  shouldSampleEvent,
  getEventSamplingConfig,
  logEventTo1P,
  reinitialize1PEventLoggingIfConfigChanged,
  settle1PEventLoggingBeforeExit,
};
