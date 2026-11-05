/**
 * services/daemon/roster.ts
 *
 * 2.1.316 新增：后台会话名册
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmd7n4gq.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, rm, readFile, rename, mkdir } from "fs/promises";
import { dirname } from "path";
import { toSet, checkJobFileWritable, sanitizeJsonPath } from "./sessionCron.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { BG_PROTO, RosterSchema, SHORT_RE } from "./leaseProtocol.js";
import { daemonRosterFile } from "./paths.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rmd7n4gq.js:11946-12105 placement
/**
 * 存储读取失败是否属于不可恢复类型（ENXIO、EFBIG、ELOOP、ENAMETOOLONG）。
 */
function isUnrecoverableStorageRead(error) {
  return (
    error?.code === "Failed" &&
    (error.telemetryCode === "ENXIO" ||
      error.telemetryCode === "EFBIG" ||
      error.telemetryCode === "ELOOP" ||
      error.telemetryCode === "ENAMETOOLONG")
  );
}
//@ chunk-rmd7n4gq.js:12105-12737 placement
/**
 * 后台会话名册允许的字段集合及名册文件大小上限。
 */
var ROSTER_KEYS; // deferred: uses toSet (./sessionCron.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ROSTER_BYTES;
deferInit("chunk-rmd7n4gq.js:12105", () => {
  ROSTER_KEYS = toSet([
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
  ]);
  MAX_ROSTER_BYTES = 8388608;
});
//@ chunk-rmd7n4gq.js:12737-12786 placement
function rosterKey() {
  return STORAGE_SPACES.daemon(["roster.json"]);
}
//@ chunk-rmd7n4gq.js:12786-12874 placement
/**
 * 生成空名册（协议版本、当前 supervisor pid、时间戳、空 workers）。
 */
function emptyRoster() {
  return {
    proto: BG_PROTO,
    supervisorPid: process.pid,
    updatedAt: Date.now(),
    workers: {},
  };
}
//@ chunk-rmd7n4gq.js:12874-13670 placement
async function readRoster(options, inspectSource) {
  if (inspectSource) {
    let { roster, inspectFailed } = await readRosterFile(inspectSource, options);
    return inspectFailed
      ? {
          ...roster,
          inspectFailed: true,
        }
      : roster;
  }
  let raw;
  try {
    let stats = await lstat(daemonRosterFile());
    if (!stats.isFile() || stats.size > MAX_ROSTER_BYTES) {
      if (!options?.silent) {
        logError(
          Error(
            `roster.json ${stats.isFile() ? `too large (${stats.size} bytes) \u2014 quarantining` : "is not a regular file \u2014 removing"}`,
          ),
        );
        logEvent("tengu_bg_roster_parse_failed", {
          orphaned: -1,
          quarantined: 1,
          errCode: stats.isFile() ? lit("E2BIG") : lit("EFTYPE"),
        });
        if (stats.isFile()) await quarantineRoster(undefined);
        else
          await rm(daemonRosterFile(), {
            recursive: true,
            force: true,
          }).catch((error) => logError(error));
      }
      return {
        ...emptyRoster(),
        parseFailed: true,
      };
    }
    raw = jsonParse(await readFile(daemonRosterFile(), "utf8"));
  } catch (error) {
    if (isENOENT(error)) return emptyRoster();
    if (!options?.silent) {
      logError(withTelemetryMessage(toError(error), "bg roster.json read/parse failed"));
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: -1,
        quarantined: 1,
        errCode: sanitizedErrCodeForTelemetry(error),
      });
      await quarantineRoster(undefined);
    }
    return {
      ...emptyRoster(),
      parseFailed: true,
    };
  }
  return parseRosterJson(raw, options, undefined);
}
//@ chunk-rmd7n4gq.js:13670-14553 placement
/**
 * 校验名册 JSON：成功时修复时间戳字段并返回；失败时（非静默）记 tengu_bg_roster_parse_failed 并隔离文件，返回 parseFailed 的空名册。
 */
