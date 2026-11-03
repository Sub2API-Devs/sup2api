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
import { Vy } from "../../../vendor/semver/index.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { getExecExitPath } from "./paths.js";
import { qa } from "../../utils/stripAnsi.js";
import { truncateWithEllipsis, Hg } from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { readRoster, updateRoster } from "./roster.js";
import { getPlatform } from "../../utils/platform.js";
import { Xot, UTt, owe, FA, Fpe, JC, xN } from "../../utils/sandbox/userNamespace.js";
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
async function qXe(t, e) {
  return (await readJobStateOrAbsent(t, e).catch(() => null)) === "absent" ? "absent" : "unreadable";
}
//@ chunk-dxgf3w3p.js:915-1002 placement
function YXe(t, e) {
  logEvent("tengu_bg_restart_without_saved_state", { trigger: fromEnum(t), reason: fromEnum(e) });
}
//@ chunk-dxgf3w3p.js:1002-1044 placement
var S = Re(Vy(), 1),
  v = ["dev", "engine", "aot"];
//@ chunk-dxgf3w3p.js:1044-1107 placement
function amt(t) {
  return v.find((e) => t.includes(`-${e}.`)) ?? null;
}
//@ chunk-dxgf3w3p.js:1107-1144 placement
function Atn(t) {
  return amt(t) !== null;
}
//@ chunk-dxgf3w3p.js:1144-1232 placement
function lmt(t, e) {
  if (!t) return !1;
  let r = amt(t),
    n = amt(e);
  return r !== null && n !== null && r !== n;
}
//@ chunk-dxgf3w3p.js:1232-1308 placement
var regExp = new RegExp(`-(?:${v.join("|")})\\.(\\d{8})\\.t(\\d{6})(?:\\.|$)`, "g");
/**
 * 从版本串中取出 YYYYMMDDtHHMMSS 形式的构建时间戳并校验为合法 UTC 时间，返回毫秒或 null。
 */
//@ chunk-dxgf3w3p.js:1308-1652 placement
function parseRcVersionTimestamp(t) {
  let e;
  for (let m of t.matchAll(regExp)) e = m;
  let r = e?.[1],
    n = e?.[2];
  if (!r || !n) return null;
  let UTC = Date.UTC(
    Number(r.slice(0, 4)),
    Number(r.slice(4, 6)) - 1,
    Number(r.slice(6, 8)),
    Number(n.slice(0, 2)),
    Number(n.slice(2, 4)),
    Number(n.slice(4, 6)),
  );
  return new Date(UTC).toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "t") === `${r}t${n}`
    ? UTC
    : null;
}
//@ chunk-dxgf3w3p.js:1652-1723 placement
function Axs(t, e) {
  let r = parseRcVersionTimestamp(t),
    n = parseRcVersionTimestamp(e);
  return r !== null && n !== null && n < r;
}
/**
 * 比较两个版本：都带时间戳时同通道比时间；否则按 semver 比较（特殊版本返回 false）。
 */
//@ chunk-dxgf3w3p.js:1723-1907 placement
function isNewerBuild(t, e) {
  let r = parseRcVersionTimestamp(t),
    n = parseRcVersionTimestamp(e);
  if (r !== null && n !== null) {
    if (amt(t) !== amt(e)) return !1;
    return r > n;
  }
  if (Atn(t) || Atn(e)) return !1;
  return S.valid(t) !== null && S.valid(e) !== null && S.gt(t, e);
}
/**
 * 版本是否不低于给定发布：带时间戳时比较提交时间，否则按 semver。
 */
