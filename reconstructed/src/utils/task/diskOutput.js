/**
 * utils/task/diskOutput.ts
 *
 * 后台任务输出文件：<项目临时目录>/<sessionId>/tasks/<taskId>.output 的安全打开、追加、读取与链接校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/diskOutput.ts
 * pieces: chunk-1dp9p908.js (65), chunk-aepeg2w5.js (1), chunk-c0cahhqh.js (2), chunk-y805ph4h.js (1)
 * attribution: facade-majority 32, layout 31, callgraph-fingerprint 1, file-local 1, fingerprint 2, affinity 1, placement 1
 */
import { constants, fstat } from "fs";
import { join, dirname, sep, isAbsolute, resolve, basename } from "path";
import { lstat, readdir, readlink, unlink, symlink, mkdir, open, realpath } from "fs/promises";
import { randomBytes } from "crypto";
import { getClaudeTempDirRealpath, Sx } from "../tempDirRealpaths.js";
import { getBgTakeover } from "../concurrentSessions.js";
import { getSessionId, isDiskless } from "../../bootstrap/state.js";
import { getTaskRunState } from "./taskNotifications.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import {
  errorMessage,
  getErrnoCode,
  RESOURCE_EXHAUSTION_CODES,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sleep, withDeadline } from "../sleep.js";
import { getPlatform } from "../platform.js";
import {
  readFileRange,
  getFsImplementation,
  safeResolvePath,
  getPathsForPermissionCheck,
  tailFile,
} from "../fsOperations.js";
import { uniq } from "../collections.js";
import { openNoFollow, J1e, pinWriteTarget, refuseSymlinkWrite } from "../fsSafety/pathRevalidation.js";
import { getProjectsDir } from "../sessionStorage.js";
import { normalizeCaseForComparison } from "../permissions/filesystem.js";
import { isValidSessionIdForAdopt } from "../background/adopt.js";
import { SymlinkWriteRefusedError } from "../fsSafety/atomicWriteStaging.js";
import { Pt, Mt, js } from "../../../vendor/@anthropic-ai/claude-agent-sdk/transcriptMirror.js";
import { getFileReader } from "../fileStore.js";

//@ chunk-1dp9p908.js:1692-1762 facade-majority = MAX_TASK_OUTPUT_BYTES_DISPLAY (0.861)
var O_NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0,
  bt = 8388608,
  MAX_TASK_OUTPUT_BYTES = 5368709120,
  MAX_TASK_OUTPUT_BYTES_DISPLAY = "5GB",
  MAX_PERSISTED_OUTPUT_BYTES = 67108864;
//@ chunk-1dp9p908.js:1762-1789 facade-majority
function getTaskOutputRootDir() {
  return getClaudeTempDirRealpath();
}
/**
 * 后台任务输出目录 <项目临时目录>/<sessionId>/tasks，每个任务一个 <taskId>.output 文件。
 */
//@ chunk-1dp9p908.js:1789-1966 facade-majority
function getTaskOutputDir() {
  let e = getBgTakeover()?.adoptShellOutputRoot;
  if (e !== void 0) return join(e, getSessionId(), "tasks");
  let n = getTaskRunState();
  if (n.outputDir === void 0 || isDiskless()) n.outputDir = join(Sx(), getSessionId(), "tasks");
  return n.outputDir;
}
//@ chunk-1dp9p908.js:1966-2007 facade-majority = getTaskOutputDir (1)
function taskOutputDirForSession(e) {
  return join(Sx(), e, "tasks");
}
//@ chunk-1dp9p908.js:2007-2120 facade-majority
function peekTaskOutputDir() {
  return getBgTakeover()?.adoptShellOutputRoot !== void 0
    ? getTaskOutputDir()
    : ((isDiskless() ? void 0 : getTaskRunState().outputDir) ?? join(Sx(), getSessionId(), "tasks"));
}
//@ chunk-1dp9p908.js:2120-2263 layout = getTaskOutputDir (0.761)
function getTaskOutputDir_2() {
  let e = getTaskRunState();
  if (e.outputDir === void 0) {
    if (getBgTakeover() !== null) return join(Sx(), getSessionId(), "tasks");
    e.outputDir = join(Sx(), getSessionId(), "tasks");
  }
  return e.outputDir;
}
/**
 * 任务输出文件路径 <tasks 目录>/<taskId>.output，按 taskId 缓存（diskless 会话抛错）。
 */
//@ chunk-1dp9p908.js:2263-2489 facade-majority
function bindTaskOutputPath(e) {
  if (isDiskless()) throw Error("Task output is not written to disk in a diskless session");
  let n = getTaskRunState().outputPathBindings.get(e);
  if (n !== void 0) return n;
  let i = join(getTaskOutputDir(), `${e}.output`);
  return (getTaskRunState().outputPathBindings.set(e, i), i);
}
/**
 * 后台任务输出文件路径：<项目临时目录>/<sessionId>/tasks/<taskId>.output（可被绑定覆盖）；diskless 会话抛错。
 */
//@ chunk-1dp9p908.js:2489-2661 facade-majority = getTaskOutputPath (0.529)
function getTaskOutputPath(taskId) {
  if (isDiskless()) throw Error("Task output has no file in a diskless session");
  let n = getTaskRunState().outputPathBindings.get(taskId);
  if (n !== void 0) return n;
  return join(getTaskOutputDir_2(), `${taskId}.output`);
}
//@ chunk-1dp9p908.js:2661-2762 callgraph-fingerprint = track (0.508)
function track(p) {
  let pendingOutputOps = getTaskRunState().pendingOutputOps;
  return (pendingOutputOps.add(p), p.finally(() => pendingOutputOps.delete(p)).catch(() => {}), p);
}
//@ chunk-1dp9p908.js:2762-2889 layout
var TASK_OUTPUT_FLUSH_BYTES = 16777216,
  B = `
[output omitted: it could not be written to disk]
`,
  tt = [50, 100, 200, 400, 800, 1600],
  reduced = tt.reduce((e, n) => e + n, 0);
