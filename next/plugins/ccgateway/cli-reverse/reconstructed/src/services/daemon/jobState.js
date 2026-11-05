/**
 * services/daemon/jobState.ts
 *
 * 2.1.316 新增：后台任务状态存储
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (3), chunk-rmd7n4gq.js (91)
 * attribution: placement 94
 */
import { join, basename, isAbsolute, dirname, relative } from "path";
import { lstat, readFile, rm, mkdir, readdir } from "fs/promises";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  stringSchema,
  objectSchema,
  _enum,
  numberSchema,
  array,
  literal,
  booleanSchema,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  stripForwardedFlags,
  dropOverriddenSkipPermissions,
  splitForwardableArgs,
  filterBackgroundEnv,
  keepForwardableEnv,
  resolveForwardedEnvPaths,
} from "../../cli/forwardedFlags.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isUuidShaped } from "../../utils/sessionStoragePortable.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { currentSessionStatusState } from "../sessionStatus/sessionStateClassifier.js";
import { isSessionCronOnlyWake } from "./sessionCron.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { storageErrorCode, formatStorageError } from "../../utils/storage/storageErrors.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  RESOURCE_EXHAUSTION_CODES,
  errorMessage,
  sanitizeErrnoForTelemetry,
  isENOENT,
} from "../../utils/errors.js";
import { writeFileAtomic, writeIfMissing, retryFsOp, writeNewFile } from "../../utils/atomicPublishWrite.js";
import { logError } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { sanitizeSessionTitle, stripSuffix } from "../../utils/stringUtils.js";
import { flagArgs } from "./relaunchArgs.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { lock } from "../../utils/lockfile.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { isUnavailableErrorCode, isUnavailableError } from "../../utils/settings/managedEnvKeys.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { getEffectiveAgentColor } from "../../tools/AgentTool/agentColorManager.js";
import { readRoster } from "./roster.js";
import { checkProcessLiveness } from "./processLiveness.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:856654-856692 placement
/**
 * 导出函数 `jobsDir`：返回 join_11(getClaudeConfigDir(), "jobs")。
 */
function jobsDir() {
  return join(getClaudeConfigDir(), "jobs");
}
//@ chunk-exfmq47h.js:856692-856728 placement
/**
 * 导出常量或表 `JOB_PARENT_TRANSCRIPT_FILE`：值为 ["parent-transcript.jsonl"]。
 */
var JOB_PARENT_TRANSCRIPT_FILE = ["parent-transcript.jsonl"];
//@ chunk-exfmq47h.js:856728-856811 placement
/**
 * 导出函数 `jobStorageSpace`：参数 e, n，返回 STORAGE_SPACES.job(r, n)。
 */
function jobStorageSpace(jobDirPath, channel) {
  let jobId = basename(jobDirPath);
  if (!isValidKeySegment(jobId) || jobDirPath !== join(jobsDir(), jobId)) return;
  return STORAGE_SPACES.job(jobId, channel);
}
//@ chunk-rmd7n4gq.js:21626-21716 placement
/**
 * 保留的分组名（pinned/ungrouped/past 及带括号显示名）。
 */
var UNGROUPED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EARLIER;
var MAX_GROUP_NAME_CHARS;
var RESERVED_GROUP_NAMES;
deferInit("chunk-rmd7n4gq.js:21626", () => {
  UNGROUPED = "(ungrouped)";
  EARLIER = "(earlier)";
  MAX_GROUP_NAME_CHARS = 64;
  RESERVED_GROUP_NAMES = new Set(["pinned", "ungrouped", UNGROUPED, "past", EARLIER]);
});
//@ chunk-rmd7n4gq.js:21716-21763 placement
function isReservedGroupName(name) {
  return RESERVED_GROUP_NAMES.has(name.toLowerCase());
}
//@ chunk-rmd7n4gq.js:21763-21804 placement
function sanitizeGroupName(name) {
  return stripIgnorables(name).slice(0, MAX_GROUP_NAME_CHARS);
}
//@ chunk-rmd7n4gq.js:21804-21880 placement
/**
 * 清洗分组名，保留名或空名返回 undefined。
 */
function sanitizeGroupOrDefault(group) {
  if (group === undefined) return;
  let rawGroup = sanitizeGroupName(group);
  return rawGroup && !isReservedGroupName(rawGroup) ? rawGroup : undefined;
}
//@ chunk-rmd7n4gq.js:21880-22762 placement
/**
 * 作业状态读取缓存（按修改时间键）及各类日志/遥测的一次性上报去重（瞬时错误、被拒、恢复、修剪、sidecar 回退）。
 */
class JobStateReadCache {
  #e = new Map();
  #t = new Set();
  #n = new Set();
  #r = new Set();
  #o = new Set();
  #i = new Set();
  peek(pathKey) {
    return this.#e.get(pathKey);
  }
  invalidate(pathKey) {
    this.#e.delete(pathKey);
  }
  noteAbsent(pathKey) {
    this.#e.delete(pathKey);
    this.#t.delete(pathKey);
    this.#n.delete(pathKey);
  }
  noteRejected(pathKey, mtimeKey) {
    this.#e.set(pathKey, {
      mtimeKey,
      state: null,
    });
  }
  noteParsed(pathKey, mtimeKey, state) {
    if (this.#e.size > 1000) this.#e.clear();
    this.#e.set(pathKey, {
      mtimeKey,
      state,
    });
    this.#t.delete(pathKey);
    this.#n.delete(pathKey);
  }
  noteHit(pathKey) {
    this.#t.delete(pathKey);
  }
  shouldReportTransient(pathKey) {
    if (this.#t.has(pathKey)) return false;
    this.#t.add(pathKey);
    return true;
  }
  shouldReportRejected(pathKey) {
    if (this.#n.has(pathKey)) return false;
    this.#n.add(pathKey);
    return true;
  }
  shouldReportRecovered(pathKey) {
    if (this.#r.has(pathKey)) return false;
    this.#r.add(pathKey);
    return true;
  }
  noteCleanRead(pathKey) {
    this.#r.delete(pathKey);
  }
  shouldReportPruned(pathKey) {
    if (this.#o.has(pathKey)) return false;
    this.#o.add(pathKey);
    return true;
  }
  notePruneCandidateLive(pathKey) {
    this.#o.delete(pathKey);
  }
  shouldLogSidecarFallback(pathKey) {
    if (this.#i.has(pathKey)) return false;
    this.#i.add(pathKey);
    return true;
  }
}
//@ chunk-rmd7n4gq.js:22762-22787 placement
/**
 * 按宿主保存的作业状态读取缓存。
 */
var jobStateReadCache; // deferred: uses JobStateReadCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rmd7n4gq.js:22762", () => {
  jobStateReadCache = new HostScoped(() => new JobStateReadCache());
});
//@ chunk-rmd7n4gq.js:22787-22824 placement
/**
 * 按会话保存的作业 pin/draft 表。
 */
class JobPins {
  drafts = new Map();
  pins = new Map();
}
//@ chunk-rmd7n4gq.js:22824-22850 placement
/**
 * 作业 pin 状态的宿主作用域单例。
 */
var jobPinsState; // deferred: uses JobPins of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rmd7n4gq.js:22824", () => {
  jobPinsState = new HostScoped(() => new JobPins());
});
//@ chunk-rmd7n4gq.js:22850-23312 placement
/**
 * 从存储读取不超过上限的文本：首次先查元数据（不存在、出错或超限时标记并可修复），读取失败清除标记；超限返回 null。
 */
async function readCappedStorageText(storage, key, { cap, screens, screenKey, heal }) {
  if (screens.get(screenKey) !== "ok") {
    let stat = await storage.statMeta(key);
    if (!stat.ok) {
      if (stat.error.code !== "NotFound") {
        screens.set(screenKey, "refused");
        await heal?.();
      }
      return null;
    }
    if (stat.value.size > cap) {
      screens.set(screenKey, "refused");
      return null;
    }
    screens.set(screenKey, "ok");
  }
  let text = await storage.readText([
    {
      key,
      offset: 0,
      length: cap + 1,
    },
  ]);
  if (!text.ok) {
    screens.delete(screenKey);
    await heal?.();
    return null;
  }
  let item = text.value.items[0];
  if (!item.found) return null;
  if (item.totalBytes > cap) {
    screens.set(screenKey, "refused");
    return null;
  }
  return item.value;
}
//@ chunk-rmd7n4gq.js:23312-23403 placement
/**
 * 桥接会话 id 的正则（cse_/session_ 前缀）。
 */
var pathStringSchema = () => stringSchema().transform(stripLongPathPrefixes);
var SHORT_ID_RE = /^[a-f0-9]{8}$/;
var BRIDGE_SESSION_ID_RE = /^(cse_|session_)[A-Za-z0-9_-]{1,128}$/;
//@ chunk-rmd7n4gq.js:23403-23532 placement
function makeFieldValidator(field, isValid) {
  return (value) => {
    if (isValid(value)) return value;
    logForDebugging(`[jobs] dropped malformed ${field} from persisted job state`, {
      level: "warn",
    });
    return;
  };
}
//@ chunk-rmd7n4gq.js:23532-27540 placement
/**
 * 单个作业状态文件的最大字节数（10000）。
 */
var jobStateSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var STATE_JSON;
var MAX_STATE_BYTES;
deferInit("chunk-rmd7n4gq.js:23532", () => {
  jobStateSchema = DoctorLazy(() =>
    objectSchema({
      state: stringSchema(),
      detail: stringSchema(),
      tempo: _enum(["active", "idle", "blocked"]).optional().catch(undefined),
      inFlight: objectSchema({
        tasks: numberSchema(),
        queued: numberSchema(),
        kinds: array(stringSchema()),
        drainableMonitors: numberSchema().int().nonnegative().optional(),
        wake: objectSchema({
          at: numberSchema().optional(),
          reason: stringSchema().optional(),
          fires: numberSchema().int().nonnegative(),
          keepalive: literal(true).optional(),
        })
          .optional()
          .catch(undefined),
      }).optional(),
      selfWake: booleanSchema().optional().catch(undefined),
      fan: array(
        objectSchema({
          id: stringSchema().optional(),
          kind: _enum(["agent", "workflow", "shell", "monitor", "mcp", "todo"]).optional().catch(undefined),
          label: stringSchema(),
          startedAt: numberSchema().optional(),
          doneAt: numberSchema().optional(),
          failed: booleanSchema().optional(),
          group: stringSchema().optional(),
        }),
      ).optional(),
      tokens: numberSchema().optional(),
      needs_you: booleanSchema().optional(),
      needs: stringSchema().optional(),
      block: objectSchema({
        questions: array(
          objectSchema({
            question: stringSchema(),
            options: array(
              objectSchema({
                label: stringSchema(),
                description: stringSchema(),
              }),
            ),
          }),
        ),
      }).optional(),
      suggestedReply: stringSchema().optional(),
      needsOverlay: stringSchema().optional(),
      output: record(stringSchema(), stringSchema()).nullable().default(null),
      structuredResult: record(stringSchema(), unknown()).optional(),
      children: array(
        objectSchema({
          id: stringSchema(),
          href: stringSchema(),
          kind: _enum(["pr", "frame"]).optional().catch(undefined),
          title: stringSchema().optional().catch(undefined),
        }),
      )
        .nullable()
        .default(null),
      linkScanOffset: numberSchema().default(0),
      linkScanPath: pathStringSchema()
        .transform(
          makeFieldValidator(
            "linkScanPath",
            (value) =>
              isAbsolute(value) &&
              value.endsWith(".jsonl") &&
              normalizeUuidOrNull(basename(value, ".jsonl")) !== null,
          ),
        )
        .optional(),
      template: stringSchema(),
      routine: stringSchema().optional(),
      respawnFlags: array(stringSchema())
        .default([])
        .transform((respawnFlags) =>
          stripForwardedFlags(dropOverriddenSkipPermissions(splitForwardableArgs(respawnFlags))),
        ),
      bgIsolation: _enum(["none", "worktree"]).optional().catch(undefined),
      providerEnv: record(stringSchema(), stringSchema())
        .transform((providerEnv) => {
          let filteredEnv = filterBackgroundEnv(import_mapValues(providerEnv, stripLongPathPrefixes));
          return (
            filteredEnv && keepForwardableEnv(filteredEnv, "the saved job state (state.json providerEnv)")
          );
        })
        .optional(),
      sessionPermissionRules: objectSchema({
        allow: array(stringSchema()),
        deny: array(stringSchema()),
        addDirs: array(pathStringSchema()).optional(),
      }).optional(),
      memoryToggledOff: booleanSchema().optional(),
      autoMemoryOffThisSession: booleanSchema().optional(),
      forkSourceAlive: booleanSchema().optional(),
      forkBoundaryAt: stringSchema().optional(),
      forkSessionId: stringSchema().optional(),
      forkParentSessionId: stringSchema().optional(),
      interactiveLineage: booleanSchema().optional(),
      intent: stringSchema(),
      displayIntent: stringSchema().optional(),
      initialPrompt: stringSchema().optional(),
      queuedPrompt: stringSchema().optional(),
      name: stringSchema().optional(),
      nameSource: _enum(["user", "auto", "collision"]).optional().catch(undefined),
      color: stringSchema().optional(),
      sessionId: pathStringSchema(),
      resumeSessionId: stringSchema()
        .transform(
          makeFieldValidator(
            "resumeSessionId",
            (resumeSessionId) => normalizeUuidOrNull(resumeSessionId) !== null,
          ),
        )
        .optional(),
      daemonShort: stringSchema()
        .transform(makeFieldValidator("daemonShort", (daemonShort) => SHORT_ID_RE.test(daemonShort)))
        .optional(),
      cliVersion: stringSchema().optional(),
      cwd: pathStringSchema(),
      createdAt: stringSchema(),
      updatedAt: stringSchema(),
      firstTerminalAt: stringSchema().nullable().default(null),
      lastTerminalAt: stringSchema().optional(),
      worktreePath: pathStringSchema().optional(),
      worktreeBranch: stringSchema().optional(),
      worktreeHookBased: booleanSchema().optional(),
      originCwd: pathStringSchema().optional(),
      bridgeSessionId: stringSchema()
        .transform(
          makeFieldValidator("bridgeSessionId", (bridgeSessionId) =>
            BRIDGE_SESSION_ID_RE.test(bridgeSessionId),
          ),
        )
        .optional(),
      bridgeOwnerAccountUuid: stringSchema().optional(),
      bridgeOwnerOrganizationUuid: stringSchema().optional(),
      bridgeNoHistoryBackfill: booleanSchema().optional(),
      bridgeOutboundOnly: booleanSchema().optional(),
      bridgeSessionGroupingId: stringSchema()
        .transform(
          makeFieldValidator("bridgeSessionGroupingId", (groupingId) =>
            /^sgrp_[A-Za-z0-9_]{1,128}$/.test(groupingId),
          ),
        )
        .optional(),
      bridgeSessionSeq: numberSchema()
        .transform(makeFieldValidator("bridgeSessionSeq", (seq) => Number.isInteger(seq) && seq >= 0))
        .optional(),
      backend: _enum(["daemon", "peer", "remote"])
        .catch("daemon")
        .default("daemon")
        .transform((backend) => {
          if (backend === "daemon") return backend;
          logForDebugging(
            `[jobs] coerced persisted backend '${backend}' to 'daemon' \u2014 peer/remote rows are never written to disk`,
            {
              level: "warn",
            },
          );
          return "daemon";
        }),
      sock: stringSchema().optional(),
      pid: numberSchema().optional(),
      keptBy: objectSchema({
        pid: numberSchema().int().positive(),
        procStart: stringSchema().max(64).optional(),
      }).optional(),
      sortOrder: numberSchema().optional(),
      stateSortOrder: numberSchema().optional(),
      group: stringSchema().optional(),
      pinned: booleanSchema().optional(),
      reapedMidWorkAt: stringSchema().optional(),
      reapedUnsettledAt: stringSchema().optional(),
      deadEpochReapedAt: stringSchema().optional(),
      sessionIdTaken: booleanSchema().optional().catch(undefined),
      replayOwed: booleanSchema().optional().catch(undefined),
    }).transform(({ needs_you: needsYou, ...rest }) => {
      let badBridgeOwners =
        (rest.bridgeOwnerAccountUuid !== undefined && !isUuidShaped(rest.bridgeOwnerAccountUuid)) ||
        (rest.bridgeOwnerOrganizationUuid !== undefined && !isUuidShaped(rest.bridgeOwnerOrganizationUuid));
      let tempo = rest.tempo ?? (needsYou ? "blocked" : "idle");
      return {
        ...rest,
        ...(badBridgeOwners && {
          bridgeOwnerAccountUuid: undefined,
          bridgeOwnerOrganizationUuid: undefined,
        }),
        tempo,
        ...(rest.lastTerminalAt === undefined &&
          terminalOutcome(rest.state) !== null &&
          tempo !== "active" && {
            lastTerminalAt: rest.firstTerminalAt || rest.updatedAt,
          }),
      };
    }),
  );
  STATE_JSON = "state.json";
  MAX_STATE_BYTES = 8388608;
});
//@ chunk-rmd7n4gq.js:27540-27567 placement
function getJobsDir() {
  return jobsDir();
}
//@ chunk-rmd7n4gq.js:27567-27599 placement
function getJobDir(shortId) {
  return join(getJobsDir(), shortId);
}
//@ chunk-rmd7n4gq.js:27599-27710 placement
function getOwnJobShortId() {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (CLAUDE_JOB_DIR) return basename(CLAUDE_JOB_DIR);
  let bgTakeover = getBgTakeover();
  if (bgTakeover) return basename(bgTakeover.jobDir);
  return getSessionId().slice(0, 8);
}
//@ chunk-rmd7n4gq.js:27710-27759 placement
/**
 * 某作业某文件的存储路径（key 不合法时返回 undefined）。
 */
