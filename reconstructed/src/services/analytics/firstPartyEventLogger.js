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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import {
  getDynamicConfig_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  Tl,
} from "./growthbook.js";
import { SINK_KILLSWITCH_CONFIG_NAME } from "./sinkKillswitch.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { _clearOutputsForTest } from "../../utils/task/diskOutput.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { Yl } from "./privacyLevel.js";
import { getEventMetadata } from "./metadata.js";
import { getOrCreateUserID } from "../../utils/config.js";
import { Mo, xd, wrapExporterFailures, ExportFailureCounter } from "./anthropicTelemetryExport.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Vr, vP } from "./growthbookClient.js";
import { profileCheckpoint } from "../../utils/startupProfiler.js";
import { parseNumberOrDefault } from "../../utils/envUtils.js";
import { getPlatform, getWslVersion } from "../../utils/platform.js";
import { FirstPartyEventLoggingExporter } from "./firstPartyEventLoggingExporter.js";
import { vlt } from "../../../vendor/@opentelemetry/sdk-logs/build/esm/platform/node/export/BatchLogRecordProcessor.js";
import { P8t } from "../../../vendor/@opentelemetry/sdk-logs/build/src/LoggerProvider.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";

/**
 * sink killswitch：动态配置 tengu_frond_boric 中对应 sink（datadog / firstParty）为 true 时停发。
 */
//@ chunk-aepeg2w5.js:894709-894752 affinity
function isSinkKilled(e) {
  return getDynamicConfig_CACHED_MAY_BE_STALE(SINK_KILLSWITCH_CONFIG_NAME, {})?.[e] === !0;
}
/**
 * 事件采样动态配置名 tengu_event_sampling_config（{<event>: {sample_rate}}）。
 */
//@ chunk-aepeg2w5.js:894752-894789 fingerprint = EVENT_SAMPLING_CONFIG_NAME (1)
var EVENT_SAMPLING_CONFIG_NAME = "tengu_event_sampling_config";
//@ chunk-aepeg2w5.js:894789-894821 facade-exports
function getEventSamplingConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(EVENT_SAMPLING_CONFIG_NAME, {});
}
/**
 * 按采样率随机决定是否发送，返回实际采样率或 0。
 */
//@ chunk-aepeg2w5.js:894821-894896 facade-exports = logEventImpl (1)
function shouldSampleEvent(e) {
  let r = getEventSamplingConfig()[e];
  if (!r) return null;
  return rollSampleRate(r.sample_rate);
}
//@ chunk-aepeg2w5.js:894896-895026 facade-exports = shouldSampleEvent (0.568)
function rollSampleRate(eventName) {
  if (typeof eventName !== "number" || !(eventName >= 0 && eventName <= 1)) return null;
  if (eventName >= 1) return null;
  if (eventName <= 0) return 0;
  return Math.random() < eventName ? eventName : 0;
}
//@ chunk-aepeg2w5.js:895026-895071 fingerprint = BATCH_CONFIG_NAME (1)
var DEFAULT_1P_BATCH_DELAY_MS = 2000,
  TENGU_1P_EVENT_BATCH_CONFIG = "tengu_1p_event_batch_config";
/**
 * 读取 1P 批量配置 tengu_1p_event_batch_config（动态配置，可能是旧值）。
 */
//@ chunk-aepeg2w5.js:895071-895102 layout
function get1PEventBatchConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE(TENGU_1P_EVENT_BATCH_CONFIG, {});
}
//@ chunk-aepeg2w5.js:895102-895129 layout
var MAX_PRE_INIT_QUEUE = 1024,
  D2 = 2000,
  N2 = 150;
//@ chunk-aepeg2w5.js:895129-895358 layout
class FirstPartyLoggerState {
  firstPartyEventLogger = null;
  firstPartyEventLoggerProvider = null;
  firstPartyEventExporter = null;
  lastBatchConfig = null;
  retainedStorageV5 = void 0;
  preInitQueue = [];
  emitsInFlight = new Set();
  loggerBeingReplaced = null;
  reinitInFlight = null;
}
//@ chunk-aepeg2w5.js:895358-895383 layout
var firstPartyLoggerStateByHost = new HostScoped(() => new FirstPartyLoggerState());
//@ chunk-aepeg2w5.js:895383-895490 facade-exports
async function settle1PEventLoggingBeforeExit() {
  let { firstPartyEventExporter: firstPartyEventExporter } = firstPartyLoggerStateByHost.of(
    getRootSession().host,
  );
  try {
    await firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
  } catch {}
}
/**
 * 强制 flush 1P logger provider 与 exporter。
 */