//@ chunk-dxgf3w3p.js:1907-2070 placement
function isAtLeastRelease(t, e, r) {
  if (!t) return !1;
  if (t === r) return !0;
  let n = parseRcVersionTimestamp(t);
  if (n !== null) return n >= e.commitMs;
  if (Atn(t)) return !1;
  return S.valid(t) !== null && S.gte(t, e.release);
}
//@ chunk-dxgf3w3p.js:2070-2150 placement
var E = new Set([1000, 1002, 1003, 1004, 1006, 2004, 2031]),
  R = /\x1b\[\?([\d;]+)([hl])/g;
/**
 * 跟踪终端私有模式（CSI ? n h/l）的开关：feed 解析输出并处理被截断的转义序列，seed 预设，snapshot 返回当前已开模式。
 */
//@ chunk-dxgf3w3p.js:2150-2616 placement
function createPrivateModeTracker() {
  let t = new Set(),
    e = "";
  return {
    feed(r, n) {
      let o = e ? e + r : r,
        d = 0,
        u = !1;
      for (let h of o.matchAll(R)) {
        let b = h[2] === "h";
        for (let x of h[1].split(";")) {
          let i = Number(x);
          if (E.has(i) && t.has(i) !== b) {
            if (b) (t.add(i), n?.(i));
            else t.delete(i);
            u = !0;
          }
        }
        d = h.index + h[0].length;
      }
      let sliced = o.slice(Math.max(d, o.length - 16)),
        index = sliced.lastIndexOf("\x1B");
      return (
        (e = index >= 0 && /^\x1b(\[(\?[\d;]*)?)?$/.test(sliced.slice(index)) ? sliced.slice(index) : ""),
        u
      );
    },
    seed(r) {
      for (let n of r) if (E.has(n)) t.add(n);
    },
    snapshot() {
      return [...t];
    },
  };
}
/**
 * 读取 exec 型后台作业的退出记录：退出码 0 为 done（带最后一行输出），SIGINT/SIGQUIT 为 stopped，其余为 crashed（带信号/退出码与输出）。
 */
//@ chunk-dxgf3w3p.js:2749-3397 placement
async function readExecExitStatus(t, e) {
  if (e.launch.mode !== "exec" || !t) return null;
  try {
    let raw = await readSmallFileOrNull(getExecExitPath(t), 8192);
    if (raw == null) return null;
    let parsed = JSON.parse(raw);
    if (typeof parsed?.code !== "number") return null;
    let lastLine =
        qa(typeof parsed.tail === "string" ? parsed.tail : "")
          .replace(
            /\r\n?/g,
            `
`,
          )
          .split(
            `
`,
          )
          .findLast((w) => w.trim())
          ?.trim() ?? "",
      detail = truncateWithEllipsis(redactSecrets(lastLine), Hg);
    if (parsed.code === 0) return { state: "done", detail: detail || "(no output)", code: 0 };
    let signal = typeof parsed.signal === "string" ? parsed.signal : void 0;
    if (signal === "SIGINT" || signal === "SIGQUIT")
      return { state: "stopped", detail: "stopped", code: parsed.code };
    let exitLabel = signal ? `${signal} (${parsed.code})` : `exit ${parsed.code}`;
    return {
      state: "crashed",
      detail: detail ? `${exitLabel} \u2014 ${detail}` : exitLabel,
      signal: signal,
      code: parsed.code,
    };
  } catch {
    return null;
  }
}
/**
 * 回收所有后台会话进程：汇总名册中的 worker、socket/pid 文件与孤立的 spare pty，逐个发送 kill 或终止进程组（无法确认身份的保留），写入终止状态并清理文件与存储，最后更新名册。返回回收与保留数。
 */
//@ chunk-dxgf3w3p.js:3397-5523 placement
async function reapAllBackgroundJobs(t = {}, e) {
  return withFeatureTelemetry("daemon_bg_reap_all", async () => {
    let roster = await readRoster({ silent: !0 }, e),
      targets = new Map();
    for (let [i, s] of Object.entries(roster.workers))
      targets.set(i, {
        pid: s.pid,
        procStart: s.procStart,
        ptySock: s.ptySock,
        dispatch: s.dispatch,
        replPid: s.replPid,
        replProcStart: s.replProcStart,
      });
    let isWindows = getPlatform() === "windows",
      [d, u] = isWindows ? [Xot(), ".pid"] : [UTt(), ".sock"],
      entries = isWindows && e ? await listStoredPtyPids(e) : await readdir(d).catch(() => []),
      primaryFiles = new Set(entries.filter((i) => i.endsWith(u)));
    for (let i of entries) {
      if (!i.endsWith(u)) {
        if (!isWindows) {
          let found = [".err", ".late", ".exec-exit", ".err.read"].find((y) => i.endsWith(`.sock${y}`));
          if (found && !primaryFiles.has(i.slice(0, -found.length))) {
            let sliced = i.slice(0, -`.sock${found}`.length);
            if (!(found === ".exec-exit" && targets.has(sliced))) await unlink(join(d, i)).catch(() => {});
          }
        }
        continue;
      }
      let sliced = i.slice(0, -u.length);
      if (targets.has(sliced)) continue;
      let f = isWindows
        ? Number((e ? await readStoredPtyPid(e, sliced) : await readSmallFileOrNull(owe(sliced), Rtn)) ?? "0")
        : 0;
      targets.set(sliced, { pid: f, ptySock: FA(sliced) });
    }
    if (!isWindows) {
      let i = new Set();
      for (let f of targets.values()) if (f.ptySock) i.add(f.ptySock);
      let s = await readdir(Fpe()).catch(() => []);
      for (let f of s) {
        if (!f.endsWith(".pty.sock")) continue;
        let p = join(Fpe(), f);
        if (i.has(p)) continue;
        targets.set(`spare:${f}`, { pid: 0, ptySock: p });
      }
    }
    let reapedCount = 0,
      kept = new Set(),
      keepAlive = setInterval(() => {}, 60000);
    if (
      (await Promise.all(
        Array.from(targets.entries()).map(async ([i, s]) => {
          let f = s.dispatch ? await readExecExitStatus(s.ptySock, s.dispatch) : null;
          if (s.ptySock && (await killViaPtySocket(s.ptySock, e))) reapedCount++;
          else if (s.pid) {
            let p = await killVerifiedProcess(s.pid, s.procStart),
              y = p !== "unverified" && (await reapDetachedRepl(s.replPid, s.replProcStart));
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
            let p = { state: "stopped", detail: "stopped" },
              y = f?.state === "done" ? f : t.supervisorKilledAll ? p : (f ?? p);
            if ((await writeReapedTerminalState(i, y.state, y.detail, void 0, e), isWindows && e))
              await e
                .delete(STORAGE_SPACES.daemon(["pty-pids", basename(getExecExitPath(s.ptySock ?? FA(i)))]))
                .catch(() => {});
            else await unlink(getExecExitPath(s.ptySock ?? FA(i))).catch(() => {});
          }
          if (isWindows)
            if (e) await deleteStoredPtyPid(e, i);
            else {
              await unlink(owe(i)).catch(() => {});
              let p = JC(FA(i));
              (await unlink(p).catch(() => {}),
                await unlink(`${p}.read`).catch(() => {}),
                await unlink(xN(FA(i))).catch(() => {}));
            }
        }),
      ).finally(() => clearInterval(keepAlive)),
      targets.size > 0)
    )
      await updateRoster((i) => {
        for (let s of targets.keys()) if (!kept.has(s)) delete i.workers[s];
      }, e).catch(logError);
    return { reaped: reapedCount, kept: kept.size };
  });
}
/**
 * 分页列出存储中 daemon/pty-pids 下记录的 PTY 进程标识。
 */
//@ chunk-dxgf3w3p.js:5523-5925 placement
async function listStoredPtyPids(t) {
  let e = [],
    r;
  do {
    let n = await t
      .listEntries(
        { namespace: "daemon", relPath: ["pty-pids"] },
        { cursor: r, skipKeyStats: !0, skipScopeStats: !0 },
      )
      .catch(() => {
        return;
      });
    if (n === void 0 || !n.ok) return [];
    for (let item of n.value.items)
      if (item.kind === "key" && item.key.namespace === "daemon") {
        let at = item.key.relPath.at(-1);
        if (at !== void 0 && item.key.relPath.length === 2 && isValidKeySegment(at)) e.push(at);
      }
    r = n.value.cursor;
  } while (r !== void 0);
  return e;
}
//@ chunk-dxgf3w3p.js:5925-5938 placement
var Rtn = 4096;
//@ chunk-dxgf3w3p.js:5938-6036 placement
async function D(t) {
  try {
    let e = await lstat(owe(t));
    return !e.isFile() || e.size > Rtn;
  } catch (error) {
    return !isENOENT(error);
  }
}
/**
 * 读取存储中某个 PTY 的 pid 记录；进程已结束、读取失败或超出大小时返回 null。
 */
//@ chunk-dxgf3w3p.js:6036-6308 placement
async function readStoredPtyPid(t, e) {
  if (await D(e)) return null;
  let r = await t
    .readText([{ key: STORAGE_SPACES.daemon(["pty-pids", `${e}.pid`]), offset: 0, length: Rtn + 1 }])
    .catch(() => {
      return;
    });
  if (r === void 0 || !r.ok) return null;
  let n = r.value.items[0];
  if (!n.found || n.totalBytes > Rtn) return null;
  return n.value;
}
//@ chunk-dxgf3w3p.js:6308-6412 placement
async function deleteStoredPtyPid(t, e) {
  (await t.delete(STORAGE_SPACES.daemon(["pty-pids", `${e}.pid`])).catch(() => {}),
    await deleteStoredPtySidecars(t, FA(e)));
}
//@ chunk-dxgf3w3p.js:6412-6545 placement
async function deleteStoredPtySidecars(t, e) {
  let r = JC(e);
  for (let n of [basename(r), `${basename(r)}.read`, basename(xN(e))])
    await t.delete(STORAGE_SPACES.daemon(["pty-pids", n])).catch(() => {});
}
/**
 * 连接 pty socket 发送 SIGTERM 指令，连接关闭视为成功；连接失败时清理 socket 及附带文件；2 秒超时返回 false。
 */
//@ chunk-dxgf3w3p.js:6545-6965 placement
function killViaPtySocket(t, e) {
  return new Promise((r) => {
    let n = !1,
      o = (u) => {
        if (n) return;
        ((n = !0), r(u));
      },
      d = connect(t);
    (d.unref(),
      d.setTimeout(2000, () => {
        (d.destroy(), o(!1));
      }),
      d.on("error", () => {
        unlink(t).catch(() => {});
        let u = JC(t);
        if (e && getPlatform() === "windows") deleteStoredPtySidecars(e, t).catch(() => {});
        else (unlink(u).catch(() => {}), unlink(`${u}.read`).catch(() => {}), unlink(xN(t)).catch(() => {}));
        o(!1);
      }),
      d.once("connect", () => {
        (d.resume(), d.write(encodeControlFrame({ t: "kill", sig: "SIGTERM" })));
      }),
      d.once("close", () => o(!0)));
  });
}
/**
 * 连接 pty socket 发送 pong，250 毫秒内连上返回 true。
 */
//@ chunk-dxgf3w3p.js:6965-7183 placement
function pingPtySocket(t) {
  return new Promise((e) => {
    let r = !1,
      n = (d) => {
        if (r) return;
        ((r = !0), e(d));
      },
      o = connect(t);
    (o.unref(),
      o.setTimeout(250, () => {
        (o.destroy(), n(!1));
      }),
      o.on("error", () => n(!1)),
      o.once("connect", () => {
        (o.end(encodeControlFrame({ t: "pong" })), n(!0));
      }));
  });
}
/**
 * 结束进程前校验身份：进程不存在为 gone/killed；有启动时间时比对，不符为 foreign、无法读取为 unverified，一致则 SIGTERM 后 SIGKILL。
 */
//@ chunk-dxgf3w3p.js:7183-7453 placement
async function killVerifiedProcess(t, e) {
  try {
    process.kill(t, 0);
  } catch (error) {
    if (getErrnoCode(error) !== "ESRCH") return "foreign";
    return sigtermThenKill([-t, t], e) ? "killed" : "gone";
  }
  if (e === void 0) return "foreign";
  let r = await captureProcessStartTimeAsync(t);
  if (r === void 0) return "unverified";
  if (r !== e) return "foreign";
  return sigtermThenKill([-t, t], e) ? "killed" : "gone";
}

export {
  createPrivateModeTracker,
  isAtLeastRelease,
  isNewerBuild,
  lmt,
  pingPtySocket,
  killViaPtySocket,
  qXe,
  YXe,
  parseRcVersionTimestamp,
  amt,
  Atn,
  readExecExitStatus,
  listStoredPtyPids,
  readStoredPtyPid,
  Rtn,
  Axs,
  killVerifiedProcess,
  reapAllBackgroundJobs,
};
