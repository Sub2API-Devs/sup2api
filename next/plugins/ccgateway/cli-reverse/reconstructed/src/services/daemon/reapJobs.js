/**
 * services/daemon/reapJobs.ts
 *
 * 2.1.316 新增：回收已结束后台任务
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8qv4gg14.js (15), chunk-98gzyqqk.js (9)
 * attribution: placement 24
 */
import { readdir, unlink, lstat } from "fs/promises";
import { join, basename } from "path";
import { connect } from "net";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { readJobStateOrAbsent, writeReapedTerminalState } from "./jobState.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import {
  getExecExitPath,
  daemonPtyPidsDir,
  daemonPtyDir,
  daemonPtyPidFile,
  daemonPtySocket,
  daemonSpareDir,
  ptyErrFile,
  ptyLateFile,
} from "./paths.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { truncateWithEllipsis, MAX_HEADLINE_LENGTH } from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { readRoster, updateRoster } from "./roster.js";
import { getPlatform } from "../../utils/platform.js";
import {
  reapDetachedRepl,
  sigtermThenKill,
  captureProcessStartTimeAsync,
} from "../../utils/processIdentity.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { logError } from "../../utils/log.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { encodeControlFrame } from "../../utils/framedSocket.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-98gzyqqk.js:263-305 placement
/**
 * RC 版本的通道后缀（dev、engine、aot）。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RC_CHANNEL_SUFFIXES;
deferInit("chunk-98gzyqqk.js:263", () => {
  semverModule = __toESM(require_semver_3(), 1);
  RC_CHANNEL_SUFFIXES = ["dev", "engine", "aot"];
});
//@ chunk-98gzyqqk.js:305-368 placement
/**
 * 取版本串里的 RC 通道后缀，没有返回 null。
 */
function rcChannelSuffix(version) {
  return RC_CHANNEL_SUFFIXES.find((suffix) => version.includes(`-${suffix}.`)) ?? null;
}
//@ chunk-98gzyqqk.js:368-405 placement
/**
 * 版本串是否带 RC 通道后缀。
 */
function isRcChannelVersion(version) {
  return rcChannelSuffix(version) !== null;
}
//@ chunk-98gzyqqk.js:405-493 placement
/**
 * 判断两个带通道的 RC 版本是否属于不同通道。
 */
function rcChannelDiffers(cliVersion, current) {
  if (!cliVersion) return false;
  let leftSuffix = rcChannelSuffix(cliVersion);
  let rightSuffix = rcChannelSuffix(current);
  return leftSuffix !== null && rightSuffix !== null && leftSuffix !== rightSuffix;
}
//@ chunk-98gzyqqk.js:493-569 placement
var regExp; // deferred: uses semverModule of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-98gzyqqk.js:493", () => {
  regExp = new RegExp(`-(?:${RC_CHANNEL_SUFFIXES.join("|")})\\.(\\d{8})\\.t(\\d{6})(?:\\.|$)`, "g");
});
//@ chunk-98gzyqqk.js:569-913 placement
/**
 * 从版本串中取出 YYYYMMDDtHHMMSS 形式的构建时间戳并校验为合法 UTC 时间，返回毫秒或 null。
 */
function parseRcVersionTimestamp(version) {
  let match;
  for (let candidate of version.matchAll(regExp)) match = candidate;
  let datePart = match?.[1];
  let timePart = match?.[2];
  if (!datePart || !timePart) return null;
  let ms = Date.UTC(
    Number(datePart.slice(0, 4)),
    Number(datePart.slice(4, 6)) - 1,
    Number(datePart.slice(6, 8)),
    Number(timePart.slice(0, 2)),
    Number(timePart.slice(2, 4)),
    Number(timePart.slice(4, 6)),
  );
  return new Date(ms).toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "t") ===
    `${datePart}t${timePart}`
    ? ms
    : null;
}
//@ chunk-98gzyqqk.js:913-984 placement
/**
 * 比较两个 RC 版本时间戳，前者是否更新。
 */
function isOlderRcVersion(target, target_2) {
  let rcVersionTimestamp = parseRcVersionTimestamp(target);
  let rcVersionTimestamp_2 = parseRcVersionTimestamp(target_2);
  return (
    rcVersionTimestamp !== null && rcVersionTimestamp_2 !== null && rcVersionTimestamp_2 < rcVersionTimestamp
  );
}
//@ chunk-98gzyqqk.js:984-1168 placement
/**
 * 比较两个版本：都带时间戳时同通道比时间；否则按 semver 比较（特殊版本返回 false）。
 */