async function parseRosterJson(raw, options, storage) {
  let parsed;
  try {
    parsed = RosterSchema().safeParse(raw);
  } catch (error) {
    if (!options?.silent) {
      logError(error);
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: countRosterWorkers(raw),
        quarantined: 1,
        errCode: sanitizedErrCodeForTelemetry(error),
      });
      await quarantineRoster(storage);
    }
    return {
      ...emptyRoster(),
      parseFailed: true,
    };
  }
  if (parsed.success) {
    delete parsed.data.parseFailed;
    delete parsed.data.inspectFailed;
    let raw_2 = raw;
    let filtered = ["supervisorPid", "updatedAt"].filter((key) => !Number.isFinite(raw_2[key]));
    if (filtered.length > 0 && !options?.silent) {
      logForDebugging(`[daemon] roster.json stamp field(s) healed on read: ${filtered.join(", ")}`, {
        level: "warn",
      });
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: 0,
        quarantined: 0,
        issuePath: fromEnumArr(filtered),
        issueCode: lit("healed_stamp"),
      });
    }
    return parsed.data;
  }
  if (!options?.silent) {
    let orphaned = countRosterWorkers(raw);
    let issue = parsed.error.issues[0];
    logError(
      Error(
        `roster.json parse failed at ${sanitizeRosterIssuePath(issue?.path) || "<root>"} (orphaning ${orphaned} worker(s)): ${issue?.message}`,
      ),
    );
    logEvent("tengu_bg_roster_parse_failed", {
      orphaned,
      quarantined: 1,
      issuePath: sanitizeRosterIssuePath(issue?.path),
      issueCode: fromEnumOpt(issue?.code),
    });
    await quarantineRoster(storage);
  }
  return {
    ...emptyRoster(),
    parseFailed: true,
  };
}
//@ chunk-rmd7n4gq.js:14553-14883 placement
/**
 * 把损坏的名册改名为 roster.json.corrupt.<时间>（存储 v5 下在存储中移动）。
 */
async function quarantineRoster(storage) {
  if (!storage) {
    await rename(daemonRosterFile(), `${daemonRosterFile()}.corrupt.${Date.now()}`).catch((error) =>
      logError(error),
    );
    return;
  }
  let storageArg = await storage
    .move(rosterKey(), STORAGE_SPACES.daemon([`roster.json.corrupt.${Date.now()}`]))
    .catch(() => {
      return;
    });
  if (storageArg === undefined || !storageArg.ok)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster quarantine v5 move failed: ${storageArg === undefined ? "threw" : formatStorageError(storageArg.error)}`,
        "roster quarantine v5 move failed",
      ),
    );
}
//@ chunk-rmd7n4gq.js:14883-14957 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
async function removeRecursiveLogged(dirPath) {
  await rm(dirPath, {
    recursive: true,
    force: true,
  }).catch((error) => logError(error));
}
//@ chunk-rmd7n4gq.js:14957-15120 placement
async function discardUnreadableRoster(storage, options, error, code) {
  if (!options?.silent) {
    logError(error);
    logEvent("tengu_bg_roster_parse_failed", {
      orphaned: -1,
      quarantined: 1,
      errCode: lit(code),
    });
    await deleteRosterKey(storage);
  }
  return {
    ...emptyRoster(),
    parseFailed: true,
  };
}
//@ chunk-rmd7n4gq.js:15120-15527 placement
/**
 * 读取名册：不是普通文件时删除并返回空；读取出错返回 inspectFailed；否则从存储读取解析。
 */
async function readRosterFile(storage, options) {
  let writable = await checkJobFileWritable(daemonRosterFile());
  if (writable.kind === "refused") {
    if (!options?.silent) {
      logError(Error("roster.json is not a regular file \u2014 removing"));
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: -1,
        quarantined: 1,
        errCode: lit("EFTYPE"),
      });
      await removeRecursiveLogged(daemonRosterFile());
    }
    return {
      roster: {
        ...emptyRoster(),
        parseFailed: true,
      },
      inspectFailed: false,
    };
  }
  if (writable.kind === "error")
    return rosterInspectFailed(
      options,
      withTelemetryMessage(toError(writable.error), "bg roster.json read/parse failed"),
      sanitizedErrCodeForTelemetry(writable.error),
    );
  return readRosterFromStorage(storage, options);
}
//@ chunk-rmd7n4gq.js:15527-15693 placement
function rosterInspectFailed(options, error, errCode) {
  if (!options?.silent) {
    logError(error);
    logEvent("tengu_bg_roster_parse_failed", {
      orphaned: -1,
      quarantined: 0,
      errCode,
    });
  }
  return {
    roster: {
      ...emptyRoster(),
      parseFailed: true,
    },
    inspectFailed: true,
  };
}
//@ chunk-rmd7n4gq.js:15693-16723 placement
/**
 * 从存储 v5 读取名册：读取被拒或过大时删除，读失败返回 inspectFailed，JSON 解析失败隔离，否则校验 schema。
 */
async function readRosterFromStorage(storage, options) {
  let readResult = await storage
    .read([
      {
        key: rosterKey(),
        offset: 0,
        length: MAX_ROSTER_BYTES + 1,
      },
    ])
    .catch(() => {
      return;
    });
  if (readResult === undefined || !readResult.ok) {
    if (readResult !== undefined && isUnrecoverableStorageRead(readResult.error))
      return {
        roster: await discardUnreadableRoster(
          storage,
          options,
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `bg roster.json v5 read refused: ${readResult.error.telemetryCode} \u2014 removing`,
            "bg roster.json v5 read refused \u2014 removing",
          ),
          "EV5READ",
        ),
        inspectFailed: false,
      };
    return rosterInspectFailed(
      options,
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `bg roster.json v5 read failed: ${readResult?.error.code ?? "threw"}`,
        "bg roster.json v5 read failed",
      ),
      lit("EV5READ"),
    );
  }
  let item = readResult.value.items[0];
  if (!item.found)
    return {
      roster: emptyRoster(),
      inspectFailed: false,
    };
  if (item.totalBytes > MAX_ROSTER_BYTES)
    return {
      roster: await discardUnreadableRoster(
        storage,
        options,
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `roster.json too large (${item.totalBytes} bytes) \u2014 removing`,
          "roster.json too large \u2014 removing",
        ),
        "E2BIG",
      ),
      inspectFailed: false,
    };
  let parsed;
  try {
    parsed = jsonParse(Buffer.from(item.value).toString("utf8"));
  } catch (error) {
    if (!options?.silent) {
      logError(withTelemetryMessage(toError(error), "bg roster.json read/parse failed"));
      logEvent("tengu_bg_roster_parse_failed", {
        orphaned: -1,
        quarantined: 1,
        errCode: sanitizedErrCodeForTelemetry(error),
      });
      await quarantineRoster(storage);
    }
    return {
      roster: {
        ...emptyRoster(),
        parseFailed: true,
      },
      inspectFailed: false,
    };
  }
  return {
    roster: await parseRosterJson(parsed, options, storage),
    inspectFailed: false,
  };
}
//@ chunk-rmd7n4gq.js:16723-16924 placement
async function deleteRosterKey(storage) {
  let result = await storage.delete(rosterKey()).catch(() => {
    return;
  });
  if (result === undefined || !result.ok)
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster quarantine v5 delete failed: ${result?.error.code ?? "threw"}`,
        "roster quarantine v5 delete failed",
      ),
    );
}
//@ chunk-rmd7n4gq.js:16924-16960 placement
/**
 * 把 zod 报错的路径段转成遥测安全的字符串。
 */