function jobStoragePath(jobId, relPath) {
  return isValidKeySegment(jobId) ? STORAGE_SPACES.job(jobId, relPath) : undefined;
}
//@ chunk-rmd7n4gq.js:27759-27793 placement
function jobKeyFor(jobId, relPath) {
  return jobStorageSpace(jobId, relPath);
}
//@ chunk-rmd7n4gq.js:27793-27831 placement
function jobStateKey(jobId) {
  return STORAGE_SPACES.job(jobId, [STATE_JSON]);
}
//@ chunk-rmd7n4gq.js:27831-28140 placement
function watchJobDirOnce(jobId, onChange) {
  let statePath = join(getJobDir(jobId), STATE_JSON);
  let stopped = false;
  let lastMtimeMs = Number.NaN;
  function checkMtime(mtimeMs) {
    if (stopped) return;
    if (Number.isNaN(lastMtimeMs)) {
      lastMtimeMs = mtimeMs;
      return;
    }
    if (mtimeMs === lastMtimeMs) return;
    stop();
    onChange();
  }
  function poll() {
    lstat(statePath).then(
      (stats) => checkMtime(stats.mtimeMs),
      () => checkMtime(-1),
    );
  }
  poll();
  let interval = setInterval(poll, 200);
  let timer = setTimeout(stop, 1e4);
  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    clearTimeout(timer);
  }
  return stop;
}
//@ chunk-rmd7n4gq.js:28140-28188 placement
function isOwnStateWriteInFlight() {
  return currentSessionStatusState().ownStateWriteDepth > 0;
}
//@ chunk-rmd7n4gq.js:28188-28905 placement
async function writeStateAtomic(jobDir, jobState, storageV5) {
  let hasSessionCron = jobState.inFlight?.kinds.includes("session_cron") === true;
  let withSelfWake =
    hasSessionCron && !jobState.selfWake && isSessionCronOnlyWake(jobState.inFlight)
      ? {
          ...jobState,
          selfWake: true,
        }
      : !hasSessionCron && jobState.selfWake && isSettled(jobState)
        ? {
            ...jobState,
            selfWake: undefined,
          }
        : jobState;
  let normalized = isSettled(withSelfWake)
    ? withSelfWake.lastTerminalAt
      ? withSelfWake
      : {
          ...withSelfWake,
          lastTerminalAt: withSelfWake.updatedAt,
        }
    : withSelfWake.lastTerminalAt !== undefined
      ? {
          ...withSelfWake,
          lastTerminalAt: undefined,
        }
      : withSelfWake;
  let { pinned, sortOrder, stateSortOrder, group, ...persisted } = normalized;
  let stateKey = storageV5 ? jobKeyFor(jobDir, [STATE_JSON]) : undefined;
  let statusState = currentSessionStatusState();
  statusState.ownStateWriteDepth++;
  try {
    if (storageV5 && stateKey) {
      let writeResult = await storageV5.write(stateKey, jsonStringify(persisted, null, 2), {
        mode: 384,
        parent: "mustExist",
      });
      if (!writeResult.ok) {
        let errorCode = storageErrorCode(writeResult.error);
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[jobs] v5 state write failed: ${formatStorageError(writeResult.error)}`,
            "[jobs] v5 state write failed",
          ),
          errorCode !== undefined
            ? {
                code: errorCode,
              }
            : {},
        );
      }
    } else await writeFileAtomic(join(jobDir, STATE_JSON), jsonStringify(persisted, null, 2), 384);
  } finally {
    statusState.ownStateWriteDepth--;
    invalidateJobStateCache(jobDir);
  }
}
//@ chunk-rmd7n4gq.js:28905-29040 placement
function logJobWriteError(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode && (RESOURCE_EXHAUSTION_CODES.has(errnoCode) || errnoCode === "ENOENT")) {
    logForDebugging(`[jobs] state write failed (${errnoCode}): ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
  logError(error);
}
//@ chunk-rmd7n4gq.js:29040-29291 placement
function resolveBridgeHandoffIdentity(replBridgeHandle, currentSessionBridge) {
  let handle =
    currentSessionBridge !== undefined && currentSessionBridge.id === replBridgeHandle?.bridgeSessionId;
  return {
    ownerAccountUuid: handle ? currentSessionBridge.ownerAccountUuid : undefined,
    ownerOrganizationUuid: handle ? currentSessionBridge.ownerOrganizationUuid : undefined,
    noHistoryBackfill:
      replBridgeHandle?.noHistoryBackfill ||
      (currentSessionBridge !== undefined && !handle ? true : currentSessionBridge?.noHistoryBackfill),
  };
}
//@ chunk-rmd7n4gq.js:29291-29760 placement
function buildBridgeReattachEnv(bridgeSessionId, seq, outboundOnly, groupingId, bridgeHandoffIdentity) {
  if (!bridgeSessionId) return;
  let env = {
    CLAUDE_BRIDGE_REATTACH_SESSION: bridgeSessionId,
  };
  if (seq !== undefined && seq > 0) env.CLAUDE_BRIDGE_REATTACH_SEQ = String(seq);
  if (groupingId) env.CLAUDE_BRIDGE_REATTACH_GROUPING = groupingId;
  if (bridgeHandoffIdentity?.ownerAccountUuid)
    env.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT = bridgeHandoffIdentity.ownerAccountUuid;
  if (bridgeHandoffIdentity?.ownerOrganizationUuid)
    env.CLAUDE_BRIDGE_REATTACH_OWNER_ORG = bridgeHandoffIdentity.ownerOrganizationUuid;
  if (bridgeHandoffIdentity?.noHistoryBackfill) env.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL = "1";
  if (outboundOnly !== false) env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY = "1";
  return env;
}
//@ chunk-rmd7n4gq.js:29760-29796 placement
/**
 * 取当前宿主的作业状态读取缓存。
 */
function getJobStateReadCache() {
  return jobStateReadCache.of(getRootSession().host);
}
//@ chunk-rmd7n4gq.js:29796-29866 placement
/**
 * 取缓存的状态对象，读失败策略为 null 时返回 null。
 */
function stateOrNull(loaded, loadOptions) {
  return loadOptions?.onReadFailure === "null" ? null : (loaded?.state ?? null);
}
//@ chunk-rmd7n4gq.js:29866-29920 placement
/**
 * 表示“不是普通文件”的错误码集合。
 */
var RETRY_BACKOFF_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_REGULAR_ERROR_CODES;
deferInit("chunk-rmd7n4gq.js:29866", () => {
  RETRY_BACKOFF_MS = [15, 45];
  NON_REGULAR_ERROR_CODES = new Set(["ELOOP", "ENXIO", "EISDIR"]);
});
//@ chunk-rmd7n4gq.js:29920-30087 placement
function classifyStorageRejection(error) {
  if (error.code !== "Failed" || error.telemetryCode === undefined) return;
  if (error.telemetryCode === "EFBIG") return "oversize";
  return NON_REGULAR_ERROR_CODES.has(error.telemetryCode) ? "non-regular" : undefined;
}
//@ chunk-rmd7n4gq.js:30087-30191 placement
function isSidecarReadFailure(error) {
  return (
    error.code === "Failed" &&
    error.key !== undefined &&
    error.key.namespace === "job" &&
    error.key.relPath[0] !== STATE_JSON
  );
}
//@ chunk-rmd7n4gq.js:30191-30248 placement
/**
 * 不计入失败统计的失败分类（invariant、permission、environment）。
 */
var NON_COUNTED_FAILURE_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rmd7n4gq.js:30191", () => {
  NON_COUNTED_FAILURE_CLASSES = new Set(["invariant", "permission", "environment"]);
});
//@ chunk-rmd7n4gq.js:30248-30372 placement
function isTransientStorageError(error) {
  if (error.code === "Unavailable") return true;
  return (
    error.code === "Failed" &&
    !NON_COUNTED_FAILURE_CLASSES.has(error.failureClass) &&
    classifyStorageRejection(error) === undefined &&
    !isSidecarReadFailure(error)
  );
}
//@ chunk-rmd7n4gq.js:30372-30620 placement
/**
 * 对瞬时存储错误按退避重试读取；首次成功记干净读取，重试后成功记 tengu_bg_state_read_recovered（只一次）。
 */
async function retryStorageRead(jobDir, read) {
  let result = await read();
  let attempts = 1;
  for (let delay of RETRY_BACKOFF_MS) {
    if (result.ok || !isTransientStorageError(result.error)) break;
    await sleep(delay);
    result = await read();
    attempts++;
  }
  if (result.ok) {
    if (attempts === 1) getJobStateReadCache().noteCleanRead(jobDir);
    else if (getJobStateReadCache().shouldReportRecovered(jobDir))
      logEvent("tengu_bg_state_read_recovered", {
        attempts,
      });
  }
  return result;
}
//@ chunk-rmd7n4gq.js:30620-30827 placement
function rejectJobState(jobDir, reasonCode, detail) {
  let cached = getJobStateReadCache().peek(jobDir);
  if (!(cached?.mtimeKey.startsWith("rejected:") && cached.state === null))
    logForDebugging(`[jobs] skipping ${basename(jobDir)}: state.json is ${detail}`, {
      level: "warn",
    });
  getJobStateReadCache().noteRejected(jobDir, `rejected:${reasonCode}`);
  return null;
}
//@ chunk-rmd7n4gq.js:30827-30860 placement
function invalidateJobStateCache(jobDir) {
  getJobStateReadCache().invalidate(jobDir);
}
//@ chunk-rmd7n4gq.js:30860-32658 placement
/**
 * 从存储 v5 读取作业 state.json 及 order/stateOrder/group sidecar：检查大小与类型，瞬时失败用缓存，版本未变命中缓存，否则解析。
 */
async function readJobStateFromStorage(storage, jobDir, storage_2) {
  let jobId = basename(jobDir);
  let cached = getJobStateReadCache().peek(jobDir);
  if (cached === undefined || cached.mtimeKey.startsWith("rejected:")) {
    let statResult = await storage.statMeta(jobStateKey(jobId));
    if (!statResult.ok) {
      if (statResult.error.code === "NotFound") return noteStateAbsent(jobDir, storage_2);
      let rejection = classifyStorageRejection(statResult.error);
      if (rejection !== undefined)
        return rejectJobState(
          jobDir,
          rejection,
          rejection === "oversize" ? "too large" : "not a regular file",
        );
    } else if (statResult.value.size > MAX_STATE_BYTES) {
      let mtimeKey = `rejected:${statResult.value.mtimeMs}:${statResult.value.size}`;
      if (getJobStateReadCache().peek(jobDir)?.mtimeKey !== mtimeKey) {
        logForDebugging(
          `[jobs] skipping ${basename(jobDir)}: state.json is too large (${statResult.value.size} bytes)`,
          {
            level: "warn",
          },
        );
        getJobStateReadCache().noteRejected(jobDir, mtimeKey);
      }
      return null;
    }
  }
  let stateKey = jobStateKey(jobId);
  let readResult = await retryStorageRead(jobDir, () =>
    storage.read([
      stateKey,
      STORAGE_SPACES.job(jobId, ["order"]),
      STORAGE_SPACES.job(jobId, ["stateOrder"]),
      STORAGE_SPACES.job(jobId, ["group"]),
    ]),
  );
  if (!readResult.ok && isSidecarReadFailure(readResult.error)) {
    if (getJobStateReadCache().shouldLogSidecarFallback(jobDir))
      logForDebugging(
        `[jobs] ${basename(jobDir)}: a sidecar could not be read as a regular file; using state.json alone`,
      );
    let stateRead = await storage.read([stateKey]);
    readResult = stateRead.ok
      ? {
          ok: true,
          value: {
            items: [
              stateRead.value.items[0],
              {
                found: false,
              },
              {
                found: false,
              },
              {
                found: false,
              },
            ],
          },
        }
      : stateRead;
  }
  let cached_2 = getJobStateReadCache().peek(jobDir);
  if (!readResult.ok) {
    let rejection = classifyStorageRejection(readResult.error);
    if (rejection !== undefined)
      return rejectJobState(jobDir, rejection, rejection === "oversize" ? "too large" : "not a regular file");
    logForDebugging(`[jobs] ${basename(jobDir)}: v5 state read failed \u2014 ${readResult.error.code}`, {
      level: "warn",
    });
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: fromEnum(readResult.error.code),
        had_cache: cached_2 !== undefined,
      });
    return stateOrNull(cached_2, storage_2);
  }
  let [stateItem, orderItem, stateOrderItem, groupItem] = readResult.value.items;
  if (!stateItem.found) return noteStateAbsent(jobDir, storage_2);
  if (stateItem.totalBytes > MAX_STATE_BYTES) {
    let mtimeKey = `rejected:${stateItem.mtimeMs}:${stateItem.totalBytes}`;
    if (cached_2?.mtimeKey === mtimeKey) return null;
    logForDebugging(
      `[jobs] skipping ${basename(jobDir)}: state.json is too large (${stateItem.totalBytes} bytes)`,
      {
        level: "warn",
      },
    );
    getJobStateReadCache().noteRejected(jobDir, mtimeKey);
    return null;
  }
  let toText = (item) =>
    Buffer.from(item.value.buffer, item.value.byteOffset, item.value.byteLength).toString("utf-8");
  let sidecarText = (item) => (item.found && item.totalBytes <= MAX_STATE_BYTES ? toText(item) : null);
  let sidecarVersion = (item) => (item.found && item.totalBytes <= MAX_STATE_BYTES ? item.version : 0);
  let versionKey = `v5:${stateItem.version}:${sidecarVersion(orderItem)}:${sidecarVersion(stateOrderItem)}:${sidecarVersion(groupItem)}`;
  if (cached_2?.mtimeKey === versionKey) {
    getJobStateReadCache().noteHit(jobDir);
    return cached_2.state;
  }
  return parseJobStateText(
    jobDir,
    versionKey,
    toText(stateItem),
    sidecarText(orderItem),
    sidecarText(stateOrderItem),
    sidecarText(groupItem),
    cached_2,
    storage_2,
  );
}
//@ chunk-rmd7n4gq.js:32658-33620 placement
/**
 * 解析作业 state.json：schema 校验失败记 tengu_bg_state_read_rejected 并缓存拒绝；保留未知字段，合并排序与分组 sidecar，结果写入缓存；解析异常时回退缓存。
 */