function isNewerBuild(cliVersion, current) {
  let rcVersionTimestamp = parseRcVersionTimestamp(cliVersion);
  let rcVersionTimestamp_2 = parseRcVersionTimestamp(current);
  if (rcVersionTimestamp !== null && rcVersionTimestamp_2 !== null) {
    if (rcChannelSuffix(cliVersion) !== rcChannelSuffix(current)) return false;
    return rcVersionTimestamp > rcVersionTimestamp_2;
  }
  if (isRcChannelVersion(cliVersion) || isRcChannelVersion(current)) return false;
  return (
    semverModule.valid(cliVersion) !== null &&
    semverModule.valid(current) !== null &&
    semverModule.gt(cliVersion, current)
  );
}
//@ chunk-98gzyqqk.js:1168-1331 placement
/**
 * 版本是否不低于给定发布：带时间戳时比较提交时间，否则按 semver。
 */
function isAtLeastRelease(cliVersion, minRelease, minVersion) {
  if (!cliVersion) return false;
  if (cliVersion === minVersion) return true;
  let rcVersionTimestamp = parseRcVersionTimestamp(cliVersion);
  if (rcVersionTimestamp !== null) return rcVersionTimestamp >= minRelease.commitMs;
  if (isRcChannelVersion(cliVersion)) return false;
  return semverModule.valid(cliVersion) !== null && semverModule.gte(cliVersion, minRelease.release);
}
//@ chunk-8qv4gg14.js:748-843 placement
/**
 * 读作业状态并归类为 absent 或 unreadable（读失败也算 unreadable）。
 */
async function probeJobState(jobDir, storageV5) {
  return (await readJobStateOrAbsent(jobDir, storageV5).catch(() => null)) === "absent"
    ? "absent"
    : "unreadable";
}
//@ chunk-8qv4gg14.js:843-930 placement
/**
 * 记录“重启时没有保存的状态”埋点。
 */
function logRestartWithoutSavedState(trigger, reason) {
  logEvent("tengu_bg_restart_without_saved_state", {
    trigger: fromEnum(trigger),
    reason: fromEnum(reason),
  });
}
//@ chunk-8qv4gg14.js:930-1010 placement
/**
 * 匹配私有模式 CSI ? n h/l 的正则。
 */
