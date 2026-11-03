/**
 * services/daemon/jobState.ts
 *
 * 2.1.316 新增：后台任务状态存储
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (91)
 * attribution: placement 91
 */
import { isAbsolute, basename, join, dirname, relative } from "path";
import { lstat, readFile, rm, mkdir, readdir } from "fs/promises";
import { stripIgnorables } from "../../utils/sanitization.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  string,
  u,
  _enum,
  E,
  array,
  literal,
  M,
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
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isUuidShaped } from "../../utils/sessionStoragePortable.js";
import { jobsDir, jobStorageSpace } from "../analytics/metadata.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
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

//@ chunk-y162pn60.js:21307-21397 placement
/**
 * 保留的分组名（pinned/ungrouped/past 及带括号显示名）。
 */
var UNGROUPED = "(ungrouped)";
var EARLIER = "(earlier)";
var MAX_GROUP_NAME_CHARS = 64;
var RESERVED_GROUP_NAMES = new Set(["pinned", "ungrouped", UNGROUPED, "past", EARLIER]);
//@ chunk-y162pn60.js:21397-21444 placement
function isReservedGroupName(e) {
  return RESERVED_GROUP_NAMES.has(e.toLowerCase());
}
//@ chunk-y162pn60.js:21444-21485 placement
function sanitizeGroupName(e) {
  return stripIgnorables(e).slice(0, MAX_GROUP_NAME_CHARS);
}
//@ chunk-y162pn60.js:21485-21561 placement
/**
 * 清洗分组名，保留名或空名返回 undefined。
 */