function parseJobStateText(
  jobDir,
  cacheKey,
  stateText,
  orderText,
  stateOrderText,
  groupText,
  cached,
  storage,
) {
  try {
    let raw = jsonParse(stateText);
    let parsed = jobStateSchema().safeParse(raw);
    if (!parsed.success) {
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${parsed.error.message}`,
        {
          level: "warn",
        },
      );
      if (getJobStateReadCache().shouldReportRejected(jobDir)) logEvent("tengu_bg_state_read_rejected", {});
      getJobStateReadCache().noteRejected(jobDir, cacheKey);
      return null;
    }
    let sortOrder = orderText !== null ? Number(orderText) : undefined;
    let stateSortOrder = stateOrderText !== null ? Number(stateOrderText) : undefined;
    let shape = jobStateSchema().in.shape;
    let extraFields =
      raw !== null && typeof raw === "object"
        ? Object.entries(raw).filter(([key]) => !Object.hasOwn(shape, key))
        : [];
    let state = {
      ...Object.fromEntries(extraFields),
      ...parsed.data,
    };
    if (Number.isFinite(sortOrder))
      state = {
        ...state,
        sortOrder,
      };
    if (Number.isFinite(stateSortOrder))
      state = {
        ...state,
        stateSortOrder,
      };
    if (groupText !== null && groupText.trim())
      state = {
        ...state,
        group: groupText.trim(),
      };
    if (state.group !== undefined)
      state = {
        ...state,
        group: sanitizeGroupOrDefault(state.group),
      };
    getJobStateReadCache().noteParsed(jobDir, cacheKey, state);
    return state;
  } catch (error) {
    logForDebugging(
      `[jobs] ${basename(jobDir)}: state.json read/parse failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: cached !== undefined,
      });
    return stateOrNull(cached, storage);
  }
}
//@ chunk-rmd7n4gq.js:33620-33683 placement
/**
 * 记录一次“状态不存在”并返回 null。
 */
function noteStateAbsent(jobDir, options) {
  getJobStateReadCache().noteAbsent(jobDir);
  options?.onAbsent?.();
  return null;
}
//@ chunk-rmd7n4gq.js:33683-33745 placement
async function readJobStateFreshOrNull(jobDir, storage) {
  return loadJobState(jobDir, storage, {
    onReadFailure: "null",
  });
}
//@ chunk-rmd7n4gq.js:33745-33790 placement
async function readJobState(jobDir, storage) {
  return loadJobState(jobDir, storage, undefined);
}
//@ chunk-rmd7n4gq.js:33790-33904 placement
async function readJobStateOrAbsent(jobDir, storage) {
  let flag = {
    absent: false,
  };
  let jobState = await loadJobState(jobDir, storage, {
    onAbsent: () => {
      flag.absent = true;
    },
  });
  return flag.absent ? "absent" : jobState;
}
//@ chunk-rmd7n4gq.js:33904-36144 placement
/**
 * 读取作业状态：存储 v5 可用时走存储；否则 lstat state.json 与 sidecar（非普通文件或过大则拒绝），按修改时间命中缓存，读取并解析合并 sidecar；出错时回退缓存并记瞬时错误。
 */
