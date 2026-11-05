/**
 * remote/tools/serve/servedBackgroundShells.ts
 *
 * 2.1.316 新增。列出云会话启动的后台命令（claude daemon remote-control stop-shell 可停止）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nefh4pze.js (17)
 * attribution: placement 17
 */
import { join } from "path";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  int,
  numberSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  ownProcStartAsync,
  getProcessStartTimeAsync,
  provenSameProcessAsync,
  looksLikeFullHostProcessTable,
  isProcessProvablyGone,
} from "../../../utils/processIdentity.js";
import { getFileReader } from "../../../utils/fileStore.js";
import { servedCallsDir } from "../servedCallLog.js";
import { toJsonLine, jsonParseRaw } from "../../../utils/slowOperations.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../../utils/errors.js";
import { countWhere } from "../../../utils/collections.js";
import { sleep } from "../../../utils/sleep.js";
import { formatDurationCoarse } from "../../../utils/format.js";
import { isProcessRunning } from "../../../utils/genericProcessUtils.js";
import { getPlatform } from "../../../utils/platform.js";
import { ownPidDomain, ownPidSpace } from "../../../utils/pidSpace.js";
import { truncateWithEllipsis } from "../../../utils/printableName.js";
import { cleanForDisplay } from "../../../utils/stringUtils.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-nefh4pze.js:754-1204 placement
/**
 * 后台 shell 记录：id/日志文件名正则、字段长度上限（命令 80、调用者 64）、日志尾部 8192 字节、最多列 256 个日志、最多展示 32 条，以及记录 schema。
 */
