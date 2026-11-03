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
import {
  stat,
  stat as stat_2,
  rename,
  rename as rename_2,
  unlink,
  unlink as unlink_2,
  mkdir,
  mkdir as mkdir_2,
  appendFile,
  appendFile as appendFile_2,
  symlink,
  symlink as symlink_2,
} from "fs/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { RS } from "./sanitization.js";
import { bindAsyncResource } from "./asyncResourceBind.js";
import { isWindowsDevicePath } from "./windowsUncPaths.js";
import { PathSpace, escapeControlChars, toUnicodeEscapes } from "./resultError.js";
import { cliArgvReader } from "./cliArgvReader.js";
import { parseDebugFilterCached, registerCleanup } from "./cleanupRegistry.js";
import { isEnvTruthy, getClaudeConfigDir, getClaudeConfigDirOrNull } from "./envUtils.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { jsonStringify, sn } from "./slowOperations.js";
import { withDeadline } from "./sleep.js";
import { isENOENT, isEISDIR } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { createBufferedWriter } from "./bufferedWriter.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, getSessionId, isDiskless } from "../bootstrap/state.js";
import { writeToStderr, getStderrDroppedTotal } from "./process.js";
import { renderAttachment } from "./messages.js";

//@ chunk-cgr0tezp.js:14410-14556 placement
var ASYNC_HOOKS_MODULE = globalThis.process?.getBuiltinModule?.("async_hooks"),
  qt = ASYNC_HOOKS_MODULE !== void 0,
  et = ASYNC_HOOKS_MODULE
    ? new ASYNC_HOOKS_MODULE.AsyncLocalStorage()
    : {
        run: (e, n) => n(),
        getStore: () => {
          return;
        },
      };
//@ chunk-cgr0tezp.js:77194-77351 sole-consumer
var LOG_LEVEL_ORDER = { verbose: 0, debug: 1, info: 2, warn: 3, error: 4 },
  UNSAFE_LOG_CHARS = new RegExp(`(?!\\t)[${RS}]`, "gu"),
  qs = 10485760,
  pr = 1048576,
  Qs = 1e4,
  eo = 262144,
  to = 5000,
  hr = 100,
  no = bindAsyncResource((e) => e());
//@ chunk-cgr0tezp.js:77351-77393 sole-consumer
function ro(e) {
  return Object.hasOwn(LOG_LEVEL_ORDER, e);
}
//@ chunk-cgr0tezp.js:77393-77432 sole-consumer
function mr(e) {
  return isWindowsDevicePath(e) ? null : resolve(e);
}
//@ chunk-cgr0tezp.js:77432-77447 sole-consumer
function yr() {}
//@ chunk-cgr0tezp.js:77447-77477 sole-consumer
var io = { arm: "v5", target: null };
//@ chunk-cgr0tezp.js:77477-77531 sole-consumer
function so(e, n) {
  e.stuck = e.appendSince === n ? "yes" : "no";
}
//@ chunk-cgr0tezp.js:77531-77568 affinity
var oo = { sessionId: "", fromBackend: !1 };
/**
 * 计算调试日志目标：默认 <配置目录>/debug/<sessionId>.txt（storage v5 时写存储），--debug-file 为原始文件并可轮换、更新 latest 链接。
 */
