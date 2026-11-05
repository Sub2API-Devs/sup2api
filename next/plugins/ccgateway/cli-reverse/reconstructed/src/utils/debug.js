/**
 * utils/debug.ts
 *
 * 调试日志：--debug/-d、--debug=过滤、--debug-file、--debug-to-stderr，写 <配置目录>/debug/<session>.txt 并维护 latest 链接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/debug.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-6hadbefe.js (36), chunk-af1hzzme.js (1), chunk-b9mhcvry.js (1)
 * attribution: callgraph-witnessed 1, placement 1, sole-consumer 6, affinity 1, fingerprint 3, layout 10, facade-exports 17
 */
import { resolve, join, dirname, isAbsolute } from "path";
import { stat, rename, unlink, mkdir, appendFile, symlink } from "fs/promises";
import { randomUUID } from "crypto";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "./sanitization.js";
import { bindAsyncResource } from "./asyncResourceBind.js";
import { isWindowsDevicePath } from "./windowsUncPaths.js";
import { PathSpace, escapeControlChars, toUnicodeEscapes } from "./resultError.js";
import { cliArgvReader } from "./cliArgvReader.js";
import { parseDebugFilterCached, registerCleanup } from "./cleanupRegistry.js";
import { isEnvTruthy, getClaudeConfigDirOrNull } from "./envUtils.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { jsonStringify, shouldLogDebugCategory } from "./slowOperations.js";
import { withDeadline } from "./sleep.js";
import { isENOENT, isEISDIR } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { createBufferedWriter } from "./bufferedWriter.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, getSessionId, isDiskless } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { writeToStderr, getStderrDroppedTotal } from "./process.js";
import { renderAttachment } from "./messages.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6hadbefe.js:1947-2093 placement
/**
 * 运行环境是否提供 async_hooks（决定是否能用 AsyncLocalStorage）。
 */
var ASYNC_HOOKS_MODULE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var asyncHooksAvailable;
var backendStorageContext;
deferInit("chunk-6hadbefe.js:1947", () => {
  ASYNC_HOOKS_MODULE = globalThis.process?.getBuiltinModule?.("async_hooks");
  asyncHooksAvailable = ASYNC_HOOKS_MODULE !== undefined;
  backendStorageContext = ASYNC_HOOKS_MODULE
    ? new ASYNC_HOOKS_MODULE.AsyncLocalStorage()
    : {
        run: (fn, callback) => callback(),
        getStore: () => {
          return;
        },
      };
});
//@ chunk-6hadbefe.js:30257-30415 sole-consumer
/**
 * 调试日志轮转的大小上限（10 MiB）。
 */