var SERVED_BACKGROUND_SHELL_ID; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BACKGROUND_LOG_FILE_RE;
var MAX_COMMAND_CHARS;
var MAX_CALLER_CHARS;
var MAX_LOG_TAIL_BYTES;
var MAX_LOG_FILES;
var MAX_LISTED_SHELLS;
var STOP_POLL_INTERVAL_MS;
var servedBackgroundShellSchema;
deferInit("chunk-nefh4pze.js:754", () => {
  SERVED_BACKGROUND_SHELL_ID = /^[A-Za-z0-9]{1,64}$/;
  BACKGROUND_LOG_FILE_RE = /^background-[A-Za-z0-9]{1,64}\.jsonl$/;
  MAX_COMMAND_CHARS = 80;
  MAX_CALLER_CHARS = 64;
  MAX_LOG_TAIL_BYTES = 8192;
  MAX_LOG_FILES = 256;
  MAX_LISTED_SHELLS = 32;
  STOP_POLL_INTERVAL_MS = 250;
  servedBackgroundShellSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      id: stringSchema().regex(SERVED_BACKGROUND_SHELL_ID),
      owner: int().positive().max(2147483647),
      owner_start: stringSchema().min(1).max(64).optional(),
      pid: int().positive().max(2147483647).optional(),
      pid_start: stringSchema().min(1).max(64).optional(),
      pids_in: stringSchema().min(1).max(1024).optional(),
      started_at: numberSchema().nonnegative(),
      command: stringSchema().max(4 * MAX_COMMAND_CHARS),
      caller: stringSchema().max(4 * MAX_CALLER_CHARS),
      folder: stringSchema().min(1).max(4096),
    }),
  );
});
//@ chunk-nefh4pze.js:1204-1666 placement
async function fileServedBackgroundShell(shell) {
  if (!SERVED_BACKGROUND_SHELL_ID.test(shell.id)) return;
  try {
    let record = {
      v: 1,
      id: shell.id,
      owner: process.pid,
      owner_start: await ownProcStartAsync(),
      pid: shell.pid,
      pid_start:
        shell.pid === undefined
          ? undefined
          : await getProcessStartTimeAsync(shell.pid, {
              skipCache: true,
            }),
      pids_in: await ownPidDomainId(),
      started_at: Date.now(),
      command: clipShellField(shell.command, MAX_COMMAND_CHARS),
      caller: clipShellField(shell.caller, MAX_CALLER_CHARS),
      folder: shell.folder,
    };
    await getFileReader().mkdir(servedCallsDir(), 448);
    await getFileReader().writeExclusive(backgroundLogPath(shell.id), toJsonLine(record), 384);
    await readServedBackgroundShells();
  } catch (error) {
    logForDebugging(`[remote-tools] background command record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-nefh4pze.js:1666-1716 placement
async function retireServedBackgroundShell(shell) {
  await deleteFileQuietly(backgroundStopPath(shell));
  await deleteFileQuietly(backgroundLogPath(shell));
}
//@ chunk-nefh4pze.js:1716-1747 placement
function takeServedBackgroundStopRequest(shell) {
  return deleteFileQuietly(backgroundStopPath(shell));
}
//@ chunk-nefh4pze.js:1747-2120 placement
async function readServedBackgroundShells() {
  let shells = [];
  try {
    let files = await getFileReader().list(servedCallsDir());
    for (let file of files.filter((name) => BACKGROUND_LOG_FILE_RE.test(name)).slice(0, MAX_LOG_FILES)) {
      let shell = await lookUpServedBackgroundShell(file.slice(11, -6));
      if (shell !== undefined && shell !== "ended") shells.push(shell);
    }
  } catch (error) {
    logForDebugging(`served background records: ${errorMessage(error)}`);
  }
  return shells.sort(
    (left, right) =>
      left.folder.localeCompare(right.folder) ||
      left.caller.localeCompare(right.caller) ||
      left.started_at - right.started_at ||
      left.id.localeCompare(right.id),
  );
}
//@ chunk-nefh4pze.js:2120-2536 placement
async function lookUpServedBackgroundShell(id) {
  if (!SERVED_BACKGROUND_SHELL_ID.test(id)) return;
  try {
    let tail = await getFileReader().readTail(backgroundLogPath(id), MAX_LOG_TAIL_BYTES, {
      noFollow: true,
    });
    let parsed = servedBackgroundShellSchema().safeParse(jsonParseRaw(tail.toString("utf8").trim()));
    if (!parsed.success || parsed.data.id !== id) return;
    let record = parsed.data;
    let ownerAlive =
      (record.owner === process.pid &&
        record.owner_start !== undefined &&
        record.owner_start === (await ownProcStartAsync())) ||
      (await isOwnerAlive(record.owner, record.owner_start));
    if (ownerAlive || (await isOwnerAlive(record.pid, record.pid_start)))
      return {
        ...record,
        ownerGone: !ownerAlive,
      };
    if (await isServedShellAlive(record)) {
      await retireServedBackgroundShell(id);
      return "ended";
    }
  } catch {}
  return;
}
//@ chunk-nefh4pze.js:2536-2620 placement
async function servedBackgroundShellsIn(folders) {
  return countWhere(
    await readServedBackgroundShells(),
    (shell) => !shell.ownerGone && folders.includes(shell.folder),
  );
}
//@ chunk-nefh4pze.js:2620-2919 placement
async function stopServedBackgroundShell(id, timeoutMs = 1e4) {
  let fileReader = getFileReader();
  try {
    await fileReader.writeExclusive(
      backgroundStopPath(id),
      `{}
`,
      384,
    );
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") return "not_asked";
  }
  let deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(STOP_POLL_INTERVAL_MS);
    if ((await fileReader.lstat(backgroundLogPath(id)).catch(() => null)) === undefined) {
      await takeServedBackgroundStopRequest(id);
      return "stopped";
    }
  }
  return (await deleteFileQuietly(backgroundStopPath(id))) ? "unanswered" : "pending";
}
//@ chunk-nefh4pze.js:2919-3509 placement
/**
 * 列出云会话启动的后台命令（claude daemon remote-control stop-shell 可停止）。
 */
function servedBackgroundShellLines(shells, { now, stopHint }) {
  if (shells.length === 0) return [];
  let lines = ["background commands started by cloud sessions:"];
  let lastGroupLine;
  for (let shell of shells.slice(0, MAX_LISTED_SHELLS)) {
    let groupLine = `  in ${clipShellField(shell.folder, 200)}, cloud session ${clipShellField(shell.caller, MAX_CALLER_CHARS + 1)}:`;
    if (groupLine !== lastGroupLine) {
      lastGroupLine = groupLine;
      lines.push(groupLine);
    }
    let pidText = shell.pid === undefined ? "pid unknown" : `pid ${shell.pid}`;
    let runningFor = formatDurationCoarse(Math.max(0, now - shell.started_at));
    lines.push(
      `    ${shell.id}  ${pidText}  running ${runningFor}  ${clipShellField(shell.command, MAX_COMMAND_CHARS + 1)}${shell.ownerGone ? "  (its serving process is gone: nothing here will stop it)" : ""}`,
    );
  }
  if (shells.length > MAX_LISTED_SHELLS) lines.push(`  and ${shells.length - MAX_LISTED_SHELLS} more`);
  if (stopHint) lines.push("  stop one: claude daemon remote-control stop-shell <id>");
  return lines;
}
//@ chunk-nefh4pze.js:3509-3562 placement
function backgroundLogPath(id) {
  return join(servedCallsDir(), `background-${id}.jsonl`);
}
//@ chunk-nefh4pze.js:3562-3620 placement
function backgroundStopPath(id) {
  return join(servedCallsDir(), `background-${id}.stop.jsonl`);
}
//@ chunk-nefh4pze.js:3620-3701 placement
async function isOwnerAlive(ownerPid, ownerStart) {
  return (
    ownerPid !== undefined &&
    isProcessRunning(ownerPid) &&
    (ownerStart === undefined || (await provenSameProcessAsync(ownerPid, ownerStart)) !== false)
  );
}
//@ chunk-nefh4pze.js:3701-3984 placement
/**
 * 核对后台命令记录的所有者与进程是否仍在
 */
async function isServedShellAlive(record) {
  if (
    record.pids_in === undefined ||
    record.pids_in !== (await ownPidDomainId()) ||
    !(await looksLikeFullHostProcessTable()) ||
    !(await isOwnerGone(record.owner, record.owner_start))
  )
    return false;
  let { pid } = record;
  if (pid === undefined || !(await isOwnerGone(pid, record.pid_start))) return false;
  if (!isProcessProvablyGone(pid) || getPlatform() === "windows") return true;
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    return getErrnoCode(error) === "ESRCH";
  }
}
//@ chunk-nefh4pze.js:3984-4051 placement
async function isOwnerGone(pid, startTime) {
  return (
    isProcessProvablyGone(pid) ||
    (startTime !== undefined && (await provenSameProcessAsync(pid, startTime)) === false)
  );
}
//@ chunk-nefh4pze.js:4051-4119 placement
async function ownPidDomainId() {
  try {
    return `${await ownPidDomain()} ${ownPidSpace()}`;
  } catch {
    return;
  }
}
//@ chunk-nefh4pze.js:4119-4190 placement
async function deleteFileQuietly(path) {
  try {
    await getFileReader().delete(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-nefh4pze.js:4190-4226 placement
function clipShellField(text, maxChars) {
  return truncateWithEllipsis(cleanForDisplay(text), maxChars);
}
export {
  retireServedBackgroundShell,
  fileServedBackgroundShell,
  takeServedBackgroundStopRequest,
  SERVED_BACKGROUND_SHELL_ID,
  lookUpServedBackgroundShell,
  readServedBackgroundShells,
  servedBackgroundShellLines,
  servedBackgroundShellsIn,
  stopServedBackgroundShell,
};
