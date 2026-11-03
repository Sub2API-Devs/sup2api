/**
 * utils/debug.ts
 *
 * 调试日志：--debug/-d、--debug=过滤、--debug-file、--debug-to-stderr，写 <配置目录>/debug/<session>.txt 并维护 latest 链接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/debug.ts
 * pieces: chunk-2f906bwf.js (1), chunk-cgr0tezp.js (36), chunk-e6aww6q8.js (1), chunk-qchp9vrd.js (1)
 * attribution: fingerprint 3, placement 1, sole-consumer 6, affinity 1, layout 10, facade-exports 17, callgraph-witnessed 1
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
import { isEnvTruthy, getClaudeConfigDir, getClaudeConfigDirOrNull } from "./envUtils.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { jsonStringify, shouldLogDebugCategory } from "./slowOperations.js";
import { withDeadline } from "./sleep.js";
import { isENOENT, isEISDIR } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { createBufferedWriter } from "./bufferedWriter.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, getSessionId, isDiskless } from "../bootstrap/state.js";
import { writeToStderr, getStderrDroppedTotal } from "./process.js";
import { renderAttachment } from "./messages.js";

//@ chunk-cgr0tezp.js:14410-14556 placement
/**
 * 运行环境是否提供 async_hooks（决定是否能用 AsyncLocalStorage）。
 */
var ASYNC_HOOKS_MODULE = globalThis.process?.getBuiltinModule?.("async_hooks");
var asyncHooksAvailable = ASYNC_HOOKS_MODULE !== undefined;
var backendStorageContext = ASYNC_HOOKS_MODULE
  ? new ASYNC_HOOKS_MODULE.AsyncLocalStorage()
  : {
      run: (e, n) => n(),
      getStore: () => {
        return;
      },
    };
//@ chunk-cgr0tezp.js:77194-77351 sole-consumer
/**
 * 调试日志轮转的大小上限（10 MiB）。
 */
var LOG_LEVEL_ORDER = {
  verbose: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};
