/**
 * services/daemon/roster.ts
 *
 * 2.1.316 新增：后台会话名册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (20)
 * attribution: placement 20
 */
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  rm,
  rm as rm_2,
  readFile,
  readFile as readFile_2,
  rename,
  mkdir,
  mkdir as mkdir_2,
} from "fs/promises";
import { dirname, dirname as dirname_2 } from "path";
import { We, checkJobFileWritable, sanitizeJsonPath } from "./sessionCron.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { BG_PROTO, RosterSchema, SHORT_RE } from "./leaseProtocol.js";
import { Q6 } from "../../utils/sandbox/userNamespace.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import {
  lit,
  fromEnumArr,
  fromEnumOpt,
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
} from "../analytics/safeMetadata.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  isENOENT,
  withTelemetryMessage,
  toError,
  sanitizedErrCodeForTelemetry,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  RESOURCE_EXHAUSTION_CODES,
  getErrnoCode,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";

/**
 * 存储读取失败是否属于不可恢复类型（ENXIO、EFBIG、ELOOP、ENAMETOOLONG）。
 */
//@ chunk-y162pn60.js:11738-11897 placement
function isUnrecoverableStorageRead(e) {
  return (
    e?.code === "Failed" &&
    (e.telemetryCode === "ENXIO" ||
      e.telemetryCode === "EFBIG" ||
      e.telemetryCode === "ELOOP" ||
      e.telemetryCode === "ENAMETOOLONG")
  );
}
/**
 * 后台会话名册允许的字段集合及名册文件大小上限。
 */
//@ chunk-y162pn60.js:11897-12529 placement
var ROSTER_KEYS = We([
    "proto",
    "supervisorPid",
    "updatedAt",
    "workers",
    "pid",
    "procStart",
    "sessionId",
    "rendezvousSock",
    "ptySock",
    "messagingSock",
    "rvAuth",
    "ptyAuth",
    "replPid",
    "replProcStart",
    "cliVersion",
    "startedAt",
    "attempt",
    "cwd",
    "worktreePath",
    "dispatch",
    "pendingRespawn",
    "decModes",
    "firedInteractiveMarks",
    "kind",
    "msgsLoaded",
    "msgsInJsonl",
    "msgsRenderedAtFirstPaint",
    "short",
    "restoresTranscript",
    "nonce",
    "createdAt",
    "cols",
    "rows",
    "source",
    "launch",
    "mode",
    "args",
    "fork",
    "flagArgs",
    "cmd",
    "env",
    "reattachEnv",
    "worktree",
    "path",
    "ownershipToken",
    "isolation",
    "respawnFlags",
    "seed",
    "intent",
    "name",
    "agent",
    "routine",
    "attachStallRespawns",
  ]),
  MAX_ROSTER_BYTES = 8388608;
//@ chunk-y162pn60.js:12529-12578 placement
function rosterKey() {
  return STORAGE_SPACES.daemon(["roster.json"]);
}
//@ chunk-y162pn60.js:12578-12666 placement
function Z() {
  return { proto: BG_PROTO, supervisorPid: process.pid, updatedAt: Date.now(), workers: {} };
}
//@ chunk-y162pn60.js:12666-13462 placement
async function readRoster(e, n) {
  if (n) {
    let { roster: roster, inspectFailed: inspectFailed } = await readRosterFile(n, e);
    return inspectFailed ? { ...roster, inspectFailed: !0 } : roster;
  }
  let r;
  try {
    let s = await lstat_2(Q6());
    if (!s.isFile() || s.size > MAX_ROSTER_BYTES) {
      if (!e?.silent)
        if (
          (logError(
            Error(
              `roster.json ${s.isFile() ? `too large (${s.size} bytes) \u2014 quarantining` : "is not a regular file \u2014 removing"}`,
            ),
          ),
          logEvent("tengu_bg_roster_parse_failed", {
            orphaned: -1,
            quarantined: 1,
            errCode: s.isFile() ? lit("E2BIG") : lit("EFTYPE"),
          }),
          s.isFile())
        )
          await quarantineRoster(void 0);
        else await rm_2(Q6(), { recursive: !0, force: !0 }).catch((f) => logError(f));
      return { ...Z(), parseFailed: !0 };
    }
    r = jsonParse(await readFile_2(Q6(), "utf8"));
  } catch (error) {
    if (isENOENT(error)) return Z();
    if (!e?.silent)
      (logError(withTelemetryMessage(toError(error), "bg roster.json read/parse failed")),
        logEvent("tengu_bg_roster_parse_failed", {
          orphaned: -1,
          quarantined: 1,
          errCode: sanitizedErrCodeForTelemetry(error),
        }),
        await quarantineRoster(void 0));
    return { ...Z(), parseFailed: !0 };
  }
  return parseRosterJson(r, e, void 0);
}
/**
 * 校验名册 JSON：成功时修复时间戳字段并返回；失败时（非静默）记 tengu_bg_roster_parse_failed 并隔离文件，返回 parseFailed 的空名册。
 */
