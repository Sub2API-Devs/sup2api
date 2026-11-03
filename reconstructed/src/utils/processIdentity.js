/**
 * utils/processIdentity.ts
 *
 * 进程身份（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1), chunk-qg0af0yq.js (43)
 * attribution: placement 44
 */
import { delimiter } from "path";
import { getPlatform } from "./platform.js";
import { getFsImplementation } from "./fsOperations.js";
import { statState, isMinorFaultField, procStatField } from "./procStat.js";
import {
  execFileNoThrow,
  execFileNoThrowWithCwd,
  execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING,
} from "./execFileNoThrow.js";
import { getErrnoCode } from "./errors.js";
import { HostScoped } from "./hostScoped.js";
import { withDeadline, sleep } from "./sleep.js";
import { getRootSession } from "../bootstrap/state.js";
import { sanitizePathEnv, whichOnPath } from "./which.js";
import { getEnvCaseInsensitive } from "./plugins/securityDefaultPlugin.js";

//@ chunk-qg0af0yq.js:12016-12101 placement
class ProcessIdentityOverride {
  #e = false;
  get forcedUnavailable() {
    return this.#e;
  }
  forceUnavailable(e) {
    this.#e = e;
  }
}
//@ chunk-qg0af0yq.js:12101-12115 placement
var processIdentityOverride = new ProcessIdentityOverride();
//@ chunk-qg0af0yq.js:12115-12137 placement
function procStartFromBun() {
  return false;
}
//@ chunk-qg0af0yq.js:12137-12261 placement
/**
 * 获取 Windows 进程的创建时间（Bun 扩展），失败返回 undefined。
 */
