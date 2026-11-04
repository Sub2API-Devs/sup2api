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
import { objectSchema, stringSchema, int } from "../../vendor/zod/v4/classic/schemas.js";
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
  let status = {
    supervisorPid: process.pid,
    supervisorProcStart: ownProcStart(),
    writtenAt: Date.now(),
    workers,
  };
  if (isStorageV5Enabled() && storageV5 !== undefined)
    try {
      let result = await storageV5.write(daemonStatusKey(), jsonStringify(status, null, 2), {
        mode: 438 & ~process.umask(),
      });
      if (!result.ok) logForDebugging(`writeDaemonStatus: ${result.error.code}`);
      return result.ok;
    } catch (error) {
      logForDebugging(`writeDaemonStatus: ${errorMessage(error)}`);
      return false;
    }
  try {
    await getFileReader().atomicWrite(daemonStatusPath(), jsonStringify(status, null, 2));
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
      let result = await storageV5.delete(daemonStatusKey());
      if (!result.ok) logForDebugging(`removeDaemonStatus: ${result.error.code}`);
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
async function readDaemonStatus(storageV5) {
  let text;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let readResult;
    try {
      readResult = await storageV5.readText([daemonStatusKey()]);
    } catch {
      return null;
    }
    if (!readResult.ok) return null;
    let item = readResult.value.items[0];
    if (!item.found) return null;
    text = item.value;
  } else
    try {
      text = await getFileReader().read(daemonStatusPath());
    } catch {
      return null;
    }
  let status = safeParseJSON(text, false);
  if (!status || typeof status !== "object") return null;
  let parsed = status;
  if (
    typeof parsed.supervisorPid !== "number" ||
    typeof parsed.workers !== "object" ||
    parsed.workers === null
  )
    return null;
  try {
    process.kill(parsed.supervisorPid, 0);
  } catch {
    return null;
  }
  let supervisorProcStart =
    typeof parsed.supervisorProcStart === "string" ? parsed.supervisorProcStart : undefined;
  if (!(await isSameProcessAsync(parsed.supervisorPid, supervisorProcStart))) return null;
  return status;
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
  let folders = [];
  let workerSchema = objectSchema({
    servedFolder: objectSchema({
      dir: stringSchema().min(1).max(MAX_DAEMON_STATUS_BYTES),
      sessions: int().positive().max(SERVED_SESSIONS_MAX),
    }),
  });
  for (let worker of Object.values(daemonStatus?.workers ?? {})) {
    let parsed = workerSchema.safeParse(worker);
    if (parsed.success) folders.push(parsed.data.servedFolder);
  }
  return folders;
}
//@ chunk-nbg7qs8b.js:2180-2313 placement
async function readServedFolders(pid, storageV5) {
  try {
    let daemonStatus = await readDaemonStatus(storageV5);
    return daemonStatus?.supervisorPid === pid ? readServedFoldersFromStatus(daemonStatus) : [];
  } catch (error) {
    logForDebugging(`readServedFolders: ${errorMessage(error)}`);
  }
  return [];
}
//@ chunk-nbg7qs8b.js:2313-2530 placement
function servingToolsLines(folders) {
  let mapped = folders
    .slice(0, DAEMON_STATUS_ENTRIES)
    .map(
      ({ dir, sessions }) =>
        `serving tools: ${sessions} ${plural(sessions, "cloud session")} in ${truncateWithEllipsis(cleanForDisplay(dir), DAEMON_STATUS_TTL_MS)}`,
    );
  let omittedCount = folders.length - mapped.length;
  return omittedCount > 0
    ? mapped.concat(`serving tools: and ${omittedCount} more ${plural(omittedCount, "folder")}`)
    : mapped;
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