//@ chunk-1dp9p908.js:2889-5609 facade-majority = DiskTaskOutput (0.323)
class DiskTaskOutput {
  #h;
  #n = null;
  #t = [];
  #w = 0;
  #o = !1;
  #e = 0;
  #r = 0;
  #i = !1;
  #u = new Set();
  #c = !1;
  #s = null;
  #a = null;
  #l = null;
  #d = null;
  constructor(e, n) {
    this.#h = n ?? bindTaskOutputPath(e);
  }
  append(e) {
    if (this.#o) return;
    if (((this.#w += e.length), this.#w > MAX_TASK_OUTPUT_BYTES)) this.#o = !0;
    let n = this.#o
      ? `
[output truncated: exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY} disk cap]
`
      : e;
    if ((this.#t.push(n), (this.#e += n.length), !this.#l))
      ((this.#l = new Promise((i) => {
        this.#d = i;
      })),
        track(this.#O()));
  }
  appendTrailer(e, n) {
    if (!this.#o) this.#s = n;
    this.append(e);
  }
  flush() {
    return this.#l ?? Promise.resolve();
  }
  get failing() {
    return this.#i;
  }
  get lostOutput() {
    return this.#c;
  }
  get unwrittenChars() {
    return this.#e;
  }
  cancel() {
    ((this.#r += 1),
      (this.#t.length = 0),
      (this.#e = 0),
      (this.#s = null),
      this.#a?.abort(),
      (this.#a = null));
  }
  async #f() {
    while (!0) {
      try {
        if (!this.#n) this.#n = await openTaskOutputForAppend(this.#h);
        while (!0) {
          let e = this.#r;
          try {
            await this.#m();
          } catch (error) {
            if (this.#r === e) ((this.#c = !0), this.#t.unshift(B), (this.#e += B.length));
            throw error;
          }
          if (this.#t.length === 0) break;
        }
      } finally {
        if (this.#n) {
          let e = this.#n;
          ((this.#n = null), await e.close());
        }
      }
      if (this.#t.length) continue;
      break;
    }
  }
  #m() {
    return this.#n.appendFile(this.#y());
  }
  #y() {
    let splice = this.#t.splice(0, this.#t.length);
    ((this.#e = 0), (this.#s = null));
    let n = 0;
    for (let r of splice) n += Buffer.byteLength(r, "utf8");
    let allocUnsafe = Buffer.allocUnsafe(n),
      s = 0;
    for (let r of splice) s += allocUnsafe.write(r, s, "utf8");
    return allocUnsafe;
  }
  async #O() {
    try {
      (await this.#f(), this.#p());
    } catch (error) {
      if (this.#g(error) !== null) {
        if (!this.#i)
          ((this.#i = !0),
            logForDebugging(
              `Task output closing line delayed: its file is busy (EBUSY); trying again for up to ${reduced} ms`,
            ));
        for (let [n, i] of tt.entries()) {
          if (((this.#a ??= new AbortController()), await sleep(i, this.#a.signal), this.#t.length === 0))
            return;
          let s = this.#r;
          try {
            (await this.#f(), this.#p());
            return;
          } catch (error) {
            if (this.#t.length === 0 && this.#r !== s) return;
            let o = this.#g(error);
            if (o === null || n === tt.length - 1) {
              this.#k(error, o);
              return;
            }
          }
        }
        return;
      }
      if (!this.#i)
        ((this.#i = !0),
          logForDebugging(`Task output drain failed (will retry once): ${error}`, { level: "error" }));
      if (this.#t.length > 0)
        try {
          (await this.#f(), this.#p());
        } catch (error) {
          this.#k(error, null);
        }
    } finally {
      let e = this.#d;
      ((this.#l = null), (this.#d = null), e());
    }
  }
  #p() {
    ((this.#i = !1), this.#u.clear());
  }
  #g(e) {
    return getPlatform() === "windows" && getErrnoCode(e) === "EBUSY" ? this.#s : null;
  }
  #k(e, n) {
    let i = getErrnoCode(e),
      s = i !== void 0 && RESOURCE_EXHAUSTION_CODES.has(i) ? "exhaustion" : (n ?? "unexpected"),
      r = `${s}:${i ?? "no errno"}`;
    if (!this.#u.has(r))
      switch ((this.#u.add(r), s)) {
        case "exhaustion":
          logForDebugging(`Task output drain retry failed (${i}): ${e}`, { level: "error" });
          break;
        case "exited":
          logForDebugging(
            `Task output closing line not written (EBUSY): the file was still busy after ${reduced} ms`,
            { level: "warn" },
          );
          break;
        case "killed":
          logError(
            withTelemetryMessage(
              e,
              `closing line of a stopped shell command not written: output file still busy after ${reduced} ms`,
            ),
          );
          break;
        case "unexpected":
          logError(e);
          break;
      }
    if (this.#e > TASK_OUTPUT_FLUSH_BYTES)
      (logForDebugging(
        `Task output still cannot be written (${i ?? "no errno"}); dropped ${this.#e} chars of unwritten output`,
        { level: "error" },
      ),
        (this.#c = !0),
        (this.#t.length = 0),
        this.#t.push(B),
        (this.#e = B.length),
        (this.#s = null));
  }
}
//@ chunk-1dp9p908.js:5609-5708 layout
function getDiskTaskOutput(e) {
  let n = getTaskRunState().diskOutputs.get(e);
  if (!n) ((n = new DiskTaskOutput(e)), getTaskRunState().diskOutputs.set(e, n));
  return n;
}
//@ chunk-1dp9p908.js:5708-5742 facade-majority
function appendTaskOutput(e, n) {
  getDiskTaskOutput(e).append(n);
}
//@ chunk-1dp9p908.js:5742-5906 facade-majority
function appendTaskOutputTrailer(e, n) {
  let i = getDiskTaskOutput(e);
  if (n === "killed")
    i.appendTrailer(
      `
[killed]
`,
      "killed",
    );
  else
    i.appendTrailer(
      `
[exited with code ${n.exitCode ?? "unknown"}]
`,
      "exited",
    );
}
/**
 * 刷新并移除某任务的磁盘输出写入器，释放内存；写失败时记录丢失的字符数。
 */
//@ chunk-1dp9p908.js:5906-6185 facade-majority = evictTaskOutput (0.156)
function evictTaskOutput(taskId) {
  return track(
    (async () => {
      let n = getTaskRunState(),
        output = n.diskOutputs.get(taskId);
      if (output) {
        if ((await output.flush(), output.failing && output.unwrittenChars > 0))
          logForDebugging(
            `Task output writer evicted while failing; discarded ${output.unwrittenChars} chars of unwritten output`,
            { level: "error" },
          );
        n.diskOutputs.delete(taskId);
      }
      releaseConvergentTaskOutputBinding(taskId);
    })(),
  );
}
/**
 * 若任务输出路径绑定仍指向默认 <dir>/<id>.output，则删除该绑定（归属疑似错误）。
 */
//@ chunk-1dp9p908.js:6185-6327 facade-majority = getAgentOutputTaskId (0.778)
function releaseConvergentTaskOutputBinding(filePath) {
  let n = getTaskRunState().outputPathBindings.get(filePath);
  if (n !== void 0 && getBgTakeover() === null && n === join(getTaskOutputDir(), `${filePath}.output`))
    getTaskRunState().outputPathBindings.delete(filePath);
}
//@ chunk-1dp9p908.js:6327-6754 facade-majority = getTaskOutputDelta (0.623)
async function getTaskOutputDelta(taskId, fromOffset, maxBytes = bt) {
  try {
    let s = await openTaskOutputForRead(getTaskOutputPath(taskId));
    if (!s) return { content: "", newOffset: fromOffset };
    let r;
    try {
      r = await readFileRange(s, fromOffset, maxBytes);
    } finally {
      await s.close();
    }
    if (!r) return { content: "", newOffset: fromOffset };
    return { content: r.content, newOffset: fromOffset + r.bytesRead };
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || isTaskOutputSwapRefusal(error)) return { content: "", newOffset: fromOffset };
    if (code && RESOURCE_EXHAUSTION_CODES.has(code))
      logForDebugging(`getTaskOutputDelta failed (${code}): ${error}`, { level: "error" });
    else logError(error);
    return { content: "", newOffset: fromOffset };
  }
}
//@ chunk-1dp9p908.js:6754-7203 facade-majority
async function getTaskOutputSize(e) {
  try {
    let n = await openTaskOutputForRead(getTaskOutputPath(e));
    if (!n) return 0;
    try {
      return (await n.stat()).size;
    } finally {
      await n.close();
    }
  } catch (error) {
    if (isTaskOutputSwapRefusal(error)) throw error;
    let i = getErrnoCode(error);
    if (i === "ENOENT") return 0;
    if (i === "EACCES" || i === "EPERM") {
      let s = await lstat(getTaskOutputPath(e)).catch(() => null);
      if (s !== null && s.isFile() && (s.mode & 256) === 0) return s.size;
      refuseOutputSwap(getTaskOutputPath(e), `output no longer measurable (${i})`);
    }
    if (i && RESOURCE_EXHAUSTION_CODES.has(i))
      logForDebugging(`getTaskOutputSize failed (${i}): ${error}`, { level: "error" });
    else logError(error);
    return 0;
  }
}
//@ chunk-1dp9p908.js:7203-7594 facade-majority
async function repointTaskOutputSymlinks(e, n) {
  if (isDiskless()) return;
  let i = getTaskRunState(),
    s = uniq([
      ...(i.outputDir !== void 0 ? [i.outputDir] : []),
      ...[...i.outputPathBindings.values()].map((o) => dirname(o)),
    ]);
  if (s.length === 0) return;
  let r = e + sep;
  for (let o of s) {
    let a;
    try {
      a = await readdir(o);
    } catch (error) {
      let p = getErrnoCode(error);
      if (p !== "ENOENT")
        if (p && RESOURCE_EXHAUSTION_CODES.has(p))
          logForDebugging(`repointTaskOutputSymlinks readdir failed (${p}): ${error}`, { level: "error" });
        else logError(error);
      continue;
    }
    await repointOutputSymlinksInDir(o, a, r, e, n);
  }
}
/**
 * repointTaskOutputSymlinks 的单目录实现：对目录中每个 .output 符号链接，若指向旧任务输出根则改指到新根（固定写目标、校验链接未被改动、先删后建），并更新 linkedOutputs 登记。
 */
//@ chunk-1dp9p908.js:7594-8432 layout
async function repointOutputSymlinksInDir(dir, entries, oldRootPrefix, oldRoot, newRoot) {
  let linkedOutputs = getTaskRunState().linkedOutputs;
  for (let a of entries) {
    if (!a.endsWith(".output")) continue;
    let u = join(dir, a),
      p = linkedOutputs.get(u),
      c;
    try {
      c = getPlatform() === "windows" ? void 0 : await pinOutputDir(u, { replaceLeaf: !0 });
      let h = c?.ioPath ?? u;
      if (p === void 0 && dir === getTaskRunState().outputDir)
        p = await readlink(h)
          .then((w) => adoptInheritedOutputLink(u, h, w))
          .catch(() => {
            return;
          });
      if (p === void 0 || !p.startsWith(oldRootPrefix)) continue;
      let m = newRoot + p.slice(oldRoot.length),
        T = await readlinkOrNull(h);
      if (T === null) continue;
      if (T !== p) refuseOutputSwap(u, "output symlink was re-pointed");
      if ((await c?.recheckBeforeWrite(), await unlink(h), linkedOutputs.get(u) === p))
        await registerLinkedOutput(u, m);
      try {
        (await c?.recheckBeforeWrite(),
          await symlink(m, h).catch(async (w) => {
            if (getErrnoCode(w) !== "EEXIST") throw w;
            let v = await readlink(h).catch(() => {
              return;
            });
            if (v !== m && v !== linkedOutputs.get(u)) throw w;
          }));
      } catch (error) {
        if (linkedOutputs.get(u) === m) linkedOutputs.delete(u);
        throw error;
      }
      if (
        (await readlink(h).catch(() => {
          return;
        })) === m
      )
        linkedOutputs.set(u, m);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT" && !isTaskOutputSwapRefusal(error)) logError(error);
    } finally {
      await c?.close();
    }
  }
}
/**
 * 安全地以追加方式打开任务输出文件：无盘会话报错；Windows 直接 open；其余固定写目标后检查叶子——符号链接只允许一跳且指向任务输出根，必须是单链接普通文件，
 * 用 O_NOFOLLOW|O_APPEND 打开（必要时独占创建），并核对打开的文件身份。
 */
//@ chunk-1dp9p908.js:8432-9566 layout
async function openTaskOutputForAppend_2(outputPath, options, linkDepth = 0) {
  if (isDiskless()) throw Error("Task output is not written to disk in a diskless session");
  if (getPlatform() === "windows")
    return (await mkdir(dirname(outputPath), { recursive: !0 }), open(outputPath, options.windowsFlags));
  let pinned = await pinOutputDir(outputPath, { replaceLeaf: !0 });
  try {
    let existing = await getTaskOutputSize_2(pinned.ioPath);
    if (existing?.isSymbolicLink()) {
      let u = await verifyOutputLink(outputPath, pinned.ioPath);
      if (u === null) {
        if (options.relooked) refuseOutputSwap(outputPath, "output leaf changed during open");
        return (
          await pinned.close(),
          openTaskOutputForAppend_2(outputPath, { ...options, relooked: !0 }, linkDepth)
        );
      }
      if (options.exclusive || linkDepth > 0 || !isInTaskOutputRoot(u))
        refuseOutputSwap(outputPath, "output link is not appendable");
      return await openTaskOutputForAppend_2(
        u,
        { exclusive: options.exclusive, windowsFlags: options.windowsFlags },
        linkDepth + 1,
      );
    }
    if (existing !== null && (!existing.isFile() || (existing.nlink !== 1 && linkDepth === 0)))
      refuseOutputSwap(outputPath, "existing output is not a plain file");
    await pinned.recheckBeforeWrite();
    let o = options.exclusive || existing === null,
      handle;
    try {
      handle = await openNoFollow(
        pinned.ioPath,
        constants.O_WRONLY |
          constants.O_APPEND |
          (o ? constants.O_CREAT | constants.O_EXCL : 0) |
          O_NOFOLLOW_FLAG |
          (constants.O_NONBLOCK ?? 0),
        getPlatform(),
      );
    } catch (error) {
      if (!options.exclusive && getErrnoCode(error) === "EEXIST" && !options.retried)
        return (
          await pinned.close(),
          openTaskOutputForAppend_2(outputPath, { ...options, retried: !0 }, linkDepth)
        );
      throw error;
    }
    if (linkDepth > 0 && existing === null) {
      let stats = await handle.stat();
      linkTargetIdentities.set(outputPath, { dev: stats.dev, ino: stats.ino });
    }
    try {
      await checkOutputIdentity(handle, existing, outputPath, {
        registeredIdentity: linkDepth > 0 ? getRecordedLinkIdentity(outputPath) : void 0,
      });
    } catch (error) {
      throw (await handle.close().catch(() => {}), error);
    }
    return handle;
  } catch (error) {
    throw mapOpenRefusal(error, outputPath);
  } finally {
    await pinned.close();
  }
}
//@ chunk-1dp9p908.js:9566-10657 facade-majority
async function openTaskOutputForRead(e, n = 0, i = !1) {
  if (getPlatform() === "windows") {
    let r = await getTaskOutputSize_2(e);
    if (r === null) return null;
    if (r.isSymbolicLink()) {
      let a = await verifyOutputLink(e, e);
      if (a === null) {
        if (i) refuseOutputSwap(e, "output leaf changed during open");
        return openTaskOutputForRead(e, n, !0);
      }
      return openLinkTargetForRead(a, n, e);
    }
    if (!r.isFile()) refuseOutputSwap(e, "not a regular file");
    let o = await open(e, "r");
    return (await checkOutputIdentity(o, r, e, { anyLinkCount: !0 }), o);
  }
  let s;
  try {
    s = await pinOutputDir(e, { replaceLeaf: !0, create: !1 });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  }
  try {
    let r = await getTaskOutputSize_2(s.ioPath);
    if (r === null) return null;
    if (r.isSymbolicLink()) {
      let a = await verifyOutputLink(e, s.ioPath);
      if (a === null) {
        if (i) refuseOutputSwap(e, "output leaf changed during open");
        return (await s.close(), openTaskOutputForRead(e, n, !0));
      }
      return await openLinkTargetForRead(a, n, e);
    }
    if (n === 0 && r.isFile() && r.nlink === 0) return null;
    if (!r.isFile() || (r.nlink !== 1 && n === 0)) refuseOutputSwap(e, "not a regular nlink-1 file");
    await s.recheckBeforeWrite();
    let o = await openNoFollow(
      s.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    );
    try {
      if (
        (await checkOutputIdentity(o, r, e, {
          registeredIdentity: n > 0 ? getRecordedLinkIdentity(e) : void 0,
          unlinkedIsGone: n === 0,
        })) === "gone"
      )
        return null;
    } catch (error) {
      throw (await o.close().catch(() => {}), error);
    }
    return o;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw mapOpenRefusal(error, e);
  } finally {
    await s.close();
  }
}
//@ chunk-1dp9p908.js:10657-11014 layout
async function adoptInheritedOutputLink(e, n, i) {
  let s = isAbsolute(i) && resolve(i).startsWith(resolve(getProjectsDir()) + sep);
  if (!isAbsolute(i) || (!isInTaskOutputRoot(i) && !s))
    return refuseOutputSwap(e, "output is an unregistered symlink of a shape this session does not create");
  let r = await lstat(n);
  if (!r.isSymbolicLink() || r.ctimeMs >= getTaskRunState().linksInheritedBeforeFor(dirname(e)))
    return refuseOutputSwap(e, "output is an unregistered symlink made during this session");
  return (await registerLinkedOutput(e, i), i);
}
//@ chunk-1dp9p908.js:11014-11335 layout
async function verifyOutputLink(e, n) {
  let i = getTaskRunState().linkedOutputs.get(e);
  if (i === void 0) {
    if (!isTaskOutputFilePath(e))
      return refuseOutputSwap(e, "output is an unregistered symlink outside any tasks directory");
    let r = await readlinkOrNull(n);
    if (r === null) return null;
    i = await adoptInheritedOutputLink(e, n, r);
  }
  let s = await readlinkOrNull(n);
  if (s === null) return null;
  if (s !== i) return refuseOutputSwap(e, "output symlink was re-pointed");
  return i;
}
//@ chunk-1dp9p908.js:11335-11427 layout
async function readlinkOrNull(e) {
  try {
    return await readlink(e);
  } catch (error) {
    if (getErrnoCode(error) === "EINVAL") return null;
    throw error;
  }
}
/**
 * 打开任务输出链接的目标供读取：指回任务目录时按链深度处理，否则解析真实路径、以不跟随链接方式打开，并核对是普通文件且 inode/设备与 lstat 一致。
 */
//@ chunk-1dp9p908.js:11427-11913 layout
async function openLinkTargetForRead(e, n, i) {
  if (isInTaskOutputRoot(e)) {
    if (n > 0) return refuseOutputSwap(i, "output links chain");
    return openTaskOutputForRead(e, n + 1);
  }
  let s, r;
  try {
    let o = await realpath(e);
    if (isInTaskOutputRoot(o)) return refuseOutputSwap(i, "output link leads back into the tasks tree");
    ((r = await lstat(o)),
      (s = await openNoFollow(
        o,
        constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
        getPlatform(),
      )));
  } catch (error) {
    if (isTaskOutputSwapRefusal(error)) throw error;
    if (getErrnoCode(error) === "ENOENT") return null;
    throw mapOpenRefusal(error, i);
  }
  try {
    let stats = await s.stat();
    if (!stats.isFile() || stats.ino !== r.ino || stats.dev !== r.dev)
      refuseOutputSwap(i, "link target is not a regular file");
  } catch (error) {
    throw (await s.close().catch(() => {}), error);
  }
  return s;
}
//@ chunk-1dp9p908.js:11913-11986 layout
function isInTaskOutputRoot(e) {
  let n = getClaudeTempDirRealpath();
  return e === n || e.startsWith(n.endsWith(sep) ? n : n + sep);
}
//@ chunk-1dp9p908.js:11986-12078 file-local
async function getTaskOutputSize_2(taskId) {
  try {
    return await lstat(taskId);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  }
}
//@ chunk-1dp9p908.js:12078-12092 layout
var linkTargetIdentities = new Map();
//@ chunk-1dp9p908.js:12092-12199 layout
function getRecordedLinkIdentity(e) {
  let n = linkTargetIdentities.get(e);
  if (n === void 0) return refuseOutputSwap(e, "link target identity was never recorded");
  return n;
}
//@ chunk-1dp9p908.js:12199-12270 layout
async function registerLinkedOutput(e, n) {
  if (isInTaskOutputRoot(n)) await recordLinkTargetIdentity(n);
  getTaskRunState().linkedOutputs.set(e, n);
}
/**
 * 记录任务输出链接目标的文件身份：以不跟随链接方式打开，要求是只有一个硬链接的普通文件，保存其 dev/ino。
 */
//@ chunk-1dp9p908.js:12270-12613 layout
async function recordLinkTargetIdentity(e) {
  let n = await pinOutputDir(e, { replaceLeaf: !0, create: !1 });
  try {
    let i = await openNoFollow(
      n.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    ).catch((s) => {
      throw mapOpenRefusal(s, e);
    });
    try {
      let stats = await i.stat();
      if (!stats.isFile() || stats.nlink !== 1)
        refuseOutputSwap(e, "link target is not a regular single-link file");
      linkTargetIdentities.set(e, { dev: stats.dev, ino: stats.ino });
    } finally {
      await i.close();
    }
  } finally {
    await n.close();
  }
}
/**
 * 核对已打开的输出文件身份：必须是普通文件、硬链接数/登记身份与打开前一致；可选在文件已被删除（nlink 0）时返回 gone。不一致抛"output file identity changed"。
 */
//@ chunk-1dp9p908.js:12613-13075 layout
async function checkOutputIdentity(e, n, i, s) {
  try {
    let stats = await e.stat(),
      o = s?.registeredIdentity;
    if (
      s?.unlinkedIsGone &&
      o === void 0 &&
      !s.anyLinkCount &&
      n !== null &&
      stats.isFile() &&
      stats.nlink === 0 &&
      stats.ino === n.ino &&
      stats.dev === n.dev
    )
      return (await e.close().catch(() => {}), "gone");
    if (
      !stats.isFile() ||
      (o !== void 0 ? stats.ino !== o.ino || stats.dev !== o.dev : !s?.anyLinkCount && stats.nlink !== 1) ||
      (n !== null && (stats.ino !== n.ino || stats.dev !== n.dev))
    )
      refuseOutputSwap(i, "output file identity changed");
    return "same";
  } catch (error) {
    throw (await e.close().catch(() => {}), error);
  }
}
//@ chunk-1dp9p908.js:13075-13265 layout
function mapOpenRefusal(e, n) {
  let i = getErrnoCode(e);
  if (
    i === "ELOOP" ||
    i === "EISDIR" ||
    i === "ENOTDIR" ||
    i === "ENXIO" ||
    i === "EOPNOTSUPP" ||
    i === "ENOTSUP"
  )
    try {
      refuseOutputSwap(n, `open refused a swapped leaf (${i})`);
    } catch (error) {
      return error;
    }
  return e;
}
//@ chunk-1dp9p908.js:13265-13428 layout
function canonicalizeTaskOutputPath(e) {
  let n = getTaskOutputBaseDir(),
    i = resolve(e);
  if (i.startsWith(n + sep)) return i;
  let s = getFsImplementation(),
    r = dirname(dirname(dirname(dirname(i)))),
    { resolvedPath: resolvedPath } = safeResolvePath(s, r);
  return normalizeCaseForComparison(resolvedPath) === normalizeCaseForComparison(n)
    ? join(n, i.slice(r.length + 1))
    : i;
}
//@ chunk-1dp9p908.js:13428-13467 layout
function getTaskOutputBaseDir() {
  return dirname(dirname(dirname(resolve(getTaskOutputDir()))));
}
//@ chunk-1dp9p908.js:13467-13655 facade-majority = getTaskOutputDir (0.807)
function isTaskOutputFilePath(e) {
  let n = getTaskOutputBaseDir(),
    i = getFsImplementation(),
    s = new Set([n, safeResolvePath(i, n).resolvedPath].map((r) => normalizeCaseForComparison(r)));
  return getPathsForPermissionCheck(e).some((r) => {
    let o = dirname(resolve(r));
    return (
      normalizeCaseForComparison(basename(o)) === "tasks" &&
      isOwnSessionId(basename(dirname(o))) &&
      s.has(normalizeCaseForComparison(dirname(dirname(dirname(o)))))
    );
  });
}
//@ chunk-1dp9p908.js:13655-13800 layout
function getSessionDirGlobs() {
  let e = ["????????-????-????-????-????????????", "session_*", "cse_*"],
    n = getSessionId();
  if (!isValidSessionIdForAdopt(n) && /^[A-Za-z0-9._-]+$/.test(n)) e.push(n);
  return e;
}
//@ chunk-1dp9p908.js:13800-13838 layout
function isOwnSessionId(e) {
  return isValidSessionIdForAdopt(e) || e === getSessionId();
}
//@ chunk-1dp9p908.js:13838-14616 facade-majority
function taskOutputDirExclusions(e) {
  let n = getTaskOutputBaseDir(),
    i = getFsImplementation(),
    s = uniq([n, safeResolvePath(i, n).resolvedPath]),
    r = new Set(),
    o = (u, p) => {
      let c = u.endsWith(sep) ? u : u + sep;
      return normalizeCaseForComparison(p).startsWith(normalizeCaseForComparison(c))
        ? p.slice(c.length)
        : null;
    },
    a = (u) => u.replaceAll("\\", "/");
  for (let u of getPathsForPermissionCheck(e)) {
    let p = resolve(u);
    for (let c of s) {
      let h = basename(c);
      if (normalizeCaseForComparison(p) === normalizeCaseForComparison(c)) {
        for (let w of getSessionDirGlobs()) (r.add(`!/*/${w}/tasks/**`), r.add(`!**/${h}/*/${w}/tasks/**`));
        continue;
      }
      let m = o(p, c);
      if (m !== null) {
        for (let w of getSessionDirGlobs())
          (r.add(`!/${a(m)}/*/${w}/tasks/**`), r.add(`!**/${h}/*/${w}/tasks/**`));
        continue;
      }
      let T = o(c, p);
      if (T !== null) {
        let parts = T.split(sep);
        if (parts.length === 1)
          for (let v of getSessionDirGlobs())
            (r.add(`!/${v}/tasks/**`), r.add(`!**/${h}/${a(T)}/${v}/tasks/**`));
        else if (!isOwnSessionId(parts[1] ?? ""));
        else if (parts.length === 2) (r.add("!/tasks/**"), r.add(`!**/${h}/${a(T)}/tasks/**`));
        else if (normalizeCaseForComparison(parts[2] ?? "") === "tasks") r.add("!**");
      }
    }
  }
  return [...r];
}
//@ chunk-1dp9p908.js:14616-15005 facade-majority
async function bindTaskOutputForRead(e) {
  e = canonicalizeTaskOutputPath(e);
  let n = await openTaskOutputForRead(e);
  if (n === null)
    throw (
      await lstat(e),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `task output ${e} is no longer available (the file it pointed to was removed)`,
        "task output link target removed",
      )
    );
  let i = getPlatform();
  return {
    ioPath:
      (i === "linux" || i === "wsl") &&
      (await readlink(`/proc/self/fd/${n.fd}`).then(
        () => !0,
        () => !1,
      ))
        ? J1e(n.fd)
        : i === "macos"
          ? `/dev/fd/${n.fd}`
          : e,
    canonicalPath: e,
    handle: n,
    close: () => n.close(),
  };
}
//@ chunk-1dp9p908.js:15005-15018 facade-majority
var TASK_OUTPUT_TAIL_BYTES = 8192;
//@ chunk-1dp9p908.js:15018-15062 facade-majority
async function tailOutputOfTask(e) {
  return tailTaskOutput(getTaskOutputPath(e), TASK_OUTPUT_TAIL_BYTES);
}
//@ chunk-1dp9p908.js:15062-15211 facade-majority = getTaskOutput (1)
async function tailTaskOutput(taskId, maxBytes) {
  let i = await openTaskOutputForRead(taskId);
  if (i === null) return { content: "", bytesRead: 0, bytesTotal: 0 };
  try {
    return await tailFile(i, maxBytes);
  } finally {
    await i.close();
  }
}
//@ chunk-1dp9p908.js:15211-15527 facade-majority
async function unlinkTaskOutput(e) {
  let n = getTaskRunState().linkedOutputs.get(e);
  if ((getTaskRunState().linkedOutputs.delete(e), n !== void 0)) linkTargetIdentities.delete(n);
  if (getPlatform() === "windows") {
    await unlink(e);
    return;
  }
  let i;
  try {
    i = await pinOutputDir(e, { replaceLeaf: !0, create: !1 });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
  try {
    (await i.recheckBeforeWrite(), await unlink(i.ioPath));
  } finally {
    await i.close();
  }
}
//@ chunk-1dp9p908.js:15527-15555 layout
var uint8Array = new Uint8Array([10]);
//@ chunk-1dp9p908.js:15555-15878 facade-majority
async function probeTaskOutputWrite(e) {
  let n = `${e}.${randomBytes(6).toString("hex")}.probe`;
  try {
    let i;
    try {
      i = await openTaskOutputForAppend_2(n, { exclusive: !0, windowsFlags: "wx" });
    } catch {
      return null;
    }
    try {
      await i.write(uint8Array);
    } finally {
      await i.close();
    }
    return null;
  } catch (error) {
    return getErrnoCode(error) ?? null;
  } finally {
    await unlinkTaskOutput(n).catch((i) => {
      logForDebugging(`probeTaskOutputWrite: could not delete ${n}: ${errorMessage(i)}`);
    });
  }
}
//@ chunk-1dp9p908.js:15878-16021 facade-majority
async function writeTaskOutputSnapshot(e, n) {
  let i = await openTaskOutputForAppend_2(e, { exclusive: !1, windowsFlags: "w" });
  try {
    (await i.truncate(0), await i.writeFile(n));
  } finally {
    await i.close();
  }
}
/**
 * 获取输出文件所在目录的固定写视图（按目录缓存并核对目录 inode 未变），pinWriteTarget 遇到符号链接拒绝且临时根不可 realpath 时退化为直接路径。
 */
//@ chunk-1dp9p908.js:16021-17958 layout
async function pinOutputDir(e, n) {
  let i = dirname(e),
    s = basename(e),
    r = E.get(i);
  if (r !== void 0) {
    let c = await r.catch(() => null);
    if (c !== null) {
      let m = (await Promise.all([c.handleStat(), lstat(i)]).then(
        ([T, w]) => T.nlink > 0 && w.isDirectory() && w.ino === T.ino && w.dev === T.dev,
        () => !1,
      ))
        ? c.viewFor(s)
        : null;
      if (m !== null) return m;
      if (E.get(i) === r) E.delete(i);
      await c.release();
    } else if (E.get(i) === r) E.delete(i);
  }
  let o = E.get(i);
  if (o !== void 0 && o !== r) return pinOutputDir(e, n);
  let a = (async () => {
      let c;
      try {
        c = await pinWriteTarget(e, [e], {
          createParents: n?.create ?? !0,
          ...(n?.replaceLeaf && { leaf: "replace" }),
        });
      } catch (error) {
        if (error instanceof SymlinkWriteRefusedError) {
          if (!(await isTempRootResolvable())) {
            if (n?.create ?? !0) await mkdir(dirname(e), { recursive: !0, mode: 448 });
            return {
              ioPath: e,
              canonicalPath: e,
              readExisting: () => Promise.resolve(null),
              recheckBeforeWrite: () => {},
              close: async () => {},
            };
          }
          (logForDebugging(`task output: pin of ${dirname(e)} refused: ${errorMessage(error)}`, {
            level: "warn",
          }),
            refuseOutputSwap(
              e,
              "tasks dir moved or linked",
              `restart Claude Code with CLAUDE_CODE_TMPDIR set to a fresh directory; or, if ${Sx().replace(/[\\/]+$/, "")} is a stray directory or a symbolic link that should not be there, remove that entry itself (not what it points to) and restart`,
            ));
        }
        throw error;
      }
      let match = /^\/proc\/self\/fd\/(\d+)\//.exec(c.ioPath);
      if (match === null) return c;
      let sliced = c.ioPath.slice(0, c.ioPath.length - s.length - 1),
        T = Number(match[1]),
        w = 0,
        v = !1,
        at = !1,
        lt = async () => {
          if (v && w === 0 && !at) ((at = !0), await c.close());
        };
      return {
        handleStat: () => xt(T),
        release: () => ((v = !0), lt()),
        viewFor: (S) => {
          if (v) return null;
          w++;
          let ut = !1;
          return {
            ioPath: `${sliced}/${S}`,
            canonicalPath: join(i, S),
            readExisting: (yt) => refuseSymlinkWrite(`${sliced}/${S}`, join(i, S), getPlatform(), yt),
            recheckBeforeWrite: () => {},
            close: async () => {
              if (!ut) ((ut = !0), w--, await lt());
            },
          };
        },
      };
    })(),
    u = a.then((c) => ("viewFor" in c ? c : Promise.reject(Error("not held"))));
  (u.catch(() => {}), E.set(i, u));
  let p;
  try {
    p = await a;
  } catch (error) {
    if (E.get(i) === u) E.delete(i);
    throw error;
  }
  if (!("viewFor" in p)) {
    if (E.get(i) === u) E.delete(i);
    return p;
  }
  if (E.size > Nt) {
    for (let [c, h] of E)
      if (c !== i) {
        (E.delete(c),
          h.then(
            (m) => m.release(),
            () => {},
          ));
        break;
      }
  }
  return p.viewFor(s) ?? Promise.reject(Error("unreachable: fresh hold retired"));
}
//@ chunk-1dp9p908.js:17958-17964 layout
var Z;
//@ chunk-1dp9p908.js:17964-18120 layout
async function isTempRootResolvable() {
  let e = getClaudeTempDirRealpath();
  if (Z?.root === e) return Z.ok;
  let n = await realpath(e).then(
    () => !0,
    (i) => getErrnoCode(i) !== "EPERM",
  );
  if (n) Z = { root: e, ok: Promise.resolve(!0) };
  return n;
}
//@ chunk-1dp9p908.js:18120-18134 layout
var E = new Map();
//@ chunk-1dp9p908.js:18134-18201 layout
function xt(e) {
  return new Promise((n, i) => fstat(e, (s, r) => (s ? i(s) : n(r))));
}
//@ chunk-1dp9p908.js:18201-18210 layout
var Nt = 8;
//@ chunk-1dp9p908.js:18210-18274 facade-majority
function openTaskOutputForAppend(e, n = "a") {
  return openTaskOutputForAppend_2(e, { exclusive: !1, windowsFlags: n });
}
//@ chunk-1dp9p908.js:18274-18396 facade-majority
function initTaskOutput(e) {
  return track(
    (async () => {
      let n = bindTaskOutputPath(e);
      return (await (await openTaskOutputForAppend_2(n, { exclusive: !0, windowsFlags: "wx" })).close(), n);
    })(),
  );
}
//@ chunk-1dp9p908.js:18396-18435 layout
var mt = Symbol("taskOutputSwapRefused");
//@ chunk-1dp9p908.js:18435-18486 facade-majority
function isTaskOutputSwapRefusal(e) {
  return e instanceof Error && mt in e;
}
/**
 * 抛出"task output swap refused"错误（带恢复建议），写调试日志；同一原因+路径只上报一次 logError（集合有上限）。
 */
//@ chunk-1dp9p908.js:18486-18760 layout
function refuseOutputSwap(path, reason, recovery) {
  let s =
      `task output swap refused (${reason}): ${path}` +
      (recovery === void 0 ? "" : `. To recover: ${recovery}.`),
    merged = Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        s,
        `task output swap refused (${reason})`,
      ),
      { [mt]: !0 },
    );
  logForDebugging(s, { level: "error" });
  let o = `${reason}\x00${path}`;
  if (!W.has(o)) {
    if (W.size >= _t) W.clear();
    (W.add(o), logError(merged));
  }
  throw merged;
}
//@ chunk-1dp9p908.js:18760-18781 layout
var W = new Set(),
  _t = 256;
//@ chunk-1dp9p908.js:18781-19471 facade-majority
async function openVerifiedTaskOutput(e, n) {
  let i;
  try {
    i = await lstat(e);
  } catch (error) {
    let u = getErrnoCode(error);
    if (u === "ELOOP" || u === "ENOTDIR") refuseOutputSwap(e, `lstat refused a swapped path (${u})`);
    throw error;
  }
  if (!i.isFile() || i.nlink !== 1) refuseOutputSwap(e, "not a regular nlink-1 file");
  let s = !1,
    r = i.size > n,
    o;
  try {
    o = await open(
      e,
      s
        ? r
          ? "r+"
          : "r"
        : (r ? constants.O_RDWR : constants.O_RDONLY) | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
    );
  } catch (error) {
    let u = getErrnoCode(error);
    if (
      u === "ELOOP" ||
      u === "EISDIR" ||
      u === "ENOTDIR" ||
      u === "ENXIO" ||
      u === "EOPNOTSUPP" ||
      u === "ENOTSUP"
    )
      refuseOutputSwap(e, `open refused a swapped path (${u})`);
    throw error;
  }
  try {
    let stats = await o.stat();
    if (!stats.isFile() || stats.dev !== i.dev || stats.ino !== i.ino || stats.nlink !== 1)
      refuseOutputSwap(e, "file changed between lstat and open");
    if (r && stats.size > n) await o.truncate(n);
    return { handle: o, size: stats.size };
  } catch (error) {
    throw (await o.close(), error);
  }
}
//@ chunk-1dp9p908.js:19471-19915 facade-majority
async function getVerifiedTaskOutputTail(e, n, i = MAX_TASK_OUTPUT_BYTES) {
  let s;
  try {
    s = await openVerifiedTaskOutput(getTaskOutputPath(e), MAX_TASK_OUTPUT_BYTES);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return { content: "", omittedBytes: 0 };
    throw error;
  }
  let { handle: handle } = s,
    min = Math.min(s.size, MAX_TASK_OUTPUT_BYTES, i);
  try {
    let max = Math.max(0, min - n),
      allocUnsafe = Buffer.allocUnsafe(min - max),
      p = 0;
    while (p < allocUnsafe.length) {
      let { bytesRead: bytesRead } = await handle.read(allocUnsafe, p, allocUnsafe.length - p, max + p);
      if (bytesRead === 0) break;
      p += bytesRead;
    }
    let c = 0;
    while (max > 0 && c < p && (allocUnsafe[c] & 192) === 128) c++;
    return { content: allocUnsafe.toString("utf8", c, p), omittedBytes: max + c };
  } finally {
    await handle.close();
  }
}
//@ chunk-1dp9p908.js:19915-20293 facade-majority
async function persistTaskOutputSnapshot(e, n, i) {
  let { handle: handle, size: size } = await openVerifiedTaskOutput(e, i);
  try {
    let fh = await open(n, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | O_NOFOLLOW_FLAG);
    try {
      let alloc = Buffer.alloc(1048576),
        p = 0;
      while (p < i) {
        let min = Math.min(alloc.length, i - p),
          { bytesRead: bytesRead } = await handle.read(alloc, 0, min, p);
        if (bytesRead === 0) break;
        let m = 0;
        while (m < bytesRead) {
          let { bytesWritten: bytesWritten } = await fh.write(alloc, m, bytesRead - m, p + m);
          m += bytesWritten;
        }
        p += bytesRead;
      }
    } finally {
      await fh.close();
    }
    return size;
  } finally {
    await handle.close();
  }
}
//@ chunk-1dp9p908.js:20293-20424 layout
async function isSameOutputFile(e, n, i = e) {
  if (e === n) return !0;
  try {
    if (!(await lstat(i)).isFile()) return !1;
    return (await realpath(i)) === (await realpath(n));
  } catch {
    return !1;
  }
}
//@ chunk-1dp9p908.js:20424-21301 facade-majority
function initTaskOutputAsSymlink(e, n, i) {
  return track(
    (async () => {
      try {
        let s = bindTaskOutputPath(e),
          r = await pinOutputDir(s, { replaceLeaf: !0 });
        try {
          if (await isSameOutputFile(s, n, r.ioPath)) {
            let a = await readlink(r.ioPath).catch(() => n);
            return (await registerLinkedOutput(s, isInTaskOutputRoot(a) ? a : n), i?.("noop"), s);
          }
          if (isInTaskOutputRoot(n)) await recordLinkTargetIdentity(n);
          let linkedOutputs = getTaskRunState().linkedOutputs;
          (await r.recheckBeforeWrite(),
            await unlink(r.ioPath).catch((a) => {
              if (getErrnoCode(a) !== "ENOENT") throw a;
            }),
            linkedOutputs.set(s, n));
          try {
            try {
              (await r.recheckBeforeWrite(), await symlink(n, r.ioPath));
            } catch (error) {
              if (getErrnoCode(error) !== "EEXIST") throw error;
              (await r.recheckBeforeWrite(),
                await unlink(r.ioPath).catch((u) => {
                  if (getErrnoCode(u) !== "ENOENT") throw u;
                }),
                await r.recheckBeforeWrite(),
                await symlink(n, r.ioPath));
            }
          } catch (error) {
            if (linkedOutputs.get(s) === n) linkedOutputs.delete(s);
            throw error;
          }
          if (
            (await readlink(r.ioPath).catch(() => {
              return;
            })) === n
          )
            linkedOutputs.set(s, n);
        } finally {
          await r.close();
        }
        return (i?.("symlink"), s);
      } catch (error) {
        let r = getErrnoCode(error);
        if ((r && RESOURCE_EXHAUSTION_CODES.has(r)) || r === "EROFS")
          logForDebugging(`initTaskOutputAsSymlink failed (${r}): ${error}`, { level: "error" });
        else if (!isTaskOutputSwapRefusal(error)) logError(error);
        return initTaskOutput(e);
      }
    })(),
  );
}
//@ chunk-c0cahhqh.js:1430-1523 affinity
function isPlainAbsolutePath(e) {
  return e.length <= 1024 && /^(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9_.-]+)+$/.test(e);
}
/**
 * 路径是否为某任务的输出文件（以 /<taskId>.output 结尾）。
 */
//@ chunk-c0cahhqh.js:1523-1583 placement = getAgentOutputTaskId (1)
function isTaskOutputPathFor(e, t) {
  return isPlainAbsolutePath(t) && t.endsWith(`/${e}.output`);
}
//@ chunk-aepeg2w5.js:901197-901268 fingerprint = _clearOutputsForTest (0.46)
async function _clearOutputsForTest(e, n) {
  await withDeadline(Promise.allSettled(e.emitsInFlight), n);
}
//@ chunk-y805ph4h.js:5231-5498 fingerprint = appendTaskOutput (0.465)
function appendTaskOutput_2(taskId, content) {
  let r = Pt();
  if (r.debugFilePath === null) return;
  let i = `${new Date().toISOString()} ${taskId}
`;
  Mt(r).then(() => {
    if (content !== void 0) {
      let m = js(r);
      if (m !== null) content.append(m, [{ data: i }]).catch(() => {});
      return;
    }
    if (r.debugFilePath)
      getFileReader()
        .append(r.debugFilePath, i)
        .catch(() => {});
  });
}

export {
  evictTaskOutput,
  getTaskOutputPath,
  initTaskOutput,
  appendTaskOutput,
  openTaskOutputForAppend,
  taskOutputDirForSession,
  initTaskOutputAsSymlink,
  tailOutputOfTask,
  writeTaskOutputSnapshot,
  MAX_PERSISTED_OUTPUT_BYTES,
  getTaskOutputRootDir,
  persistTaskOutputSnapshot,
  getTaskOutputDelta,
  isTaskOutputFilePath,
  bindTaskOutputForRead,
  getTaskOutputSize,
  tailTaskOutput,
  _clearOutputsForTest,
  getTaskOutputDir,
  getVerifiedTaskOutputTail,
  isTaskOutputSwapRefusal,
  isPlainAbsolutePath,
  isTaskOutputPathFor,
  bindTaskOutputPath,
  DiskTaskOutput,
  openTaskOutputForRead,
  unlinkTaskOutput,
  releaseConvergentTaskOutputBinding,
  MAX_TASK_OUTPUT_BYTES,
  MAX_TASK_OUTPUT_BYTES_DISPLAY,
  probeTaskOutputWrite,
  taskOutputDirExclusions,
  peekTaskOutputDir,
  appendTaskOutputTrailer,
  openVerifiedTaskOutput,
  TASK_OUTPUT_TAIL_BYTES,
  appendTaskOutput_2,
};
