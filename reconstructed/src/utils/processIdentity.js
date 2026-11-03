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
import { statState, RY, kI } from "./procStat.js";
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
class Te {
  #e = !1;
  get forcedUnavailable() {
    return this.#e;
  }
  forceUnavailable(e) {
    this.#e = e;
  }
}
//@ chunk-qg0af0yq.js:12101-12115 placement
var At = new Te();
//@ chunk-qg0af0yq.js:12115-12137 placement
function F() {
  return !1;
}
/**
 * 获取 Windows 进程的创建时间（Bun 扩展），失败返回 undefined。
 */
//@ chunk-qg0af0yq.js:12137-12261 placement
function getWindowsProcessCreationTime(e) {
  if (!Number.isInteger(e) || e <= 0) return;
  try {
    return Bun.ant.windowsProcessCreationTime(e) ?? void 0;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:12261-12433 placement
async function readLinuxProcState(e) {
  if (getPlatform() !== "linux" && getPlatform() !== "wsl") return;
  if (!isProbeablePid(e)) return;
  try {
    let content = await getFsImplementation().readFile(`/proc/${e}/stat`, { encoding: "utf8" });
    return statState(content);
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:12433-12479 placement
async function isExitedProcessAsync(e) {
  return RY(await readLinuxProcState(e));
}
//@ chunk-qg0af0yq.js:12479-12652 placement
async function hasExitedUnreaped(e) {
  if (getPlatform() !== "macos") return isExitedProcessAsync(e);
  let { code: code, stdout: stdout } = await execFileNoThrow("ps", ["-o", "stat=", "-p", String(e)], {
    timeout: 1000,
  });
  return code === 0 && stdout.trim().startsWith("Z");
}
//@ chunk-qg0af0yq.js:12652-12670 placement
var Tn = 2147483647;
//@ chunk-qg0af0yq.js:12670-12725 placement
function isProbeablePid(e) {
  return Number.isInteger(e) && e > 1 && e <= Tn;
}
//@ chunk-qg0af0yq.js:12725-12824 placement
function isProcessProvablyGone(e) {
  if (!isProbeablePid(e)) return !1;
  try {
    return (process.kill(e, 0), !1);
  } catch (error) {
    return getErrnoCode(error) === "ESRCH";
  }
}
//@ chunk-qg0af0yq.js:12824-12834 placement
var Rn = 16;
//@ chunk-qg0af0yq.js:12834-13122 placement
async function looksLikeFullHostProcessTable() {
  let e = getPlatform();
  if (e !== "linux" && e !== "wsl") return !0;
  let n = getFsImplementation(),
    t = await n.readlink("/proc/self").catch(() => null);
  if (t === null || t !== String(process.pid)) return !1;
  let r = await n.readdir("/proc").catch(() => null);
  if (!r) return !1;
  return r.filter((s) => /^\d+$/.test(s.name)).length >= Rn;
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
    return (
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
      ).unref(),
      !0
    );
  }
  return !1;
}
//@ chunk-qg0af0yq.js:13368-13657 placement
async function reapDetachedRepl(e, n, t = "SIGTERM") {
  if (!e || e <= 1 || n === void 0) return !1;
  if ((await compareProcessIdentity(e, n)) === "other") return !1;
  try {
    process.kill(-e, t);
  } catch {
    return !1;
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
      e,
      n,
    ).unref();
  return !0;
}
//@ chunk-qg0af0yq.js:13657-13828 placement
async function compareProcessIdentity(e, n) {
  let t = await captureProcessStartTimeAsync(e);
  if (t !== void 0) return startTokensEqualOrCrossFormat(n, t) ? "same" : "other";
  try {
    return (process.kill(e, 0), "other");
  } catch (error) {
    return getErrnoCode(error) === "ESRCH" ? "gone" : "other";
  }
}
//@ chunk-qg0af0yq.js:13828-13961 placement
function getProcessStartTokenLinuxSync(e) {
  try {
    let content = getFsImplementation().readFileSync(`/proc/${e}/stat`, { encoding: "utf8" }),
      t = kI(content);
    return t && t.length > 0 ? t : void 0;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:13961-14236 placement
function getAncestorPidsLinuxSync(e, n = 12) {
  let t = [],
    r = e;
  for (let i = 0; i < n; i++) {
    let s = 0;
    try {
      let content = getFsImplementation().readFileSync(`/proc/${r}/stat`, { encoding: "utf8" }),
        index = content.lastIndexOf(")"),
        parts = content.slice(index + 2).split(" ");
      s = Number(parts[1]);
    } catch {
      break;
    }
    if (!Number.isInteger(s) || s < 1) break;
    if ((t.push(s), s === 1)) break;
    r = s;
  }
  return t;
}
//@ chunk-qg0af0yq.js:14236-14296 placement
async function getAncestorPidsAsync(e, n = 10) {
  return (await getAncestorPidsCheckedAsync(e, n)).ancestors;
}
//@ chunk-qg0af0yq.js:14296-14868 placement = getAncestorPidsAsync (0.341)
async function getAncestorPidsCheckedAsync(pid, maxDepth = 10) {
  let script = `pid=${String(pid)}; for i in $(seq 1 ${maxDepth}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ]; then echo FAIL; exit 0; fi; if [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then echo END; exit 0; fi; echo $ppid; pid=$ppid; done`,
    result = await execFileNoThrowWithCwd("sh", ["-c", script], { timeout: 3000 }),
    filtered = (result.stdout ?? "")
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
    let t = `ps -o command= -p ${String(pid)}`,
      result = execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
        t,
        { timeout: 1000 },
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
      let content = getFsImplementation().readFileSync(`/proc/${e}/stat`, { encoding: "utf8" });
      return kI(content);
    }
    let n = execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
      `LC_ALL=C TZ=UTC ps -o lstart= -p ${e}`,
      { timeout: 1000 },
    );
    return n ? n.trim() : void 0;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:15193-15254 placement
function isSameProcess(e, n) {
  if (n === void 0) return !0;
  return $e(n, getProcessStartTime(e));
}
//@ chunk-qg0af0yq.js:15254-15299 placement
function startTokensEqualOrCrossFormat(e, n) {
  if (n === e) return !0;
  return !1;
}
//@ chunk-qg0af0yq.js:15299-15350 placement
function $e(e, n) {
  return n === void 0 || n === e || isCrossFormatStartToken(e, n);
}
//@ chunk-qg0af0yq.js:15350-15503 placement
function isCrossFormatStartToken(e, n) {
  if (!F()) return !1;
  let t = Number(e),
    r = Number(n);
  return Number.isFinite(t) && Number.isFinite(r) && t > 300000000000000000 !== r > 300000000000000000;
}
//@ chunk-qg0af0yq.js:15503-15574 placement
async function isSameProcessAsync(e, n) {
  if (n === void 0) return !0;
  return $e(n, await getProcessStartTimeAsync(e));
}
//@ chunk-qg0af0yq.js:15574-15664 placement
async function provenSameProcessAsync(e, n) {
  let t = await getProcessStartTimeAsync(e, { skipCache: !0 });
  return t === void 0 ? void 0 : startTokensEqualOrCrossFormat(n, t);
}
//@ chunk-qg0af0yq.js:15664-15760 placement
class ve {
  #e = void 0;
  get token() {
    return this.#e;
  }
  set(e) {
    return ((this.#e = e), e);
  }
  reset() {
    this.#e = void 0;
  }
}
//@ chunk-qg0af0yq.js:15760-15775 placement
var ownProcStartMemo = new ve();
//@ chunk-qg0af0yq.js:15775-15851 placement
class Le {
  #e = new Map();
  get(e) {
    return this.#e.get(e);
  }
  set(e, n) {
    this.#e.set(e, n);
  }
}
//@ chunk-qg0af0yq.js:15851-15876 placement
var Nn = new HostScoped(() => new Le());
/**
 * 本进程的 Claude tmux socket 名（按 pid 生成一次后缓存）。
 */
//@ chunk-qg0af0yq.js:15876-15935 placement = getClaudeSocketName (0.649)
function ownProcStart() {
  return ownProcStartMemo.token ?? ownProcStartMemo.set(getProcessStartTime(process.pid));
}
//@ chunk-qg0af0yq.js:15935-15947 placement
var wn = 1000;
//@ chunk-qg0af0yq.js:15947-16047 placement
async function ownProcStartAsync() {
  return (
    ownProcStartMemo.token ??
    (await withDeadline(
      getProcessStartTimeAsync(process.pid).then((e) => ownProcStartMemo.token ?? ownProcStartMemo.set(e)),
      wn,
    ))
  );
}
//@ chunk-qg0af0yq.js:16047-16137 placement
function procIdentityOf(e) {
  if (F()) return e.procStart !== void 0 ? void 0 : e.procStartFt;
  return e.procStart;
}
//@ chunk-qg0af0yq.js:16137-16230 placement
function procIdentityFields(e) {
  return F() ? { procStart: void 0, procStartFt: e } : { procStart: e, procStartFt: void 0 };
}
//@ chunk-qg0af0yq.js:16230-16251 placement
var $n = 60000,
  vn = 5000;
//@ chunk-qg0af0yq.js:16251-16535 placement
async function getProcessStartTimeAsync(e, n) {
  let now = Date.now(),
    of = Nn.of(getRootSession().host);
  if (n?.env !== void 0) return readProcessStartTime(e, n.env);
  if (!n?.skipCache) {
    let a = of.get(e),
      l = a?.miss ? vn : $n;
    if (a && now - a.at < l) return a.p;
  }
  let i = readProcessStartTime(e),
    s = { at: now, p: i };
  of.set(e, s);
  let o = await i;
  if (o === void 0 && of.get(e) === s) ((s.miss = !0), (s.at = Date.now()));
  return o;
}
//@ chunk-qg0af0yq.js:16535-16554 placement
var Ie = 250,
  Ne = 2500;
//@ chunk-qg0af0yq.js:16554-16799 placement
async function captureProcessStartTimeAsync(e) {
  let n = Date.now() + Ne,
    t = !1,
    r = await withDeadline(
      getProcessStartTimeAsync(e, { skipCache: !0 }).finally(() => {
        t = !0;
      }),
      Ne,
    );
  if (r !== void 0 || !t) return r;
  let i = Ie + Math.floor(Math.random() * Ie),
    s = n - Date.now() - i;
  if (s <= 0) return;
  return (await sleep(i), withDeadline(getProcessStartTimeAsync(e, { skipCache: !0 }), s));
}
//@ chunk-qg0af0yq.js:16799-16902 placement
function getBinOnlyPath(e) {
  let parts = sanitizePathEnv(getEnvCaseInsensitive(e, "PATH") ?? "").split(delimiter);
  return parts.filter((r) => /^\/bin\/*$/.test(r)).join(delimiter);
}
/**
 * 读取进程启动时间：优先解析 /proc/<pid>/stat，否则用 ps -o lstart（可在指定环境中只从 /bin 查找 ps，UTC、C 语言环境、1 秒超时）。
 */
//@ chunk-qg0af0yq.js:16902-17282 placement
async function readProcessStartTime(e, n) {
  let t = n === void 0 ? {} : { env: n, extendEnv: !1 };
  try {
    {
      let content = await getFsImplementation().readFile(`/proc/${e}/stat`, { encoding: "utf8" });
      return kI(content);
    }
    let r = n === void 0 ? "ps" : whichOnPath("ps", getBinOnlyPath(n));
    if (r === null) return;
    let i = await execFileNoThrowWithCwd(r, ["-o", "lstart=", "-p", String(e)], {
      timeout: 1000,
      ...t,
      env: { ...(n ?? process.env), LC_ALL: "C", TZ: "UTC" },
    });
    return i.code === 0 && i.stdout ? i.stdout.trim() : void 0;
  } catch {
    return;
  }
}
//@ chunk-qg0af0yq.js:17282-17811 placement
async function getProcessCreationTimeMsAsync(e) {
  try {
    {
      let content = await getFsImplementation().readFile(`/proc/${e}/stat`, { encoding: "utf8" }),
        i = Number(kI(content)),
        content_2 = await getFsImplementation().readFile("/proc/stat", { encoding: "utf8" }),
        o = Number(/^btime (\d+)/m.exec(content_2)?.[1]);
      if (!Number.isFinite(i) || !Number.isFinite(o)) return null;
      return o * 1000 + (i / 100) * 1000;
    }
    let n = await execFileNoThrowWithCwd("ps", ["-o", "lstart=", "-p", String(e)], {
      timeout: 1000,
      env: { ...process.env, LC_ALL: "C", TZ: "UTC" },
    });
    if (n.code !== 0 || !n.stdout?.trim()) return null;
    let parse = Date.parse(`${n.stdout.trim()} UTC`);
    return Number.isFinite(parse) ? parse : null;
  } catch {
    return null;
  }
}
/**
 * 读取一组 pid 在 Linux 上的进程启动令牌（无效 pid 跳过）。
 */
//@ chunk-aepeg2w5.js:315408-315579 placement
async function processStartTokens(e) {
  let filtered = [...e].filter((s) => Number.isInteger(s) && s > 1),
    r = new Map();
  if (filtered.length === 0) return r;
  for (let s of filtered) {
    let h = getProcessStartTokenLinuxSync(s);
    if (h !== void 0) r.set(s, h);
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