//@ chunk-y162pn60.js:13462-14345 placement
async function parseRosterJson(raw, options, storage) {
  let parsed;
  try {
    parsed = RosterSchema().safeParse(raw);
  } catch (error) {
    if (!options?.silent)
      (logError(error),
        logEvent("tengu_bg_roster_parse_failed", {
          orphaned: countRosterWorkers(raw),
          quarantined: 1,
          errCode: sanitizedErrCodeForTelemetry(error),
        }),
        await quarantineRoster(storage));
    return { ...Z(), parseFailed: !0 };
  }
  if (parsed.success) {
    (delete parsed.data.parseFailed, delete parsed.data.inspectFailed);
    let f = raw,
      filtered = ["supervisorPid", "updatedAt"].filter((g) => !Number.isFinite(f[g]));
    if (filtered.length > 0 && !options?.silent)
      (logForDebugging(`[daemon] roster.json stamp field(s) healed on read: ${filtered.join(", ")}`, {
        level: "warn",
      }),
        logEvent("tengu_bg_roster_parse_failed", {
          orphaned: 0,
          quarantined: 0,
          issuePath: fromEnumArr(filtered),
          issueCode: lit("healed_stamp"),
        }));
    return parsed.data;
  }
  if (!options?.silent) {
    let f = countRosterWorkers(raw),
      m = parsed.error.issues[0];
    (logError(
      Error(
        `roster.json parse failed at ${Ge(m?.path) || "<root>"} (orphaning ${f} worker(s)): ${m?.message}`,
      ),
    ),
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: f,
        quarantined: 1,
        issuePath: Ge(m?.path),
        issueCode: fromEnumOpt(m?.code),
      }),
      await quarantineRoster(storage));
  }
  return { ...Z(), parseFailed: !0 };
}
/**
 * 把损坏的名册改名为 roster.json.corrupt.<时间>（存储 v5 下在存储中移动）。
 */
//@ chunk-y162pn60.js:14345-14675 placement
async function quarantineRoster(e) {
  if (!e) {
    await rename(Q6(), `${Q6()}.corrupt.${Date.now()}`).catch((r) => logError(r));
    return;
  }
  let n = await e
    .move(rosterKey(), STORAGE_SPACES.daemon([`roster.json.corrupt.${Date.now()}`]))
    .catch(() => {
      return;
    });
  if (n === void 0 || !n.ok)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster quarantine v5 move failed: ${n === void 0 ? "threw" : formatStorageError(n.error)}`,
        "roster quarantine v5 move failed",
      ),
    );
}
//@ chunk-y162pn60.js:14675-14749 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveLogged(e) {
  await rm_2(e, { recursive: !0, force: !0 }).catch((n) => logError(n));
}
//@ chunk-y162pn60.js:14749-14912 placement
async function discardUnreadableRoster(e, n, r, s) {
  if (!n?.silent)
    (logError(r),
      logEvent("tengu_bg_roster_parse_failed", { orphaned: -1, quarantined: 1, errCode: lit(s) }),
      await deleteRosterKey(e));
  return { ...Z(), parseFailed: !0 };
}
/**
 * 读取名册：不是普通文件时删除并返回空；读取出错返回 inspectFailed；否则从存储读取解析。
 */
//@ chunk-y162pn60.js:14912-15319 placement
async function readRosterFile(e, n) {
  let r = await checkJobFileWritable(Q6());
  if (r.kind === "refused") {
    if (!n?.silent)
      (logError(Error("roster.json is not a regular file \u2014 removing")),
        logEvent("tengu_bg_roster_parse_failed", { orphaned: -1, quarantined: 1, errCode: lit("EFTYPE") }),
        await removeRecursiveLogged(Q6()));
    return { roster: { ...Z(), parseFailed: !0 }, inspectFailed: !1 };
  }
  if (r.kind === "error")
    return rosterInspectFailed(
      n,
      withTelemetryMessage(toError(r.error), "bg roster.json read/parse failed"),
      sanitizedErrCodeForTelemetry(r.error),
    );
  return readRosterFromStorage(e, n);
}
//@ chunk-y162pn60.js:15319-15485 placement
function rosterInspectFailed(e, n, r) {
  if (!e?.silent)
    (logError(n), logEvent("tengu_bg_roster_parse_failed", { orphaned: -1, quarantined: 0, errCode: r }));
  return { roster: { ...Z(), parseFailed: !0 }, inspectFailed: !0 };
}
/**
 * 从存储 v5 读取名册：读取被拒或过大时删除，读失败返回 inspectFailed，JSON 解析失败隔离，否则校验 schema。
 */
//@ chunk-y162pn60.js:15485-16515 placement
async function readRosterFromStorage(e, n) {
  let readResult = await e.read([{ key: rosterKey(), offset: 0, length: MAX_ROSTER_BYTES + 1 }]).catch(() => {
    return;
  });
  if (readResult === void 0 || !readResult.ok) {
    if (readResult !== void 0 && isUnrecoverableStorageRead(readResult.error))
      return {
        roster: await discardUnreadableRoster(
          e,
          n,
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `bg roster.json v5 read refused: ${readResult.error.telemetryCode} \u2014 removing`,
            "bg roster.json v5 read refused \u2014 removing",
          ),
          "EV5READ",
        ),
        inspectFailed: !1,
      };
    return rosterInspectFailed(
      n,
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `bg roster.json v5 read failed: ${readResult?.error.code ?? "threw"}`,
        "bg roster.json v5 read failed",
      ),
      lit("EV5READ"),
    );
  }
  let item = readResult.value.items[0];
  if (!item.found) return { roster: Z(), inspectFailed: !1 };
  if (item.totalBytes > MAX_ROSTER_BYTES)
    return {
      roster: await discardUnreadableRoster(
        e,
        n,
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `roster.json too large (${item.totalBytes} bytes) \u2014 removing`,
          "roster.json too large \u2014 removing",
        ),
        "E2BIG",
      ),
      inspectFailed: !1,
    };
  let parsed;
  try {
    parsed = jsonParse(Buffer.from(item.value).toString("utf8"));
  } catch (error) {
    if (!n?.silent)
      (logError(withTelemetryMessage(toError(error), "bg roster.json read/parse failed")),
        logEvent("tengu_bg_roster_parse_failed", {
          orphaned: -1,
          quarantined: 1,
          errCode: sanitizedErrCodeForTelemetry(error),
        }),
        await quarantineRoster(e));
    return { roster: { ...Z(), parseFailed: !0 }, inspectFailed: !1 };
  }
  return { roster: await parseRosterJson(parsed, n, e), inspectFailed: !1 };
}
//@ chunk-y162pn60.js:16515-16716 placement
async function deleteRosterKey(e) {
  let n = await e.delete(rosterKey()).catch(() => {
    return;
  });
  if (n === void 0 || !n.ok)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster quarantine v5 delete failed: ${n?.error.code ?? "threw"}`,
        "roster quarantine v5 delete failed",
      ),
    );
}
//@ chunk-y162pn60.js:16716-16752 placement
function Ge(e) {
  return sanitizeJsonPath(e, () => ROSTER_KEYS);
}
//@ chunk-y162pn60.js:16752-16804 placement
function bgShort(e) {
  return SHORT_RE.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("invalid");
}
//@ chunk-y162pn60.js:16804-16952 placement
function countRosterWorkers(e) {
  let n = e !== null && typeof e === "object" ? e.workers : void 0;
  return n !== null && typeof n === "object" && !Array.isArray(n) ? Object.keys(n).length : 0;
}
/**
 * 写回名册（去掉解析状态字段）：存储 v5 或原子写文件；资源耗尽类错误只记日志不抛。
 */