var TRACKED_PRIVATE_MODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PRIVATE_MODE_RE;
deferInit("chunk-8qv4gg14.js:930", () => {
  TRACKED_PRIVATE_MODES = new Set([1000, 1002, 1003, 1004, 1006, 2004, 2031]);
  PRIVATE_MODE_RE = /\x1b\[\?([\d;]+)([hl])/g;
});
//@ chunk-8qv4gg14.js:1010-1476 placement
/**
 * 跟踪终端私有模式（CSI ? n h/l）的开关：feed 解析输出并处理被截断的转义序列，seed 预设，snapshot 返回当前已开模式。
 */
function createPrivateModeTracker() {
  let activeModes = new Set();
  let partial = "";
  return {
    feed(chunk, onModeChange) {
      let text = partial ? partial + chunk : chunk;
      let lastEnd = 0;
      let changed = false;
      for (let match of text.matchAll(PRIVATE_MODE_RE)) {
        let isSet = match[2] === "h";
        for (let codePart of match[1].split(";")) {
          let modeCode = Number(codePart);
          if (TRACKED_PRIVATE_MODES.has(modeCode) && activeModes.has(modeCode) !== isSet) {
            if (isSet) {
              activeModes.add(modeCode);
              onModeChange?.(modeCode);
            } else activeModes.delete(modeCode);
            changed = true;
          }
        }
        lastEnd = match.index + match[0].length;
      }
      let sliced = text.slice(Math.max(lastEnd, text.length - 16));
      let index = sliced.lastIndexOf("\x1B");
      partial = index >= 0 && /^\x1b(\[(\?[\d;]*)?)?$/.test(sliced.slice(index)) ? sliced.slice(index) : "";
      return changed;
    },
    seed(modes) {
      for (let modeCode of modes) if (TRACKED_PRIVATE_MODES.has(modeCode)) activeModes.add(modeCode);
    },
    snapshot() {
      return [...activeModes];
    },
  };
}
//@ chunk-8qv4gg14.js:1609-2257 placement
/**
 * 读取 exec 型后台作业的退出记录：退出码 0 为 done（带最后一行输出），SIGINT/SIGQUIT 为 stopped，其余为 crashed（带信号/退出码与输出）。
 */
async function readExecExitStatus(ptySock, dispatch) {
  if (dispatch.launch.mode !== "exec" || !ptySock) return null;
  try {
    let raw = await readSmallFileOrNull(getExecExitPath(ptySock), 8192);
    if (raw == null) return null;
    let parsed = JSON.parse(raw);
    if (typeof parsed?.code !== "number") return null;
    let lastLine =
      stripAnsiPerLine(typeof parsed.tail === "string" ? parsed.tail : "")
        .replace(
          /\r\n?/g,
          `
`,
        )
        .split(
          `
`,
        )
        .findLast((line) => line.trim())
        ?.trim() ?? "";
    let detail = truncateWithEllipsis(redactSecrets(lastLine), MAX_HEADLINE_LENGTH);
    if (parsed.code === 0)
      return {
        state: "done",
        detail: detail || "(no output)",
        code: 0,
      };
    let signal = typeof parsed.signal === "string" ? parsed.signal : undefined;
    if (signal === "SIGINT" || signal === "SIGQUIT")
      return {
        state: "stopped",
        detail: "stopped",
        code: parsed.code,
      };
    let exitLabel = signal ? `${signal} (${parsed.code})` : `exit ${parsed.code}`;
    return {
      state: "crashed",
      detail: detail ? `${exitLabel} \u2014 ${detail}` : exitLabel,
      signal,
      code: parsed.code,
    };
  } catch {
    return null;
  }
}
//@ chunk-8qv4gg14.js:2257-4383 placement
/**
 * 回收所有后台会话进程：汇总名册中的 worker、socket/pid 文件与孤立的 spare pty，逐个发送 kill 或终止进程组（无法确认身份的保留），写入终止状态并清理文件与存储，最后更新名册。返回回收与保留数。
 */
async function reapAllBackgroundJobs(options = {}, storageV5) {
  return withFeatureTelemetry("daemon_bg_reap_all", async () => {
    let roster = await readRoster(
      {
        silent: true,
      },
      storageV5,
    );
    let targets = new Map();
    for (let [key, value] of Object.entries(roster.workers))
      targets.set(key, {
        pid: value.pid,
        procStart: value.procStart,
        ptySock: value.ptySock,
        dispatch: value.dispatch,
        replPid: value.replPid,
        replProcStart: value.replProcStart,
      });
    let isWindows = getPlatform() === "windows";
    let [dir, suffix] = isWindows ? [daemonPtyPidsDir(), ".pid"] : [daemonPtyDir(), ".sock"];
    let entries =
      isWindows && storageV5 ? await listStoredPtyPids(storageV5) : await readdir(dir).catch(() => []);
    let primaryFiles = new Set(entries.filter((entry) => entry.endsWith(suffix)));
    for (let entry of entries) {
      if (!entry.endsWith(suffix)) {
        if (!isWindows) {
          let found = [".err", ".late", ".exec-exit", ".err.read"].find((sidecarSuffix) =>
            entry.endsWith(`.sock${sidecarSuffix}`),
          );
          if (found && !primaryFiles.has(entry.slice(0, -found.length))) {
            let sliced = entry.slice(0, -`.sock${found}`.length);
            if (!(found === ".exec-exit" && targets.has(sliced)))
              await unlink(join(dir, entry)).catch(() => {});
          }
        }
        continue;
      }
      let shortId = entry.slice(0, -suffix.length);
      if (targets.has(shortId)) continue;
      let pid = isWindows
        ? Number(
            (storageV5
              ? await readStoredPtyPid(storageV5, shortId)
              : await readSmallFileOrNull(daemonPtyPidFile(shortId), MAX_PID_FILE_BYTES)) ?? "0",
          )
        : 0;
      targets.set(shortId, {
        pid,
        ptySock: daemonPtySocket(shortId),
      });
    }
    if (!isWindows) {
      let knownSockets = new Set();
      for (let target of targets.values()) if (target.ptySock) knownSockets.add(target.ptySock);
      let spareEntries = await readdir(daemonSpareDir()).catch(() => []);
      for (let entry of spareEntries) {
        if (!entry.endsWith(".pty.sock")) continue;
        let sockPath = join(daemonSpareDir(), entry);
        if (knownSockets.has(sockPath)) continue;
        targets.set(`spare:${entry}`, {
          pid: 0,
          ptySock: sockPath,
        });
      }
    }
    let reapedCount = 0;
    let kept = new Set();
    let keepAlive = setInterval(() => {}, 60000);
    await Promise.all(
      Array.from(targets.entries()).map(async ([key, target]) => {
        let execExit = target.dispatch ? await readExecExitStatus(target.ptySock, target.dispatch) : null;
        if (target.ptySock && (await killViaPtySocket(target.ptySock, storageV5))) reapedCount++;
        else if (target.pid) {
          let killResult = await killVerifiedProcess(target.pid, target.procStart);
          let replReaped =
            killResult !== "unverified" && (await reapDetachedRepl(target.replPid, target.replProcStart));
          switch (killResult) {
            case "killed":
              reapedCount++;
              break;
            case "unverified":
              kept.add(key);
              return;
            case "gone":
            case "foreign":
              if (replReaped) reapedCount++;
              break;
            default:
          }
        }
        if (!key.startsWith("spare:")) {
          let stoppedState = {
            state: "stopped",
            detail: "stopped",
          };
          let finalState =
            execExit?.state === "done"
              ? execExit
              : options.supervisorKilledAll
                ? stoppedState
                : (execExit ?? stoppedState);
          await writeReapedTerminalState(key, finalState.state, finalState.detail, undefined, storageV5);
          if (isWindows && storageV5)
            await storageV5
              .delete(
                STORAGE_SPACES.daemon([
                  "pty-pids",
                  basename(getExecExitPath(target.ptySock ?? daemonPtySocket(key))),
                ]),
              )
              .catch(() => {});
          else await unlink(getExecExitPath(target.ptySock ?? daemonPtySocket(key))).catch(() => {});
        }
        if (isWindows)
          if (storageV5) await deleteStoredPtyPid(storageV5, key);
          else {
            await unlink(daemonPtyPidFile(key)).catch(() => {});
            let errPath = ptyErrFile(daemonPtySocket(key));
            await unlink(errPath).catch(() => {});
            await unlink(`${errPath}.read`).catch(() => {});
            await unlink(ptyLateFile(daemonPtySocket(key))).catch(() => {});
          }
      }),
    ).finally(() => clearInterval(keepAlive));
    if (targets.size > 0)
      await updateRoster((workers) => {
        for (let key of targets.keys()) if (!kept.has(key)) delete workers.workers[key];
      }, storageV5).catch(logError);
    return {
      reaped: reapedCount,
      kept: kept.size,
    };
  });
}
//@ chunk-8qv4gg14.js:4383-4785 placement
/**
 * 分页列出存储中 daemon/pty-pids 下记录的 PTY 进程标识。
 */
async function listStoredPtyPids(storage) {
  let pids = [];
  let cursor;
  do {
    let page = await storage
      .listEntries(
        {
          namespace: "daemon",
          relPath: ["pty-pids"],
        },
        {
          cursor,
          skipKeyStats: true,
          skipScopeStats: true,
        },
      )
      .catch(() => {
        return;
      });
    if (page === undefined || !page.ok) return [];
    for (let item of page.value.items)
      if (item.kind === "key" && item.key.namespace === "daemon") {
        let last = item.key.relPath.at(-1);
        if (last !== undefined && item.key.relPath.length === 2 && isValidKeySegment(last)) pids.push(last);
      }
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return pids;
}
//@ chunk-8qv4gg14.js:4785-4798 placement
/**
 * 读取 pty pid 文件的大小上限（4096 字节）。
 */
var MAX_PID_FILE_BYTES = 4096;
//@ chunk-8qv4gg14.js:4798-4896 placement
/**
 * 判断 pty pid 文件是否不可用（不是普通文件、超限、读失败）。
 */
async function isPidFileUnusable(shortId) {
  try {
    let stats = await lstat(daemonPtyPidFile(shortId));
    return !stats.isFile() || stats.size > MAX_PID_FILE_BYTES;
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-8qv4gg14.js:4896-5168 placement
/**
 * 读取存储中某个 PTY 的 pid 记录；进程已结束、读取失败或超出大小时返回 null。
 */
async function readStoredPtyPid(storage, shortId) {
  if (await isPidFileUnusable(shortId)) return null;
  let readResult = await storage
    .readText([
      {
        key: STORAGE_SPACES.daemon(["pty-pids", `${shortId}.pid`]),
        offset: 0,
        length: MAX_PID_FILE_BYTES + 1,
      },
    ])
    .catch(() => {
      return;
    });
  if (readResult === undefined || !readResult.ok) return null;
  let paramShortId = readResult.value.items[0];
  if (!paramShortId.found || paramShortId.totalBytes > MAX_PID_FILE_BYTES) return null;
  return paramShortId.value;
}
//@ chunk-8qv4gg14.js:5168-5272 placement
async function deleteStoredPtyPid(storage, shortId) {
  await storage.delete(STORAGE_SPACES.daemon(["pty-pids", `${shortId}.pid`])).catch(() => {});
  await deleteStoredPtySidecars(storage, daemonPtySocket(shortId));
}
//@ chunk-8qv4gg14.js:5272-5405 placement
async function deleteStoredPtySidecars(storage, socketPath) {
  let errFile = ptyErrFile(socketPath);
  for (let name of [basename(errFile), `${basename(errFile)}.read`, basename(ptyLateFile(socketPath))])
    await storage.delete(STORAGE_SPACES.daemon(["pty-pids", name])).catch(() => {});
}
//@ chunk-8qv4gg14.js:5405-5825 placement
/**
 * 连接 pty socket 发送 SIGTERM 指令，连接关闭视为成功；连接失败时清理 socket 及附带文件；2 秒超时返回 false。
 */
function killViaPtySocket(socketPath, storageV5) {
  return new Promise((resolve) => {
    let done = false;
    let finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    let sock = connect(socketPath);
    sock.unref();
    sock.setTimeout(2000, () => {
      sock.destroy();
      finish(false);
    });
    sock.on("error", () => {
      unlink(socketPath).catch(() => {});
      let errPath = ptyErrFile(socketPath);
      if (storageV5 && getPlatform() === "windows")
        deleteStoredPtySidecars(storageV5, socketPath).catch(() => {});
      else {
        unlink(errPath).catch(() => {});
        unlink(`${errPath}.read`).catch(() => {});
        unlink(ptyLateFile(socketPath)).catch(() => {});
      }
      finish(false);
    });
    sock.once("connect", () => {
      sock.resume();
      sock.write(
        encodeControlFrame({
          t: "kill",
          sig: "SIGTERM",
        }),
      );
    });
    sock.once("close", () => finish(true));
  });
}
//@ chunk-8qv4gg14.js:5825-6043 placement
/**
 * 连接 pty socket 发送 pong，250 毫秒内连上返回 true。
 */
function pingPtySocket(socketPath) {
  return new Promise((resolve) => {
    let done = false;
    let finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    let sock = connect(socketPath);
    sock.unref();
    sock.setTimeout(250, () => {
      sock.destroy();
      finish(false);
    });
    sock.on("error", () => finish(false));
    sock.once("connect", () => {
      sock.end(
        encodeControlFrame({
          t: "pong",
        }),
      );
      finish(true);
    });
  });
}
//@ chunk-8qv4gg14.js:6043-6313 placement
/**
 * 结束进程前校验身份：进程不存在为 gone/killed；有启动时间时比对，不符为 foreign、无法读取为 unverified，一致则 SIGTERM 后 SIGKILL。
 */
async function killVerifiedProcess(pid, procStart) {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (getErrnoCode(error) !== "ESRCH") return "foreign";
    return sigtermThenKill([-pid, pid], procStart) ? "killed" : "gone";
  }
  if (procStart === undefined) return "foreign";
  let actualStart = await captureProcessStartTimeAsync(pid);
  if (actualStart === undefined) return "unverified";
  if (actualStart !== procStart) return "foreign";
  return sigtermThenKill([-pid, pid], procStart) ? "killed" : "gone";
}
export {
  isNewerBuild,
  killViaPtySocket,
  createPrivateModeTracker,
  pingPtySocket,
  rcChannelDiffers,
  readExecExitStatus,
  listStoredPtyPids,
  readStoredPtyPid,
  MAX_PID_FILE_BYTES,
  isOlderRcVersion,
  killVerifiedProcess,
  reapAllBackgroundJobs,
  probeJobState,
  logRestartWithoutSavedState,
  isAtLeastRelease,
  parseRcVersionTimestamp,
  rcChannelSuffix,
  isRcChannelVersion,
};
