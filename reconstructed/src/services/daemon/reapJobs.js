/**
 * services/daemon/reapJobs.ts
 *
 * 2.1.316 新增：回收已结束后台任务
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dxgf3w3p.js (24)
 * attribution: placement 24
 */
import { readdir, unlink, lstat } from "fs/promises";
import { join, basename } from "path";
import { connect } from "net";
import { readJobStateOrAbsent, writeReapedTerminalState } from "./jobState.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { getExecExitPath } from "./paths.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { truncateWithEllipsis, MAX_HEADLINE_LENGTH } from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { readRoster, updateRoster } from "./roster.js";
import { getPlatform } from "../../utils/platform.js";
import {
  daemonPtyPidsDir,
  daemonPtyDir,
  daemonPtyPidFile,
  daemonPtySocket,
  daemonSpareDir,
  ptyErrFile,
  ptyLateFile,
} from "../../utils/sandbox/userNamespace.js";
import {
  reapDetachedRepl,
  sigtermThenKill,
  captureProcessStartTimeAsync,
} from "../../utils/processIdentity.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { logError } from "../../utils/log.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { encodeControlFrame } from "../../utils/framedSocket.js";

//@ chunk-dxgf3w3p.js:820-915 placement
/**
 * 读作业状态并归类为 absent 或 unreadable（读失败也算 unreadable）。
 */
async function probeJobState(jobDir, e) {
  return (await readJobStateOrAbsent(jobDir, e).catch(() => null)) === "absent" ? "absent" : "unreadable";
}
//@ chunk-dxgf3w3p.js:915-1002 placement
/**
 * 记录“重启时没有保存的状态”埋点。
 */
function logRestartWithoutSavedState(t, e) {
  logEvent("tengu_bg_restart_without_saved_state", {
    trigger: fromEnum(t),
    reason: fromEnum(e),
  });
}
//@ chunk-dxgf3w3p.js:1002-1044 placement
/**
 * RC 版本的通道后缀（dev、engine、aot）。
 */
var semverModule = Re(require_semver_3(), 1);
var RC_CHANNEL_SUFFIXES = ["dev", "engine", "aot"];
//@ chunk-dxgf3w3p.js:1044-1107 placement
/**
 * 取版本串里的 RC 通道后缀，没有返回 null。
 */
function rcChannelSuffix(t) {
  return RC_CHANNEL_SUFFIXES.find((e) => t.includes(`-${e}.`)) ?? null;
}
//@ chunk-dxgf3w3p.js:1107-1144 placement
/**
 * 版本串是否带 RC 通道后缀。
 */
function isRcChannelVersion(t) {
  return rcChannelSuffix(t) !== null;
}
//@ chunk-dxgf3w3p.js:1144-1232 placement
/**
 * 判断两个带通道的 RC 版本是否属于不同通道。
 */
function rcChannelDiffers(cliVersion, e) {
  if (!cliVersion) return false;
  let r = rcChannelSuffix(cliVersion);
  let n = rcChannelSuffix(e);
  return r !== null && n !== null && r !== n;
}
//@ chunk-dxgf3w3p.js:1232-1308 placement
var regExp = new RegExp(`-(?:${RC_CHANNEL_SUFFIXES.join("|")})\\.(\\d{8})\\.t(\\d{6})(?:\\.|$)`, "g");
//@ chunk-dxgf3w3p.js:1308-1652 placement
/**
 * 从版本串中取出 YYYYMMDDtHHMMSS 形式的构建时间戳并校验为合法 UTC 时间，返回毫秒或 null。
 */
function parseRcVersionTimestamp(t) {
  let e;
  for (let m of t.matchAll(regExp)) e = m;
  let r = e?.[1];
  let n = e?.[2];
  if (!r || !n) return null;
  let o = Date.UTC(
    Number(r.slice(0, 4)),
    Number(r.slice(4, 6)) - 1,
    Number(r.slice(6, 8)),
    Number(n.slice(0, 2)),
    Number(n.slice(2, 4)),
    Number(n.slice(4, 6)),
  );
  return new Date(o).toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "t") === `${r}t${n}`
    ? o
    : null;
}
//@ chunk-dxgf3w3p.js:1652-1723 placement
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
//@ chunk-dxgf3w3p.js:1723-1907 placement
/**
 * 比较两个版本：都带时间戳时同通道比时间；否则按 semver 比较（特殊版本返回 false）。
 */