var LOG_LEVEL_ORDER; // deferred: uses INVISIBLE_CHAR_CLASSES (./sanitization.js) of its import cycle while loading; runs once the cycle is complete
var UNSAFE_LOG_CHARS;
var MAX_DEBUG_LOG_BYTES;
var MAX_DEBUG_BACKLOG_BYTES;
var DEBUG_BACKLOG_STALL_MS;
var MAX_DEBUG_LINE_BYTES;
var DEBUG_SYNC_DRAIN_SUSPECT_MS;
var DEBUG_SYNC_DRAIN_DEADLINE_MS;
var DEBUG_STUCK_DEFAULT;
deferInit("chunk-6hadbefe.js:30257", () => {
  LOG_LEVEL_ORDER = {
    verbose: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };
  UNSAFE_LOG_CHARS = new RegExp(`(?!\\t)[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "gu");
  MAX_DEBUG_LOG_BYTES = 10485760;
  MAX_DEBUG_BACKLOG_BYTES = 1048576;
  DEBUG_BACKLOG_STALL_MS = 1e4;
  MAX_DEBUG_LINE_BYTES = 262144;
  DEBUG_SYNC_DRAIN_SUSPECT_MS = 5000;
  DEBUG_SYNC_DRAIN_DEADLINE_MS = 100;
  DEBUG_STUCK_DEFAULT = bindAsyncResource((fn) => fn());
});
//@ chunk-6hadbefe.js:30415-30457 sole-consumer
/**
 * 判断字符串是否为合法的日志级别。
 */
function isValidLogLevel(level) {
  return Object.hasOwn(LOG_LEVEL_ORDER, level);
}
//@ chunk-6hadbefe.js:30457-30496 sole-consumer
/**
 * 解析日志文件路径（Windows 设备路径返回 null）。
 */
function resolveLogPathOrNull(path) {
  return isWindowsDevicePath(path) ? null : resolve(path);
}
//@ chunk-6hadbefe.js:30496-30511 sole-consumer
/**
 * 吞掉错误的空回调（用于 catch）。
 */
function noopLogError() {}
//@ chunk-6hadbefe.js:30511-30541 sole-consumer
/**
 * 调试日志目的地的初始状态（v5 存储、无本地文件）。
 */
var DEFAULT_DEBUG_SINK_STATE = {
  arm: "v5",
  target: null,
};
//@ chunk-6hadbefe.js:30541-30595 sole-consumer
/**
 * 按当前积压位置标记是否卡住。
 */
function markBacklogStuck(backlogState, counter) {
  backlogState.stuck = backlogState.appendSince === counter ? "yes" : "no";
}
//@ chunk-6hadbefe.js:30595-30632 affinity
/**
 * 空的日志上下文（无会话 id、非后端写入）。
 */
var EMPTY_LOG_CONTEXT = {
  sessionId: "",
  fromBackend: false,
};
//@ chunk-6hadbefe.js:30632-30933 fingerprint (2.1.88 match: getDebugLogPath, 0.413)
/**
 * 计算调试日志目标：默认 <配置目录>/debug/<sessionId>.txt（storage v5 时写存储），--debug-file 为原始文件并可轮换、更新 latest 链接。
 */
function resolveDebugLogTarget(context, configHomeDir, overrideDir, replacementDir) {
  let debugDir = join(configHomeDir, "debug");
  let defaultPath = join(debugDir, `${context.sessionId}.txt`);
  let targetPath;
  if (overrideDir === null) targetPath = defaultPath;
  else if (replacementDir !== null && overrideDir === replacementDir)
    targetPath = join(replacementDir, `${context.sessionId}.txt`);
  else targetPath = overrideDir;
  let arm = !context.fromBackend && targetPath === defaultPath ? "v5" : "raw";
  return {
    target: targetPath,
    arm,
    configHome: configHomeDir,
    rotate: arm === "raw" && !(dirname(targetPath) === debugDir && targetPath.endsWith(".txt")),
    pointLatest: arm === "raw" && targetPath !== defaultPath,
  };
}
//@ chunk-6hadbefe.js:30933-30983 layout
/**
 * 把路径包装成用户命名的路径空间。
 */
function userNamedPathSpace(path) {
  return PathSpace.userNamed(isAbsolute(path) ? path : resolve(path));
}
//@ chunk-6hadbefe.js:30983-31051 layout
/**
 * 判断重命名失败是否为 ENOENT 遥测失败。
 */
function isENOENTTelemetryFailure(error) {
  return error.code === "Failed" && error.telemetryCode === "ENOENT";
}
//@ chunk-6hadbefe.js:31051-31089 layout
/**
 * 有 async_hooks 时保留存储 v5 参数，否则返回 undefined。
 */
function storageV5IfAsyncHooks(storageV5, available = asyncHooksAvailable) {
  return available ? storageV5 : undefined;
}
//@ chunk-6hadbefe.js:31089-31363 layout
async function appendDebugToStore(storageV5, sessionId, data, markLatest) {
  let logKey = {
    namespace: "log",
    sessionId,
    channel: "debug",
  };
  let appendResult = await backendStorageContext.run(true, () =>
    storageV5.append(
      logKey,
      [
        {
          data,
        },
      ],
      markLatest
        ? {
            markLatest: true,
          }
        : undefined,
    ),
  );
  if (appendResult.ok) return "landed";
  return markLatest &&
    appendResult.error.code === "InvalidArgument" &&
    appendResult.error.argument === "opts.markLatest"
    ? "refused"
    : "dropped";
}
//@ chunk-6hadbefe.js:31363-43032 layout
/**
 * 调试日志器：从 argv/env 读取 --debug、-d、--debug=filter、--debug-to-stderr/-d2e、--debug-file、DEBUG/DEBUG_SDK、CLAUDE_CODE_DEBUG_LOG_LEVEL、CLAUDE_CODE_DEBUG_LOGS_DIR；行格式 `<ISO时间> [LEVEL] 消息`，消息经脱敏（redactSecrets），默认路径 <配置目录>/debug/<sessionId>.txt。
 */
class DebugLogger {
  deps;
  minLevel;
  filter;
  toStderr;
  filePath;
  runtimeDebugEnabled = false;
  hasFormattedOutput = false;
  debugFromLaunch;
  storageV5;
  writer = null;
  redirect = null;
  unflushedChunks = [];
  backlog = {
    chain: Promise.resolve(),
    length: 0,
    appendSince: 0,
    stuck: "no",
    droppedCount: 0,
    droppedTotal: 0,
  };
  appendOldest = this.appendOldestChunks.bind(this);
  backendLinesLogged = 0;
  exiting = false;
  exitHandlerRegistered = false;
  successor = null;
  writtenBytes = -1;
  rotating = false;
  resolvedLogPath = null;
  overrideDirectory = null;
  rotationTarget = null;
  latestMarked = false;
  latestRefused = false;
  constructor(deps) {
    this.deps = deps;
    this.storageV5 = storageV5IfAsyncHooks(deps.storageV5);
    if (deps.launchIdentity !== undefined) {
      this.minLevel = deps.launchIdentity.minLevel;
      this.filter = deps.launchIdentity.filter;
      this.toStderr = deps.launchIdentity.toStderr;
      this.filePath = deps.launchIdentity.filePath;
      this.debugFromLaunch = deps.launchIdentity.debugFromLaunch;
      return;
    }
    let argv = Array.isArray(deps.argv) ? deps.argv : [];
    let argvReader = cliArgvReader();
    let effectiveArgv;
    if (argvReader !== undefined) effectiveArgv = argvReader(argv);
    else {
      let index = argv.indexOf("--");
      effectiveArgv = index === -1 ? argv : argv.slice(0, index);
    }
    let level = deps.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim();
    this.minLevel = level && isValidLogLevel(level) ? level : "debug";
    let found = effectiveArgv.find((arg) => arg.startsWith("--debug="));
    this.filter = found ? parseDebugFilterCached(found.substring(8)) : null;
    this.toStderr = effectiveArgv.includes("--debug-to-stderr") || effectiveArgv.includes("-d2e");
    let debugFilePath = null;
    for (let idx = 0; idx < effectiveArgv.length; idx++) {
      let arg = effectiveArgv[idx];
      if (arg.startsWith("--debug-file=")) {
        debugFilePath = resolveLogPathOrNull(arg.substring(13));
        break;
      }
      if (arg === "--debug-file" && idx + 1 < effectiveArgv.length) {
        debugFilePath = resolveLogPathOrNull(effectiveArgv[idx + 1]);
        break;
      }
    }
    this.filePath = debugFilePath;
    this.debugFromLaunch =
      isEnvTruthy(deps.env.DEBUG) ||
      isEnvTruthy(deps.env.DEBUG_SDK) ||
      effectiveArgv.includes("--debug") ||
      effectiveArgv.includes("-d") ||
      this.toStderr ||
      found !== undefined ||
      this.filePath !== null;
  }
  isDebugMode() {
    return this.runtimeDebugEnabled || this.debugFromLaunch;
  }
  mayWrite(level) {
    return this.takesLevel(level) && (this.deps.isAnt || this.isDebugMode());
  }
  drainsSyncAtExit() {
    return !(isStorageV5Enabled() && this.storageV5 !== undefined && this.deps.syncExitDrain === false);
  }
  launchIdentity() {
    return {
      minLevel: this.minLevel,
      filter: this.filter,
      toStderr: this.toStderr,
      filePath: this.filePath,
      debugFromLaunch: this.debugFromLaunch,
      isAnt: this.deps.isAnt,
      isTestEnvironment: this.deps.isTestEnvironment,
    };
  }
  enableDebugLogging() {
    let enabled = this.isDebugMode() || this.deps.isAnt;
    this.runtimeDebugEnabled = true;
    return enabled;
  }
  logPath() {
    return (
      this.filePath ??
      (this.overrideDirectory !== null && this.overrideDirectory === this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR
        ? join(this.overrideDirectory, `${this.deps.sessionId()}.txt`)
        : null) ??
      this.resolvedLogPath ??
      this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR ??
      this.defaultLogPath()
    );
  }
  defaultLogPath(sessionId = this.deps.sessionId()) {
    return join(this.deps.configHomeDir(), "debug", `${sessionId}.txt`);
  }
  learnedOverrideDirectory() {
    return this.overrideDirectory;
  }
  isArmed() {
    return this.storageV5 !== undefined;
  }
  takesLevel(level) {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
  }
  log(
    message,
    { level } = {
      level: "debug",
    },
  ) {
    if (!this.takesLevel(level)) return;
    let limits = this.deps.limits?.();
    if (limits === undefined) {
      this.emit(message, level);
      return;
    }
    let text =
      message.length > limits.maxMessageLength
        ? `debug message not logged: it has ${message.length} characters, over this log's fixed limit of ${limits.maxMessageLength} per message`
        : message;
    let { admitted, leftOutBefore } = limits.admit(text.length);
    if (!admitted) return;
    limits.timed(() => {
      if (leftOutBefore > 0)
        this.emit(
          `debug messages not logged: ${leftOutBefore} since this log's last line, over its fixed limit on how much it logs at a time`,
          level,
        );
      this.emit(text, level);
    });
  }
  emit(message, level) {
    if (!this.shouldLog(message)) return;
    let text = redactSecrets(message.trim());
    text = text.includes(`
`)
      ? escapeControlChars(jsonStringify(text))
      : text.replace(UNSAFE_LOG_CHARS, toUnicodeEscapes);
    let line = `${new Date().toISOString()} [${level.toUpperCase()}] ${text}
`;
    if (this.toStderr) {
      this.deps.writeToStderr(line);
      return;
    }
    this.write(line);
  }
  write(content) {
    let writer = this.getWriter();
    let origin = EMPTY_LOG_CONTEXT;
    if (this.storageV5 !== undefined) {
      origin = {
        sessionId: this.deps.sessionId(),
        fromBackend: backendStorageContext.getStore() === true,
      };
      if (origin.fromBackend) this.backendLinesLogged++;
    }
    writer.write({
      origin,
      content,
    });
    if (this.exiting) writer.flush();
  }
  async flush() {
    let backendLinesLogged = this.backendLinesLogged;
    this.writer?.flush();
    await this.drained();
    if (this.storageV5 !== undefined && this.successor) return this.successor.flush();
    for (let i = 0; this.backendLinesLogged !== backendLinesLogged && i < 3; i++) {
      backendLinesLogged = this.backendLinesLogged;
      this.writer?.flush();
      await this.drained();
    }
    if (this.backlog.droppedCount > 0 && this.backlog.length === 0 && !this.successor) {
      this.write("");
      this.writer?.flush();
      await this.drained();
    }
  }
  async drained() {
    if (this.isAppendStuck()) return;
    let drainPromise = this.backlog.chain.then(() => true);
    do if (await withDeadline(drainPromise, DEBUG_SYNC_DRAIN_DEADLINE_MS)) return;
    while (!this.isAppendStuck());
  }
  isAppendStuck() {
    let backlog = this.backlog;
    let { appendSince } = backlog;
    if (
      backlog.stuck === "no" &&
      appendSince !== 0 &&
      Date.now() - appendSince >= DEBUG_SYNC_DRAIN_SUSPECT_MS
    ) {
      backlog.stuck = "suspected";
      setTimeout(markBacklogStuck, DEBUG_SYNC_DRAIN_DEADLINE_MS, backlog, appendSince).unref();
    }
    return backlog.stuck === "yes";
  }
  dispose(redirect) {
    this.redirect = redirect;
    try {
      this.writer?.dispose();
    } finally {
      this.redirect = null;
      this.writer = null;
    }
  }
  succeed(previous) {
    this.runtimeDebugEnabled = previous.runtimeDebugEnabled;
    this.hasFormattedOutput = previous.hasFormattedOutput;
    this.unflushedChunks = previous.unflushedChunks;
    this.backlog = previous.backlog;
    this.exitHandlerRegistered = previous.exitHandlerRegistered;
    previous.successor = this;
    previous.dispose((text) => {
      this.write(text);
    });
  }
  handleExit() {
    if (this.successor) {
      this.successor.handleExit();
      return;
    }
    this.exiting = true;
    if (this.backlog.droppedCount > 0)
      try {
        this.write("");
      } catch {}
    this.writer?.flush();
    this.drainSync();
  }
  async maybeRotate(targetPath, addedBytes, maxBytes = MAX_DEBUG_LOG_BYTES) {
    let hostFiles =
      isStorageV5Enabled() && this.storageV5 !== undefined ? this.storageV5.hostFiles : undefined;
    if (this.writtenBytes < 0) {
      if (hostFiles) {
        let stats = await hostFiles.stat(userNamedPathSpace(targetPath));
        this.writtenBytes = stats.ok && stats.value.kind !== "absent" ? stats.value.size : 0;
      } else
        this.writtenBytes = await stat(targetPath)
          .then((stats) => stats.size)
          .catch(() => 0);
    } else this.writtenBytes += addedBytes;
    if (this.writtenBytes <= maxBytes || this.rotating) return;
    this.rotating = true;
    try {
      let rotatedPath = targetPath.endsWith(".txt") ? `${targetPath.slice(0, -4)}.1.txt` : `${targetPath}.1`;
      if (hostFiles) {
        let targetSpace = userNamedPathSpace(targetPath);
        let rotatedSpace = userNamedPathSpace(rotatedPath);
        let renameResult = await hostFiles.rename(targetSpace, rotatedSpace);
        if (!renameResult.ok && !isENOENTTelemetryFailure(renameResult.error)) {
          await hostFiles.delete(rotatedSpace, {
            missingOk: true,
          });
          if (!(await hostFiles.rename(targetSpace, rotatedSpace)).ok)
            await hostFiles.delete(targetSpace, {
              missingOk: true,
            });
        }
      } else
        try {
          await rename(targetPath, rotatedPath);
        } catch (error) {
          if (!isENOENT(error)) {
            await unlink(rotatedPath).catch(() => {});
            await rename(targetPath, rotatedPath).catch(() => unlink(targetPath).catch(() => {}));
          }
        }
      this.writtenBytes = 0;
    } finally {
      this.rotating = false;
    }
  }
  shouldLog(category) {
    if (this.deps.isTestEnvironment && !this.toStderr && this.filePath === null) return false;
    if (!this.deps.isAnt && !this.isDebugMode()) return false;
    if (
      typeof process === "undefined" ||
      typeof process.versions === "undefined" ||
      typeof process.versions.node === "undefined"
    )
      return false;
    return shouldLogDebugCategory(category, this.filter);
  }
  resolveDirToFile(dirPath) {
    this.resolvedLogPath = join(dirPath, `${this.deps.sessionId()}.txt`);
    return this.resolvedLogPath;
  }
  async appendGroup(target, context, content, ensureDir) {
    if (this.storageV5 !== undefined && target.arm === "v5") {
      await this.appendV5AndMark(this.storageV5, context, content);
      return;
    }
    if (target.target === null || !this.writesFiles()) return;
    if (ensureDir)
      await mkdir(dirname(target.target), {
        recursive: true,
      }).catch(() => {});
    let effectiveTarget = target;
    try {
      await appendFile(target.target, content);
    } catch (error) {
      if (!isEISDIR(error)) throw error;
      if (this.storageV5 === undefined) {
        effectiveTarget = {
          ...target,
          target: this.resolveDirToFile(target.target),
        };
        await appendFile(effectiveTarget.target, content);
      } else {
        this.overrideDirectory = target.target;
        effectiveTarget = resolveDebugLogTarget(context, target.configHome, target.target, target.target);
        if (effectiveTarget.arm === "v5") {
          await this.appendV5AndMark(this.storageV5, context, content);
          return;
        }
        await mkdir(dirname(effectiveTarget.target), {
          recursive: true,
        }).catch(() => {});
        try {
          await appendFile(effectiveTarget.target, content);
        } catch {
          return;
        }
      }
    }
    if (effectiveTarget.rotate) {
      if (this.storageV5 !== undefined && effectiveTarget.target !== this.rotationTarget) {
        this.rotationTarget = effectiveTarget.target;
        this.writtenBytes = -1;
      }
      await this.maybeRotate(effectiveTarget.target, Buffer.byteLength(content)).catch(noopLogError);
    }
    if (effectiveTarget.pointLatest) this.markLatestSymlink();
  }
  async appendV5AndMark(storageV5, context, content) {
    let v5Enabled = isStorageV5Enabled();
    let shouldMark = v5Enabled && !this.latestMarked && !this.latestRefused;
    let appendOutcome = await appendDebugToStore(storageV5, context.sessionId, content, shouldMark);
    if (appendOutcome === "refused") {
      this.latestRefused = true;
      appendOutcome = await appendDebugToStore(storageV5, context.sessionId, content, false);
      this.log(
        "debug log: the storage backend refused markLatest; <debug folder>/latest is not pointed in this process",
        {
          level: "warn",
        },
      );
    }
    if (appendOutcome !== "landed") return;
    if (shouldMark && !this.latestRefused) this.latestMarked = true;
    else if (!v5Enabled) this.markLatestSymlink();
  }
  markLatestSymlink() {
    if (!this.latestMarked && this.writesFiles()) {
      this.latestMarked = true;
      this.updateLatestSymlink();
    }
  }
  isSessionDiskless() {
    try {
      return this.deps.diskless?.() === true;
    } catch {
      return true;
    }
  }
  writesFiles() {
    if (this.isSessionDiskless()) return false;
    try {
      return (
        this.deps.defaultFile?.() !== false ||
        this.filePath !== null ||
        this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR !== undefined
      );
    } catch {
      return false;
    }
  }
  async appendOldestChunks() {
    let backlog = this.backlog;
    let firstChunk = this.unflushedChunks[0];
    let queued = firstChunk?.queued;
    if (queued === undefined) return;
    let batchCount = 0;
    let batchBytes = 0;
    let needsMkdir = false;
    for (let { content, queued: queued_2 } of this.unflushedChunks) {
      if (
        queued_2 === undefined ||
        queued_2.owner !== queued.owner ||
        queued_2.decision.arm !== queued.decision.arm ||
        queued_2.decision.target !== queued.decision.target ||
        queued_2.origin.sessionId !== queued.origin.sessionId ||
        queued_2.origin.fromBackend !== queued.origin.fromBackend ||
        (batchCount > 0 && batchBytes + content.length > MAX_DEBUG_LINE_BYTES)
      )
        break;
      batchCount++;
      batchBytes += content.length;
      needsMkdir ||= queued_2.needMkdir;
    }
    backlog.appendSince = Date.now();
    await queued.owner
      .appendGroup(
        queued.decision,
        queued.origin,
        this.unflushedChunks
          .slice(0, batchCount)
          .map((unflushedChunk) => unflushedChunk.content)
          .join(""),
        needsMkdir,
      )
      .catch(noopLogError);
    backlog.appendSince = 0;
    backlog.stuck = "no";
    if (this.unflushedChunks[0] === firstChunk) {
      this.unflushedChunks.splice(0, batchCount);
      backlog.length -= batchBytes;
    }
  }
  drainSync() {
    if (this.unflushedChunks.length === 0) return;
    this.backlog.length = 0;
    if (!this.drainsSyncAtExit() || !this.writesFiles() || this.isAppendStuck()) {
      this.unflushedChunks.length = 0;
      return;
    }
    let flushTargets = [];
    for (let unflushedChunk of this.unflushedChunks.splice(0)) {
      if (unflushedChunk.target === null) continue;
      let last = flushTargets.at(-1);
      if (
        last !== undefined &&
        last.armed === unflushedChunk.armed &&
        (!unflushedChunk.armed || last.target === unflushedChunk.target)
      )
        last.parts.push(unflushedChunk);
      else
        flushTargets.push({
          target: unflushedChunk.target,
          armed: unflushedChunk.armed,
          parts: [unflushedChunk],
        });
    }
    for (let { target, armed, parts } of flushTargets) {
      let targetPath = armed ? target : this.logPath();
      let joined = parts.map((part) => part.content).join("");
      try {
        getFsImplementation().mkdirSync(dirname(targetPath));
      } catch {}
      try {
        getFsImplementation().appendFileSync(targetPath, joined);
      } catch (error) {
        if (isEISDIR(error))
          try {
            if (!armed) getFsImplementation().appendFileSync(this.resolveDirToFile(targetPath), joined);
            else {
              let appendForSession = (sessionId, text) => {
                try {
                  getFsImplementation().appendFileSync(join(targetPath, `${sessionId}.txt`), text);
                } catch {}
              };
              let sessionId = parts[0]?.sessionId;
              let pendingText = "";
              for (let part of parts) {
                if (part.sessionId !== sessionId) {
                  appendForSession(sessionId, pendingText);
                  sessionId = part.sessionId;
                  pendingText = "";
                }
                pendingText += part.content;
              }
              appendForSession(sessionId, pendingText);
            }
          } catch {}
      }
    }
  }
  droppedLineTotal() {
    return this.backlog.droppedTotal;
  }
  takeDroppedNote() {
    let { droppedCount } = this.backlog;
    if (droppedCount === 0) return "";
    this.backlog.droppedCount = 0;
    return `${new Date().toISOString()} [WARN] debug messages not logged: ${droppedCount} since the line above, because writes to this log were over 10 s behind, with over 1 MiB waiting
`;
  }
  groupLines(lines) {
    let firstLine = lines[0];
    if (firstLine === undefined) return [];
    let logDir = this.filePath ?? this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR ?? null;
    let isDiskless = this.isSessionDiskless();
    if (isDiskless && (this.storageV5 === undefined || logDir !== null)) return [];
    if (this.storageV5 === undefined)
      return [
        {
          decision: {
            target: this.logPath(),
            arm: "raw",
            configHome: "",
            rotate: true,
            pointLatest: true,
          },
          origin: firstLine.origin,
          lines,
        },
      ];
    let groups = [];
    for (let line of lines) {
      if (isDiskless && line.origin.fromBackend) continue;
      let last = groups.at(-1);
      if (
        last !== undefined &&
        last.origin.sessionId === line.origin.sessionId &&
        last.origin.fromBackend === line.origin.fromBackend
      )
        last.lines.push(line);
      else
        groups.push({
          decision: isDiskless
            ? DEFAULT_DEBUG_SINK_STATE
            : resolveDebugLogTarget(line.origin, this.deps.configHomeDir(), logDir, this.overrideDirectory),
          origin: line.origin,
          lines: [line],
        });
    }
    return groups;
  }
  getWriter() {
    if (this.writer) return this.writer;
    let pendingWrite = null;
    let armed = this.storageV5 !== undefined;
    this.writer = createBufferedWriter({
      writeBatch: (batch) => {
        if (this.redirect) {
          this.redirect(batch.map((item) => item.content).join(""));
          return;
        }
        if (this.exiting) {
          for (let group of this.groupLines(batch))
            this.unflushedChunks.push({
              target: group.decision.target,
              sessionId: group.origin.sessionId,
              armed,
              content: this.takeDroppedNote() + group.lines.map((line) => line.content).join(""),
            });
          this.drainSync();
          return;
        }
        let writesFiles = this.writesFiles();
        let backlog = this.backlog;
        this.isAppendStuck();
        for (let group of this.groupLines(batch)) {
          if (group.decision.arm === "raw" && !writesFiles) continue;
          if (
            backlog.droppedCount > 0
              ? backlog.length >= MAX_DEBUG_BACKLOG_BYTES / 2
              : backlog.length >= MAX_DEBUG_BACKLOG_BYTES &&
                Date.now() - (this.unflushedChunks[0]?.queued?.at ?? 1 / 0) >= DEBUG_BACKLOG_STALL_MS
          ) {
            backlog.droppedCount += group.lines.length;
            backlog.droppedTotal += group.lines.length;
            continue;
          }
          let content = this.takeDroppedNote() + group.lines.map((line) => line.content).join("");
          if (content === "") continue;
          let mkdirDir = group.decision.arm === "raw" ? dirname(group.decision.target) : null;
          let needMkdir = mkdirDir !== null && (group.origin.fromBackend || pendingWrite !== mkdirDir);
          if (mkdirDir !== null) pendingWrite = mkdirDir;
          this.unflushedChunks.push({
            target: group.decision.target,
            sessionId: group.origin.sessionId,
            armed,
            content,
            queued: {
              at: Date.now(),
              owner: this,
              decision: group.decision,
              origin: group.origin,
              needMkdir,
            },
          });
          backlog.length += content.length;
          backlog.chain = DEBUG_STUCK_DEFAULT(() => backlog.chain.then(this.appendOldest));
        }
      },
      sizeOf: (item) => item.content.length,
      flushIntervalMs: 1000,
      maxBufferSize: 100,
      immediateMode: this.isDebugMode(),
    });
    this.deps.registerCleanup(async () => {
      this.writer?.dispose();
      await this.drained();
    });
    if (!this.exitHandlerRegistered) {
      this.exitHandlerRegistered = true;
      this.deps.onExit(this.handleExit.bind(this));
    }
    return this.writer;
  }
  async updateLatestSymlink() {
    try {
      let logPath = this.logPath();
      let latestPath = join(dirname(logPath), "latest");
      await unlink(latestPath).catch(() => {});
      await symlink(logPath, latestPath);
    } catch {}
  }
}
//@ chunk-6hadbefe.js:43032-43217 layout
class DebugLoggerConfig {
  instance = undefined;
  init = {};
  defaultFile = true;
  limits = undefined;
  setInstance(instance) {
    this.instance = instance;
  }
  setInit(init) {
    this.init = init;
  }
  disableDefaultFile() {
    this.defaultFile = false;
  }
  setLimits(limits) {
    this.limits = limits;
  }
}
//@ chunk-6hadbefe.js:43217-43242 layout
/**
 * 按进程根保存的调试日志器配置。
 */
var debugLoggerConfigByRoot; // deferred: uses DebugLoggerConfig of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6hadbefe.js:43217", () => {
  debugLoggerConfigByRoot = new HostScoped(() => new DebugLoggerConfig());
});
//@ chunk-6hadbefe.js:43242-43270 layout
/**
 * 取出调试日志器配置（进程根作用域）。
 */