//@ chunk-cgr0tezp.js:77568-77873 fingerprint = getDebugLogPath (0.414)
function resolveDebugLogTarget(e, n, r, i) {
  let s = join(n, "debug"),
    o = join(s, `${e.sessionId}.txt`),
    a;
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
function Dt(e) {
  return PathSpace.userNamed(isAbsolute(e) ? e : resolve(e));
}
//@ chunk-cgr0tezp.js:77923-77991 layout
function ao(e) {
  return e.code === "Failed" && e.telemetryCode === "ENOENT";
}
//@ chunk-cgr0tezp.js:77991-78029 layout
function uo(e, n = qt) {
  return n ? e : void 0;
}
//@ chunk-cgr0tezp.js:78029-78303 layout
async function appendDebugToStore(e, n, r, i) {
  let s = { namespace: "log", sessionId: n, channel: "debug" },
    run = await et.run(!0, () => e.append(s, [{ data: r }], i ? { markLatest: !0 } : void 0));
  if (run.ok) return "landed";
  return i && run.error.code === "InvalidArgument" && run.error.argument === "opts.markLatest"
    ? "refused"
    : "dropped";
}
/**
 * 调试日志器：从 argv/env 读取 --debug、-d、--debug=filter、--debug-to-stderr/-d2e、--debug-file、DEBUG/DEBUG_SDK、CLAUDE_CODE_DEBUG_LOG_LEVEL、CLAUDE_CODE_DEBUG_LOGS_DIR；行格式 `<ISO时间> [LEVEL] 消息`，消息经脱敏（redactSecrets），默认路径 <配置目录>/debug/<sessionId>.txt。
 */
//@ chunk-cgr0tezp.js:78303-89982 layout
class DebugLogger {
  deps;
  minLevel;
  filter;
  toStderr;
  filePath;
  runtimeDebugEnabled = !1;
  hasFormattedOutput = !1;
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
  exiting = !1;
  exitHandlerRegistered = !1;
  successor = null;
  writtenBytes = -1;
  rotating = !1;
  resolvedLogPath = null;
  overrideDirectory = null;
  rotationTarget = null;
  latestMarked = !1;
  latestRefused = !1;
  constructor(e) {
    this.deps = e;
    if (((this.storageV5 = uo(e.storageV5)), e.launchIdentity !== void 0)) {
      ((this.minLevel = e.launchIdentity.minLevel),
        (this.filter = e.launchIdentity.filter),
        (this.toStderr = e.launchIdentity.toStderr),
        (this.filePath = e.launchIdentity.filePath),
        (this.debugFromLaunch = e.launchIdentity.debugFromLaunch));
      return;
    }
    let n = Array.isArray(e.argv) ? e.argv : [],
      r = cliArgvReader(),
      i;
    if (r !== void 0) i = r(n);
    else {
      let index = n.indexOf("--");
      i = index === -1 ? n : n.slice(0, index);
    }
    let s = e.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim();
    this.minLevel = s && ro(s) ? s : "debug";
    let found = i.find((u) => u.startsWith("--debug="));
    ((this.filter = found ? parseDebugFilterCached(found.substring(8)) : null),
      (this.toStderr = i.includes("--debug-to-stderr") || i.includes("-d2e")));
    let a = null;
    for (let u = 0; u < i.length; u++) {
      let c = i[u];
      if (c.startsWith("--debug-file=")) {
        a = mr(c.substring(13));
        break;
      }
      if (c === "--debug-file" && u + 1 < i.length) {
        a = mr(i[u + 1]);
        break;
      }
    }
    ((this.filePath = a),
      (this.debugFromLaunch =
        isEnvTruthy(e.env.DEBUG) ||
        isEnvTruthy(e.env.DEBUG_SDK) ||
        i.includes("--debug") ||
        i.includes("-d") ||
        this.toStderr ||
        found !== void 0 ||
        this.filePath !== null));
  }
  isDebugMode() {
    return this.runtimeDebugEnabled || this.debugFromLaunch;
  }
  mayWrite(e) {
    return this.takesLevel(e) && (this.deps.isAnt || this.isDebugMode());
  }
  drainsSyncAtExit() {
    return !(isStorageV5Enabled() && this.storageV5 !== void 0 && this.deps.syncExitDrain === !1);
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
    return ((this.runtimeDebugEnabled = !0), e);
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
    return this.storageV5 !== void 0;
  }
  takesLevel(e) {
    return LOG_LEVEL_ORDER[e] >= LOG_LEVEL_ORDER[this.minLevel];
  }
  log(e, { level: n } = { level: "debug" }) {
    if (!this.takesLevel(n)) return;
    let r = this.deps.limits?.();
    if (r === void 0) {
      this.emit(e, n);
      return;
    }
    let i =
        e.length > r.maxMessageLength
          ? `debug message not logged: it has ${e.length} characters, over this log's fixed limit of ${r.maxMessageLength} per message`
          : e,
      { admitted: admitted, leftOutBefore: leftOutBefore } = r.admit(i.length);
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
  write(e) {
    let writer = this.getWriter(),
      r = oo;
    if (this.storageV5 !== void 0) {
      if (((r = { sessionId: this.deps.sessionId(), fromBackend: et.getStore() === !0 }), r.fromBackend))
        this.backendLinesLogged++;
    }
    if ((writer.write({ origin: r, content: e }), this.exiting)) writer.flush();
  }
  async flush() {
    let backendLinesLogged = this.backendLinesLogged;
    if ((this.writer?.flush(), await this.drained(), this.storageV5 !== void 0 && this.successor))
      return this.successor.flush();
    for (let n = 0; this.backendLinesLogged !== backendLinesLogged && n < 3; n++)
      ((backendLinesLogged = this.backendLinesLogged), this.writer?.flush(), await this.drained());
    if (this.backlog.droppedCount > 0 && this.backlog.length === 0 && !this.successor)
      (this.write(""), this.writer?.flush(), await this.drained());
  }
  async drained() {
    if (this.isAppendStuck()) return;
    let e = this.backlog.chain.then(() => !0);
    do if (await withDeadline(e, hr)) return;
    while (!this.isAppendStuck());
  }
  isAppendStuck() {
    let backlog = this.backlog,
      { appendSince: appendSince } = backlog;
    if (backlog.stuck === "no" && appendSince !== 0 && Date.now() - appendSince >= to)
      ((backlog.stuck = "suspected"), setTimeout(so, hr, backlog, appendSince).unref());
    return backlog.stuck === "yes";
  }
  dispose(e) {
    this.redirect = e;
    try {
      this.writer?.dispose();
    } finally {
      ((this.redirect = null), (this.writer = null));
    }
  }
  succeed(e) {
    ((this.runtimeDebugEnabled = e.runtimeDebugEnabled),
      (this.hasFormattedOutput = e.hasFormattedOutput),
      (this.unflushedChunks = e.unflushedChunks),
      (this.backlog = e.backlog),
      (this.exitHandlerRegistered = e.exitHandlerRegistered),
      (e.successor = this),
      e.dispose((n) => {
        this.write(n);
      }));
  }
  handleExit() {
    if (this.successor) {
      this.successor.handleExit();
      return;
    }
    if (((this.exiting = !0), this.backlog.droppedCount > 0))
      try {
        this.write("");
      } catch {}
    (this.writer?.flush(), this.drainSync());
  }
  async maybeRotate(e, n, r = qs) {
    let i = isStorageV5Enabled() && this.storageV5 !== void 0 ? this.storageV5.hostFiles : void 0;
    if (this.writtenBytes < 0)
      if (i) {
        let stats = await i.stat(Dt(e));
        this.writtenBytes = stats.ok && stats.value.kind !== "absent" ? stats.value.size : 0;
      } else
        this.writtenBytes = await stat(e)
          .then((s) => s.size)
          .catch(() => 0);
    else this.writtenBytes += n;
    if (this.writtenBytes <= r || this.rotating) return;
    this.rotating = !0;
    try {
      let s = e.endsWith(".txt") ? `${e.slice(0, -4)}.1.txt` : `${e}.1`;
      if (i) {
        let o = Dt(e),
          a = Dt(s),
          rename = await i.rename(o, a);
        if (!rename.ok && !ao(rename.error)) {
          if ((await i.delete(a, { missingOk: !0 }), !(await i.rename(o, a)).ok))
            await i.delete(o, { missingOk: !0 });
        }
      } else
        try {
          await rename(e, s);
        } catch (error) {
          if (!isENOENT(error))
            (await unlink(s).catch(() => {}), await rename(e, s).catch(() => unlink(e).catch(() => {})));
        }
      this.writtenBytes = 0;
    } finally {
      this.rotating = !1;
    }
  }
  shouldLog(e) {
    if (this.deps.isTestEnvironment && !this.toStderr && this.filePath === null) return !1;
    if (!this.deps.isAnt && !this.isDebugMode()) return !1;
    if (typeof process > "u" || typeof process.versions > "u" || typeof process.versions.node > "u")
      return !1;
    return sn(e, this.filter);
  }
  resolveDirToFile(e) {
    return ((this.resolvedLogPath = join(e, `${this.deps.sessionId()}.txt`)), this.resolvedLogPath);
  }
  async appendGroup(e, n, r, i) {
    if (this.storageV5 !== void 0 && e.arm === "v5") {
      await this.appendV5AndMark(this.storageV5, n, r);
      return;
    }
    if (e.target === null || !this.writesFiles()) return;
    if (i) await mkdir(dirname(e.target), { recursive: !0 }).catch(() => {});
    let s = e;
    try {
      await appendFile(e.target, r);
    } catch (error) {
      if (!isEISDIR(error)) throw error;
      if (this.storageV5 === void 0)
        ((s = { ...e, target: this.resolveDirToFile(e.target) }), await appendFile(s.target, r));
      else {
        if (
          ((this.overrideDirectory = e.target),
          (s = resolveDebugLogTarget(n, e.configHome, e.target, e.target)),
          s.arm === "v5")
        ) {
          await this.appendV5AndMark(this.storageV5, n, r);
          return;
        }
        await mkdir(dirname(s.target), { recursive: !0 }).catch(() => {});
        try {
          await appendFile(s.target, r);
        } catch {
          return;
        }
      }
    }
    if (s.rotate) {
      if (this.storageV5 !== void 0 && s.target !== this.rotationTarget)
        ((this.rotationTarget = s.target), (this.writtenBytes = -1));
      await this.maybeRotate(s.target, Buffer.byteLength(r)).catch(yr);
    }
    if (s.pointLatest) this.markLatestSymlink();
  }
  async appendV5AndMark(e, n, r) {
    let i = isStorageV5Enabled(),
      s = i && !this.latestMarked && !this.latestRefused,
      o = await appendDebugToStore(e, n.sessionId, r, s);
    if (o === "refused")
      ((this.latestRefused = !0),
        (o = await appendDebugToStore(e, n.sessionId, r, !1)),
        this.log(
          "debug log: the storage backend refused markLatest; <debug folder>/latest is not pointed in this process",
          { level: "warn" },
        ));
    if (o !== "landed") return;
    if (s && !this.latestRefused) this.latestMarked = !0;
    else if (!i) this.markLatestSymlink();
  }
  markLatestSymlink() {
    if (!this.latestMarked && this.writesFiles()) ((this.latestMarked = !0), this.updateLatestSymlink());
  }
  isSessionDiskless() {
    try {
      return this.deps.diskless?.() === !0;
    } catch {
      return !0;
    }
  }
  writesFiles() {
    if (this.isSessionDiskless()) return !1;
    try {
      return (
        this.deps.defaultFile?.() !== !1 ||
        this.filePath !== null ||
        this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR !== void 0
      );
    } catch {
      return !1;
    }
  }
  async appendOldestChunks() {
    let backlog = this.backlog,
      n = this.unflushedChunks[0],
      r = n?.queued;
    if (r === void 0) return;
    let i = 0,
      s = 0,
      o = !1;
    for (let { content: content, queued: queued } of this.unflushedChunks) {
      if (
        queued === void 0 ||
        queued.owner !== r.owner ||
        queued.decision.arm !== r.decision.arm ||
        queued.decision.target !== r.decision.target ||
        queued.origin.sessionId !== r.origin.sessionId ||
        queued.origin.fromBackend !== r.origin.fromBackend ||
        (i > 0 && s + content.length > eo)
      )
        break;
      (i++, (s += content.length), (o ||= queued.needMkdir));
    }
    if (
      ((backlog.appendSince = Date.now()),
      await r.owner
        .appendGroup(
          r.decision,
          r.origin,
          this.unflushedChunks
            .slice(0, i)
            .map((a) => a.content)
            .join(""),
          o,
        )
        .catch(yr),
      (backlog.appendSince = 0),
      (backlog.stuck = "no"),
      this.unflushedChunks[0] === n)
    )
      (this.unflushedChunks.splice(0, i), (backlog.length -= s));
  }
  drainSync() {
    if (this.unflushedChunks.length === 0) return;
    if (
      ((this.backlog.length = 0), !this.drainsSyncAtExit() || !this.writesFiles() || this.isAppendStuck())
    ) {
      this.unflushedChunks.length = 0;
      return;
    }
    let e = [];
    for (let n of this.unflushedChunks.splice(0)) {
      if (n.target === null) continue;
      let at = e.at(-1);
      if (at !== void 0 && at.armed === n.armed && (!n.armed || at.target === n.target)) at.parts.push(n);
      else e.push({ target: n.target, armed: n.armed, parts: [n] });
    }
    for (let { target: target, armed: armed, parts: parts } of e) {
      let s = armed ? target : this.logPath(),
        joined = parts.map((a) => a.content).join("");
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
              let u = (d, g) => {
                  try {
                    getFsImplementation().appendFileSync(join(s, `${d}.txt`), g);
                  } catch {}
                },
                c = parts[0]?.sessionId,
                l = "";
              for (let d of parts) {
                if (d.sessionId !== c) (u(c, l), (c = d.sessionId), (l = ""));
                l += d.content;
              }
              u(c, l);
            }
          } catch {}
      }
    }
  }
  droppedLineTotal() {
    return this.backlog.droppedTotal;
  }
  takeDroppedNote() {
    let { droppedCount: droppedCount } = this.backlog;
    if (droppedCount === 0) return "";
    return (
      (this.backlog.droppedCount = 0),
      `${new Date().toISOString()} [WARN] debug messages not logged: ${droppedCount} since the line above, because writes to this log were over 10 s behind, with over 1 MiB waiting
`
    );
  }
  groupLines(e) {
    let n = e[0];
    if (n === void 0) return [];
    let r = this.filePath ?? this.deps.env.CLAUDE_CODE_DEBUG_LOGS_DIR ?? null,
      isSessionDiskless = this.isSessionDiskless();
    if (isSessionDiskless && (this.storageV5 === void 0 || r !== null)) return [];
    if (this.storageV5 === void 0)
      return [
        {
          decision: { target: this.logPath(), arm: "raw", configHome: "", rotate: !0, pointLatest: !0 },
          origin: n.origin,
          lines: e,
        },
      ];
    let s = [];
    for (let o of e) {
      if (isSessionDiskless && o.origin.fromBackend) continue;
      let at = s.at(-1);
      if (
        at !== void 0 &&
        at.origin.sessionId === o.origin.sessionId &&
        at.origin.fromBackend === o.origin.fromBackend
      )
        at.lines.push(o);
      else
        s.push({
          decision: isSessionDiskless
            ? io
            : resolveDebugLogTarget(o.origin, this.deps.configHomeDir(), r, this.overrideDirectory),
          origin: o.origin,
          lines: [o],
        });
    }
    return s;
  }
  getWriter() {
    if (this.writer) return this.writer;
    let e = null,
      n = this.storageV5 !== void 0;
    if (
      ((this.writer = createBufferedWriter({
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
                armed: n,
                content: this.takeDroppedNote() + o.lines.map((line) => line.content).join(""),
              });
            this.drainSync();
            return;
          }
          let writesFiles = this.writesFiles(),
            backlog = this.backlog;
          this.isAppendStuck();
          for (let o of this.groupLines(r)) {
            if (o.decision.arm === "raw" && !writesFiles) continue;
            if (
              backlog.droppedCount > 0
                ? backlog.length >= pr / 2
                : backlog.length >= pr && Date.now() - (this.unflushedChunks[0]?.queued?.at ?? 1 / 0) >= Qs
            ) {
              ((backlog.droppedCount += o.lines.length), (backlog.droppedTotal += o.lines.length));
              continue;
            }
            let a = this.takeDroppedNote() + o.lines.map((line) => line.content).join("");
            if (a === "") continue;
            let u = o.decision.arm === "raw" ? dirname(o.decision.target) : null,
              c = u !== null && (o.origin.fromBackend || e !== u);
            if (u !== null) e = u;
            (this.unflushedChunks.push({
              target: o.decision.target,
              sessionId: o.origin.sessionId,
              armed: n,
              content: a,
              queued: { at: Date.now(), owner: this, decision: o.decision, origin: o.origin, needMkdir: c },
            }),
              (backlog.length += a.length),
              (backlog.chain = no(() => backlog.chain.then(this.appendOldest))));
          }
        },
        sizeOf: (r) => r.content.length,
        flushIntervalMs: 1000,
        maxBufferSize: 100,
        immediateMode: this.isDebugMode(),
      })),
      this.deps.registerCleanup(async () => {
        (this.writer?.dispose(), await this.drained());
      }),
      !this.exitHandlerRegistered)
    )
      ((this.exitHandlerRegistered = !0), this.deps.onExit(this.handleExit.bind(this)));
    return this.writer;
  }
  async updateLatestSymlink() {
    try {
      let logPath = this.logPath(),
        n = join(dirname(logPath), "latest");
      (await unlink(n).catch(() => {}), await symlink(logPath, n));
    } catch {}
  }
}
//@ chunk-cgr0tezp.js:89982-90167 layout
class DebugLoggerConfig {
  instance = void 0;
  init = {};
  defaultFile = !0;
  limits = void 0;
  setInstance(e) {
    this.instance = e;
  }
  setInit(e) {
    this.init = e;
  }
  disableDefaultFile() {
    this.defaultFile = !1;
  }
  setLimits(e) {
    this.limits = e;
  }
}
//@ chunk-cgr0tezp.js:90167-90192 layout
var lo = new HostScoped(() => new DebugLoggerConfig());
//@ chunk-cgr0tezp.js:90192-90220 layout
function Se() {
  return onProcessRootHost(lo);
}
//@ chunk-cgr0tezp.js:90220-90700 layout
function createDebugLogger(e, n) {
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
      writeToStderr(r, { mayDrop: !0 });
    },
    isAnt: n?.isAnt ?? !1,
    isTestEnvironment: n?.isTestEnvironment ?? !1,
    launchIdentity: n,
    storageV5:
      e.init.storageV5 !== void 0 && e.init.configHome === getClaudeConfigDirOrNull()
        ? e.init.storageV5
        : void 0,
    syncExitDrain: e.init.syncExitDrain,
    diskless: () => isDiskless(),
    defaultFile: () => e.defaultFile,
    limits: () => e.limits,
  });
}
//@ chunk-cgr0tezp.js:90700-91055 facade-exports
function initDefaultDebugLog(e) {
  let n = Se();
  n.setInit({
    storageV5: e.storageV5,
    configHome: getClaudeConfigDirOrNull(),
    syncExitDrain: e.syncExitDrain,
  });
  let instance = n.instance;
  if (instance) {
    let i = createDebugLogger(n, instance.launchIdentity());
    (n.setInstance(i), i.succeed(instance));
  }
  if (e.syncExitDrain === !1 && !getDebugLogger().drainsSyncAtExit())
    logForDebugging(
      "Sync exit drain off for this process: debug lines still queued at exit are dropped, so this log may end short",
    );
}
/**
 * 取（必要时创建）当前宿主的 DebugLogger 单例。
 */
