/**
 * utils/sessionRecords.ts
 *
 * 2.1.316 新增：规范化会话记录字段；读取会话认证记录文件等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g4mgfvqt.js (13)
 * attribution: placement 13
 */
import { join } from "path";
import { readFile } from "fs/promises";
import { timingSafeEqual } from "crypto";
import { jsonParse } from "./slowOperations.js";

//@ chunk-g4mgfvqt.js:409-448 placement = getSessionsDir (1)
function getSessionsDir(n) {
  return join(n, "sessions");
}
//@ chunk-g4mgfvqt.js:448-463 placement
/**
 * 会话记录文件大小上限。
 */
var MAX_SESSION_RECORD_BYTES = 262144;
//@ chunk-g4mgfvqt.js:463-588 placement
/**
 * 从 <pid>.json 文件名取 pid 及是否规范。
 */
function parseSessionRecordName(n) {
  let replaced = n.replace(/\.json$/, "");
  let e = parseInt(replaced, 10);
  if (isNaN(e)) return null;
  return {
    pid: e,
    canonical: String(e) === replaced,
  };
}
//@ chunk-g4mgfvqt.js:588-640 placement
var SESSION_KINDS = ["interactive", "bg", "daemon", "daemon-worker"];
//@ chunk-g4mgfvqt.js:640-684 placement
function normalizeSessionKind(kind) {
  return SESSION_KINDS.includes(kind) ? kind : undefined;
}
//@ chunk-g4mgfvqt.js:684-724 placement
var SESSION_STATUSES = ["busy", "shell", "idle", "waiting"];
//@ chunk-g4mgfvqt.js:724-768 placement
function normalizeSessionStatus(status) {
  return SESSION_STATUSES.includes(status) ? status : undefined;
}
//@ chunk-g4mgfvqt.js:768-791 placement
var MAX_SANE_EPOCH_MS = 4000000000000000;
//@ chunk-g4mgfvqt.js:791-866 placement
function isSaneEpochMs(n) {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_SANE_EPOCH_MS;
}
//@ chunk-g4mgfvqt.js:866-905 placement
/**
 * saneEpochMsOrUndefined：合理时间戳否则 undefined。
 */
function saneEpochMsOrUndefined(n) {
  return isSaneEpochMs(n) ? n : undefined;
}
//@ chunk-g4mgfvqt.js:905-1374 placement
/**
 * 规范化会话记录字段。
 */
function normalizeSessionRecord(n) {
  let t = typeof n === "object" && n !== null ? n : {};
  return {
    cwd: typeof t.cwd === "string" ? t.cwd : "?",
    startedAt: saneEpochMsOrUndefined(t.startedAt) ?? 0,
    procStart: typeof t.procStart === "string" ? t.procStart : undefined,
    ...(typeof t.procStartFt === "string" && {
      procStartFt: t.procStartFt,
    }),
    kind: normalizeSessionKind(t.kind),
    sessionId: typeof t.sessionId === "string" ? t.sessionId : undefined,
    status: normalizeSessionStatus(t.status),
    entrypoint: typeof t.entrypoint === "string" ? t.entrypoint : undefined,
    ...(typeof t.pidDomain === "string" && {
      pidDomain: t.pidDomain,
    }),
  };
}
//@ chunk-g4mgfvqt.js:2218-2546 placement
/**
 * 读取会话认证记录文件。
 */
async function readSessionAuthFile(n) {
  try {
    let t = jsonParse(await readFile(n, "utf8"));
    if (t === null || typeof t !== "object") return;
    let e = {};
    if ("rvAuth" in t && typeof t.rvAuth === "string") e.rvAuth = t.rvAuth;
    if ("ptyAuth" in t && typeof t.ptyAuth === "string") e.ptyAuth = t.ptyAuth;
    if ("claimAuth" in t && typeof t.claimAuth === "string") e.claimAuth = t.claimAuth;
    return e;
  } catch {
    return;
  }
}
//@ chunk-g4mgfvqt.js:2546-2697 placement
/**
 * 常量时间比较字符串。
 */
function timingSafeEqualStrings(auth, t) {
  if (typeof auth !== "string" || !t || auth.length === 0) return false;
  let buffer = Buffer.from(auth);
  let buffer_2 = Buffer.from(t);
  if (buffer.length !== buffer_2.length) return false;
  return timingSafeEqual(buffer, buffer_2);
}
export {
  isSaneEpochMs,
  parseSessionRecordName,
  MAX_SESSION_RECORD_BYTES,
  normalizeSessionRecord,
  saneEpochMsOrUndefined,
  readSessionAuthFile,
  getSessionsDir,
  timingSafeEqualStrings,
};