//@ chunk-aepeg2w5.js:895490-895773 facade-exports
async function shutdown1PEventLogging() {
  let of = firstPartyLoggerStateByHost.of(getRootSession().host),
    {
      firstPartyEventLoggerProvider: firstPartyEventLoggerProvider,
      firstPartyEventExporter: firstPartyEventExporter,
    } = of;
  if (!firstPartyEventLoggerProvider) return;
  try {
    if (of.loggerBeingReplaced !== null)
      ((of.firstPartyEventLogger = of.loggerBeingReplaced),
        flushPreInitQueue(of),
        await _clearOutputsForTest(of, N2));
    let s = firstPartyEventExporter?.beginShutdown(DEFAULT_1P_BATCH_DELAY_MS);
    (await firstPartyEventLoggerProvider.shutdown(), await s);
  } catch {}
}
//@ chunk-aepeg2w5.js:895773-895822 layout
function shouldAttachAuthWithoutProfileScope() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_swift_whistle", !1);
}
/**
 * 1P 事件日志是否允许：!Ey()，即隐私级别为 default、API 提供方为第一方（或宿主托管）、未走网关、未设 CLAUDE_CODE_CUSTOM_OAUTH_URL。
 */
//@ chunk-aepeg2w5.js:895822-895848 facade-exports
function is1PEventLoggingEnabled() {
  return !isFirstPartyTelemetryBlocked();
}
/**
 * 把事件转成 1P 格式（to1PEventFormat：event_name、client_timestamp、env、process、auth、additional_metadata 等）后作为 OTel LogRecord 发给 com.anthropic.claude_code.events logger。
 */
//@ chunk-aepeg2w5.js:895848-896167 fingerprint = logEventTo1PAsync (0.666)
async function logEventTo1PAsync(e, n, r = {}, s = Yl(n)) {
  try {
    let coreMetadata = await getEventMetadata({ model: r.model, betas: r.betas }),
      y = {
        event_name: n,
        event_id: randomUUID_7(),
        core_metadata: coreMetadata,
        user_metadata: Tl(!0),
        event_metadata: r,
        ...(s !== void 0 && { principal_stamp: s }),
      },
      userId = getOrCreateUserID();
    if (userId) y.user_id = userId;
    let date = new Date();
    e.emit({ timestamp: date, observedTimestamp: date, body: n, attributes: y });
  } catch (error) {}
}
/**
 * 同步发 1P 事件：不允许时直接返回；logger 未初始化时进入 preInitQueue（上限 1024）；killswitch 开启时丢弃；否则交给 logEventTo1PAsync。
 */
//@ chunk-aepeg2w5.js:896167-896419 facade-exports
function logEventTo1P(e, n = {}, r = Yl(e)) {
  if (!is1PEventLoggingEnabled()) return;
  let {
    firstPartyEventLogger: firstPartyEventLogger,
    preInitQueue: preInitQueue,
    emitsInFlight: emitsInFlight,
  } = firstPartyLoggerStateByHost.of(getRootSession().host);
  if (!firstPartyEventLogger) {
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE)
      preInitQueue.push({ eventName: e, metadata: n, principalStamp: r });
    return;
  }
  if (isSinkKilled("firstParty")) return;
  trackInFlightEmit(emitsInFlight, firstPartyEventLogger, e, n, r);
}
//@ chunk-aepeg2w5.js:896419-896503 layout
function trackInFlightEmit(e, n, r, s, h) {
  let y = logEventTo1PAsync(n, r, s, h).finally(() => e.delete(y));
  return (e.add(y), y);
}
/**
 * 异步发 1P 事件（logEventAsync 路径），逻辑同 logEventTo1PSync 但返回发送 promise。
 */
//@ chunk-aepeg2w5.js:896503-896768 facade-exports
async function logEventTo1PAwaitable(e, n = {}) {
  if (!is1PEventLoggingEnabled()) return;
  let r = Yl(e),
    {
      firstPartyEventLogger: firstPartyEventLogger,
      preInitQueue: preInitQueue,
      emitsInFlight: emitsInFlight,
    } = firstPartyLoggerStateByHost.of(getRootSession().host);
  if (!firstPartyEventLogger) {
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE)
      preInitQueue.push({ eventName: e, metadata: n, principalStamp: r });
    return;
  }
  if (isSinkKilled("firstParty")) return;
  return trackInFlightEmit(emitsInFlight, firstPartyEventLogger, e, n, r);
}
/**
 * GrowthBook 实验事件的 environment，外部构建恒为 production。
 */