//@ chunk-cgr0tezp.js:91055-91144 layout
function getDebugLogger() {
  let e = Se(),
    instance = e.instance;
  if (instance) return instance;
  let r = createDebugLogger(e);
  return (e.setInstance(r), r);
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
  let e = Se(),
    instance = e.instance;
  if (!instance) return;
  let r = createDebugLogger(e);
  (e.setInstance(r), r.succeed(instance));
}
//@ chunk-cgr0tezp.js:91513-91554 facade-exports
function setHasFormattedOutput(e) {
  getDebugLogger().hasFormattedOutput = e;
}
//@ chunk-cgr0tezp.js:91554-91599 facade-exports
function getHasFormattedOutput() {
  return getDebugLogger().hasFormattedOutput;
}
//@ chunk-cgr0tezp.js:91599-91649 facade-exports = flushAsciicastRecorder (0.627)
async function flushDebugLogs() {
  await Se().instance?.flush();
}
//@ chunk-cgr0tezp.js:91649-91775 facade-exports
function droppedDebugOutputTotals() {
  return isDiskless()
    ? {}
    : {
        debug_stderr_dropped_total: getStderrDroppedTotal(),
        debug_file_dropped_total: Se().instance?.droppedLineTotal() ?? 0,
      };
}
/**
 * 写一行调试日志（默认 debug 级）到 DebugLogger：只有调试模式或 ant 构建才落盘，目标为 --debug-file 或 <配置目录>/debug/<sessionId>.txt，--debug-to-stderr 时写 stderr；按 --debug=过滤串筛分类。全局 3800+ 处调用。
 */
