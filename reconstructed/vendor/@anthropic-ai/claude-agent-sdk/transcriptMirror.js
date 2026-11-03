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

//@ chunk-y805ph4h.js:2771-2793 placement
var Me = 500;
var we = 1048576;
//@ chunk-y805ph4h.js:2793-2810 placement
var ks = [200, 800];
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
  constructor(send, s) {
    this.send = send;
    let {
      sendTimeoutMs = 60000,
      onError,
      maxPendingEntries = Me,
      maxPendingBytes = we,
      backoffMs = ks,
    } = s ?? {};
    this.sendTimeoutMs = sendTimeoutMs;
    this.onError = onError;
    this.maxPendingEntries = maxPendingEntries;
    this.maxPendingBytes = maxPendingBytes;
    this.backoffMs = backoffMs;
  }
  enqueue(filePath, s) {
    let r = jsonStringify(s).length;
    this.pending.push({
      filePath,
      entries: s,
      bytes: r,
    });
    this.pendingEntries += s.length;
    this.pendingBytes += r;
    if (this.pendingEntries > this.maxPendingEntries || this.pendingBytes > this.maxPendingBytes) {
      this.flushPromise = this.drain();
      this.flushPromise.catch(() => {});
    }
  }
  async flush() {
    let e = this.drain();
    this.flushPromise = e;
    await e;
    if (this.flushPromise === e) this.flushPromise = null;
  }
  async drain() {
    let flushPromise = this.flushPromise;
    let s = this.pending.splice(0);
    this.pendingEntries = 0;
    this.pendingBytes = 0;
    if (flushPromise) await flushPromise;
    if (s.length === 0) return;
    await this.doFlush(s);
  }
  async doFlush(e) {
    let s = new Map();
    for (let r of e) {
      let n = s.get(r.filePath);
      if (n) n.push(...r.entries);
      else s.set(r.filePath, r.entries.slice());
    }
    for (let [r, n] of s) await this.sendWithRetry(r, n);
  }
  async sendWithRetry(e, s) {
    let r = this.backoffMs.length + 1;
    let n = `SessionStore.append() timed out after ${this.sendTimeoutMs}ms for ${e}`;
    let i;
    let m = 1;
    for (; m <= r; m++)
      try {
        await withTimeout(this.send(e, s), this.sendTimeoutMs, n);
        i = undefined;
        break;
      } catch (error) {
        i = toError(error);
        if (i.message === n) break;
        let h = this.backoffMs[m - 1];
        if (h === undefined) break;
        await sleep(h);
      }
    if (i) {
      logForDebugging(`[TranscriptMirrorBatcher] flush failed for ${e} after ${m} attempt(s): ${i}`, {
        level: "error",
      });
      try {
        this.onError?.(e, i);
      } catch (error) {
        logForDebugging(`[TranscriptMirrorBatcher] onError callback threw: ${error}`, {
          level: "error",
        });
      }
    }
  }
}
//@ chunk-y805ph4h.js:4447-4454 placement
var Et;
//@ chunk-y805ph4h.js:4454-4513 placement
(function (e) {
  e.Completable = "McpCompletable";
})(Et || (Et = {}));
//@ chunk-y805ph4h.js:4579-4639 placement
class Tt {
  debugFilePath = undefined;
  initPromise = null;
  logStem = null;
}
//@ chunk-y805ph4h.js:4639-4664 placement
var xs = new HostScoped(() => new Tt());
//@ chunk-y805ph4h.js:4664-4701 placement
function Pt() {
  return xs.of(getRootSession().host);
}
//@ chunk-y805ph4h.js:4701-5073 placement
function Mt(e) {
  if (e.initPromise) return e.initPromise;
  if (!isEnvVarTruthy("DEBUG_CLAUDE_AGENT_SDK")) {
    e.debugFilePath = null;
    e.initPromise = Promise.resolve();
    return e.initPromise;
  }
  let s = join(getClaudeConfigDir(), "debug");
  e.logStem = `sdk-${randomUUID_2()}`;
  e.debugFilePath = join(s, `${e.logStem}.txt`);
  process.stderr.write(`SDK debug logs: ${e.debugFilePath}
`);
  e.initPromise = getFileReader()
    .mkdir(s)
    .catch(() => {});
  return e.initPromise;
}
//@ chunk-y805ph4h.js:5073-5171 placement
function js(e) {
  return e.logStem === null
    ? null
    : {
        namespace: "log",
        sessionId: e.logStem,
        channel: "debug",
      };
}
//@ chunk-y805ph4h.js:5171-5231 placement
function It() {
  let e = Pt();
  Mt(e);
  return e.debugFilePath ?? null;
}
export { Pt, Mt, js, It, TranscriptMirrorBatcher, Me, we };