function getDebugLoggerConfig() {
  return onProcessRootHost(debugLoggerConfigByRoot);
}
//@ chunk-6hadbefe.js:43270-43750 layout
function createDebugLogger(debugLoggerConfig, config) {
  return new DebugLogger({
    argv: process.argv,
    env: process.env,
    sessionId: () => getSessionId(),
    configHomeDir: () => getClaudeConfigDir(),
    onExit: (exitHandler) => {
      process.on("exit", exitHandler);
    },
    registerCleanup: (disposable) => {
      registerCleanup(disposable);
    },
    writeToStderr: (line) => {
      writeToStderr(line, {
        mayDrop: true,
      });
    },
    isAnt: config?.isAnt ?? false,
    isTestEnvironment: config?.isTestEnvironment ?? false,
    launchIdentity: config,
    storageV5:
      debugLoggerConfig.init.storageV5 !== undefined &&
      debugLoggerConfig.init.configHome === getClaudeConfigDirOrNull()
        ? debugLoggerConfig.init.storageV5
        : undefined,
    syncExitDrain: debugLoggerConfig.init.syncExitDrain,
    diskless: () => isDiskless(),
    defaultFile: () => debugLoggerConfig.defaultFile,
    limits: () => debugLoggerConfig.limits,
  });
}
//@ chunk-6hadbefe.js:43750-44105 facade-exports
function initDefaultDebugLog(options) {
  let debugLoggerConfig = getDebugLoggerConfig();
  debugLoggerConfig.setInit({
    storageV5: options.storageV5,
    configHome: getClaudeConfigDirOrNull(),
    syncExitDrain: options.syncExitDrain,
  });
  let instance = debugLoggerConfig.instance;
  if (instance) {
    let debugLogger = createDebugLogger(debugLoggerConfig, instance.launchIdentity());
    debugLoggerConfig.setInstance(debugLogger);
    debugLogger.succeed(instance);
  }
  if (options.syncExitDrain === false && !getDebugLogger().drainsSyncAtExit())
    logForDebugging(
      "Sync exit drain off for this process: debug lines still queued at exit are dropped, so this log may end short",
    );
}
//@ chunk-6hadbefe.js:44105-44194 layout
/**
 * 取（必要时创建）当前宿主的 DebugLogger 单例。
 */
