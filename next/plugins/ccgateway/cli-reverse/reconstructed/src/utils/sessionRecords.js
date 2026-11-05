/**
 * utils/sessionRecords.ts
 *
 * 2.1.316 新增：规范化会话记录字段；读取会话认证记录文件等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y28agbhb.js (13)
 * attribution: placement 13
 */
import { join } from "path";
import { readFile } from "fs/promises";
import { timingSafeEqual } from "crypto";
import { jsonParse } from "./slowOperations.js";

//@ chunk-y28agbhb.js:409-448 placement (2.1.88 match: getSessionsDir, 1)
function getSessionsDir(configDir) {
  return join(configDir, "sessions");
}
//@ chunk-y28agbhb.js:448-463 placement
/**
 * 会话记录文件大小上限。
 */
var MAX_SESSION_RECORD_BYTES = 262144;
//@ chunk-y28agbhb.js:463-588 placement
/**
 * 从 <pid>.json 文件名取 pid 及是否规范。
 */
function parseSessionRecordName(fileName) {
  let replaced = fileName.replace(/\.json$/, "");
  let pid = parseInt(replaced, 10);
  if (isNaN(pid)) return null;
  return {
    pid,
    canonical: String(pid) === replaced,
  };
}
//@ chunk-y28agbhb.js:588-640 placement
var SESSION_KINDS = ["interactive", "bg", "daemon", "daemon-worker"];
//@ chunk-y28agbhb.js:640-684 placement
function normalizeSessionKind(kind) {
  return SESSION_KINDS.includes(kind) ? kind : undefined;
}
//@ chunk-y28agbhb.js:684-724 placement
var SESSION_STATUSES = ["busy", "shell", "idle", "waiting"];
//@ chunk-y28agbhb.js:724-768 placement
function normalizeSessionStatus(status) {
  return SESSION_STATUSES.includes(status) ? status : undefined;
}
//@ chunk-y28agbhb.js:768-791 placement
var MAX_SANE_EPOCH_MS = 4000000000000000;
//@ chunk-y28agbhb.js:791-866 placement
function isSaneEpochMs(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_SANE_EPOCH_MS;
}
//@ chunk-y28agbhb.js:866-905 placement
/**
 * saneEpochMsOrUndefined：合理时间戳否则 undefined。
 */
function saneEpochMsOrUndefined(value) {
  return isSaneEpochMs(value) ? value : undefined;
}
//@ chunk-y28agbhb.js:905-1374 placement
/**
 * 规范化会话记录字段。
 */
function normalizeSessionRecord(raw) {
  let object = typeof raw === "object" && raw !== null ? raw : {};
  return {
    cwd: typeof object.cwd === "string" ? object.cwd : "?",
    startedAt: saneEpochMsOrUndefined(object.startedAt) ?? 0,
    procStart: typeof object.procStart === "string" ? object.procStart : undefined,
    ...(typeof object.procStartFt === "string" && {
      procStartFt: object.procStartFt,
    }),
    kind: normalizeSessionKind(object.kind),
    sessionId: typeof object.sessionId === "string" ? object.sessionId : undefined,
    status: normalizeSessionStatus(object.status),
    entrypoint: typeof object.entrypoint === "string" ? object.entrypoint : undefined,
    ...(typeof object.pidDomain === "string" && {
      pidDomain: object.pidDomain,
    }),
  };
}
//@ chunk-y28agbhb.js:2219-2547 placement
/**
 * 读取会话认证记录文件。
 */
async function readSessionAuthFile(path) {
  try {
    let parsed = jsonParse(await readFile(path, "utf8"));
    if (parsed === null || typeof parsed !== "object") return;
    let auth = {};
    if ("rvAuth" in parsed && typeof parsed.rvAuth === "string") auth.rvAuth = parsed.rvAuth;
    if ("ptyAuth" in parsed && typeof parsed.ptyAuth === "string") auth.ptyAuth = parsed.ptyAuth;
    if ("claimAuth" in parsed && typeof parsed.claimAuth === "string") auth.claimAuth = parsed.claimAuth;
    return auth;
  } catch {
    return;
  }
}
//@ chunk-y28agbhb.js:2547-2698 placement
/**
 * 常量时间比较字符串。
 */
function timingSafeEqualStrings(auth, expected) {
  if (typeof auth !== "string" || !expected || auth.length === 0) return false;
  let buffer = Buffer.from(auth);
  let buffer_2 = Buffer.from(expected);
  if (buffer.length !== buffer_2.length) return false;
  return timingSafeEqual(buffer, buffer_2);
}
export {
  MAX_SESSION_RECORD_BYTES,
  getSessionsDir,
  timingSafeEqualStrings,
  isSaneEpochMs,
  parseSessionRecordName,
  normalizeSessionRecord,
  saneEpochMsOrUndefined,
  readSessionAuthFile,
};
