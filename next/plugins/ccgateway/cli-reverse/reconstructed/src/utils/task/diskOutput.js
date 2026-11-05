/**
 * utils/task/diskOutput.ts
 *
 * 后台任务输出文件：<项目临时目录>/<sessionId>/tasks/<taskId>.output 的安全打开、追加、读取与链接校验。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/diskOutput.ts
 * pieces: chunk-3katra73.js (67), chunk-j8qkeqz1.js (2), chunk-tp1gh0pb.js (1)
 * attribution: facade-majority 33, layout 32, callgraph-fingerprint 1, file-local 1, placement 2, fingerprint 1
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
import { sleep } from "../sleep.js";
import { getPlatform } from "../platform.js";
import {
  readFileRange,
  getFsImplementation,
  safeResolvePath,
  getPathsForPermissionCheck,
  tailFile,
} from "../fsOperations.js";
import { normalizeCaseForComparison_2, normalizeCaseForComparison } from "../permissions/filesystem.js";
import {
  openNoFollow,
  procFdPath,
  pinWriteTarget,
  refuseSymlinkWrite,
} from "../fsSafety/pathRevalidation.js";
import { getProjectsDir } from "../sessionStorage.js";
import { isValidSessionIdForAdopt } from "../background/adopt.js";
import { SymlinkWriteRefusedError } from "../fsSafety/atomicWriteStaging.js";
import {
  getDebugState,
  ensureDebugFile,
  getDebugLogMeta,
} from "../../../vendor/@anthropic-ai/claude-agent-sdk/transcriptMirror.js";
import { getFileReader } from "../fileStore.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3katra73.js:1002-1072 facade-majority (2.1.88 match: MAX_TASK_OUTPUT_BYTES_DISPLAY, 0.862)
var O_NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0;
var DEFAULT_DELTA_BYTES = 8388608;
var MAX_TASK_OUTPUT_BYTES = 5368709120;
var MAX_TASK_OUTPUT_BYTES_DISPLAY = "5GB";
var MAX_PERSISTED_OUTPUT_BYTES = 67108864;
//@ chunk-3katra73.js:1072-1099 facade-majority
function getTaskOutputRootDir() {
  return getClaudeTempDirRealpath();
}
//@ chunk-3katra73.js:1099-1276 facade-majority
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
//@ chunk-3katra73.js:1276-1317 facade-majority (2.1.88 match: getTaskOutputDir, 1)
function taskOutputDirForSession(taskId) {
  return join(sessionTempDirRealpath(), taskId, "tasks");
}
//@ chunk-3katra73.js:1317-1430 facade-majority
function peekTaskOutputDir() {
  return getBgTakeover()?.adoptShellOutputRoot !== undefined
    ? getTaskOutputDir()
    : ((isDiskless() ? undefined : getTaskRunState().outputDir) ??
        join(sessionTempDirRealpath(), getSessionId(), "tasks"));
}
//@ chunk-3katra73.js:1430-1573 layout (2.1.88 match: getTaskOutputDir, 0.761)
function getTaskOutputDir_2() {
  let taskRunState = getTaskRunState();
  if (taskRunState.outputDir === undefined) {
    if (getBgTakeover() !== null) return join(sessionTempDirRealpath(), getSessionId(), "tasks");
    taskRunState.outputDir = join(sessionTempDirRealpath(), getSessionId(), "tasks");
  }
  return taskRunState.outputDir;
}
//@ chunk-3katra73.js:1573-1783 facade-majority
/**
 * 任务输出文件路径 <tasks 目录>/<taskId>.output，按 taskId 缓存（diskless 会话抛错）。
 */
function bindTaskOutputPath(taskId) {
  if (isDiskless()) throw Error("Task output is not written to disk in a diskless session");
  let boundPath = getTaskRunState().outputPathBindings.get(taskId);
  if (boundPath !== undefined) return boundPath;
  let defaultPath = unboundTaskOutputPath(taskId);
  getTaskRunState().outputPathBindings.set(taskId, defaultPath);
  return defaultPath;
}
//@ chunk-3katra73.js:1783-1829 facade-majority (2.1.88 match: getAgentOutputTaskId, 1)
function unboundTaskOutputPath(filePath) {
  return join(getTaskOutputDir(), `${filePath}.output`);
}
//@ chunk-3katra73.js:1829-2001 facade-majority (2.1.88 match: getTaskOutputPath, 0.53)
/**
 * 后台任务输出文件路径：<项目临时目录>/<sessionId>/tasks/<taskId>.output（可被绑定覆盖）；diskless 会话抛错。
 */