async function loadJobState(jobDir, storage, options) {
  if (storage !== undefined && jobKeyFor(jobDir, [STATE_JSON]) !== undefined)
    return readJobStateFromStorage(storage, jobDir, options);
  let statePath = join(jobDir, STATE_JSON);
  let orderPath = join(jobDir, "order");
  let stateOrderPath = join(jobDir, "stateOrder");
  let groupPath = join(jobDir, "group");
  let mtimeKey;
  let sidecarsUsable;
  try {
    let [stateStats, orderStats, stateOrderStats, groupStats] = await Promise.all([
      lstat(statePath),
      lstat(orderPath).catch(() => null),
      lstat(stateOrderPath).catch(() => null),
      lstat(groupPath).catch(() => null),
    ]);
    if (!stateStats.isFile() || stateStats.size > MAX_STATE_BYTES) {
      let mtimeKey = `rejected:${stateStats.mtimeMs}:${stateStats.size}`;
      if (getJobStateReadCache().peek(jobDir)?.mtimeKey === mtimeKey) return null;
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json is ${stateStats.isFile() ? `too large (${stateStats.size} bytes)` : "not a regular file"}`,
        {
          level: "warn",
        },
      );
      getJobStateReadCache().noteRejected(jobDir, mtimeKey);
      return null;
    }
    let isUsableSidecar = (stats) => stats !== null && stats.isFile() && stats.size <= MAX_STATE_BYTES;
    sidecarsUsable = {
      order: isUsableSidecar(orderStats),
      stateOrder: isUsableSidecar(stateOrderStats),
      group: isUsableSidecar(groupStats),
    };
    mtimeKey = `${stateStats.mtimeMs}:${sidecarsUsable.order ? orderStats.mtimeMs : 0}:${sidecarsUsable.stateOrder ? stateOrderStats.mtimeMs : 0}:${sidecarsUsable.group ? groupStats.mtimeMs : 0}`;
  } catch (error) {
    if (isENOENT(error)) return noteStateAbsent(jobDir, options);
    logForDebugging(
      `[jobs] ${basename(jobDir)}: state.json stat failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    let cached = getJobStateReadCache().peek(jobDir);
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: cached !== undefined,
      });
    return stateOrNull(cached, options);
  }
  let cached = getJobStateReadCache().peek(jobDir);
  if (cached?.mtimeKey === mtimeKey) {
    getJobStateReadCache().noteHit(jobDir);
    return cached.state;
  }
  try {
    let [file, orderText, stateOrderText, groupText] = await Promise.all([
      readFile(statePath, "utf-8"),
      sidecarsUsable.order ? readFile(orderPath, "utf-8").catch(() => null) : Promise.resolve(null),
      sidecarsUsable.stateOrder ? readFile(stateOrderPath, "utf-8").catch(() => null) : Promise.resolve(null),
      sidecarsUsable.group ? readFile(groupPath, "utf-8").catch(() => null) : Promise.resolve(null),
    ]);
    let parsed = jsonParse(file);
    let validated = jobStateSchema().safeParse(parsed);
    if (!validated.success) {
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${validated.error.message}`,
        {
          level: "warn",
        },
      );
      if (getJobStateReadCache().shouldReportRejected(jobDir)) logEvent("tengu_bg_state_read_rejected", {});
      getJobStateReadCache().noteRejected(jobDir, mtimeKey);
      return null;
    }
    let sortOrder = orderText !== null ? Number(orderText) : undefined;
    let stateSortOrder = stateOrderText !== null ? Number(stateOrderText) : undefined;
    let shape = jobStateSchema().in.shape;
    let unknownEntries =
      parsed !== null && typeof parsed === "object"
        ? Object.entries(parsed).filter(([key]) => !Object.hasOwn(shape, key))
        : [];
    let merged = {
      ...Object.fromEntries(unknownEntries),
      ...validated.data,
    };
    if (Number.isFinite(sortOrder))
      merged = {
        ...merged,
        sortOrder,
      };
    if (Number.isFinite(stateSortOrder))
      merged = {
        ...merged,
        stateSortOrder,
      };
    if (groupText !== null && groupText.trim())
      merged = {
        ...merged,
        group: groupText.trim(),
      };
    if (merged.group !== undefined)
      merged = {
        ...merged,
        group: sanitizeGroupOrDefault(merged.group),
      };
    getJobStateReadCache().noteParsed(jobDir, mtimeKey, merged);
    return merged;
  } catch (error) {
    if (isENOENT(error)) return noteStateAbsent(jobDir, options);
    logForDebugging(
      `[jobs] ${basename(jobDir)}: state.json read/parse failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: cached !== undefined,
      });
    return stateOrNull(cached, options);
  }
}
//@ chunk-rmd7n4gq.js:36144-36364 placement
async function readJobStateAfterSettle(jobDir, storage) {
  invalidateJobStateCache(jobDir);
  let state = await readJobState(jobDir, storage).catch(() => null);
  if (
    state !== null &&
    state.state !== "done" &&
    state.state !== "stopped" &&
    state.state !== "blocked" &&
    state.state !== "failed"
  ) {
    await sleep(50);
    invalidateJobStateCache(jobDir);
    state = (await readJobState(jobDir, storage).catch(() => null)) ?? state;
  }
  return state;
}
//@ chunk-rmd7n4gq.js:36364-36405 placement
/**
 * 作业 pin 文件路径（jobs/pins.json）。
 */
function pinsFilePath() {
  return join(getJobsDir(), "pins.json");
}
//@ chunk-rmd7n4gq.js:36405-36417 placement
/**
 * pin 判定的陈旧时间（5000 毫秒）。
 */
var PIN_STALE_MS = 5000;
//@ chunk-rmd7n4gq.js:36417-36681 placement (2.1.88 match: getMcpAuthCache, 1)
/**
 * 读取 MCP 认证缓存（v5 存储）条目。
 */
async function readPinnedJobIds(storage) {
  if (storage) return readJobPinsFromStorage(storage);
  try {
    let stats = await lstat(pinsFilePath());
    if (!stats.isFile() || stats.size > MAX_STATE_BYTES) {
      if (!stats.isFile()) await removeBadPinsFile();
      return new Set();
    }
    return parsePinnedIds(await readFile(pinsFilePath(), "utf-8"));
  } catch (error) {
    if (isENOENT(error)) {
      await writeFileAtomic(pinsFilePath(), jsonStringify([])).catch((data) => {
        if (!isENOENT(data)) logJobWriteError(data);
      });
      return new Set();
    }
    return new Set();
  }
}
//@ chunk-rmd7n4gq.js:36681-36799 placement
async function readJobPinsFromStorage(storage) {
  let cappedStorageText = await readCappedStorageText(storage, STORAGE_SPACES.jobPins(), {
    cap: MAX_STATE_BYTES,
    screens: getJobPins(),
    screenKey: pinsFilePath(),
    heal: removeBadPinsFile,
  });
  return parsePinnedIds(cappedStorageText ?? undefined);
}
//@ chunk-rmd7n4gq.js:36799-36842 placement
/**
 * 取当前宿主的作业 pin 表。
 */
