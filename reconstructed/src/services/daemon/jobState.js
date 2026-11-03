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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  basename,
  join,
  dirname,
  dirname as dirname_2,
  relative,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readFile,
  readFile as readFile_2,
  rm,
  rm as rm_2,
  mkdir,
  mkdir as mkdir_2,
  readdir,
} from "fs/promises";
import { stripIgnorables } from "../../utils/sanitization.js";
import { logForDebugging } from "../../utils/debug.js";
import { o, u, U, E, A, T, M, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { Vt } from "../../utils/agentId.js";
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
import { aas, Oro } from "../analytics/metadata.js";
import { getBgTakeover } from "../../utils/concurrentSessions.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { NX } from "../sessionStatus/sessionStateClassifier.js";
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
import { xT } from "./relaunchArgs.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { lock } from "../../utils/lockfile.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { isUnavailableErrorCode, isUnavailableError } from "../../utils/settings/managedEnvKeys.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { getEffectiveAgentColor } from "../../tools/AgentTool/agentColorManager.js";
import { readRoster } from "./roster.js";
import { checkProcessLiveness } from "./processLiveness.js";

//@ chunk-y162pn60.js:21307-21397 placement
var UNGROUPED = "(ungrouped)",
  EARLIER = "(earlier)",
  Nt = 64,
  Lt = new Set(["pinned", "ungrouped", UNGROUPED, "past", EARLIER]);
//@ chunk-y162pn60.js:21397-21444 placement
function isReservedGroupName(e) {
  return Lt.has(e.toLowerCase());
}
//@ chunk-y162pn60.js:21444-21485 placement
function sanitizeGroupName(e) {
  return stripIgnorables(e).slice(0, Nt);
}
//@ chunk-y162pn60.js:21485-21561 placement
function ye(e) {
  if (e === void 0) return;
  let n = sanitizeGroupName(e);
  return n && !isReservedGroupName(n) ? n : void 0;
}
/**
 * 作业状态读取缓存（按修改时间键）及各类日志/遥测的一次性上报去重（瞬时错误、被拒、恢复、修剪、sidecar 回退）。
 */
//@ chunk-y162pn60.js:21561-22443 placement
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
    (this.#e.delete(e), this.#t.delete(e), this.#n.delete(e));
  }
  noteRejected(e, n) {
    this.#e.set(e, { mtimeKey: n, state: null });
  }
  noteParsed(e, n, r) {
    if (this.#e.size > 1000) this.#e.clear();
    (this.#e.set(e, { mtimeKey: n, state: r }), this.#t.delete(e), this.#n.delete(e));
  }
  noteHit(e) {
    this.#t.delete(e);
  }
  shouldReportTransient(e) {
    if (this.#t.has(e)) return !1;
    return (this.#t.add(e), !0);
  }
  shouldReportRejected(e) {
    if (this.#n.has(e)) return !1;
    return (this.#n.add(e), !0);
  }
  shouldReportRecovered(e) {
    if (this.#r.has(e)) return !1;
    return (this.#r.add(e), !0);
  }
  noteCleanRead(e) {
    this.#r.delete(e);
  }
  shouldReportPruned(e) {
    if (this.#o.has(e)) return !1;
    return (this.#o.add(e), !0);
  }
  notePruneCandidateLive(e) {
    this.#o.delete(e);
  }
  shouldLogSidecarFallback(e) {
    if (this.#i.has(e)) return !1;
    return (this.#i.add(e), !0);
  }
}
//@ chunk-y162pn60.js:22443-22468 placement
var nt = new HostScoped(() => new JobStateReadCache());
//@ chunk-y162pn60.js:22468-22505 placement
class rt {
  drafts = new Map();
  pins = new Map();
}
//@ chunk-y162pn60.js:22505-22531 placement
var JVr = new HostScoped(() => new rt());
/**
 * 从存储读取不超过上限的文本：首次先查元数据（不存在、出错或超限时标记并可修复），读取失败清除标记；超限返回 null。
 */
//@ chunk-y162pn60.js:22531-22993 placement
async function readCappedStorageText(e, n, { cap: cap, screens: screens, screenKey: screenKey, heal: heal }) {
  if (screens.get(screenKey) !== "ok") {
    let statMeta = await e.statMeta(n);
    if (!statMeta.ok) {
      if (statMeta.error.code !== "NotFound") (screens.set(screenKey, "refused"), await heal?.());
      return null;
    }
    if (statMeta.value.size > cap) return (screens.set(screenKey, "refused"), null);
    screens.set(screenKey, "ok");
  }
  let text = await e.readText([{ key: n, offset: 0, length: cap + 1 }]);
  if (!text.ok) return (screens.delete(screenKey), await heal?.(), null);
  let S = text.value.items[0];
  if (!S.found) return null;
  if (S.totalBytes > cap) return (screens.set(screenKey, "refused"), null);
  return S.value;
}
//@ chunk-y162pn60.js:22993-23084 placement
var le = () => o().transform(stripLongPathPrefixes),
  at = /^[a-f0-9]{8}$/,
  $t = /^(cse_|session_)[A-Za-z0-9_-]{1,128}$/;
//@ chunk-y162pn60.js:23084-23213 placement
function makeFieldValidator(e, n) {
  return (r) => {
    if (n(r)) return r;
    logForDebugging(`[jobs] dropped malformed ${e} from persisted job state`, { level: "warn" });
    return;
  };
}
//@ chunk-y162pn60.js:23213-27221 placement
var jobStateSchema = DoctorLazy(() =>
    u({
      state: o(),
      detail: o(),
      tempo: U(["active", "idle", "blocked"])
        .optional()
        .catch(void 0),
      inFlight: u({
        tasks: E(),
        queued: E(),
        kinds: A(o()),
        drainableMonitors: E().int().nonnegative().optional(),
        wake: u({
          at: E().optional(),
          reason: o().optional(),
          fires: E().int().nonnegative(),
          keepalive: T(!0).optional(),
        })
          .optional()
          .catch(void 0),
      }).optional(),
      selfWake: M()
        .optional()
        .catch(void 0),
      fan: A(
        u({
          id: o().optional(),
          kind: U(["agent", "workflow", "shell", "monitor", "mcp", "todo"])
            .optional()
            .catch(void 0),
          label: o(),
          startedAt: E().optional(),
          doneAt: E().optional(),
          failed: M().optional(),
          group: o().optional(),
        }),
      ).optional(),
      tokens: E().optional(),
      needs_you: M().optional(),
      needs: o().optional(),
      block: u({
        questions: A(u({ question: o(), options: A(u({ label: o(), description: o() })) })),
      }).optional(),
      suggestedReply: o().optional(),
      needsOverlay: o().optional(),
      output: pe(o(), o()).nullable().default(null),
      structuredResult: pe(o(), oe()).optional(),
      children: A(
        u({
          id: o(),
          href: o(),
          kind: U(["pr", "frame"])
            .optional()
            .catch(void 0),
          title: o()
            .optional()
            .catch(void 0),
        }),
      )
        .nullable()
        .default(null),
      linkScanOffset: E().default(0),
      linkScanPath: le()
        .transform(
          makeFieldValidator(
            "linkScanPath",
            (e) => isAbsolute_2(e) && e.endsWith(".jsonl") && Vt(basename(e, ".jsonl")) !== null,
          ),
        )
        .optional(),
      template: o(),
      routine: o().optional(),
      respawnFlags: A(o())
        .default([])
        .transform((e) => stripForwardedFlags(dropOverriddenSkipPermissions(splitForwardableArgs(e)))),
      bgIsolation: U(["none", "worktree"])
        .optional()
        .catch(void 0),
      providerEnv: pe(o(), o())
        .transform((e) => {
          let n = filterBackgroundEnv(xr(e, stripLongPathPrefixes));
          return n && keepForwardableEnv(n, "the saved job state (state.json providerEnv)");
        })
        .optional(),
      sessionPermissionRules: u({ allow: A(o()), deny: A(o()), addDirs: A(le()).optional() }).optional(),
      memoryToggledOff: M().optional(),
      autoMemoryOffThisSession: M().optional(),
      forkSourceAlive: M().optional(),
      forkBoundaryAt: o().optional(),
      forkSessionId: o().optional(),
      forkParentSessionId: o().optional(),
      interactiveLineage: M().optional(),
      intent: o(),
      displayIntent: o().optional(),
      initialPrompt: o().optional(),
      queuedPrompt: o().optional(),
      name: o().optional(),
      nameSource: U(["user", "auto", "collision"])
        .optional()
        .catch(void 0),
      color: o().optional(),
      sessionId: le(),
      resumeSessionId: o()
        .transform(makeFieldValidator("resumeSessionId", (e) => Vt(e) !== null))
        .optional(),
      daemonShort: o()
        .transform(makeFieldValidator("daemonShort", (e) => at.test(e)))
        .optional(),
      cliVersion: o().optional(),
      cwd: le(),
      createdAt: o(),
      updatedAt: o(),
      firstTerminalAt: o().nullable().default(null),
      lastTerminalAt: o().optional(),
      worktreePath: le().optional(),
      worktreeBranch: o().optional(),
      worktreeHookBased: M().optional(),
      originCwd: le().optional(),
      bridgeSessionId: o()
        .transform(makeFieldValidator("bridgeSessionId", (e) => $t.test(e)))
        .optional(),
      bridgeOwnerAccountUuid: o().optional(),
      bridgeOwnerOrganizationUuid: o().optional(),
      bridgeNoHistoryBackfill: M().optional(),
      bridgeOutboundOnly: M().optional(),
      bridgeSessionGroupingId: o()
        .transform(makeFieldValidator("bridgeSessionGroupingId", (e) => /^sgrp_[A-Za-z0-9_]{1,128}$/.test(e)))
        .optional(),
      bridgeSessionSeq: E()
        .transform(makeFieldValidator("bridgeSessionSeq", (e) => Number.isInteger(e) && e >= 0))
        .optional(),
      backend: U(["daemon", "peer", "remote"])
        .catch("daemon")
        .default("daemon")
        .transform((e) => {
          if (e === "daemon") return e;
          return (
            logForDebugging(
              `[jobs] coerced persisted backend '${e}' to 'daemon' \u2014 peer/remote rows are never written to disk`,
              { level: "warn" },
            ),
            "daemon"
          );
        }),
      sock: o().optional(),
      pid: E().optional(),
      keptBy: u({ pid: E().int().positive(), procStart: o().max(64).optional() }).optional(),
      sortOrder: E().optional(),
      stateSortOrder: E().optional(),
      group: o().optional(),
      pinned: M().optional(),
      reapedMidWorkAt: o().optional(),
      reapedUnsettledAt: o().optional(),
      deadEpochReapedAt: o().optional(),
      sessionIdTaken: M()
        .optional()
        .catch(void 0),
      replayOwed: M()
        .optional()
        .catch(void 0),
    }).transform(({ needs_you: needs_you, ...n }) => {
      let r =
          (n.bridgeOwnerAccountUuid !== void 0 && !isUuidShaped(n.bridgeOwnerAccountUuid)) ||
          (n.bridgeOwnerOrganizationUuid !== void 0 && !isUuidShaped(n.bridgeOwnerOrganizationUuid)),
        s = n.tempo ?? (needs_you ? "blocked" : "idle");
      return {
        ...n,
        ...(r && { bridgeOwnerAccountUuid: void 0, bridgeOwnerOrganizationUuid: void 0 }),
        tempo: s,
        ...(n.lastTerminalAt === void 0 &&
          terminalOutcome(n.state) !== null &&
          s !== "active" && { lastTerminalAt: n.firstTerminalAt || n.updatedAt }),
      };
    }),
  ),
  STATE_JSON = "state.json",
  V = 8388608;
//@ chunk-y162pn60.js:27221-27248 placement
function getJobsDir() {
  return aas();
}
//@ chunk-y162pn60.js:27248-27280 placement
function getJobDir(e) {
  return join(getJobsDir(), e);
}
//@ chunk-y162pn60.js:27280-27391 placement
function getOwnJobShortId() {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (CLAUDE_JOB_DIR) return basename(CLAUDE_JOB_DIR);
  let n = getBgTakeover();
  if (n) return basename(n.jobDir);
  return getSessionId().slice(0, 8);
}
//@ chunk-y162pn60.js:27391-27440 placement
function st(e, n) {
  return isValidKeySegment(e) ? STORAGE_SPACES.job(e, n) : void 0;
}
//@ chunk-y162pn60.js:27440-27474 placement
function jobKeyFor(e, n) {
  return Oro(e, n);
}
//@ chunk-y162pn60.js:27474-27512 placement
function jobStateKey(e) {
  return STORAGE_SPACES.job(e, [STATE_JSON]);
}
//@ chunk-y162pn60.js:27512-27821 placement
function watchJobDirOnce(e, n) {
  let r = join(getJobDir(e), STATE_JSON),
    s = !1,
    f = Number.NaN;
  function m(w) {
    if (s) return;
    if (Number.isNaN(f)) {
      f = w;
      return;
    }
    if (w === f) return;
    (h(), n());
  }
  function g() {
    lstat(r).then(
      (w) => m(w.mtimeMs),
      () => m(-1),
    );
  }
  g();
  let S = setInterval(g, 200),
    y = setTimeout(h, 1e4);
  function h() {
    if (s) return;
    ((s = !0), clearInterval(S), clearTimeout(y));
  }
  return h;
}
//@ chunk-y162pn60.js:27821-27869 placement
function isOwnStateWriteInFlight() {
  return NX().ownStateWriteDepth > 0;
}
//@ chunk-y162pn60.js:27869-28586 placement
async function writeStateAtomic(e, n, r) {
  let s = n.inFlight?.kinds.includes("session_cron") === !0,
    f =
      s && !n.selfWake && isSessionCronOnlyWake(n.inFlight)
        ? { ...n, selfWake: !0 }
        : !s && n.selfWake && isSettled(n)
          ? { ...n, selfWake: void 0 }
          : n,
    g = isSettled(f)
      ? f.lastTerminalAt
        ? f
        : { ...f, lastTerminalAt: f.updatedAt }
      : f.lastTerminalAt !== void 0
        ? { ...f, lastTerminalAt: void 0 }
        : f,
    { pinned: pinned, sortOrder: sortOrder, stateSortOrder: stateSortOrder, group: group, ...x } = g,
    F = r ? jobKeyFor(e, [STATE_JSON]) : void 0,
    O = NX();
  O.ownStateWriteDepth++;
  try {
    if (r && F) {
      let write = await r.write(F, jsonStringify(x, null, 2), { mode: 384, parent: "mustExist" });
      if (!write.ok) {
        let v = storageErrorCode(write.error);
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[jobs] v5 state write failed: ${formatStorageError(write.error)}`,
            "[jobs] v5 state write failed",
          ),
          v !== void 0 ? { code: v } : {},
        );
      }
    } else await writeFileAtomic(join(e, STATE_JSON), jsonStringify(x, null, 2), 384);
  } finally {
    (O.ownStateWriteDepth--, invalidateJobStateCache(e));
  }
}
//@ chunk-y162pn60.js:28586-28721 placement
function logJobWriteError(e) {
  let n = getErrnoCode(e);
  if (n && (RESOURCE_EXHAUSTION_CODES.has(n) || n === "ENOENT")) {
    logForDebugging(`[jobs] state write failed (${n}): ${errorMessage(e)}`, { level: "error" });
    return;
  }
  logError(e);
}
//@ chunk-y162pn60.js:28721-28972 placement
function resolveBridgeHandoffIdentity(e, n) {
  let r = n !== void 0 && n.id === e?.bridgeSessionId;
  return {
    ownerAccountUuid: r ? n.ownerAccountUuid : void 0,
    ownerOrganizationUuid: r ? n.ownerOrganizationUuid : void 0,
    noHistoryBackfill: e?.noHistoryBackfill || (n !== void 0 && !r ? !0 : n?.noHistoryBackfill),
  };
}
//@ chunk-y162pn60.js:28972-29441 placement
function buildBridgeReattachEnv(e, n, r, s, f) {
  if (!e) return;
  let m = { CLAUDE_BRIDGE_REATTACH_SESSION: e };
  if (n !== void 0 && n > 0) m.CLAUDE_BRIDGE_REATTACH_SEQ = String(n);
  if (s) m.CLAUDE_BRIDGE_REATTACH_GROUPING = s;
  if (f?.ownerAccountUuid) m.CLAUDE_BRIDGE_REATTACH_OWNER_ACCT = f.ownerAccountUuid;
  if (f?.ownerOrganizationUuid) m.CLAUDE_BRIDGE_REATTACH_OWNER_ORG = f.ownerOrganizationUuid;
  if (f?.noHistoryBackfill) m.CLAUDE_BRIDGE_REATTACH_NO_BACKFILL = "1";
  if (r !== !1) m.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY = "1";
  return m;
}
//@ chunk-y162pn60.js:29441-29477 placement
function I() {
  return nt.of(getRootSession().host);
}
//@ chunk-y162pn60.js:29477-29547 placement
function ke(e, n) {
  return n?.onReadFailure === "null" ? null : (e?.state ?? null);
}
//@ chunk-y162pn60.js:29547-29601 placement
var Wt = [15, 45],
  Ht = new Set(["ELOOP", "ENXIO", "EISDIR"]);
//@ chunk-y162pn60.js:29601-29768 placement
function classifyStorageRejection(e) {
  if (e.code !== "Failed" || e.telemetryCode === void 0) return;
  if (e.telemetryCode === "EFBIG") return "oversize";
  return Ht.has(e.telemetryCode) ? "non-regular" : void 0;
}
//@ chunk-y162pn60.js:29768-29872 placement
function isSidecarReadFailure(e) {
  return (
    e.code === "Failed" && e.key !== void 0 && e.key.namespace === "job" && e.key.relPath[0] !== STATE_JSON
  );
}
//@ chunk-y162pn60.js:29872-29929 placement
var Gt = new Set(["invariant", "permission", "environment"]);
//@ chunk-y162pn60.js:29929-30053 placement
function isTransientStorageError(e) {
  if (e.code === "Unavailable") return !0;
  return (
    e.code === "Failed" &&
    !Gt.has(e.failureClass) &&
    classifyStorageRejection(e) === void 0 &&
    !isSidecarReadFailure(e)
  );
}
/**
 * 对瞬时存储错误按退避重试读取；首次成功记干净读取，重试后成功记 tengu_bg_state_read_recovered（只一次）。
 */
//@ chunk-y162pn60.js:30053-30301 placement
async function retryStorageRead(e, n) {
  let r = await n(),
    s = 1;
  for (let f of Wt) {
    if (r.ok || !isTransientStorageError(r.error)) break;
    (await sleep(f), (r = await n()), s++);
  }
  if (r.ok) {
    if (s === 1) I().noteCleanRead(e);
    else if (I().shouldReportRecovered(e)) logEvent("tengu_bg_state_read_recovered", { attempts: s });
  }
  return r;
}
//@ chunk-y162pn60.js:30301-30508 placement
function rejectJobState(e, n, r) {
  let peek = I().peek(e);
  if (!(peek?.mtimeKey.startsWith("rejected:") && peek.state === null))
    logForDebugging(`[jobs] skipping ${basename(e)}: state.json is ${r}`, { level: "warn" });
  return (I().noteRejected(e, `rejected:${n}`), null);
}
//@ chunk-y162pn60.js:30508-30541 placement
function invalidateJobStateCache(e) {
  I().invalidate(e);
}
/**
 * 从存储 v5 读取作业 state.json 及 order/stateOrder/group sidecar：检查大小与类型，瞬时失败用缓存，版本未变命中缓存，否则解析。
 */
//@ chunk-y162pn60.js:30541-32339 placement
async function readJobStateFromStorage(e, n, r) {
  let jobId = basename(n),
    peek = I().peek(n);
  if (peek === void 0 || peek.mtimeKey.startsWith("rejected:")) {
    let statMeta = await e.statMeta(jobStateKey(jobId));
    if (!statMeta.ok) {
      if (statMeta.error.code === "NotFound") return _e(n, r);
      let L = classifyStorageRejection(statMeta.error);
      if (L !== void 0) return rejectJobState(n, L, L === "oversize" ? "too large" : "not a regular file");
    } else if (statMeta.value.size > V) {
      let L = `rejected:${statMeta.value.mtimeMs}:${statMeta.value.size}`;
      if (I().peek(n)?.mtimeKey !== L)
        (logForDebugging(
          `[jobs] skipping ${basename(n)}: state.json is too large (${statMeta.value.size} bytes)`,
          { level: "warn" },
        ),
          I().noteRejected(n, L));
      return null;
    }
  }
  let stateKey = jobStateKey(jobId),
    readResult = await retryStorageRead(n, () =>
      e.read([
        stateKey,
        STORAGE_SPACES.job(jobId, ["order"]),
        STORAGE_SPACES.job(jobId, ["stateOrder"]),
        STORAGE_SPACES.job(jobId, ["group"]),
      ]),
    );
  if (!readResult.ok && isSidecarReadFailure(readResult.error)) {
    if (I().shouldLogSidecarFallback(n))
      logForDebugging(
        `[jobs] ${basename(n)}: a sidecar could not be read as a regular file; using state.json alone`,
      );
    let read = await e.read([stateKey]);
    readResult = read.ok
      ? { ok: !0, value: { items: [read.value.items[0], { found: !1 }, { found: !1 }, { found: !1 }] } }
      : read;
  }
  let peek_2 = I().peek(n);
  if (!readResult.ok) {
    let R = classifyStorageRejection(readResult.error);
    if (R !== void 0) return rejectJobState(n, R, R === "oversize" ? "too large" : "not a regular file");
    if (
      (logForDebugging(`[jobs] ${basename(n)}: v5 state read failed \u2014 ${readResult.error.code}`, {
        level: "warn",
      }),
      I().shouldReportTransient(n))
    )
      logEvent("tengu_bg_state_read_transient", {
        errno: fromEnum(readResult.error.code),
        had_cache: peek_2 !== void 0,
      });
    return ke(peek_2, r);
  }
  let [stateItem, orderItem, stateOrderItem, groupItem] = readResult.value.items;
  if (!stateItem.found) return _e(n, r);
  if (stateItem.totalBytes > V) {
    let R = `rejected:${stateItem.mtimeMs}:${stateItem.totalBytes}`;
    if (peek_2?.mtimeKey === R) return null;
    return (
      logForDebugging(
        `[jobs] skipping ${basename(n)}: state.json is too large (${stateItem.totalBytes} bytes)`,
        { level: "warn" },
      ),
      I().noteRejected(n, R),
      null
    );
  }
  let O = (R) => Buffer.from(R.value.buffer, R.value.byteOffset, R.value.byteLength).toString("utf-8"),
    P = (R) => (R.found && R.totalBytes <= V ? O(R) : null),
    v = (R) => (R.found && R.totalBytes <= V ? R.version : 0),
    versionKey = `v5:${stateItem.version}:${v(orderItem)}:${v(stateOrderItem)}:${v(groupItem)}`;
  if (peek_2?.mtimeKey === versionKey) return (I().noteHit(n), peek_2.state);
  return parseJobStateText(
    n,
    versionKey,
    O(stateItem),
    P(orderItem),
    P(stateOrderItem),
    P(groupItem),
    peek_2,
    r,
  );
}
/**
 * 解析作业 state.json：schema 校验失败记 tengu_bg_state_read_rejected 并缓存拒绝；保留未知字段，合并排序与分组 sidecar，结果写入缓存；解析异常时回退缓存。
 */
//@ chunk-y162pn60.js:32339-33301 placement
function parseJobStateText(jobDir, cacheKey, stateText, orderText, stateOrderText, groupText, cached, S) {
  try {
    let raw = jsonParse(stateText),
      safeParse = jobStateSchema().safeParse(raw);
    if (!safeParse.success) {
      if (
        (logForDebugging(
          `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${safeParse.error.message}`,
          { level: "warn" },
        ),
        I().shouldReportRejected(jobDir))
      )
        logEvent("tengu_bg_state_read_rejected", {});
      return (I().noteRejected(jobDir, cacheKey), null);
    }
    let sortOrder = orderText !== null ? Number(orderText) : void 0,
      stateSortOrder = stateOrderText !== null ? Number(stateOrderText) : void 0,
      shape = jobStateSchema().in.shape,
      extraFields =
        raw !== null && typeof raw === "object"
          ? Object.entries(raw).filter(([v]) => !Object.hasOwn(shape, v))
          : [],
      state = { ...Object.fromEntries(extraFields), ...safeParse.data };
    if (Number.isFinite(sortOrder)) state = { ...state, sortOrder: sortOrder };
    if (Number.isFinite(stateSortOrder)) state = { ...state, stateSortOrder: stateSortOrder };
    if (groupText !== null && groupText.trim()) state = { ...state, group: groupText.trim() };
    if (state.group !== void 0) state = { ...state, group: ye(state.group) };
    return (I().noteParsed(jobDir, cacheKey, state), state);
  } catch (error) {
    if (
      (logForDebugging(
        `[jobs] ${basename(jobDir)}: state.json read/parse failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      ),
      I().shouldReportTransient(jobDir))
    )
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: cached !== void 0,
      });
    return ke(cached, S);
  }
}
//@ chunk-y162pn60.js:33301-33364 placement
function _e(e, n) {
  return (I().noteAbsent(e), n?.onAbsent?.(), null);
}
//@ chunk-y162pn60.js:33364-33426 placement
async function readJobStateFreshOrNull(e, n) {
  return loadJobState(e, n, { onReadFailure: "null" });
}
//@ chunk-y162pn60.js:33426-33471 placement
async function readJobState(e, n) {
  return loadJobState(e, n, void 0);
}
//@ chunk-y162pn60.js:33471-33585 placement
async function readJobStateOrAbsent(e, n) {
  let r = { absent: !1 },
    s = await loadJobState(e, n, {
      onAbsent: () => {
        r.absent = !0;
      },
    });
  return r.absent ? "absent" : s;
}
/**
 * 读取作业状态：存储 v5 可用时走存储；否则 lstat state.json 与 sidecar（非普通文件或过大则拒绝），按修改时间命中缓存，读取并解析合并 sidecar；出错时回退缓存并记瞬时错误。
 */
//@ chunk-y162pn60.js:33585-35825 placement
async function loadJobState(jobDir, storage, options) {
  if (storage !== void 0 && jobKeyFor(jobDir, [STATE_JSON]) !== void 0)
    return readJobStateFromStorage(storage, jobDir, options);
  let statePath = join(jobDir, STATE_JSON),
    orderPath = join(jobDir, "order"),
    stateOrderPath = join(jobDir, "stateOrder"),
    groupPath = join(jobDir, "group"),
    mtimeKey,
    sidecarsUsable;
  try {
    let [w, x, F, O] = await Promise.all([
      lstat(statePath),
      lstat(orderPath).catch(() => null),
      lstat(stateOrderPath).catch(() => null),
      lstat(groupPath).catch(() => null),
    ]);
    if (!w.isFile() || w.size > V) {
      let v = `rejected:${w.mtimeMs}:${w.size}`;
      if (I().peek(jobDir)?.mtimeKey === v) return null;
      return (
        logForDebugging(
          `[jobs] skipping ${basename(jobDir)}: state.json is ${w.isFile() ? `too large (${w.size} bytes)` : "not a regular file"}`,
          { level: "warn" },
        ),
        I().noteRejected(jobDir, v),
        null
      );
    }
    let P = (v) => v !== null && v.isFile() && v.size <= V;
    ((sidecarsUsable = { order: P(x), stateOrder: P(F), group: P(O) }),
      (mtimeKey = `${w.mtimeMs}:${sidecarsUsable.order ? x.mtimeMs : 0}:${sidecarsUsable.stateOrder ? F.mtimeMs : 0}:${sidecarsUsable.group ? O.mtimeMs : 0}`));
  } catch (error) {
    if (isENOENT(error)) return _e(jobDir, options);
    logForDebugging(
      `[jobs] ${basename(jobDir)}: state.json stat failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
    let peek = I().peek(jobDir);
    if (I().shouldReportTransient(jobDir))
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: peek !== void 0,
      });
    return ke(peek, options);
  }
  let peek = I().peek(jobDir);
  if (peek?.mtimeKey === mtimeKey) return (I().noteHit(jobDir), peek.state);
  try {
    let [w, x, F, O] = await Promise.all([
        readFile(statePath, "utf-8"),
        sidecarsUsable.order ? readFile(orderPath, "utf-8").catch(() => null) : Promise.resolve(null),
        sidecarsUsable.stateOrder
          ? readFile(stateOrderPath, "utf-8").catch(() => null)
          : Promise.resolve(null),
        sidecarsUsable.group ? readFile(groupPath, "utf-8").catch(() => null) : Promise.resolve(null),
      ]),
      P = jsonParse(w),
      safeParse = jobStateSchema().safeParse(P);
    if (!safeParse.success) {
      if (
        (logForDebugging(
          `[jobs] skipping ${basename(jobDir)}: state.json schema validation failed \u2014 ${safeParse.error.message}`,
          { level: "warn" },
        ),
        I().shouldReportRejected(jobDir))
      )
        logEvent("tengu_bg_state_read_rejected", {});
      return (I().noteRejected(jobDir, mtimeKey), null);
    }
    let D = x !== null ? Number(x) : void 0,
      R = F !== null ? Number(F) : void 0,
      shape = jobStateSchema().in.shape,
      j =
        P !== null && typeof P === "object"
          ? Object.entries(P).filter(([ie]) => !Object.hasOwn(shape, ie))
          : [],
      G = { ...Object.fromEntries(j), ...safeParse.data };
    if (Number.isFinite(D)) G = { ...G, sortOrder: D };
    if (Number.isFinite(R)) G = { ...G, stateSortOrder: R };
    if (O !== null && O.trim()) G = { ...G, group: O.trim() };
    if (G.group !== void 0) G = { ...G, group: ye(G.group) };
    return (I().noteParsed(jobDir, mtimeKey, G), G);
  } catch (error) {
    if (isENOENT(error)) return _e(jobDir, options);
    if (
      (logForDebugging(
        `[jobs] ${basename(jobDir)}: state.json read/parse failed \u2014 ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      ),
      I().shouldReportTransient(jobDir))
    )
      logEvent("tengu_bg_state_read_transient", {
        errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        had_cache: peek !== void 0,
      });
    return ke(peek, options);
  }
}
//@ chunk-y162pn60.js:35825-36045 placement
async function readJobStateAfterSettle(e, n) {
  invalidateJobStateCache(e);
  let r = await readJobState(e, n).catch(() => null);
  if (
    r !== null &&
    r.state !== "done" &&
    r.state !== "stopped" &&
    r.state !== "blocked" &&
    r.state !== "failed"
  )
    (await sleep(50), invalidateJobStateCache(e), (r = (await readJobState(e, n).catch(() => null)) ?? r));
  return r;
}
//@ chunk-y162pn60.js:36045-36085 placement
function Q() {
  return join(getJobsDir(), "pins.json");
}
//@ chunk-y162pn60.js:36085-36097 placement
var Zt = 5000;
/**
 * 读取 MCP 认证缓存（v5 存储）条目。
 */
//@ chunk-y162pn60.js:36097-36358 placement = getMcpAuthCache (1)
async function readPinnedJobIds(e) {
  if (e) return readJobPinsFromStorage(e);
  try {
    let n = await lstat(Q());
    if (!n.isFile() || n.size > V) {
      if (!n.isFile()) await removeBadPinsFile();
      return new Set();
    }
    return parsePinnedIds(await readFile(Q(), "utf-8"));
  } catch (error) {
    if (isENOENT(error))
      return (
        await writeFileAtomic(Q(), jsonStringify([])).catch((data) => {
          if (!isENOENT(data)) logJobWriteError(data);
        }),
        new Set()
      );
    return new Set();
  }
}
//@ chunk-y162pn60.js:36358-36475 placement
async function readJobPinsFromStorage(e) {
  let n = await readCappedStorageText(e, STORAGE_SPACES.jobPins(), {
    cap: V,
    screens: lt(),
    screenKey: Q(),
    heal: removeBadPinsFile,
  });
  return parsePinnedIds(n ?? void 0);
}
//@ chunk-y162pn60.js:36475-36518 placement
function lt() {
  return JVr.of(getRootSession().host).pins;
}
//@ chunk-y162pn60.js:36518-36700 placement
function parsePinnedIds(e) {
  if (e === void 0 || e.length > V) return new Set();
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
  let n = await lstat(Q()).catch(() => {
    return;
  });
  if (n === void 0 || (n.isFile() && !(e?.evenRegular && n.size > V))) return !1;
  return (await rm(Q(), { recursive: !0, force: !0 }).catch(() => {}), !0);
}
//@ chunk-y162pn60.js:36887-37197 placement
async function syncJobName(e, n, r, s, f) {
  let m = getJobDir(e),
    g = await readJobState(m, s);
  if (!g) return !1;
  if (g.name === n) return !0;
  invalidateJobStateCache(m);
  let S = (await readJobState(m, s)) ?? g;
  if (S.name === n || (r === "auto" && S.name)) return !0;
  if (!isAutoOrMatchingName(S, f)) return !1;
  return writeStateAtomic(m, { ...S, name: n, nameSource: r, updatedAt: new Date().toISOString() }, s).then(
    () => !0,
    (y) => {
      if (!isENOENT(y)) logJobWriteError(y);
      return !1;
    },
  );
}
//@ chunk-y162pn60.js:37197-37452 placement = updateSessionActivity (0.701)
async function syncJobColor(e, n, r) {
  let s = getJobDir(e),
    f = await readJobState(s, r);
  if (!f) return !1;
  if (f.color === n) return !0;
  invalidateJobStateCache(s);
  let m = (await readJobState(s, r)) ?? f;
  if (m.color === n) return !0;
  return writeStateAtomic(s, { ...m, color: n, updatedAt: new Date().toISOString() }, r).then(
    () => !0,
    (g) => {
      if (!isENOENT(g)) logJobWriteError(g);
      return !1;
    },
  );
}
//@ chunk-y162pn60.js:37452-37492 placement
function getBgRelocatedCwd() {
  return NX().relocatedCwd;
}
//@ chunk-y162pn60.js:37492-37865 placement
async function relocateBgSessionCwd(e, n) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  ((NX().relocatedCwd = e), invalidateJobStateCache(CLAUDE_JOB_DIR));
  let s = await readJobState(CLAUDE_JOB_DIR, n),
    f = s?.worktreePath ? s.originCwd : e;
  if (!s || (s.cwd === e && s.originCwd === f)) return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let m = (await readJobState(CLAUDE_JOB_DIR, n)) ?? s;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    { ...m, cwd: e, originCwd: m.worktreePath ? m.originCwd : e, updatedAt: new Date().toISOString() },
    n,
  ).catch((g) => {
    if (!isENOENT(g)) logJobWriteError(g);
  });
}
//@ chunk-y162pn60.js:37865-38208 placement
async function syncJobResumeSessionId(e, n, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let f = await readJobState(CLAUDE_JOB_DIR, r);
  if (!f || (f.resumeSessionId === e && f.linkScanPath === n)) return;
  invalidateJobStateCache(CLAUDE_JOB_DIR);
  let m = (await readJobState(CLAUDE_JOB_DIR, r)) ?? f;
  await writeStateAtomic(
    CLAUDE_JOB_DIR,
    { ...m, resumeSessionId: e, linkScanPath: n, linkScanOffset: 0, updatedAt: new Date().toISOString() },
    r,
  ).catch((g) => {
    if (!isENOENT(g)) logJobWriteError(g);
  });
}
//@ chunk-y162pn60.js:38208-38877 placement
async function syncLiveInFlightSnapshot(e, n, { includeSettled: r = !1 } = {}) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let f = await readJobState(CLAUDE_JOB_DIR, n);
    if (!f?.inFlight || (isSettled(f) && !r) || f.tempo === "active") return;
    let inFlight = f.inFlight;
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
        ...f,
        inFlight: {
          tasks: e.count,
          queued: inFlight.queued,
          kinds: [...e.kinds],
          ...(e.drainableMonitors !== void 0 &&
            e.drainableMonitors > 0 && { drainableMonitors: e.drainableMonitors }),
          ...(inFlight.wake !== void 0 && { wake: inFlight.wake }),
        },
        updatedAt: new Date().toISOString(),
      },
      n,
    ).catch((g) => {
      if (!isENOENT(g)) logJobWriteError(g);
    });
  });
}
//@ chunk-y162pn60.js:38877-39018 placement
function isAutoOrMatchingName(e, n) {
  if (n === void 0 || !e.name) return !0;
  if (e.nameSource === "auto" || e.nameSource === "collision") return !0;
  return n.includes(sanitizeSessionTitle(e.name));
}
//@ chunk-y162pn60.js:39018-39765 placement
async function syncRespawnFlag(e, n, r, s, f, m, g) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let y = await readJobState(CLAUDE_JOB_DIR, f);
    if (!y?.respawnFlags) return;
    if (g && !g(y.respawnFlags)) return;
    let h = [e, ...n],
      w = (v) => {
        let D = [];
        for (let R = 0; R < v.length; R++) {
          let L = v[R];
          if (h.some((j) => L === j || L.startsWith(`${j}=`))) {
            if (L.indexOf("=") === -1 && v[R + 1] !== void 0) R++;
            continue;
          }
          D.push(L);
        }
        if (r === null) return D;
        return [...D, ...xT(e, r)];
      },
      x = w(y.respawnFlags);
    if (x.length === y.respawnFlags.length && x.every((v, D) => v === y.respawnFlags[D])) return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let F = (await readJobState(CLAUDE_JOB_DIR, f)) ?? y,
      O = F.respawnFlags ?? y.respawnFlags;
    if (g && !g(O)) return;
    let P = isAutoOrMatchingName(F, m);
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      { ...F, ...(P ? s : {}), respawnFlags: w(O), updatedAt: new Date().toISOString() },
      f,
    ).catch((v) => {
      if (!isENOENT(v)) logJobWriteError(v);
    });
  });
}
//@ chunk-y162pn60.js:39765-40207 placement
async function appendRespawnFlag(e, n, r) {
  let CLAUDE_JOB_DIR = env.CLAUDE_JOB_DIR;
  if (!CLAUDE_JOB_DIR || env.CLAUDE_CODE_SESSION_KIND !== "bg") return;
  await withOwnJobStateWrite(async () => {
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let f = await readJobState(CLAUDE_JOB_DIR, r);
    if (!f?.respawnFlags) return;
    let m = xT(e, n);
    for (let S = 0; S <= f.respawnFlags.length - m.length; S++)
      if (m.every((y, h) => f.respawnFlags[S + h] === y)) return;
    invalidateJobStateCache(CLAUDE_JOB_DIR);
    let g = (await readJobState(CLAUDE_JOB_DIR, r)) ?? f;
    await writeStateAtomic(
      CLAUDE_JOB_DIR,
      { ...g, respawnFlags: [...(g.respawnFlags ?? []), ...m], updatedAt: new Date().toISOString() },
      r,
    ).catch((S) => {
      if (!isENOENT(S)) logJobWriteError(S);
    });
  });
}
//@ chunk-y162pn60.js:40207-40346 placement
async function replaceFileExclusive(e, n) {
  await rm(e, { force: !0 });
  let r = await writeIfMissing(e, n);
  try {
    await retryFsOp(r, e);
  } catch (error) {
    throw (await rm(r, { force: !0 }).catch(() => {}), error);
  }
}
//@ chunk-y162pn60.js:40346-40605 placement
async function writeJobSidecarToStorage(e, n, r) {
  let write = await e.write(n, r, { parent: "mustExist", mode: 438 & ~process.umask() });
  if (!write.ok) {
    let f = storageErrorCode(write.error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[jobs] v5 sidecar write failed: ${formatStorageError(write.error)}`,
        "[jobs] v5 sidecar write failed",
      ),
      f !== void 0 ? { code: f } : {},
    );
  }
}
//@ chunk-y162pn60.js:40605-40744 placement
async function writeSortOrder(e, n, r) {
  let s = isStorageV5Enabled() && r ? jobKeyFor(e, ["order"]) : void 0;
  if (r && s) await writeJobSidecarToStorage(r, s, String(n));
  else await replaceFileExclusive(join(e, "order"), String(n));
  invalidateJobStateCache(e);
}
//@ chunk-y162pn60.js:40744-40893 placement
async function writeStateSortOrder(e, n, r) {
  let s = isStorageV5Enabled() && r ? jobKeyFor(e, ["stateOrder"]) : void 0;
  if (r && s) await writeJobSidecarToStorage(r, s, String(n));
  else await replaceFileExclusive(join(e, "stateOrder"), String(n));
  invalidateJobStateCache(e);
}
//@ chunk-y162pn60.js:40893-41202 placement
async function writeJobGroup(e, n, r) {
  let s = join(e, "group"),
    f = ye(n),
    m = isStorageV5Enabled() && r ? jobKeyFor(e, ["group"]) : void 0;
  if (r && m)
    if (f) await writeJobSidecarToStorage(r, m, f);
    else {
      let g = await r.delete(m);
      if (!g.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[jobs] v5 sidecar delete failed: ${g.error.code}`,
          "[jobs] v5 sidecar delete failed",
        );
    }
  else if (f) await replaceFileExclusive(s, f);
  else await rm(s, { force: !0 });
  invalidateJobStateCache(e);
}
//@ chunk-y162pn60.js:41202-41490 placement = immediateFlushHistory (0.302)
async function withSortOrderLock(e) {
  let n = join(getJobsDir(), ".order");
  await mkdir(getJobsDir(), { recursive: !0 });
  await using r = await lock(n, {
    realpath: !1,
    stale: 5000,
    retries: { retries: 5, minTimeout: 20 },
    onCompromised: (entry) =>
      logForDebugging(`jobs/.order lock compromised (likely process suspend or slow fs): ${entry}`, {
        level: "error",
      }),
  });
  return await e();
}
//@ chunk-y162pn60.js:41490-41502 placement
var ct = createKeyedQueue();
//@ chunk-y162pn60.js:41502-41552 placement
function withOwnJobStateWrite(e) {
  return ct.run("own-state.json", e);
}
//@ chunk-y162pn60.js:41552-42047 placement
function writeJobPinned(e, n, r) {
  return ct.run("pins.json", async () => {
    if (isStorageV5Enabled() && r) return setJobPinnedInStorage(e, n, r);
    let s = Q();
    await mkdir(dirname(s), { recursive: !0 });
    await using f = await lock(s, {
      realpath: !1,
      stale: Zt,
      retries: { retries: 5, minTimeout: 20 },
      onCompromised: (g) =>
        logForDebugging(`pins.json lock compromised (likely process suspend or slow fs): ${g}`, {
          level: "error",
        }),
    });
    let m = await readPinnedJobIds();
    if (n ? m.has(e) : !m.has(e)) return;
    if (n) m.add(e);
    else
      (m.delete(e),
        await rm(join(getJobDir(e), "order")).catch((g) => {
          if (!isENOENT(g)) throw g;
        }),
        invalidateJobStateCache(getJobDir(e)));
    await writeFileAtomic(s, jsonStringify([...m], null, 2));
  });
}
/**
 * 在存储中更新置顶作业列表（加入或移除）；文件异常时先清理；取消置顶后删除该作业的 order sidecar 并使状态缓存失效。
 */