function getTaskOutputPath(taskId) {
  if (isDiskless()) throw Error("Task output has no file in a diskless session");
  let boundPath = getTaskRunState().outputPathBindings.get(taskId);
  if (boundPath !== undefined) return boundPath;
  return join(getTaskOutputDir_2(), `${taskId}.output`);
}
//@ chunk-3katra73.js:2001-2102 callgraph-fingerprint (2.1.88 match: track, 0.507)
function track(p) {
  let pendingOutputOps = getTaskRunState().pendingOutputOps;
  pendingOutputOps.add(p);
  p.finally(() => pendingOutputOps.delete(p)).catch(() => {});
  return p;
}
//@ chunk-3katra73.js:2102-2227 layout
var TASK_OUTPUT_FLUSH_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OUTPUT_OMITTED_NOTE;
var GLUE_LINE_LENGTHS;
var reduced;
deferInit("chunk-3katra73.js:2102", () => {
  TASK_OUTPUT_FLUSH_BYTES = 16777216;
  OUTPUT_OMITTED_NOTE = `
[output omitted: it could not be written to disk]
`;
  GLUE_LINE_LENGTHS = [50, 100, 200, 400, 800, 1600];
  reduced = GLUE_LINE_LENGTHS.reduce((acc, lineLength) => acc + lineLength, 0);
});
//@ chunk-3katra73.js:2227-4945 facade-majority (2.1.88 match: DiskTaskOutput, 0.323)
class DiskTaskOutput {
  #h;
  #n = null;
  #t = [];
  #p = 0;
  #a = false;
  #e = 0;
  #r = 0;
  #i = false;
  #u = new Set();
  #c = false;
  #s = null;
  #o = null;
  #l = null;
  #d = null;
  constructor(taskId, path) {
    this.#h = path ?? bindTaskOutputPath(taskId);
  }
  append(text) {
    if (this.#a) return;
    this.#p += text.length;
    if (this.#p > MAX_TASK_OUTPUT_BYTES) this.#a = true;
    let textToWrite = this.#a
      ? `
[output truncated: exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY} disk cap]
`
      : text;
    this.#t.push(textToWrite);
    this.#e += textToWrite.length;
    if (!this.#l) {
      this.#l = new Promise((resolve) => {
        this.#d = resolve;
      });
      track(this.#O());
    }
  }
  appendTrailer(trailerText, exitKind) {
    if (!this.#a) this.#s = exitKind;
    this.append(trailerText);
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
    this.#o?.abort();
    this.#o = null;
  }
  async #f() {
    while (true) {
      try {
        if (!this.#n) this.#n = await openTaskOutputForAppend(this.#h);
        while (true) {
          let cancelGeneration = this.#r;
          try {
            await this.#y();
          } catch (error) {
            if (this.#r === cancelGeneration) {
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
          let handle = this.#n;
          this.#n = null;
          await handle.close();
        }
      }
      if (this.#t.length) continue;
      break;
    }
  }
  #y() {
    return this.#n.appendFile(this.#m());
  }
  #m() {
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
      this.#w();
    } catch (error) {
      if (this.#g(error) !== null) {
        if (!this.#i) {
          this.#i = true;
          logForDebugging(
            `Task output closing line delayed: its file is busy (EBUSY); trying again for up to ${reduced} ms`,
          );
        }
        for (let [attempt, delayMs] of GLUE_LINE_LENGTHS.entries()) {
          this.#o ??= new AbortController();
          await sleep(delayMs, this.#o.signal);
          if (this.#t.length === 0) return;
          let cancelGeneration_2 = this.#r;
          try {
            await this.#f();
            this.#w();
            return;
          } catch (error) {
            if (this.#t.length === 0 && this.#r !== cancelGeneration_2) return;
            let glueKind = this.#g(error);
            if (glueKind === null || attempt === GLUE_LINE_LENGTHS.length - 1) {
              this.#k(error, glueKind);
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
          this.#w();
        } catch (error) {
          this.#k(error, null);
        }
    } finally {
      let resolveDrain = this.#d;
      this.#l = null;
      this.#d = null;
      resolveDrain();
    }
  }
  #w() {
    this.#i = false;
    this.#u.clear();
  }
  #g(error) {
    return getPlatform() === "windows" && getErrnoCode(error) === "EBUSY" ? this.#s : null;
  }
  #k(error_2, glueKind_2) {
    let errnoCode = getErrnoCode(error_2);
    let failureKind =
      errnoCode !== undefined && RESOURCE_EXHAUSTION_CODES.has(errnoCode)
        ? "exhaustion"
        : (glueKind_2 ?? "unexpected");
    let failureKey = `${failureKind}:${errnoCode ?? "no errno"}`;
    if (!this.#u.has(failureKey))
      switch ((this.#u.add(failureKey), failureKind)) {
        case "exhaustion":
          logForDebugging(`Task output drain retry failed (${errnoCode}): ${error_2}`, {
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
              error_2,
              `closing line of a stopped shell command not written: output file still busy after ${reduced} ms`,
            ),
          );
          break;
        case "unexpected":
          logError(error_2);
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
//@ chunk-3katra73.js:4945-5044 layout
function getDiskTaskOutput(taskId) {
  let output = getTaskRunState().diskOutputs.get(taskId);
  if (!output) {
    output = new DiskTaskOutput(taskId);
    getTaskRunState().diskOutputs.set(taskId, output);
  }
  return output;
}
//@ chunk-3katra73.js:5044-5078 facade-majority
function appendTaskOutput(taskId, content) {
  getDiskTaskOutput(taskId).append(content);
}
//@ chunk-3katra73.js:5078-5242 facade-majority
function appendTaskOutputTrailer(taskId, outcome) {
  let diskTaskOutput = getDiskTaskOutput(taskId);
  if (outcome === "killed")
    diskTaskOutput.appendTrailer(
      `
[killed]
`,
      "killed",
    );
  else
    diskTaskOutput.appendTrailer(
      `
[exited with code ${outcome.exitCode ?? "unknown"}]
`,
      "exited",
    );
}
//@ chunk-3katra73.js:5242-5521 facade-majority (2.1.88 match: evictTaskOutput, 0.155)
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
//@ chunk-3katra73.js:5521-5663 facade-majority (2.1.88 match: getAgentOutputTaskId, 0.778)
/**
 * 若任务输出路径绑定仍指向默认 <dir>/<id>.output，则删除该绑定（归属疑似错误）。
 */
function releaseConvergentTaskOutputBinding(filePath) {
  let boundPath = getTaskRunState().outputPathBindings.get(filePath);
  if (
    boundPath !== undefined &&
    getBgTakeover() === null &&
    boundPath === join(getTaskOutputDir(), `${filePath}.output`)
  )
    getTaskRunState().outputPathBindings.delete(filePath);
}
//@ chunk-3katra73.js:5663-6090 facade-majority (2.1.88 match: getTaskOutputDelta, 0.622)
async function getTaskOutputDelta(taskId, fromOffset, maxBytes = DEFAULT_DELTA_BYTES) {
  try {
    let taskOutputForRead = await openTaskOutputForRead(getTaskOutputPath(taskId));
    if (!taskOutputForRead)
      return {
        content: "",
        newOffset: fromOffset,
      };
    let range;
    try {
      range = await readFileRange(taskOutputForRead, fromOffset, maxBytes);
    } finally {
      await taskOutputForRead.close();
    }
    if (!range)
      return {
        content: "",
        newOffset: fromOffset,
      };
    return {
      content: range.content,
      newOffset: fromOffset + range.bytesRead,
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
//@ chunk-3katra73.js:6090-6539 facade-majority
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
      let stats = await lstat(getTaskOutputPath(taskId)).catch(() => null);
      if (stats !== null && stats.isFile() && (stats.mode & 256) === 0) return stats.size;
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
//@ chunk-3katra73.js:6539-6930 facade-majority
async function repointTaskOutputSymlinks(oldRoot, newRoot) {
  if (isDiskless()) return;
  let taskRunState = getTaskRunState();
  let dirs = normalizeCaseForComparison_2([
    ...(taskRunState.outputDir !== undefined ? [taskRunState.outputDir] : []),
    ...[...taskRunState.outputPathBindings.values()].map((outputPathBinding) => dirname(outputPathBinding)),
  ]);
  if (dirs.length === 0) return;
  let oldRootPrefix = oldRoot + sep;
  for (let dir of dirs) {
    let entries;
    try {
      entries = await readdir(dir);
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
    await repointOutputSymlinksInDir(dir, entries, oldRootPrefix, oldRoot, newRoot);
  }
}
//@ chunk-3katra73.js:6930-7768 layout
/**
 * repointTaskOutputSymlinks 的单目录实现：对目录中每个 .output 符号链接，若指向旧任务输出根则改指到新根（固定写目标、校验链接未被改动、先删后建），并更新 linkedOutputs 登记。
 */
async function repointOutputSymlinksInDir(dir, entries, oldRootPrefix, oldRoot, newRoot) {
  let linkedOutputs = getTaskRunState().linkedOutputs;
  for (let entry of entries) {
    if (!entry.endsWith(".output")) continue;
    let outputPath = join(dir, entry);
    let linkedTarget = linkedOutputs.get(outputPath);
    let pinned;
    try {
      pinned =
        getPlatform() === "windows"
          ? undefined
          : await pinOutputDir(outputPath, {
              replaceLeaf: true,
            });
      let ioPath = pinned?.ioPath ?? outputPath;
      if (linkedTarget === undefined && dir === getTaskRunState().outputDir)
        linkedTarget = await readlink(ioPath)
          .then((target) => adoptInheritedOutputLink(outputPath, ioPath, target))
          .catch(() => {
            return;
          });
      if (linkedTarget === undefined || !linkedTarget.startsWith(oldRootPrefix)) continue;
      let newTarget = newRoot + linkedTarget.slice(oldRoot.length);
      let currentTarget = await readlinkOrNull(ioPath);
      if (currentTarget === null) continue;
      if (currentTarget !== linkedTarget) refuseOutputSwap(outputPath, "output symlink was re-pointed");
      await pinned?.recheckBeforeWrite();
      await unlink(ioPath);
      if (linkedOutputs.get(outputPath) === linkedTarget) await registerLinkedOutput(outputPath, newTarget);
      try {
        await pinned?.recheckBeforeWrite();
        await symlink(newTarget, ioPath).catch(async (error) => {
          if (getErrnoCode(error) !== "EEXIST") throw error;
          let existingTarget = await readlink(ioPath).catch(() => {
            return;
          });
          if (existingTarget !== newTarget && existingTarget !== linkedOutputs.get(outputPath)) throw error;
        });
      } catch (error) {
        if (linkedOutputs.get(outputPath) === newTarget) linkedOutputs.delete(outputPath);
        throw error;
      }
      if (
        (await readlink(ioPath).catch(() => {
          return;
        })) === newTarget
      )
        linkedOutputs.set(outputPath, newTarget);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT" && !isTaskOutputSwapRefusal(error)) logError(error);
    } finally {
      await pinned?.close();
    }
  }
}
//@ chunk-3katra73.js:7768-8902 layout
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
      let linkTarget = await verifyOutputLink(outputPath, pinned.ioPath);
      if (linkTarget === null) {
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
      if (options.exclusive || linkDepth > 0 || !isInTaskOutputRoot(linkTarget))
        refuseOutputSwap(outputPath, "output link is not appendable");
      return await openTaskOutputForAppend_2(
        linkTarget,
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
    let creating = options.exclusive || existing === null;
    let handle;
    try {
      handle = await openNoFollow(
        pinned.ioPath,
        constants.O_WRONLY |
          constants.O_APPEND |
          (creating ? constants.O_CREAT | constants.O_EXCL : 0) |
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
//@ chunk-3katra73.js:8902-9993 facade-majority
async function openTaskOutputForRead(outputPath, linkDepth = 0, relooked = false) {
  if (getPlatform() === "windows") {
    let existing = await getTaskOutputSize_2(outputPath);
    if (existing === null) return null;
    if (existing.isSymbolicLink()) {
      let linkTarget = await verifyOutputLink(outputPath, outputPath);
      if (linkTarget === null) {
        if (relooked) refuseOutputSwap(outputPath, "output leaf changed during open");
        return openTaskOutputForRead(outputPath, linkDepth, true);
      }
      return openLinkTargetForRead(linkTarget, linkDepth, outputPath);
    }
    if (!existing.isFile()) refuseOutputSwap(outputPath, "not a regular file");
    let handle = await open(outputPath, "r");
    await checkOutputIdentity(handle, existing, outputPath, {
      anyLinkCount: true,
    });
    return handle;
  }
  let pinned;
  try {
    pinned = await pinOutputDir(outputPath, {
      replaceLeaf: true,
      create: false,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  }
  try {
    let existing = await getTaskOutputSize_2(pinned.ioPath);
    if (existing === null) return null;
    if (existing.isSymbolicLink()) {
      let linkTarget_2 = await verifyOutputLink(outputPath, pinned.ioPath);
      if (linkTarget_2 === null) {
        if (relooked) refuseOutputSwap(outputPath, "output leaf changed during open");
        await pinned.close();
        return openTaskOutputForRead(outputPath, linkDepth, true);
      }
      return await openLinkTargetForRead(linkTarget_2, linkDepth, outputPath);
    }
    if (linkDepth === 0 && existing.isFile() && existing.nlink === 0) return null;
    if (!existing.isFile() || (existing.nlink !== 1 && linkDepth === 0))
      refuseOutputSwap(outputPath, "not a regular nlink-1 file");
    await pinned.recheckBeforeWrite();
    let handle = await openNoFollow(
      pinned.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    );
    try {
      if (
        (await checkOutputIdentity(handle, existing, outputPath, {
          registeredIdentity: linkDepth > 0 ? getRecordedLinkIdentity(outputPath) : undefined,
          unlinkedIsGone: linkDepth === 0,
        })) === "gone"
      )
        return null;
    } catch (error) {
      await handle.close().catch(() => {});
      throw error;
    }
    return handle;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw mapOpenRefusal(error, outputPath);
  } finally {
    await pinned.close();
  }
}
//@ chunk-3katra73.js:9993-10350 layout
async function adoptInheritedOutputLink(outputPath, ioPath, linkTarget) {
  let inProjects = isAbsolute(linkTarget) && resolve(linkTarget).startsWith(resolve(getProjectsDir()) + sep);
  if (!isAbsolute(linkTarget) || (!isInTaskOutputRoot(linkTarget) && !inProjects))
    return refuseOutputSwap(
      outputPath,
      "output is an unregistered symlink of a shape this session does not create",
    );
  let stats = await lstat(ioPath);
  if (
    !stats.isSymbolicLink() ||
    stats.ctimeMs >= getTaskRunState().linksInheritedBeforeFor(dirname(outputPath))
  )
    return refuseOutputSwap(outputPath, "output is an unregistered symlink made during this session");
  await registerLinkedOutput(outputPath, linkTarget);
  return linkTarget;
}
//@ chunk-3katra73.js:10350-10671 layout
async function verifyOutputLink(outputPath, ioPath) {
  let linkedTarget = getTaskRunState().linkedOutputs.get(outputPath);
  if (linkedTarget === undefined) {
    if (!isTaskOutputFilePath(outputPath))
      return refuseOutputSwap(outputPath, "output is an unregistered symlink outside any tasks directory");
    let linkTarget = await readlinkOrNull(ioPath);
    if (linkTarget === null) return null;
    linkedTarget = await adoptInheritedOutputLink(outputPath, ioPath, linkTarget);
  }
  let currentTarget = await readlinkOrNull(ioPath);
  if (currentTarget === null) return null;
  if (currentTarget !== linkedTarget) return refuseOutputSwap(outputPath, "output symlink was re-pointed");
  return linkedTarget;
}
//@ chunk-3katra73.js:10671-10763 layout
async function readlinkOrNull(path) {
  try {
    return await readlink(path);
  } catch (error) {
    if (getErrnoCode(error) === "EINVAL") return null;
    throw error;
  }
}
//@ chunk-3katra73.js:10763-11249 layout
/**
 * 打开任务输出链接的目标供读取：指回任务目录时按链深度处理，否则解析真实路径、以不跟随链接方式打开，并核对是普通文件且 inode/设备与 lstat 一致。
 */
async function openLinkTargetForRead(linkTarget, linkDepth, outputPath) {
  if (isInTaskOutputRoot(linkTarget)) {
    if (linkDepth > 0) return refuseOutputSwap(outputPath, "output links chain");
    return openTaskOutputForRead(linkTarget, linkDepth + 1);
  }
  let handle;
  let stats;
  try {
    let realTarget = await realpath(linkTarget);
    if (isInTaskOutputRoot(realTarget))
      return refuseOutputSwap(outputPath, "output link leads back into the tasks tree");
    stats = await lstat(realTarget);
    handle = await openNoFollow(
      realTarget,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    );
  } catch (error) {
    if (isTaskOutputSwapRefusal(error)) throw error;
    if (getErrnoCode(error) === "ENOENT") return null;
    throw mapOpenRefusal(error, outputPath);
  }
  try {
    let stats_2 = await handle.stat();
    if (!stats_2.isFile() || stats_2.ino !== stats.ino || stats_2.dev !== stats.dev)
      refuseOutputSwap(outputPath, "link target is not a regular file");
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
  return handle;
}
//@ chunk-3katra73.js:11249-11322 layout
function isInTaskOutputRoot(path) {
  let claudeTempDirRealpath = getClaudeTempDirRealpath();
  return (
    path === claudeTempDirRealpath ||
    path.startsWith(claudeTempDirRealpath.endsWith(sep) ? claudeTempDirRealpath : claudeTempDirRealpath + sep)
  );
}
//@ chunk-3katra73.js:11322-11414 file-local
async function getTaskOutputSize_2(taskId) {
  try {
    return await lstat(taskId);
  } catch (e) {
    if (getErrnoCode(e) === "ENOENT") return null;
    throw e;
  }
}
//@ chunk-3katra73.js:11414-11428 layout
var linkTargetIdentities; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3katra73.js:11414", () => {
  linkTargetIdentities = new Map();
});
//@ chunk-3katra73.js:11428-11535 layout
function getRecordedLinkIdentity(outputPath) {
  let identity = linkTargetIdentities.get(outputPath);
  if (identity === undefined) return refuseOutputSwap(outputPath, "link target identity was never recorded");
  return identity;
}
//@ chunk-3katra73.js:11535-11606 layout
async function registerLinkedOutput(outputPath, linkTarget) {
  if (isInTaskOutputRoot(linkTarget)) await recordLinkTargetIdentity(linkTarget);
  getTaskRunState().linkedOutputs.set(outputPath, linkTarget);
}
//@ chunk-3katra73.js:11606-11949 layout
/**
 * 记录任务输出链接目标的文件身份：以不跟随链接方式打开，要求是只有一个硬链接的普通文件，保存其 dev/ino。
 */
async function recordLinkTargetIdentity(outputPath) {
  let pinned = await pinOutputDir(outputPath, {
    replaceLeaf: true,
    create: false,
  });
  try {
    let handle = await openNoFollow(
      pinned.ioPath,
      constants.O_RDONLY | O_NOFOLLOW_FLAG | (constants.O_NONBLOCK ?? 0),
      getPlatform(),
    ).catch((error) => {
      throw mapOpenRefusal(error, outputPath);
    });
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.nlink !== 1)
        refuseOutputSwap(outputPath, "link target is not a regular single-link file");
      linkTargetIdentities.set(outputPath, {
        dev: stats.dev,
        ino: stats.ino,
      });
    } finally {
      await handle.close();
    }
  } finally {
    await pinned.close();
  }
}
//@ chunk-3katra73.js:11949-12411 layout
/**
 * 核对已打开的输出文件身份：必须是普通文件、硬链接数/登记身份与打开前一致；可选在文件已被删除（nlink 0）时返回 gone。不一致抛"output file identity changed"。
 */
async function checkOutputIdentity(handle, existing, outputPath, opts) {
  try {
    let stats = await handle.stat();
    let registeredIdentity = opts?.registeredIdentity;
    if (
      opts?.unlinkedIsGone &&
      registeredIdentity === undefined &&
      !opts.anyLinkCount &&
      existing !== null &&
      stats.isFile() &&
      stats.nlink === 0 &&
      stats.ino === existing.ino &&
      stats.dev === existing.dev
    ) {
      await handle.close().catch(() => {});
      return "gone";
    }
    if (
      !stats.isFile() ||
      (registeredIdentity !== undefined
        ? stats.ino !== registeredIdentity.ino || stats.dev !== registeredIdentity.dev
        : !opts?.anyLinkCount && stats.nlink !== 1) ||
      (existing !== null && (stats.ino !== existing.ino || stats.dev !== existing.dev))
    )
      refuseOutputSwap(outputPath, "output file identity changed");
    return "same";
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}
//@ chunk-3katra73.js:12411-12601 layout
function mapOpenRefusal(error, path) {
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
      refuseOutputSwap(path, `open refused a swapped leaf (${errnoCode})`);
    } catch (error) {
      return error;
    }
  return error;
}
//@ chunk-3katra73.js:12601-12764 layout
function canonicalizeTaskOutputPath(path) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let resolved = resolve(path);
  if (resolved.startsWith(taskOutputBaseDir + sep)) return resolved;
  let fsImplementation = getFsImplementation();
  let ancestorDir = dirname(dirname(dirname(dirname(resolved))));
  let { resolvedPath } = safeResolvePath(fsImplementation, ancestorDir);
  return normalizeCaseForComparison(resolvedPath) === normalizeCaseForComparison(taskOutputBaseDir)
    ? join(taskOutputBaseDir, resolved.slice(ancestorDir.length + 1))
    : resolved;
}
//@ chunk-3katra73.js:12764-12803 layout
function getTaskOutputBaseDir() {
  return dirname(dirname(dirname(resolve(getTaskOutputDir()))));
}
//@ chunk-3katra73.js:12803-12991 facade-majority (2.1.88 match: getTaskOutputDir, 0.807)
function isTaskOutputFilePath(path) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let fsImplementation = getFsImplementation();
  let baseDirVariants = new Set(
    [taskOutputBaseDir, safeResolvePath(fsImplementation, taskOutputBaseDir).resolvedPath].map((variant) =>
      normalizeCaseForComparison(variant),
    ),
  );
  return getPathsForPermissionCheck(path).some((pathVariant) => {
    let tasksDir = dirname(resolve(pathVariant));
    return (
      normalizeCaseForComparison(basename(tasksDir)) === "tasks" &&
      isOwnSessionId(basename(dirname(tasksDir))) &&
      baseDirVariants.has(normalizeCaseForComparison(dirname(dirname(dirname(tasksDir)))))
    );
  });
}
//@ chunk-3katra73.js:12991-13136 layout
function getSessionDirGlobs() {
  let globs = ["????????-????-????-????-????????????", "session_*", "cse_*"];
  let sessionId = getSessionId();
  if (!isValidSessionIdForAdopt(sessionId) && /^[A-Za-z0-9._-]+$/.test(sessionId)) globs.push(sessionId);
  return globs;
}
//@ chunk-3katra73.js:13136-13174 layout
function isOwnSessionId(sessionId) {
  return isValidSessionIdForAdopt(sessionId) || sessionId === getSessionId();
}
//@ chunk-3katra73.js:13174-13952 facade-majority
function taskOutputDirExclusions(canonical) {
  let taskOutputBaseDir = getTaskOutputBaseDir();
  let fsImplementation = getFsImplementation();
  let baseDirs = normalizeCaseForComparison_2([
    taskOutputBaseDir,
    safeResolvePath(fsImplementation, taskOutputBaseDir).resolvedPath,
  ]);
  let exclusions = new Set();
  let relativeUnder = (base, path) => {
    let basePrefix = base.endsWith(sep) ? base : base + sep;
    return normalizeCaseForComparison(path).startsWith(normalizeCaseForComparison(basePrefix))
      ? path.slice(basePrefix.length)
      : null;
  };
  let toPosix = (relativePath) => relativePath.replaceAll("\\", "/");
  for (let path_2 of getPathsForPermissionCheck(canonical)) {
    let resolved = resolve(path_2);
    for (let baseDir of baseDirs) {
      let baseDirName = basename(baseDir);
      if (normalizeCaseForComparison(resolved) === normalizeCaseForComparison(baseDir)) {
        for (let sessionGlob of getSessionDirGlobs()) {
          exclusions.add(`!/*/${sessionGlob}/tasks/**`);
          exclusions.add(`!**/${baseDirName}/*/${sessionGlob}/tasks/**`);
        }
        continue;
      }
      let pathUnderBase = relativeUnder(resolved, baseDir);
      if (pathUnderBase !== null) {
        for (let sessionGlob_2 of getSessionDirGlobs()) {
          exclusions.add(`!/${toPosix(pathUnderBase)}/*/${sessionGlob_2}/tasks/**`);
          exclusions.add(`!**/${baseDirName}/*/${sessionGlob_2}/tasks/**`);
        }
        continue;
      }
      let baseUnderPath = relativeUnder(baseDir, resolved);
      if (baseUnderPath !== null) {
        let parts = baseUnderPath.split(sep);
        if (parts.length === 1)
          for (let sessionGlob_3 of getSessionDirGlobs()) {
            exclusions.add(`!/${sessionGlob_3}/tasks/**`);
            exclusions.add(`!**/${baseDirName}/${toPosix(baseUnderPath)}/${sessionGlob_3}/tasks/**`);
          }
        else if (!isOwnSessionId(parts[1] ?? ""));
        else if (parts.length === 2) {
          exclusions.add("!/tasks/**");
          exclusions.add(`!**/${baseDirName}/${toPosix(baseUnderPath)}/tasks/**`);
        } else if (normalizeCaseForComparison(parts[2] ?? "") === "tasks") exclusions.add("!**");
      }
    }
  }
  return [...exclusions];
}
//@ chunk-3katra73.js:13952-14341 facade-majority
async function bindTaskOutputForRead(path) {
  path = canonicalizeTaskOutputPath(path);
  let taskOutputForRead = await openTaskOutputForRead(path);
  if (taskOutputForRead === null) {
    await lstat(path);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `task output ${path} is no longer available (the file it pointed to was removed)`,
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
          : path,
    canonicalPath: path,
    handle: taskOutputForRead,
    close: () => taskOutputForRead.close(),
  };
}
//@ chunk-3katra73.js:14341-14354 facade-majority
var TASK_OUTPUT_TAIL_BYTES = 8192;
//@ chunk-3katra73.js:14354-14398 facade-majority
async function tailOutputOfTask(taskId) {
  return tailTaskOutput(getTaskOutputPath(taskId), TASK_OUTPUT_TAIL_BYTES);
}
//@ chunk-3katra73.js:14398-14547 facade-majority (2.1.88 match: getTaskOutput, 1)
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
//@ chunk-3katra73.js:14547-14863 facade-majority
async function unlinkTaskOutput(path) {
  let linkedTarget = getTaskRunState().linkedOutputs.get(path);
  getTaskRunState().linkedOutputs.delete(path);
  if (linkedTarget !== undefined) linkTargetIdentities.delete(linkedTarget);
  if (getPlatform() === "windows") {
    await unlink(path);
    return;
  }
  let pinned;
  try {
    pinned = await pinOutputDir(path, {
      replaceLeaf: true,
      create: false,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
  try {
    await pinned.recheckBeforeWrite();
    await unlink(pinned.ioPath);
  } finally {
    await pinned.close();
  }
}
//@ chunk-3katra73.js:14863-14891 layout
var uint8Array; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3katra73.js:14863", () => {
  uint8Array = new Uint8Array([10]);
});
//@ chunk-3katra73.js:14891-15214 facade-majority
async function probeTaskOutputWrite(path) {
  let probePath = `${path}.${randomBytes(6).toString("hex")}.probe`;
  try {
    let handle;
    try {
      handle = await openTaskOutputForAppend_2(probePath, {
        exclusive: true,
        windowsFlags: "wx",
      });
    } catch {
      return null;
    }
    try {
      await handle.write(uint8Array);
    } finally {
      await handle.close();
    }
    return null;
  } catch (error) {
    return getErrnoCode(error) ?? null;
  } finally {
    await unlinkTaskOutput(probePath).catch((error) => {
      logForDebugging(`probeTaskOutputWrite: could not delete ${probePath}: ${errorMessage(error)}`);
    });
  }
}
//@ chunk-3katra73.js:15214-15357 facade-majority
async function writeTaskOutputSnapshot(outputFile, data) {
  let taskOutputForAppend = await openTaskOutputForAppend_2(outputFile, {
    exclusive: false,
    windowsFlags: "w",
  });
  try {
    await taskOutputForAppend.truncate(0);
    await taskOutputForAppend.writeFile(data);
  } finally {
    await taskOutputForAppend.close();
  }
}
//@ chunk-3katra73.js:15357-16033 layout
async function pinOutputPath(outputPath, options) {
  try {
    return await pinWriteTarget(outputPath, [outputPath], {
      createParents: options?.create ?? true,
      ...(options?.replaceLeaf && {
        leaf: "replace",
      }),
    });
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) {
      if (!(await isTempRootResolvable())) {
        if (options?.create ?? true)
          await mkdir(dirname(outputPath), {
            recursive: true,
            mode: 448,
          });
        return {
          ioPath: outputPath,
          canonicalPath: outputPath,
          readExisting: () => Promise.resolve(null),
          recheckBeforeWrite: () => {},
          close: async () => {},
        };
      }
      logForDebugging(`task output: pin of ${dirname(outputPath)} refused: ${errorMessage(error)}`, {
        level: "warn",
      });
      refuseOutputSwap(
        outputPath,
        "tasks dir moved or linked",
        `restart Claude Code with CLAUDE_CODE_TMPDIR set to a fresh directory; or, if ${sessionTempDirRealpath().replace(/[\\/]+$/, "")} is a stray directory or a symbolic link that should not be there, remove that entry itself (not what it points to) and restart`,
      );
    }
    throw error;
  }
}
//@ chunk-3katra73.js:16033-17349 layout
/**
 * 获取输出文件所在目录的固定写视图（按目录缓存并核对目录 inode 未变），pinWriteTarget 遇到符号链接拒绝且临时根不可 realpath 时退化为直接路径。
 */
async function pinOutputDir(outputPath, options) {
  let dir = dirname(outputPath);
  let name = basename(outputPath);
  let existingHold = pinnedOutputDirs.get(dir);
  if (existingHold !== undefined) {
    let held = await existingHold.catch(() => null);
    if (held !== null) {
      let view = (await Promise.all([held.handleStat(), lstat(dir)]).then(
        ([dirStats, dirStat]) =>
          dirStats.nlink > 0 &&
          dirStat.isDirectory() &&
          dirStat.ino === dirStats.ino &&
          dirStat.dev === dirStats.dev,
        () => false,
      ))
        ? held.viewFor(name)
        : null;
      if (view !== null) return view;
      if (pinnedOutputDirs.get(dir) === existingHold) pinnedOutputDirs.delete(dir);
      await held.release();
    } else {
      if (pinnedOutputDirs.get(dir) === existingHold) pinnedOutputDirs.delete(dir);
      return pinOutputPath(outputPath, options);
    }
  }
  let otherHold = pinnedOutputDirs.get(dir);
  if (otherHold !== undefined && otherHold !== existingHold) return pinOutputDir(outputPath, options);
  let holdPromise = (async () => {
    let pinned = await pinOutputPath(outputPath, options);
    let match = /^\/proc\/self\/fd\/(\d+)\//.exec(pinned.ioPath);
    if (match === null) return pinned;
    let sliced = pinned.ioPath.slice(0, pinned.ioPath.length - name.length - 1);
    let fd = Number(match[1]);
    let openViews = 0;
    let released = false;
    let closeStarted = false;
    let closeIfIdle = async () => {
      if (released && openViews === 0 && !closeStarted) {
        closeStarted = true;
        await pinned.close();
      }
    };
    return {
      handleStat: () => fstatPromise(fd),
      release: () => {
        released = true;
        return closeIfIdle();
      },
      viewFor: (leafName) => {
        if (released) return null;
        openViews++;
        let closed = false;
        return {
          ioPath: `${sliced}/${leafName}`,
          canonicalPath: join(dir, leafName),
          readExisting: (existing) =>
            refuseSymlinkWrite(`${sliced}/${leafName}`, join(dir, leafName), getPlatform(), existing),
          recheckBeforeWrite: () => {},
          close: async () => {
            if (!closed) {
              closed = true;
              openViews--;
              await closeIfIdle();
            }
          },
        };
      },
    };
  })();
  let holdViewPromise = holdPromise.then((hold) =>
    "viewFor" in hold ? hold : Promise.reject(Error("not held")),
  );
  holdViewPromise.catch(() => {});
  pinnedOutputDirs.set(dir, holdViewPromise);
  let wonHold;
  try {
    wonHold = await holdPromise;
  } catch (error) {
    if (pinnedOutputDirs.get(dir) === holdViewPromise) pinnedOutputDirs.delete(dir);
    throw error;
  }
  if (!("viewFor" in wonHold)) {
    if (pinnedOutputDirs.get(dir) === holdViewPromise) pinnedOutputDirs.delete(dir);
    return wonHold;
  }
  if (pinnedOutputDirs.size > MAX_PINNED_OUTPUT_DIRS) {
    for (let [dirKey, holdPromise_2] of pinnedOutputDirs)
      if (dirKey !== dir) {
        pinnedOutputDirs.delete(dirKey);
        holdPromise_2.then(
          (held_2) => held_2.release(),
          () => {},
        );
        break;
      }
  }
  return wonHold.viewFor(name) ?? Promise.reject(Error("unreachable: fresh hold retired"));
}
//@ chunk-3katra73.js:17349-17355 layout
var tempRootResolvableCache;
//@ chunk-3katra73.js:17355-17511 layout
async function isTempRootResolvable() {
  let claudeTempDirRealpath = getClaudeTempDirRealpath();
  if (tempRootResolvableCache?.root === claudeTempDirRealpath) return tempRootResolvableCache.ok;
  let resolvable = await realpath(claudeTempDirRealpath).then(
    () => true,
    (error) => getErrnoCode(error) !== "EPERM",
  );
  if (resolvable)
    tempRootResolvableCache = {
      root: claudeTempDirRealpath,
      ok: Promise.resolve(true),
    };
  return resolvable;
}
//@ chunk-3katra73.js:17511-17525 layout
var pinnedOutputDirs; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3katra73.js:17511", () => {
  pinnedOutputDirs = new Map();
});
//@ chunk-3katra73.js:17525-17592 layout
function fstatPromise(fd) {
  return new Promise((resolve, reject) =>
    fstat(fd, (error, stats) => (error ? reject(error) : resolve(stats))),
  );
}
//@ chunk-3katra73.js:17592-17601 layout
var MAX_PINNED_OUTPUT_DIRS = 8;
//@ chunk-3katra73.js:17601-17665 facade-majority
function openTaskOutputForAppend(path, windowsFlags = "a") {
  return openTaskOutputForAppend_2(path, {
    exclusive: false,
    windowsFlags,
  });
}
//@ chunk-3katra73.js:17665-17787 facade-majority
function initTaskOutput(taskId) {
  return track(
    (async () => {
      let outputPath = bindTaskOutputPath(taskId);
      await (
        await openTaskOutputForAppend_2(outputPath, {
          exclusive: true,
          windowsFlags: "wx",
        })
      ).close();
      return outputPath;
    })(),
  );
}
//@ chunk-3katra73.js:17787-17826 layout
var OUTPUT_SWAP_REFUSED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3katra73.js:17787", () => {
  OUTPUT_SWAP_REFUSED = Symbol("taskOutputSwapRefused");
});
//@ chunk-3katra73.js:17826-17877 facade-majority
function isTaskOutputSwapRefusal(error) {
  return error instanceof Error && OUTPUT_SWAP_REFUSED in error;
}
//@ chunk-3katra73.js:17877-18151 layout
/**
 * 抛出"task output swap refused"错误（带恢复建议），写调试日志；同一原因+路径只上报一次 logError（集合有上限）。
 */
function refuseOutputSwap(path, reason, recovery) {
  let message =
    `task output swap refused (${reason}): ${path}` +
    (recovery === undefined ? "" : `. To recover: ${recovery}.`);
  let merged = Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      message,
      `task output swap refused (${reason})`,
    ),
    {
      [OUTPUT_SWAP_REFUSED]: true,
    },
  );
  logForDebugging(message, {
    level: "error",
  });
  let reasonKey = `${reason}\x00${path}`;
  if (!refusedSwapReasons.has(reasonKey)) {
    if (refusedSwapReasons.size >= MAX_REFUSED_SWAP_REASONS) refusedSwapReasons.clear();
    refusedSwapReasons.add(reasonKey);
    logError(merged);
  }
  throw merged;
}
//@ chunk-3katra73.js:18151-18172 layout
var refusedSwapReasons; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REFUSED_SWAP_REASONS;
deferInit("chunk-3katra73.js:18151", () => {
  refusedSwapReasons = new Set();
  MAX_REFUSED_SWAP_REASONS = 256;
});
//@ chunk-3katra73.js:18172-18862 facade-majority
async function openVerifiedTaskOutput(path, maxBytes) {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
      refuseOutputSwap(path, `lstat refused a swapped path (${errnoCode})`);
    throw error;
  }
  if (!stats.isFile() || stats.nlink !== 1) refuseOutputSwap(path, "not a regular nlink-1 file");
  let useStringFlags = false;
  let needsTruncate = stats.size > maxBytes;
  let handle;
  try {
    handle = await open(
      path,
      useStringFlags
        ? needsTruncate
          ? "r+"
          : "r"
        : (needsTruncate ? constants.O_RDWR : constants.O_RDONLY) |
            O_NOFOLLOW_FLAG |
            (constants.O_NONBLOCK ?? 0),
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
      refuseOutputSwap(path, `open refused a swapped path (${errnoCode})`);
    throw error;
  }
  try {
    let stats_2 = await handle.stat();
    if (!stats_2.isFile() || stats_2.dev !== stats.dev || stats_2.ino !== stats.ino || stats_2.nlink !== 1)
      refuseOutputSwap(path, "file changed between lstat and open");
    if (needsTruncate && stats_2.size > maxBytes) await handle.truncate(maxBytes);
    return {
      handle,
      size: stats_2.size,
    };
  } catch (error) {
    await handle.close();
    throw error;
  }
}
//@ chunk-3katra73.js:18862-19306 facade-majority
async function getVerifiedTaskOutputTail(path, maxBytes, outputFileSize = MAX_TASK_OUTPUT_BYTES) {
  let opened;
  try {
    opened = await openVerifiedTaskOutput(getTaskOutputPath(path), MAX_TASK_OUTPUT_BYTES);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        content: "",
        omittedBytes: 0,
      };
    throw error;
  }
  let { handle } = opened;
  let min = Math.min(opened.size, MAX_TASK_OUTPUT_BYTES, outputFileSize);
  try {
    let max = Math.max(0, min - maxBytes);
    let buffer = Buffer.allocUnsafe(min - max);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      let { bytesRead: bytesRead_2 } = await handle.read(
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        max + bytesRead,
      );
      if (bytesRead_2 === 0) break;
      bytesRead += bytesRead_2;
    }
    let leadContinuation = 0;
    while (max > 0 && leadContinuation < bytesRead && (buffer[leadContinuation] & 192) === 128)
      leadContinuation++;
    return {
      content: buffer.toString("utf8", leadContinuation, bytesRead),
      omittedBytes: max + leadContinuation,
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-3katra73.js:19306-19684 facade-majority
async function persistTaskOutputSnapshot(outputFilePath, toolResultFilePath, maxBytes) {
  let { handle, size } = await openVerifiedTaskOutput(outputFilePath, maxBytes);
  try {
    let fh = await open(
      toolResultFilePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | O_NOFOLLOW_FLAG,
    );
    try {
      let buffer = Buffer.alloc(1048576);
      let offset = 0;
      while (offset < maxBytes) {
        let min = Math.min(buffer.length, maxBytes - offset);
        let { bytesRead } = await handle.read(buffer, 0, min, offset);
        if (bytesRead === 0) break;
        let written = 0;
        while (written < bytesRead) {
          let { bytesWritten } = await fh.write(buffer, written, bytesRead - written, offset + written);
          written += bytesWritten;
        }
        offset += bytesRead;
      }
    } finally {
      await fh.close();
    }
    return size;
  } finally {
    await handle.close();
  }
}
//@ chunk-3katra73.js:19684-19815 layout
async function isSameOutputFile(path, otherPath, ioPath = path) {
  if (path === otherPath) return true;
  try {
    if (!(await lstat(ioPath)).isFile()) return false;
    return (await realpath(ioPath)) === (await realpath(otherPath));
  } catch {
    return false;
  }
}
//@ chunk-3katra73.js:19815-20692 facade-majority
function initTaskOutputAsSymlink(taskId, targetPath, onMode) {
  return track(
    (async () => {
      try {
        let outputPath = bindTaskOutputPath(taskId);
        let pinned = await pinOutputDir(outputPath, {
          replaceLeaf: true,
        });
        try {
          if (await isSameOutputFile(outputPath, targetPath, pinned.ioPath)) {
            let existingTarget = await readlink(pinned.ioPath).catch(() => targetPath);
            await registerLinkedOutput(
              outputPath,
              isInTaskOutputRoot(existingTarget) ? existingTarget : targetPath,
            );
            onMode?.("noop");
            return outputPath;
          }
          if (isInTaskOutputRoot(targetPath)) await recordLinkTargetIdentity(targetPath);
          let linkedOutputs = getTaskRunState().linkedOutputs;
          await pinned.recheckBeforeWrite();
          await unlink(pinned.ioPath).catch((error) => {
            if (getErrnoCode(error) !== "ENOENT") throw error;
          });
          linkedOutputs.set(outputPath, targetPath);
          try {
            try {
              await pinned.recheckBeforeWrite();
              await symlink(targetPath, pinned.ioPath);
            } catch (error) {
              if (getErrnoCode(error) !== "EEXIST") throw error;
              await pinned.recheckBeforeWrite();
              await unlink(pinned.ioPath).catch((error) => {
                if (getErrnoCode(error) !== "ENOENT") throw error;
              });
              await pinned.recheckBeforeWrite();
              await symlink(targetPath, pinned.ioPath);
            }
          } catch (error) {
            if (linkedOutputs.get(outputPath) === targetPath) linkedOutputs.delete(outputPath);
            throw error;
          }
          if (
            (await readlink(pinned.ioPath).catch(() => {
              return;
            })) === targetPath
          )
            linkedOutputs.set(outputPath, targetPath);
        } finally {
          await pinned.close();
        }
        onMode?.("symlink");
        return outputPath;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if ((errnoCode && RESOURCE_EXHAUSTION_CODES.has(errnoCode)) || errnoCode === "EROFS")
          logForDebugging(`initTaskOutputAsSymlink failed (${errnoCode}): ${error}`, {
            level: "error",
          });
        else if (!isTaskOutputSwapRefusal(error)) logError(error);
        return initTaskOutput(taskId);
      }
    })(),
  );
}
//@ chunk-j8qkeqz1.js:1467-1560 placement
function isPlainAbsolutePath(path) {
  return path.length <= 1024 && /^(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9_.-]+)+$/.test(path);
}
//@ chunk-j8qkeqz1.js:1560-1620 placement (2.1.88 match: getAgentOutputTaskId, 1)
/**
 * 路径是否为某任务的输出文件（以 /<taskId>.output 结尾）。
 */
function isTaskOutputPathFor(taskId, path) {
  return isPlainAbsolutePath(path) && path.endsWith(`/${taskId}.output`);
}
//@ chunk-tp1gh0pb.js:5469-5736 fingerprint (2.1.88 match: appendTaskOutput, 0.465)
function appendTaskOutput_2(taskId, content) {
  let state = getDebugState();
  if (state.debugFilePath === null) return;
  let linePrefix = `${new Date().toISOString()} ${taskId}
`;
  ensureDebugFile(state).then(() => {
    if (content !== undefined) {
      let output = getDebugLogMeta(state);
      if (output !== null)
        content
          .append(output, [
            {
              data: linePrefix,
            },
          ])
          .catch(() => {});
      return;
    }
    if (state.debugFilePath)
      getFileReader()
        .append(state.debugFilePath, linePrefix)
        .catch(() => {});
  });
}
export {
  initTaskOutputAsSymlink,
  evictTaskOutput,
  getTaskOutputDelta,
  getTaskOutputPath,
  isTaskOutputFilePath,
  bindTaskOutputForRead,
  getTaskOutputSize,
  unboundTaskOutputPath,
  openTaskOutputForAppend,
  releaseConvergentTaskOutputBinding,
  MAX_PERSISTED_OUTPUT_BYTES,
  getTaskOutputRootDir,
  persistTaskOutputSnapshot,
  getVerifiedTaskOutputTail,
  isTaskOutputSwapRefusal,
  isPlainAbsolutePath,
  isTaskOutputPathFor,
  MAX_TASK_OUTPUT_BYTES,
  MAX_TASK_OUTPUT_BYTES_DISPLAY,
  bindTaskOutputPath,
  tailTaskOutput,
  DiskTaskOutput,
  openTaskOutputForRead,
  unlinkTaskOutput,
  probeTaskOutputWrite,
  taskOutputDirExclusions,
  initTaskOutput,
  appendTaskOutput,
  peekTaskOutputDir,
  appendTaskOutputTrailer,
  openVerifiedTaskOutput,
  writeTaskOutputSnapshot,
  taskOutputDirForSession,
  tailOutputOfTask,
  getTaskOutputDir,
  appendTaskOutput_2,
  TASK_OUTPUT_TAIL_BYTES,
  repointTaskOutputSymlinks,
};
