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
import { getClaudeTempDirRealpath, sessionTempDirRealpath } from "../tempDirRealpaths.js";
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
import {
  openNoFollow,
  procFdPath,
  pinWriteTarget,
  refuseSymlinkWrite,
} from "../fsSafety/pathRevalidation.js";
import { getProjectsDir } from "../sessionStorage.js";
import { normalizeCaseForComparison } from "../permissions/filesystem.js";
import { isValidSessionIdForAdopt } from "../background/adopt.js";
import { SymlinkWriteRefusedError } from "../fsSafety/atomicWriteStaging.js";
import { Pt, Mt, js } from "../../../vendor/@anthropic-ai/claude-agent-sdk/transcriptMirror.js";
import { getFileReader } from "../fileStore.js";

//@ chunk-1dp9p908.js:1692-1762 facade-majority = MAX_TASK_OUTPUT_BYTES_DISPLAY (0.861)
var O_NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0;
var DEFAULT_DELTA_BYTES = 8388608;
var MAX_TASK_OUTPUT_BYTES = 5368709120;
var MAX_TASK_OUTPUT_BYTES_DISPLAY = "5GB";
var MAX_PERSISTED_OUTPUT_BYTES = 67108864;
//@ chunk-1dp9p908.js:1762-1789 facade-majority
function getTaskOutputRootDir() {
  return getClaudeTempDirRealpath();
}
//@ chunk-1dp9p908.js:1789-1966 facade-majority
/**
 * 后台任务输出目录 <项目临时目录>/<sessionId>/tasks，每个任务一个 <taskId>.output 文件。
 */
function getTaskOutputDir() {
  let adoptShellOutputRoot = getBgTakeover()?.adoptShellOutputRoot;
  if (adoptShellOutputRoot !== undefined) return join(adoptShellOutputRoot, getSessionId(), "tasks");
  let taskRunState = getTaskRunState();
  if (taskRunState.outputDir === undefined || isDiskless())
    taskRunState.outputDir = join(sessionTempDirRealpath(), getSessionId(), "tasks");
  return taskRunState.outputDir;
}
//@ chunk-1dp9p908.js:1966-2007 facade-majority = getTaskOutputDir (1)
function taskOutputDirForSession(taskId) {
  return join(sessionTempDirRealpath(), taskId, "tasks");
}
//@ chunk-1dp9p908.js:2007-2120 facade-majority
function peekTaskOutputDir() {
  return getBgTakeover()?.adoptShellOutputRoot !== undefined
    ? getTaskOutputDir()
    : ((isDiskless() ? undefined : getTaskRunState().outputDir) ??
        join(sessionTempDirRealpath(), getSessionId(), "tasks"));
}
//@ chunk-1dp9p908.js:2120-2263 layout = getTaskOutputDir (0.761)
function getTaskOutputDir_2() {
  let taskRunState = getTaskRunState();
  if (taskRunState.outputDir === undefined) {
    if (getBgTakeover() !== null) return join(sessionTempDirRealpath(), getSessionId(), "tasks");
    taskRunState.outputDir = join(sessionTempDirRealpath(), getSessionId(), "tasks");
  }
  return taskRunState.outputDir;
}
//@ chunk-1dp9p908.js:2263-2489 facade-majority
/**
 * 任务输出文件路径 <tasks 目录>/<taskId>.output，按 taskId 缓存（diskless 会话抛错）。
 */
function bindTaskOutputPath(e) {
  if (isDiskless()) throw Error("Task output is not written to disk in a diskless session");
  let n = getTaskRunState().outputPathBindings.get(e);
  if (n !== undefined) return n;
  let i = join(getTaskOutputDir(), `${e}.output`);
  getTaskRunState().outputPathBindings.set(e, i);
  return i;
}
//@ chunk-1dp9p908.js:2489-2661 facade-majority = getTaskOutputPath (0.529)
/**
 * 后台任务输出文件路径：<项目临时目录>/<sessionId>/tasks/<taskId>.output（可被绑定覆盖）；diskless 会话抛错。
 */