function getDebugLogger() {
  let debugLoggerConfig = getDebugLoggerConfig();
  let instance = debugLoggerConfig.instance;
  if (instance) return instance;
  let debugLogger = createDebugLogger(debugLoggerConfig);
  debugLoggerConfig.setInstance(debugLogger);
  return debugLogger;
}
//@ chunk-6hadbefe.js:44194-44229 facade-exports
function getMinDebugLogLevel() {
  return getDebugLogger().minLevel;
}
//@ chunk-6hadbefe.js:44229-44270 facade-exports
function debugLogTakesLevel(level) {
  return getDebugLogger().takesLevel(level);
}
//@ chunk-6hadbefe.js:44270-44309 facade-exports
function isDebugMode() {
  return getDebugLogger().isDebugMode();
}
//@ chunk-6hadbefe.js:44309-44353 facade-exports
function mayWriteDebugLog() {
  return getDebugLogger().mayWrite("debug");
}
//@ chunk-6hadbefe.js:44353-44388 facade-exports
function isDebugToStdErr() {
  return getDebugLogger().toStderr;
}
//@ chunk-6hadbefe.js:44388-44423 facade-exports
function getDebugFilePath() {
  return getDebugLogger().filePath;
}
//@ chunk-6hadbefe.js:44423-44470 facade-exports
function enableDebugLogging() {
  return getDebugLogger().enableDebugLogging();
}
//@ chunk-6hadbefe.js:44470-44564 facade-exports
function resetDebugCaches() {
  let debugLoggerConfig = getDebugLoggerConfig();
  let instance = debugLoggerConfig.instance;
  if (!instance) return;
  let debugLogger = createDebugLogger(debugLoggerConfig);
  debugLoggerConfig.setInstance(debugLogger);
  debugLogger.succeed(instance);
}
//@ chunk-6hadbefe.js:44564-44605 facade-exports
function setHasFormattedOutput(hasFormattedOutput) {
  getDebugLogger().hasFormattedOutput = hasFormattedOutput;
}
//@ chunk-6hadbefe.js:44605-44650 facade-exports
function getHasFormattedOutput() {
  return getDebugLogger().hasFormattedOutput;
}
//@ chunk-6hadbefe.js:44650-44700 facade-exports (2.1.88 match: flushAsciicastRecorder, 0.626)
async function flushDebugLogs() {
  await getDebugLoggerConfig().instance?.flush();
}
//@ chunk-6hadbefe.js:44700-44826 facade-exports
function droppedDebugOutputTotals() {
  return isDiskless()
    ? {}
    : {
        debug_stderr_dropped_total: getStderrDroppedTotal(),
        debug_file_dropped_total: getDebugLoggerConfig().instance?.droppedLineTotal() ?? 0,
      };
}
//@ chunk-6hadbefe.js:44826-44871 facade-exports (2.1.88 match: fetchTeamMemory, 0.597)
function logForDebugging(
  message,
  options = {
    level: "debug",
  },
) {
  getDebugLogger().log(message, options);
}
//@ chunk-6hadbefe.js:44871-44906 facade-exports
function getDebugLogPath() {
  return getDebugLogger().logPath();
}
//@ chunk-6hadbefe.js:44906-44957 facade-exports
function isDefaultDebugLogPath(debugLogPath, sessionId) {
  return debugLogPath === getDebugLogger().defaultLogPath(sessionId);
}
//@ chunk-6hadbefe.js:44957-44982 facade-exports
function logAntError(message, options) {
  return;
}
//@ chunk-5xgkngpb.js:3461530-3461752 callgraph-witnessed (2.1.88 match: logForDebugging, 0.148)
/**
 * 把附件对象包成 type:'attachment' 消息（uuid、时间戳；queued_command/poll_events 沿用原时间戳）。旧版名 logForDebugging 为错配。
 */
