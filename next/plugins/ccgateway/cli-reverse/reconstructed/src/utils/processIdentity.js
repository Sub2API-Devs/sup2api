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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qg0af0yq.js:12016-12101 placement
class ProcessIdentityOverride {
  #e = false;
  get forcedUnavailable() {
    return this.#e;
  }
  forceUnavailable(reason) {
    this.#e = reason;
  }
}
//@ chunk-qg0af0yq.js:12101-12115 placement
var processIdentityOverride; // deferred: uses ProcessIdentityOverride of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg0af0yq.js:12101", () => {
  processIdentityOverride = new ProcessIdentityOverride();
});
//@ chunk-qg0af0yq.js:12115-12137 placement
function procStartFromBun() {
  return false;
}
//@ chunk-qg0af0yq.js:12137-12261 placement
/**
 * 获取 Windows 进程的创建时间（Bun 扩展），失败返回 undefined。
 */
function getWindowsProcessCreationTime(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  try {
    return Bun.ant.windowsProcessCreationTime(pid) ?? undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:12261-12433 placement
async function readLinuxProcState(pid) {
  if (getPlatform() !== "linux" && getPlatform() !== "wsl") return;
  if (!isProbeablePid(pid)) return;
  try {
    let content = await getFsImplementation().readFile(`/proc/${pid}/stat`, {
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
function isProbeablePid(pid) {
  return Number.isInteger(pid) && pid > 1 && pid <= MAX_PROC_START_SECONDS;
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
  let selfTarget = await fsImplementation.readlink("/proc/self").catch(() => null);
  if (selfTarget === null || selfTarget !== String(process.pid)) return false;
  let procEntries = await fsImplementation.readdir("/proc").catch(() => null);
  if (!procEntries) return false;
  return procEntries.filter((entry) => /^\d+$/.test(entry.name)).length >= PROC_START_TOKEN_LENGTH;
}
//@ chunk-qg0af0yq.js:13122-13368 placement
function sigtermThenKill(pids, procStart) {
  let filtered = pids.filter((pid) => Math.abs(pid) > 1);
  for (let pid of filtered) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      continue;
    }
    setTimeout(
      (pid, procStart, otherStart) => {
        if (!isSameProcess(procStart, otherStart)) return;
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      },
      5000,
      pid,
      Math.abs(filtered[0]),
      procStart,
    ).unref();
    return true;
  }
  return false;
}
//@ chunk-qg0af0yq.js:13368-13657 placement
async function reapDetachedRepl(replPid, replProcStart, signal = "SIGTERM") {
  if (!replPid || replPid <= 1 || replProcStart === undefined) return false;
  if ((await compareProcessIdentity(replPid, replProcStart)) === "other") return false;
  try {
    process.kill(-replPid, signal);
  } catch {
    return false;
  }
  if (signal !== "SIGKILL")
    setTimeout(
      (pid, procStart) => {
        compareProcessIdentity(pid, procStart).then((verdict) => {
          if (verdict === "other") return;
          try {
            process.kill(-pid, "SIGKILL");
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
async function compareProcessIdentity(pid, expectedStart) {
  let actualStart = await captureProcessStartTimeAsync(pid);
  if (actualStart !== undefined)
    return startTokensEqualOrCrossFormat(expectedStart, actualStart) ? "same" : "other";
  try {
    process.kill(pid, 0);
    return "other";
  } catch (error) {
    return getErrnoCode(error) === "ESRCH" ? "gone" : "other";
  }
}
//@ chunk-qg0af0yq.js:13828-13961 placement
function getProcessStartTokenLinuxSync(pid) {
  try {
    let content = getFsImplementation().readFileSync(`/proc/${pid}/stat`, {
      encoding: "utf8",
    });
    let startToken = procStatField(content);
    return startToken && startToken.length > 0 ? startToken : undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:13961-14236 placement
function getAncestorPidsLinuxSync(pid, maxDepth = 12) {
  let ancestors = [];
  let currentPid = pid;
  for (let index = 0; index < maxDepth; index++) {
    let parentPid = 0;
    try {
      let content = getFsImplementation().readFileSync(`/proc/${currentPid}/stat`, {
        encoding: "utf8",
      });
      let index = content.lastIndexOf(")");
      let parts = content.slice(index + 2).split(" ");
      parentPid = Number(parts[1]);
    } catch {
      break;
    }
    if (!Number.isInteger(parentPid) || parentPid < 1) break;
    ancestors.push(parentPid);
    if (parentPid === 1) break;
    currentPid = parentPid;
  }
  return ancestors;
}
//@ chunk-qg0af0yq.js:14236-14296 placement
async function getAncestorPidsAsync(pid, maxDepth = 10) {
  return (await getAncestorPidsCheckedAsync(pid, maxDepth)).ancestors;
}
//@ chunk-qg0af0yq.js:14296-14868 placement (2.1.88 match: getAncestorPidsAsync, 0.341)
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
      .filter((token) => token !== "END" && token !== "FAIL")
      .map((token) => parseInt(token, 10))
      .filter((pid) => !isNaN(pid)),
    readFailed: result.code !== 0 || filtered.at(-1) === "FAIL",
    truncated: result.code === 0 && filtered.at(-1) !== "END" && filtered.at(-1) !== "FAIL",
  };
}
//@ chunk-qg0af0yq.js:14868-14993 placement (2.1.88 match: getProcessCommand, 0.696)
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
function getProcessStartTime(pid) {
  try {
    {
      let content = getFsImplementation().readFileSync(`/proc/${pid}/stat`, {
        encoding: "utf8",
      });
      return procStatField(content);
    }
    let psOutput =
      execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
        `LC_ALL=C TZ=UTC ps -o lstart= -p ${pid}`,
        {
          timeout: 1000,
        },
      );
    return psOutput ? psOutput.trim() : undefined;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:15193-15254 placement
function isSameProcess(pid, expected) {
  if (expected === undefined) return true;
  return isSameProcStart(expected, getProcessStartTime(pid));
}
//@ chunk-qg0af0yq.js:15254-15299 placement
function startTokensEqualOrCrossFormat(expected, actual) {
  if (actual === expected) return true;
  return false;
}
//@ chunk-qg0af0yq.js:15299-15350 placement
function isSameProcStart(expected, processStartTime) {
  return (
    processStartTime === undefined ||
    processStartTime === expected ||
    isCrossFormatStartToken(expected, processStartTime)
  );
}
//@ chunk-qg0af0yq.js:15350-15503 placement
function isCrossFormatStartToken(left, right) {
  if (!procStartFromBun()) return false;
  let leftNumber = Number(left);
  let rightNumber = Number(right);
  return (
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber) &&
    leftNumber > 300000000000000000 !== rightNumber > 300000000000000000
  );
}
//@ chunk-qg0af0yq.js:15503-15574 placement
async function isSameProcessAsync(pid, expected) {
  if (expected === undefined) return true;
  return isSameProcStart(expected, await getProcessStartTimeAsync(pid));
}
//@ chunk-qg0af0yq.js:15574-15664 placement
async function provenSameProcessAsync(pid, expectedStart) {
  let processStartTime = await getProcessStartTimeAsync(pid, {
    skipCache: true,
  });
  return processStartTime === undefined
    ? undefined
    : startTokensEqualOrCrossFormat(expectedStart, processStartTime);
}
//@ chunk-qg0af0yq.js:15664-15760 placement
class ProcStartTokenCell {
  #e = undefined;
  get token() {
    return this.#e;
  }
  set(token) {
    this.#e = token;
    return token;
  }
  reset() {
    this.#e = undefined;
  }
}
//@ chunk-qg0af0yq.js:15760-15775 placement
var ownProcStartMemo; // deferred: uses ProcStartTokenCell of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg0af0yq.js:15760", () => {
  ownProcStartMemo = new ProcStartTokenCell();
});
//@ chunk-qg0af0yq.js:15775-15851 placement
class ProcStartTokenCache {
  #e = new Map();
  get(pid) {
    return this.#e.get(pid);
  }
  set(pid, token) {
    this.#e.set(pid, token);
  }
}
//@ chunk-qg0af0yq.js:15851-15876 placement
var procStartTokenCache; // deferred: uses ProcStartTokenCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg0af0yq.js:15851", () => {
  procStartTokenCache = new HostScoped(() => new ProcStartTokenCache());
});
//@ chunk-qg0af0yq.js:15876-15935 placement (2.1.88 match: getClaudeSocketName, 0.649)
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
/**
 * 官方行为，保留：procIdentityOf 在 Bun 下 e.procStart !== void 0 时反而返回 undefined，而 procIdentityFields 恒把 procStart 置空、写 procStartFt；两函数约定不一致。
 */
function procIdentityOf(identity) {
  if (procStartFromBun()) return identity.procStart !== undefined ? undefined : identity.procStartFt;
  return identity.procStart;
}
//@ chunk-qg0af0yq.js:16137-16230 placement
function procIdentityFields(token) {
  return procStartFromBun()
    ? {
        procStart: undefined,
        procStartFt: token,
      }
    : {
        procStart: token,
        procStartFt: undefined,
      };
}
//@ chunk-qg0af0yq.js:16230-16251 placement
var PROC_START_LOCK_WAIT_MS = 60000;
var PROC_START_LOCK_TIMEOUT_MS = 5000;
//@ chunk-qg0af0yq.js:16251-16535 placement
async function getProcessStartTimeAsync(pid, options) {
  let now = Date.now();
  let cache = procStartTokenCache.of(getRootSession().host);
  if (options?.env !== undefined) return readProcessStartTime(pid, options.env);
  if (!options?.skipCache) {
    let cached = cache.get(pid);
    let maxAgeMs = cached?.miss ? PROC_START_LOCK_TIMEOUT_MS : PROC_START_LOCK_WAIT_MS;
    if (cached && now - cached.at < maxAgeMs) return cached.p;
  }
  let processStartTime = readProcessStartTime(pid);
  let entry = {
    at: now,
    p: processStartTime,
  };
  cache.set(pid, entry);
  let resolved = await processStartTime;
  if (resolved === undefined && cache.get(pid) === entry) {
    entry.miss = true;
    entry.at = Date.now();
  }
  return resolved;
}
//@ chunk-qg0af0yq.js:16535-16554 placement
var PROC_IDENTITY_RETRY_DELAY_MS = 250;
var PROC_IDENTITY_RETRY_TOTAL_MS = 2500;
//@ chunk-qg0af0yq.js:16554-16799 placement
async function captureProcessStartTimeAsync(pid) {
  let deadline = Date.now() + PROC_IDENTITY_RETRY_TOTAL_MS;
  let settled = false;
  let first = await withDeadline(
    getProcessStartTimeAsync(pid, {
      skipCache: true,
    }).finally(() => {
      settled = true;
    }),
    PROC_IDENTITY_RETRY_TOTAL_MS,
  );
  if (first !== undefined || !settled) return first;
  let retryDelayMs = PROC_IDENTITY_RETRY_DELAY_MS + Math.floor(Math.random() * PROC_IDENTITY_RETRY_DELAY_MS);
  let remainingMs = deadline - Date.now() - retryDelayMs;
  if (remainingMs <= 0) return;
  await sleep(retryDelayMs);
  return withDeadline(
    getProcessStartTimeAsync(pid, {
      skipCache: true,
    }),
    remainingMs,
  );
}
//@ chunk-qg0af0yq.js:16799-16902 placement
function getBinOnlyPath(env) {
  let parts = sanitizePathEnv(getEnvCaseInsensitive(env, "PATH") ?? "").split(delimiter);
  return parts.filter((pathEntry) => /^\/bin\/*$/.test(pathEntry)).join(delimiter);
}
//@ chunk-qg0af0yq.js:16902-17282 placement
/**
 * 读取进程启动时间：优先解析 /proc/<pid>/stat，否则用 ps -o lstart（可在指定环境中只从 /bin 查找 ps，UTC、C 语言环境、1 秒超时）。
 */
async function readProcessStartTime(pid, env) {
  let execOptions =
    env === undefined
      ? {}
      : {
          env,
          extendEnv: false,
        };
  try {
    {
      let content = await getFsImplementation().readFile(`/proc/${pid}/stat`, {
        encoding: "utf8",
      });
      return procStatField(content);
    }
    let psPath = env === undefined ? "ps" : whichOnPath("ps", getBinOnlyPath(env));
    if (psPath === null) return;
    let psResult = await execFileNoThrowWithCwd(psPath, ["-o", "lstart=", "-p", String(pid)], {
      timeout: 1000,
      ...execOptions,
      env: {
        ...(env ?? process.env),
        LC_ALL: "C",
        TZ: "UTC",
      },
    });
    return psResult.code === 0 && psResult.stdout ? psResult.stdout.trim() : undefined;
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
      let startTicks = Number(procStatField(content));
      let content_2 = await getFsImplementation().readFile("/proc/stat", {
        encoding: "utf8",
      });
      let bootTimeSeconds = Number(/^btime (\d+)/m.exec(content_2)?.[1]);
      if (!Number.isFinite(startTicks) || !Number.isFinite(bootTimeSeconds)) return null;
      return bootTimeSeconds * 1000 + (startTicks / 100) * 1000;
    }
    let psResult = await execFileNoThrowWithCwd("ps", ["-o", "lstart=", "-p", String(pid)], {
      timeout: 1000,
      env: {
        ...process.env,
        LC_ALL: "C",
        TZ: "UTC",
      },
    });
    if (psResult.code !== 0 || !psResult.stdout?.trim()) return null;
    let timestamp = Date.parse(`${psResult.stdout.trim()} UTC`);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:315408-315579 placement
/**
 * 读取一组 pid 在 Linux 上的进程启动令牌（无效 pid 跳过）。
 */
async function processStartTokens(pids) {
  let filtered = [...pids].filter((pid) => Number.isInteger(pid) && pid > 1);
  let tokens = new Map();
  if (filtered.length === 0) return tokens;
  for (let pid of filtered) {
    let processStartTokenLinux = getProcessStartTokenLinuxSync(pid);
    if (processStartTokenLinux !== undefined) tokens.set(pid, processStartTokenLinux);
  }
  return tokens;
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