function getTaskOutputPath(taskId) {
  if (isDiskless()) throw Error("Task output has no file in a diskless session");
  let n = getTaskRunState().outputPathBindings.get(taskId);
  if (n !== undefined) return n;
  return join(getTaskOutputDir_2(), `${taskId}.output`);
}
//@ chunk-1dp9p908.js:2661-2762 callgraph-fingerprint = track (0.508)
function track(p) {
  let pendingOutputOps = getTaskRunState().pendingOutputOps;
  pendingOutputOps.add(p);
  p.finally(() => pendingOutputOps.delete(p)).catch(() => {});
  return p;
}
//@ chunk-1dp9p908.js:2762-2889 layout
var TASK_OUTPUT_FLUSH_BYTES = 16777216;
var OUTPUT_OMITTED_NOTE = `
[output omitted: it could not be written to disk]
`;
var GLUE_LINE_LENGTHS = [50, 100, 200, 400, 800, 1600];
var reduced = GLUE_LINE_LENGTHS.reduce((acc, n) => acc + n, 0);
//@ chunk-1dp9p908.js:2889-5609 facade-majority = DiskTaskOutput (0.323)
class DiskTaskOutput {
  #h;
  #n = null;
  #t = [];
  #w = 0;
  #o = false;
  #e = 0;
  #r = 0;
  #i = false;
  #u = new Set();
  #c = false;
  #s = null;
  #a = null;
  #l = null;
  #d = null;
  constructor(taskId, path) {
    this.#h = path ?? bindTaskOutputPath(taskId);
  }
  append(e) {
    if (this.#o) return;
    this.#w += e.length;
    if (this.#w > MAX_TASK_OUTPUT_BYTES) this.#o = true;
    let n = this.#o
      ? `
[output truncated: exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY} disk cap]
`
      : e;
    this.#t.push(n);
    this.#e += n.length;
    if (!this.#l) {
      this.#l = new Promise((resolve) => {
        this.#d = resolve;
      });
      track(this.#O());
    }
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
    this.#r += 1;
    this.#t.length = 0;
    this.#e = 0;
    this.#s = null;
    this.#a?.abort();
    this.#a = null;
  }
  async #f() {
    while (true) {
      try {
        if (!this.#n) this.#n = await openTaskOutputForAppend(this.#h);
        while (true) {
          let e = this.#r;
          try {
            await this.#m();
          } catch (error) {
            if (this.#r === e) {
              this.#c = true;
              this.#t.unshift(OUTPUT_OMITTED_NOTE);
              this.#e += OUTPUT_OMITTED_NOTE.length;
            }
            throw error;
          }
          if (this.#t.length === 0) break;
        }
      } finally {
        if (this.#n) {
          let e = this.#n;
          this.#n = null;
          await e.close();
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
    let queue = this.#t.splice(0, this.#t.length);
    this.#e = 0;
    this.#s = null;
    let totalLength = 0;
    for (let str of queue) totalLength += Buffer.byteLength(str, "utf8");
    let buffer = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let str of queue) offset += buffer.write(str, offset, "utf8");
    return buffer;
  }
  async #O() {
    try {
      await this.#f();
      this.#p();
    } catch (error) {
      if (this.#g(error) !== null) {
        if (!this.#i) {
          this.#i = true;
          logForDebugging(
            `Task output closing line delayed: its file is busy (EBUSY); trying again for up to ${reduced} ms`,
          );
        }
        for (let [n, i] of GLUE_LINE_LENGTHS.entries()) {
          this.#a ??= new AbortController();
          await sleep(i, this.#a.signal);
          if (this.#t.length === 0) return;
          let s = this.#r;
          try {
            await this.#f();
            this.#p();
            return;
          } catch (error) {
            if (this.#t.length === 0 && this.#r !== s) return;
            let o = this.#g(error);
            if (o === null || n === GLUE_LINE_LENGTHS.length - 1) {
              this.#k(error, o);
              return;
            }
          }
        }
        return;
      }
      if (!this.#i) {
        this.#i = true;
        logForDebugging(`Task output drain failed (will retry once): ${error}`, {
          level: "error",
        });
      }
      if (this.#t.length > 0)
        try {
          await this.#f();
          this.#p();
        } catch (error) {
          this.#k(error, null);
        }
    } finally {
      let e = this.#d;
      this.#l = null;
      this.#d = null;
      e();
    }
  }
  #p() {
    this.#i = false;
    this.#u.clear();
  }
  #g(e) {
    return getPlatform() === "windows" && getErrnoCode(e) === "EBUSY" ? this.#s : null;
  }
  #k(e, n) {
    let errnoCode = getErrnoCode(e);
    let s =
      errnoCode !== undefined && RESOURCE_EXHAUSTION_CODES.has(errnoCode)
        ? "exhaustion"
        : (n ?? "unexpected");
    let r = `${s}:${errnoCode ?? "no errno"}`;
    if (!this.#u.has(r))
      switch ((this.#u.add(r), s)) {
        case "exhaustion":
          logForDebugging(`Task output drain retry failed (${errnoCode}): ${e}`, {
            level: "error",
          });
          break;
        case "exited":
          logForDebugging(
            `Task output closing line not written (EBUSY): the file was still busy after ${reduced} ms`,
            {
              level: "warn",
            },
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
    if (this.#e > TASK_OUTPUT_FLUSH_BYTES) {
      logForDebugging(
        `Task output still cannot be written (${errnoCode ?? "no errno"}); dropped ${this.#e} chars of unwritten output`,
        {
          level: "error",
        },
      );
      this.#c = true;
      this.#t.length = 0;
      this.#t.push(OUTPUT_OMITTED_NOTE);
      this.#e = OUTPUT_OMITTED_NOTE.length;
      this.#s = null;
    }
  }
}
//@ chunk-1dp9p908.js:5609-5708 layout
function getDiskTaskOutput(taskId) {
  let output = getTaskRunState().diskOutputs.get(taskId);
  if (!output) {
    output = new DiskTaskOutput(taskId);
    getTaskRunState().diskOutputs.set(taskId, output);
  }
  return output;
}
//@ chunk-1dp9p908.js:5708-5742 facade-majority
function appendTaskOutput(taskId, content) {
  getDiskTaskOutput(taskId).append(content);
}
//@ chunk-1dp9p908.js:5742-5906 facade-majority
function appendTaskOutputTrailer(taskId, n) {
  let diskTaskOutput = getDiskTaskOutput(taskId);
  if (n === "killed")
    diskTaskOutput.appendTrailer(
      `
[killed]
`,
      "killed",
    );
  else
    diskTaskOutput.appendTrailer(
      `
[exited with code ${n.exitCode ?? "unknown"}]
`,
      "exited",
    );
}
//@ chunk-1dp9p908.js:5906-6185 facade-majority = evictTaskOutput (0.156)
/**
 * 刷新并移除某任务的磁盘输出写入器，释放内存；写失败时记录丢失的字符数。
 */
function evictTaskOutput(taskId) {
  return track(
    (async () => {
      let taskRunState = getTaskRunState();
      let output = taskRunState.diskOutputs.get(taskId);
      if (output) {
        await output.flush();
        if (output.failing && output.unwrittenChars > 0)
          logForDebugging(
            `Task output writer evicted while failing; discarded ${output.unwrittenChars} chars of unwritten output`,
            {
              level: "error",
            },
          );
        taskRunState.diskOutputs.delete(taskId);
      }
      releaseConvergentTaskOutputBinding(taskId);
    })(),
  );
}
//@ chunk-1dp9p908.js:6185-6327 facade-majority = getAgentOutputTaskId (0.778)
/**
 * 若任务输出路径绑定仍指向默认 <dir>/<id>.output，则删除该绑定（归属疑似错误）。
 */
function releaseConvergentTaskOutputBinding(filePath) {
  let n = getTaskRunState().outputPathBindings.get(filePath);
  if (n !== undefined && getBgTakeover() === null && n === join(getTaskOutputDir(), `${filePath}.output`))
    getTaskRunState().outputPathBindings.delete(filePath);
}
//@ chunk-1dp9p908.js:6327-6754 facade-majority = getTaskOutputDelta (0.623)
async function getTaskOutputDelta(taskId, fromOffset, maxBytes = DEFAULT_DELTA_BYTES) {
  try {
    let taskOutputForRead = await openTaskOutputForRead(getTaskOutputPath(taskId));
    if (!taskOutputForRead)
      return {
        content: "",
        newOffset: fromOffset,
      };
    let r;
    try {
      r = await readFileRange(taskOutputForRead, fromOffset, maxBytes);
    } finally {
      await taskOutputForRead.close();
    }
    if (!r)
      return {
        content: "",
        newOffset: fromOffset,
      };
    return {
      content: r.content,
      newOffset: fromOffset + r.bytesRead,
    };
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || isTaskOutputSwapRefusal(e))
      return {
        content: "",
        newOffset: fromOffset,
      };
    if (code && RESOURCE_EXHAUSTION_CODES.has(code))
      logForDebugging(`getTaskOutputDelta failed (${code}): ${e}`, {
        level: "error",
      });
    else logError(e);
    return {
      content: "",
      newOffset: fromOffset,
    };
  }
}
//@ chunk-1dp9p908.js:6754-7203 facade-majority
async function getTaskOutputSize(taskId) {
  try {
    let taskOutputForRead = await openTaskOutputForRead(getTaskOutputPath(taskId));
    if (!taskOutputForRead) return 0;
    try {
      return (await taskOutputForRead.stat()).size;
    } finally {
      await taskOutputForRead.close();
    }
  } catch (error) {
    if (isTaskOutputSwapRefusal(error)) throw error;
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return 0;
    if (errnoCode === "EACCES" || errnoCode === "EPERM") {
      let s = await lstat(getTaskOutputPath(taskId)).catch(() => null);
      if (s !== null && s.isFile() && (s.mode & 256) === 0) return s.size;
      refuseOutputSwap(getTaskOutputPath(taskId), `output no longer measurable (${errnoCode})`);
    }
    if (errnoCode && RESOURCE_EXHAUSTION_CODES.has(errnoCode))
      logForDebugging(`getTaskOutputSize failed (${errnoCode}): ${error}`, {
        level: "error",
      });
    else logError(error);
    return 0;
  }
}
//@ chunk-1dp9p908.js:7203-7594 facade-majority
async function repointTaskOutputSymlinks(oldRoot, newRoot) {
  if (isDiskless()) return;
  let taskRunState = getTaskRunState();
  let s = uniq([
    ...(taskRunState.outputDir !== undefined ? [taskRunState.outputDir] : []),
    ...[...taskRunState.outputPathBindings.values()].map((outputPathBinding) => dirname(outputPathBinding)),
  ]);
  if (s.length === 0) return;
  let oldRootPrefix = oldRoot + sep;
  for (let o of s) {
    let entries;
    try {
      entries = await readdir(o);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT")
        if (errnoCode && RESOURCE_EXHAUSTION_CODES.has(errnoCode))
          logForDebugging(`repointTaskOutputSymlinks readdir failed (${errnoCode}): ${error}`, {
            level: "error",
          });
        else logError(error);
      continue;
    }
    await repointOutputSymlinksInDir(o, entries, oldRootPrefix, oldRoot, newRoot);
  }
}
//@ chunk-1dp9p908.js:7594-8432 layout
/**
 * repointTaskOutputSymlinks 的单目录实现：对目录中每个 .output 符号链接，若指向旧任务输出根则改指到新根（固定写目标、校验链接未被改动、先删后建），并更新 linkedOutputs 登记。
 */
async function repointOutputSymlinksInDir(dir, entries, oldRootPrefix, oldRoot, newRoot) {
  let linkedOutputs = getTaskRunState().linkedOutputs;
  for (let entry of entries) {
    if (!entry.endsWith(".output")) continue;
    let u = join(dir, entry);
    let p = linkedOutputs.get(u);
    let c;
    try {
      c =
        getPlatform() === "windows"
          ? undefined
          : await pinOutputDir(u, {
              replaceLeaf: true,
            });
      let ioPath = c?.ioPath ?? u;
      if (p === undefined && dir === getTaskRunState().outputDir)
        p = await readlink(ioPath)
          .then((w) => adoptInheritedOutputLink(u, ioPath, w))
          .catch(() => {
            return;
          });
      if (p === undefined || !p.startsWith(oldRootPrefix)) continue;
      let m = newRoot + p.slice(oldRoot.length);
      let T = await readlinkOrNull(ioPath);
      if (T === null) continue;
      if (T !== p) refuseOutputSwap(u, "output symlink was re-pointed");
      await c?.recheckBeforeWrite();
      await unlink(ioPath);
      if (linkedOutputs.get(u) === p) await registerLinkedOutput(u, m);
      try {
        await c?.recheckBeforeWrite();
        await symlink(m, ioPath).catch(async (error) => {
          if (getErrnoCode(error) !== "EEXIST") throw error;
          let v = await readlink(ioPath).catch(() => {
            return;
          });
          if (v !== m && v !== linkedOutputs.get(u)) throw error;
        });
      } catch (error) {
        if (linkedOutputs.get(u) === m) linkedOutputs.delete(u);
        throw error;
      }
      if (
        (await readlink(ioPath).catch(() => {
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
//@ chunk-1dp9p908.js:8432-9566 layout
/**
 * 安全地以追加方式打开任务输出文件：无盘会话报错；Windows 直接 open；其余固定写目标后检查叶子——符号链接只允许一跳且指向任务输出根，必须是单链接普通文件，
 * 用 O_NOFOLLOW|O_APPEND 打开（必要时独占创建），并核对打开的文件身份。
 */
async function openTaskOutputForAppend_2(outputPath, options, linkDepth = 0) {
  if (isDiskless()) throw Error("Task output is not written to disk in a diskless session");
  if (getPlatform() === "windows") {
    await mkdir(dirname(outputPath), {
      recursive: true,
    });
    return open(outputPath, options.windowsFlags);
  }
  let pinned = await pinOutputDir(outputPath, {
    replaceLeaf: true,
  });
  try {
    let existing = await getTaskOutputSize_2(pinned.ioPath);
    if (existing?.isSymbolicLink()) {
      let u = await verifyOutputLink(outputPath, pinned.ioPath);
      if (u === null) {
        if (options.relooked) refuseOutputSwap(outputPath, "output leaf changed during open");
        await pinned.close();
        return openTaskOutputForAppend_2(
          outputPath,
          {
            ...options,
            relooked: true,
          },
          linkDepth,
        );
      }
      if (options.exclusive || linkDepth > 0 || !isInTaskOutputRoot(u))
        refuseOutputSwap(outputPath, "output link is not appendable");
      return await openTaskOutputForAppend_2(
        u,
        {
          exclusive: options.exclusive,
          windowsFlags: options.windowsFlags,
        },
        linkDepth + 1,
      );
    }
    if (existing !== null && (!existing.isFile() || (existing.nlink !== 1 && linkDepth === 0)))
      refuseOutputSwap(outputPath, "existing output is not a plain file");
    await pinned.recheckBeforeWrite();
    let o = options.exclusive || existing === null;
    let handle;
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
      if (!options.exclusive && getErrnoCode(error) === "EEXIST" && !options.retried) {
        await pinned.close();
        return openTaskOutputForAppend_2(
          outputPath,
          {
            ...options,
            retried: true,
          },
          linkDepth,
        );
      }
      throw error;
    }
    if (linkDepth > 0 && existing === null) {
      let stats = await handle.stat();
      linkTargetIdentities.set(outputPath, {
        dev: stats.dev,
        ino: stats.ino,
      });
    }
    try {
      await checkOutputIdentity(handle, existing, outputPath, {
        registeredIdentity: linkDepth > 0 ? getRecordedLinkIdentity(outputPath) : undefined,
      });
    } catch (error) {
      await handle.close().catch(() => {});
      throw error;
    }
    return handle;
  } catch (error) {
    throw mapOpenRefusal(error, outputPath);
  } finally {
    await pinned.close();
  }
}
//@ chunk-1dp9p908.js:9566-10657 facade-majority
async function openTaskOutputForRead(taskId, n = 0, i = false) {
  if (getPlatform() === "windows") {
    let taskOutputSize = await getTaskOutputSize_2(taskId);
    if (taskOutputSize === null) return null;
    if (taskOutputSize.isSymbolicLink()) {
      let a = await verifyOutputLink(taskId, taskId);
      if (a === null) {
        if (i) refuseOutputSwap(taskId, "output leaf changed during open");
        return openTaskOutputForRead(taskId, n, true);
      }
      return openLinkTargetForRead(a, n, taskId);
    }
    if (!taskOutputSize.isFile()) refuseOutputSwap(taskId, "not a regular file");
    let o = await open(taskId, "r");
    await checkOutputIdentity(o, taskOutputSize, taskId, {
      anyLinkCount: true,
    });
    return o;
  }
  let s;
  try {
    s = await pinOutputDir(taskId, {
      replaceLeaf: true,
      create: false,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  }
  try {
    let taskOutputSize = await getTaskOutputSize_2(s.ioPath);
    if (taskOutputSize === null) return null;
    if (taskOutputSize.isSymbolicLink()) {
      let a = await verifyOutputLink(taskId, s.ioPath);
      if (a === null) {
        if (i) refuseOutputSwap(taskId, "output leaf changed during open");
        await s.close();
        return openTaskOutputForRead(taskId, n, true);
      }
      return await openLinkTargetForRead(a, n, taskId);
    }
    if (n === 0 && taskOutputSize.isFile() && taskOutputSize.nlink === 0) return null;
    if (!taskOutputSize.isFile() || (taskOutputSize.nlink !== 1 && n === 0))
      refuseOutputSwap(taskId, "not a regular nlink-1 file");
    await s.recheckBeforeWrite();
    let noFollow = await openNoFollow(
      s.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    );
    try {
      if (
        (await checkOutputIdentity(noFollow, taskOutputSize, taskId, {
          registeredIdentity: n > 0 ? getRecordedLinkIdentity(taskId) : undefined,
          unlinkedIsGone: n === 0,
        })) === "gone"
      )
        return null;
    } catch (error) {
      await noFollow.close().catch(() => {});
      throw error;
    }
    return noFollow;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw mapOpenRefusal(error, taskId);
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
  await registerLinkedOutput(e, i);
  return i;
}
//@ chunk-1dp9p908.js:11014-11335 layout
async function verifyOutputLink(e, ioPath) {
  let i = getTaskRunState().linkedOutputs.get(e);
  if (i === undefined) {
    if (!isTaskOutputFilePath(e))
      return refuseOutputSwap(e, "output is an unregistered symlink outside any tasks directory");
    let r = await readlinkOrNull(ioPath);
    if (r === null) return null;
    i = await adoptInheritedOutputLink(e, ioPath, r);
  }
  let s = await readlinkOrNull(ioPath);
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
//@ chunk-1dp9p908.js:11427-11913 layout
/**
 * 打开任务输出链接的目标供读取：指回任务目录时按链深度处理，否则解析真实路径、以不跟随链接方式打开，并核对是普通文件且 inode/设备与 lstat 一致。
 */
async function openLinkTargetForRead(e, n, i) {
  if (isInTaskOutputRoot(e)) {
    if (n > 0) return refuseOutputSwap(i, "output links chain");
    return openTaskOutputForRead(e, n + 1);
  }
  let s;
  let r;
  try {
    let o = await realpath(e);
    if (isInTaskOutputRoot(o)) return refuseOutputSwap(i, "output link leads back into the tasks tree");
    r = await lstat(o);
    s = await openNoFollow(
      o,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    );
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
    await s.close().catch(() => {});
    throw error;
  }
  return s;
}
//@ chunk-1dp9p908.js:11913-11986 layout
function isInTaskOutputRoot(e) {
  let claudeTempDirRealpath = getClaudeTempDirRealpath();
  return (
    e === claudeTempDirRealpath ||
    e.startsWith(claudeTempDirRealpath.endsWith(sep) ? claudeTempDirRealpath : claudeTempDirRealpath + sep)
  );
}
//@ chunk-1dp9p908.js:11986-12078 file-local
async function getTaskOutputSize_2(taskId) {
  try {
    return await lstat(taskId);
  } catch (e) {
    if (getErrnoCode(e) === "ENOENT") return null;
    throw e;
  }
}
//@ chunk-1dp9p908.js:12078-12092 layout
var linkTargetIdentities = new Map();
//@ chunk-1dp9p908.js:12092-12199 layout
function getRecordedLinkIdentity(e) {
  let n = linkTargetIdentities.get(e);
  if (n === undefined) return refuseOutputSwap(e, "link target identity was never recorded");
  return n;
}
//@ chunk-1dp9p908.js:12199-12270 layout
async function registerLinkedOutput(e, n) {
  if (isInTaskOutputRoot(n)) await recordLinkTargetIdentity(n);
  getTaskRunState().linkedOutputs.set(e, n);
}
//@ chunk-1dp9p908.js:12270-12613 layout
/**
 * 记录任务输出链接目标的文件身份：以不跟随链接方式打开，要求是只有一个硬链接的普通文件，保存其 dev/ino。
 */
async function recordLinkTargetIdentity(e) {
  let n = await pinOutputDir(e, {
    replaceLeaf: true,
    create: false,
  });
  try {
    let i = await openNoFollow(
      n.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    ).catch((error) => {
      throw mapOpenRefusal(error, e);
    });
    try {
      let stats = await i.stat();
      if (!stats.isFile() || stats.nlink !== 1)
        refuseOutputSwap(e, "link target is not a regular single-link file");
      linkTargetIdentities.set(e, {
        dev: stats.dev,
        ino: stats.ino,
      });
    } finally {
      await i.close();
    }
  } finally {
    await n.close();
  }
}
//@ chunk-1dp9p908.js:12613-13075 layout
/**
 * 核对已打开的输出文件身份：必须是普通文件、硬链接数/登记身份与打开前一致；可选在文件已被删除（nlink 0）时返回 gone。不一致抛"output file identity changed"。
 */
async function checkOutputIdentity(e, n, i, s) {
  try {
    let stats = await e.stat();
    let registeredIdentity = s?.registeredIdentity;
    if (
      s?.unlinkedIsGone &&
      registeredIdentity === undefined &&
      !s.anyLinkCount &&
      n !== null &&
      stats.isFile() &&
      stats.nlink === 0 &&
      stats.ino === n.ino &&
      stats.dev === n.dev
    ) {
      await e.close().catch(() => {});
      return "gone";
    }
    if (
      !stats.isFile() ||
      (registeredIdentity !== undefined
        ? stats.ino !== registeredIdentity.ino || stats.dev !== registeredIdentity.dev
        : !s?.anyLinkCount && stats.nlink !== 1) ||
      (n !== null && (stats.ino !== n.ino || stats.dev !== n.dev))
    )
      refuseOutputSwap(i, "output file identity changed");
    return "same";
  } catch (error) {
    await e.close().catch(() => {});
    throw error;
  }
}
//@ chunk-1dp9p908.js:13075-13265 layout
function mapOpenRefusal(error, n) {
  let errnoCode = getErrnoCode(error);
  if (
    errnoCode === "ELOOP" ||
    errnoCode === "EISDIR" ||
    errnoCode === "ENOTDIR" ||
    errnoCode === "ENXIO" ||
    errnoCode === "EOPNOTSUPP" ||
    errnoCode === "ENOTSUP"
  )
    try {
      refuseOutputSwap(n, `open refused a swapped leaf (${errnoCode})`);
    } catch (error) {
      return error;
    }
  return error;
}
//@ chunk-1dp9p908.js:13265-13428 layout
function canonicalizeTaskOutputPath(e) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let i = resolve(e);
  if (i.startsWith(taskOutputBaseDir + sep)) return i;
  let fsImplementation = getFsImplementation();
  let r = dirname(dirname(dirname(dirname(i))));
  let { resolvedPath } = safeResolvePath(fsImplementation, r);
  return normalizeCaseForComparison(resolvedPath) === normalizeCaseForComparison(taskOutputBaseDir)
    ? join(taskOutputBaseDir, i.slice(r.length + 1))
    : i;
}
//@ chunk-1dp9p908.js:13428-13467 layout
function getTaskOutputBaseDir() {
  return dirname(dirname(dirname(resolve(getTaskOutputDir()))));
}
//@ chunk-1dp9p908.js:13467-13655 facade-majority = getTaskOutputDir (0.807)
function isTaskOutputFilePath(e) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let fsImplementation = getFsImplementation();
  let s = new Set(
    [taskOutputBaseDir, safeResolvePath(fsImplementation, taskOutputBaseDir).resolvedPath].map((r) =>
      normalizeCaseForComparison(r),
    ),
  );
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
  let e = ["????????-????-????-????-????????????", "session_*", "cse_*"];
  let sessionId = getSessionId();
  if (!isValidSessionIdForAdopt(sessionId) && /^[A-Za-z0-9._-]+$/.test(sessionId)) e.push(sessionId);
  return e;
}
//@ chunk-1dp9p908.js:13800-13838 layout
function isOwnSessionId(e) {
  return isValidSessionIdForAdopt(e) || e === getSessionId();
}
//@ chunk-1dp9p908.js:13838-14616 facade-majority
function taskOutputDirExclusions(canonical) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let fsImplementation = getFsImplementation();
  let s = uniq([taskOutputBaseDir, safeResolvePath(fsImplementation, taskOutputBaseDir).resolvedPath]);
  let r = new Set();
  let o = (u, p) => {
    let c = u.endsWith(sep) ? u : u + sep;
    return normalizeCaseForComparison(p).startsWith(normalizeCaseForComparison(c)) ? p.slice(c.length) : null;
  };
  let a = (u) => u.replaceAll("\\", "/");
  for (let u of getPathsForPermissionCheck(canonical)) {
    let p = resolve(u);
    for (let c of s) {
      let h = basename(c);
      if (normalizeCaseForComparison(p) === normalizeCaseForComparison(c)) {
        for (let w of getSessionDirGlobs()) {
          r.add(`!/*/${w}/tasks/**`);
          r.add(`!**/${h}/*/${w}/tasks/**`);
        }
        continue;
      }
      let m = o(p, c);
      if (m !== null) {
        for (let w of getSessionDirGlobs()) {
          r.add(`!/${a(m)}/*/${w}/tasks/**`);
          r.add(`!**/${h}/*/${w}/tasks/**`);
        }
        continue;
      }
      let T = o(c, p);
      if (T !== null) {
        let parts = T.split(sep);
        if (parts.length === 1)
          for (let v of getSessionDirGlobs()) {
            r.add(`!/${v}/tasks/**`);
            r.add(`!**/${h}/${a(T)}/${v}/tasks/**`);
          }
        else if (!isOwnSessionId(parts[1] ?? ""));
        else if (parts.length === 2) {
          r.add("!/tasks/**");
          r.add(`!**/${h}/${a(T)}/tasks/**`);
        } else if (normalizeCaseForComparison(parts[2] ?? "") === "tasks") r.add("!**");
      }
    }
  }
  return [...r];
}
//@ chunk-1dp9p908.js:14616-15005 facade-majority
async function bindTaskOutputForRead(e) {
  e = canonicalizeTaskOutputPath(e);
  let taskOutputForRead = await openTaskOutputForRead(e);
  if (taskOutputForRead === null) {
    await lstat(e);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `task output ${e} is no longer available (the file it pointed to was removed)`,
      "task output link target removed",
    );
  }
  let platform = getPlatform();
  return {
    ioPath:
      (platform === "linux" || platform === "wsl") &&
      (await readlink(`/proc/self/fd/${taskOutputForRead.fd}`).then(
        () => true,
        () => false,
      ))
        ? procFdPath(taskOutputForRead.fd)
        : platform === "macos"
          ? `/dev/fd/${taskOutputForRead.fd}`
          : e,
    canonicalPath: e,
    handle: taskOutputForRead,
    close: () => taskOutputForRead.close(),
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
  let taskOutputForRead = await openTaskOutputForRead(taskId);
  if (taskOutputForRead === null)
    return {
      content: "",
      bytesRead: 0,
      bytesTotal: 0,
    };
  try {
    return await tailFile(taskOutputForRead, maxBytes);
  } finally {
    await taskOutputForRead.close();
  }
}
//@ chunk-1dp9p908.js:15211-15527 facade-majority
async function unlinkTaskOutput(e) {
  let n = getTaskRunState().linkedOutputs.get(e);
  getTaskRunState().linkedOutputs.delete(e);
  if (n !== undefined) linkTargetIdentities.delete(n);
  if (getPlatform() === "windows") {
    await unlink(e);
    return;
  }
  let i;
  try {
    i = await pinOutputDir(e, {
      replaceLeaf: true,
      create: false,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
  try {
    await i.recheckBeforeWrite();
    await unlink(i.ioPath);
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
      i = await openTaskOutputForAppend_2(n, {
        exclusive: true,
        windowsFlags: "wx",
      });
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
    await unlinkTaskOutput(n).catch((error) => {
      logForDebugging(`probeTaskOutputWrite: could not delete ${n}: ${errorMessage(error)}`);
    });
  }
}
//@ chunk-1dp9p908.js:15878-16021 facade-majority
async function writeTaskOutputSnapshot(outputFile, n) {
  let taskOutputForAppend = await openTaskOutputForAppend_2(outputFile, {
    exclusive: false,
    windowsFlags: "w",
  });
  try {
    await taskOutputForAppend.truncate(0);
    await taskOutputForAppend.writeFile(n);
  } finally {
    await taskOutputForAppend.close();
  }
}
//@ chunk-1dp9p908.js:16021-17958 layout
/**
 * 获取输出文件所在目录的固定写视图（按目录缓存并核对目录 inode 未变），pinWriteTarget 遇到符号链接拒绝且临时根不可 realpath 时退化为直接路径。
 */
async function pinOutputDir(e, n) {
  let i = dirname(e);
  let s = basename(e);
  let r = pinnedOutputDirs.get(i);
  if (r !== undefined) {
    let c = await r.catch(() => null);
    if (c !== null) {
      let m = (await Promise.all([c.handleStat(), lstat(i)]).then(
        ([T, w]) => T.nlink > 0 && w.isDirectory() && w.ino === T.ino && w.dev === T.dev,
        () => false,
      ))
        ? c.viewFor(s)
        : null;
      if (m !== null) return m;
      if (pinnedOutputDirs.get(i) === r) pinnedOutputDirs.delete(i);
      await c.release();
    } else if (pinnedOutputDirs.get(i) === r) pinnedOutputDirs.delete(i);
  }
  let o = pinnedOutputDirs.get(i);
  if (o !== undefined && o !== r) return pinOutputDir(e, n);
  let a = (async () => {
    let c;
    try {
      c = await pinWriteTarget(e, [e], {
        createParents: n?.create ?? true,
        ...(n?.replaceLeaf && {
          leaf: "replace",
        }),
      });
    } catch (error) {
      if (error instanceof SymlinkWriteRefusedError) {
        if (!(await isTempRootResolvable())) {
          if (n?.create ?? true)
            await mkdir(dirname(e), {
              recursive: true,
              mode: 448,
            });
          return {
            ioPath: e,
            canonicalPath: e,
            readExisting: () => Promise.resolve(null),
            recheckBeforeWrite: () => {},
            close: async () => {},
          };
        }
        logForDebugging(`task output: pin of ${dirname(e)} refused: ${errorMessage(error)}`, {
          level: "warn",
        });
        refuseOutputSwap(
          e,
          "tasks dir moved or linked",
          `restart Claude Code with CLAUDE_CODE_TMPDIR set to a fresh directory; or, if ${sessionTempDirRealpath().replace(/[\\/]+$/, "")} is a stray directory or a symbolic link that should not be there, remove that entry itself (not what it points to) and restart`,
        );
      }
      throw error;
    }
    let match = /^\/proc\/self\/fd\/(\d+)\//.exec(c.ioPath);
    if (match === null) return c;
    let sliced = c.ioPath.slice(0, c.ioPath.length - s.length - 1);
    let T = Number(match[1]);
    let w = 0;
    let v = false;
    let at = false;
    let lt = async () => {
      if (v && w === 0 && !at) {
        at = true;
        await c.close();
      }
    };
    return {
      handleStat: () => fstatPromise(T),
      release: () => {
        v = true;
        return lt();
      },
      viewFor: (S) => {
        if (v) return null;
        w++;
        let ut = false;
        return {
          ioPath: `${sliced}/${S}`,
          canonicalPath: join(i, S),
          readExisting: (yt) => refuseSymlinkWrite(`${sliced}/${S}`, join(i, S), getPlatform(), yt),
          recheckBeforeWrite: () => {},
          close: async () => {
            if (!ut) {
              ut = true;
              w--;
              await lt();
            }
          },
        };
      },
    };
  })();
  let u = a.then((c) => ("viewFor" in c ? c : Promise.reject(Error("not held"))));
  u.catch(() => {});
  pinnedOutputDirs.set(i, u);
  let p;
  try {
    p = await a;
  } catch (error) {
    if (pinnedOutputDirs.get(i) === u) pinnedOutputDirs.delete(i);
    throw error;
  }
  if (!("viewFor" in p)) {
    if (pinnedOutputDirs.get(i) === u) pinnedOutputDirs.delete(i);
    return p;
  }
  if (pinnedOutputDirs.size > MAX_PINNED_OUTPUT_DIRS) {
    for (let [c, h] of pinnedOutputDirs)
      if (c !== i) {
        pinnedOutputDirs.delete(c);
        h.then(
          (m) => m.release(),
          () => {},
        );
        break;
      }
  }
  return p.viewFor(s) ?? Promise.reject(Error("unreachable: fresh hold retired"));
}
//@ chunk-1dp9p908.js:17958-17964 layout
var tempRootResolvableCache;
//@ chunk-1dp9p908.js:17964-18120 layout
async function isTempRootResolvable() {
  let claudeTempDirRealpath = getClaudeTempDirRealpath();
  if (tempRootResolvableCache?.root === claudeTempDirRealpath) return tempRootResolvableCache.ok;
  let n = await realpath(claudeTempDirRealpath).then(
    () => true,
    (error) => getErrnoCode(error) !== "EPERM",
  );
  if (n)
    tempRootResolvableCache = {
      root: claudeTempDirRealpath,
      ok: Promise.resolve(true),
    };
  return n;
}
//@ chunk-1dp9p908.js:18120-18134 layout
var pinnedOutputDirs = new Map();
//@ chunk-1dp9p908.js:18134-18201 layout
function fstatPromise(e) {
  return new Promise((resolve, reject) => fstat(e, (s, r) => (s ? reject(s) : resolve(r))));
}
//@ chunk-1dp9p908.js:18201-18210 layout
var MAX_PINNED_OUTPUT_DIRS = 8;
//@ chunk-1dp9p908.js:18210-18274 facade-majority
function openTaskOutputForAppend(path, windowsFlags = "a") {
  return openTaskOutputForAppend_2(path, {
    exclusive: false,
    windowsFlags,
  });
}
//@ chunk-1dp9p908.js:18274-18396 facade-majority
function initTaskOutput(taskId) {
  return track(
    (async () => {
      let n = bindTaskOutputPath(taskId);
      await (
        await openTaskOutputForAppend_2(n, {
          exclusive: true,
          windowsFlags: "wx",
        })
      ).close();
      return n;
    })(),
  );
}
//@ chunk-1dp9p908.js:18396-18435 layout
var OUTPUT_SWAP_REFUSED = Symbol("taskOutputSwapRefused");
//@ chunk-1dp9p908.js:18435-18486 facade-majority
function isTaskOutputSwapRefusal(error) {
  return error instanceof Error && OUTPUT_SWAP_REFUSED in error;
}
//@ chunk-1dp9p908.js:18486-18760 layout
/**
 * 抛出"task output swap refused"错误（带恢复建议），写调试日志；同一原因+路径只上报一次 logError（集合有上限）。
 */
function refuseOutputSwap(path, reason, recovery) {
  let s =
    `task output swap refused (${reason}): ${path}` +
    (recovery === undefined ? "" : `. To recover: ${recovery}.`);
  let merged = Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      s,
      `task output swap refused (${reason})`,
    ),
    {
      [OUTPUT_SWAP_REFUSED]: true,
    },
  );
  logForDebugging(s, {
    level: "error",
  });
  let o = `${reason}\x00${path}`;
  if (!refusedSwapReasons.has(o)) {
    if (refusedSwapReasons.size >= MAX_REFUSED_SWAP_REASONS) refusedSwapReasons.clear();
    refusedSwapReasons.add(o);
    logError(merged);
  }
  throw merged;
}
//@ chunk-1dp9p908.js:18760-18781 layout
var refusedSwapReasons = new Set();
var MAX_REFUSED_SWAP_REASONS = 256;
//@ chunk-1dp9p908.js:18781-19471 facade-majority
async function openVerifiedTaskOutput(e, n) {
  let i;
  try {
    i = await lstat(e);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
      refuseOutputSwap(e, `lstat refused a swapped path (${errnoCode})`);
    throw error;
  }
  if (!i.isFile() || i.nlink !== 1) refuseOutputSwap(e, "not a regular nlink-1 file");
  let s = false;
  let r = i.size > n;
  let o;
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
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === "ELOOP" ||
      errnoCode === "EISDIR" ||
      errnoCode === "ENOTDIR" ||
      errnoCode === "ENXIO" ||
      errnoCode === "EOPNOTSUPP" ||
      errnoCode === "ENOTSUP"
    )
      refuseOutputSwap(e, `open refused a swapped path (${errnoCode})`);
    throw error;
  }
  try {
    let stats = await o.stat();
    if (!stats.isFile() || stats.dev !== i.dev || stats.ino !== i.ino || stats.nlink !== 1)
      refuseOutputSwap(e, "file changed between lstat and open");
    if (r && stats.size > n) await o.truncate(n);
    return {
      handle: o,
      size: stats.size,
    };
  } catch (error) {
    await o.close();
    throw error;
  }
}
//@ chunk-1dp9p908.js:19471-19915 facade-majority
async function getVerifiedTaskOutputTail(e, n, outputFileSize = MAX_TASK_OUTPUT_BYTES) {
  let s;
  try {
    s = await openVerifiedTaskOutput(getTaskOutputPath(e), MAX_TASK_OUTPUT_BYTES);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        content: "",
        omittedBytes: 0,
      };
    throw error;
  }
  let { handle } = s;
  let min = Math.min(s.size, MAX_TASK_OUTPUT_BYTES, outputFileSize);
  try {
    let max = Math.max(0, min - n);
    let u = Buffer.allocUnsafe(min - max);
    let p = 0;
    while (p < u.length) {
      let { bytesRead } = await handle.read(u, p, u.length - p, max + p);
      if (bytesRead === 0) break;
      p += bytesRead;
    }
    let c = 0;
    while (max > 0 && c < p && (u[c] & 192) === 128) c++;
    return {
      content: u.toString("utf8", c, p),
      omittedBytes: max + c,
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-1dp9p908.js:19915-20293 facade-majority
async function persistTaskOutputSnapshot(outputFilePath, toolResultFilePath, i) {
  let { handle, size } = await openVerifiedTaskOutput(outputFilePath, i);
  try {
    let fh = await open(
      toolResultFilePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | O_NOFOLLOW_FLAG,
    );
    try {
      let u = Buffer.alloc(1048576);
      let p = 0;
      while (p < i) {
        let min = Math.min(u.length, i - p);
        let { bytesRead } = await handle.read(u, 0, min, p);
        if (bytesRead === 0) break;
        let m = 0;
        while (m < bytesRead) {
          let { bytesWritten } = await fh.write(u, m, bytesRead - m, p + m);
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
async function isSameOutputFile(e, n, ioPath = e) {
  if (e === n) return true;
  try {
    if (!(await lstat(ioPath)).isFile()) return false;
    return (await realpath(ioPath)) === (await realpath(n));
  } catch {
    return false;
  }
}
//@ chunk-1dp9p908.js:20424-21301 facade-majority
function initTaskOutputAsSymlink(e, n, i) {
  return track(
    (async () => {
      try {
        let s = bindTaskOutputPath(e);
        let r = await pinOutputDir(s, {
          replaceLeaf: true,
        });
        try {
          if (await isSameOutputFile(s, n, r.ioPath)) {
            let a = await readlink(r.ioPath).catch(() => n);
            await registerLinkedOutput(s, isInTaskOutputRoot(a) ? a : n);
            i?.("noop");
            return s;
          }
          if (isInTaskOutputRoot(n)) await recordLinkTargetIdentity(n);
          let linkedOutputs = getTaskRunState().linkedOutputs;
          await r.recheckBeforeWrite();
          await unlink(r.ioPath).catch((error) => {
            if (getErrnoCode(error) !== "ENOENT") throw error;
          });
          linkedOutputs.set(s, n);
          try {
            try {
              await r.recheckBeforeWrite();
              await symlink(n, r.ioPath);
            } catch (error) {
              if (getErrnoCode(error) !== "EEXIST") throw error;
              await r.recheckBeforeWrite();
              await unlink(r.ioPath).catch((error) => {
                if (getErrnoCode(error) !== "ENOENT") throw error;
              });
              await r.recheckBeforeWrite();
              await symlink(n, r.ioPath);
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
        i?.("symlink");
        return s;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if ((errnoCode && RESOURCE_EXHAUSTION_CODES.has(errnoCode)) || errnoCode === "EROFS")
          logForDebugging(`initTaskOutputAsSymlink failed (${errnoCode}): ${error}`, {
            level: "error",
          });
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
//@ chunk-c0cahhqh.js:1523-1583 placement = getAgentOutputTaskId (1)
/**
 * 路径是否为某任务的输出文件（以 /<taskId>.output 结尾）。
 */
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
    if (content !== undefined) {
      let m = js(r);
      if (m !== null)
        content
          .append(m, [
            {
              data: i,
            },
          ])
          .catch(() => {});
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
  peekTaskOutputDir,
  getVerifiedTaskOutputTail,
  isTaskOutputSwapRefusal,
  isPlainAbsolutePath,
  isTaskOutputPathFor,
  MAX_TASK_OUTPUT_BYTES,
  MAX_TASK_OUTPUT_BYTES_DISPLAY,
  bindTaskOutputPath,
  DiskTaskOutput,
  openTaskOutputForRead,
  unlinkTaskOutput,
  releaseConvergentTaskOutputBinding,
  probeTaskOutputWrite,
  taskOutputDirExclusions,
  appendTaskOutputTrailer,
  openVerifiedTaskOutput,
  TASK_OUTPUT_TAIL_BYTES,
  appendTaskOutput_2,
};
