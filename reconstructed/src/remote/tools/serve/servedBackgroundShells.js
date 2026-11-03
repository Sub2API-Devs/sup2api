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
import { u, T, o, tc, E } from "../../../../vendor/zod/v4/classic/schemas.js";
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
import { ql } from "../../../utils/stringUtils.js";

//@ chunk-hkmynrbn.js:752-1202 placement
var SERVED_BACKGROUND_SHELL_ID = /^[A-Za-z0-9]{1,64}$/,
  R = /^background-[A-Za-z0-9]{1,64}\.jsonl$/,
  S = 80,
  _ = 64,
  B = 8192,
  L = 256,
  w = 32,
  z = 250,
  C = DoctorLazy(() =>
    u({
      v: T(1),
      id: o().regex(SERVED_BACKGROUND_SHELL_ID),
      owner: tc().positive().max(2147483647),
      owner_start: o().min(1).max(64).optional(),
      pid: tc().positive().max(2147483647).optional(),
      pid_start: o().min(1).max(64).optional(),
      pids_in: o().min(1).max(1024).optional(),
      started_at: E().nonnegative(),
      command: o().max(4 * S),
      caller: o().max(4 * _),
      folder: o().min(1).max(4096),
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
      pid_start: e.pid === void 0 ? void 0 : await getProcessStartTimeAsync(e.pid, { skipCache: !0 }),
      pids_in: await P(),
      started_at: Date.now(),
      command: c(e.command, S),
      caller: c(e.caller, _),
      folder: e.folder,
    };
    (await getFileReader().mkdir(servedCallsDir(), 448),
      await getFileReader().writeExclusive(m(e.id), toJsonLine(n), 384),
      await readServedBackgroundShells());
  } catch (error) {
    logForDebugging(`[remote-tools] background command record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-hkmynrbn.js:1664-1714 placement
async function retireServedBackgroundShell(e) {
  (await f(l(e)), await f(m(e)));
}
//@ chunk-hkmynrbn.js:1714-1745 placement
function takeServedBackgroundStopRequest(e) {
  return f(l(e));
}
//@ chunk-hkmynrbn.js:1745-2118 placement
async function readServedBackgroundShells() {
  let e = [];
  try {
    let list = await getFileReader().list(servedCallsDir());
    for (let i of list.filter((r) => R.test(r)).slice(0, L)) {
      let r = await lookUpServedBackgroundShell(i.slice(11, -6));
      if (r !== void 0 && r !== "ended") e.push(r);
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
    let tail = await getFileReader().readTail(m(e), B, { noFollow: !0 }),
      safeParse = C().safeParse(jsonParseRaw(tail.toString("utf8").trim()));
    if (!safeParse.success || safeParse.data.id !== e) return;
    let r = safeParse.data,
      a =
        (r.owner === process.pid &&
          r.owner_start !== void 0 &&
          r.owner_start === (await ownProcStartAsync())) ||
        (await h(r.owner, r.owner_start));
    if (a || (await h(r.pid, r.pid_start))) return { ...r, ownerGone: !a };
    if (await isServedShellAlive(r)) return (await retireServedBackgroundShell(e), "ended");
  } catch {}
  return;
}
//@ chunk-hkmynrbn.js:2534-2618 placement
async function servedBackgroundShellsIn(e) {
  return count(await readServedBackgroundShells(), (n) => !n.ownerGone && e.includes(n.folder));
}
//@ chunk-hkmynrbn.js:2618-2917 placement
async function stopServedBackgroundShell(e, n = 1e4) {
  let i = getFileReader();
  try {
    await i.writeExclusive(
      l(e),
      `{}
`,
      384,
    );
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") return "not_asked";
  }
  let r = Date.now() + n;
  while (Date.now() < r)
    if ((await sleep(z), (await i.lstat(m(e)).catch(() => null)) === void 0))
      return (await takeServedBackgroundStopRequest(e), "stopped");
  return (await f(l(e))) ? "unanswered" : "pending";
}
/**
 * 列出云会话启动的后台命令（claude daemon remote-control stop-shell 可停止）。
 */
//@ chunk-hkmynrbn.js:2917-3507 placement
function servedBackgroundShellLines(e, { now: now, stopHint: stopHint }) {
  if (e.length === 0) return [];
  let r = ["background commands started by cloud sessions:"],
    a;
  for (let s of e.slice(0, w)) {
    let g = `  in ${c(s.folder, 200)}, cloud session ${c(s.caller, _ + 1)}:`;
    if (g !== a) ((a = g), r.push(g));
    let b = s.pid === void 0 ? "pid unknown" : `pid ${s.pid}`,
      x = formatDurationCoarse(Math.max(0, now - s.started_at));
    r.push(
      `    ${s.id}  ${b}  running ${x}  ${c(s.command, S + 1)}${s.ownerGone ? "  (its serving process is gone: nothing here will stop it)" : ""}`,
    );
  }
  if (e.length > w) r.push(`  and ${e.length - w} more`);
  if (stopHint) r.push("  stop one: claude daemon remote-control stop-shell <id>");
  return r;
}
//@ chunk-hkmynrbn.js:3507-3560 placement
function m(e) {
  return join(servedCallsDir(), `background-${e}.jsonl`);
}
//@ chunk-hkmynrbn.js:3560-3618 placement
function l(e) {
  return join(servedCallsDir(), `background-${e}.stop.jsonl`);
}
//@ chunk-hkmynrbn.js:3618-3699 placement
async function h(e, n) {
  return e !== void 0 && isProcessRunning(e) && (n === void 0 || (await provenSameProcessAsync(e, n)) !== !1);
}
/**
 * 核对后台命令记录的所有者与进程是否仍在
 */
//@ chunk-hkmynrbn.js:3699-3982 placement
async function isServedShellAlive(e) {
  if (
    e.pids_in === void 0 ||
    e.pids_in !== (await P()) ||
    !(await looksLikeFullHostProcessTable()) ||
    !(await v(e.owner, e.owner_start))
  )
    return !1;
  let { pid: pid } = e;
  if (pid === void 0 || !(await v(pid, e.pid_start))) return !1;
  if (!isProcessProvablyGone(pid) || getPlatform() === "windows") return !0;
  try {
    return (process.kill(-pid, 0), !1);
  } catch (error) {
    return getErrnoCode(error) === "ESRCH";
  }
}
//@ chunk-hkmynrbn.js:3982-4049 placement
async function v(e, n) {
  return isProcessProvablyGone(e) || (n !== void 0 && (await provenSameProcessAsync(e, n)) === !1);
}
//@ chunk-hkmynrbn.js:4049-4116 placement
async function P() {
  try {
    return `${await ownPidDomain()} ${ownPidSpace()}`;
  } catch {
    return;
  }
}
//@ chunk-hkmynrbn.js:4116-4187 placement
async function f(e) {
  try {
    return (await getFileReader().delete(e), !0);
  } catch {
    return !1;
  }
}
//@ chunk-hkmynrbn.js:4187-4222 placement
function c(e, n) {
  return truncateWithEllipsis(ql(e), n);
}

export { retireServedBackgroundShell, fileServedBackgroundShell, takeServedBackgroundStopRequest };
