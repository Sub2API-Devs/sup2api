/**
 * utils/diagLogs.ts
 *
 * 无 PII 诊断日志：CLAUDE_CODE_DIAGNOSTICS_FILE 指定文件追加 JSON 行，withDiagnosticsTiming 计时。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/diagLogs.ts
 * pieces: chunk-23ta5myf.js (18)
 * attribution: placement 9, layout 6, callgraph-witnessed 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { dirname } from "path";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, isDiskless, isDisklessProcess } from "../bootstrap/state.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { getFsImplementation } from "./fsOperations.js";
import { jsonStringify } from "./slowOperations.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-23ta5myf.js:422-572 placement (2.1.88 match: propagateAbort, 1)
function propagateAbort(parents, weakChild) {
  let aborted = false;
  for (let parent of parents) {
    let parent_2 = parent.deref();
    if (parent_2 === undefined) parents.delete(parent);
    else if (parent_2 === weakChild) aborted = true;
  }
  if (aborted) return false;
  parents.add(new WeakRef(weakChild));
  return true;
}
//@ chunk-23ta5myf.js:572-679 placement (2.1.88 match: propagateAbort, 1)
/**
 * 取出仍存活的弱引用并清理已回收的。
 */
function liveWeakRefs(refs) {
  let live = [];
  for (let ref of refs) {
    let parent = ref.deref();
    if (parent === undefined) refs.delete(ref);
    else live.push(parent);
  }
  return live;
}
//@ chunk-23ta5myf.js:679-696 placement
/**
 * 标记“处于诊断作用域”的 AsyncLocalStorage。
 */
var diagScopeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var diagLoggingStarted;
deferInit("chunk-23ta5myf.js:679", () => {
  diagScopeStorage = new AsyncLocalStorage();
  diagLoggingStarted = false;
});
//@ chunk-23ta5myf.js:696-719 placement
/**
 * 是否开启诊断日志。
 */
function isDiagLogging() {
  return diagLoggingStarted;
}
//@ chunk-23ta5myf.js:719-763 placement
/**
 * 当前是否在诊断异步作用域内。
 */
function isInDiagScope() {
  return diagScopeStorage.getStore() !== undefined;
}
//@ chunk-23ta5myf.js:763-788 placement
/**
 * 按进程根登记的诊断日志活引用集合。
 */
var diagLogLiveRefs; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-23ta5myf.js:763", () => {
  diagLogLiveRefs = new HostScoped(() => new Set());
});
//@ chunk-23ta5myf.js:788-814 placement
/**
 * 取出诊断日志的活引用集合。
 */
function getDiagLiveRefs() {
  return onProcessRootHost(diagLogLiveRefs);
}
//@ chunk-23ta5myf.js:1005-1019 placement
/**
 * 吞掉错误的空回调（用于写入队列的 catch）。
 */
function noopErrback() {}
//@ chunk-23ta5myf.js:1019-1659 placement
/**
 * 诊断日志写入队列。
 */
class DiagLogWriter {
  pendingWrite = Promise.resolve();
  cleanupRegistered = false;
  notStarted = [];
  appendOldest = this.appendOldestNotStarted.bind(this);
  append(path, content) {
    let last = this.notStarted.at(-1);
    if (last?.logFile === path) {
      last.lines += content;
      return;
    }
    this.notStarted.push({
      logFile: path,
      lines: content,
    });
    this.pendingWrite = this.pendingWrite.then(this.appendOldest).catch(noopErrback);
    if (!this.cleanupRegistered) {
      this.cleanupRegistered = true;
      registerCleanup(() => this.flush());
    }
  }
  async appendOldestNotStarted() {
    let first = this.notStarted.shift();
    if (first === undefined) return;
    let fsImplementation = getFsImplementation();
    try {
      await fsImplementation.appendFile(first.logFile, first.lines);
    } catch {
      await fsImplementation.mkdir(dirname(first.logFile)).catch(noopErrback);
      await fsImplementation.appendFile(first.logFile, first.lines);
    }
  }
  flush() {
    return this.pendingWrite;
  }
}
//@ chunk-23ta5myf.js:1659-1682 layout
var diagnosticWriterByHost; // deferred: uses DiagLogWriter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-23ta5myf.js:1659", () => {
  diagnosticWriterByHost = new HostScoped(() => new DiagLogWriter());
});
//@ chunk-23ta5myf.js:1682-1708 layout
function getDiagnosticWriter() {
  return onProcessRootHost(diagnosticWriterByHost);
}
//@ chunk-23ta5myf.js:1708-1901 callgraph-witnessed (2.1.88 match: logForDiagnosticsNoPII, 0.237)
function logForDiagnosticsNoPII(level, event, data, lastLineWhen = "queued") {
  let logFile = getDiagnosticLogFile();
  if (!logFile) return;
  let line;
  try {
    line = formatDiagnosticLine(level, event, sanitizeDiagnosticData(data));
  } catch {
    line = formatDiagnosticLine(level, event, {
      diagnostics_payload_failed: true,
    });
  }
  if (lastLineWhen === "now")
    try {
      getFsImplementation().appendFileSync(logFile, line);
    } catch {}
  else getDiagnosticWriter().append(logFile, line);
}
//@ chunk-23ta5myf.js:1901-2004 layout
function sanitizeDiagnosticData(data) {
  try {
    return (typeof data === "function" ? data() : data) ?? {};
  } catch {
    return {
      diagnostics_payload_failed: true,
    };
  }
}
//@ chunk-23ta5myf.js:2004-3101 layout
/**
 * 格式化诊断日志行 {timestamp, level, event, data, version…}。
 */
function formatDiagnosticLine(level, event, data) {
  let record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
    cc_version:
      typeof {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      } !== "undefined"
        ? {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        : "unknown",
  };
  return (
    jsonStringify(record) +
    `
`
  );
}
//@ chunk-23ta5myf.js:3101-3135 layout
function flushDiagnosticLogs() {
  return getDiagnosticWriter().flush();
}
//@ chunk-23ta5myf.js:3135-3197 fingerprint (2.1.88 match: getDiagnosticLogFile, 1)
function getDiagnosticLogFile() {
  return isDisklessForDiagnostics() ? undefined : env.CLAUDE_CODE_DIAGNOSTICS_FILE;
}
//@ chunk-23ta5myf.js:3197-3232 layout
function isDisklessForDiagnostics() {
  return isInDiagScope() ? isDiskless() : isDisklessProcess();
}
//@ chunk-23ta5myf.js:3232-3470 fingerprint (2.1.88 match: withDiagnosticsTiming, 1)
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
export {
  logForDiagnosticsNoPII,
  isDiagLogging,
  isInDiagScope,
  withDiagnosticsTiming,
  flushDiagnosticLogs,
  liveWeakRefs,
  propagateAbort,
  getDiagLiveRefs,
};
