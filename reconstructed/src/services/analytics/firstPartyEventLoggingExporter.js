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
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
} from "crypto";
import * as pathModule from "path";
import {
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  appendFile,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { ux, isHipaaMode, sx, ax } from "./privacyLevel.js";
import { bR, Mo } from "./anthropicTelemetryExport.js";
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
  _r,
  gzipTelemetryBody,
  gg,
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
var EXPORTER_RUN_ID = randomUUID_8(),
  Qg = "1p_failed_events.";
//@ chunk-aepeg2w5.js:874470-874581 layout
function getFlatMigrationKey(e, n) {
  let sliced = createHash_3("sha256").update(n).digest("base64url").slice(0, 22);
  return `flat-migration.${e}.${sliced}`;
}
/**
 * 1P 失败事件落盘目录 <配置目录>/telemetry。
 */
//@ chunk-aepeg2w5.js:874581-874628 layout = getStorageDir (1)
function getTelemetryStorageDir() {
  return pathModule.join(getClaudeConfigDir(), "telemetry");
}
//@ chunk-aepeg2w5.js:874628-874658 layout
var OAUTH_REFRESH_TIMEOUT_MS = 2000,
  v2 = 3000,
  E2 = 300000;
/**
 * 去掉 principal_stamp 不属于当前身份的事件。
 */
//@ chunk-aepeg2w5.js:874658-874758 layout
function dropForeignPrincipalEvents(e) {
  let n = [];
  for (let { principal_stamp: principal_stamp, ...s } of e)
    if (principal_stamp === void 0 || ux(principal_stamp)) n.push(s);
  return n;
}
/**
 * 1P 事件导出器：POST <baseUrl 默认 https://api.anthropic.com>/api/event_logging/v2/batch（批 200、指数退避最多 8 次、OAuth/API key 认证可跳过）；失败批写入 <配置目录>/telemetry/1p_failed_events.<runId>… 下次重发；killswitch 时不发。
 */
//@ chunk-aepeg2w5.js:874758-892785 fingerprint = FirstPartyEventLoggingExporter (0.535)
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
  isShutdown = !1;
  schedule;
  cancelBackoff = null;
  attempts = 0;
  drainPromise = null;
  queueFileLock = Promise.resolve();
  lastExportErrorContext;
  refreshAttemptedFor;
  inflightRefresh = null;
  wifMintRetryAt = 0;
  finalFlush = !1;
  signalFinalFlush = () => {};
  finalFlushSignal = new Promise((e) => {
    this.signalFinalFlush = e;
  });
  constructor(e = {}) {
    let n =
      e.baseUrl ||
      (process.env.ANTHROPIC_BASE_URL === "https://api-staging.anthropic.com"
        ? "https://api-staging.anthropic.com"
        : "https://api.anthropic.com");
    ((this.endpoint = `${n}${e.path || "/api/event_logging/v2/batch"}`),
      (this.timeout = e.timeout || 1e4),
      (this.maxBatchSize = e.maxBatchSize || 200),
      (this.skipAuth = e.skipAuth ?? !1),
      (this.attachAuthWithoutProfileScope = e.attachAuthWithoutProfileScope ?? (() => !1)),
      (this.batchDelayMs = e.batchDelayMs || 100),
      (this.baseBackoffDelayMs = e.baseBackoffDelayMs || 500),
      (this.maxBackoffDelayMs = e.maxBackoffDelayMs || 30000),
      (this.maxAttempts = e.maxAttempts ?? 8),
      (this.oauthRefreshTimeoutMs = e.oauthRefreshTimeoutMs ?? OAUTH_REFRESH_TIMEOUT_MS),
      (this.keyHelperJoinTimeoutMs = e.keyHelperJoinTimeoutMs ?? v2),
      (this.isKilled = e.isKilled ?? (() => !1)),
      (this.storageV5 = e.storageV5),
      (this.tenantGrant = e.tenantGrant ?? dryRunGrant()),
      (this.wasPassedAGrant = e.tenantGrant !== void 0));
    let r = e.tenantGrant?.sendMode;
    ((this.sendMode = bR.find((s) => s === r)),
      (this.schedule =
        e.schedule ??
        ((s, h) => {
          let y = setTimeout(s, h);
          return () => clearTimeout(y);
        })),
      this.retryPreviousBatches());
  }
  async getQueuedEventCount() {
    return (await this.loadEventsFromCurrentBatch()).length;
  }
  getCurrentBatchFilePath() {
    return pathModule.join(getTelemetryStorageDir(), `${Qg}${getSessionId()}.${EXPORTER_RUN_ID}.json`);
  }
  currentBatchStream() {
    return STORAGE_SPACES.log(getSessionId(), "telemetry", { runId: EXPORTER_RUN_ID });
  }
  async loadEventsFromFile(e) {
    if (this.underATenantsRules()) return [];
    try {
      return await readJSONLFile_2(e);
    } catch {
      return [];
    }
  }
  currentBatch() {
    return isStorageV5Enabled() && this.storageV5 !== void 0
      ? { kind: "stream", storageV5: this.storageV5, stream: this.currentBatchStream() }
      : { kind: "file", filePath: this.getCurrentBatchFilePath() };
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
  async saveEventsToFile(e, n) {
    if (this.underATenantsRules()) return;
    try {
      if (n.length === 0)
        try {
          await unlink_3(e);
        } catch {}
      else {
        await mkdir_3(getTelemetryStorageDir(), { recursive: !0 });
        let r =
          n.map((s) => jsonStringify(s)).join(`
`) +
          `
`;
        await writeFile_3(e, r, "utf8");
      }
    } catch (error) {
      logForDebugging(
        `1P event logging: failed to persist failed-events batch to ${e}: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
  }
  async appendEventsToFile(e, n) {
    if (n.length === 0) return;
    if (this.underATenantsRules()) {
      this.dropInATenant("no_store", n.length);
      return;
    }
    try {
      await mkdir_3(getTelemetryStorageDir(), { recursive: !0 });
      let r =
        n.map((s) => jsonStringify(s)).join(`
`) +
        `
`;
      await appendFile(e, r, "utf8");
    } catch (error) {
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to ${e}: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
  }
  async deleteFile(e) {
    if (this.underATenantsRules()) return !0;
    try {
      return (await unlink_3(e), !0);
    } catch (error) {
      return isENOENT(error);
    }
  }
  async loadEventsFromStream(e, n) {
    let r = [],
      textDecoder = new TextDecoder(),
      h = 0;
    for (;;) {
      let records = await e.readRecords(n, { fromSeq: h, order: "forward" });
      if (!records.ok) return [];
      for (let item of records.value.items) {
        let decode = textDecoder.decode(item.data),
          R = decode.endsWith(`
`)
            ? decode.slice(0, -1)
            : decode;
        if (!R) continue;
        try {
          r.push(jsonParse(R));
        } catch {}
      }
      if (records.value.nextSeq === void 0) return r;
      h = records.value.nextSeq;
    }
  }
  async deleteStream(e, n) {
    return (await e.delete(n)).ok;
  }
  async appendEventsToStream(e, n, r) {
    if (r.length === 0) return;
    let append = await e.append(
      n,
      r.map((h) => ({
        data:
          jsonStringify(h) +
          `
`,
      })),
    );
    if (!append.ok)
      logForDebugging(
        `1P event logging: failed to persist failed-event queue to v5 stream: ${append.error.code}`,
        { level: "error" },
      );
  }
  async retryPreviousBatches() {
    if (this.underATenantsRules()) return;
    if (isStorageV5Enabled() && this.storageV5 !== void 0)
      try {
        return await this.retryPreviousBatchesV5(this.storageV5);
      } catch (error) {
        logError(error);
        return;
      }
    try {
      let e = `${Qg}${getSessionId()}.`,
        n;
      try {
        n = (await readdir(getTelemetryStorageDir()))
          .filter((r) => r.startsWith(e) && r.endsWith(".json"))
          .filter((r) => !r.includes(EXPORTER_RUN_ID));
      } catch (error) {
        if (isFsInaccessible(error)) return;
        throw error;
      }
      for (let r of n) {
        let joined = pathModule.join(getTelemetryStorageDir(), r);
        this.retryFileInBackground(joined).catch((h) => {
          logError(h);
        });
      }
    } catch (error) {
      logError(error);
    }
  }
  async retryFileInBackground(e) {
    if (this.attempts >= this.maxAttempts) {
      await this.deleteFile(e);
      return;
    }
    let eventsFromFile = await this.loadEventsFromFile(e);
    if (eventsFromFile.length === 0) {
      await this.deleteFile(e);
      return;
    }
    let r = filterEventsForPrivacy(eventsFromFile),
      sendEventsInBatches = await this.sendEventsInBatches(r, { startupRetry: !0 });
    if (sendEventsInBatches.length === 0) await this.deleteFile(e);
    else await this.saveEventsToFile(e, sendEventsInBatches);
  }
  async retryPreviousBatchesV5(e) {
    let n = getSessionId(),
      r = { namespace: "log", sessionId: n, channel: "telemetry" },
      s = [];
    switch (
      (
        await readAllPages(
          (y) => e.listEntries(r, y === void 0 ? void 0 : { cursor: y }),
          (y) => {
            for (let S of y) {
              if (S.kind !== "key" || S.key.namespace !== "log") continue;
              let key = S.key;
              if (key.agentId !== void 0 || key.runId === void 0 || key.runId === EXPORTER_RUN_ID) continue;
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
          { level: "warn" },
        );
        break;
    }
    for (let y of s)
      this.retryStreamInBackground(e, y).catch((S) => {
        logError(S);
      });
    await this.migrateLegacyFlatBatches(
      e,
      n,
      new Set(s.flatMap((y) => (y.namespace === "log" && y.runId !== void 0 ? [y.runId] : []))),
    );
  }
  async migrateLegacyFlatBatches(e, n, r) {
    if (this.underATenantsRules()) return;
    let s = `${Qg}${n}.`,
      h;
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
      let joined = pathModule.join(getTelemetryStorageDir(), y),
        log = STORAGE_SPACES.log(n, "telemetry", { runId: sliced }),
        eventsFromFile = await this.loadEventsFromFile(joined);
      if (eventsFromFile.length === 0) continue;
      let append = await e.append(
        log,
        eventsFromFile.map((F, L) => {
          let G =
            jsonStringify(F) +
            `
`;
          return { data: G, recordId: getFlatMigrationKey(L, G) };
        }),
      );
      if (!append.ok) {
        logForDebugging(
          `1P event logging: failed to migrate flat failed-event batch to v5 stream: ${append.error.code}`,
          { level: "error" },
        );
        continue;
      }
      (await this.deleteFile(joined),
        this.retryStreamInBackground(e, log).catch((F) => {
          logError(F);
        }));
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
    let s = filterEventsForPrivacy(eventsFromStream),
      sendEventsInBatches = await this.sendEventsInBatches(s, { startupRetry: !0 });
    if (sendEventsInBatches.length === 0) await this.deleteStream(e, n);
    else if (await this.deleteStream(e, n)) await this.appendEventsToStream(e, n, sendEventsInBatches);
  }
  async export(e, n) {
    if (this.isShutdown) {
      n({ code: _r.ExportResultCode.FAILED, error: Error("Exporter has been shutdown") });
      return;
    }
    let r = this.doExport(e, n).catch(logError);
    (this.pendingExports.push(r),
      r.finally(() => {
        let index = this.pendingExports.indexOf(r);
        if (index > -1) this.pendingExports.splice(index, 1);
      }));
  }
  async doExport(e, n) {
    try {
      this.tellATenantsGrant((y) => y.onExport(e.length));
      let filtered = e.filter((y) => y.instrumentationScope?.name === "com.anthropic.claude_code.events");
      if (filtered.length === 0) {
        n({ code: _r.ExportResultCode.SUCCESS });
        return;
      }
      let events = this.transformLogsToEvents(filtered).events;
      if (events.length === 0) {
        n({ code: _r.ExportResultCode.SUCCESS });
        return;
      }
      if (this.attempts >= this.maxAttempts) {
        (this.dropInATenant("given_up", events.length),
          n({
            code: _r.ExportResultCode.FAILED,
            error: Error(`Dropped ${events.length} events: max attempts (${this.maxAttempts}) reached`),
          }));
        return;
      }
      let sendEventsInBatches = await this.sendEventsInBatches(events);
      if ((this.attempts++, sendEventsInBatches.length > 0)) {
        (await this.queueFailedEvents(sendEventsInBatches), this.scheduleBackoffRetry());
        let y = this.lastExportErrorContext ? ` (${this.lastExportErrorContext})` : "";
        n({
          code: _r.ExportResultCode.FAILED,
          error: Error(`Failed to export ${sendEventsInBatches.length} events${y}`),
        });
        return;
      }
      (this.resetBackoff(), this.retryFailedEvents(), n({ code: _r.ExportResultCode.SUCCESS }));
    } catch (error) {
      (this.dropInATenant("export_threw", e.length),
        logError(error),
        n({ code: _r.ExportResultCode.FAILED, error: toError(error) }));
    }
  }
  async sendEventsInBatches(e, n = {}) {
    let r = [];
    for (let y = 0; y < e.length; y += this.maxBatchSize) r.push(e.slice(y, y + this.maxBatchSize));
    let s = [],
      h;
    for (let y = 0; y < r.length; y++) {
      let S = r[y];
      try {
        await this.sendBatchWithRetry({ events: S }, n);
      } catch (error) {
        ((h = getAxiosErrorContext(error)),
          this.tellATenantsGrant((R) => R.onFailed(classifyPostFailure(error), S.length)));
        for (let R = y; R < r.length; R++) s.push(...r[R]);
        break;
      }
      if (y < r.length - 1 && this.batchDelayMs > 0) await sleep(this.batchDelayMs);
    }
    if (s.length > 0 && h) this.lastExportErrorContext = h;
    return s;
  }
  withQueueFileLock(e) {
    let n = this.queueFileLock.then(e);
    return (
      (this.queueFileLock = n.then(
        () => {
          return;
        },
        () => {
          return;
        },
      )),
      n
    );
  }
  async queueFailedEvents(e) {
    let currentBatch = this.currentBatch();
    await this.withQueueFileLock(() => this.appendEventsToBatch(currentBatch, e));
    let r = this.lastExportErrorContext ? ` (${this.lastExportErrorContext})` : "";
    logForDebugging(`1P event logging: ${e.length} events failed to export${r}`, { level: "error" });
  }
  scheduleBackoffRetry() {
    if (this.cancelBackoff || this.isShutdown) return;
    let min = Math.min(
      Math.max(this.baseBackoffDelayMs, this.baseBackoffDelayMs * this.attempts * this.attempts),
      this.maxBackoffDelayMs,
    );
    this.cancelBackoff = this.schedule(async () => {
      ((this.cancelBackoff = null), await this.retryFailedEvents());
    }, min);
  }
  retryFailedEvents() {
    if (this.drainPromise) return this.drainPromise;
    return (
      (this.drainPromise = this.doRetryFailedEvents()
        .catch((e) => {
          logError(e);
        })
        .finally(() => {
          this.drainPromise = null;
        })),
      this.drainPromise
    );
  }
  async doRetryFailedEvents() {
    let currentBatch = this.currentBatch();
    while (!this.isShutdown) {
      let withQueueFileLock = await this.withQueueFileLock(async () => {
        let eventsFromBatch = await this.loadEventsFromBatch(currentBatch);
        if (eventsFromBatch.length === 0) return { kind: "empty" };
        if (this.attempts >= this.maxAttempts) {
          let deleteBatch = await this.deleteBatch(currentBatch);
          return { kind: "dropped", count: eventsFromBatch.length, deleted: deleteBatch };
        }
        if (!(await this.deleteBatch(currentBatch))) return { kind: "unclaimable" };
        return { kind: "claimed", events: eventsFromBatch };
      });
      if (withQueueFileLock.kind === "empty") break;
      if (withQueueFileLock.kind === "unclaimable") {
        this.scheduleBackoffRetry();
        return;
      }
      if (withQueueFileLock.kind === "dropped") {
        if (!withQueueFileLock.deleted) {
          this.scheduleBackoffRetry();
          return;
        }
        (this.dropInATenant("given_up", withQueueFileLock.count), this.resetBackoff());
        return;
      }
      let r = filterEventsForPrivacy(withQueueFileLock.events),
        sendEventsInBatches = await this.sendEventsInBatches(r);
      if ((this.attempts++, sendEventsInBatches.length > 0)) {
        (await this.withQueueFileLock(() => this.appendEventsToBatch(currentBatch, sendEventsInBatches)),
          this.scheduleBackoffRetry());
        return;
      }
      this.resetBackoff();
    }
  }
  resetBackoff() {
    if (((this.attempts = 0), this.cancelBackoff)) (this.cancelBackoff(), (this.cancelBackoff = null));
  }
  async refreshExpiredOAuthTokenOnce() {
    if (!isClaudeAISubscriber() || !hasProfileScope()) return;
    let e = getClaudeAIOAuthTokens();
    if (!e || !isOAuthTokenExpired(e.expiresAt)) return;
    if (this.refreshAttemptedFor === e.accessToken) {
      if (this.inflightRefresh) await withDeadline(this.inflightRefresh, this.oauthRefreshTimeoutMs);
      return;
    }
    this.refreshAttemptedFor = e.accessToken;
    let n = Promise.resolve()
      .then(() => checkAndRefreshOAuthTokenIfNeeded())
      .then(
        () => {},
        (r) => {
          logForDebugging(`1P event logging: OAuth refresh before send failed: ${toError(r).name}`);
        },
      )
      .finally(() => {
        if (this.inflightRefresh === n) this.inflightRefresh = null;
      });
    ((this.inflightRefresh = n), await withDeadline(n, this.oauthRefreshTimeoutMs));
  }
  shouldSkipAuthForSend(e) {
    if (this.skipAuth || !e) return !0;
    if (!isFirstPartyAnthropicHost(this.endpoint) || !Zg(this.endpoint)) return !0;
    if (!isClaudeAISubscriber()) return !1;
    let n = getClaudeAIOAuthTokens();
    if (!hasProfileScope() && !this.shouldAttachAuthWithoutProfileScope()) return !0;
    if (n && isOAuthTokenExpired(n.expiresAt)) return !0;
    return !1;
  }
  shouldAttachAuthWithoutProfileScope() {
    if (
      !this.attachAuthWithoutProfileScope() ||
      (!isActualFirstPartyAnthropicBaseUrl() && !this.hostVouchesForEnvBearer())
    )
      return !1;
    let e = getClaudeAIOAuthTokenOrigin();
    if (e === "store") return !0;
    if (e === "env" || e === "fd") return !getStoredOauthAccountInfo();
    return !1;
  }
  underATenantsRules() {
    return this.wasPassedAGrant || Mo();
  }
  hostVouchesForEnvBearer() {
    return Mo() && this.sendMode !== void 0 && env.CLAUDE_CODE_OAUTH_TOKEN?.startsWith("sk-ant-oat") === !0;
  }
  whyATenantMayNotPost(e, n) {
    if (!this.underATenantsRules()) return;
    if (e) return "previous_run";
    try {
      let mayPost = this.tenantGrant.mayPost();
      if (mayPost !== !0) return (Promise.resolve(mayPost).catch(logGrantCallbackError), "refused");
    } catch (error) {
      return (logGrantCallbackError(error), "refused");
    }
    if (!this.hostVouchesForEnvBearer()) return "not_vouched";
    if (!(n === void 0 || (!n.error && n.headers.Authorization === `Bearer ${env.CLAUDE_CODE_OAUTH_TOKEN}`)))
      return "no_credential";
    return n !== void 0 && this.sendMode === "dry_run" ? "dry_run" : void 0;
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
    let { getResolvedWIFBaseUrlSnapshot: getResolvedWIFBaseUrlSnapshot } =
        await import("./chunk-7k61ne1e.js"),
      r = getApiBaseUrlHost_2(getResolvedWIFBaseUrlSnapshot());
    if (r === void 0 || r !== bP(this.endpoint) || !Zg(this.endpoint))
      return { headers: {}, error: "workload-identity token is minted for a different host" };
    if (Date.now() < this.wifMintRetryAt)
      return { headers: {}, error: "workload-identity mint failed recently; not retried yet" };
    let s = await getAuthHeadersAsync();
    if (s.error) {
      if (s.reasonCode === "wif_error") this.wifMintRetryAt = Date.now() + E2;
      return s;
    }
    if (getApiBaseUrlHost_2(getResolvedWIFBaseUrlSnapshot()) !== r)
      return { headers: {}, error: "workload-identity resolution changed during the send" };
    return s;
  }
  async sendBatchWithRetry(e, n = {}) {
    let whyATenantMayNotPost = this.whyATenantMayNotPost(n.startupRetry);
    if (whyATenantMayNotPost) {
      this.dropInATenant(whyATenantMayNotPost, e.events.length);
      return;
    }
    if (this.isKilled()) throw new t_();
    let s = {
        "Content-Type": "application/json",
        "User-Agent": claudeCodeUserAgent(),
        "x-service-name": "claude-code",
      },
      h =
        (this.underATenantsRules() && getIsNonInteractiveSession()) ||
        checkHasTrustDialogAccepted() ||
        getIsNonInteractiveSession();
    if (h && !this.skipAuth && !this.finalFlush && !this.isShutdown && !n.startupRetry && getIsInteractive())
      await this.refreshExpiredOAuthTokenOnce();
    let shouldSkipAuthForSend = this.shouldSkipAuthForSend(h);
    if (
      !shouldSkipAuthForSend &&
      !this.isShutdown &&
      !this.finalFlush &&
      isActualFirstPartyAnthropicBaseUrl() &&
      !isClaudeAISubscriber() &&
      isApiKeyHelperTheActiveCredential()
    ) {
      let j = getColdApiKeyHelperRun();
      if (j)
        await withDeadline(
          Promise.race([j.catch(() => null), this.finalFlushSignal]),
          this.keyHelperJoinTimeoutMs,
        );
    }
    let S = shouldSkipAuthForSend
        ? {
            headers: {},
            error:
              "auth skipped: skipAuth config, trust not established, endpoint not first-party https, no-profile lane closed, or OAuth token expired",
          }
        : await this.authHeadersForSend(),
      w =
        !shouldSkipAuthForSend && S.reasonCode === "no_api_key" ? (getAuthHeaders_2(this.endpoint) ?? S) : S,
      R = guardTelemetryCredentials(w, this.endpoint),
      x = !R.error,
      P = { events: dropForeignPrincipalEvents(e.events) };
    if (P.events.length === 0) return;
    let F = gzipTelemetryBody({ url: this.endpoint, payload: P, storageV5: this.storageV5 }),
      whyATenantMayNotPost_2 = this.whyATenantMayNotPost(n.startupRetry, R);
    if (whyATenantMayNotPost_2) {
      this.dropInATenant(whyATenantMayNotPost_2, P.events.length);
      return;
    }
    let G = {
      ...s,
      ...(x && R.headers),
      ...(this.underATenantsRules() && this.sendMode !== "production" && { "x-test-mode": "true" }),
    };
    try {
      let post = await this.post(G, F, P);
      this.logSuccess(P.events.length, x, post);
      let ee = R2(post, P.events.length);
      if ((this.tellATenantsGrant((q) => q.onSent(ee)), ee < P.events.length))
        this.dropInATenant("rejected_by_ingest", P.events.length - ee);
      return;
    } catch (error) {
      if (
        x &&
        !this.underATenantsRules() &&
        !e.events.some((event) => event.principal_stamp !== void 0) &&
        error instanceof DirectPostError &&
        error.facts.status === 401
      ) {
        let post = await this.post(s, F, P);
        this.logSuccess(P.events.length, !1, post);
        return;
      }
      throw error;
    }
  }
  async post(e, n, r) {
    let s = getTLSFetchSession("analytics", withoutSensitiveHeaders(this.endpoint, e));
    if (!s) throw Error("this runtime has no Bun.FetchSession");
    let h = withVettedSessionsBearer({ Accept: DEFAULT_ACCEPT_HEADER, ...e, ...n?.headers }, this.endpoint),
      { proxy: proxy, tls: tls, ...w } = getProxyFetchOptions({ url: this.endpoint }),
      R =
        proxy !== void 0
          ? { proxy: { ...(typeof proxy === "string" ? { url: proxy } : proxy), respectNoProxy: !1 } }
          : getProxyUrlWithSource()
            ? { proxy: !1 }
            : {};
    guardBunFetchSession(s, "POST", this.endpoint);
    let { response: response, text: text } = await s
      .fetch(this.endpoint, {
        method: "POST",
        headers: h,
        body: n?.body ?? jsonStringify(r),
        signal: AbortSignal.timeout(this.timeout),
        ...w,
        ...R,
        redirect: "manual",
      })
      .then(async (F) => ({ response: F, text: await F.text() }))
      .catch((F) => {
        throw F instanceof DOMException && F.name === "TimeoutError"
          ? new DirectPostError(`timeout of ${this.timeout}ms exceeded`, { code: "ETIMEDOUT" })
          : new DirectPostError(errorMessage(F), {
              ...(F instanceof Error && "code" in F && typeof F.code === "string" && { code: F.code }),
            });
      });
    if (!response.ok)
      throw (
        reportSessionsBearerAnswer(response.status, h, this.endpoint),
        new DirectPostError(`Request failed with status code ${response.status}`, {
          status: response.status,
          requestId: response.headers.get("request-id"),
          code:
            response.status >= 500 ? "ERR_BAD_RESPONSE" : response.status >= 400 ? "ERR_BAD_REQUEST" : void 0,
        })
      );
    try {
      return jsonParse(text);
    } catch {
      return text;
    }
  }
  logSuccess(e, n, r) {}
  hrTimeToDate(e) {
    let [n, r] = e;
    return new Date(n * 1000 + r / 1e6);
  }
  transformLogsToEvents(e) {
    let n = [],
      r = isHipaaMode(),
      s = (R) => (typeof R === "string" ? R : void 0),
      h = (R) => (typeof R === "boolean" ? R : void 0),
      y = (R) => (typeof R === "number" && Number.isInteger(R) && R >= 0 ? R : void 0),
      S = (R, x) => {
        n.push({
          event_type: "ClaudeCodeInternalEvent",
          event_data: ClaudeCodeInternalEvent.toJSON(r ? sanitizeEventMetadata(R) : R),
          ...(x !== null && { principal_stamp: x }),
        });
      },
      w = (R) => {
        n.push({
          event_type: "GrowthbookExperimentEvent",
          event_data: GrowthbookExperimentEvent.toJSON(r ? gg(R) : R),
        });
      };
    for (let R of e) {
      let x = R.attributes || {};
      if (x.event_type === "GrowthbookExperimentEvent") {
        let hrTimeToDate = this.hrTimeToDate(R.hrTime),
          { account_uuid: account_uuid, organization_uuid: organization_uuid } = x;
        w({
          event_id: x.event_id,
          timestamp: hrTimeToDate,
          experiment_id: x.experiment_id,
          variation_id: x.variation_id,
          environment: x.environment,
          user_attributes: x.user_attributes,
          experiment_metadata: x.experiment_metadata,
          device_id: x.device_id,
          session_id: x.session_id,
          auth:
            account_uuid || organization_uuid
              ? { account_uuid: account_uuid, organization_uuid: organization_uuid }
              : void 0,
        });
        continue;
      }
      let P = x.event_name || R.body || "unknown",
        { core_metadata: core_metadata, user_metadata: user_metadata } = x,
        G = typeof x.principal_stamp === "string" ? x.principal_stamp : null;
      if (sx(P) || ax(P, G)) continue;
      let j = x.event_metadata || {};
      if (!core_metadata) {
        S(
          {
            event_id: x.event_id,
            event_name: P,
            client_timestamp: this.hrTimeToDate(R.hrTime),
            session_id: getSessionId(),
            additional_metadata: Buffer.from(
              jsonStringify({ transform_error: "core_metadata attribute is missing" }),
            ).toString("base64"),
          },
          G,
        );
        continue;
      }
      let ee = to1PEventFormat(core_metadata, user_metadata, j),
        {
          _PROTO_skill_name: _PROTO_skill_name,
          _PROTO_plugin_name: _PROTO_plugin_name,
          _PROTO_marketplace_name: _PROTO_marketplace_name,
          _PROTO_mcp_server_name: _PROTO_mcp_server_name,
          _PROTO_mcp_tool_name: _PROTO_mcp_tool_name,
          _PROTO_code: _PROTO_code,
          _PROTO_head_sha: _PROTO_head_sha,
          _PROTO_is_clean_tree_at_start: _PROTO_is_clean_tree_at_start,
          _PROTO_changed_file_count_at_start: _PROTO_changed_file_count_at_start,
          _PROTO_untracked_file_count_at_start: _PROTO_untracked_file_count_at_start,
          _PROTO_git_remote_url: _PROTO_git_remote_url,
          ...Me
        } = ee.additional,
        xe = stripProtoFields(Me);
      if (r) xe = pickNumericMetrics(xe, P);
      S(
        {
          event_id: x.event_id,
          event_name: P,
          client_timestamp: this.hrTimeToDate(R.hrTime),
          device_id: x.user_id,
          email: user_metadata?.email,
          auth: ee.auth,
          ...ee.core,
          env: ee.env,
          process: ee.process,
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
            Object.keys(xe).length > 0 ? Buffer.from(jsonStringify(xe)).toString("base64") : void 0,
        },
        G,
      );
    }
    return { events: n };
  }
  adoptInflightRefreshFrom(e) {
    this.refreshAttemptedFor ??= e.refreshAttemptedFor;
    let inflightRefresh = e.inflightRefresh;
    if (!inflightRefresh || this.inflightRefresh) return;
    ((this.inflightRefresh = inflightRefresh),
      inflightRefresh.finally(() => {
        if (this.inflightRefresh === inflightRefresh) this.inflightRefresh = null;
      }));
  }
  async beginShutdown(e = 0) {
    if (((this.finalFlush = !0), this.signalFinalFlush(), this.inflightRefresh && e > 0))
      await withDeadline(this.inflightRefresh, e);
  }
  async shutdown() {
    if (((this.isShutdown = !0), this.resetBackoff(), await this.forceFlush(), this.underATenantsRules())) {
      await this.drainPromise;
      let queuedEventCount = await this.getQueuedEventCount();
      if (queuedEventCount > 0) this.dropInATenant("unsent_at_exit", queuedEventCount);
    }
  }
  async forceFlush() {
    await Promise.all(this.pendingExports);
  }
}
/**
 * claude-code-server 租户中没有授权时的空导出授权（只丢弃并报错一次）。
 */
//@ chunk-aepeg2w5.js:892785-893118 placement
function dryRunGrant() {
  return {
    mayPost: () => !1,
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
class t_ extends Error {
  constructor() {
    super("firstParty sink killswitch active");
  }
}
//@ chunk-aepeg2w5.js:893199-893255 placement
function bP(e) {
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
/**
 * ANTHROPIC_BASE_URL 非 api.anthropic.com 时返回其 host，作为 GrowthBook 属性。
 */
//@ chunk-aepeg2w5.js:893255-893333 placement = getApiBaseUrlHost (0.812)
function getApiBaseUrlHost_2(e) {
  if (e === void 0) return;
  return e === null ? "api.anthropic.com" : bP(e);
}
//@ chunk-aepeg2w5.js:893603-893676 placement
function Zg(e) {
  try {
    return new URL(e).protocol === "https:";
  } catch {
    return !1;
  }
}
/**
 * 1P 上报失败原因：kill_switch / threw / no_answer / status_429/5xx/4xx/3xx。
 */
//@ chunk-aepeg2w5.js:893676-893919 placement
function classifyPostFailure(e) {
  if (e instanceof t_) return "kill_switch";
  if (!(e instanceof DirectPostError)) return "threw";
  let { status: status } = e.facts;
  if (status === void 0) return "no_answer";
  if (status === 429) return "status_429";
  if (status >= 500) return "status_5xx";
  return status >= 400 ? "status_4xx" : "status_3xx";
}
//@ chunk-aepeg2w5.js:893919-893977 placement
var C2 = DoctorLazy(() => u({ accepted_count: E().int().nonnegative() }));
//@ chunk-aepeg2w5.js:893977-894071 placement
function R2(e, n) {
  let safeParse = C2().safeParse(e);
  return safeParse.success ? Math.min(safeParse.data.accepted_count, n) : n;
}
/**
 * 记录租户授权回调抛错。
 */
//@ chunk-aepeg2w5.js:894071-894295 placement
function logGrantCallbackError(e) {
  try {
    let n = e instanceof Error ? e.name : typeof e;
    logForDebugging(
      `1P event logging: a function of the tenant's grant threw or rejected (${n}). From mayPost that is a no, from a listener it is ignored.`,
      { level: "error" },
    );
  } catch {}
}
//@ chunk-aepeg2w5.js:894295-894338 layout
var DEFAULT_ACCEPT_HEADER = "application/json, text/plain, */*";
//@ chunk-aepeg2w5.js:894338-894435 layout
class DirectPostError extends Error {
  facts;
  constructor(e, n) {
    super(e);
    this.facts = n;
    this.name = "DirectPostError";
  }
}
/**
 * 从 axios 错误提取 request-id、status、code 便于日志。
 */
//@ chunk-aepeg2w5.js:894435-894682 fingerprint = getAxiosErrorContext (0.688)
function getAxiosErrorContext(error) {
  if (!(error instanceof DirectPostError)) return errorMessage(error);
  let { facts: facts } = error,
    parts = [];
  if (facts.requestId) parts.push(`request-id=${facts.requestId}`);
  if (facts.status) parts.push(`status=${facts.status}`);
  if (facts.code) parts.push(`code=${facts.code}`);
  if (error.message) parts.push(error.message);
  return parts.join(", ");
}
//@ chunk-4m46mxx9.js:6572-6590 fingerprint = getStorageDir (1)
var getStorageDir = "telemetry";

export { Zg, getStorageDir, FirstPartyEventLoggingExporter };
