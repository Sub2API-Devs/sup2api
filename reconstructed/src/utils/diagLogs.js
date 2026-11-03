/**
 * utils/diagLogs.ts
 *
 * 无 PII 诊断日志：CLAUDE_CODE_DIAGNOSTICS_FILE 指定文件追加 JSON 行，withDiagnosticsTiming 计时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/diagLogs.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-nsfjm4vg.js (18)
 * attribution: fingerprint 2, placement 9, layout 7, callgraph-witnessed 1
 */
import { AsyncLocalStorage } from "async_hooks";
import { dirname } from "path";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, isDiskless, isDisklessProcess } from "../bootstrap/state.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { getFsImplementation } from "./fsOperations.js";
import { jsonStringify } from "./slowOperations.js";
import { env } from "./env.js";

//@ chunk-nsfjm4vg.js:422-572 placement = propagateAbort (1)
function propagateAbort(e, weakChild) {
  let n = false;
  for (let o of e) {
    let parent = o.deref();
    if (parent === undefined) e.delete(o);
    else if (parent === weakChild) n = true;
  }
  if (n) return false;
  e.add(new WeakRef(weakChild));
  return true;
}
//@ chunk-nsfjm4vg.js:572-679 placement = propagateAbort (1)
/**
 * 取出仍存活的弱引用并清理已回收的。
 */
function liveWeakRefs(e) {
  let t = [];
  for (let n of e) {
    let parent = n.deref();
    if (parent === undefined) e.delete(n);
    else t.push(parent);
  }
  return t;
}
//@ chunk-nsfjm4vg.js:679-696 placement
/**
 * 标记“处于诊断作用域”的 AsyncLocalStorage。
 */
var diagScopeStorage = new AsyncLocalStorage();
var diagLoggingStarted = false;
//@ chunk-nsfjm4vg.js:696-720 placement
/**
 * 是否开启诊断日志。
 */
function isDiagLogging() {
  return diagLoggingStarted;
}
//@ chunk-nsfjm4vg.js:720-764 placement = getAgentContext (1)
/**
 * 当前是否在诊断异步作用域内。
 */
function isInDiagScope() {
  return diagScopeStorage.getStore() !== undefined;
}
//@ chunk-nsfjm4vg.js:764-789 placement
/**
 * 按进程根登记的诊断日志活引用集合。
 */
var diagLogLiveRefs = new HostScoped(() => new Set());
//@ chunk-nsfjm4vg.js:789-815 placement
/**
 * 取出诊断日志的活引用集合。
 */
function getDiagLiveRefs() {
  return onProcessRootHost(diagLogLiveRefs);
}
//@ chunk-nsfjm4vg.js:1006-1020 placement
/**
 * 吞掉错误的空回调（用于写入队列的 catch）。
 */
function noopErrback() {}
//@ chunk-nsfjm4vg.js:1020-1660 placement
/**
 * 诊断日志写入队列。
 */
class DiagLogWriter {
  pendingWrite = Promise.resolve();
  cleanupRegistered = false;
  notStarted = [];
  appendOldest = this.appendOldestNotStarted.bind(this);
  append(e, t) {
    let last = this.notStarted.at(-1);
    if (last?.logFile === e) {
      last.lines += t;
      return;
    }
    this.notStarted.push({
      logFile: e,
      lines: t,
    });
    this.pendingWrite = this.pendingWrite.then(this.appendOldest).catch(noopErrback);
    if (!this.cleanupRegistered) {
      this.cleanupRegistered = true;
      registerCleanup(() => this.flush());
    }
  }
  async appendOldestNotStarted() {
    let e = this.notStarted.shift();
    if (e === undefined) return;
    let fsImplementation = getFsImplementation();
    try {
      await fsImplementation.appendFile(e.logFile, e.lines);
    } catch {
      await fsImplementation.mkdir(dirname(e.logFile)).catch(noopErrback);
      await fsImplementation.appendFile(e.logFile, e.lines);
    }
  }
  flush() {
    return this.pendingWrite;
  }
}
//@ chunk-nsfjm4vg.js:1660-1683 layout
var diagnosticWriterByHost = new HostScoped(() => new DiagLogWriter());
//@ chunk-nsfjm4vg.js:1683-1709 layout
function getDiagnosticWriter() {
  return onProcessRootHost(diagnosticWriterByHost);
}
//@ chunk-nsfjm4vg.js:1709-1902 callgraph-witnessed = logForDiagnosticsNoPII (0.237)
/**
 * 无 PII 的诊断日志：设置 CLAUDE_CODE_DIAGNOSTICS_FILE 时向该文件追加 JSON 行（timestamp/level/event/data），默认排队写。
 */
function logForDiagnosticsNoPII(level, event, n, lastLineWhen = "queued") {
  let logFile = getDiagnosticLogFile_2();
  if (!logFile) return;
  let r;
  try {
    r = formatDiagnosticLine(level, event, sanitizeDiagnosticData(n));
  } catch {
    r = formatDiagnosticLine(level, event, {
      diagnostics_payload_failed: true,
    });
  }
  if (lastLineWhen === "now")
    try {
      getFsImplementation().appendFileSync(logFile, r);
    } catch {}
  else getDiagnosticWriter().append(logFile, r);
}
//@ chunk-nsfjm4vg.js:1902-2005 layout
function sanitizeDiagnosticData(e) {
  try {
    return (typeof e === "function" ? e() : e) ?? {};
  } catch {
    return {
      diagnostics_payload_failed: true,
    };
  }
}
//@ chunk-nsfjm4vg.js:2005-3102 layout
/**
 * 格式化诊断日志行 {timestamp, level, event, data, version…}。
 */
function formatDiagnosticLine(level, event, data) {
  let o = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
    cc_version:
      typeof {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      } !== "undefined"
        ? {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        : "unknown",
  };
  return (
    jsonStringify(o) +
    `
`
  );
}
//@ chunk-nsfjm4vg.js:3102-3136 layout
function flushDiagnosticLogs() {
  return getDiagnosticWriter().flush();
}
//@ chunk-nsfjm4vg.js:3136-3198 layout = getDiagnosticLogFile (1)
function getDiagnosticLogFile_2() {
  return isDisklessForDiagnostics() ? undefined : env.CLAUDE_CODE_DIAGNOSTICS_FILE;
}
//@ chunk-nsfjm4vg.js:3198-3233 layout
function isDisklessForDiagnostics() {
  return isInDiagScope() ? isDiskless() : isDisklessProcess();
}
//@ chunk-nsfjm4vg.js:3233-3471 fingerprint = withDiagnosticsTiming (1)
async function withDiagnosticsTiming(event, fn, getData) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", `${event}_started`);
  try {
    let result = await fn();
    let additionalData = getData ? getData(result) : {};
    logForDiagnosticsNoPII("info", `${event}_completed`, {
      duration_ms: Date.now() - startTime,
      ...additionalData,
    });
    return result;
  } catch (error) {
    logForDiagnosticsNoPII("error", `${event}_failed`, {
      duration_ms: Date.now() - startTime,
    });
    throw error;
  }
}
//@ chunk-e6aww6q8.js:313160-313222 fingerprint = getDiagnosticLogFile (1)
function getDiagnosticLogFile() {
  return Boolean(env.CLAUDE_CODE_DIAGNOSTICS_FILE);
}
export {
  logForDiagnosticsNoPII,
  isDiagLogging,
  isInDiagScope,
  withDiagnosticsTiming,
  flushDiagnosticLogs,
  getDiagnosticLogFile,
  propagateAbort,
  liveWeakRefs,
  getDiagLiveRefs,
};