function sanitizeGroupOrDefault(group) {
  if (group === undefined) return;
  let n = sanitizeGroupName(group);
  return n && !isReservedGroupName(n) ? n : undefined;
}
//@ chunk-y162pn60.js:21561-22443 placement
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
  peek(e) {
    return this.#e.get(e);
  }
  invalidate(e) {
    this.#e.delete(e);
  }
  noteAbsent(e) {
    this.#e.delete(e);
    this.#t.delete(e);
    this.#n.delete(e);
  }
  noteRejected(e, mtimeKey) {
    this.#e.set(e, {
      mtimeKey,
      state: null,
    });
  }
  noteParsed(e, mtimeKey, state) {
    if (this.#e.size > 1000) this.#e.clear();
    this.#e.set(e, {
      mtimeKey,
      state,
    });
    this.#t.delete(e);
    this.#n.delete(e);
  }
  noteHit(e) {
    this.#t.delete(e);
  }
  shouldReportTransient(e) {
    if (this.#t.has(e)) return false;
    this.#t.add(e);
    return true;
  }
  shouldReportRejected(e) {
    if (this.#n.has(e)) return false;
    this.#n.add(e);
    return true;
  }
  shouldReportRecovered(e) {
    if (this.#r.has(e)) return false;
    this.#r.add(e);
    return true;
  }
  noteCleanRead(e) {
    this.#r.delete(e);
  }
  shouldReportPruned(e) {
    if (this.#o.has(e)) return false;
    this.#o.add(e);
    return true;
  }
  notePruneCandidateLive(e) {
    this.#o.delete(e);
  }
  shouldLogSidecarFallback(e) {
    if (this.#i.has(e)) return false;
    this.#i.add(e);
    return true;
  }
}
//@ chunk-y162pn60.js:22443-22468 placement
/**
 * 按宿主保存的作业状态读取缓存。
 */
var jobStateReadCache = new HostScoped(() => new JobStateReadCache());
//@ chunk-y162pn60.js:22468-22505 placement
/**
 * 按会话保存的作业 pin/draft 表。
 */
class JobPins {
  drafts = new Map();
  pins = new Map();
}
//@ chunk-y162pn60.js:22505-22531 placement
/**
 * 作业 pin 状态的宿主作用域单例。
 */
var jobPinsState = new HostScoped(() => new JobPins());
//@ chunk-y162pn60.js:22531-22993 placement
/**
 * 从存储读取不超过上限的文本：首次先查元数据（不存在、出错或超限时标记并可修复），读取失败清除标记；超限返回 null。
 */
async function readCappedStorageText(e, n, { cap, screens, screenKey, heal }) {
  if (screens.get(screenKey) !== "ok") {
    let y = await e.statMeta(n);
    if (!y.ok) {
      if (y.error.code !== "NotFound") {
        screens.set(screenKey, "refused");
        await heal?.();
      }
      return null;
    }
    if (y.value.size > cap) {
      screens.set(screenKey, "refused");
      return null;
    }
    screens.set(screenKey, "ok");
  }
  let text = await e.readText([
    {
      key: n,
      offset: 0,
      length: cap + 1,
    },
  ]);
  if (!text.ok) {
    screens.delete(screenKey);
    await heal?.();
    return null;
  }
  let S = text.value.items[0];
  if (!S.found) return null;
  if (S.totalBytes > cap) {
    screens.set(screenKey, "refused");
    return null;
  }
  return S.value;
}
//@ chunk-y162pn60.js:22993-23084 placement
/**
 * 桥接会话 id 的正则（cse_/session_ 前缀）。
 */
var pathStringSchema = () => string().transform(stripLongPathPrefixes);
var SHORT_ID_RE = /^[a-f0-9]{8}$/;
var BRIDGE_SESSION_ID_RE = /^(cse_|session_)[A-Za-z0-9_-]{1,128}$/;
//@ chunk-y162pn60.js:23084-23213 placement
function makeFieldValidator(e, n) {
  return (r) => {
    if (n(r)) return r;
    logForDebugging(`[jobs] dropped malformed ${e} from persisted job state`, {
      level: "warn",
    });
    return;
  };
}
//@ chunk-y162pn60.js:23213-27221 placement
/**
 * 单个作业状态文件的最大字节数（10000）。
 */
var jobStateSchema = DoctorLazy(() =>
  u({
    state: string(),
    detail: string(),
    tempo: _enum(["active", "idle", "blocked"]).optional().catch(undefined),
    inFlight: u({
      tasks: E(),
      queued: E(),
      kinds: array(string()),
      drainableMonitors: E().int().nonnegative().optional(),
      wake: u({
        at: E().optional(),
        reason: string().optional(),
        fires: E().int().nonnegative(),
        keepalive: literal(true).optional(),
      })
        .optional()
        .catch(undefined),
    }).optional(),
    selfWake: M().optional().catch(undefined),
    fan: array(
      u({
        id: string().optional(),
        kind: _enum(["agent", "workflow", "shell", "monitor", "mcp", "todo"]).optional().catch(undefined),
        label: string(),
        startedAt: E().optional(),
        doneAt: E().optional(),
        failed: M().optional(),
        group: string().optional(),
      }),
    ).optional(),
    tokens: E().optional(),
    needs_you: M().optional(),
    needs: string().optional(),
    block: u({
      questions: array(
        u({
          question: string(),
          options: array(
            u({
              label: string(),
              description: string(),
            }),
          ),
        }),
      ),
    }).optional(),
    suggestedReply: string().optional(),
    needsOverlay: string().optional(),
    output: record(string(), string()).nullable().default(null),
    structuredResult: record(string(), unknown()).optional(),
    children: array(
      u({
        id: string(),
        href: string(),
        kind: _enum(["pr", "frame"]).optional().catch(undefined),
        title: string().optional().catch(undefined),
      }),
    )
      .nullable()
      .default(null),
    linkScanOffset: E().default(0),
    linkScanPath: pathStringSchema()
      .transform(
        makeFieldValidator(
          "linkScanPath",
          (e) => isAbsolute(e) && e.endsWith(".jsonl") && normalizeUuidOrNull(basename(e, ".jsonl")) !== null,
        ),
      )
      .optional(),
    template: string(),
    routine: string().optional(),
    respawnFlags: array(string())
      .default([])
      .transform((e) => stripForwardedFlags(dropOverriddenSkipPermissions(splitForwardableArgs(e)))),
    bgIsolation: _enum(["none", "worktree"]).optional().catch(undefined),
    providerEnv: record(string(), string())
      .transform((e) => {
        let n = filterBackgroundEnv(xr(e, stripLongPathPrefixes));
        return n && keepForwardableEnv(n, "the saved job state (state.json providerEnv)");
      })
      .optional(),
    sessionPermissionRules: u({
      allow: array(string()),
      deny: array(string()),
      addDirs: array(pathStringSchema()).optional(),
    }).optional(),
    memoryToggledOff: M().optional(),
    autoMemoryOffThisSession: M().optional(),
    forkSourceAlive: M().optional(),
    forkBoundaryAt: string().optional(),
    forkSessionId: string().optional(),
    forkParentSessionId: string().optional(),
    interactiveLineage: M().optional(),
    intent: string(),
    displayIntent: string().optional(),
    initialPrompt: string().optional(),
    queuedPrompt: string().optional(),
    name: string().optional(),
    nameSource: _enum(["user", "auto", "collision"]).optional().catch(undefined),
    color: string().optional(),
    sessionId: pathStringSchema(),
    resumeSessionId: string()
      .transform(makeFieldValidator("resumeSessionId", (e) => normalizeUuidOrNull(e) !== null))
      .optional(),
    daemonShort: string()
      .transform(makeFieldValidator("daemonShort", (e) => SHORT_ID_RE.test(e)))
      .optional(),
    cliVersion: string().optional(),
    cwd: pathStringSchema(),
    createdAt: string(),
    updatedAt: string(),
    firstTerminalAt: string().nullable().default(null),
    lastTerminalAt: string().optional(),
    worktreePath: pathStringSchema().optional(),
    worktreeBranch: string().optional(),
    worktreeHookBased: M().optional(),
    originCwd: pathStringSchema().optional(),
    bridgeSessionId: string()
      .transform(makeFieldValidator("bridgeSessionId", (e) => BRIDGE_SESSION_ID_RE.test(e)))
      .optional(),
    bridgeOwnerAccountUuid: string().optional(),
    bridgeOwnerOrganizationUuid: string().optional(),
    bridgeNoHistoryBackfill: M().optional(),
    bridgeOutboundOnly: M().optional(),
    bridgeSessionGroupingId: string()
      .transform(makeFieldValidator("bridgeSessionGroupingId", (e) => /^sgrp_[A-Za-z0-9_]{1,128}$/.test(e)))
      .optional(),
    bridgeSessionSeq: E()
      .transform(makeFieldValidator("bridgeSessionSeq", (e) => Number.isInteger(e) && e >= 0))
      .optional(),
    backend: _enum(["daemon", "peer", "remote"])
      .catch("daemon")
      .default("daemon")
      .transform((e) => {
        if (e === "daemon") return e;
        logForDebugging(
          `[jobs] coerced persisted backend '${e}' to 'daemon' \u2014 peer/remote rows are never written to disk`,
          {
            level: "warn",
          },
        );
        return "daemon";
      }),
    sock: string().optional(),
    pid: E().optional(),
    keptBy: u({
      pid: E().int().positive(),
      procStart: string().max(64).optional(),
    }).optional(),
    sortOrder: E().optional(),
    stateSortOrder: E().optional(),
    group: string().optional(),
    pinned: M().optional(),
    reapedMidWorkAt: string().optional(),
    reapedUnsettledAt: string().optional(),
    deadEpochReapedAt: string().optional(),
    sessionIdTaken: M().optional().catch(undefined),
    replayOwed: M().optional().catch(undefined),
  }).transform(({ needs_you: needsYou, ...n }) => {
    let r =
      (n.bridgeOwnerAccountUuid !== undefined && !isUuidShaped(n.bridgeOwnerAccountUuid)) ||
      (n.bridgeOwnerOrganizationUuid !== undefined && !isUuidShaped(n.bridgeOwnerOrganizationUuid));
    let s = n.tempo ?? (needsYou ? "blocked" : "idle");
    return {
      ...n,
      ...(r && {
        bridgeOwnerAccountUuid: undefined,
        bridgeOwnerOrganizationUuid: undefined,
      }),
      tempo: s,
      ...(n.lastTerminalAt === undefined &&
        terminalOutcome(n.state) !== null &&
        s !== "active" && {
          lastTerminalAt: n.firstTerminalAt || n.updatedAt,
        }),
    };
  }),
);
var STATE_JSON = "state.json";
var MAX_STATE_BYTES = 8388608;
//@ chunk-y162pn60.js:27221-27248 placement
function getJobsDir() {
  return jobsDir();
}
//@ chunk-y162pn60.js:27248-27280 placement
function getJobDir(e) {
  return join(getJobsDir(), e);
}
//@ chunk-y162pn60.js:27280-27391 placement
function getOwnJobShortId() {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (CLAUDE_JOB_DIR) return basename(CLAUDE_JOB_DIR);
  let bgTakeover = getBgTakeover();
  if (bgTakeover) return basename(bgTakeover.jobDir);
  return getSessionId().slice(0, 8);
}
//@ chunk-y162pn60.js:27391-27440 placement
/**
 * 某作业某文件的存储路径（key 不合法时返回 undefined）。
 */
function jobStoragePath(e, n) {
  return isValidKeySegment(e) ? STORAGE_SPACES.job(e, n) : undefined;
}
//@ chunk-y162pn60.js:27440-27474 placement
function jobKeyFor(e, n) {
  return jobStorageSpace(e, n);
}
//@ chunk-y162pn60.js:27474-27512 placement
function jobStateKey(jobId) {
  return STORAGE_SPACES.job(jobId, [STATE_JSON]);
}
//@ chunk-y162pn60.js:27512-27821 placement
function watchJobDirOnce(e, n) {
  let r = join(getJobDir(e), STATE_JSON);
  let s = false;
  let f = Number.NaN;
  function m(mtimeMs) {
    if (s) return;
    if (Number.isNaN(f)) {
      f = mtimeMs;
      return;
    }
    if (mtimeMs === f) return;
    h();
    n();
  }
  function g() {
    lstat(r).then(
      (w) => m(w.mtimeMs),
      () => m(-1),
    );
  }
  g();
  let interval = setInterval(g, 200);
  let timer = setTimeout(h, 1e4);
  function h() {
    if (s) return;
    s = true;
    clearInterval(interval);
    clearTimeout(timer);
  }
  return h;
}
//@ chunk-y162pn60.js:27821-27869 placement
function isOwnStateWriteInFlight() {
  return currentSessionStatusState().ownStateWriteDepth > 0;
}
//@ chunk-y162pn60.js:27869-28586 placement
async function writeStateAtomic(jobDir, n, r) {
  let s = n.inFlight?.kinds.includes("session_cron") === true;
  let f =
    s && !n.selfWake && isSessionCronOnlyWake(n.inFlight)
      ? {
          ...n,
          selfWake: true,
        }
      : !s && n.selfWake && isSettled(n)
        ? {
            ...n,
            selfWake: undefined,
          }
        : n;
  let g = isSettled(f)
    ? f.lastTerminalAt
      ? f
      : {
          ...f,
          lastTerminalAt: f.updatedAt,
        }
    : f.lastTerminalAt !== undefined
      ? {
          ...f,
          lastTerminalAt: undefined,
        }
      : f;
  let { pinned, sortOrder, stateSortOrder, group, ...x } = g;
  let F = r ? jobKeyFor(jobDir, [STATE_JSON]) : undefined;
  let O = currentSessionStatusState();
  O.ownStateWriteDepth++;
  try {
    if (r && F) {
      let P = await r.write(F, jsonStringify(x, null, 2), {
        mode: 384,
        parent: "mustExist",
      });
      if (!P.ok) {
        let v = storageErrorCode(P.error);
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[jobs] v5 state write failed: ${formatStorageError(P.error)}`,
            "[jobs] v5 state write failed",
          ),
          v !== undefined
            ? {
                code: v,
              }
            : {},
        );
      }
    } else await writeFileAtomic(join(jobDir, STATE_JSON), jsonStringify(x, null, 2), 384);
  } finally {
    O.ownStateWriteDepth--;
    invalidateJobStateCache(jobDir);
  }
}
//@ chunk-y162pn60.js:28586-28721 placement
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
//@ chunk-y162pn60.js:28721-28972 placement
function resolveBridgeHandoffIdentity(replBridgeHandle, currentSessionBridge) {
  let r = currentSessionBridge !== undefined && currentSessionBridge.id === replBridgeHandle?.bridgeSessionId;
  return {
    ownerAccountUuid: r ? currentSessionBridge.ownerAccountUuid : undefined,
    ownerOrganizationUuid: r ? currentSessionBridge.ownerOrganizationUuid : undefined,
    noHistoryBackfill:
      replBridgeHandle?.noHistoryBackfill ||
      (currentSessionBridge !== undefined && !r ? true : currentSessionBridge?.noHistoryBackfill),
  };
}
//@ chunk-y162pn60.js:28972-29441 placement
function buildBridgeReattachEnv(bridgeSessionId, n, r, s, bridgeHandoffIdentity) {
  if (!bridgeSessionId) return;
  let m = {
    CLAUDE_BRIDGE_REATTACH_SESSION: bridgeSessionId,
  };
  if (n !== undefined && n > 0) m.CLAUDE_BRIDGE_REATTACH_SEQ = String(n);
  if (s) m.CLAUDE_BRIDGE_REATTACH_GROUPING = s;
  if (bridgeHandoffIdentity?.ownerAccountUuid)
    m.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT = bridgeHandoffIdentity.ownerAccountUuid;
  if (bridgeHandoffIdentity?.ownerOrganizationUuid)
    m.CLAUDE_BRIDGE_REATTACH_OWNER_ORG = bridgeHandoffIdentity.ownerOrganizationUuid;
  if (bridgeHandoffIdentity?.noHistoryBackfill) m.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL = "1";
  if (r !== false) m.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY = "1";
  return m;
}
//@ chunk-y162pn60.js:29441-29477 placement
/**
 * 取当前宿主的作业状态读取缓存。
 */
function getJobStateReadCache() {
  return jobStateReadCache.of(getRootSession().host);
}
//@ chunk-y162pn60.js:29477-29547 placement
/**
 * 取缓存的状态对象，读失败策略为 null 时返回 null。
 */
function stateOrNull(e, options) {
  return options?.onReadFailure === "null" ? null : (e?.state ?? null);
}
//@ chunk-y162pn60.js:29547-29601 placement
/**
 * 表示“不是普通文件”的错误码集合。
 */
var RETRY_BACKOFF_MS = [15, 45];
var NON_REGULAR_ERROR_CODES = new Set(["ELOOP", "ENXIO", "EISDIR"]);
//@ chunk-y162pn60.js:29601-29768 placement
function classifyStorageRejection(error) {
  if (error.code !== "Failed" || error.telemetryCode === undefined) return;
  if (error.telemetryCode === "EFBIG") return "oversize";
  return NON_REGULAR_ERROR_CODES.has(error.telemetryCode) ? "non-regular" : undefined;
}
//@ chunk-y162pn60.js:29768-29872 placement
function isSidecarReadFailure(e) {
  return (
    e.code === "Failed" && e.key !== undefined && e.key.namespace === "job" && e.key.relPath[0] !== STATE_JSON
  );
}
//@ chunk-y162pn60.js:29872-29929 placement
/**
 * 不计入失败统计的失败分类（invariant、permission、environment）。
 */
var NON_COUNTED_FAILURE_CLASSES = new Set(["invariant", "permission", "environment"]);
//@ chunk-y162pn60.js:29929-30053 placement
function isTransientStorageError(error) {
  if (error.code === "Unavailable") return true;
  return (
    error.code === "Failed" &&
    !NON_COUNTED_FAILURE_CLASSES.has(error.failureClass) &&
    classifyStorageRejection(error) === undefined &&
    !isSidecarReadFailure(error)
  );
}
//@ chunk-y162pn60.js:30053-30301 placement
/**
 * 对瞬时存储错误按退避重试读取；首次成功记干净读取，重试后成功记 tengu_bg_state_read_recovered（只一次）。
 */
async function retryStorageRead(e, n) {
  let r = await n();
  let s = 1;
  for (let f of RETRY_BACKOFF_MS) {
    if (r.ok || !isTransientStorageError(r.error)) break;
    await sleep(f);
    r = await n();
    s++;
  }
  if (r.ok) {
    if (s === 1) getJobStateReadCache().noteCleanRead(e);
    else if (getJobStateReadCache().shouldReportRecovered(e))
      logEvent("tengu_bg_state_read_recovered", {
        attempts: s,
      });
  }
  return r;
}
//@ chunk-y162pn60.js:30301-30508 placement
function rejectJobState(e, n, r) {
  let s = getJobStateReadCache().peek(e);
  if (!(s?.mtimeKey.startsWith("rejected:") && s.state === null))
    logForDebugging(`[jobs] skipping ${basename(e)}: state.json is ${r}`, {
      level: "warn",
    });
  getJobStateReadCache().noteRejected(e, `rejected:${n}`);
  return null;
}
//@ chunk-y162pn60.js:30508-30541 placement
function invalidateJobStateCache(jobDir) {
  getJobStateReadCache().invalidate(jobDir);
}
//@ chunk-y162pn60.js:30541-32339 placement
/**
 * 从存储 v5 读取作业 state.json 及 order/stateOrder/group sidecar：检查大小与类型，瞬时失败用缓存，版本未变命中缓存，否则解析。
 */
async function readJobStateFromStorage(storage, jobDir, options) {
  let jobId = basename(jobDir);
  let f = getJobStateReadCache().peek(jobDir);
  if (f === undefined || f.mtimeKey.startsWith("rejected:")) {
    let R = await storage.statMeta(jobStateKey(jobId));
    if (!R.ok) {
      if (R.error.code === "NotFound") return noteStateAbsent(jobDir, options);
      let L = classifyStorageRejection(R.error);
      if (L !== undefined)
        return rejectJobState(jobDir, L, L === "oversize" ? "too large" : "not a regular file");
    } else if (R.value.size > MAX_STATE_BYTES) {
      let L = `rejected:${R.value.mtimeMs}:${R.value.size}`;
      if (getJobStateReadCache().peek(jobDir)?.mtimeKey !== L) {
        logForDebugging(
          `[jobs] skipping ${basename(jobDir)}: state.json is too large (${R.value.size} bytes)`,
          {
            level: "warn",
          },
        );
        getJobStateReadCache().noteRejected(jobDir, L);
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
    let R = await storage.read([stateKey]);
    readResult = R.ok
      ? {
          ok: true,
          value: {
            items: [
              R.value.items[0],
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
      : R;
  }
  let cached = getJobStateReadCache().peek(jobDir);
  if (!readResult.ok) {
    let R = classifyStorageRejection(readResult.error);
    if (R !== undefined)
      return rejectJobState(jobDir, R, R === "oversize" ? "too large" : "not a regular file");
    logForDebugging(`[jobs] ${basename(jobDir)}: v5 state read failed \u2014 ${readResult.error.code}`, {
      level: "warn",
    });
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: fromEnum(readResult.error.code),
        had_cache: cached !== undefined,
      });
    return stateOrNull(cached, options);
  }
  let [stateItem, orderItem, stateOrderItem, groupItem] = readResult.value.items;
  if (!stateItem.found) return noteStateAbsent(jobDir, options);
  if (stateItem.totalBytes > MAX_STATE_BYTES) {
    let R = `rejected:${stateItem.mtimeMs}:${stateItem.totalBytes}`;
    if (cached?.mtimeKey === R) return null;
    logForDebugging(
      `[jobs] skipping ${basename(jobDir)}: state.json is too large (${stateItem.totalBytes} bytes)`,
      {
        level: "warn",
      },
    );
    getJobStateReadCache().noteRejected(jobDir, R);
    return null;
  }
  let O = (R) => Buffer.from(R.value.buffer, R.value.byteOffset, R.value.byteLength).toString("utf-8");
  let P = (R) => (R.found && R.totalBytes <= MAX_STATE_BYTES ? O(R) : null);
  let v = (R) => (R.found && R.totalBytes <= MAX_STATE_BYTES ? R.version : 0);
  let versionKey = `v5:${stateItem.version}:${v(orderItem)}:${v(stateOrderItem)}:${v(groupItem)}`;
  if (cached?.mtimeKey === versionKey) {
    getJobStateReadCache().noteHit(jobDir);
    return cached.state;
  }
  return parseJobStateText(
    jobDir,
    versionKey,
    O(stateItem),
    P(orderItem),
    P(stateOrderItem),
    P(groupItem),
    cached,
    options,
  );
}
//@ chunk-y162pn60.js:32339-33301 placement
/**
 * 解析作业 state.json：schema 校验失败记 tengu_bg_state_read_rejected 并缓存拒绝；保留未知字段，合并排序与分组 sidecar，结果写入缓存；解析异常时回退缓存。
 */
function parseJobStateText(jobDir, cacheKey, stateText, orderText, stateOrderText, groupText, cached, S) {
  try {
    let raw = jsonParse(stateText);
    let h = jobStateSchema().safeParse(raw);
    if (!h.success) {
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${h.error.message}`,
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
      ...h.data,
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
    return stateOrNull(cached, S);
  }
}
//@ chunk-y162pn60.js:33301-33364 placement
/**
 * 记录一次“状态不存在”并返回 null。
 */
function noteStateAbsent(jobDir, options) {
  getJobStateReadCache().noteAbsent(jobDir);
  options?.onAbsent?.();
  return null;
}
//@ chunk-y162pn60.js:33364-33426 placement
async function readJobStateFreshOrNull(jobDir, storage) {
  return loadJobState(jobDir, storage, {
    onReadFailure: "null",
  });
}
//@ chunk-y162pn60.js:33426-33471 placement
async function readJobState(jobDir, storage) {
  return loadJobState(jobDir, storage, undefined);
}
//@ chunk-y162pn60.js:33471-33585 placement
async function readJobStateOrAbsent(jobDir, storage) {
  let r = {
    absent: false,
  };
  let jobState = await loadJobState(jobDir, storage, {
    onAbsent: () => {
      r.absent = true;
    },
  });
  return r.absent ? "absent" : jobState;
}
//@ chunk-y162pn60.js:33585-35825 placement
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
    let [w, x, F, O] = await Promise.all([
      lstat(statePath),
      lstat(orderPath).catch(() => null),
      lstat(stateOrderPath).catch(() => null),
      lstat(groupPath).catch(() => null),
    ]);
    if (!w.isFile() || w.size > MAX_STATE_BYTES) {
      let v = `rejected:${w.mtimeMs}:${w.size}`;
      if (getJobStateReadCache().peek(jobDir)?.mtimeKey === v) return null;
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json is ${w.isFile() ? `too large (${w.size} bytes)` : "not a regular file"}`,
        {
          level: "warn",
        },
      );
      getJobStateReadCache().noteRejected(jobDir, v);
      return null;
    }
    let P = (v) => v !== null && v.isFile() && v.size <= MAX_STATE_BYTES;
    sidecarsUsable = {
      order: P(x),
      stateOrder: P(F),
      group: P(O),
    };
    mtimeKey = `${w.mtimeMs}:${sidecarsUsable.order ? x.mtimeMs : 0}:${sidecarsUsable.stateOrder ? F.mtimeMs : 0}:${sidecarsUsable.group ? O.mtimeMs : 0}`;
  } catch (error) {
    if (isENOENT(error)) return noteStateAbsent(jobDir, options);
    logForDebugging(
      `[jobs] ${basename(jobDir)}: state.json stat failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
    let x = getJobStateReadCache().peek(jobDir);
    if (getJobStateReadCache().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: x !== undefined,
      });
    return stateOrNull(x, options);
  }
  let h = getJobStateReadCache().peek(jobDir);
  if (h?.mtimeKey === mtimeKey) {
    getJobStateReadCache().noteHit(jobDir);
    return h.state;
  }
  try {
    let [file, x, F, O] = await Promise.all([
      readFile(statePath, "utf-8"),
      sidecarsUsable.order ? readFile(orderPath, "utf-8").catch(() => null) : Promise.resolve(null),
      sidecarsUsable.stateOrder ? readFile(stateOrderPath, "utf-8").catch(() => null) : Promise.resolve(null),
      sidecarsUsable.group ? readFile(groupPath, "utf-8").catch(() => null) : Promise.resolve(null),
    ]);
    let P = jsonParse(file);
    let v = jobStateSchema().safeParse(P);
    if (!v.success) {
      logForDebugging(
        `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${v.error.message}`,
        {
          level: "warn",
        },
      );
      if (getJobStateReadCache().shouldReportRejected(jobDir)) logEvent("tengu_bg_state_read_rejected", {});
      getJobStateReadCache().noteRejected(jobDir, mtimeKey);
      return null;
    }
    let D = x !== null ? Number(x) : undefined;
    let R = F !== null ? Number(F) : undefined;
    let shape = jobStateSchema().in.shape;
    let j =
      P !== null && typeof P === "object"
        ? Object.entries(P).filter(([key]) => !Object.hasOwn(shape, key))
        : [];
    let G = {
      ...Object.fromEntries(j),
      ...v.data,
    };
    if (Number.isFinite(D))
      G = {
        ...G,
        sortOrder: D,
      };
    if (Number.isFinite(R))
      G = {
        ...G,
        stateSortOrder: R,
      };
    if (O !== null && O.trim())
      G = {
        ...G,
        group: O.trim(),
      };
    if (G.group !== undefined)
      G = {
        ...G,
        group: sanitizeGroupOrDefault(G.group),
      };
    getJobStateReadCache().noteParsed(jobDir, mtimeKey, G);
    return G;
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
        had_cache: h !== undefined,
      });
    return stateOrNull(h, options);
  }
}
//@ chunk-y162pn60.js:35825-36045 placement
async function readJobStateAfterSettle(jobDir, n) {
  invalidateJobStateCache(jobDir);
  let r = await readJobState(jobDir, n).catch(() => null);
  if (
    r !== null &&
    r.state !== "done" &&
    r.state !== "stopped" &&
    r.state !== "blocked" &&
    r.state !== "failed"
  ) {
    await sleep(50);
    invalidateJobStateCache(jobDir);
    r = (await readJobState(jobDir, n).catch(() => null)) ?? r;
  }
  return r;
}
//@ chunk-y162pn60.js:36045-36085 placement
/**
 * 作业 pin 文件路径（jobs/pins.json）。
 */
function pinsFilePath() {
  return join(getJobsDir(), "pins.json");
}
//@ chunk-y162pn60.js:36085-36097 placement
/**
 * pin 判定的陈旧时间（5000 毫秒）。
 */
var PIN_STALE_MS = 5000;
//@ chunk-y162pn60.js:36097-36358 placement = getMcpAuthCache (1)
/**
 * 读取 MCP 认证缓存（v5 存储）条目。
 */
async function readPinnedJobIds(storageV5) {
  if (storageV5) return readJobPinsFromStorage(storageV5);
  try {
    let n = await lstat(pinsFilePath());
    if (!n.isFile() || n.size > MAX_STATE_BYTES) {
      if (!n.isFile()) await removeBadPinsFile();
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
//@ chunk-y162pn60.js:36358-36475 placement
async function readJobPinsFromStorage(e) {
  let cappedStorageText = await readCappedStorageText(e, STORAGE_SPACES.jobPins(), {
    cap: MAX_STATE_BYTES,
    screens: getJobPins(),
    screenKey: pinsFilePath(),
    heal: removeBadPinsFile,
  });
  return parsePinnedIds(cappedStorageText ?? undefined);
}
//@ chunk-y162pn60.js:36475-36518 placement
/**
 * 取当前宿主的作业 pin 表。
 */
function getJobPins() {
  return jobPinsState.of(getRootSession().host).pins;
}
//@ chunk-y162pn60.js:36518-36700 placement
function parsePinnedIds(e) {
  if (e === undefined || e.length > MAX_STATE_BYTES) return new Set();
  let n;
  try {
    n = jsonParse(e);
  } catch {
    return new Set();
  }
  if (!Array.isArray(n)) return new Set();
  return new Set(n.filter((r) => typeof r === "string"));
}
//@ chunk-y162pn60.js:36700-36887 placement
async function removeBadPinsFile(e) {
  let n = await lstat(pinsFilePath()).catch(() => {
    return;
  });
  if (n === undefined || (n.isFile() && !(e?.evenRegular && n.size > MAX_STATE_BYTES))) return false;
  await rm(pinsFilePath(), {
    recursive: true,
    force: true,
  }).catch(() => {});
  return true;
}
//@ chunk-y162pn60.js:36887-37197 placement
async function syncJobName(e, n, r, storageV5, f) {
  let jobDir = getJobDir(e);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return false;
  if (jobState.name === n) return true;
  invalidateJobStateCache(jobDir);
  let S = (await readJobState(jobDir, storageV5)) ?? jobState;
  if (S.name === n || (r === "auto" && S.name)) return true;
  if (!isAutoOrMatchingName(S, f)) return false;
  return writeStateAtomic(
    jobDir,
    {
      ...S,
      name: n,
      nameSource: r,
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
//@ chunk-y162pn60.js:37197-37452 placement = updateSessionActivity (0.701)
async function syncJobColor(ownJobShortId, effectiveAgentColor, storageV5) {
  let jobDir = getJobDir(ownJobShortId);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return false;
  if (jobState.color === effectiveAgentColor) return true;
  invalidateJobStateCache(jobDir);
  let m = (await readJobState(jobDir, storageV5)) ?? jobState;
  if (m.color === effectiveAgentColor) return true;
  return writeStateAtomic(
    jobDir,
    {
      ...m,
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
//@ chunk-y162pn60.js:37452-37492 placement
function getBgRelocatedCwd() {
  return currentSessionStatusState().relocatedCwd;
}
//@ chunk-y162pn60.js:37492-37865 placement
async function relocateBgSessionCwd(e, n) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  currentSessionStatusState().relocatedCwd = e;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState = await readJobState(CLAUDE_JOB_DIR, n);
  let f = jobState?.worktreePath ? jobState.originCwd : e;
  if (!jobState || (jobState.cwd === e && jobState.originCwd === f)) return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let m = (await readJobState(CLAUDE_JOB_DIR, n)) ?? jobState;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    {
      ...m,
      cwd: e,
      originCwd: m.worktreePath ? m.originCwd : e,
      updatedAt: new Date().toISOString(),
    },
    n,
  ).catch((error) => {
    if (!isENOENT(error)) logJobWriteError(error);
  });
}
//@ chunk-y162pn60.js:37865-38208 placement
async function syncJobResumeSessionId(sessionId, transcriptPath, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
  if (!jobState || (jobState.resumeSessionId === sessionId && jobState.linkScanPath === transcriptPath))
    return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let m = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    {
      ...m,
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
//@ chunk-y162pn60.js:38208-38877 placement
async function syncLiveInFlightSnapshot(e, storageV5, { includeSettled: r = false } = {}) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState?.inFlight || (isSettled(jobState) && !r) || jobState.tempo === "active") return;
    let inFlight = jobState.inFlight;
    if (
      e.count === inFlight.tasks &&
      (e.drainableMonitors ?? 0) === (inFlight.drainableMonitors ?? 0) &&
      e.kinds.length === inFlight.kinds.length &&
      e.kinds.every((kind) => inFlight.kinds.includes(kind))
    )
      return;
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      {
        ...jobState,
        inFlight: {
          tasks: e.count,
          queued: inFlight.queued,
          kinds: [...e.kinds],
          ...(e.drainableMonitors !== undefined &&
            e.drainableMonitors > 0 && {
              drainableMonitors: e.drainableMonitors,
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
//@ chunk-y162pn60.js:38877-39018 placement
function isAutoOrMatchingName(e, n) {
  if (n === undefined || !e.name) return true;
  if (e.nameSource === "auto" || e.nameSource === "collision") return true;
  return n.includes(sanitizeSessionTitle(e.name));
}
//@ chunk-y162pn60.js:39018-39765 placement
async function syncRespawnFlag(e, n, r, s, f, m, g) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let jobState = await readJobState(CLAUDE_JOB_DIR, f);
    if (!jobState?.respawnFlags) return;
    if (g && !g(jobState.respawnFlags)) return;
    let h = [e, ...n];
    let w = (respawnFlags) => {
      let D = [];
      for (let idx = 0; idx < respawnFlags.length; idx++) {
        let L = respawnFlags[idx];
        if (h.some((j) => L === j || L.startsWith(`${j}=`))) {
          if (L.indexOf("=") === -1 && respawnFlags[idx + 1] !== undefined) idx++;
          continue;
        }
        D.push(L);
      }
      if (r === null) return D;
      return [...D, ...flagArgs(e, r)];
    };
    let x = w(jobState.respawnFlags);
    if (x.length === jobState.respawnFlags.length && x.every((v, D) => v === jobState.respawnFlags[D]))
      return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let F = (await readJobState(CLAUDE_JOB_DIR, f)) ?? jobState;
    let respawnFlags = F.respawnFlags ?? jobState.respawnFlags;
    if (g && !g(respawnFlags)) return;
    let P = isAutoOrMatchingName(F, m);
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      {
        ...F,
        ...(P ? s : {}),
        respawnFlags: w(respawnFlags),
        updatedAt: new Date().toISOString(),
      },
      f,
    ).catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
  });
}
//@ chunk-y162pn60.js:39765-40207 placement
async function appendRespawnFlag(e, n, storageV5) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let jobState = await readJobState(CLAUDE_JOB_DIR, storageV5);
    if (!jobState?.respawnFlags) return;
    let m = flagArgs(e, n);
    for (let j = 0; j <= jobState.respawnFlags.length - m.length; j++)
      if (m.every((y, h) => jobState.respawnFlags[j + h] === y)) return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let g = (await readJobState(CLAUDE_JOB_DIR, storageV5)) ?? jobState;
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      {
        ...g,
        respawnFlags: [...(g.respawnFlags ?? []), ...m],
        updatedAt: new Date().toISOString(),
      },
      storageV5,
    ).catch((error) => {
      if (!isENOENT(error)) logJobWriteError(error);
    });
  });
}
//@ chunk-y162pn60.js:40207-40346 placement
async function replaceFileExclusive(e, n) {
  await rm(e, {
    force: true,
  });
  let r = await writeIfMissing(e, n);
  try {
    await retryFsOp(r, e);
  } catch (error) {
    await rm(r, {
      force: true,
    }).catch(() => {});
    throw error;
  }
}
//@ chunk-y162pn60.js:40346-40605 placement
async function writeJobSidecarToStorage(e, n, r) {
  let s = await e.write(n, r, {
    parent: "mustExist",
    mode: 438 & ~process.umask(),
  });
  if (!s.ok) {
    let f = storageErrorCode(s.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[jobs] v5 sidecar write failed: ${formatStorageError(s.error)}`,
        "[jobs] v5 sidecar write failed",
      ),
      f !== undefined
        ? {
            code: f,
          }
        : {},
    );
  }
}
//@ chunk-y162pn60.js:40605-40744 placement
async function writeSortOrder(jobDir, n, r) {
  let s = isStorageV5Enabled() && r ? jobKeyFor(jobDir, ["order"]) : undefined;
  if (r && s) await writeJobSidecarToStorage(r, s, String(n));
  else await replaceFileExclusive(join(jobDir, "order"), String(n));
  invalidateJobStateCache(jobDir);
}
//@ chunk-y162pn60.js:40744-40893 placement
async function writeStateSortOrder(jobDir, n, r) {
  let s = isStorageV5Enabled() && r ? jobKeyFor(jobDir, ["stateOrder"]) : undefined;
  if (r && s) await writeJobSidecarToStorage(r, s, String(n));
  else await replaceFileExclusive(join(jobDir, "stateOrder"), String(n));
  invalidateJobStateCache(jobDir);
}
//@ chunk-y162pn60.js:40893-41202 placement
async function writeJobGroup(jobDir, n, storageV5) {
  let s = join(jobDir, "group");
  let f = sanitizeGroupOrDefault(n);
  let m = isStorageV5Enabled() && storageV5 ? jobKeyFor(jobDir, ["group"]) : undefined;
  if (storageV5 && m) {
    if (f) await writeJobSidecarToStorage(storageV5, m, f);
    else {
      let g = await storageV5.delete(m);
      if (!g.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[jobs] v5 sidecar delete failed: ${g.error.code}`,
          "[jobs] v5 sidecar delete failed",
        );
    }
  } else if (f) await replaceFileExclusive(s, f);
  else
    await rm(s, {
      force: true,
    });
  invalidateJobStateCache(jobDir);
}
//@ chunk-y162pn60.js:41202-41490 placement = immediateFlushHistory (0.302)
async function withSortOrderLock(e) {
  let n = join(getJobsDir(), ".order");
  await mkdir(getJobsDir(), {
    recursive: true,
  });
  await using r = await lock(n, {
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
  return await e();
}
//@ chunk-y162pn60.js:41490-41502 placement
/**
 * 作业状态/pin 写入的串行队列。
 */
var pinsWriteQueue = createKeyedQueue();
//@ chunk-y162pn60.js:41502-41552 placement
function withOwnJobStateWrite(e) {
  return pinsWriteQueue.run("own-state.json", e);
}
//@ chunk-y162pn60.js:41552-42047 placement
function writeJobPinned(id, n, r) {
  return pinsWriteQueue.run("pins.json", async () => {
    if (isStorageV5Enabled() && r) return setJobPinnedInStorage(id, n, r);
    let s = pinsFilePath();
    await mkdir(dirname(s), {
      recursive: true,
    });
    await using f = await lock(s, {
      realpath: false,
      stale: PIN_STALE_MS,
      retries: {
        retries: 5,
        minTimeout: 20,
      },
      onCompromised: (g) =>
        logForDebugging(`pins.json lock compromised (likely process suspend or slow fs): ${g}`, {
          level: "error",
        }),
    });
    let pinnedJobIds = await readPinnedJobIds();
    if (n ? pinnedJobIds.has(id) : !pinnedJobIds.has(id)) return;
    if (n) pinnedJobIds.add(id);
    else {
      pinnedJobIds.delete(id);
      await rm(join(getJobDir(id), "order")).catch((error) => {
        if (!isENOENT(error)) throw error;
      });
      invalidateJobStateCache(getJobDir(id));
    }
    await writeFileAtomic(s, jsonStringify([...pinnedJobIds], null, 2));
  });
}
//@ chunk-y162pn60.js:42047-42973 placement
/**
 * 在存储中更新置顶作业列表（加入或移除）；文件异常时先清理；取消置顶后删除该作业的 order sidecar 并使状态缓存失效。
 */
async function setJobPinnedInStorage(e, n, r) {
  let updatePins = (y) => {
    let pinnedIds = parsePinnedIds(y?.value);
    if (n ? pinnedIds.has(e) : !pinnedIds.has(e))
      return {
        skip: true,
        result: false,
      };
    if (n) pinnedIds.add(e);
    else pinnedIds.delete(e);
    return {
      write: jsonStringify([...pinnedIds], null, 2),
      result: true,
    };
  };
  let jobPins = getJobPins();
  let m = await r.statMeta(STORAGE_SPACES.jobPins());
  if (m.ok && m.value.size > MAX_STATE_BYTES) {
    await removeBadPinsFile({
      evenRegular: true,
    });
    jobPins.delete(pinsFilePath());
  } else if (!m.ok && classifyStorageRejection(m.error) !== undefined) {
    await removeBadPinsFile();
    jobPins.delete(pinsFilePath());
  }
  let writeOptions = {
    publishDiscipline: "atomic",
    mode: 438 & ~process.umask(),
  };
  let S = await r.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!S.ok && (await removeBadPinsFile()))
    S = await r.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!S.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[jobs] v5 pins update failed: ${S.error.code}`,
      "[jobs] v5 pins update failed",
    );
  if (!n && S.value.result === true) {
    let y = jobStoragePath(e, ["order"]);
    if (y) {
      let h = await r.delete(y);
      if (!h.ok)
        logForDebugging(`[jobs] v5 order sidecar release failed after unpin: ${h.error.code}`, {
          level: "warn",
        });
    } else
      await rm(join(getJobDir(e), "order")).catch((error) => {
        if (!isENOENT(error))
          logForDebugging(`[jobs] order sidecar release failed after unpin: ${errorMessage(error)}`, {
            level: "warn",
          });
      });
    invalidateJobStateCache(getJobDir(e));
  }
}
//@ chunk-y162pn60.js:42973-43370 placement
async function listJobs(e, n, r) {
  if (n) return listJobsFromStorage(n, e, r);
  let s;
  try {
    s = await readdir(getJobsDir(), {
      withFileTypes: true,
    });
  } catch (error) {
    if (isUnavailableErrorCode(getErrnoCode(error))) r?.();
    return [];
  }
  let [pinnedJobIds, m] = await Promise.all([
    readPinnedJobIds(),
    Promise.all(
      s
        .filter((S) => S.isDirectory())
        .map(async (S) => {
          let jobState = await readJobState(join(getJobsDir(), S.name));
          return jobState
            ? {
                id: S.name,
                state: jobState,
              }
            : null;
        }),
    ),
  ]);
  let mapped = m
    .filter((S) => S !== null)
    .map((S) =>
      pinnedJobIds.has(S.id)
        ? {
            ...S,
            state: {
              ...S.state,
              pinned: true,
            },
          }
        : S,
    );
  return e ? markCrashed(mapped, e) : mapped;
}
//@ chunk-y162pn60.js:43370-43767 placement
/**
 * 分页列出存储中所有任务的 id。
 */
async function listStoredJobIds(e) {
  let n = [];
  let r;
  do {
    let s = await e.listEntries(
      {
        namespace: "job",
      },
      r === undefined
        ? {
            skipScopeStats: true,
          }
        : {
            cursor: r,
            skipScopeStats: true,
          },
    );
    if (!s.ok)
      return {
        ok: false,
        error: s.error,
      };
    for (let item of s.value.items)
      if (
        item.kind === "scope" &&
        item.scope.namespace === "job" &&
        item.scope.jobId !== undefined &&
        item.scope.relPath === undefined &&
        isValidKeySegment(item.scope.jobId)
      )
        n.push(item.scope.jobId);
    r = s.value.cursor;
  } while (r !== undefined);
  return {
    ok: true,
    ids: n,
  };
}
//@ chunk-y162pn60.js:43767-44088 placement
/**
 * 列出存储中的全部作业及其状态，标记置顶；存储不可用时回调并返回空；需要时标记崩溃的作业。
 */
async function listJobsFromStorage(e, n, r) {
  let s = await listStoredJobIds(e);
  if (!s.ok) {
    if (isUnavailableError(s.error)) r?.();
    return [];
  }
  let ids = s.ids;
  let [pinnedJobIds, g] = await Promise.all([
    readPinnedJobIds(e),
    Promise.all(
      ids.map(async (id) => {
        let jobState = await readJobState(getJobDir(id), e);
        return jobState
          ? {
              id,
              state: jobState,
            }
          : null;
      }),
    ),
  ]);
  let mapped = g
    .filter((y) => y !== null)
    .map((y) =>
      pinnedJobIds.has(y.id)
        ? {
            ...y,
            state: {
              ...y.state,
              pinned: true,
            },
          }
        : y,
    );
  return n ? markCrashed(mapped, n) : mapped;
}
//@ chunk-y162pn60.js:44088-44319 placement
function markCrashed(e, n) {
  let now = Date.now();
  return e.map((s) => {
    if (isSettled(s.state)) return s;
    if (n.has(s.id)) return s;
    if (s.state.keptBy !== undefined && isKeptIdleBlocked(s.state)) return s;
    if (now - Date.parse(s.state.createdAt) < PIN_GUARD_MS) return s;
    return {
      ...s,
      state: markJobFailedOrBlocked(s.state),
    };
  });
}
//@ chunk-y162pn60.js:44319-44331 placement
/**
 * keptBy 状态的保护时长（5000 毫秒）。
 */
var PIN_GUARD_MS = 5000;
//@ chunk-y162pn60.js:44331-44519 placement
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
//@ chunk-y162pn60.js:44519-44572 placement
var SEED_DETAIL = "starting\u2026";
var IDLE_NEEDS = "send a prompt to start";
//@ chunk-y162pn60.js:44572-44638 placement
function isOverlayNeeds(e) {
  return e.needs !== undefined && e.needsOverlay === e.needs;
}
//@ chunk-y162pn60.js:44638-44778 placement
/**
 * 后台服务未运行期间结束时的说明文案。
 */
var IDLE_DETAIL = `(idle \u2014 ${IDLE_NEEDS})`;
var PRE_BOOT_STATES = ["starting", "resuming", "adopted", "crashed"];
var ABANDONED_WORKER_MS = 172800000;
var SERVICE_OFF_END_DETAIL = "ended while the background service was off";
//@ chunk-y162pn60.js:44778-45957 placement
function makeInitialState(e) {
  let iso = new Date().toISOString();
  return {
    state: "working",
    detail: e.detail !== undefined ? redactSecrets(e.detail) : SEED_DETAIL,
    tempo: e.tempo ?? "active",
    needs: e.needs,
    inFlight: e.inFlight,
    output: null,
    children: null,
    linkScanOffset: 0,
    linkScanPath: e.linkScanPath,
    template: e.template.name,
    routine: e.routine,
    respawnFlags: e.respawnFlags ?? [],
    bgIsolation: e.bgIsolation,
    providerEnv: e.providerEnv && resolveForwardedEnvPaths(e.providerEnv, e.cwd),
    sessionPermissionRules: e.sessionPermissionRules,
    memoryToggledOff: e.memoryToggledOff,
    autoMemoryOffThisSession: e.autoMemoryOffThisSession,
    forkSourceAlive: e.forkSourceAlive,
    forkBoundaryAt: e.forkBoundaryAt,
    forkSessionId: e.forkSessionId,
    forkParentSessionId: e.forkParentSessionId,
    interactiveLineage: e.interactiveLineage,
    intent: e.intent,
    displayIntent: e.displayIntent,
    name: e.name,
    nameSource: e.nameSource,
    color: getEffectiveAgentColor({
      userOverride: e.color,
      agentDefinitionColor: e.template.color,
    }),
    initialPrompt: e.template.initialPrompt,
    sessionId: e.sessionId,
    resumeSessionId: e.sessionId,
    daemonShort: e.sessionId.slice(0, 8),
    cwd: e.cwd,
    createdAt: iso,
    updatedAt: iso,
    firstTerminalAt: null,
    worktreePath: e.worktreePath,
    worktreeBranch: e.worktreeBranch,
    worktreeHookBased: e.worktreeHookBased,
    originCwd: e.originCwd,
    backend: "daemon",
  };
}
//@ chunk-y162pn60.js:45957-47688 placement
async function adoptRosterOrphans(e, n, r) {
  if (n.length === 0) return e;
  let s = new Set(e.map((h) => h.id));
  let filtered = n.filter(
    (h) => SHORT_ID_RE.test(h.short) && !s.has(h.short) && h.source !== "spare" && !h.dying,
  );
  if (filtered.length === 0) return e;
  let roster = await readRoster(
    {
      silent: true,
    },
    r,
  );
  let results = await Promise.all(
    filtered.map((h) => {
      let w = roster.workers[h.short];
      return checkProcessLiveness(h.pid, w?.pid === h.pid ? w.procStart : undefined);
    }),
  );
  for (let [h, w] of filtered.entries())
    if (results[h] !== "live") {
      logForDebugging(`[adoptRosterOrphans] pruned dead record ${w.short} (${results[h]})`);
      if (getJobStateReadCache().shouldReportPruned(w.short))
        logEvent("tengu_bg_roster_orphan_pruned", {
          reason: fromEnum(results[h] ?? "dead_pid"),
        });
    } else getJobStateReadCache().notePruneCandidateLive(w.short);
  let filtered_2 = filtered.filter((h, w) => results[w] === "live");
  if (filtered_2.length === 0) return e;
  let mapped = filtered_2.map((h) => {
    let w = {
      ...makeInitialState({
        template: {
          name: h.agent ?? "bg",
          description: "",
        },
        routine: h.routine,
        intent: h.intent,
        name: h.name,
        detail: h.detail,
        ...(h.tempo === "active" && (h.state === "running" || PRE_BOOT_STATES.includes(h.state))
          ? h.routine
            ? {
                tempo: "idle",
              }
            : {
                tempo: "blocked",
                needs: IDLE_NEEDS,
              }
          : {
              tempo: h.tempo,
              needs: h.needs,
            }),
        sessionId: stripLongPathPrefixes(h.sessionId),
        cwd: stripLongPathPrefixes(h.cwd),
        worktreePath: h.worktreePath === undefined ? undefined : stripLongPathPrefixes(h.worktreePath),
      }),
      createdAt: new Date(h.createdAt ?? h.startedAt).toISOString(),
      daemonShort: h.short,
      state: PRE_BOOT_STATES.includes(h.state) ? "working" : h.state,
      ...(isTerminal(h.state) && {
        inFlight: {
          tasks: 0,
          queued: 0,
          kinds: [],
        },
      }),
    };
    let jobDir = getJobDir(h.short);
    let F = r ? jobStoragePath(h.short, [STATE_JSON]) : undefined;
    if (r && F)
      r.write(F, jsonStringify(w), {
        precondition: {
          type: "ifAbsent",
        },
        mode: 384,
      }).then((O) => {
        if (O.ok) logEvent("tengu_bg_roster_orphan_adopted", {});
        else if (O.error.code !== "AlreadyExists")
          logJobWriteError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `[jobs] v5 orphan seed write failed: ${O.error.code}`,
              "[jobs] v5 orphan seed write failed",
            ),
          );
      });
    else
      mkdir(jobDir, {
        recursive: true,
      })
        .then(() => writeNewFile(join(jobDir, "state.json"), jsonStringify(w), 384))
        .then(() => logEvent("tengu_bg_roster_orphan_adopted", {}))
        .catch((error) => {
          if (getErrnoCode(error) !== "EEXIST") logJobWriteError(error);
        });
    return {
      id: h.short,
      state: w,
    };
  });
  return [...e, ...mapped];
}
//@ chunk-y162pn60.js:47688-47810 placement = fetchInstallCountsFromGitHub (0.627)
/**
 * 任务状态 done/failed/stopped → success/failure/stopped。名字配错，见 lead 建议。
 */
function terminalOutcome(state) {
  if (state === "done") return "success";
  if (state === "failed") return "failure";
  if (state === "stopped") return "stopped";
  return null;
}
//@ chunk-y162pn60.js:47810-47845 placement
function isTerminal(state) {
  return terminalOutcome(state) !== null;
}
//@ chunk-y162pn60.js:47845-47899 placement
function isSettled(e) {
  return isTerminal(e.state) && e.tempo !== "active";
}
//@ chunk-y162pn60.js:47899-47978 placement
/**
 * 判断状态是否为“被保留但空闲阻塞”。
 */
function isKeptIdleBlocked(state) {
  return state.intent === "" && state.needs === IDLE_NEEDS && state.tempo === "blocked" && !isSettled(state);
}
//@ chunk-y162pn60.js:47978-48047 placement
function isExecLaunch(e) {
  return e.template === "exec" && e.respawnFlags.length === 0;
}
//@ chunk-y162pn60.js:48047-48098 placement
function hasOutstandingAsk(e) {
  return e.state === "blocked" && !isExecLaunch(e);
}
//@ chunk-y162pn60.js:48098-48150 placement
function isLocalDaemonAgent(state) {
  return state.backend === "daemon" && !isExecLaunch(state);
}
//@ chunk-y162pn60.js:48150-48266 placement
function spawnOrigin(state) {
  let n = state.originCwd || (state.cwd.match(/^(.+?)[/\\]\.claude[/\\]worktrees[/\\]/)?.[1] ?? state.cwd);
  return stripLongPathPrefixes(n);
}
//@ chunk-y162pn60.js:48266-48380 placement
function jobMatchesCwd(state, cwdFilter) {
  if (state.backend === "remote") return true;
  let r = relative(cwdFilter, spawnOrigin(state));
  return r.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(r);
}
//@ chunk-y162pn60.js:48380-48494 placement
function isLoopJob(state) {
  let n = (r) => r?.trim().toLowerCase().startsWith("/loop") ?? false;
  return n(state.intent) || n(state.initialPrompt);
}
//@ chunk-y162pn60.js:48494-48610 placement
function isSelfDriving(e) {
  return (
    e.routine !== undefined ||
    e.selfWake === true ||
    (e.inFlight?.kinds.includes("session_cron") ?? false) ||
    isLoopJob(e)
  );
}
//@ chunk-y162pn60.js:48610-49379 placement
function writeReapedTerminalState(e, n, r, s, storageV5) {
  let jobDir = getJobDir(e);
  return readJobState(jobDir, storageV5)
    .then(async (jobState) => {
      if (!jobState || isSettled(jobState) || (n === "failed" && hasOutstandingAsk(jobState))) return "none";
      let now = Date.now();
      let iso = new Date(now).toISOString();
      let h =
        s?.resumable === "auto-resume" &&
        n === "failed" &&
        !isExecLaunch(jobState) &&
        now - Date.parse(jobState.updatedAt) > ABANDONED_WORKER_MS;
      await writeStateAtomic(
        jobDir,
        {
          ...jobState,
          state: h ? "stopped" : n === "crashed" ? "failed" : n,
          detail: h
            ? SERVICE_OFF_END_DETAIL
            : n === "stopped"
              ? "stopped"
              : n === "failed"
                ? stripSuffix(jobState.detail || r, "; respawning")
                : r,
          tempo: "idle",
          inFlight: undefined,
          needs: undefined,
          updatedAt: iso,
          firstTerminalAt: jobState.firstTerminalAt ?? (h ? jobState.updatedAt : iso),
          lastTerminalAt: h ? jobState.updatedAt : iso,
          ...(s?.resumable === "auto-resume" &&
            n === "failed" &&
            (h
              ? {
                  deadEpochReapedAt: iso,
                }
              : {
                  reapedMidWorkAt: jobState.updatedAt,
                })),
          ...(s?.resumable === "wake-only" &&
            n === "failed" && {
              reapedUnsettledAt: jobState.updatedAt,
            }),
        },
        storageV5,
      );
      return h ? "dead-epoch" : "settled";
    })
    .catch((error) => {
      logJobWriteError(error);
      return "none";
    });
}
export {
  getJobDir,
  readJobState,
  syncLiveInFlightSnapshot,
  isSettled,
  isExecLaunch,
  writeStateAtomic,
  listJobs,
  syncJobName,
  buildBridgeReattachEnv,
  resolveBridgeHandoffIdentity,
  jobStateKey,
  getOwnJobShortId,
  isOwnStateWriteInFlight,
  syncJobColor,
  invalidateJobStateCache,
  logJobWriteError,
  jobKeyFor,
  relocateBgSessionCwd,
  syncJobResumeSessionId,
  readPinnedJobIds,
  readJobStateFreshOrNull,
  syncRespawnFlag,
  getJobsDir,
  readCappedStorageText,
  jobPinsState,
  IDLE_NEEDS,
  terminalOutcome,
  isSelfDriving,
  ABANDONED_WORKER_MS,
  writeJobPinned,
  UNGROUPED,
  EARLIER,
  jobMatchesCwd,
  spawnOrigin,
  isReservedGroupName,
  isLoopJob,
  isLocalDaemonAgent,
  SEED_DETAIL,
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
  readJobStateAfterSettle,
  isTerminal,
  hasOutstandingAsk,
  PRE_BOOT_STATES,
  readJobStateOrAbsent,
  writeReapedTerminalState,
  withOwnJobStateWrite,
  isOverlayNeeds,
  getBgRelocatedCwd,
  appendRespawnFlag,
};
