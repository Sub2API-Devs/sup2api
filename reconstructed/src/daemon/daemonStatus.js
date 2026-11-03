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
import { u, o, tc } from "../../vendor/zod/v4/classic/schemas.js";
import { plural, ql } from "../utils/stringUtils.js";
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
async function writeDaemonStatus(s, n) {
  let r = {
    supervisorPid: process.pid,
    supervisorProcStart: ownProcStart(),
    writtenAt: Date.now(),
    workers: s,
  };
  if (isStorageV5Enabled() && n !== void 0)
    try {
      let write = await n.write(daemonStatusKey(), jsonStringify(r, null, 2), {
        mode: 438 & ~process.umask(),
      });
      if (!write.ok) logForDebugging(`writeDaemonStatus: ${write.error.code}`);
      return write.ok;
    } catch (error) {
      return (logForDebugging(`writeDaemonStatus: ${errorMessage(error)}`), !1);
    }
  try {
    return (await getFileReader().atomicWrite(daemonStatusPath(), jsonStringify(r, null, 2)), !0);
  } catch (error) {
    return (logForDebugging(`writeDaemonStatus: ${errorMessage(error)}`), !1);
  }
}
//@ chunk-nbg7qs8b.js:1148-1358 placement
async function removeDaemonStatus(s) {
  if (isStorageV5Enabled() && s !== void 0) {
    try {
      let n = await s.delete(daemonStatusKey());
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
/**
 * 读取守护进程状态文件 daemon.status.json；本模块也负责写入与删除。
 */
//@ chunk-nbg7qs8b.js:1358-1932 placement
async function readDaemonStatus(s) {
  let n;
  if (isStorageV5Enabled() && s !== void 0) {
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
  let r = safeParseJSON(n, !1);
  if (!r || typeof r !== "object") return null;
  let e = r;
  if (typeof e.supervisorPid !== "number" || typeof e.workers !== "object" || e.workers === null) return null;
  try {
    process.kill(e.supervisorPid, 0);
  } catch {
    return null;
  }
  let a = typeof e.supervisorProcStart === "string" ? e.supervisorProcStart : void 0;
  if (!(await isSameProcessAsync(e.supervisorPid, a))) return null;
  return r;
}
//@ chunk-nbg7qs8b.js:1932-1961 placement
var m = 4096,
  p = 200,
  SERVED_SESSIONS_MAX = 64,
  f = 32;
/**
 * 从守护进程状态读服务的文件夹
 */
//@ chunk-nbg7qs8b.js:1961-2180 placement
function readServedFoldersFromStatus(s) {
  let n = [],
    r = u({
      servedFolder: u({ dir: o().min(1).max(m), sessions: tc().positive().max(SERVED_SESSIONS_MAX) }),
    });
  for (let e of Object.values(s?.workers ?? {})) {
    let safeParse = r.safeParse(e);
    if (safeParse.success) n.push(safeParse.data.servedFolder);
  }
  return n;
}
//@ chunk-nbg7qs8b.js:2180-2313 placement
async function readServedFolders(s, n) {
  try {
    let r = await readDaemonStatus(n);
    return r?.supervisorPid === s ? readServedFoldersFromStatus(r) : [];
  } catch (error) {
    logForDebugging(`readServedFolders: ${errorMessage(error)}`);
  }
  return [];
}
//@ chunk-nbg7qs8b.js:2313-2530 placement
function servingToolsLines(s) {
  let mapped = s
      .slice(0, f)
      .map(
        ({ dir: dir, sessions: sessions }) =>
          `serving tools: ${sessions} ${plural(sessions, "cloud session")} in ${truncateWithEllipsis(ql(dir), p)}`,
      ),
    e = s.length - mapped.length;
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