function getJobPins() {
  return jobPinsState.of(getRootSession().host).pins;
}
//@ chunk-rmd7n4gq.js:36842-37024 placement
function parsePinnedIds(text) {
  if (text === undefined || text.length > MAX_STATE_BYTES) return new Set();
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((id) => typeof id === "string"));
}
//@ chunk-rmd7n4gq.js:37024-37213 placement
async function removeBadPinsFile(options) {
  let stats = await lstat(pinsFilePath()).catch(() => {
    return;
  });
  if (stats === undefined || (stats.isFile() && !(options?.evenRegular && stats.size > MAX_STATE_BYTES)))
    return false;
  await rm(pinsFilePath(), {
    recursive: true,
    force: true,
  }).catch(() => {});
  return true;
}
//@ chunk-rmd7n4gq.js:37213-37523 placement
async function syncJobName(shortId, name, source, storageV5, matcher) {
  let jobDir = getJobDir(shortId);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return false;
  if (jobState.name === name) return true;
  invalidateJobStateCache(jobDir);
  let current = (await readJobState(jobDir, storageV5)) ?? jobState;
  if (current.name === name || (source === "auto" && current.name)) return true;
  if (!isAutoOrMatchingName(current, matcher)) return false;
  return writeStateAtomic(
    jobDir,
    {
      ...current,
      name,
      nameSource: source,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  ).then(
    () => true,
    (error) => {
      if (!isENOENT(error)) logJobWriteError(error);
      return false;
    },
  );
}
//@ chunk-rmd7n4gq.js:37523-37778 placement (2.1.88 match: updateSessionActivity, 0.701)
async function syncJobColor(ownJobShortId, effectiveAgentColor, storageV5) {
  let jobDir = getJobDir(ownJobShortId);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return false;
  if (jobState.color === effectiveAgentColor) return true;
  invalidateJobStateCache(jobDir);
  let current = (await readJobState(jobDir, storageV5)) ?? jobState;
  if (current.color === effectiveAgentColor) return true;
  return writeStateAtomic(
    jobDir,
    {
      ...current,
      color: effectiveAgentColor,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  ).then(
    () => true,
    (error) => {
      if (!isENOENT(error)) logJobWriteError(error);
      return false;
    },
  );
}
//@ chunk-rmd7n4gq.js:37778-37818 placement
function getBgRelocatedCwd() {
  return currentSessionStatusState().relocatedCwd;
}
//@ chunk-rmd7n4gq.js:37818-38191 placement
async function relocateBgSessionCwd(cwd, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  currentSessionStatusState().relocatedCwd = cwd;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
  let originCwd = jobState?.worktreePath ? jobState.originCwd : cwd;
  if (!jobState || (jobState.cwd === cwd && jobState.originCwd === originCwd)) return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let current = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    {
      ...current,
      cwd,
      originCwd: current.worktreePath ? current.originCwd : cwd,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  ).catch((error) => {
    if (!isENOENT(error)) logJobWriteError(error);
  });
}
//@ chunk-rmd7n4gq.js:38191-38534 placement
async function syncJobResumeSessionId(sessionId, transcriptPath, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (!jobState || (jobState.resumeSessionId === sessionId && jobState.linkScanPath === transcriptPath))
    return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let current = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    {
      ...current,
      resumeSessionId: sessionId,
      linkScanPath: transcriptPath,
      linkScanOffset: 0,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  ).catch((error) => {
    if (!isENOENT(error)) logJobWriteError(error);
  });
}
//@ chunk-rmd7n4gq.js:38534-39203 placement
/**
 * 后台任务把 in-flight 任务/种类写回 job 状态文件（仅 bg 会话、活跃期、有变化时）。
 */
async function syncLiveInFlightSnapshot(rows, storageV5, { includeSettled = false } = {}) {
  let jobDir = env.CLAUDE_JOB_DIR;
  if (!jobDir || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(jobDir);
    let jobState = await readJobState(jobDir, storageV5);
    if (!jobState?.inFlight || (isSettled(jobState) && !includeSettled) || jobState.tempo === "active")
      return;
    let inFlight = jobState.inFlight;
    if (
      rows.count === inFlight.tasks &&
      (rows.drainableMonitors ?? 0) === (inFlight.drainableMonitors ?? 0) &&
      rows.kinds.length === inFlight.kinds.length &&
      rows.kinds.every((kind) => inFlight.kinds.includes(kind))
    )
      return;
    await writeStateAtomic(
      jobDir,
      {
        ...jobState,
        inFlight: {
          tasks: rows.count,
          queued: inFlight.queued,
          kinds: [...rows.kinds],
          ...(rows.drainableMonitors !== undefined &&
            rows.drainableMonitors > 0 && {
              drainableMonitors: rows.drainableMonitors,
            }),
          ...(inFlight.wake !== undefined && {
            wake: inFlight.wake,
          }),
        },
        updatedAt: new Date().toISOString(),
      },
      storageV5,
    ).catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
  });
}
//@ chunk-rmd7n4gq.js:39203-39344 placement
function isAutoOrMatchingName(state, name) {
  if (name === undefined || !state.name) return true;
  if (state.nameSource === "auto" || state.nameSource === "collision") return true;
  return name.includes(sanitizeSessionTitle(state.name));
}
//@ chunk-rmd7n4gq.js:39344-40091 placement
async function syncRespawnFlag(flagName, extraFlags, flagValue, statePatch, storageV5, draftName, filter) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState?.respawnFlags) return;
    if (filter && !filter(jobState.respawnFlags)) return;
    let removedPrefixes = [flagName, ...extraFlags];
    let rebuildFlags = (respawnFlags) => {
      let kept = [];
      for (let idx = 0; idx < respawnFlags.length; idx++) {
        let flag = respawnFlags[idx];
        if (removedPrefixes.some((prefix) => flag === prefix || flag.startsWith(`${prefix}=`))) {
          if (flag.indexOf("=") === -1 && respawnFlags[idx + 1] !== undefined) idx++;
          continue;
        }
        kept.push(flag);
      }
      if (flagValue === null) return kept;
      return [...kept, ...flagArgs(flagName, flagValue)];
    };
    let nextFlags = rebuildFlags(jobState.respawnFlags);
    if (
      nextFlags.length === jobState.respawnFlags.length &&
      nextFlags.every((flag, index) => flag === jobState.respawnFlags[index])
    )
      return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let fresh = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
    let respawnFlags = fresh.respawnFlags ?? jobState.respawnFlags;
    if (filter && !filter(respawnFlags)) return;
    let renameAllowed = isAutoOrMatchingName(fresh, draftName);
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      {
        ...fresh,
        ...(renameAllowed ? statePatch : {}),
        respawnFlags: rebuildFlags(respawnFlags),
        updatedAt: new Date().toISOString(),
      },
      storageV5,
    ).catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
  });
}
//@ chunk-rmd7n4gq.js:40091-40533 placement
async function appendRespawnFlag(flag, value, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState?.respawnFlags) return;
    let pair = flagArgs(flag, value);
    for (let j = 0; j <= jobState.respawnFlags.length - pair.length; j++)
      if (pair.every((item, index) => jobState.respawnFlags[j + index] === item)) return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let current = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      {
        ...current,
        respawnFlags: [...(current.respawnFlags ?? []), ...pair],
        updatedAt: new Date().toISOString(),
      },
      storageV5,
    ).catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
  });
}
//@ chunk-rmd7n4gq.js:40533-40672 placement
async function replaceFileExclusive(path, content) {
  await rm(path, {
    force: true,
  });
  let tmpPath = await writeIfMissing(path, content);
  try {
    await retryFsOp(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, {
      force: true,
    }).catch(() => {});
    throw error;
  }
}
//@ chunk-rmd7n4gq.js:40672-40931 placement
async function writeJobSidecarToStorage(storage, key, content) {
  let result = await storage.write(key, content, {
    parent: "mustExist",
    mode: 438 & ~process.umask(),
  });
  if (!result.ok) {
    let code = storageErrorCode(result.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[jobs] v5 sidecar write failed: ${formatStorageError(result.error)}`,
        "[jobs] v5 sidecar write failed",
      ),
      code !== undefined
        ? {
            code,
          }
        : {},
    );
  }
}
//@ chunk-rmd7n4gq.js:40931-41070 placement
async function writeSortOrder(jobDir, sortOrder, storage) {
  let key = isStorageV5Enabled() && storage ? jobKeyFor(jobDir, ["order"]) : undefined;
  if (storage && key) await writeJobSidecarToStorage(storage, key, String(sortOrder));
  else await replaceFileExclusive(join(jobDir, "order"), String(sortOrder));
  invalidateJobStateCache(jobDir);
}
//@ chunk-rmd7n4gq.js:41070-41219 placement
async function writeStateSortOrder(jobDir, order, storage) {
  let key = isStorageV5Enabled() && storage ? jobKeyFor(jobDir, ["stateOrder"]) : undefined;
  if (storage && key) await writeJobSidecarToStorage(storage, key, String(order));
  else await replaceFileExclusive(join(jobDir, "stateOrder"), String(order));
  invalidateJobStateCache(jobDir);
}
//@ chunk-rmd7n4gq.js:41219-41528 placement
async function writeJobGroup(jobDir, group, storageV5) {
  let groupPath = join(jobDir, "group");
  let sanitized = sanitizeGroupOrDefault(group);
  let storageKey = isStorageV5Enabled() && storageV5 ? jobKeyFor(jobDir, ["group"]) : undefined;
  if (storageV5 && storageKey) {
    if (sanitized) await writeJobSidecarToStorage(storageV5, storageKey, sanitized);
    else {
      let result = await storageV5.delete(storageKey);
      if (!result.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[jobs] v5 sidecar delete failed: ${result.error.code}`,
          "[jobs] v5 sidecar delete failed",
        );
    }
  } else if (sanitized) await replaceFileExclusive(groupPath, sanitized);
  else
    await rm(groupPath, {
      force: true,
    });
  invalidateJobStateCache(jobDir);
}
//@ chunk-rmd7n4gq.js:41528-41816 placement (2.1.88 match: immediateFlushHistory, 0.303)
async function withSortOrderLock(fn) {
  let lockPath = join(getJobsDir(), ".order");
  await mkdir(getJobsDir(), {
    recursive: true,
  });
  await using lockHandle = await lock(lockPath, {
    realpath: false,
    stale: 5000,
    retries: {
      retries: 5,
      minTimeout: 20,
    },
    onCompromised: (entry) =>
      logForDebugging(`jobs/.order lock compromised (likely process suspend or slow fs): ${entry}`, {
        level: "error",
      }),
  });
  return await fn();
}
//@ chunk-rmd7n4gq.js:41816-41828 placement
/**
 * 作业状态/pin 写入的串行队列。
 */
var pinsWriteQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rmd7n4gq.js:41816", () => {
  pinsWriteQueue = createKeyedQueue();
});
//@ chunk-rmd7n4gq.js:41828-41878 placement
function withOwnJobStateWrite(fn) {
  return pinsWriteQueue.run("own-state.json", fn);
}
//@ chunk-rmd7n4gq.js:41878-42374 placement
function writeJobPinned(jobId, pinned, storageV5) {
  return pinsWriteQueue.run("pins.json", async () => {
    if (isStorageV5Enabled() && storageV5) return setJobPinnedInStorage(jobId, pinned, storageV5);
    let pinsPath = pinsFilePath();
    await mkdir(dirname(pinsPath), {
      recursive: true,
    });
    await using lockHandle = await lock(pinsPath, {
      realpath: false,
      stale: PIN_STALE_MS,
      retries: {
        retries: 5,
        minTimeout: 20,
      },
      onCompromised: (err) =>
        logForDebugging(`pins.json lock compromised (likely process suspend or slow fs): ${err}`, {
          level: "error",
        }),
    });
    let pinnedJobIds = await readPinnedJobIds();
    if (pinned ? pinnedJobIds.has(jobId) : !pinnedJobIds.has(jobId)) return;
    if (pinned) pinnedJobIds.add(jobId);
    else {
      pinnedJobIds.delete(jobId);
      await rm(join(getJobDir(jobId), "order")).catch((error) => {
        if (!isENOENT(error)) throw error;
      });
      invalidateJobStateCache(getJobDir(jobId));
    }
    await writeFileAtomic(pinsPath, jsonStringify([...pinnedJobIds], null, 2));
  });
}
//@ chunk-rmd7n4gq.js:42374-43302 placement
/**
 * 在存储中更新置顶作业列表（加入或移除）；文件异常时先清理；取消置顶后删除该作业的 order sidecar 并使状态缓存失效。
 */