function getWindowsProcessCreationTime(e) {
  if (!Number.isInteger(e) || e <= 0) return;
  try {
    return Bun.ant.windowsProcessCreationTime(e) ?? undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:12261-12433 placement
async function readLinuxProcState(e) {
  if (getPlatform() !== "linux" && getPlatform() !== "wsl") return;
  if (!isProbeablePid(e)) return;
  try {
    let content = await getFsImplementation().readFile(`/proc/${e}/stat`, {
      encoding: "utf8",
    });
    return statState(content);
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:12433-12479 placement
async function isExitedProcessAsync(pid) {
  return isMinorFaultField(await readLinuxProcState(pid));
}
//@ chunk-qg0af0yq.js:12479-12652 placement
async function hasExitedUnreaped(pid) {
  if (getPlatform() !== "macos") return isExitedProcessAsync(pid);
  let { code, stdout } = await execFileNoThrow("ps", ["-o", "stat=", "-p", String(pid)], {
    timeout: 1000,
  });
  return code === 0 && stdout.trim().startsWith("Z");
}
//@ chunk-qg0af0yq.js:12652-12670 placement
var MAX_PROC_START_SECONDS = 2147483647;
//@ chunk-qg0af0yq.js:12670-12725 placement
function isProbeablePid(e) {
  return Number.isInteger(e) && e > 1 && e <= MAX_PROC_START_SECONDS;
}
//@ chunk-qg0af0yq.js:12725-12824 placement
function isProcessProvablyGone(pid) {
  if (!isProbeablePid(pid)) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return getErrnoCode(error) === "ESRCH";
  }
}
//@ chunk-qg0af0yq.js:12824-12834 placement
var PROC_START_TOKEN_LENGTH = 16;
//@ chunk-qg0af0yq.js:12834-13122 placement
async function looksLikeFullHostProcessTable() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return true;
  let fsImplementation = getFsImplementation();
  let t = await fsImplementation.readlink("/proc/self").catch(() => null);
  if (t === null || t !== String(process.pid)) return false;
  let r = await fsImplementation.readdir("/proc").catch(() => null);
  if (!r) return false;
  return r.filter((s) => /^\d+$/.test(s.name)).length >= PROC_START_TOKEN_LENGTH;
}
//@ chunk-qg0af0yq.js:13122-13368 placement
function sigtermThenKill(e, n) {
  let filtered = e.filter((r) => Math.abs(r) > 1);
  for (let r of filtered) {
    try {
      process.kill(r, "SIGTERM");
    } catch {
      continue;
    }
    setTimeout(
      (i, s, o) => {
        if (!isSameProcess(s, o)) return;
        try {
          process.kill(i, "SIGKILL");
        } catch {}
      },
      5000,
      r,
      Math.abs(filtered[0]),
      n,
    ).unref();
    return true;
  }
  return false;
}
//@ chunk-qg0af0yq.js:13368-13657 placement
async function reapDetachedRepl(replPid, replProcStart, t = "SIGTERM") {
  if (!replPid || replPid <= 1 || replProcStart === undefined) return false;
  if ((await compareProcessIdentity(replPid, replProcStart)) === "other") return false;
  try {
    process.kill(-replPid, t);
  } catch {
    return false;
  }
  if (t !== "SIGKILL")
    setTimeout(
      (r, i) => {
        compareProcessIdentity(r, i).then((s) => {
          if (s === "other") return;
          try {
            process.kill(-r, "SIGKILL");
          } catch {}
        });
      },
      5000,
      replPid,
      replProcStart,
    ).unref();
  return true;
}
//@ chunk-qg0af0yq.js:13657-13828 placement
async function compareProcessIdentity(e, n) {
  let t = await captureProcessStartTimeAsync(e);
  if (t !== undefined) return startTokensEqualOrCrossFormat(n, t) ? "same" : "other";
  try {
    process.kill(e, 0);
    return "other";
  } catch (error) {
    return getErrnoCode(error) === "ESRCH" ? "gone" : "other";
  }
}
//@ chunk-qg0af0yq.js:13828-13961 placement
function getProcessStartTokenLinuxSync(e) {
  try {
    let content = getFsImplementation().readFileSync(`/proc/${e}/stat`, {
      encoding: "utf8",
    });
    let t = procStatField(content);
    return t && t.length > 0 ? t : undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:13961-14236 placement
function getAncestorPidsLinuxSync(e, n = 12) {
  let t = [];
  let r = e;
  for (let i = 0; i < n; i++) {
    let s = 0;
    try {
      let content = getFsImplementation().readFileSync(`/proc/${r}/stat`, {
        encoding: "utf8",
      });
      let index = content.lastIndexOf(")");
      let parts = content.slice(index + 2).split(" ");
      s = Number(parts[1]);
    } catch {
      break;
    }
    if (!Number.isInteger(s) || s < 1) break;
    t.push(s);
    if (s === 1) break;
    r = s;
  }
  return t;
}
//@ chunk-qg0af0yq.js:14236-14296 placement
async function getAncestorPidsAsync(pid, maxDepth = 10) {
  return (await getAncestorPidsCheckedAsync(pid, maxDepth)).ancestors;
}
//@ chunk-qg0af0yq.js:14296-14868 placement = getAncestorPidsAsync (0.341)
async function getAncestorPidsCheckedAsync(pid, maxDepth = 10) {
  let script = `pid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ]; then echo FAIL; exit 0; fi; if [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then echo END; exit 0; fi; echo $ppid; pid=$ppid; done`;
  let result = await execFileNoThrowWithCwd("sh", ["-c", script], {
    timeout: 3000,
  });
  let filtered = (result.stdout ?? "")
    .trim()
    .split(
      `
`,
    )
    .filter(Boolean);
  return {
    ancestors: filtered
      .filter((s) => s !== "END" && s !== "FAIL")
      .map((s) => parseInt(s, 10))
      .filter((s) => !isNaN(s)),
    readFailed: result.code !== 0 || filtered.at(-1) === "FAIL",
    truncated: result.code === 0 && filtered.at(-1) !== "END" && filtered.at(-1) !== "FAIL",
  };
}
//@ chunk-qg0af0yq.js:14868-14993 placement = getProcessCommand (0.696)
function getProcessCommand(pid) {
  try {
    let command = `ps -o command= -p ${String(pid)}`;
    let result = execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
      command,
      {
        timeout: 1000,
      },
    );
    return result ? result.trim() : null;
  } catch {
    return null;
  }
}
//@ chunk-qg0af0yq.js:14993-15193 placement
function getProcessStartTime(e) {
  try {
    {
      let content = getFsImplementation().readFileSync(`/proc/${e}/stat`, {
        encoding: "utf8",
      });
      return procStatField(content);
    }
    let n = execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
      `LC_ALL=C TZ=UTC ps -o lstart= -p ${e}`,
      {
        timeout: 1000,
      },
    );
    return n ? n.trim() : undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:15193-15254 placement
function isSameProcess(e, n) {
  if (n === undefined) return true;
  return isSameProcStart(n, getProcessStartTime(e));
}
//@ chunk-qg0af0yq.js:15254-15299 placement
function startTokensEqualOrCrossFormat(e, processStartTime) {
  if (processStartTime === e) return true;
  return false;
}
//@ chunk-qg0af0yq.js:15299-15350 placement
function isSameProcStart(e, processStartTime) {
  return (
    processStartTime === undefined || processStartTime === e || isCrossFormatStartToken(e, processStartTime)
  );
}
//@ chunk-qg0af0yq.js:15350-15503 placement
function isCrossFormatStartToken(e, n) {
  if (!procStartFromBun()) return false;
  let t = Number(e);
  let r = Number(n);
  return Number.isFinite(t) && Number.isFinite(r) && t > 300000000000000000 !== r > 300000000000000000;
}
//@ chunk-qg0af0yq.js:15503-15574 placement
async function isSameProcessAsync(e, n) {
  if (n === undefined) return true;
  return isSameProcStart(n, await getProcessStartTimeAsync(e));
}
//@ chunk-qg0af0yq.js:15574-15664 placement
async function provenSameProcessAsync(pid, procStart) {
  let processStartTime = await getProcessStartTimeAsync(pid, {
    skipCache: true,
  });
  return processStartTime === undefined
    ? undefined
    : startTokensEqualOrCrossFormat(procStart, processStartTime);
}
//@ chunk-qg0af0yq.js:15664-15760 placement
class ProcStartTokenCell {
  #e = undefined;
  get token() {
    return this.#e;
  }
  set(e) {
    this.#e = e;
    return e;
  }
  reset() {
    this.#e = undefined;
  }
}
//@ chunk-qg0af0yq.js:15760-15775 placement
var ownProcStartMemo = new ProcStartTokenCell();
//@ chunk-qg0af0yq.js:15775-15851 placement
class ProcStartTokenCache {
  #e = new Map();
  get(e) {
    return this.#e.get(e);
  }
  set(e, n) {
    this.#e.set(e, n);
  }
}
//@ chunk-qg0af0yq.js:15851-15876 placement
var procStartTokenCache = new HostScoped(() => new ProcStartTokenCache());
//@ chunk-qg0af0yq.js:15876-15935 placement = getClaudeSocketName (0.649)
/**
 * 本进程的 Claude tmux socket 名（按 pid 生成一次后缓存）。
 */
function ownProcStart() {
  return ownProcStartMemo.token ?? ownProcStartMemo.set(getProcessStartTime(process.pid));
}
//@ chunk-qg0af0yq.js:15935-15947 placement
var PROC_START_LOCK_STALE_MS = 1000;
//@ chunk-qg0af0yq.js:15947-16047 placement
async function ownProcStartAsync() {
  return (
    ownProcStartMemo.token ??
    (await withDeadline(
      getProcessStartTimeAsync(process.pid).then(
        (processStartTime) => ownProcStartMemo.token ?? ownProcStartMemo.set(processStartTime),
      ),
      PROC_START_LOCK_STALE_MS,
    ))
  );
}
//@ chunk-qg0af0yq.js:16047-16137 placement
function procIdentityOf(e) {
  if (procStartFromBun()) return e.procStart !== undefined ? undefined : e.procStartFt;
  return e.procStart;
}
//@ chunk-qg0af0yq.js:16137-16230 placement
function procIdentityFields(e) {
  return procStartFromBun()
    ? {
        procStart: undefined,
        procStartFt: e,
      }
    : {
        procStart: e,
        procStartFt: undefined,
      };
}
//@ chunk-qg0af0yq.js:16230-16251 placement
var PROC_START_LOCK_WAIT_MS = 60000;
var PROC_START_LOCK_TIMEOUT_MS = 5000;
//@ chunk-qg0af0yq.js:16251-16535 placement
async function getProcessStartTimeAsync(pid, n) {
  let now = Date.now();
  let r = procStartTokenCache.of(getRootSession().host);
  if (n?.env !== undefined) return readProcessStartTime(pid, n.env);
  if (!n?.skipCache) {
    let a = r.get(pid);
    let l = a?.miss ? PROC_START_LOCK_TIMEOUT_MS : PROC_START_LOCK_WAIT_MS;
    if (a && now - a.at < l) return a.p;
  }
  let processStartTime = readProcessStartTime(pid);
  let s = {
    at: now,
    p: processStartTime,
  };
  r.set(pid, s);
  let o = await processStartTime;
  if (o === undefined && r.get(pid) === s) {
    s.miss = true;
    s.at = Date.now();
  }
  return o;
}
//@ chunk-qg0af0yq.js:16535-16554 placement
var PROC_IDENTITY_RETRY_DELAY_MS = 250;
var PROC_IDENTITY_RETRY_TOTAL_MS = 2500;
//@ chunk-qg0af0yq.js:16554-16799 placement
async function captureProcessStartTimeAsync(e) {
  let n = Date.now() + PROC_IDENTITY_RETRY_TOTAL_MS;
  let t = false;
  let r = await withDeadline(
    getProcessStartTimeAsync(e, {
      skipCache: true,
    }).finally(() => {
      t = true;
    }),
    PROC_IDENTITY_RETRY_TOTAL_MS,
  );
  if (r !== undefined || !t) return r;
  let i = PROC_IDENTITY_RETRY_DELAY_MS + Math.floor(Math.random() * PROC_IDENTITY_RETRY_DELAY_MS);
  let s = n - Date.now() - i;
  if (s <= 0) return;
  await sleep(i);
  return withDeadline(
    getProcessStartTimeAsync(e, {
      skipCache: true,
    }),
    s,
  );
}
//@ chunk-qg0af0yq.js:16799-16902 placement
function getBinOnlyPath(e) {
  let parts = sanitizePathEnv(getEnvCaseInsensitive(e, "PATH") ?? "").split(delimiter);
  return parts.filter((r) => /^\/bin\/*$/.test(r)).join(delimiter);
}
//@ chunk-qg0af0yq.js:16902-17282 placement
/**
 * 读取进程启动时间：优先解析 /proc/<pid>/stat，否则用 ps -o lstart（可在指定环境中只从 /bin 查找 ps，UTC、C 语言环境、1 秒超时）。
 */
async function readProcessStartTime(e, env) {
  let t =
    env === undefined
      ? {}
      : {
          env,
          extendEnv: false,
        };
  try {
    {
      let content = await getFsImplementation().readFile(`/proc/${e}/stat`, {
        encoding: "utf8",
      });
      return procStatField(content);
    }
    let r = env === undefined ? "ps" : whichOnPath("ps", getBinOnlyPath(env));
    if (r === null) return;
    let i = await execFileNoThrowWithCwd(r, ["-o", "lstart=", "-p", String(e)], {
      timeout: 1000,
      ...t,
      env: {
        ...(env ?? process.env),
        LC_ALL: "C",
        TZ: "UTC",
      },
    });
    return i.code === 0 && i.stdout ? i.stdout.trim() : undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:17282-17811 placement
async function getProcessCreationTimeMsAsync(pid) {
  try {
    {
      let content = await getFsImplementation().readFile(`/proc/${pid}/stat`, {
        encoding: "utf8",
      });
      let i = Number(procStatField(content));
      let content_2 = await getFsImplementation().readFile("/proc/stat", {
        encoding: "utf8",
      });
      let o = Number(/^btime (\d+)/m.exec(content_2)?.[1]);
      if (!Number.isFinite(i) || !Number.isFinite(o)) return null;
      return o * 1000 + (i / 100) * 1000;
    }
    let n = await execFileNoThrowWithCwd("ps", ["-o", "lstart=", "-p", String(pid)], {
      timeout: 1000,
      env: {
        ...process.env,
        LC_ALL: "C",
        TZ: "UTC",
      },
    });
    if (n.code !== 0 || !n.stdout?.trim()) return null;
    let timestamp = Date.parse(`${n.stdout.trim()} UTC`);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:315408-315579 placement
/**
 * 读取一组 pid 在 Linux 上的进程启动令牌（无效 pid 跳过）。
 */
async function processStartTokens(e) {
  let filtered = [...e].filter((s) => Number.isInteger(s) && s > 1);
  let r = new Map();
  if (filtered.length === 0) return r;
  for (let s of filtered) {
    let processStartTokenLinux = getProcessStartTokenLinuxSync(s);
    if (processStartTokenLinux !== undefined) r.set(s, processStartTokenLinux);
  }
  return r;
}
export {
  getAncestorPidsCheckedAsync,
  getProcessStartTimeAsync,
  getProcessStartTokenLinuxSync,
  getAncestorPidsLinuxSync,
  provenSameProcessAsync,
  isProcessProvablyGone,
  ownProcStartMemo,
  procIdentityOf,
  isSameProcessAsync,
  captureProcessStartTimeAsync,
  ownProcStartAsync,
  getProcessCreationTimeMsAsync,
  startTokensEqualOrCrossFormat,
  hasExitedUnreaped,
  looksLikeFullHostProcessTable,
  isProbeablePid,
  isExitedProcessAsync,
  sigtermThenKill,
  reapDetachedRepl,
  getProcessStartTime,
  isSameProcess,
  readLinuxProcState,
  ownProcStart,
  getWindowsProcessCreationTime,
  procIdentityFields,
  processStartTokens,
  getAncestorPidsAsync,
  getProcessCommand,
};
