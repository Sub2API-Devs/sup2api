/**
 * services/analytics/firstPartyEventLoggingExporter.ts
 *
 * 1P 事件导出器：POST /api/event_logging/v2/batch，退避重试、认证、失败批落盘 <配置目录>/telemetry/1p_failed_events.* 并重发。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/firstPartyEventLoggingExporter.ts
 * pieces: chunk-4m46mxx9.js (1), chunk-aepeg2w5.js (18)
 * attribution: fingerprint 4, layout 6, placement 9
 */
import { randomUUID, createHash } from "crypto";
import * as pathModule from "path";
import { unlink, mkdir, writeFile, appendFile, readdir } from "fs/promises";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import {
  isRowOfCurrentPrincipal,
  isHipaaMode,
  needsPrincipalStamp,
  isEventOfAnotherPrincipal,
} from "./privacyLevel.js";
import { EXPORT_ENVIRONMENTS, isDisklessHost } from "./anthropicTelemetryExport.js";
import { getSessionId, getIsNonInteractiveSession, getIsInteractive } from "../../bootstrap/state.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { readJSONLFile_2 } from "../../utils/json.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT, isFsInaccessible, toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import {
  filterEventsForPrivacy,
  nodeGzipModule,
  gzipTelemetryBody,
  sanitizeExperimentEventFields,
  pickNumericMetrics,
} from "./eventSerialization.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../../utils/pagedRead.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  isClaudeAISubscriber,
  hasProfileScope,
  getClaudeAIOAuthTokens,
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokenOrigin,
  getStoredOauthAccountInfo,
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isApiKeyHelperTheActiveCredential,
  getColdApiKeyHelperRun,
} from "../../utils/auth.js";
import { isOAuthTokenExpired } from "../oauth/client.js";
import {
  isFirstPartyAnthropicHost,
  isActualFirstPartyAnthropicBaseUrl,
} from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { getAuthHeadersAsync, claudeCodeUserAgent } from "../../utils/http.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { getAuthHeaders_2 } from "../policyLimits/index.js";
import { guardTelemetryCredentials } from "./telemetryCredentialGuard.js";
import { getTLSFetchSession } from "../../utils/mtls.js";
import { withoutSensitiveHeaders } from "../../utils/anthropicHosts.js";
import { withVettedSessionsBearer, reportSessionsBearerAnswer } from "../oauth/sessionsBearerHooks.js";
import { getProxyFetchOptions, getProxyUrlWithSource } from "../../utils/proxy.js";
import { guardBunFetchSession } from "../../utils/testNetworkGuard.js";
import { ClaudeCodeInternalEvent } from "../../types/generated/events_mono/claude_code/v1/claude_code_internal_event.js";
import { sanitizeEventMetadata } from "./metadataSanitizers.js";
import { GrowthbookExperimentEvent } from "../../types/generated/events_mono/growthbook/v1/growthbook_experiment_event.js";
import { to1PEventFormat } from "./metadata.js";
import { stripProtoFields } from "./index.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:874435-874470 fingerprint = FILE_PREFIX (1)
var EXPORTER_RUN_ID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FAILED_EVENTS_KEY_PREFIX;
deferInit("chunk-aepeg2w5.js:874435", () => {
  EXPORTER_RUN_ID = randomUUID();
  FAILED_EVENTS_KEY_PREFIX = "1p_failed_events.";
});
//@ chunk-aepeg2w5.js:874470-874581 layout
function getFlatMigrationKey(index, text) {
  let sliced = createHash("sha256").update(text).digest("base64url").slice(0, 22);
  return `flat-migration.${index}.${sliced}`;
}
//@ chunk-aepeg2w5.js:874581-874628 layout = getStorageDir (1)
/**
 * 1P 失败事件落盘目录 <配置目录>/telemetry。
 */
function getTelemetryStorageDir() {
  return pathModule.join(getClaudeConfigDir(), "telemetry");
}
//@ chunk-aepeg2w5.js:874628-874658 layout
/**
 * 一方遥测导出的 OAUTH 刷新超时、密钥助手加入超时与 WIF 铸造重试间隔。
 */
var OAUTH_REFRESH_TIMEOUT_MS = 2000;
var KEY_HELPER_JOIN_TIMEOUT_MS = 3000;
var WIF_MINT_RETRY_MS = 300000;
//@ chunk-aepeg2w5.js:874658-874758 layout
/**
 * 去掉 principal_stamp 不属于当前身份的事件。
 */
function dropForeignPrincipalEvents(events) {
  let kept = [];
  for (let { principal_stamp: principalStamp, ...rest } of events)
    if (principalStamp === undefined || isRowOfCurrentPrincipal(principalStamp)) kept.push(rest);
  return kept;
}
//@ chunk-aepeg2w5.js:874758-892785 fingerprint = FirstPartyEventLoggingExporter (0.535)
/**
 * 1P 事件导出器：POST <baseUrl 默认 https://api.anthropic.com>/api/event_logging/v2/batch（批 200、指数退避最多 8 次、OAuth/API key 认证可跳过）；失败批写入 <配置目录>/telemetry/1p_failed_events.<runId>… 下次重发；killswitch 时不发。
 */