//@ chunk-y162pn60.js:16952-17520 placement
async function writeRoster(roster, storage) {
  let { parseFailed: parseFailed, inspectFailed: inspectFailed, ...f } = roster;
  if (storage) {
    let write = await storage.write(rosterKey(), jsonStringify(f, null, 2), { mode: 384 });
    if (!write.ok) {
      let error = write.error,
        y = "telemetryCode" in error ? error.telemetryCode : void 0;
      if (y !== void 0 && RESOURCE_EXHAUSTION_CODES.has(y)) {
        logForDebugging(`[daemon] roster write failed: ${y}`, { level: "error" });
        return;
      }
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster v5 write failed: ${error.code}`,
        "roster v5 write failed",
      );
    }
    return;
  }
  let rosterPath = Q6();
  (await mkdir_2(dirname_2(rosterPath), { recursive: !0, mode: 448 }).catch(() => {}),
    await writeFileAtomic(rosterPath, jsonStringify(f, null, 2), 384).catch((g) => {
      let S = getErrnoCode(g);
      if (S && RESOURCE_EXHAUSTION_CODES.has(S)) {
        logForDebugging(`[daemon] roster write failed: ${S}`, { level: "error" });
        return;
      }
      throw g;
    }));
}
//@ chunk-y162pn60.js:17520-17532 placement
var It = createKeyedQueue();
//@ chunk-y162pn60.js:17532-17678 placement
function updateRoster(e, n) {
  return It.run("roster", async () => {
    let r = await readRosterForUpdate(n),
      s = e(r) ?? r;
    ((s.supervisorPid = process.pid), (s.updatedAt = Date.now()), await writeRoster(s, n));
  });
}
//@ chunk-y162pn60.js:17678-17913 placement
async function readRosterForUpdate(e) {
  if (!e) return readRoster();
  let n = await readRosterFile(e);
  if (n.inspectFailed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "bg roster.json update skipped: the file could not be inspected",
      "bg roster.json update skipped: the file could not be inspected",
    );
  return n.roster;
}

export { bgShort, readRoster, rosterKey, updateRoster, isUnrecoverableStorageRead };