function isNewerBuild(cliVersion, e) {
  let rcVersionTimestamp = parseRcVersionTimestamp(cliVersion);
  let rcVersionTimestamp_2 = parseRcVersionTimestamp(e);
  if (rcVersionTimestamp !== null && rcVersionTimestamp_2 !== null) {
    if (rcChannelSuffix(cliVersion) !== rcChannelSuffix(e)) return false;
    return rcVersionTimestamp > rcVersionTimestamp_2;
  }
  if (isRcChannelVersion(cliVersion) || isRcChannelVersion(e)) return false;
  return (
    semverModule.valid(cliVersion) !== null &&
    semverModule.valid(e) !== null &&
    semverModule.gt(cliVersion, e)
  );
}
//@ chunk-dxgf3w3p.js:1907-2070 placement
/**
 * 版本是否不低于给定发布：带时间戳时比较提交时间，否则按 semver。
 */
function isAtLeastRelease(cliVersion, e, r) {
  if (!cliVersion) return false;
  if (cliVersion === r) return true;
  let rcVersionTimestamp = parseRcVersionTimestamp(cliVersion);
  if (rcVersionTimestamp !== null) return rcVersionTimestamp >= e.commitMs;
  if (isRcChannelVersion(cliVersion)) return false;
  return semverModule.valid(cliVersion) !== null && semverModule.gte(cliVersion, e.release);
}
//@ chunk-dxgf3w3p.js:2070-2150 placement
/**
 * 匹配私有模式 CSI ? n h/l 的正则。
 */
