/**
 * remote/tools/serve/servedBackgroundShells.ts
 *
 * 2.1.316 新增。列出云会话启动的后台命令（claude daemon remote-control stop-shell 可停止）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hkmynrbn.js (17)
 * attribution: placement 17
 */
import { join } from "path";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, literal, string, int, E } from "../../../../vendor/zod/v4/classic/schemas.js";
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
import { count } from "../../../utils/collections.js";
import { sleep } from "../../../utils/sleep.js";
import { formatDurationCoarse } from "../../../utils/format.js";
import { isProcessRunning } from "../../../utils/genericProcessUtils.js";
import { getPlatform } from "../../../utils/platform.js";
import { ownPidDomain, ownPidSpace } from "../../../utils/pidSpace.js";
import { truncateWithEllipsis } from "../../../utils/printableName.js";
import { cleanForDisplay } from "../../../utils/stringUtils.js";

//@ chunk-hkmynrbn.js:752-1202 placement
/**
 * 后台 shell 记录：id/日志文件名正则、字段长度上限（命令 80、调用者 64）、日志尾部 8192 字节、最多列 256 个日志、最多展示 32 条，以及记录 schema。
 */
var SERVED_BACKGROUND_SHELL_ID = /^[A-Za-z0-9]{1,64}$/;
var BACKGROUND_LOG_FILE_RE = /^background-[A-Za-z0-9]{1,64}\.jsonl$/;
var MAX_COMMAND_CHARS = 80;
var MAX_CALLER_CHARS = 64;
var MAX_LOG_TAIL_BYTES = 8192;
var MAX_LOG_FILES = 256;
var MAX_LISTED_SHELLS = 32;
var STOP_POLL_INTERVAL_MS = 250;
var servedBackgroundShellSchema = DoctorLazy(() =>
  u({
    v: literal(1),
    id: string().regex(SERVED_BACKGROUND_SHELL_ID),
    owner: int().positive().max(2147483647),
    owner_start: string().min(1).max(64).optional(),
    pid: int().positive().max(2147483647).optional(),
    pid_start: string().min(1).max(64).optional(),
    pids_in: string().min(1).max(1024).optional(),
    started_at: E().nonnegative(),
    command: string().max(4 * MAX_COMMAND_CHARS),
    caller: string().max(4 * MAX_CALLER_CHARS),
    folder: string().min(1).max(4096),
  }),
);
//@ chunk-hkmynrbn.js:1202-1664 placement
async function fileServedBackgroundShell(e) {
  if (!SERVED_BACKGROUND_SHELL_ID.test(e.id)) return;
  try {
    let n = {
      v: 1,
      id: e.id,
      owner: process.pid,
      owner_start: await ownProcStartAsync(),
      pid: e.pid,
      pid_start:
        e.pid === undefined
          ? undefined
          : await getProcessStartTimeAsync(e.pid, {
              skipCache: true,
            }),
      pids_in: await ownPidDomainId(),
      started_at: Date.now(),
      command: clipShellField(e.command, MAX_COMMAND_CHARS),
      caller: clipShellField(e.caller, MAX_CALLER_CHARS),
      folder: e.folder,
    };
    await getFileReader().mkdir(servedCallsDir(), 448);
    await getFileReader().writeExclusive(backgroundLogPath(e.id), toJsonLine(n), 384);
    await readServedBackgroundShells();
  } catch (error) {
    logForDebugging(`[remote-tools] background command record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-hkmynrbn.js:1664-1714 placement
async function retireServedBackgroundShell(e) {
  await deleteFileQuietly(backgroundStopPath(e));
  await deleteFileQuietly(backgroundLogPath(e));
}
//@ chunk-hkmynrbn.js:1714-1745 placement
function takeServedBackgroundStopRequest(e) {
  return deleteFileQuietly(backgroundStopPath(e));
}
//@ chunk-hkmynrbn.js:1745-2118 placement
async function readServedBackgroundShells() {
  let e = [];
  try {
    let n = await getFileReader().list(servedCallsDir());
    for (let i of n.filter((r) => BACKGROUND_LOG_FILE_RE.test(r)).slice(0, MAX_LOG_FILES)) {
      let r = await lookUpServedBackgroundShell(i.slice(11, -6));
      if (r !== undefined && r !== "ended") e.push(r);
    }
  } catch (error) {
    logForDebugging(`served background records: ${errorMessage(error)}`);
  }
  return e.sort(
    (n, i) =>
      n.folder.localeCompare(i.folder) ||
      n.caller.localeCompare(i.caller) ||
      n.started_at - i.started_at ||
      n.id.localeCompare(i.id),
  );
}
//@ chunk-hkmynrbn.js:2118-2534 placement
async function lookUpServedBackgroundShell(e) {
  if (!SERVED_BACKGROUND_SHELL_ID.test(e)) return;
  try {
    let tail = await getFileReader().readTail(backgroundLogPath(e), MAX_LOG_TAIL_BYTES, {
      noFollow: true,
    });
    let i = servedBackgroundShellSchema().safeParse(jsonParseRaw(tail.toString("utf8").trim()));
    if (!i.success || i.data.id !== e) return;
    let r = i.data;
    let a =
      (r.owner === process.pid &&
        r.owner_start !== undefined &&
        r.owner_start === (await ownProcStartAsync())) ||
      (await isOwnerAlive(r.owner, r.owner_start));
    if (a || (await isOwnerAlive(r.pid, r.pid_start)))
      return {
        ...r,
        ownerGone: !a,
      };
    if (await isServedShellAlive(r)) {
      await retireServedBackgroundShell(e);
      return "ended";
    }
  } catch {}
  return;
}
//@ chunk-hkmynrbn.js:2534-2618 placement
async function servedBackgroundShellsIn(e) {
  return count(await readServedBackgroundShells(), (n) => !n.ownerGone && e.includes(n.folder));
}
//@ chunk-hkmynrbn.js:2618-2917 placement
async function stopServedBackgroundShell(e, n = 1e4) {
  let fileReader = getFileReader();
  try {
    await fileReader.writeExclusive(
      backgroundStopPath(e),
      `{}
`,
      384,
    );
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") return "not_asked";
  }
  let r = Date.now() + n;
  while (Date.now() < r) {
    await sleep(STOP_POLL_INTERVAL_MS);
    if ((await fileReader.lstat(backgroundLogPath(e)).catch(() => null)) === undefined) {
      await takeServedBackgroundStopRequest(e);
      return "stopped";
    }
  }
  return (await deleteFileQuietly(backgroundStopPath(e))) ? "unanswered" : "pending";
}
//@ chunk-hkmynrbn.js:2917-3507 placement
/**
 * 列出云会话启动的后台命令（claude daemon remote-control stop-shell 可停止）。
 */
function servedBackgroundShellLines(e, { now, stopHint }) {
  if (e.length === 0) return [];
  let r = ["background commands started by cloud sessions:"];
  let a;
  for (let s of e.slice(0, MAX_LISTED_SHELLS)) {
    let g = `  in ${clipShellField(s.folder, 200)}, cloud session ${clipShellField(s.caller, MAX_CALLER_CHARS + 1)}:`;
    if (g !== a) {
      a = g;
      r.push(g);
    }
    let b = s.pid === undefined ? "pid unknown" : `pid ${s.pid}`;
    let x = formatDurationCoarse(Math.max(0, now - s.started_at));
    r.push(
      `    ${s.id}  ${b}  running ${x}  ${clipShellField(s.command, MAX_COMMAND_CHARS + 1)}${s.ownerGone ? "  (its serving process is gone: nothing here will stop it)" : ""}`,
    );
  }
  if (e.length > MAX_LISTED_SHELLS) r.push(`  and ${e.length - MAX_LISTED_SHELLS} more`);
  if (stopHint) r.push("  stop one: claude daemon remote-control stop-shell <id>");
  return r;
}
//@ chunk-hkmynrbn.js:3507-3560 placement
function backgroundLogPath(e) {
  return join(servedCallsDir(), `background-${e}.jsonl`);
}
//@ chunk-hkmynrbn.js:3560-3618 placement
function backgroundStopPath(e) {
  return join(servedCallsDir(), `background-${e}.stop.jsonl`);
}
//@ chunk-hkmynrbn.js:3618-3699 placement
async function isOwnerAlive(e, n) {
  return (
    e !== undefined &&
    isProcessRunning(e) &&
    (n === undefined || (await provenSameProcessAsync(e, n)) !== false)
  );
}
//@ chunk-hkmynrbn.js:3699-3982 placement
/**
 * 核对后台命令记录的所有者与进程是否仍在
 */
async function isServedShellAlive(e) {
  if (
    e.pids_in === undefined ||
    e.pids_in !== (await ownPidDomainId()) ||
    !(await looksLikeFullHostProcessTable()) ||
    !(await isOwnerGone(e.owner, e.owner_start))
  )
    return false;
  let { pid } = e;
  if (pid === undefined || !(await isOwnerGone(pid, e.pid_start))) return false;
  if (!isProcessProvablyGone(pid) || getPlatform() === "windows") return true;
  try {
    process.kill(-pid, 0);
    return false;
  } catch (error) {
    return getErrnoCode(error) === "ESRCH";
  }
}
//@ chunk-hkmynrbn.js:3982-4049 placement
async function isOwnerGone(e, n) {
  return isProcessProvablyGone(e) || (n !== undefined && (await provenSameProcessAsync(e, n)) === false);
}
//@ chunk-hkmynrbn.js:4049-4116 placement
async function ownPidDomainId() {
  try {
    return `${await ownPidDomain()} ${ownPidSpace()}`;
  } catch {
    return;
  }
}
//@ chunk-hkmynrbn.js:4116-4187 placement
async function deleteFileQuietly(e) {
  try {
    await getFileReader().delete(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-hkmynrbn.js:4187-4222 placement
function clipShellField(e, n) {
  return truncateWithEllipsis(cleanForDisplay(e), n);
}
export { retireServedBackgroundShell, fileServedBackgroundShell, takeServedBackgroundStopRequest };