function sanitizeRosterIssuePath(path) {
  return sanitizeJsonPath(path, () => ROSTER_KEYS);
}
//@ chunk-rmd7n4gq.js:16960-17012 placement
function bgShort(short) {
  return SHORT_RE.test(short) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(short) : lit("invalid");
}
//@ chunk-rmd7n4gq.js:17012-17160 placement
function countRosterWorkers(raw) {
  let workers = raw !== null && typeof raw === "object" ? raw.workers : undefined;
  return workers !== null && typeof workers === "object" && !Array.isArray(workers)
    ? Object.keys(workers).length
    : 0;
}
//@ chunk-rmd7n4gq.js:17160-17728 placement
/**
 * 写回名册（去掉解析状态字段）：存储 v5 或原子写文件；资源耗尽类错误只记日志不抛。
 */
async function writeRoster(roster, storage) {
  let { parseFailed, inspectFailed, ...rest } = roster;
  if (storage) {
    let result = await storage.write(rosterKey(), jsonStringify(rest, null, 2), {
      mode: 384,
    });
    if (!result.ok) {
      let error = result.error;
      let telemetryCode = "telemetryCode" in error ? error.telemetryCode : undefined;
      if (telemetryCode !== undefined && RESOURCE_EXHAUSTION_CODES.has(telemetryCode)) {
        logForDebugging(`[daemon] roster write failed: ${telemetryCode}`, {
          level: "error",
        });
        return;
      }
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `roster v5 write failed: ${error.code}`,
        "roster v5 write failed",
      );
    }
    return;
  }
  let rosterPath = daemonRosterFile();
  await mkdir(dirname(rosterPath), {
    recursive: true,
    mode: 448,
  }).catch(() => {});
  await writeFileAtomic(rosterPath, jsonStringify(rest, null, 2), 384).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode && RESOURCE_EXHAUSTION_CODES.has(errnoCode)) {
      logForDebugging(`[daemon] roster write failed: ${errnoCode}`, {
        level: "error",
      });
      return;
    }
    throw error;
  });
}
//@ chunk-rmd7n4gq.js:17728-17740 placement
/**
 * 名册写入的串行队列。
 */
var rosterWriteQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rmd7n4gq.js:17728", () => {
  rosterWriteQueue = createKeyedQueue();
});
//@ chunk-rmd7n4gq.js:17740-17886 placement
function updateRoster(update, storage) {
  return rosterWriteQueue.run("roster", async () => {
    let rosterForUpdate = await readRosterForUpdate(storage);
    let roster = update(rosterForUpdate) ?? rosterForUpdate;
    roster.supervisorPid = process.pid;
    roster.updatedAt = Date.now();
    await writeRoster(roster, storage);
  });
}
//@ chunk-rmd7n4gq.js:17886-18121 placement
async function readRosterForUpdate(storage) {
  if (!storage) return readRoster();
  let rosterFile = await readRosterFile(storage);
  if (rosterFile.inspectFailed)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "bg roster.json update skipped: the file could not be inspected",
      "bg roster.json update skipped: the file could not be inspected",
    );
  return rosterFile.roster;
}
export { readRoster, updateRoster, isUnrecoverableStorageRead, bgShort, rosterKey };