var UNSAFE_LOG_CHARS = new RegExp(`(?!\\t)[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "gu");
var MAX_DEBUG_LOG_BYTES = 10485760;
var MAX_DEBUG_BACKLOG_BYTES = 1048576;
var DEBUG_BACKLOG_STALL_MS = 1e4;
var MAX_DEBUG_LINE_BYTES = 262144;
var DEBUG_SYNC_DRAIN_SUSPECT_MS = 5000;
var DEBUG_SYNC_DRAIN_DEADLINE_MS = 100;
var DEBUG_STUCK_DEFAULT = bindAsyncResource((e) => e());
//@ chunk-cgr0tezp.js:77351-77393 sole-consumer
/**
 * 判断字符串是否为合法的日志级别。
 */
function isValidLogLevel(e) {
  return Object.hasOwn(LOG_LEVEL_ORDER, e);
}
//@ chunk-cgr0tezp.js:77393-77432 sole-consumer
/**
 * 解析日志文件路径（Windows 设备路径返回 null）。
 */
function resolveLogPathOrNull(e) {
  return isWindowsDevicePath(e) ? null : resolve(e);
}
//@ chunk-cgr0tezp.js:77432-77447 sole-consumer
/**
 * 吞掉错误的空回调（用于 catch）。
 */
function noopLogError() {}
//@ chunk-cgr0tezp.js:77447-77477 sole-consumer
/**
 * 调试日志目的地的初始状态（v5 存储、无本地文件）。
 */
var DEFAULT_DEBUG_SINK_STATE = {
  arm: "v5",
  target: null,
};
//@ chunk-cgr0tezp.js:77477-77531 sole-consumer
/**
 * 按当前积压位置标记是否卡住。
 */
function markBacklogStuck(e, n) {
  e.stuck = e.appendSince === n ? "yes" : "no";
}
//@ chunk-cgr0tezp.js:77531-77568 affinity
/**
 * 空的日志上下文（无会话 id、非后端写入）。
 */
var EMPTY_LOG_CONTEXT = {
  sessionId: "",
  fromBackend: false,
};
//@ chunk-cgr0tezp.js:77568-77873 fingerprint = getDebugLogPath (0.414)
/**
 * 计算调试日志目标：默认 <配置目录>/debug/<sessionId>.txt（storage v5 时写存储），--debug-file 为原始文件并可轮换、更新 latest 链接。
 */
function resolveDebugLogTarget(e, n, r, i) {
  let s = join(n, "debug");
  let o = join(s, `${e.sessionId}.txt`);
  let a;
  if (r === null) a = o;
  else if (i !== null && r === i) a = join(i, `${e.sessionId}.txt`);
  else a = r;
  let u = !e.fromBackend && a === o ? "v5" : "raw";
  return {
    target: a,
    arm: u,
    configHome: n,
    rotate: u === "raw" && !(dirname(a) === s && a.endsWith(".txt")),
    pointLatest: u === "raw" && a !== o,
  };
}
//@ chunk-cgr0tezp.js:77873-77923 layout
/**
 * 把路径包装成用户命名的路径空间。
 */
function userNamedPathSpace(e) {
  return PathSpace.userNamed(isAbsolute(e) ? e : resolve(e));
}
//@ chunk-cgr0tezp.js:77923-77991 layout
/**
 * 判断重命名失败是否为 ENOENT 遥测失败。
 */
function isENOENTTelemetryFailure(error) {
  return error.code === "Failed" && error.telemetryCode === "ENOENT";
}
//@ chunk-cgr0tezp.js:77991-78029 layout
/**
 * 有 async_hooks 时保留存储 v5 参数，否则返回 undefined。
 */
function storageV5IfAsyncHooks(storageV5, n = asyncHooksAvailable) {
  return n ? storageV5 : undefined;
}
//@ chunk-cgr0tezp.js:78029-78303 layout
async function appendDebugToStore(e, sessionId, data, i) {
  let s = {
    namespace: "log",
    sessionId,
    channel: "debug",
  };
  let o = await backendStorageContext.run(true, () =>
    e.append(
      s,
      [
        {
          data,
        },
      ],
      i
        ? {
            markLatest: true,
          }
        : undefined,
    ),
  );
  if (o.ok) return "landed";
  return i && o.error.code === "InvalidArgument" && o.error.argument === "opts.markLatest"
    ? "refused"
    : "dropped";
}
//@ chunk-cgr0tezp.js:78303-89982 layout
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
  constructor(e) {
    this.deps = e;
    this.storageV5 = storageV5IfAsyncHooks(e.storageV5);
    if (e.launchIdentity !== undefined) {
      this.minLevel = e.launchIdentity.minLevel;
      this.filter = e.launchIdentity.filter;
      this.toStderr = e.launchIdentity.toStderr;
      this.filePath = e.launchIdentity.filePath;
      this.debugFromLaunch = e.launchIdentity.debugFromLaunch;
      return;
    }
    let argv = Array.isArray(e.argv) ? e.argv : [];
    let r = cliArgvReader();
    let i;
    if (r !== undefined) i = r(argv);
    else {
      let index = argv.indexOf("--");
      i = index === -1 ? argv : argv.slice(0, index);
    }
    let trimmed = e.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim();
    this.minLevel = trimmed && isValidLogLevel(trimmed) ? trimmed : "debug";
    let found = i.find((u) => u.startsWith("--debug="));
    this.filter = found ? parseDebugFilterCached(found.substring(8)) : null;
    this.toStderr = i.includes("--debug-to-stderr") || i.includes("-d2e");
    let a = null;
    for (let j = 0; j < i.length; j++) {
      let c = i[j];
      if (c.startsWith("--debug-file=")) {
        a = resolveLogPathOrNull(c.substring(13));
        break;
      }
      if (c === "--debug-file" && j + 1 < i.length) {
        a = resolveLogPathOrNull(i[j + 1]);
        break;
      }
    }
    this.filePath = a;
    this.debugFromLaunch =
      isEnvTruthy(e.env.DEBUG) ||
      isEnvTruthy(e.env.DEBUG_SDK) ||
      i.includes("--debug") ||
      i.includes("-d") ||
      this.toStderr ||
      found !== undefined ||
      this.filePath !== null;
  }
  isDebugMode() {
    return this.runtimeDebugEnabled || this.debugFromLaunch;
  }
  mayWrite(e) {
    return this.takesLevel(e) && (this.deps.isAnt || this.isDebugMode());
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
    let e = this.isDebugMode() || this.deps.isAnt;
    this.runtimeDebugEnabled = true;
    return e;
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
  defaultLogPath(e = this.deps.sessionId()) {
    return join(this.deps.configHomeDir(), "debug", `${e}.txt`);
  }
  learnedOverrideDirectory() {
    return this.overrideDirectory;
  }
  isArmed() {
    return this.storageV5 !== undefined;
  }
  takesLevel(e) {
    return LOG_LEVEL_ORDER[e] >= LOG_LEVEL_ORDER[this.minLevel];
  }
  log(
    e,
    { level: n } = {
      level: "debug",
    },
  ) {
    if (!this.takesLevel(n)) return;
    let r = this.deps.limits?.();
    if (r === undefined) {
      this.emit(e, n);
      return;
    }
    let i =
      e.length > r.maxMessageLength
        ? `debug message not logged: it has ${e.length} characters, over this log's fixed limit of ${r.maxMessageLength} per message`
        : e;
    let { admitted, leftOutBefore } = r.admit(i.length);
    if (!admitted) return;
    r.timed(() => {
      if (leftOutBefore > 0)
        this.emit(
          `debug messages not logged: ${leftOutBefore} since this log's last line, over its fixed limit on how much it logs at a time`,
          n,
        );
      this.emit(i, n);
    });
  }
  emit(e, n) {
    if (!this.shouldLog(e)) return;
    let r = redactSecrets(e.trim());
    r = r.includes(`
`)
      ? escapeControlChars(jsonStringify(r))
      : r.replace(UNSAFE_LOG_CHARS, toUnicodeEscapes);
    let s = `${new Date().toISOString()} [${n.toUpperCase()}] ${r}
`;
    if (this.toStderr) {
      this.deps.writeToStderr(s);
      return;
    }
    this.write(s);
  }
  write(content) {
    let writer = this.getWriter();
    let r = EMPTY_LOG_CONTEXT;
    if (this.storageV5 !== undefined) {
      r = {
        sessionId: this.deps.sessionId(),
        fromBackend: backendStorageContext.getStore() === true,
      };
      if (r.fromBackend) this.backendLinesLogged++;
    }
    writer.write({
      origin: r,
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
    let e = this.backlog.chain.then(() => true);
    do if (await withDeadline(e, DEBUG_SYNC_DRAIN_DEADLINE_MS)) return;
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
  succeed(e) {
    this.runtimeDebugEnabled = e.runtimeDebugEnabled;
    this.hasFormattedOutput = e.hasFormattedOutput;
    this.unflushedChunks = e.unflushedChunks;
    this.backlog = e.backlog;
    this.exitHandlerRegistered = e.exitHandlerRegistered;
    e.successor = this;
    e.dispose((n) => {
      this.write(n);
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
  async maybeRotate(e, n, r = MAX_DEBUG_LOG_BYTES) {
    let hostFiles =
      isStorageV5Enabled() && this.storageV5 !== undefined ? this.storageV5.hostFiles : undefined;
    if (this.writtenBytes < 0) {
      if (hostFiles) {
        let stats = await hostFiles.stat(userNamedPathSpace(e));
        this.writtenBytes = stats.ok && stats.value.kind !== "absent" ? stats.value.size : 0;
      } else
        this.writtenBytes = await stat(e)
          .then((s) => s.size)
          .catch(() => 0);
    } else this.writtenBytes += n;
    if (this.writtenBytes <= r || this.rotating) return;
    this.rotating = true;
    try {
      let s = e.endsWith(".txt") ? `${e.slice(0, -4)}.1.txt` : `${e}.1`;
      if (hostFiles) {
        let o = userNamedPathSpace(e);
        let a = userNamedPathSpace(s);
        let u = await hostFiles.rename(o, a);
        if (!u.ok && !isENOENTTelemetryFailure(u.error)) {
          await hostFiles.delete(a, {
            missingOk: true,
          });
          if (!(await hostFiles.rename(o, a)).ok)
            await hostFiles.delete(o, {
              missingOk: true,
            });
        }
      } else
        try {
          await rename(e, s);
        } catch (error) {
          if (!isENOENT(error)) {
            await unlink(s).catch(() => {});
            await rename(e, s).catch(() => unlink(e).catch(() => {}));
          }
        }
      this.writtenBytes = 0;
    } finally {
      this.rotating = false;
    }
  }
  shouldLog(e) {
    if (this.deps.isTestEnvironment && !this.toStderr && this.filePath === null) return false;
    if (!this.deps.isAnt && !this.isDebugMode()) return false;
    if (
      typeof process === "undefined" ||
      typeof process.versions === "undefined" ||
      typeof process.versions.node === "undefined"
    )
      return false;
    return shouldLogDebugCategory(e, this.filter);
  }
  resolveDirToFile(e) {
    this.resolvedLogPath = join(e, `${this.deps.sessionId()}.txt`);
    return this.resolvedLogPath;
  }
  async appendGroup(e, n, r, i) {
    if (this.storageV5 !== undefined && e.arm === "v5") {
      await this.appendV5AndMark(this.storageV5, n, r);
      return;
    }
    if (e.target === null || !this.writesFiles()) return;
    if (i)
      await mkdir(dirname(e.target), {
        recursive: true,
      }).catch(() => {});
    let s = e;
    try {
      await appendFile(e.target, r);
    } catch (error) {
      if (!isEISDIR(error)) throw error;
      if (this.storageV5 === undefined) {
        s = {
          ...e,
          target: this.resolveDirToFile(e.target),
        };
        await appendFile(s.target, r);
      } else {
        this.overrideDirectory = e.target;
        s = resolveDebugLogTarget(n, e.configHome, e.target, e.target);
        if (s.arm === "v5") {
          await this.appendV5AndMark(this.storageV5, n, r);
          return;
        }
        await mkdir(dirname(s.target), {
          recursive: true,
        }).catch(() => {});
        try {
          await appendFile(s.target, r);
        } catch {
          return;
        }
      }
    }
    if (s.rotate) {
      if (this.storageV5 !== undefined && s.target !== this.rotationTarget) {
        this.rotationTarget = s.target;
        this.writtenBytes = -1;
      }
      await this.maybeRotate(s.target, Buffer.byteLength(r)).catch(noopLogError);
    }
    if (s.pointLatest) this.markLatestSymlink();
  }
  async appendV5AndMark(e, n, r) {
    let i = isStorageV5Enabled();
    let s = i && !this.latestMarked && !this.latestRefused;
    let o = await appendDebugToStore(e, n.sessionId, r, s);
    if (o === "refused") {
      this.latestRefused = true;
      o = await appendDebugToStore(e, n.sessionId, r, false);
      this.log(
        "debug log: the storage backend refused markLatest; <debug folder>/latest is not pointed in this process",
        {
          level: "warn",
        },
      );
    }
    if (o !== "landed") return;
    if (s && !this.latestRefused) this.latestMarked = true;
    else if (!i) this.markLatestSymlink();
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
    let n = this.unflushedChunks[0];
    let queued = n?.queued;
    if (queued === undefined) return;
    let i = 0;
    let s = 0;
    let o = false;
    for (let { content, queued: queued_2 } of this.unflushedChunks) {
      if (
        queued_2 === undefined ||
        queued_2.owner !== queued.owner ||
        queued_2.decision.arm !== queued.decision.arm ||
        queued_2.decision.target !== queued.decision.target ||
        queued_2.origin.sessionId !== queued.origin.sessionId ||
        queued_2.origin.fromBackend !== queued.origin.fromBackend ||
        (i > 0 && s + content.length > MAX_DEBUG_LINE_BYTES)
      )
        break;
      i++;
      s += content.length;
      o ||= queued_2.needMkdir;
    }
    backlog.appendSince = Date.now();
    await queued.owner
      .appendGroup(
        queued.decision,
        queued.origin,
        this.unflushedChunks
          .slice(0, i)
          .map((unflushedChunk) => unflushedChunk.content)
          .join(""),
        o,
      )
      .catch(noopLogError);
    backlog.appendSince = 0;
    backlog.stuck = "no";
    if (this.unflushedChunks[0] === n) {
      this.unflushedChunks.splice(0, i);
      backlog.length -= s;
    }
  }
  drainSync() {
    if (this.unflushedChunks.length === 0) return;
    this.backlog.length = 0;
    if (!this.drainsSyncAtExit() || !this.writesFiles() || this.isAppendStuck()) {
      this.unflushedChunks.length = 0;
      return;
    }
    let e = [];
    for (let unflushedChunk of this.unflushedChunks.splice(0)) {
      if (unflushedChunk.target === null) continue;
      let last = e.at(-1);
      if (
        last !== undefined &&
        last.armed === unflushedChunk.armed &&
        (!unflushedChunk.armed || last.target === unflushedChunk.target)
      )
        last.parts.push(unflushedChunk);
      else
        e.push({
          target: unflushedChunk.target,
          armed: unflushedChunk.armed,
          parts: [unflushedChunk],
        });
    }
    for (let { target, armed, parts } of e) {
      let s = armed ? target : this.logPath();
      let joined = parts.map((part) => part.content).join("");
      try {
        getFsImplementation().mkdirSync(dirname(s));
      } catch {}
      try {
        getFsImplementation().appendFileSync(s, joined);
      } catch (error) {
        if (isEISDIR(error))
          try {
            if (!armed) getFsImplementation().appendFileSync(this.resolveDirToFile(s), joined);
            else {
              let u = (sessionId, g) => {
                try {
                  getFsImplementation().appendFileSync(join(s, `${sessionId}.txt`), g);
                } catch {}
              };
              let sessionId = parts[0]?.sessionId;
              let l = "";
              for (let part of parts) {
                if (part.sessionId !== sessionId) {
                  u(sessionId, l);
                  sessionId = part.sessionId;
                  l = "";
                }
                l += part.content;
              }
              u(sessionId, l);
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
  groupLines(e) {
    let n = e[0];
    if (n === undefined) return [];
    let r = this.filePath ?? this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR ?? null;
    let i = this.isSessionDiskless();
    if (i && (this.storageV5 === undefined || r !== null)) return [];
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
          origin: n.origin,
          lines: e,
        },
      ];
    let s = [];
    for (let o of e) {
      if (i && o.origin.fromBackend) continue;
      let last = s.at(-1);
      if (
        last !== undefined &&
        last.origin.sessionId === o.origin.sessionId &&
        last.origin.fromBackend === o.origin.fromBackend
      )
        last.lines.push(o);
      else
        s.push({
          decision: i
            ? DEFAULT_DEBUG_SINK_STATE
            : resolveDebugLogTarget(o.origin, this.deps.configHomeDir(), r, this.overrideDirectory),
          origin: o.origin,
          lines: [o],
        });
    }
    return s;
  }
  getWriter() {
    if (this.writer) return this.writer;
    let e = null;
    let armed = this.storageV5 !== undefined;
    this.writer = createBufferedWriter({
      writeBatch: (r) => {
        if (this.redirect) {
          this.redirect(r.map((o) => o.content).join(""));
          return;
        }
        if (this.exiting) {
          for (let o of this.groupLines(r))
            this.unflushedChunks.push({
              target: o.decision.target,
              sessionId: o.origin.sessionId,
              armed,
              content: this.takeDroppedNote() + o.lines.map((line) => line.content).join(""),
            });
          this.drainSync();
          return;
        }
        let i = this.writesFiles();
        let backlog = this.backlog;
        this.isAppendStuck();
        for (let o of this.groupLines(r)) {
          if (o.decision.arm === "raw" && !i) continue;
          if (
            backlog.droppedCount > 0
              ? backlog.length >= MAX_DEBUG_BACKLOG_BYTES / 2
              : backlog.length >= MAX_DEBUG_BACKLOG_BYTES &&
                Date.now() - (this.unflushedChunks[0]?.queued?.at ?? 1 / 0) >= DEBUG_BACKLOG_STALL_MS
          ) {
            backlog.droppedCount += o.lines.length;
            backlog.droppedTotal += o.lines.length;
            continue;
          }
          let a = this.takeDroppedNote() + o.lines.map((line) => line.content).join("");
          if (a === "") continue;
          let u = o.decision.arm === "raw" ? dirname(o.decision.target) : null;
          let needMkdir = u !== null && (o.origin.fromBackend || e !== u);
          if (u !== null) e = u;
          this.unflushedChunks.push({
            target: o.decision.target,
            sessionId: o.origin.sessionId,
            armed,
            content: a,
            queued: {
              at: Date.now(),
              owner: this,
              decision: o.decision,
              origin: o.origin,
              needMkdir,
            },
          });
          backlog.length += a.length;
          backlog.chain = DEBUG_STUCK_DEFAULT(() => backlog.chain.then(this.appendOldest));
        }
      },
      sizeOf: (r) => r.content.length,
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
      let e = this.logPath();
      let n = join(dirname(e), "latest");
      await unlink(n).catch(() => {});
      await symlink(e, n);
    } catch {}
  }
}
//@ chunk-cgr0tezp.js:89982-90167 layout
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
//@ chunk-cgr0tezp.js:90167-90192 layout
/**
 * 按进程根保存的调试日志器配置。
 */
var debugLoggerConfigByRoot = new HostScoped(() => new DebugLoggerConfig());
//@ chunk-cgr0tezp.js:90192-90220 layout
/**
 * 取出调试日志器配置（进程根作用域）。
 */
function getDebugLoggerConfig() {
  return onProcessRootHost(debugLoggerConfigByRoot);
}
//@ chunk-cgr0tezp.js:90220-90700 layout
function createDebugLogger(debugLoggerConfig, n) {
  return new DebugLogger({
    argv: process.argv,
    env: process.env,
    sessionId: () => getSessionId(),
    configHomeDir: () => getClaudeConfigDir(),
    onExit: (r) => {
      process.on("exit", r);
    },
    registerCleanup: (r) => {
      registerCleanup(r);
    },
    writeToStderr: (r) => {
      writeToStderr(r, {
        mayDrop: true,
      });
    },
    isAnt: n?.isAnt ?? false,
    isTestEnvironment: n?.isTestEnvironment ?? false,
    launchIdentity: n,
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
//@ chunk-cgr0tezp.js:90700-91055 facade-exports
function initDefaultDebugLog(e) {
  let debugLoggerConfig = getDebugLoggerConfig();
  debugLoggerConfig.setInit({
    storageV5: e.storageV5,
    configHome: getClaudeConfigDirOrNull(),
    syncExitDrain: e.syncExitDrain,
  });
  let instance = debugLoggerConfig.instance;
  if (instance) {
    let debugLogger = createDebugLogger(debugLoggerConfig, instance.launchIdentity());
    debugLoggerConfig.setInstance(debugLogger);
    debugLogger.succeed(instance);
  }
  if (e.syncExitDrain === false && !getDebugLogger().drainsSyncAtExit())
    logForDebugging(
      "Sync exit drain off for this process: debug lines still queued at exit are dropped, so this log may end short",
    );
}
//@ chunk-cgr0tezp.js:91055-91144 layout
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
//@ chunk-cgr0tezp.js:91144-91179 facade-exports
function getMinDebugLogLevel() {
  return getDebugLogger().minLevel;
}
//@ chunk-cgr0tezp.js:91179-91220 facade-exports
function debugLogTakesLevel(e) {
  return getDebugLogger().takesLevel(e);
}
//@ chunk-cgr0tezp.js:91220-91259 facade-exports
function isDebugMode() {
  return getDebugLogger().isDebugMode();
}
//@ chunk-cgr0tezp.js:91259-91303 facade-exports
function mayWriteDebugLog() {
  return getDebugLogger().mayWrite("debug");
}
//@ chunk-cgr0tezp.js:91303-91337 facade-exports
function isDebugToStdErr() {
  return getDebugLogger().toStderr;
}
//@ chunk-cgr0tezp.js:91337-91372 facade-exports
function getDebugFilePath() {
  return getDebugLogger().filePath;
}
//@ chunk-cgr0tezp.js:91372-91419 facade-exports
function enableDebugLogging() {
  return getDebugLogger().enableDebugLogging();
}
//@ chunk-cgr0tezp.js:91419-91513 facade-exports
function resetDebugCaches() {
  let debugLoggerConfig = getDebugLoggerConfig();
  let instance = debugLoggerConfig.instance;
  if (!instance) return;
  let debugLogger = createDebugLogger(debugLoggerConfig);
  debugLoggerConfig.setInstance(debugLogger);
  debugLogger.succeed(instance);
}
//@ chunk-cgr0tezp.js:91513-91554 facade-exports
function setHasFormattedOutput(hasFormattedOutput) {
  getDebugLogger().hasFormattedOutput = hasFormattedOutput;
}
//@ chunk-cgr0tezp.js:91554-91599 facade-exports
function getHasFormattedOutput() {
  return getDebugLogger().hasFormattedOutput;
}
//@ chunk-cgr0tezp.js:91599-91649 facade-exports = flushAsciicastRecorder (0.627)
async function flushDebugLogs() {
  await getDebugLoggerConfig().instance?.flush();
}
//@ chunk-cgr0tezp.js:91649-91775 facade-exports
function droppedDebugOutputTotals() {
  return isDiskless()
    ? {}
    : {
        debug_stderr_dropped_total: getStderrDroppedTotal(),
        debug_file_dropped_total: getDebugLoggerConfig().instance?.droppedLineTotal() ?? 0,
      };
}
//@ chunk-cgr0tezp.js:91775-91820 facade-exports = fetchTeamMemory (0.597)
/**
 * 写一行调试日志（默认 debug 级）到 DebugLogger：只有调试模式或 ant 构建才落盘，目标为 --debug-file 或 <配置目录>/debug/<sessionId>.txt，--debug-to-stderr 时写 stderr；按 --debug=过滤串筛分类。全局 3800+ 处调用。
 */
function logForDebugging(
  e,
  n = {
    level: "debug",
  },
) {
  getDebugLogger().log(e, n);
}
//@ chunk-cgr0tezp.js:91820-91855 facade-exports
function getDebugLogPath() {
  return getDebugLogger().logPath();
}
//@ chunk-cgr0tezp.js:91855-91906 facade-exports
function isDefaultDebugLogPath(debugLogPath, sessionId) {
  return debugLogPath === getDebugLogger().defaultLogPath(sessionId);
}
//@ chunk-cgr0tezp.js:91906-91931 facade-exports
function logAntError(e, n) {
  return;
}
//@ chunk-2f906bwf.js:292-330 fingerprint = LEVEL_ORDER (0.871)
var LEVEL_ORDER = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
//@ chunk-e6aww6q8.js:3373785-3374007 callgraph-witnessed = logForDebugging (0.147)
/**
 * 把附件对象包成 type:'attachment' 消息（uuid、时间戳；queued_command/poll_events 沿用原时间戳）。旧版名 logForDebugging 为错配。
 */
function createAttachmentMessage_2(
  message,
  n = {
    now: () => new Date().toISOString(),
    uuid: () => randomUUID(),
  },
) {
  let r = renderAttachment(message);
  return {
    attachment: message,
    type: "attachment",
    uuid: n.uuid(),
    timestamp:
      ((message.type === "queued_command" || message.type === "poll_events") && message.timestamp) || n.now(),
    ...r,
  };
}
//@ chunk-qchp9vrd.js:196768-196814 fingerprint = updateLatestDebugLogSymlink (1)
/**
 * 更新 latest 符号链接时的最大尝试次数（256）。
 */
var LATEST_DEBUG_LOG_LINK = "latest";
var MAX_DEBUG_LATEST_LINK_ATTEMPTS = 256;
var MAX_DEBUG_LOG_ROTATE_BYTES = 2097152;
var MAX_DEBUG_LOG_TOTAL_BYTES = 33554432;
export {
  logForDebugging,
  createAttachmentMessage_2,
  logAntError,
  setHasFormattedOutput,
  initDefaultDebugLog,
  isDebugToStdErr,
  isDebugMode,
  getDebugLogPath,
  getMinDebugLogLevel,
  LEVEL_ORDER,
  debugLogTakesLevel,
  mayWriteDebugLog,
  getHasFormattedOutput,
  flushDebugLogs,
  droppedDebugOutputTotals,
  enableDebugLogging,
  isDefaultDebugLogPath,
  MAX_DEBUG_LATEST_LINK_ATTEMPTS,
  MAX_DEBUG_LOG_ROTATE_BYTES,
  LATEST_DEBUG_LOG_LINK,
  MAX_DEBUG_LOG_TOTAL_BYTES,
  resetDebugCaches,
  getDebugFilePath,
};
