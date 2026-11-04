/**
 * @anthropic-ai/claude-agent-sdk/transcriptMirror.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/transcriptMirror.js
 * pieces: chunk-y805ph4h.js (11)
 * attribution: placement 11
 */
import { join } from "path";
import { randomUUID as randomUUID_2 } from "crypto";
import { jsonStringify } from "../../../src/utils/slowOperations.js";
import { withTimeout, sleep } from "../../../src/utils/sleep.js";
import { toError } from "../../../src/utils/errors.js";
import { logForDebugging } from "../../../src/utils/debug.js";
import { HostScoped } from "../../../src/utils/hostScoped.js";
import { getRootSession } from "../../../src/bootstrap/state.js";
import { isEnvVarTruthy, getClaudeConfigDir } from "../../../src/utils/envUtils.js";
import { getFileReader } from "../../../src/utils/fileStore.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y805ph4h.js:2771-2793 placement
var DEFAULT_MAX_PENDING_ENTRIES = 500;
var DEFAULT_MAX_PENDING_BYTES = 1048576;
//@ chunk-y805ph4h.js:2793-2810 placement
var DEFAULT_BACKOFF_MS = [200, 800];
//@ chunk-y805ph4h.js:2810-4447 placement
/**
 * Agent SDK 的转录镜像批处理器：把会话转录行批量转发给宿主（日志前缀 [TranscriptMirrorBatcher]）。
 */
class TranscriptMirrorBatcher {
  send;
  pending = [];
  pendingEntries = 0;
  pendingBytes = 0;
  flushPromise = null;
  sendTimeoutMs;
  onError;
  maxPendingEntries;
  maxPendingBytes;
  backoffMs;
  constructor(send, options) {
    this.send = send;
    let {
      sendTimeoutMs = 60000,
      onError,
      maxPendingEntries = DEFAULT_MAX_PENDING_ENTRIES,
      maxPendingBytes = DEFAULT_MAX_PENDING_BYTES,
      backoffMs = DEFAULT_BACKOFF_MS,
    } = options ?? {};
    this.sendTimeoutMs = sendTimeoutMs;
    this.onError = onError;
    this.maxPendingEntries = maxPendingEntries;
    this.maxPendingBytes = maxPendingBytes;
    this.backoffMs = backoffMs;
  }
  enqueue(filePath, entries) {
    let bytes = jsonStringify(entries).length;
    this.pending.push({
      filePath,
      entries,
      bytes,
    });
    this.pendingEntries += entries.length;
    this.pendingBytes += bytes;
    if (this.pendingEntries > this.maxPendingEntries || this.pendingBytes > this.maxPendingBytes) {
      this.flushPromise = this.drain();
      this.flushPromise.catch(() => {});
    }
  }
  async flush() {
    let drainPromise = this.drain();
    this.flushPromise = drainPromise;
    await drainPromise;
    if (this.flushPromise === drainPromise) this.flushPromise = null;
  }
  async drain() {
    let flushPromise = this.flushPromise;
    let inflight = this.pending.splice(0);
    this.pendingEntries = 0;
    this.pendingBytes = 0;
    if (flushPromise) await flushPromise;
    if (inflight.length === 0) return;
    await this.doFlush(inflight);
  }
  async doFlush(pending) {
    let byFile = new Map();
    for (let batch of pending) {
      let entries = byFile.get(batch.filePath);
      if (entries) entries.push(...batch.entries);
      else byFile.set(batch.filePath, batch.entries.slice());
    }
    for (let [filePath, entries] of byFile) await this.sendWithRetry(filePath, entries);
  }
  async sendWithRetry(filePath, entries) {
    let maxAttempts = this.backoffMs.length + 1;
    let timeoutMessage = `SessionStore.append() timed out after ${this.sendTimeoutMs}ms for ${filePath}`;
    let lastError;
    let attempt = 1;
    for (; attempt <= maxAttempts; attempt++)
      try {
        await withTimeout(this.send(filePath, entries), this.sendTimeoutMs, timeoutMessage);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = toError(error);
        if (lastError.message === timeoutMessage) break;
        let backoffMs = this.backoffMs[attempt - 1];
        if (backoffMs === undefined) break;
        await sleep(backoffMs);
      }
    if (lastError) {
      logForDebugging(
        `[TranscriptMirrorBatcher] flush failed for ${filePath} after ${attempt} attempt(s): ${lastError}`,
        {
          level: "error",
        },
      );
      try {
        this.onError?.(filePath, lastError);
      } catch (error) {
        logForDebugging(`[TranscriptMirrorBatcher] onError callback threw: ${error}`, {
          level: "error",
        });
      }
    }
  }
}
//@ chunk-y805ph4h.js:4447-4454 placement
var McpToolKind;
//@ chunk-y805ph4h.js:4454-4513 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y805ph4h.js:4454", () => {
  (function (holder) {
    holder.Completable = "McpCompletable";
  })(McpToolKind || (McpToolKind = {}));
});
//@ chunk-y805ph4h.js:4579-4639 placement
class DebugState {
  debugFilePath = undefined;
  initPromise = null;
  logStem = null;
}
//@ chunk-y805ph4h.js:4639-4664 placement
var debugStateByHost; // deferred: uses DebugState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y805ph4h.js:4639", () => {
  debugStateByHost = new HostScoped(() => new DebugState());
});
//@ chunk-y805ph4h.js:4664-4701 placement
function getDebugState() {
  return debugStateByHost.of(getRootSession().host);
}
//@ chunk-y805ph4h.js:4701-5073 placement
function ensureDebugFile(state) {
  if (state.initPromise) return state.initPromise;
  if (!isEnvVarTruthy("DEBUG_CLAUDE_AGENT_SDK")) {
    state.debugFilePath = null;
    state.initPromise = Promise.resolve();
    return state.initPromise;
  }
  let debugDir = join(getClaudeConfigDir(), "debug");
  state.logStem = `sdk-${randomUUID_2()}`;
  state.debugFilePath = join(debugDir, `${state.logStem}.txt`);
  process.stderr.write(`SDK debug logs: ${state.debugFilePath}
`);
  state.initPromise = getFileReader()
    .mkdir(debugDir)
    .catch(() => {});
  return state.initPromise;
}
//@ chunk-y805ph4h.js:5073-5171 placement
function getDebugLogMeta(state) {
  return state.logStem === null
    ? null
    : {
        namespace: "log",
        sessionId: state.logStem,
        channel: "debug",
      };
}
//@ chunk-y805ph4h.js:5171-5231 placement
function getDebugFilePath() {
  let state = getDebugState();
  ensureDebugFile(state);
  return state.debugFilePath ?? null;
}
export {
  getDebugState,
  ensureDebugFile,
  getDebugLogMeta,
  getDebugFilePath,
  TranscriptMirrorBatcher,
  DEFAULT_MAX_PENDING_ENTRIES,
  DEFAULT_MAX_PENDING_BYTES,
};