function createAttachmentMessage_2(
  message,
  deps = {
    now: () => new Date().toISOString(),
    uuid: () => randomUUID(),
  },
) {
  let rendered = renderAttachment(message);
  return {
    attachment: message,
    type: "attachment",
    uuid: deps.uuid(),
    timestamp:
      ((message.type === "queued_command" || message.type === "poll_events") && message.timestamp) ||
      deps.now(),
    ...rendered,
  };
}
//@ chunk-b9mhcvry.js:292-330 fingerprint (2.1.88 match: LEVEL_ORDER, 0.87)
var LEVEL_ORDER = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
//@ chunk-af1hzzme.js:198164-198210 fingerprint (2.1.88 match: updateLatestDebugLogSymlink, 1)
/**
 * 更新 latest 符号链接时的最大尝试次数（256）。
 */
var LATEST_DEBUG_LOG_LINK = "latest";
var MAX_DEBUG_LATEST_LINK_ATTEMPTS = 256;
var MAX_DEBUG_LOG_ROTATE_BYTES = 2097152;
var MAX_DEBUG_LOG_TOTAL_BYTES = 33554432;
export {
  logForDebugging,
  getMinDebugLogLevel,
  createAttachmentMessage_2,
  mayWriteDebugLog,
  setHasFormattedOutput,
  logAntError,
  droppedDebugOutputTotals,
  isDebugToStdErr,
  initDefaultDebugLog,
  isDebugMode,
  getHasFormattedOutput,
  debugLogTakesLevel,
  flushDebugLogs,
  getDebugLogPath,
  MAX_DEBUG_LATEST_LINK_ATTEMPTS,
  MAX_DEBUG_LOG_ROTATE_BYTES,
  LATEST_DEBUG_LOG_LINK,
  MAX_DEBUG_LOG_TOTAL_BYTES,
  LEVEL_ORDER,
  getDebugFilePath,
  enableDebugLogging,
  isDefaultDebugLogPath,
  resetDebugCaches,
};