//@ chunk-y162pn60.js:42047-42973 placement
async function setJobPinnedInStorage(e, n, r) {
  let updatePins = (y) => {
      let h = parsePinnedIds(y?.value);
      if (n ? h.has(e) : !h.has(e)) return { skip: !0, result: !1 };
      if (n) h.add(e);
      else h.delete(e);
      return { write: jsonStringify([...h], null, 2), result: !0 };
    },
    f = lt(),
    statMeta = await r.statMeta(STORAGE_SPACES.jobPins());
  if (statMeta.ok && statMeta.value.size > V) (await removeBadPinsFile({ evenRegular: !0 }), f.delete(Q()));
  else if (!statMeta.ok && classifyStorageRejection(statMeta.error) !== void 0)
    (await removeBadPinsFile(), f.delete(Q()));
  let writeOptions = { publishDiscipline: "atomic", mode: 438 & ~process.umask() },
    updateText = await r.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!updateText.ok && (await removeBadPinsFile()))
    updateText = await r.updateText(STORAGE_SPACES.jobPins(), updatePins, writeOptions);
  if (!updateText.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[jobs] v5 pins update failed: ${updateText.error.code}`,
      "[jobs] v5 pins update failed",
    );
  if (!n && updateText.value.result === !0) {
    let y = st(e, ["order"]);
    if (y) {
      let h = await r.delete(y);
      if (!h.ok)
        logForDebugging(`[jobs] v5 order sidecar release failed after unpin: ${h.error.code}`, {
          level: "warn",
        });
    } else
      await rm(join(getJobDir(e), "order")).catch((h) => {
        if (!isENOENT(h))
          logForDebugging(`[jobs] order sidecar release failed after unpin: ${errorMessage(h)}`, {
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
    s = await readdir(getJobsDir(), { withFileTypes: !0 });
  } catch (error) {
    if (isUnavailableErrorCode(getErrnoCode(error))) r?.();
    return [];
  }
  let [f, m] = await Promise.all([
      readPinnedJobIds(),
      Promise.all(
        s
          .filter((S) => S.isDirectory())
          .map(async (S) => {
            let y = await readJobState(join(getJobsDir(), S.name));
            return y ? { id: S.name, state: y } : null;
          }),
      ),
    ]),
    mapped = m
      .filter((S) => S !== null)
      .map((S) => (f.has(S.id) ? { ...S, state: { ...S.state, pinned: !0 } } : S));
  return e ? markCrashed(mapped, e) : mapped;
}
/**
 * 分页列出存储中所有任务的 id。
 */
//@ chunk-y162pn60.js:43370-43767 placement
async function listStoredJobIds(e) {
  let n = [],
    r;
  do {
    let listEntries = await e.listEntries(
      { namespace: "job" },
      r === void 0 ? { skipScopeStats: !0 } : { cursor: r, skipScopeStats: !0 },
    );
    if (!listEntries.ok) return { ok: !1, error: listEntries.error };
    for (let item of listEntries.value.items)
      if (
        item.kind === "scope" &&
        item.scope.namespace === "job" &&
        item.scope.jobId !== void 0 &&
        item.scope.relPath === void 0 &&
        isValidKeySegment(item.scope.jobId)
      )
        n.push(item.scope.jobId);
    r = listEntries.value.cursor;
  } while (r !== void 0);
  return { ok: !0, ids: n };
}
/**
 * 列出存储中的全部作业及其状态，标记置顶；存储不可用时回调并返回空；需要时标记崩溃的作业。
 */
//@ chunk-y162pn60.js:43767-44088 placement
async function listJobsFromStorage(e, n, r) {
  let s = await listStoredJobIds(e);
  if (!s.ok) {
    if (isUnavailableError(s.error)) r?.();
    return [];
  }
  let ids = s.ids,
    [m, g] = await Promise.all([
      readPinnedJobIds(e),
      Promise.all(
        ids.map(async (y) => {
          let h = await readJobState(getJobDir(y), e);
          return h ? { id: y, state: h } : null;
        }),
      ),
    ]),
    mapped = g
      .filter((y) => y !== null)
      .map((y) => (m.has(y.id) ? { ...y, state: { ...y.state, pinned: !0 } } : y));
  return n ? markCrashed(mapped, n) : mapped;
}
//@ chunk-y162pn60.js:44088-44319 placement
function markCrashed(e, n) {
  let now = Date.now();
  return e.map((s) => {
    if (isSettled(s.state)) return s;
    if (n.has(s.id)) return s;
    if (s.state.keptBy !== void 0 && sn(s.state)) return s;
    if (now - Date.parse(s.state.createdAt) < rn) return s;
    return { ...s, state: markJobFailedOrBlocked(s.state) };
  });
}
//@ chunk-y162pn60.js:44319-44331 placement
var rn = 5000;
//@ chunk-y162pn60.js:44331-44519 placement
function markJobFailedOrBlocked(e) {
  if (hasOutstandingAsk(e)) return { ...e, tempo: "blocked", inFlight: void 0 };
  return {
    ...e,
    state: "failed",
    tempo: "idle",
    needs: void 0,
    block: void 0,
    inFlight: void 0,
    detail: stripSuffix(e.detail, "; respawning"),
  };
}
//@ chunk-y162pn60.js:44519-44572 placement
var SEED_DETAIL = "starting\u2026",
  IDLE_NEEDS = "send a prompt to start";
//@ chunk-y162pn60.js:44572-44638 placement
function isOverlayNeeds(e) {
  return e.needs !== void 0 && e.needsOverlay === e.needs;
}
//@ chunk-y162pn60.js:44638-44778 placement
var IDLE_DETAIL = `(idle \u2014 ${IDLE_NEEDS})`,
  PRE_BOOT_STATES = ["starting", "resuming", "adopted", "crashed"],
  ABANDONED_WORKER_MS = 172800000,
  an = "ended while the background service was off";
//@ chunk-y162pn60.js:44778-45957 placement
function makeInitialState(e) {
  let iso = new Date().toISOString();
  return {
    state: "working",
    detail: e.detail !== void 0 ? redactSecrets(e.detail) : SEED_DETAIL,
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
    color: getEffectiveAgentColor({ userOverride: e.color, agentDefinitionColor: e.template.color }),
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
  let s = new Set(e.map((h) => h.id)),
    filtered = n.filter((h) => at.test(h.short) && !s.has(h.short) && h.source !== "spare" && !h.dying);
  if (filtered.length === 0) return e;
  let m = await readRoster({ silent: !0 }, r),
    results = await Promise.all(
      filtered.map((h) => {
        let w = m.workers[h.short];
        return checkProcessLiveness(h.pid, w?.pid === h.pid ? w.procStart : void 0);
      }),
    );
  for (let [h, w] of filtered.entries())
    if (results[h] !== "live") {
      if (
        (logForDebugging(`[adoptRosterOrphans] pruned dead record ${w.short} (${results[h]})`),
        I().shouldReportPruned(w.short))
      )
        logEvent("tengu_bg_roster_orphan_pruned", { reason: fromEnum(results[h] ?? "dead_pid") });
    } else I().notePruneCandidateLive(w.short);
  let filtered_2 = filtered.filter((h, w) => results[w] === "live");
  if (filtered_2.length === 0) return e;
  let mapped = filtered_2.map((h) => {
    let w = {
        ...makeInitialState({
          template: { name: h.agent ?? "bg", description: "" },
          routine: h.routine,
          intent: h.intent,
          name: h.name,
          detail: h.detail,
          ...(h.tempo === "active" && (h.state === "running" || PRE_BOOT_STATES.includes(h.state))
            ? h.routine
              ? { tempo: "idle" }
              : { tempo: "blocked", needs: IDLE_NEEDS }
            : { tempo: h.tempo, needs: h.needs }),
          sessionId: stripLongPathPrefixes(h.sessionId),
          cwd: stripLongPathPrefixes(h.cwd),
          worktreePath: h.worktreePath === void 0 ? void 0 : stripLongPathPrefixes(h.worktreePath),
        }),
        createdAt: new Date(h.createdAt ?? h.startedAt).toISOString(),
        daemonShort: h.short,
        state: PRE_BOOT_STATES.includes(h.state) ? "working" : h.state,
        ...(isTerminal(h.state) && { inFlight: { tasks: 0, queued: 0, kinds: [] } }),
      },
      x = getJobDir(h.short),
      F = r ? st(h.short, [STATE_JSON]) : void 0;
    if (r && F)
      r.write(F, jsonStringify(w), { precondition: { type: "ifAbsent" }, mode: 384 }).then((O) => {
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
      mkdir(x, { recursive: !0 })
        .then(() => writeNewFile(join(x, "state.json"), jsonStringify(w), 384))
        .then(() => logEvent("tengu_bg_roster_orphan_adopted", {}))
        .catch((O) => {
          if (getErrnoCode(O) !== "EEXIST") logJobWriteError(O);
        });
    return { id: h.short, state: w };
  });
  return [...e, ...mapped];
}
/**
 * 任务状态 done/failed/stopped → success/failure/stopped。名字配错，见 lead 建议。
 */
//@ chunk-y162pn60.js:47688-47810 placement = fetchInstallCountsFromGitHub (0.627)
function terminalOutcome(e) {
  if (e === "done") return "success";
  if (e === "failed") return "failure";
  if (e === "stopped") return "stopped";
  return null;
}
//@ chunk-y162pn60.js:47810-47845 placement
function isTerminal(e) {
  return terminalOutcome(e) !== null;
}
//@ chunk-y162pn60.js:47845-47899 placement
function isSettled(e) {
  return isTerminal(e.state) && e.tempo !== "active";
}
//@ chunk-y162pn60.js:47899-47978 placement
function sn(e) {
  return e.intent === "" && e.needs === IDLE_NEEDS && e.tempo === "blocked" && !isSettled(e);
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
function isLocalDaemonAgent(e) {
  return e.backend === "daemon" && !isExecLaunch(e);
}
//@ chunk-y162pn60.js:48150-48266 placement
function spawnOrigin(e) {
  let n = e.originCwd || (e.cwd.match(/^(.+?)[/\\]\.claude[/\\]worktrees[/\\]/)?.[1] ?? e.cwd);
  return stripLongPathPrefixes(n);
}
//@ chunk-y162pn60.js:48266-48380 placement
function jobMatchesCwd(e, n) {
  if (e.backend === "remote") return !0;
  let r = relative(n, spawnOrigin(e));
  return r.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute_2(r);
}
//@ chunk-y162pn60.js:48380-48494 placement
function isLoopJob(e) {
  let n = (r) => r?.trim().toLowerCase().startsWith("/loop") ?? !1;
  return n(e.intent) || n(e.initialPrompt);
}
//@ chunk-y162pn60.js:48494-48610 placement
function isSelfDriving(e) {
  return (
    e.routine !== void 0 ||
    e.selfWake === !0 ||
    (e.inFlight?.kinds.includes("session_cron") ?? !1) ||
    isLoopJob(e)
  );
}
//@ chunk-y162pn60.js:48610-49379 placement
function writeReapedTerminalState(e, n, r, s, f) {
  let m = getJobDir(e);
  return readJobState(m, f)
    .then(async (g) => {
      if (!g || isSettled(g) || (n === "failed" && hasOutstandingAsk(g))) return "none";
      let now = Date.now(),
        iso = new Date(now).toISOString(),
        h =
          s?.resumable === "auto-resume" &&
          n === "failed" &&
          !isExecLaunch(g) &&
          now - Date.parse(g.updatedAt) > ABANDONED_WORKER_MS;
      return (
        await writeStateAtomic(
          m,
          {
            ...g,
            state: h ? "stopped" : n === "crashed" ? "failed" : n,
            detail: h
              ? an
              : n === "stopped"
                ? "stopped"
                : n === "failed"
                  ? stripSuffix(g.detail || r, "; respawning")
                  : r,
            tempo: "idle",
            inFlight: void 0,
            needs: void 0,
            updatedAt: iso,
            firstTerminalAt: g.firstTerminalAt ?? (h ? g.updatedAt : iso),
            lastTerminalAt: h ? g.updatedAt : iso,
            ...(s?.resumable === "auto-resume" &&
              n === "failed" &&
              (h ? { deadEpochReapedAt: iso } : { reapedMidWorkAt: g.updatedAt })),
            ...(s?.resumable === "wake-only" && n === "failed" && { reapedUnsettledAt: g.updatedAt }),
          },
          f,
        ),
        h ? "dead-epoch" : "settled"
      );
    })
    .catch((g) => (logJobWriteError(g), "none"));
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
  JVr,
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