//@ chunk-aepeg2w5.js:896768-896801 fingerprint = getEnvironmentForGrowthBook (1)
function getEnvironmentForGrowthBook() {
  return "production";
}
/**
 * 把 GrowthBook 实验曝光作为 GrowthbookExperimentEvent 发到 1P 事件日志（experiment_id、variation_id、user_attributes、device_id、session_id 等）。
 */
//@ chunk-aepeg2w5.js:896801-897582 facade-exports = logGrowthBookExperimentTo1P (0.825)
function logGrowthBookExperimentTo1P(data) {
  if (!is1PEventLoggingEnabled() || isSinkKilled("firstParty") || Mo()) return !0;
  let {
    firstPartyEventLogger: firstPartyEventLogger,
    lastBatchConfig: lastBatchConfig,
    preInitQueue: preInitQueue,
  } = firstPartyLoggerStateByHost.of(getRootSession().host);
  if (!firstPartyEventLogger) {
    if (lastBatchConfig === null) return !0;
    if (preInitQueue !== null && preInitQueue.length < MAX_PRE_INIT_QUEUE)
      return (preInitQueue.push({ exposure: data }), !0);
    return !1;
  }
  let userId = getOrCreateUserID(),
    { accountUuid: accountUuid, organizationUuid: organizationUuid } = Tl(!0),
    attributes = {
      event_type: "GrowthbookExperimentEvent",
      event_id: randomUUID_7(),
      experiment_id: data.experimentId,
      variation_id: data.variationId,
      ...(userId && { device_id: userId }),
      ...(accountUuid && { account_uuid: accountUuid }),
      ...(organizationUuid && { organization_uuid: organizationUuid }),
      ...(data.userAttributes && {
        session_id: data.userAttributes.sessionId,
        user_attributes: jsonStringify({ appVersion: data.userAttributes.appVersion }),
      }),
      ...(data.experimentMetadata && { experiment_metadata: jsonStringify(data.experimentMetadata) }),
      environment: getEnvironmentForGrowthBook(),
    },
    date = new Date();
  return (
    firstPartyEventLogger.emit({
      timestamp: date,
      observedTimestamp: date,
      body: "growthbook_experiment",
      attributes: attributes,
    }),
    !0
  );
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
  constructor(e, n, r) {
    this.processor = e;
    this.resource = n;
    this.instrumentationScope = r;
  }
  emit(e) {
    let now = Date.now(),
      r = {};
    for (let [s, h] of Object.entries(e.attributes ?? {}))
      if (
        h !== null &&
        s.length > 0 &&
        (Vr.isAttributeValue(h) || (typeof h === "object" && !Array.isArray(h) && Object.keys(h).length > 0))
      )
        r[s] = h;
    this.processor.onEmit({
      hrTime: Vr.timeInputToHrTime(e.timestamp ?? now),
      hrTimeObserved: Vr.timeInputToHrTime(e.observedTimestamp ?? now),
      severityText: e.severityText,
      severityNumber: e.severityNumber,
      body: e.body,
      eventName: e.eventName,
      attributes: r,
      resource: this.resource,
      instrumentationScope: this.instrumentationScope,
      droppedAttributesCount: 0,
    });
  }
}
//@ chunk-aepeg2w5.js:898402-899558 layout
function create1PLogger(e, n, r) {
  return OTEL_LOG_LIMIT_ENV_VARS.some((h) => Vr.getStringFromEnv(h) !== void 0)
    ? e.getLogger(
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
    : new FirstPartyLogger(n, r, {
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
var DEFAULT_1P_EXPORT_INTERVAL_MS = 1e4,
  G2 = 200,
  $2 = 8192,
  SP = 1024;
//@ chunk-aepeg2w5.js:899592-899678 layout
function clampMaxQueueSize(e) {
  return typeof e === "number" && Number.isInteger(e) && e > 0 ? Math.min(e, SP) : SP;
}
/**
 * 初始化 1P 事件日志：读 tengu_1p_event_batch_config（延迟、批大小、队列、path/baseUrl、skipAuth），创建 FirstPartyEventLoggingExporter + BatchLogRecordProcessor 和 LoggerProvider（resource service.name=claude-code）。不允许时清空预排队。
 */
//@ chunk-aepeg2w5.js:899678-901197 facade-exports = initialize1PEventLogging (0.565)
function initialize1PEventLogging(e, n) {
  let of = firstPartyLoggerStateByHost.of(getRootSession().host);
  if (e !== void 0 && of.retainedStorageV5 === void 0) of.retainedStorageV5 = e;
  if ((profileCheckpoint("1p_event_logging_start"), !is1PEventLoggingEnabled())) {
    of.preInitQueue = null;
    return;
  }
  let enabled = get1PEventBatchConfig();
  profileCheckpoint("1p_event_after_growthbook_config");
  let y =
      enabled.scheduledDelayMillis ||
      parseNumberOrDefault(process.env.OTEL_LOGS_EXPORT_INTERVAL, DEFAULT_1P_EXPORT_INTERVAL_MS),
    S = enabled.maxExportBatchSize || G2,
    w = Mo() ? clampMaxQueueSize(enabled.maxQueueSize) : enabled.maxQueueSize || $2,
    platform = getPlatform(),
    x = {
      [xd.ATTR_SERVICE_NAME]: "claude-code",
      [xd.ATTR_SERVICE_VERSION]: {
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
    if (wslVersion) x["wsl.version"] = wslVersion;
  }
  let resourceFromAttributes = vP.resourceFromAttributes(x),
    F = wrapExporterFailures(
      new FirstPartyEventLoggingExporter({
        maxBatchSize: S,
        skipAuth: enabled.skipAuth,
        attachAuthWithoutProfileScope: shouldAttachAuthWithoutProfileScope,
        maxAttempts: enabled.maxAttempts,
        path: enabled.path,
        baseUrl: enabled.baseUrl,
        isKilled: () => isSinkKilled("firstParty"),
        storageV5: of.retainedStorageV5,
        tenantGrant: n,
      }),
      new ExportFailureCounter("1P event logging"),
    ),
    L = new vlt(F, { scheduledDelayMillis: y, maxExportBatchSize: S, maxQueueSize: w });
  ((of.firstPartyEventLoggerProvider = new P8t({ resource: resourceFromAttributes, processors: [L] })),
    (of.firstPartyEventExporter = F),
    (of.firstPartyEventLogger = create1PLogger(of.firstPartyEventLoggerProvider, L, resourceFromAttributes)),
    (of.lastBatchConfig = enabled),
    flushPreInitQueue(of));
}
/**
 * 初始化后补发预初始化期间排队的事件与实验曝光。
 */
//@ chunk-aepeg2w5.js:901268-901455 affinity
function flushPreInitQueue(e) {
  if (e.preInitQueue === null) return;
  let preInitQueue = e.preInitQueue;
  e.preInitQueue = null;
  for (let r of preInitQueue)
    if ("exposure" in r) logGrowthBookExperimentTo1P(r.exposure);
    else logEventTo1P(r.eventName, r.metadata, r.principalStamp);
}
//@ chunk-aepeg2w5.js:901455-901578 facade-exports
function reinitialize1PEventLoggingIfConfigChanged() {
  let of = firstPartyLoggerStateByHost.of(getRootSession().host);
  return (
    (of.reinitInFlight ??= reinitialize1PEventLoggingIfConfigChanged_2(of).finally(() => {
      of.reinitInFlight = null;
    })),
    of.reinitInFlight
  );
}
//@ chunk-aepeg2w5.js:901578-902197 callgraph-fingerprint = reinitialize1PEventLoggingIfConfigChanged (0.2)
async function reinitialize1PEventLoggingIfConfigChanged_2(e) {
  if (!is1PEventLoggingEnabled() || !e.firstPartyEventLoggerProvider) return;
  let newConfig = get1PEventBatchConfig();
  if (En(newConfig, e.lastBatchConfig)) return;
  let {
    firstPartyEventLoggerProvider: firstPartyEventLoggerProvider,
    firstPartyEventLogger: firstPartyEventLogger,
    firstPartyEventExporter: firstPartyEventExporter,
  } = e;
  ((e.firstPartyEventLogger = null),
    (e.loggerBeingReplaced = firstPartyEventLogger),
    (e.preInitQueue ??= []),
    await _clearOutputsForTest(e, D2));
  try {
    await firstPartyEventLoggerProvider.forceFlush();
  } catch {}
  ((e.firstPartyEventLoggerProvider = null), (e.loggerBeingReplaced = null));
  try {
    initialize1PEventLogging();
  } catch (error) {
    ((e.firstPartyEventLoggerProvider = firstPartyEventLoggerProvider),
      (e.firstPartyEventLogger = firstPartyEventLogger),
      (e.firstPartyEventExporter = firstPartyEventExporter),
      flushPreInitQueue(e),
      logError(error));
    return;
  }
  if (firstPartyEventExporter)
    (e.firstPartyEventExporter?.adoptInflightRefreshFrom(firstPartyEventExporter),
      firstPartyEventExporter.beginShutdown());
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
};