class FirstPartyEventLoggingExporter {
  endpoint;
  timeout;
  maxBatchSize;
  skipAuth;
  attachAuthWithoutProfileScope;
  batchDelayMs;
  baseBackoffDelayMs;
  maxBackoffDelayMs;
  maxAttempts;
  oauthRefreshTimeoutMs;
  keyHelperJoinTimeoutMs;
  isKilled;
  storageV5;
  tenantGrant;
  wasPassedAGrant;
  sendMode;
  pendingExports = [];
  isShutdown = false;
  schedule;
  cancelBackoff = null;
  attempts = 0;
  drainPromise = null;
  queueFileLock = Promise.resolve();
  lastExportErrorContext;
  refreshAttemptedFor;
  inflightRefresh = null;
  wifMintRetryAt = 0;
  finalFlush = false;
  signalFinalFlush = () => {};
  finalFlushSignal = new Promise((resolve) => {
    this.signalFinalFlush = resolve;
  });
  constructor(options = {}) {
    let baseUrl =
      options.baseUrl ||
      (process.env.ANTHROPIC_BASE_URL === "https://api-staging.anthropic.com"
        ? "https://api-staging.anthropic.com"
        : "https://api.anthropic.com");
    this.endpoint = `${baseUrl}${options.path || "/api/event_logging/v2/batch"}`;
    this.timeout = options.timeout || 1e4;
    this.maxBatchSize = options.maxBatchSize || 200;
    this.skipAuth = options.skipAuth ?? false;
    this.attachAuthWithoutProfileScope = options.attachAuthWithoutProfileScope ?? (() => false);
    this.batchDelayMs = options.batchDelayMs || 100;
    this.baseBackoffDelayMs = options.baseBackoffDelayMs || 500;
    this.maxBackoffDelayMs = options.maxBackoffDelayMs || 30000;
    this.maxAttempts = options.maxAttempts ?? 8;
    this.oauthRefreshTimeoutMs = options.oauthRefreshTimeoutMs ?? OAUTH_REFRESH_TIMEOUT_MS;
    this.keyHelperJoinTimeoutMs = options.keyHelperJoinTimeoutMs ?? KEY_HELPER_JOIN_TIMEOUT_MS;
    this.isKilled = options.isKilled ?? (() => false);
    this.storageV5 = options.storageV5;
    this.tenantGrant = options.tenantGrant ?? dryRunGrant();
    this.wasPassedAGrant = options.tenantGrant !== undefined;
    let sendMode = options.tenantGrant?.sendMode;
    this.sendMode = EXPORT_ENVIRONMENTS.find((env) => env === sendMode);
    this.schedule =
      options.schedule ??
      ((fn, ms) => {
        let t = setTimeout(fn, ms);
        return () => clearTimeout(t);
      });
    this.retryPreviousBatches();
  }
  async getQueuedEventCount() {
    return (await this.loadEventsFromCurrentBatch()).length;
  }
  getCurrentBatchFilePath() {
    return pathModule.join(
      getTelemetryStorageDir(),
      `${FAILED_EVENTS_KEY_PREFIX}${getSessionId()}.${EXPORTER_RUN_ID}.json`,
    );
  }
  currentBatchStream() {
    return STORAGE_SPACES.log(getSessionId(), "telemetry", {
      runId: EXPORTER_RUN_ID,
    });
  }
  async loadEventsFromFile(filePath) {
    if (this.underATenantsRules()) return [];
    try {
      return await readJSONLFile_2(filePath);
    } catch {
      return [];
    }
  }
  currentBatch() {
    return isStorageV5Enabled() && this.storageV5 !== undefined
      ? {
          kind: "stream",
          storageV5: this.storageV5,
          stream: this.currentBatchStream(),
        }
      : {
          kind: "file",
          filePath: this.getCurrentBatchFilePath(),
        };
  }
  async loadEventsFromCurrentBatch() {
    return this.loadEventsFromBatch(this.currentBatch());
  }
  async loadEventsFromBatch(batch) {
    return batch.kind === "stream"
      ? this.loadEventsFromStream(batch.storageV5, batch.stream)
      : this.loadEventsFromFile(batch.filePath);
  }
  async deleteBatch(batch) {
    return batch.kind === "stream"
      ? this.deleteStream(batch.storageV5, batch.stream)
      : this.deleteFile(batch.filePath);
  }
  async appendEventsToBatch(batch, events) {
    return batch.kind === "stream"
      ? this.appendEventsToStream(batch.storageV5, batch.stream, events)
      : this.appendEventsToFile(batch.filePath, events);
  }
  async saveEventsToFile(filePath, events) {
    if (this.underATenantsRules()) return;
    try {
      if (events.length === 0)
        try {
          await unlink(filePath);
        } catch {}
      else {
        await mkdir(getTelemetryStorageDir(), {
          recursive: true,
        });
        let content =
          events.map((e) => jsonStringify(e)).join(`
`) +
          `
`;
        await writeFile(filePath, content, "utf8");
      }
    } catch (error) {
      logForDebugging(
        `1P event logging: failed to persist failed-events batch to ${filePath}: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  async appendEventsToFile(filePath, events) {
    if (events.length === 0) return;
    if (this.underATenantsRules()) {
      this.dropInATenant("no_store", events.length);
      return;
    }
    try {
      await mkdir(getTelemetryStorageDir(), {
        recursive: true,
      });
      let content =
        events.map((e) => jsonStringify(e)).join(`
`) +
        `
`;
      await appendFile(filePath, content, "utf8");
    } catch (error) {
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to ${filePath}: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  async deleteFile(filePath) {
    if (this.underATenantsRules()) return true;
    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      return isENOENT(error);
    }
  }
  async loadEventsFromStream(storageV5, stream) {
    let events = [];
    let textDecoder = new TextDecoder();
    let fromSeq = 0;
    for (;;) {
      let records = await storageV5.readRecords(stream, {
        fromSeq,
        order: "forward",
      });
      if (!records.ok) return [];
      for (let item of records.value.items) {
        let text = textDecoder.decode(item.data);
        let line = text.endsWith(`
`)
          ? text.slice(0, -1)
          : text;
        if (!line) continue;
        try {
          events.push(jsonParse(line));
        } catch {}
      }
      if (records.value.nextSeq === undefined) return events;
      fromSeq = records.value.nextSeq;
    }
  }
  async deleteStream(storageV5, stream) {
    return (await storageV5.delete(stream)).ok;
  }
  async appendEventsToStream(storageV5, stream, events) {
    if (events.length === 0) return;
    let result = await storageV5.append(
      stream,
      events.map((event) => ({
        data:
          jsonStringify(event) +
          `
`,
      })),
    );
    if (!result.ok)
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to v5 stream: ${result.error.code}`,
        {
          level: "error",
        },
      );
  }
  async retryPreviousBatches() {
    if (this.underATenantsRules()) return;
    if (isStorageV5Enabled() && this.storageV5 !== undefined)
      try {
        return await this.retryPreviousBatchesV5(this.storageV5);
      } catch (error) {
        logError(error);
        return;
      }
    try {
      let prefix = `${FAILED_EVENTS_KEY_PREFIX}${getSessionId()}.`;
      let files;
      try {
        files = (await readdir(getTelemetryStorageDir()))
          .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
          .filter((file) => !file.includes(EXPORTER_RUN_ID));
      } catch (e) {
        if (isFsInaccessible(e)) return;
        throw e;
      }
      for (let file of files) {
        let filePath = pathModule.join(getTelemetryStorageDir(), file);
        this.retryFileInBackground(filePath).catch((error) => {
          logError(error);
        });
      }
    } catch (error) {
      logError(error);
    }
  }
  async retryFileInBackground(filePath) {
    if (this.attempts >= this.maxAttempts) {
      await this.deleteFile(filePath);
      return;
    }
    let events = await this.loadEventsFromFile(filePath);
    if (events.length === 0) {
      await this.deleteFile(filePath);
      return;
    }
    let filtered = filterEventsForPrivacy(events);
    let failedEvents = await this.sendEventsInBatches(filtered, {
      startupRetry: true,
    });
    if (failedEvents.length === 0) await this.deleteFile(filePath);
    else await this.saveEventsToFile(filePath, failedEvents);
  }
  async retryPreviousBatchesV5(storageV5) {
    let sessionId = getSessionId();
    let namespace = {
      namespace: "log",
      sessionId,
      channel: "telemetry",
    };
    let streamKeys = [];
    switch (
      (
        await readAllPages(
          (cursor) =>
            storageV5.listEntries(
              namespace,
              cursor === undefined
                ? undefined
                : {
                    cursor,
                  },
            ),
          (page) => {
            for (let entry of page) {
              if (entry.kind !== "key" || entry.key.namespace !== "log") continue;
              let key = entry.key;
              if (key.agentId !== undefined || key.runId === undefined || key.runId === EXPORTER_RUN_ID)
                continue;
              streamKeys.push(key);
            }
          },
        )
      ).status
    ) {
      case "done":
        break;
      case "error":
        return;
      case "capped":
        logForDebugging(
          `1P event logging: previous-batch stream listing truncated at ${DEFAULT_MAX_PAGES} pages; retrying the ${streamKeys.length} streams seen`,
          {
            level: "warn",
          },
        );
        break;
    }
    for (let key of streamKeys)
      this.retryStreamInBackground(storageV5, key).catch((error) => {
        logError(error);
      });
    await this.migrateLegacyFlatBatches(
      storageV5,
      sessionId,
      new Set(
        streamKeys.flatMap((key) => (key.namespace === "log" && key.runId !== undefined ? [key.runId] : [])),
      ),
    );
  }
  async migrateLegacyFlatBatches(storageV5, sessionId, migratedRunIds) {
    if (this.underATenantsRules()) return;
    let prefix = `${FAILED_EVENTS_KEY_PREFIX}${sessionId}.`;
    let files;
    try {
      files = (await readdir(getTelemetryStorageDir())).filter(
        (file) => file.startsWith(prefix) && file.endsWith(".json"),
      );
    } catch (error) {
      if (isFsInaccessible(error)) return;
      throw error;
    }
    for (let file of files) {
      let sliced = file.slice(prefix.length, -5);
      if (sliced.length === 0 || sliced === EXPORTER_RUN_ID) continue;
      if (migratedRunIds.has(sliced)) continue;
      let joined = pathModule.join(getTelemetryStorageDir(), file);
      let stream = STORAGE_SPACES.log(sessionId, "telemetry", {
        runId: sliced,
      });
      let eventsFromFile = await this.loadEventsFromFile(joined);
      if (eventsFromFile.length === 0) continue;
      let appendResult = await storageV5.append(
        stream,
        eventsFromFile.map((event, index) => {
          let recordText =
            jsonStringify(event) +
            `
`;
          return {
            data: recordText,
            recordId: getFlatMigrationKey(index, recordText),
          };
        }),
      );
      if (!appendResult.ok) {
        logForDebugging(
          `1P event logging: failed to migrate flat failed-event batch to v5 stream: ${appendResult.error.code}`,
          {
            level: "error",
          },
        );
        continue;
      }
      await this.deleteFile(joined);
      this.retryStreamInBackground(storageV5, stream).catch((error) => {
        logError(error);
      });
    }
  }
  async retryStreamInBackground(storageV5, stream) {
    if (this.attempts >= this.maxAttempts) {
      await this.deleteStream(storageV5, stream);
      return;
    }
    let eventsFromStream = await this.loadEventsFromStream(storageV5, stream);
    if (eventsFromStream.length === 0) {
      await this.deleteStream(storageV5, stream);
      return;
    }
    let filtered = filterEventsForPrivacy(eventsFromStream);
    let failedEvents = await this.sendEventsInBatches(filtered, {
      startupRetry: true,
    });
    if (failedEvents.length === 0) await this.deleteStream(storageV5, stream);
    else if (await this.deleteStream(storageV5, stream))
      await this.appendEventsToStream(storageV5, stream, failedEvents);
  }
  async export(logs, resultCallback) {
    if (this.isShutdown) {
      resultCallback({
        code: nodeGzipModule.ExportResultCode.FAILED,
        error: Error("Exporter has been shutdown"),
      });
      return;
    }
    let exportPromise = this.doExport(logs, resultCallback).catch(logError);
    this.pendingExports.push(exportPromise);
    exportPromise.finally(() => {
      let index = this.pendingExports.indexOf(exportPromise);
      if (index > -1) this.pendingExports.splice(index, 1);
    });
  }
  async doExport(logs, resultCallback) {
    try {
      this.tellATenantsGrant((grant) => grant.onExport(logs.length));
      let eventLogs = logs.filter(
        (log) => log.instrumentationScope?.name === "com.anthropic.claude_code.events",
      );
      if (eventLogs.length === 0) {
        resultCallback({
          code: nodeGzipModule.ExportResultCode.SUCCESS,
        });
        return;
      }
      let events = this.transformLogsToEvents(eventLogs).events;
      if (events.length === 0) {
        resultCallback({
          code: nodeGzipModule.ExportResultCode.SUCCESS,
        });
        return;
      }
      if (this.attempts >= this.maxAttempts) {
        this.dropInATenant("given_up", events.length);
        resultCallback({
          code: nodeGzipModule.ExportResultCode.FAILED,
          error: Error(`Dropped ${events.length} events: max attempts (${this.maxAttempts}) reached`),
        });
        return;
      }
      let failedEvents = await this.sendEventsInBatches(events);
      this.attempts++;
      if (failedEvents.length > 0) {
        await this.queueFailedEvents(failedEvents);
        this.scheduleBackoffRetry();
        let context = this.lastExportErrorContext ? ` (${this.lastExportErrorContext})` : "";
        resultCallback({
          code: nodeGzipModule.ExportResultCode.FAILED,
          error: Error(`Failed to export ${failedEvents.length} events${context}`),
        });
        return;
      }
      this.resetBackoff();
      this.retryFailedEvents();
      resultCallback({
        code: nodeGzipModule.ExportResultCode.SUCCESS,
      });
    } catch (error) {
      this.dropInATenant("export_threw", logs.length);
      logError(error);
      resultCallback({
        code: nodeGzipModule.ExportResultCode.FAILED,
        error: toError(error),
      });
    }
  }
  async sendEventsInBatches(events, options = {}) {
    let batches = [];
    for (let i = 0; i < events.length; i += this.maxBatchSize)
      batches.push(events.slice(i, i + this.maxBatchSize));
    let failedBatchEvents = [];
    let lastErrorContext;
    for (let i = 0; i < batches.length; i++) {
      let batch = batches[i];
      try {
        await this.sendBatchWithRetry(
          {
            events: batch,
          },
          options,
        );
      } catch (error) {
        lastErrorContext = getAxiosErrorContext(error);
        this.tellATenantsGrant((grant) => grant.onFailed(classifyPostFailure(error), batch.length));
        for (let j = i; j < batches.length; j++) failedBatchEvents.push(...batches[j]);
        break;
      }
      if (i < batches.length - 1 && this.batchDelayMs > 0) await sleep(this.batchDelayMs);
    }
    if (failedBatchEvents.length > 0 && lastErrorContext) this.lastExportErrorContext = lastErrorContext;
    return failedBatchEvents;
  }
  withQueueFileLock(fn) {
    let run = this.queueFileLock.then(fn);
    this.queueFileLock = run.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return run;
  }
  async queueFailedEvents(events) {
    let filePath = this.currentBatch();
    await this.withQueueFileLock(() => this.appendEventsToBatch(filePath, events));
    let context = this.lastExportErrorContext ? ` (${this.lastExportErrorContext})` : "";
    logForDebugging(`1P event logging: ${events.length} events failed to export${context}`, {
      level: "error",
    });
  }
  scheduleBackoffRetry() {
    if (this.cancelBackoff || this.isShutdown) return;
    let delay = Math.min(
      Math.max(this.baseBackoffDelayMs, this.baseBackoffDelayMs * this.attempts * this.attempts),
      this.maxBackoffDelayMs,
    );
    this.cancelBackoff = this.schedule(async () => {
      this.cancelBackoff = null;
      await this.retryFailedEvents();
    }, delay);
  }
  retryFailedEvents() {
    if (this.drainPromise) return this.drainPromise;
    this.drainPromise = this.doRetryFailedEvents()
      .catch((error) => {
        logError(error);
      })
      .finally(() => {
        this.drainPromise = null;
      });
    return this.drainPromise;
  }
  async doRetryFailedEvents() {
    let filePath = this.currentBatch();
    while (!this.isShutdown) {
      let attempt = await this.withQueueFileLock(async () => {
        let eventsFromBatch = await this.loadEventsFromBatch(filePath);
        if (eventsFromBatch.length === 0)
          return {
            kind: "empty",
          };
        if (this.attempts >= this.maxAttempts) {
          let deleted = await this.deleteBatch(filePath);
          return {
            kind: "dropped",
            count: eventsFromBatch.length,
            deleted,
          };
        }
        if (!(await this.deleteBatch(filePath)))
          return {
            kind: "unclaimable",
          };
        return {
          kind: "claimed",
          events: eventsFromBatch,
        };
      });
      if (attempt.kind === "empty") break;
      if (attempt.kind === "unclaimable") {
        this.scheduleBackoffRetry();
        return;
      }
      if (attempt.kind === "dropped") {
        if (!attempt.deleted) {
          this.scheduleBackoffRetry();
          return;
        }
        this.dropInATenant("given_up", attempt.count);
        this.resetBackoff();
        return;
      }
      let filtered = filterEventsForPrivacy(attempt.events);
      let failedEvents = await this.sendEventsInBatches(filtered);
      this.attempts++;
      if (failedEvents.length > 0) {
        await this.withQueueFileLock(() => this.appendEventsToBatch(filePath, failedEvents));
        this.scheduleBackoffRetry();
        return;
      }
      this.resetBackoff();
    }
  }
  resetBackoff() {
    this.attempts = 0;
    if (this.cancelBackoff) {
      this.cancelBackoff();
      this.cancelBackoff = null;
    }
  }
  async refreshExpiredOAuthTokenOnce() {
    if (!isClaudeAISubscriber() || !hasProfileScope()) return;
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (!claudeAIOAuthTokens || !isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return;
    if (this.refreshAttemptedFor === claudeAIOAuthTokens.accessToken) {
      if (this.inflightRefresh) await withDeadline(this.inflightRefresh, this.oauthRefreshTimeoutMs);
      return;
    }
    this.refreshAttemptedFor = claudeAIOAuthTokens.accessToken;
    let refreshPromise = Promise.resolve()
      .then(() => checkAndRefreshOAuthTokenIfNeeded())
      .then(
        () => {},
        (error) => {
          logForDebugging(`1P event logging: OAuth refresh before send failed: ${toError(error).name}`);
        },
      )
      .finally(() => {
        if (this.inflightRefresh === refreshPromise) this.inflightRefresh = null;
      });
    this.inflightRefresh = refreshPromise;
    await withDeadline(refreshPromise, this.oauthRefreshTimeoutMs);
  }
  shouldSkipAuthForSend(attachAuth) {
    if (this.skipAuth || !attachAuth) return true;
    if (!isFirstPartyAnthropicHost(this.endpoint) || !isHttpsEndpoint_2(this.endpoint)) return true;
    if (!isClaudeAISubscriber()) return false;
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (!hasProfileScope() && !this.shouldAttachAuthWithoutProfileScope()) return true;
    if (claudeAIOAuthTokens && isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return true;
    return false;
  }
  shouldAttachAuthWithoutProfileScope() {
    if (
      !this.attachAuthWithoutProfileScope() ||
      (!isActualFirstPartyAnthropicBaseUrl() && !this.hostVouchesForEnvBearer())
    )
      return false;
    let claudeAIOAuthTokenOrigin = getClaudeAIOAuthTokenOrigin();
    if (claudeAIOAuthTokenOrigin === "store") return true;
    if (claudeAIOAuthTokenOrigin === "env" || claudeAIOAuthTokenOrigin === "fd")
      return !getStoredOauthAccountInfo();
    return false;
  }
  underATenantsRules() {
    return this.wasPassedAGrant || isDisklessHost();
  }
  hostVouchesForEnvBearer() {
    return (
      isDisklessHost() &&
      this.sendMode !== undefined &&
      env.CLAUDE_CODE_OAUTH_TOKEN?.startsWith("sk-ant-oat") === true
    );
  }
  whyATenantMayNotPost(kind, detail) {
    if (!this.underATenantsRules()) return;
    if (kind) return "previous_run";
    try {
      let reason = this.tenantGrant.mayPost();
      if (reason !== true) {
        Promise.resolve(reason).catch(logGrantCallbackError);
        return "refused";
      }
    } catch (error) {
      logGrantCallbackError(error);
      return "refused";
    }
    if (!this.hostVouchesForEnvBearer()) return "not_vouched";
    if (!(
      detail === undefined ||
      (!detail.error && detail.headers.Authorization === `Bearer ${env.CLAUDE_CODE_OAUTH_TOKEN}`)
    ))
      return "no_credential";
    return detail !== undefined && this.sendMode === "dry_run" ? "dry_run" : undefined;
  }
  dropInATenant(kind, detail) {
    this.tellATenantsGrant((grant) => grant.onDrop(kind, detail));
  }
  tellATenantsGrant(fn) {
    try {
      if (this.underATenantsRules()) Promise.resolve(fn(this.tenantGrant)).catch(logGrantCallbackError);
    } catch (error) {
      logGrantCallbackError(error);
    }
  }
  async authHeadersForSend() {
    if (!(getAnthropicApiKeySafe() === null && shouldUseWIFAuth())) return getAuthHeadersAsync();
    let { getResolvedWIFBaseUrlSnapshot } =
      await import("../../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
    let apiBaseUrlHost = getApiBaseUrlHost_2(getResolvedWIFBaseUrlSnapshot());
    if (
      apiBaseUrlHost === undefined ||
      apiBaseUrlHost !== endpointHost(this.endpoint) ||
      !isHttpsEndpoint_2(this.endpoint)
    )
      return {
        headers: {},
        error: "workload-identity token is minted for a different host",
      };
    if (Date.now() < this.wifMintRetryAt)
      return {
        headers: {},
        error: "workload-identity mint failed recently; not retried yet",
      };
    let authHeaders = await getAuthHeadersAsync();
    if (authHeaders.error) {
      if (authHeaders.reasonCode === "wif_error") this.wifMintRetryAt = Date.now() + WIF_MINT_RETRY_MS;
      return authHeaders;
    }
    if (getApiBaseUrlHost_2(getResolvedWIFBaseUrlSnapshot()) !== apiBaseUrlHost)
      return {
        headers: {},
        error: "workload-identity resolution changed during the send",
      };
    return authHeaders;
  }
  async sendBatchWithRetry(batch, options = {}) {
    let refusal = this.whyATenantMayNotPost(options.startupRetry);
    if (refusal) {
      this.dropInATenant(refusal, batch.events.length);
      return;
    }
    if (this.isKilled()) throw new SinkKillSwitchError();
    let baseHeaders = {
      "Content-Type": "application/json",
      "User-Agent": claudeCodeUserAgent(),
      "x-service-name": "claude-code",
    };
    let hasTrust =
      (this.underATenantsRules() && getIsNonInteractiveSession()) ||
      checkHasTrustDialogAccepted() ||
      getIsNonInteractiveSession();
    if (
      hasTrust &&
      !this.skipAuth &&
      !this.finalFlush &&
      !this.isShutdown &&
      !options.startupRetry &&
      getIsInteractive()
    )
      await this.refreshExpiredOAuthTokenOnce();
    let skipAuth = this.shouldSkipAuthForSend(hasTrust);
    if (
      !skipAuth &&
      !this.isShutdown &&
      !this.finalFlush &&
      isActualFirstPartyAnthropicBaseUrl() &&
      !isClaudeAISubscriber() &&
      isApiKeyHelperTheActiveCredential()
    ) {
      let coldApiKeyHelperRun = getColdApiKeyHelperRun();
      if (coldApiKeyHelperRun)
        await withDeadline(
          Promise.race([coldApiKeyHelperRun.catch(() => null), this.finalFlushSignal]),
          this.keyHelperJoinTimeoutMs,
        );
    }
    let authResult = skipAuth
      ? {
          headers: {},
          error:
            "auth skipped: skipAuth config, trust not established, endpoint not first-party https, no-profile lane closed, or OAuth token expired",
        }
      : await this.authHeadersForSend();
    let authWithFallback =
      !skipAuth && authResult.reasonCode === "no_api_key"
        ? (getAuthHeaders_2(this.endpoint) ?? authResult)
        : authResult;
    let credential = guardTelemetryCredentials(authWithFallback, this.endpoint);
    let hasAuth = !credential.error;
    let payload = {
      events: dropForeignPrincipalEvents(batch.events),
    };
    if (payload.events.length === 0) return;
    let body = gzipTelemetryBody({
      url: this.endpoint,
      payload,
      storageV5: this.storageV5,
    });
    let lateRefusal = this.whyATenantMayNotPost(options.startupRetry, credential);
    if (lateRefusal) {
      this.dropInATenant(lateRefusal, payload.events.length);
      return;
    }
    let headers = {
      ...baseHeaders,
      ...(hasAuth && credential.headers),
      ...(this.underATenantsRules() &&
        this.sendMode !== "production" && {
          "x-test-mode": "true",
        }),
    };
    try {
      let response = await this.post(headers, body, payload);
      this.logSuccess(payload.events.length, hasAuth, response);
      let accepted = acceptedEventCount(response, payload.events.length);
      this.tellATenantsGrant((grant) => grant.onSent(accepted));
      if (accepted < payload.events.length)
        this.dropInATenant("rejected_by_ingest", payload.events.length - accepted);
      return;
    } catch (error) {
      if (
        hasAuth &&
        !this.underATenantsRules() &&
        !batch.events.some((event) => event.principal_stamp !== undefined) &&
        error instanceof DirectPostError &&
        error.facts.status === 401
      ) {
        let finalResponse = await this.post(baseHeaders, body, payload);
        this.logSuccess(payload.events.length, false, finalResponse);
        return;
      }
      throw error;
    }
  }
  async post(headers, body, payload) {
    let tlsFetchSession = getTLSFetchSession("analytics", withoutSensitiveHeaders(this.endpoint, headers));
    if (!tlsFetchSession) throw Error("this runtime has no Bun.FetchSession");
    let bearer = withVettedSessionsBearer(
      {
        Accept: DEFAULT_ACCEPT_HEADER,
        ...headers,
        ...body?.headers,
      },
      this.endpoint,
    );
    let { proxy, tls, ...rest } = getProxyFetchOptions({
      url: this.endpoint,
    });
    let fetchOptions =
      proxy !== undefined
        ? {
            proxy: {
              ...(typeof proxy === "string"
                ? {
                    url: proxy,
                  }
                : proxy),
              respectNoProxy: false,
            },
          }
        : getProxyUrlWithSource()
          ? {
              proxy: false,
            }
          : {};
    guardBunFetchSession(tlsFetchSession, "POST", this.endpoint);
    let { response, text } = await tlsFetchSession
      .fetch(this.endpoint, {
        method: "POST",
        headers: bearer,
        body: body?.body ?? jsonStringify(payload),
        signal: AbortSignal.timeout(this.timeout),
        ...rest,
        ...fetchOptions,
        redirect: "manual",
      })
      .then(async (response) => ({
        response,
        text: await response.text(),
      }))
      .catch((error) => {
        throw error instanceof DOMException && error.name === "TimeoutError"
          ? new DirectPostError(`timeout of ${this.timeout}ms exceeded`, {
              code: "ETIMEDOUT",
            })
          : new DirectPostError(errorMessage(error), {
              ...(error instanceof Error &&
                "code" in error &&
                typeof error.code === "string" && {
                  code: error.code,
                }),
            });
      });
    if (!response.ok) {
      reportSessionsBearerAnswer(response.status, bearer, this.endpoint);
      throw new DirectPostError(`Request failed with status code ${response.status}`, {
        status: response.status,
        requestId: response.headers.get("request-id"),
        code:
          response.status >= 500
            ? "ERR_BAD_RESPONSE"
            : response.status >= 400
              ? "ERR_BAD_REQUEST"
              : undefined,
      });
    }
    try {
      return jsonParse(text);
    } catch {
      return text;
    }
  }
  logSuccess(count, hasAuth, response) {}
  hrTimeToDate(hrTime) {
    let [seconds, nanoseconds] = hrTime;
    return new Date(seconds * 1000 + nanoseconds / 1e6);
  }
  transformLogsToEvents(logs) {
    let events = [];
    let hipaa = isHipaaMode();
    let asString = (value) => (typeof value === "string" ? value : undefined);
    let asBoolean = (value) => (typeof value === "boolean" ? value : undefined);
    let asCount = (value) =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
    let pushEvent = (event, principalStamp) => {
      events.push({
        event_type: "ClaudeCodeInternalEvent",
        event_data: ClaudeCodeInternalEvent.toJSON(hipaa ? sanitizeEventMetadata(event) : event),
        ...(principalStamp !== null && {
          principal_stamp: principalStamp,
        }),
      });
    };
    let pickNumericMetrics_2 = (obj) => {
      events.push({
        event_type: "GrowthbookExperimentEvent",
        event_data: GrowthbookExperimentEvent.toJSON(hipaa ? sanitizeExperimentEventFields(obj) : obj),
      });
    };
    for (let log of logs) {
      let attributes = log.attributes || {};
      if (attributes.event_type === "GrowthbookExperimentEvent") {
        let timestamp = this.hrTimeToDate(log.hrTime);
        let { account_uuid, organization_uuid: organizationUuid } = attributes;
        pickNumericMetrics_2({
          event_id: attributes.event_id,
          timestamp,
          experiment_id: attributes.experiment_id,
          variation_id: attributes.variation_id,
          environment: attributes.environment,
          user_attributes: attributes.user_attributes,
          experiment_metadata: attributes.experiment_metadata,
          device_id: attributes.device_id,
          session_id: attributes.session_id,
          auth:
            account_uuid || organizationUuid
              ? {
                  account_uuid,
                  organization_uuid: organizationUuid,
                }
              : undefined,
        });
        continue;
      }
      let eventName = attributes.event_name || log.body || "unknown";
      let { core_metadata: coreMetadata, user_metadata: userMetadata } = attributes;
      let principalStamp = typeof attributes.principal_stamp === "string" ? attributes.principal_stamp : null;
      if (needsPrincipalStamp(eventName) || isEventOfAnotherPrincipal(eventName, principalStamp)) continue;
      let eventMetadata = attributes.event_metadata || {};
      if (!coreMetadata) {
        pushEvent(
          {
            event_id: attributes.event_id,
            event_name: eventName,
            client_timestamp: this.hrTimeToDate(log.hrTime),
            session_id: getSessionId(),
            additional_metadata: Buffer.from(
              jsonStringify({
                transform_error: "core_metadata attribute is missing",
              }),
            ).toString("base64"),
          },
          principalStamp,
        );
        continue;
      }
      let formatted = to1PEventFormat(coreMetadata, userMetadata, eventMetadata);
      let {
        _PROTO_skill_name,
        _PROTO_plugin_name,
        _PROTO_marketplace_name,
        _PROTO_mcp_server_name,
        _PROTO_mcp_tool_name,
        _PROTO_code,
        _PROTO_head_sha,
        _PROTO_is_clean_tree_at_start,
        _PROTO_changed_file_count_at_start,
        _PROTO_untracked_file_count_at_start,
        _PROTO_git_remote_url,
        ...rest
      } = formatted.additional;
      let additionalMetadata = stripProtoFields(rest);
      if (hipaa) additionalMetadata = pickNumericMetrics(additionalMetadata, eventName);
      pushEvent(
        {
          event_id: attributes.event_id,
          event_name: eventName,
          client_timestamp: this.hrTimeToDate(log.hrTime),
          device_id: attributes.user_id,
          email: userMetadata?.email,
          auth: formatted.auth,
          ...formatted.core,
          env: formatted.env,
          process: formatted.process,
          skill_name: asString(_PROTO_skill_name),
          plugin_name: asString(_PROTO_plugin_name),
          marketplace_name: asString(_PROTO_marketplace_name),
          mcp_server_name: asString(_PROTO_mcp_server_name),
          mcp_tool_name: asString(_PROTO_mcp_tool_name),
          head_sha: asString(_PROTO_head_sha),
          is_clean_tree_at_start: asBoolean(_PROTO_is_clean_tree_at_start),
          changed_file_count_at_start: asCount(_PROTO_changed_file_count_at_start),
          untracked_file_count_at_start: asCount(_PROTO_untracked_file_count_at_start),
          additional_metadata:
            Object.keys(additionalMetadata).length > 0
              ? Buffer.from(jsonStringify(additionalMetadata)).toString("base64")
              : undefined,
        },
        principalStamp,
      );
    }
    return {
      events,
    };
  }
  adoptInflightRefreshFrom(other) {
    this.refreshAttemptedFor ??= other.refreshAttemptedFor;
    let inflightRefresh = other.inflightRefresh;
    if (!inflightRefresh || this.inflightRefresh) return;
    this.inflightRefresh = inflightRefresh;
    inflightRefresh.finally(() => {
      if (this.inflightRefresh === inflightRefresh) this.inflightRefresh = null;
    });
  }
  async beginShutdown(timeoutMs = 0) {
    this.finalFlush = true;
    this.signalFinalFlush();
    if (this.inflightRefresh && timeoutMs > 0) await withDeadline(this.inflightRefresh, timeoutMs);
  }
  async shutdown() {
    this.isShutdown = true;
    this.resetBackoff();
    await this.forceFlush();
    if (this.underATenantsRules()) {
      await this.drainPromise;
      let queuedEventCount = await this.getQueuedEventCount();
      if (queuedEventCount > 0) this.dropInATenant("unsent_at_exit", queuedEventCount);
    }
  }
  async forceFlush() {
    await Promise.all(this.pendingExports);
  }
}
//@ chunk-aepeg2w5.js:892785-893118 placement
/**
 * claude-code-server 租户中没有授权时的空导出授权（只丢弃并报错一次）。
 */
function dryRunGrant() {
  return {
    mayPost: () => false,
    sendMode: "dry_run",
    onDrop: onceExport(() => {
      logError(
        Error(
          "1P event logging: an exporter in a claude-code-server tenant has no FirstPartyEventsGrant, so it sends no event. Only the tenant's bootstrap passes one, and a rebuild after a config change passes none.",
        ),
      );
    }),
    onExport: () => {},
    onSent: () => {},
    onFailed: () => {},
  };
}
//@ chunk-aepeg2w5.js:893118-893199 placement
/**
 * 一方遥测 sink 被 killswitch 关闭时抛出的错误类型。
 */
class SinkKillSwitchError extends Error {
  constructor() {
    super("firstParty sink killswitch active");
  }
}
//@ chunk-aepeg2w5.js:893199-893255 placement
function endpointHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:893255-893333 placement = getApiBaseUrlHost (0.812)
/**
 * ANTHROPIC_BASE_URL 非 api.anthropic.com 时返回其 host，作为 GrowthBook 属性。
 */
function getApiBaseUrlHost_2(url) {
  if (url === undefined) return;
  return url === null ? "api.anthropic.com" : endpointHost(url);
}
//@ chunk-aepeg2w5.js:893603-893676 placement
function isHttpsEndpoint_2(endpoint) {
  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:893676-893919 placement
/**
 * 1P 上报失败原因：kill_switch / threw / no_answer / status_429/5xx/4xx/3xx。
 */
function classifyPostFailure(error) {
  if (error instanceof SinkKillSwitchError) return "kill_switch";
  if (!(error instanceof DirectPostError)) return "threw";
  let { status } = error.facts;
  if (status === undefined) return "no_answer";
  if (status === 429) return "status_429";
  if (status >= 500) return "status_5xx";
  return status >= 400 ? "status_4xx" : "status_3xx";
}
//@ chunk-aepeg2w5.js:893919-893977 placement
var acceptedCountSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:893919", () => {
  acceptedCountSchema = DoctorLazy(() =>
    objectSchema({
      accepted_count: numberSchema().int().nonnegative(),
    }),
  );
});
//@ chunk-aepeg2w5.js:893977-894071 placement
function acceptedEventCount(response, fallback) {
  let parsed = acceptedCountSchema().safeParse(response);
  return parsed.success ? Math.min(parsed.data.accepted_count, fallback) : fallback;
}
//@ chunk-aepeg2w5.js:894071-894295 placement
/**
 * 记录租户授权回调抛错。
 */
function logGrantCallbackError(error) {
  try {
    let errorName = error instanceof Error ? error.name : typeof error;
    logForDebugging(
      `1P event logging: a function of the tenant's grant threw or rejected (${errorName}). From mayPost that is a no, from a listener it is ignored.`,
      {
        level: "error",
      },
    );
  } catch {}
}
//@ chunk-aepeg2w5.js:894295-894338 layout
var DEFAULT_ACCEPT_HEADER = "application/json, text/plain, */*";
//@ chunk-aepeg2w5.js:894338-894435 layout
class DirectPostError extends Error {
  facts;
  constructor(message, facts) {
    super(message);
    this.facts = facts;
    this.name = "DirectPostError";
  }
}
//@ chunk-aepeg2w5.js:894435-894682 fingerprint = getAxiosErrorContext (0.688)
/**
 * 从 axios 错误提取 request-id、status、code 便于日志。
 */
function getAxiosErrorContext(error) {
  if (!(error instanceof DirectPostError)) return errorMessage(error);
  let { facts } = error;
  let parts = [];
  if (facts.requestId) parts.push(`request-id=${facts.requestId}`);
  if (facts.status) parts.push(`status=${facts.status}`);
  if (facts.code) parts.push(`code=${facts.code}`);
  if (error.message) parts.push(error.message);
  return parts.join(", ");
}
//@ chunk-4m46mxx9.js:6572-6590 fingerprint = getStorageDir (1)
/**
 * telemetry 插件的目录名 "telemetry"，导出为 MOD_FOLDER；registerPlugin 里 Zfr(B) 在该目录下解析 hooks 模块文件。
 */
var MOD_FOLDER = "telemetry";
export { isHttpsEndpoint_2, MOD_FOLDER, FirstPartyEventLoggingExporter };