var TRACKED_PRIVATE_MODES = new Set([1000, 1002, 1003, 1004, 1006, 2004, 2031]);
var PRIVATE_MODE_RE = /\x1b\[\?([\d;]+)([hl])/g;
//@ chunk-dxgf3w3p.js:2150-2616 placement
/**
 * 跟踪终端私有模式（CSI ? n h/l）的开关：feed 解析输出并处理被截断的转义序列，seed 预设，snapshot 返回当前已开模式。
 */
function createPrivateModeTracker() {
  let t = new Set();
  let e = "";
  return {
    feed(r, n) {
      let o = e ? e + r : r;
      let d = 0;
      let u = false;
      for (let h of o.matchAll(PRIVATE_MODE_RE)) {
        let b = h[2] === "h";
        for (let x of h[1].split(";")) {
          let i = Number(x);
          if (TRACKED_PRIVATE_MODES.has(i) && t.has(i) !== b) {
            if (b) {
              t.add(i);
              n?.(i);
            } else t.delete(i);
            u = true;
          }
        }
        d = h.index + h[0].length;
      }
      let sliced = o.slice(Math.max(d, o.length - 16));
      let index = sliced.lastIndexOf("\x1B");
      e = index >= 0 && /^\x1b(\[(\?[\d;]*)?)?$/.test(sliced.slice(index)) ? sliced.slice(index) : "";
      return u;
    },
    seed(r) {
      for (let n of r) if (TRACKED_PRIVATE_MODES.has(n)) t.add(n);
    },
    snapshot() {
      return [...t];
    },
  };
}
//@ chunk-dxgf3w3p.js:2749-3397 placement
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
//@ chunk-dxgf3w3p.js:3397-5523 placement
/**
 * 回收所有后台会话进程：汇总名册中的 worker、socket/pid 文件与孤立的 spare pty，逐个发送 kill 或终止进程组（无法确认身份的保留），写入终止状态并清理文件与存储，最后更新名册。返回回收与保留数。
 */
async function reapAllBackgroundJobs(t = {}, e) {
  return withFeatureTelemetry("daemon_bg_reap_all", async () => {
    let roster = await readRoster(
      {
        silent: true,
      },
      e,
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
    let [d, u] = isWindows ? [daemonPtyPidsDir(), ".pid"] : [daemonPtyDir(), ".sock"];
    let entries = isWindows && e ? await listStoredPtyPids(e) : await readdir(d).catch(() => []);
    let primaryFiles = new Set(entries.filter((entry) => entry.endsWith(u)));
    for (let entry of entries) {
      if (!entry.endsWith(u)) {
        if (!isWindows) {
          let found = [".err", ".late", ".exec-exit", ".err.read"].find((y) => entry.endsWith(`.sock${y}`));
          if (found && !primaryFiles.has(entry.slice(0, -found.length))) {
            let sliced = entry.slice(0, -`.sock${found}`.length);
            if (!(found === ".exec-exit" && targets.has(sliced)))
              await unlink(join(d, entry)).catch(() => {});
          }
        }
        continue;
      }
      let sliced = entry.slice(0, -u.length);
      if (targets.has(sliced)) continue;
      let pid = isWindows
        ? Number(
            (e
              ? await readStoredPtyPid(e, sliced)
              : await readSmallFileOrNull(daemonPtyPidFile(sliced), MAX_PID_FILE_BYTES)) ?? "0",
          )
        : 0;
      targets.set(sliced, {
        pid,
        ptySock: daemonPtySocket(sliced),
      });
    }
    if (!isWindows) {
      let i = new Set();
      for (let f of targets.values()) if (f.ptySock) i.add(f.ptySock);
      let s = await readdir(daemonSpareDir()).catch(() => []);
      for (let f of s) {
        if (!f.endsWith(".pty.sock")) continue;
        let p = join(daemonSpareDir(), f);
        if (i.has(p)) continue;
        targets.set(`spare:${f}`, {
          pid: 0,
          ptySock: p,
        });
      }
    }
    let reapedCount = 0;
    let kept = new Set();
    let keepAlive = setInterval(() => {}, 60000);
    await Promise.all(
      Array.from(targets.entries()).map(async ([i, s]) => {
        let f = s.dispatch ? await readExecExitStatus(s.ptySock, s.dispatch) : null;
        if (s.ptySock && (await killViaPtySocket(s.ptySock, e))) reapedCount++;
        else if (s.pid) {
          let p = await killVerifiedProcess(s.pid, s.procStart);
          let y = p !== "unverified" && (await reapDetachedRepl(s.replPid, s.replProcStart));
          switch (p) {
            case "killed":
              reapedCount++;
              break;
            case "unverified":
              kept.add(i);
              return;
            case "gone":
            case "foreign":
              if (y) reapedCount++;
              break;
            default:
          }
        }
        if (!i.startsWith("spare:")) {
          let p = {
            state: "stopped",
            detail: "stopped",
          };
          let y = f?.state === "done" ? f : t.supervisorKilledAll ? p : (f ?? p);
          await writeReapedTerminalState(i, y.state, y.detail, undefined, e);
          if (isWindows && e)
            await e
              .delete(
                STORAGE_SPACES.daemon([
                  "pty-pids",
                  basename(getExecExitPath(s.ptySock ?? daemonPtySocket(i))),
                ]),
              )
              .catch(() => {});
          else await unlink(getExecExitPath(s.ptySock ?? daemonPtySocket(i))).catch(() => {});
        }
        if (isWindows)
          if (e) await deleteStoredPtyPid(e, i);
          else {
            await unlink(daemonPtyPidFile(i)).catch(() => {});
            let p = ptyErrFile(daemonPtySocket(i));
            await unlink(p).catch(() => {});
            await unlink(`${p}.read`).catch(() => {});
            await unlink(ptyLateFile(daemonPtySocket(i))).catch(() => {});
          }
      }),
    ).finally(() => clearInterval(keepAlive));
    if (targets.size > 0)
      await updateRoster((i) => {
        for (let key of targets.keys()) if (!kept.has(key)) delete i.workers[key];
      }, e).catch(logError);
    return {
      reaped: reapedCount,
      kept: kept.size,
    };
  });
}
//@ chunk-dxgf3w3p.js:5523-5925 placement
/**
 * 分页列出存储中 daemon/pty-pids 下记录的 PTY 进程标识。
 */
async function listStoredPtyPids(t) {
  let e = [];
  let r;
  do {
    let n = await t
      .listEntries(
        {
          namespace: "daemon",
          relPath: ["pty-pids"],
        },
        {
          cursor: r,
          skipKeyStats: true,
          skipScopeStats: true,
        },
      )
      .catch(() => {
        return;
      });
    if (n === undefined || !n.ok) return [];
    for (let item of n.value.items)
      if (item.kind === "key" && item.key.namespace === "daemon") {
        let last = item.key.relPath.at(-1);
        if (last !== undefined && item.key.relPath.length === 2 && isValidKeySegment(last)) e.push(last);
      }
    r = n.value.cursor;
  } while (r !== undefined);
  return e;
}
//@ chunk-dxgf3w3p.js:5925-5938 placement
/**
 * 读取 pty pid 文件的大小上限（4096 字节）。
 */
var MAX_PID_FILE_BYTES = 4096;
//@ chunk-dxgf3w3p.js:5938-6036 placement
/**
 * 判断 pty pid 文件是否不可用（不是普通文件、超限、读失败）。
 */
async function isPidFileUnusable(t) {
  try {
    let e = await lstat(daemonPtyPidFile(t));
    return !e.isFile() || e.size > MAX_PID_FILE_BYTES;
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-dxgf3w3p.js:6036-6308 placement
/**
 * 读取存储中某个 PTY 的 pid 记录；进程已结束、读取失败或超出大小时返回 null。
 */
async function readStoredPtyPid(t, e) {
  if (await isPidFileUnusable(e)) return null;
  let r = await t
    .readText([
      {
        key: STORAGE_SPACES.daemon(["pty-pids", `${e}.pid`]),
        offset: 0,
        length: MAX_PID_FILE_BYTES + 1,
      },
    ])
    .catch(() => {
      return;
    });
  if (r === undefined || !r.ok) return null;
  let n = r.value.items[0];
  if (!n.found || n.totalBytes > MAX_PID_FILE_BYTES) return null;
  return n.value;
}
//@ chunk-dxgf3w3p.js:6308-6412 placement
async function deleteStoredPtyPid(t, e) {
  await t.delete(STORAGE_SPACES.daemon(["pty-pids", `${e}.pid`])).catch(() => {});
  await deleteStoredPtySidecars(t, daemonPtySocket(e));
}
//@ chunk-dxgf3w3p.js:6412-6545 placement
async function deleteStoredPtySidecars(t, e) {
  let r = ptyErrFile(e);
  for (let n of [basename(r), `${basename(r)}.read`, basename(ptyLateFile(e))])
    await t.delete(STORAGE_SPACES.daemon(["pty-pids", n])).catch(() => {});
}
//@ chunk-dxgf3w3p.js:6545-6965 placement
/**
 * 连接 pty socket 发送 SIGTERM 指令，连接关闭视为成功；连接失败时清理 socket 及附带文件；2 秒超时返回 false。
 */
function killViaPtySocket(t, storageV5) {
  return new Promise((resolve) => {
    let n = false;
    let o = (u) => {
      if (n) return;
      n = true;
      resolve(u);
    };
    let d = connect(t);
    d.unref();
    d.setTimeout(2000, () => {
      d.destroy();
      o(false);
    });
    d.on("error", () => {
      unlink(t).catch(() => {});
      let u = ptyErrFile(t);
      if (storageV5 && getPlatform() === "windows") deleteStoredPtySidecars(storageV5, t).catch(() => {});
      else {
        unlink(u).catch(() => {});
        unlink(`${u}.read`).catch(() => {});
        unlink(ptyLateFile(t)).catch(() => {});
      }
      o(false);
    });
    d.once("connect", () => {
      d.resume();
      d.write(
        encodeControlFrame({
          t: "kill",
          sig: "SIGTERM",
        }),
      );
    });
    d.once("close", () => o(true));
  });
}
//@ chunk-dxgf3w3p.js:6965-7183 placement
/**
 * 连接 pty socket 发送 pong，250 毫秒内连上返回 true。
 */
function pingPtySocket(t) {
  return new Promise((resolve) => {
    let r = false;
    let n = (d) => {
      if (r) return;
      r = true;
      resolve(d);
    };
    let o = connect(t);
    o.unref();
    o.setTimeout(250, () => {
      o.destroy();
      n(false);
    });
    o.on("error", () => n(false));
    o.once("connect", () => {
      o.end(
        encodeControlFrame({
          t: "pong",
        }),
      );
      n(true);
    });
  });
}
//@ chunk-dxgf3w3p.js:7183-7453 placement
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
  let r = await captureProcessStartTimeAsync(pid);
  if (r === undefined) return "unverified";
  if (r !== procStart) return "foreign";
  return sigtermThenKill([-pid, pid], procStart) ? "killed" : "gone";
}
export {
  createPrivateModeTracker,
  isAtLeastRelease,
  isNewerBuild,
  rcChannelDiffers,
  pingPtySocket,
  killViaPtySocket,
  probeJobState,
  logRestartWithoutSavedState,
  parseRcVersionTimestamp,
  rcChannelSuffix,
  isRcChannelVersion,
  readExecExitStatus,
  listStoredPtyPids,
  readStoredPtyPid,
  MAX_PID_FILE_BYTES,
  isOlderRcVersion,
  killVerifiedProcess,
  reapAllBackgroundJobs,
};
