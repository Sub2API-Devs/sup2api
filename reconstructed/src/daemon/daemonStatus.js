/**
 * daemon/daemonStatus.ts
 *
 * 2.1.316 新增。读取守护进程状态文件 daemon.status.json；本模块也负责写入与删除。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nbg7qs8b.js (9)
 * attribution: placement 9
 */
import { join } from "path";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { ownProcStart, isSameProcessAsync } from "../utils/processIdentity.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { getFileReader } from "../utils/fileStore.js";
import { safeParseJSON } from "../utils/json.js";
import { u, string, int } from "../../vendor/zod/v4/classic/schemas.js";
import { plural, cleanForDisplay } from "../utils/stringUtils.js";
import { truncateWithEllipsis } from "../utils/printableName.js";

//@ chunk-nbg7qs8b.js:624-675 placement
function daemonStatusPath() {
  return join(getClaudeConfigDir(), "daemon.status.json");
}
//@ chunk-nbg7qs8b.js:675-723 placement
function daemonStatusKey() {
  return STORAGE_SPACES.state("daemon-status");
}
//@ chunk-nbg7qs8b.js:723-1148 placement
async function writeDaemonStatus(workers, storageV5) {
  let r = {
    supervisorPid: process.pid,
    supervisorProcStart: ownProcStart(),
    writtenAt: Date.now(),
    workers,
  };
  if (isStorageV5Enabled() && storageV5 !== undefined)
    try {
      let e = await storageV5.write(daemonStatusKey(), jsonStringify(r, null, 2), {
        mode: 438 & ~process.umask(),
      });
      if (!e.ok) logForDebugging(`writeDaemonStatus: ${e.error.code}`);
      return e.ok;
    } catch (error) {
      logForDebugging(`writeDaemonStatus: ${errorMessage(error)}`);
      return false;
    }
  try {
    await getFileReader().atomicWrite(daemonStatusPath(), jsonStringify(r, null, 2));
    return true;
  } catch (error) {
    logForDebugging(`writeDaemonStatus: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-nbg7qs8b.js:1148-1358 placement
async function removeDaemonStatus(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    try {
      let n = await storageV5.delete(daemonStatusKey());
      if (!n.ok) logForDebugging(`removeDaemonStatus: ${n.error.code}`);
    } catch (error) {
      logForDebugging(`removeDaemonStatus: ${errorMessage(error)}`);
    }
    return;
  }
  try {
    await getFileReader().delete(daemonStatusPath());
  } catch {}
}
//@ chunk-nbg7qs8b.js:1358-1932 placement
/**
 * 读取守护进程状态文件 daemon.status.json；本模块也负责写入与删除。
 */
async function readDaemonStatus(s) {
  let n;
  if (isStorageV5Enabled() && s !== undefined) {
    let i;
    try {
      i = await s.readText([daemonStatusKey()]);
    } catch {
      return null;
    }
    if (!i.ok) return null;
    let c = i.value.items[0];
    if (!c.found) return null;
    n = c.value;
  } else
    try {
      n = await getFileReader().read(daemonStatusPath());
    } catch {
      return null;
    }
  let r = safeParseJSON(n, false);
  if (!r || typeof r !== "object") return null;
  let e = r;
  if (typeof e.supervisorPid !== "number" || typeof e.workers !== "object" || e.workers === null) return null;
  try {
    process.kill(e.supervisorPid, 0);
  } catch {
    return null;
  }
  let supervisorProcStart = typeof e.supervisorProcStart === "string" ? e.supervisorProcStart : undefined;
  if (!(await isSameProcessAsync(e.supervisorPid, supervisorProcStart))) return null;
  return r;
}
//@ chunk-nbg7qs8b.js:1932-1961 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_DAEMON_STATUS_BYTES（4096）；DAEMON_STATUS_TTL_MS（200）；DAEMON_STATUS_ENTRIES（32）。
 */
var MAX_DAEMON_STATUS_BYTES = 4096;
var DAEMON_STATUS_TTL_MS = 200;
var SERVED_SESSIONS_MAX = 64;
var DAEMON_STATUS_ENTRIES = 32;
//@ chunk-nbg7qs8b.js:1961-2180 placement
/**
 * 从守护进程状态读服务的文件夹
 */
function readServedFoldersFromStatus(daemonStatus) {
  let n = [];
  let r = u({
    servedFolder: u({
      dir: string().min(1).max(MAX_DAEMON_STATUS_BYTES),
      sessions: int().positive().max(SERVED_SESSIONS_MAX),
    }),
  });
  for (let e of Object.values(daemonStatus?.workers ?? {})) {
    let a = r.safeParse(e);
    if (a.success) n.push(a.data.servedFolder);
  }
  return n;
}
//@ chunk-nbg7qs8b.js:2180-2313 placement
async function readServedFolders(pid, n) {
  try {
    let daemonStatus = await readDaemonStatus(n);
    return daemonStatus?.supervisorPid === pid ? readServedFoldersFromStatus(daemonStatus) : [];
  } catch (error) {
    logForDebugging(`readServedFolders: ${errorMessage(error)}`);
  }
  return [];
}
//@ chunk-nbg7qs8b.js:2313-2530 placement
function servingToolsLines(s) {
  let mapped = s
    .slice(0, DAEMON_STATUS_ENTRIES)
    .map(
      ({ dir, sessions }) =>
        `serving tools: ${sessions} ${plural(sessions, "cloud session")} in ${truncateWithEllipsis(cleanForDisplay(dir), DAEMON_STATUS_TTL_MS)}`,
    );
  let e = s.length - mapped.length;
  return e > 0 ? mapped.concat(`serving tools: and ${e} more ${plural(e, "folder")}`) : mapped;
}
export {
  readServedFolders,
  servingToolsLines,
  readDaemonStatus,
  daemonStatusPath,
  daemonStatusKey,
  SERVED_SESSIONS_MAX,
  writeDaemonStatus,
  removeDaemonStatus,
};