async function setJobPinnedInStorage(jobId, pinned, storage) {
  let updatePins = (current) => {
    let pinnedIds = parsePinnedIds(current?.value);
    if (pinned ? pinnedIds.has(jobId) : !pinnedIds.has(jobId))
      return {
        skip: true,
        result: false,
      };
    if (pinned) pinnedIds.add(jobId);
    else pinnedIds.delete(jobId);
    return {
      write: jsonStringify([...pinnedIds], null, 2),
      result: true,
    };
  };
  let jobPins = getJobPins();
  let statResult = await storage.statMeta(STORAGE_SPACES.jobPins());
  if (statResult.ok && statResult.value.size > MAX_STATE_BYTES) {
    await removeBadPinsFile({
      evenRegular: true,
    });
    jobPins.delete(pinsFilePath());
  } else if (!statResult.ok && classifyStorageRejection(statResult.error) !== undefined) {
    await removeBadPinsFile();
    jobPins.delete(pinsFilePath());
  }
  let writeOptions = {
    publishDiscipline: "atomic",
    mode: 438 & ~process.umask(),
  };
  let updateResult = await storage.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!updateResult.ok && (await removeBadPinsFile()))
    updateResult = await storage.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!updateResult.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[jobs] v5 pins update failed: ${updateResult.error.code}`,
      "[jobs] v5 pins update failed",
    );
  if (!pinned && updateResult.value.result === true) {
    let orderKey = jobStoragePath(jobId, ["order"]);
    if (orderKey) {
      let deleteResult = await storage.delete(orderKey);
      if (!deleteResult.ok)
        logForDebugging(`[jobs] v5 order sidecar release failed after unpin: ${deleteResult.error.code}`, {
          level: "warn",
        });
    } else
      await rm(join(getJobDir(jobId), "order")).catch((error) => {
        if (!isENOENT(error))
          logForDebugging(`[jobs] order sidecar release failed after unpin: ${errorMessage(error)}`, {
            level: "warn",
          });
      });
    invalidateJobStateCache(getJobDir(jobId));
  }
}
//@ chunk-rmd7n4gq.js:43302-43699 placement
async function listJobs(crashed, storage, onUnavailable) {
  if (storage) return listJobsFromStorage(storage, crashed, onUnavailable);
  let entries;
  try {
    entries = await readdir(getJobsDir(), {
      withFileTypes: true,
    });
  } catch (error) {
    if (isUnavailableErrorCode(getErrnoCode(error))) onUnavailable?.();
    return [];
  }
  let [pinnedJobIds, jobs] = await Promise.all([
    readPinnedJobIds(),
    Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          let jobState = await readJobState(join(getJobsDir(), entry.name));
          return jobState
            ? {
                id: entry.name,
                state: jobState,
              }
            : null;
        }),
    ),
  ]);
  let mapped = jobs
    .filter((job) => job !== null)
    .map((job) =>
      pinnedJobIds.has(job.id)
        ? {
            ...job,
            state: {
              ...job.state,
              pinned: true,
            },
          }
        : job,
    );
  return crashed ? markCrashed(mapped, crashed) : mapped;
}
//@ chunk-rmd7n4gq.js:43699-44096 placement
/**
 * 分页列出存储中所有任务的 id。
 */
async function listStoredJobIds(storage) {
  let ids = [];
  let cursor;
  do {
    let page = await storage.listEntries(
      {
        namespace: "job",
      },
      cursor === undefined
        ? {
            skipScopeStats: true,
          }
        : {
            cursor,
            skipScopeStats: true,
          },
    );
    if (!page.ok)
      return {
        ok: false,
        error: page.error,
      };
    for (let item of page.value.items)
      if (
        item.kind === "scope" &&
        item.scope.namespace === "job" &&
        item.scope.jobId !== undefined &&
        item.scope.relPath === undefined &&
        isValidKeySegment(item.scope.jobId)
      )
        ids.push(item.scope.jobId);
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return {
    ok: true,
    ids,
  };
}
//@ chunk-rmd7n4gq.js:44096-44417 placement
/**
 * 列出存储中的全部作业及其状态，标记置顶；存储不可用时回调并返回空；需要时标记崩溃的作业。
 */
async function listJobsFromStorage(storage, crashed, onUnavailable) {
  let listing = await listStoredJobIds(storage);
  if (!listing.ok) {
    if (isUnavailableError(listing.error)) onUnavailable?.();
    return [];
  }
  let ids = listing.ids;
  let [pinnedJobIds, states] = await Promise.all([
    readPinnedJobIds(storage),
    Promise.all(
      ids.map(async (id) => {
        let jobState = await readJobState(getJobDir(id), storage);
        return jobState
          ? {
              id,
              state: jobState,
            }
          : null;
      }),
    ),
  ]);
  let mapped = states
    .filter((entry) => entry !== null)
    .map((entry) =>
      pinnedJobIds.has(entry.id)
        ? {
            ...entry,
            state: {
              ...entry.state,
              pinned: true,
            },
          }
        : entry,
    );
  return crashed ? markCrashed(mapped, crashed) : mapped;
}
//@ chunk-rmd7n4gq.js:44417-44648 placement
function markCrashed(rows, crashedIds) {
  let now = Date.now();
  return rows.map((row) => {
    if (isSettled(row.state)) return row;
    if (crashedIds.has(row.id)) return row;
    if (row.state.keptBy !== undefined && isKeptIdleBlocked(row.state)) return row;
    if (now - Date.parse(row.state.createdAt) < PIN_GUARD_MS) return row;
    return {
      ...row,
      state: markJobFailedOrBlocked(row.state),
    };
  });
}
//@ chunk-rmd7n4gq.js:44648-44660 placement
/**
 * keptBy 状态的保护时长（5000 毫秒）。
 */
var PIN_GUARD_MS = 5000;
//@ chunk-rmd7n4gq.js:44660-44848 placement
function markJobFailedOrBlocked(state) {
  if (hasOutstandingAsk(state))
    return {
      ...state,
      tempo: "blocked",
      inFlight: undefined,
    };
  return {
    ...state,
    state: "failed",
    tempo: "idle",
    needs: undefined,
    block: undefined,
    inFlight: undefined,
    detail: stripSuffix(state.detail, "; respawning"),
  };
}
//@ chunk-rmd7n4gq.js:44848-44901 placement
var SEED_DETAIL = "starting\u2026";
var IDLE_NEEDS = "send a prompt to start";
//@ chunk-rmd7n4gq.js:44901-44967 placement
function isOverlayNeeds(row) {
  return row.needs !== undefined && row.needsOverlay === row.needs;
}
//@ chunk-rmd7n4gq.js:44967-45107 placement
/**
 * 后台服务未运行期间结束时的说明文案。
 */
var IDLE_DETAIL = `(idle \u2014 ${IDLE_NEEDS})`;
var PRE_BOOT_STATES = ["starting", "resuming", "adopted", "crashed"];
var ABANDONED_WORKER_MS = 172800000;
var SERVICE_OFF_END_DETAIL = "ended while the background service was off";
//@ chunk-rmd7n4gq.js:45107-46286 placement
function makeInitialState(seed) {
  let iso = new Date().toISOString();
  return {
    state: "working",
    detail: seed.detail !== undefined ? redactSecrets(seed.detail) : SEED_DETAIL,
    tempo: seed.tempo ?? "active",
    needs: seed.needs,
    inFlight: seed.inFlight,
    output: null,
    children: null,
    linkScanOffset: 0,
    linkScanPath: seed.linkScanPath,
    template: seed.template.name,
    routine: seed.routine,
    respawnFlags: seed.respawnFlags ?? [],
    bgIsolation: seed.bgIsolation,
    providerEnv: seed.providerEnv && resolveForwardedEnvPaths(seed.providerEnv, seed.cwd),
    sessionPermissionRules: seed.sessionPermissionRules,
    memoryToggledOff: seed.memoryToggledOff,
    autoMemoryOffThisSession: seed.autoMemoryOffThisSession,
    forkSourceAlive: seed.forkSourceAlive,
    forkBoundaryAt: seed.forkBoundaryAt,
    forkSessionId: seed.forkSessionId,
    forkParentSessionId: seed.forkParentSessionId,
    interactiveLineage: seed.interactiveLineage,
    intent: seed.intent,
    displayIntent: seed.displayIntent,
    name: seed.name,
    nameSource: seed.nameSource,
    color: getEffectiveAgentColor({
      userOverride: seed.color,
      agentDefinitionColor: seed.template.color,
    }),
    initialPrompt: seed.template.initialPrompt,
    sessionId: seed.sessionId,
    resumeSessionId: seed.sessionId,
    daemonShort: seed.sessionId.slice(0, 8),
    cwd: seed.cwd,
    createdAt: iso,
    updatedAt: iso,
    firstTerminalAt: null,
    worktreePath: seed.worktreePath,
    worktreeBranch: seed.worktreeBranch,
    worktreeHookBased: seed.worktreeHookBased,
    originCwd: seed.originCwd,
    backend: "daemon",
  };
}
//@ chunk-rmd7n4gq.js:46286-48017 placement
async function adoptRosterOrphans(jobs, rosterOrphans, storageV5) {
  if (rosterOrphans.length === 0) return jobs;
  let knownIds = new Set(jobs.map((job) => job.id));
  let filtered = rosterOrphans.filter(
    (orphan) =>
      SHORT_ID_RE.test(orphan.short) &&
      !knownIds.has(orphan.short) &&
      orphan.source !== "spare" &&
      !orphan.dying,
  );
  if (filtered.length === 0) return jobs;
  let roster = await readRoster(
    {
      silent: true,
    },
    storageV5,
  );
  let results = await Promise.all(
    filtered.map((orphan) => {
      let worker = roster.workers[orphan.short];
      return checkProcessLiveness(orphan.pid, worker?.pid === orphan.pid ? worker.procStart : undefined);
    }),
  );
  for (let [index, orphan] of filtered.entries())
    if (results[index] !== "live") {
      logForDebugging(`[adoptRosterOrphans] pruned dead record ${orphan.short} (${results[index]})`);
      if (getJobStateReadCache().shouldReportPruned(orphan.short))
        logEvent("tengu_bg_roster_orphan_pruned", {
          reason: fromEnum(results[index] ?? "dead_pid"),
        });
    } else getJobStateReadCache().notePruneCandidateLive(orphan.short);
  let filtered_2 = filtered.filter((orphan, index) => results[index] === "live");
  if (filtered_2.length === 0) return jobs;
  let mapped = filtered_2.map((orphan) => {
    let state = {
      ...makeInitialState({
        template: {
          name: orphan.agent ?? "bg",
          description: "",
        },
        routine: orphan.routine,
        intent: orphan.intent,
        name: orphan.name,
        detail: orphan.detail,
        ...(orphan.tempo === "active" &&
        (orphan.state === "running" || PRE_BOOT_STATES.includes(orphan.state))
          ? orphan.routine
            ? {
                tempo: "idle",
              }
            : {
                tempo: "blocked",
                needs: IDLE_NEEDS,
              }
          : {
              tempo: orphan.tempo,
              needs: orphan.needs,
            }),
        sessionId: stripLongPathPrefixes(orphan.sessionId),
        cwd: stripLongPathPrefixes(orphan.cwd),
        worktreePath:
          orphan.worktreePath === undefined ? undefined : stripLongPathPrefixes(orphan.worktreePath),
      }),
      createdAt: new Date(orphan.createdAt ?? orphan.startedAt).toISOString(),
      daemonShort: orphan.short,
      state: PRE_BOOT_STATES.includes(orphan.state) ? "working" : orphan.state,
      ...(isTerminal(orphan.state) && {
        inFlight: {
          tasks: 0,
          queued: 0,
          kinds: [],
        },
      }),
    };
    let jobDir = getJobDir(orphan.short);
    let stateKey = storageV5 ? jobStoragePath(orphan.short, [STATE_JSON]) : undefined;
    if (storageV5 && stateKey)
      storageV5
        .write(stateKey, jsonStringify(state), {
          precondition: {
            type: "ifAbsent",
          },
          mode: 384,
        })
        .then((writeResult) => {
          if (writeResult.ok) logEvent("tengu_bg_roster_orphan_adopted", {});
          else if (writeResult.error.code !== "AlreadyExists")
            logJobWriteError(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `[jobs] v5 orphan seed write failed: ${writeResult.error.code}`,
                "[jobs] v5 orphan seed write failed",
              ),
            );
        });
    else
      mkdir(jobDir, {
        recursive: true,
      })
        .then(() => writeNewFile(join(jobDir, "state.json"), jsonStringify(state), 384))
        .then(() => logEvent("tengu_bg_roster_orphan_adopted", {}))
        .catch((error) => {
          if (getErrnoCode(error) !== "EEXIST") logJobWriteError(error);
        });
    return {
      id: orphan.short,
      state,
    };
  });
  return [...jobs, ...mapped];
}
//@ chunk-rmd7n4gq.js:48017-48139 placement (2.1.88 match: fetchInstallCountsFromGitHub, 0.628)
/**
 * 任务状态 done/failed/stopped → success/failure/stopped。名字配错，见 lead 建议。
 */
function terminalOutcome(state) {
  if (state === "done") return "success";
  if (state === "failed") return "failure";
  if (state === "stopped") return "stopped";
  return null;
}
//@ chunk-rmd7n4gq.js:48139-48174 placement
function isTerminal(state) {
  return terminalOutcome(state) !== null;
}
//@ chunk-rmd7n4gq.js:48174-48228 placement
function isSettled(state) {
  return isTerminal(state.state) && state.tempo !== "active";
}
//@ chunk-rmd7n4gq.js:48228-48307 placement
/**
 * 判断状态是否为“被保留但空闲阻塞”。
 */
function isKeptIdleBlocked(state) {
  return state.intent === "" && state.needs === IDLE_NEEDS && state.tempo === "blocked" && !isSettled(state);
}
//@ chunk-rmd7n4gq.js:48307-48376 placement
function isExecLaunch(state) {
  return state.template === "exec" && state.respawnFlags.length === 0;
}
//@ chunk-rmd7n4gq.js:48376-48427 placement
function hasOutstandingAsk(state) {
  return state.state === "blocked" && !isExecLaunch(state);
}
//@ chunk-rmd7n4gq.js:48427-48479 placement
function isLocalDaemonAgent(state) {
  return state.backend === "daemon" && !isExecLaunch(state);
}
//@ chunk-rmd7n4gq.js:48479-48595 placement
function spawnOrigin(state) {
  let origin =
    state.originCwd || (state.cwd.match(/^(.+?)[/\\]\.claude[/\\]worktrees[/\\]/)?.[1] ?? state.cwd);
  return stripLongPathPrefixes(origin);
}
//@ chunk-rmd7n4gq.js:48595-48709 placement
function jobMatchesCwd(state, cwdFilter) {
  if (state.backend === "remote") return true;
  let rel = relative(cwdFilter, spawnOrigin(state));
  return rel.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(rel);
}
//@ chunk-rmd7n4gq.js:48709-48823 placement
function isLoopJob(state) {
  let isLoop = (text) => text?.trim().toLowerCase().startsWith("/loop") ?? false;
  return isLoop(state.intent) || isLoop(state.initialPrompt);
}
//@ chunk-rmd7n4gq.js:48823-48939 placement
function isSelfDriving(state) {
  return (
    state.routine !== undefined ||
    state.selfWake === true ||
    (state.inFlight?.kinds.includes("session_cron") ?? false) ||
    isLoopJob(state)
  );
}
//@ chunk-rmd7n4gq.js:48939-49708 placement
function writeReapedTerminalState(shortId, kind, detail, options, storageV5) {
  let jobDir = getJobDir(shortId);
  return readJobState(jobDir, storageV5)
    .then(async (jobState) => {
      if (!jobState || isSettled(jobState) || (kind === "failed" && hasOutstandingAsk(jobState)))
        return "none";
      let now = Date.now();
      let iso = new Date(now).toISOString();
      let deadEpoch =
        options?.resumable === "auto-resume" &&
        kind === "failed" &&
        !isExecLaunch(jobState) &&
        now - Date.parse(jobState.updatedAt) > ABANDONED_WORKER_MS;
      await writeStateAtomic(
        jobDir,
        {
          ...jobState,
          state: deadEpoch ? "stopped" : kind === "crashed" ? "failed" : kind,
          detail: deadEpoch
            ? SERVICE_OFF_END_DETAIL
            : kind === "stopped"
              ? "stopped"
              : kind === "failed"
                ? stripSuffix(jobState.detail || detail, "; respawning")
                : detail,
          tempo: "idle",
          inFlight: undefined,
          needs: undefined,
          updatedAt: iso,
          firstTerminalAt: jobState.firstTerminalAt ?? (deadEpoch ? jobState.updatedAt : iso),
          lastTerminalAt: deadEpoch ? jobState.updatedAt : iso,
          ...(options?.resumable === "auto-resume" &&
            kind === "failed" &&
            (deadEpoch
              ? {
                  deadEpochReapedAt: iso,
                }
              : {
                  reapedMidWorkAt: jobState.updatedAt,
                })),
          ...(options?.resumable === "wake-only" &&
            kind === "failed" && {
              reapedUnsettledAt: jobState.updatedAt,
            }),
        },
        storageV5,
      );
      return deadEpoch ? "dead-epoch" : "settled";
    })
    .catch((error) => {
      logJobWriteError(error);
      return "none";
    });
}
export {
  getJobDir,
  readJobState,
  writeStateAtomic,
  logJobWriteError,
  getJobsDir,
  readCappedStorageText,
  jobPinsState,
  syncRespawnFlag,
  jobsDir,
  JOB_PARENT_TRANSCRIPT_FILE,
  syncJobName,
  getOwnJobShortId,
  readPinnedJobIds,
  readJobStateFreshOrNull,
  isSettled,
  syncJobColor,
  jobStorageSpace,
  buildBridgeReattachEnv,
  resolveBridgeHandoffIdentity,
  terminalOutcome,
  SEED_DETAIL,
  hasOutstandingAsk,
  invalidateJobStateCache,
  isTerminal,
  isExecLaunch,
  readJobStateAfterSettle,
  listJobs,
  readJobStateOrAbsent,
  writeReapedTerminalState,
  IDLE_NEEDS,
  isOverlayNeeds,
  writeJobPinned,
  UNGROUPED,
  EARLIER,
  jobMatchesCwd,
  spawnOrigin,
  isReservedGroupName,
  isLoopJob,
  isLocalDaemonAgent,
  isSelfDriving,
  IDLE_DETAIL,
  adoptRosterOrphans,
  watchJobDirOnce,
  markCrashed,
  withSortOrderLock,
  writeSortOrder,
  writeStateSortOrder,
  makeInitialState,
  sanitizeGroupName,
  writeJobGroup,
  syncLiveInFlightSnapshot,
  jobStateKey,
  isOwnStateWriteInFlight,
  jobKeyFor,
  ABANDONED_WORKER_MS,
  relocateBgSessionCwd,
  PRE_BOOT_STATES,
  appendRespawnFlag,
  getBgRelocatedCwd,
  syncJobResumeSessionId,
  withOwnJobStateWrite,
};