//@ chunk-cgr0tezp.js:91775-91820 facade-exports = fetchTeamMemory (0.597)
function logForDebugging(e, n = { level: "debug" }) {
  getDebugLogger().log(e, n);
}
//@ chunk-cgr0tezp.js:91820-91855 facade-exports
function getDebugLogPath() {
  return getDebugLogger().logPath();
}
//@ chunk-cgr0tezp.js:91855-91906 facade-exports
function isDefaultDebugLogPath(e, n) {
  return e === getDebugLogger().defaultLogPath(n);
}
//@ chunk-cgr0tezp.js:91906-91931 facade-exports
function logAntError(e, n) {
  return;
}
//@ chunk-2f906bwf.js:292-330 fingerprint = LEVEL_ORDER (0.871)
var LEVEL_ORDER = { debug: 0, info: 1, warn: 2, error: 3 };
/**
 * 把附件对象包成 type:'attachment' 消息（uuid、时间戳；queued_command/poll_events 沿用原时间戳）。旧版名 logForDebugging 为错配。
 */
//@ chunk-e6aww6q8.js:3373785-3374007 callgraph-witnessed = logForDebugging (0.147)
function createAttachmentMessage_2(
  message,
  n = { now: () => new Date().toISOString(), uuid: () => randomUUID_32() },
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
var LATEST_DEBUG_LOG_LINK = "latest",
  fl = 256,
  pl = 2097152,
  Pp = 33554432;

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
  fl,
  pl,
  LATEST_DEBUG_LOG_LINK,
  Pp,
  resetDebugCaches,
  getDebugFilePath,
};
