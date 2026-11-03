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
import { u, E } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-aepeg2w5.js:874435-874470 fingerprint = FILE_PREFIX (1)
var EXPORTER_RUN_ID = randomUUID();
var FAILED_EVENTS_KEY_PREFIX = "1p_failed_events.";
//@ chunk-aepeg2w5.js:874470-874581 layout
function getFlatMigrationKey(e, n) {
  let sliced = createHash("sha256").update(n).digest("base64url").slice(0, 22);
  return `flat-migration.${e}.${sliced}`;
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
  let n = [];
  for (let { principal_stamp: principalStamp, ...s } of events)
    if (principalStamp === undefined || isRowOfCurrentPrincipal(principalStamp)) n.push(s);
  return n;
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
    this.sendMode = EXPORT_ENVIRONMENTS.find((s) => s === sendMode);
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
  async loadEventsFromBatch(e) {
    return e.kind === "stream"
      ? this.loadEventsFromStream(e.storageV5, e.stream)
      : this.loadEventsFromFile(e.filePath);
  }
  async deleteBatch(e) {
    return e.kind === "stream" ? this.deleteStream(e.storageV5, e.stream) : this.deleteFile(e.filePath);
  }
  async appendEventsToBatch(e, n) {
    return e.kind === "stream"
      ? this.appendEventsToStream(e.storageV5, e.stream, n)
      : this.appendEventsToFile(e.filePath, n);
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
  async appendEventsToFile(e, events) {
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
      await appendFile(e, content, "utf8");
    } catch (error) {
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to ${e}: ${errorMessage(error)}`,
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
  async loadEventsFromStream(e, n) {
    let r = [];
    let textDecoder = new TextDecoder();
    let fromSeq = 0;
    for (;;) {
      let records = await e.readRecords(n, {
        fromSeq,
        order: "forward",
      });
      if (!records.ok) return [];
      for (let item of records.value.items) {
        let w = textDecoder.decode(item.data);
        let R = w.endsWith(`
`)
          ? w.slice(0, -1)
          : w;
        if (!R) continue;
        try {
          r.push(jsonParse(R));
        } catch {}
      }
      if (records.value.nextSeq === undefined) return r;
      fromSeq = records.value.nextSeq;
    }
  }
  async deleteStream(e, n) {
    return (await e.delete(n)).ok;
  }
  async appendEventsToStream(e, n, r) {
    if (r.length === 0) return;
    let s = await e.append(
      n,
      r.map((h) => ({
        data:
          jsonStringify(h) +
          `
`,
      })),
    );
    if (!s.ok)
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to v5 stream: ${s.error.code}`,
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
          .filter((r) => r.startsWith(prefix) && r.endsWith(".json"))
          .filter((r) => !r.includes(EXPORTER_RUN_ID));
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
    let r = filterEventsForPrivacy(events);
    let s = await this.sendEventsInBatches(r, {
      startupRetry: true,
    });
    if (s.length === 0) await this.deleteFile(filePath);
    else await this.saveEventsToFile(filePath, s);
  }
  async retryPreviousBatchesV5(e) {
    let sessionId = getSessionId();
    let r = {
      namespace: "log",
      sessionId,
      channel: "telemetry",
    };
    let s = [];
    switch (
      (
        await readAllPages(
          (y) =>
            e.listEntries(
              r,
              y === undefined
                ? undefined
                : {
                    cursor: y,
                  },
            ),
          (y) => {
            for (let S of y) {
              if (S.kind !== "key" || S.key.namespace !== "log") continue;
              let key = S.key;
              if (key.agentId !== undefined || key.runId === undefined || key.runId === EXPORTER_RUN_ID)
                continue;
              s.push(key);
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
          `1P event logging: previous-batch stream listing truncated at ${DEFAULT_MAX_PAGES} pages; retrying the ${s.length} streams seen`,
          {
            level: "warn",
          },
        );
        break;
    }
    for (let y of s)
      this.retryStreamInBackground(e, y).catch((error) => {
        logError(error);
      });
    await this.migrateLegacyFlatBatches(
      e,
      sessionId,
      new Set(s.flatMap((y) => (y.namespace === "log" && y.runId !== undefined ? [y.runId] : []))),
    );
  }
  async migrateLegacyFlatBatches(e, n, r) {
    if (this.underATenantsRules()) return;
    let s = `${FAILED_EVENTS_KEY_PREFIX}${n}.`;
    let h;
    try {
      h = (await readdir(getTelemetryStorageDir())).filter((y) => y.startsWith(s) && y.endsWith(".json"));
    } catch (error) {
      if (isFsInaccessible(error)) return;
      throw error;
    }
    for (let y of h) {
      let sliced = y.slice(s.length, -5);
      if (sliced.length === 0 || sliced === EXPORTER_RUN_ID) continue;
      if (r.has(sliced)) continue;
      let joined = pathModule.join(getTelemetryStorageDir(), y);
      let R = STORAGE_SPACES.log(n, "telemetry", {
        runId: sliced,
      });
      let eventsFromFile = await this.loadEventsFromFile(joined);
      if (eventsFromFile.length === 0) continue;
      let P = await e.append(
        R,
        eventsFromFile.map((F, L) => {
          let G =
            jsonStringify(F) +
            `
`;
          return {
            data: G,
            recordId: getFlatMigrationKey(L, G),
          };
        }),
      );
      if (!P.ok) {
        logForDebugging(
          `1P event logging: failed to migrate flat failed-event batch to v5 stream: ${P.error.code}`,
          {
            level: "error",
          },
        );
        continue;
      }
      await this.deleteFile(joined);
      this.retryStreamInBackground(e, R).catch((error) => {
        logError(error);
      });
    }
  }
  async retryStreamInBackground(e, n) {
    if (this.attempts >= this.maxAttempts) {
      await this.deleteStream(e, n);
      return;
    }
    let eventsFromStream = await this.loadEventsFromStream(e, n);
    if (eventsFromStream.length === 0) {
      await this.deleteStream(e, n);
      return;
    }
    let s = filterEventsForPrivacy(eventsFromStream);
    let h = await this.sendEventsInBatches(s, {
      startupRetry: true,
    });
    if (h.length === 0) await this.deleteStream(e, n);
    else if (await this.deleteStream(e, n)) await this.appendEventsToStream(e, n, h);
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
      this.tellATenantsGrant((y) => y.onExport(logs.length));
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
  async sendEventsInBatches(events, n = {}) {
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
          n,
        );
      } catch (error) {
        lastErrorContext = getAxiosErrorContext(error);
        this.tellATenantsGrant((R) => R.onFailed(classifyPostFailure(error), batch.length));
        for (let j = i; j < batches.length; j++) failedBatchEvents.push(...batches[j]);
        break;
      }
      if (i < batches.length - 1 && this.batchDelayMs > 0) await sleep(this.batchDelayMs);
    }
    if (failedBatchEvents.length > 0 && lastErrorContext) this.lastExportErrorContext = lastErrorContext;
    return failedBatchEvents;
  }
  withQueueFileLock(e) {
    let n = this.queueFileLock.then(e);
    this.queueFileLock = n.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return n;
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
      let n = await this.withQueueFileLock(async () => {
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
      if (n.kind === "empty") break;
      if (n.kind === "unclaimable") {
        this.scheduleBackoffRetry();
        return;
      }
      if (n.kind === "dropped") {
        if (!n.deleted) {
          this.scheduleBackoffRetry();
          return;
        }
        this.dropInATenant("given_up", n.count);
        this.resetBackoff();
        return;
      }
      let r = filterEventsForPrivacy(n.events);
      let failedEvents = await this.sendEventsInBatches(r);
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
    let n = Promise.resolve()
      .then(() => checkAndRefreshOAuthTokenIfNeeded())
      .then(
        () => {},
        (error) => {
          logForDebugging(`1P event logging: OAuth refresh before send failed: ${toError(error).name}`);
        },
      )
      .finally(() => {
        if (this.inflightRefresh === n) this.inflightRefresh = null;
      });
    this.inflightRefresh = n;
    await withDeadline(n, this.oauthRefreshTimeoutMs);
  }
  shouldSkipAuthForSend(e) {
    if (this.skipAuth || !e) return true;
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
  whyATenantMayNotPost(e, n) {
    if (!this.underATenantsRules()) return;
    if (e) return "previous_run";
    try {
      let s = this.tenantGrant.mayPost();
      if (s !== true) {
        Promise.resolve(s).catch(logGrantCallbackError);
        return "refused";
      }
    } catch (error) {
      logGrantCallbackError(error);
      return "refused";
    }
    if (!this.hostVouchesForEnvBearer()) return "not_vouched";
    if (!(
      n === undefined ||
      (!n.error && n.headers.Authorization === `Bearer ${env.CLAUDE_CODE_OAUTH_TOKEN}`)
    ))
      return "no_credential";
    return n !== undefined && this.sendMode === "dry_run" ? "dry_run" : undefined;
  }
  dropInATenant(e, n) {
    this.tellATenantsGrant((r) => r.onDrop(e, n));
  }
  tellATenantsGrant(e) {
    try {
      if (this.underATenantsRules()) Promise.resolve(e(this.tenantGrant)).catch(logGrantCallbackError);
    } catch (error) {
      logGrantCallbackError(error);
    }
  }
  async authHeadersForSend() {
    if (!(getAnthropicApiKeySafe() === null && shouldUseWIFAuth())) return getAuthHeadersAsync();
    let { getResolvedWIFBaseUrlSnapshot } = await import("./chunk-7k61ne1e.js");
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
  async sendBatchWithRetry(e, n = {}) {
    let r = this.whyATenantMayNotPost(n.startupRetry);
    if (r) {
      this.dropInATenant(r, e.events.length);
      return;
    }
    if (this.isKilled()) throw new SinkKillSwitchError();
    let s = {
      "Content-Type": "application/json",
      "User-Agent": claudeCodeUserAgent(),
      "x-service-name": "claude-code",
    };
    let h =
      (this.underATenantsRules() && getIsNonInteractiveSession()) ||
      checkHasTrustDialogAccepted() ||
      getIsNonInteractiveSession();
    if (h && !this.skipAuth && !this.finalFlush && !this.isShutdown && !n.startupRetry && getIsInteractive())
      await this.refreshExpiredOAuthTokenOnce();
    let y = this.shouldSkipAuthForSend(h);
    if (
      !y &&
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
    let S = y
      ? {
          headers: {},
          error:
            "auth skipped: skipAuth config, trust not established, endpoint not first-party https, no-profile lane closed, or OAuth token expired",
        }
      : await this.authHeadersForSend();
    let w = !y && S.reasonCode === "no_api_key" ? (getAuthHeaders_2(this.endpoint) ?? S) : S;
    let R = guardTelemetryCredentials(w, this.endpoint);
    let x = !R.error;
    let P = {
      events: dropForeignPrincipalEvents(e.events),
    };
    if (P.events.length === 0) return;
    let F = gzipTelemetryBody({
      url: this.endpoint,
      payload: P,
      storageV5: this.storageV5,
    });
    let L = this.whyATenantMayNotPost(n.startupRetry, R);
    if (L) {
      this.dropInATenant(L, P.events.length);
      return;
    }
    let G = {
      ...s,
      ...(x && R.headers),
      ...(this.underATenantsRules() &&
        this.sendMode !== "production" && {
          "x-test-mode": "true",
        }),
    };
    try {
      let j = await this.post(G, F, P);
      this.logSuccess(P.events.length, x, j);
      let ee = acceptedEventCount(j, P.events.length);
      this.tellATenantsGrant((q) => q.onSent(ee));
      if (ee < P.events.length) this.dropInATenant("rejected_by_ingest", P.events.length - ee);
      return;
    } catch (error) {
      if (
        x &&
        !this.underATenantsRules() &&
        !e.events.some((event) => event.principal_stamp !== undefined) &&
        error instanceof DirectPostError &&
        error.facts.status === 401
      ) {
        let ee = await this.post(s, F, P);
        this.logSuccess(P.events.length, false, ee);
        return;
      }
      throw error;
    }
  }
  async post(e, n, r) {
    let tlsFetchSession = getTLSFetchSession("analytics", withoutSensitiveHeaders(this.endpoint, e));
    if (!tlsFetchSession) throw Error("this runtime has no Bun.FetchSession");
    let h = withVettedSessionsBearer(
      {
        Accept: DEFAULT_ACCEPT_HEADER,
        ...e,
        ...n?.headers,
      },
      this.endpoint,
    );
    let { proxy, tls, ...w } = getProxyFetchOptions({
      url: this.endpoint,
    });
    let R =
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
        headers: h,
        body: n?.body ?? jsonStringify(r),
        signal: AbortSignal.timeout(this.timeout),
        ...w,
        ...R,
        redirect: "manual",
      })
      .then(async (F) => ({
        response: F,
        text: await F.text(),
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
      reportSessionsBearerAnswer(response.status, h, this.endpoint);
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
  logSuccess(e, n, r) {}
  hrTimeToDate(hrTime) {
    let [seconds, nanoseconds] = hrTime;
    return new Date(seconds * 1000 + nanoseconds / 1e6);
  }
  transformLogsToEvents(e) {
    let n = [];
    let r = isHipaaMode();
    let s = (R) => (typeof R === "string" ? R : undefined);
    let h = (R) => (typeof R === "boolean" ? R : undefined);
    let y = (R) => (typeof R === "number" && Number.isInteger(R) && R >= 0 ? R : undefined);
    let S = (R, principalStamp) => {
      n.push({
        event_type: "ClaudeCodeInternalEvent",
        event_data: ClaudeCodeInternalEvent.toJSON(r ? sanitizeEventMetadata(R) : R),
        ...(principalStamp !== null && {
          principal_stamp: principalStamp,
        }),
      });
    };
    let w = (R) => {
      n.push({
        event_type: "GrowthbookExperimentEvent",
        event_data: GrowthbookExperimentEvent.toJSON(r ? sanitizeExperimentEventFields(R) : R),
      });
    };
    for (let log of e) {
      let attributes = log.attributes || {};
      if (attributes.event_type === "GrowthbookExperimentEvent") {
        let timestamp = this.hrTimeToDate(log.hrTime);
        let { account_uuid, organization_uuid: organizationUuid } = attributes;
        w({
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
      let P = attributes.event_name || log.body || "unknown";
      let { core_metadata: coreMetadata, user_metadata: userMetadata } = attributes;
      let principalStamp = typeof attributes.principal_stamp === "string" ? attributes.principal_stamp : null;
      if (needsPrincipalStamp(P) || isEventOfAnotherPrincipal(P, principalStamp)) continue;
      let eventMetadata = attributes.event_metadata || {};
      if (!coreMetadata) {
        S(
          {
            event_id: attributes.event_id,
            event_name: P,
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
      if (r) additionalMetadata = pickNumericMetrics(additionalMetadata, P);
      S(
        {
          event_id: attributes.event_id,
          event_name: P,
          client_timestamp: this.hrTimeToDate(log.hrTime),
          device_id: attributes.user_id,
          email: userMetadata?.email,
          auth: formatted.auth,
          ...formatted.core,
          env: formatted.env,
          process: formatted.process,
          skill_name: s(_PROTO_skill_name),
          plugin_name: s(_PROTO_plugin_name),
          marketplace_name: s(_PROTO_marketplace_name),
          mcp_server_name: s(_PROTO_mcp_server_name),
          mcp_tool_name: s(_PROTO_mcp_tool_name),
          head_sha: s(_PROTO_head_sha),
          is_clean_tree_at_start: h(_PROTO_is_clean_tree_at_start),
          changed_file_count_at_start: y(_PROTO_changed_file_count_at_start),
          untracked_file_count_at_start: y(_PROTO_untracked_file_count_at_start),
          additional_metadata:
            Object.keys(additionalMetadata).length > 0
              ? Buffer.from(jsonStringify(additionalMetadata)).toString("base64")
              : undefined,
        },
        principalStamp,
      );
    }
    return {
      events: n,
    };
  }
  adoptInflightRefreshFrom(e) {
    this.refreshAttemptedFor ??= e.refreshAttemptedFor;
    let inflightRefresh = e.inflightRefresh;
    if (!inflightRefresh || this.inflightRefresh) return;
    this.inflightRefresh = inflightRefresh;
    inflightRefresh.finally(() => {
      if (this.inflightRefresh === inflightRefresh) this.inflightRefresh = null;
    });
  }
  async beginShutdown(e = 0) {
    this.finalFlush = true;
    this.signalFinalFlush();
    if (this.inflightRefresh && e > 0) await withDeadline(this.inflightRefresh, e);
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
function endpointHost(e) {
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:893255-893333 placement = getApiBaseUrlHost (0.812)
/**
 * ANTHROPIC_BASE_URL 非 api.anthropic.com 时返回其 host，作为 GrowthBook 属性。
 */
function getApiBaseUrlHost_2(resolvedWIFBaseUrlSnapshot) {
  if (resolvedWIFBaseUrlSnapshot === undefined) return;
  return resolvedWIFBaseUrlSnapshot === null ? "api.anthropic.com" : endpointHost(resolvedWIFBaseUrlSnapshot);
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
var acceptedCountSchema = DoctorLazy(() =>
  u({
    accepted_count: E().int().nonnegative(),
  }),
);
//@ chunk-aepeg2w5.js:893977-894071 placement
function acceptedEventCount(e, n) {
  let r = acceptedCountSchema().safeParse(e);
  return r.success ? Math.min(r.data.accepted_count, n) : n;
}
//@ chunk-aepeg2w5.js:894071-894295 placement
/**
 * 记录租户授权回调抛错。
 */
function logGrantCallbackError(error) {
  try {
    let n = error instanceof Error ? error.name : typeof error;
    logForDebugging(
      `1P event logging: a function of the tenant's grant threw or rejected (${n}). From mayPost that is a no, from a listener it is ignored.`,
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
var getStorageDir = "telemetry";
export { isHttpsEndpoint_2, getStorageDir, FirstPartyEventLoggingExporter };
