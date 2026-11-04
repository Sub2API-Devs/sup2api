/**
 * utils/task/TaskOutput.ts
 *
 * 后台任务输出缓冲：内存保留、超限落盘与截断提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/TaskOutput.ts
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: sole-consumer 4, fingerprint 1
 */
import { logForDebugging } from "../debug.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession, isDiskless } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { CircularBuffer } from "../CircularBuffer.js";
import { logEvent } from "../../services/analytics/index.js";
import { errorMessage } from "../errors.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../log.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  bindTaskOutputPath,
  getTaskOutputPath,
  tailTaskOutput,
  DiskTaskOutput,
  openTaskOutputForRead,
  unlinkTaskOutput,
  releaseConvergentTaskOutputBinding,
} from "./diskOutput.js";
import { safeJoinLines } from "../stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { getMaxOutputLength } from "../shell/outputLimits.js";
import { readFileRange as readFileRange_2 } from "../fsOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:252979-253013 sole-consumer
var MEMORY_LIMIT_BYTES = 8388608;
var SIZE_CHECK_INTERVAL_MS = 1000;
var TAIL_READ_BYTES = 4096;
//@ chunk-e6aww6q8.js:253013-253502 sole-consumer
/**
 * 后台任务输出实例的注册表：按 taskId 注册/注销/查询 TaskOutput，并维护相关的辅助映射与定时器状态。
 */
class TaskOutputRegistry {
  #e = new Map();
  #t = new Map();
  #n = null;
  register(entry) {
    this.#e.set(entry.taskId, entry);
  }
  unregister(taskId) {
    this.#e.delete(taskId);
  }
  registeredInstance(taskId_2) {
    return this.#e.get(taskId_2);
  }
  startPolling(poller) {
    this.#t.set(poller.taskId, poller);
    if (!this.#n) {
      this.#n = setInterval(() => this.#o(), SIZE_CHECK_INTERVAL_MS);
      this.#n.unref();
    }
  }
  stopPolling(poller_2) {
    this.#t.delete(poller_2);
    if (this.#t.size === 0 && this.#n) {
      clearInterval(this.#n);
      this.#n = null;
    }
  }
  #o() {
    for (let [, poller_3] of this.#t) poller_3.pollProgress();
  }
  reset() {
    if (this.#n) clearInterval(this.#n);
    this.#n = null;
    this.#e.clear();
    this.#t.clear();
  }
}
//@ chunk-e6aww6q8.js:253502-253529 sole-consumer
var taskOutputRegistryByHost; // deferred: uses TaskOutputRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:253502", () => {
  taskOutputRegistryByHost = new HostScoped(() => new TaskOutputRegistry());
});
//@ chunk-e6aww6q8.js:253529-253568 sole-consumer
function taskOutputRegistry() {
  return taskOutputRegistryByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:253568-257176 fingerprint = TaskOutput (0.786)
/**
 * 后台任务输出缓冲：内存保存最近输出、超限时落盘到 .output 文件并给出截断提示。
 */
class TaskOutput {
  taskId;
  stdoutToFile;
  #e;
  #t = "";
  #n = "";
  #o = null;
  #r = false;
  #i = new CircularBuffer(1000);
  #s = 0;
  #a = 0;
  #d = 0;
  #c;
  #l;
  #u = false;
  #m = 0;
  constructor(taskId, onProgress, stdoutToFile = false, maxMemory = MEMORY_LIMIT_BYTES) {
    this.taskId = taskId;
    this.#e = stdoutToFile
      ? bindTaskOutputPath(taskId)
      : isDiskless()
        ? undefined
        : getTaskOutputPath(taskId);
    this.stdoutToFile = stdoutToFile;
    this.#c = maxMemory;
    this.#l = onProgress;
    if (stdoutToFile && onProgress) taskOutputRegistry().register(this);
  }
  get path() {
    return this.#e ?? getTaskOutputPath(this.taskId);
  }
  static startPolling(options) {
    let progress = taskOutputRegistry();
    let chunk = progress.registeredInstance(options);
    if (!chunk || !chunk.#l) return;
    progress.startPolling(chunk);
  }
  static stopPolling(text) {
    taskOutputRegistry().stopPolling(text);
  }
  pollProgress() {
    if (!this.#l) return;
    tailTaskOutput(this.path, TAIL_READ_BYTES).then(
      ({ content, bytesRead, bytesTotal }) => {
        if (!this.#l) return;
        if (!content) {
          this.#l("", "", this.#s, bytesTotal, false);
          return;
        }
        let pos = content.length;
        let handle = 0;
        let n100 = 0;
        let lineCount = 0;
        while (pos > 0) {
          pos = content.lastIndexOf(
            `
`,
            pos - 1,
          );
          lineCount++;
          if (lineCount === 5) handle = pos <= 0 ? 0 : pos + 1;
          if (lineCount === 100) n100 = pos <= 0 ? 0 : pos + 1;
        }
        let totalLines =
          bytesRead >= bytesTotal
            ? lineCount
            : Math.max(this.#s, Math.round((bytesTotal / bytesRead) * lineCount));
        this.#s = totalLines;
        this.#a = bytesTotal;
        this.#l(content.slice(handle), content.slice(n100), totalLines, bytesTotal, bytesRead < bytesTotal);
      },
      () => {},
    );
  }
  writeStdout(data) {
    this.#g(data, false);
  }
  writeStderr(data) {
    this.#g(data, true);
  }
  #g(data, isStderr) {
    this.#a += data.length;
    if (!isStderr) this.#d += data.length;
    this.#S(data);
    if (this.#o) {
      this.#o.append(isStderr ? `[stderr] ${data}` : data);
      return;
    }
    if (this.#r) return;
    if (this.#t.length + this.#n.length + data.length > this.#c) {
      this.#y(isStderr ? data : null, isStderr ? null : data);
      return;
    }
    if (isStderr) this.#n += data;
    else this.#t += data;
  }
  #S(data) {
    let state = 0;
    let lines = [];
    let extractedBytes = 0;
    let pos = data.length;
    while (pos > 0) {
      let prev = data.lastIndexOf(
        `
`,
        pos - 1,
      );
      if (prev === -1) break;
      state++;
      if (lines.length < 100 && extractedBytes < 4096) {
        let lineLen = pos - prev - 1;
        if (lineLen > 0 && lineLen <= 4096 - extractedBytes) {
          let line = data.slice(prev + 1, pos);
          if (line.trim()) {
            lines.push(Buffer.from(line).toString());
            extractedBytes += lineLen;
          }
        }
      }
      pos = prev;
    }
    this.#s += state;
    for (let i = lines.length - 1; i >= 0; i--) this.#i.add(lines[i]);
    if (this.#l && lines.length > 0) {
      let recent = this.#i.getRecent(5);
      this.#l(
        safeJoinLines(
          recent,
          `
`,
        ),
        safeJoinLines(
          this.#i.getRecent(100),
          `
`,
        ),
        this.#s,
        this.#a,
        this.#o !== null || this.#r,
      );
    }
  }
  #y(stderrChunk, stdoutChunk) {
    if (isDiskless()) {
      if (stdoutChunk !== null || stderrChunk !== null) this.#r = true;
      return;
    }
    this.#o = new DiskTaskOutput(this.taskId, this.path);
    if (this.#t) {
      this.#o.append(this.#t);
      this.#t = "";
    }
    if (this.#n) {
      this.#o.append(`[stderr] ${this.#n}`);
      this.#n = "";
    }
    if (stdoutChunk) this.#o.append(stdoutChunk);
    if (stderrChunk) this.#o.append(`[stderr] ${stderrChunk}`);
  }
  async getStdout(event) {
    if (this.stdoutToFile) return this.#p(event ?? getMaxOutputLength());
    if (this.#o) {
      let recent = this.#i.getRecent(5);
      let tail = safeJoinLines(
        recent,
        `
`,
      );
      let sizeKB = Math.round(this.#a / 1024);
      let notice =
        this.#o.failing || this.#o.lostOutput
          ? `
Output truncated (${sizeKB}KB total). The full output could not all be saved to ${this.path}; that file may be missing or incomplete.`
          : `
Output truncated (${sizeKB}KB total). Full output saved to: ${this.path}`;
      return tail ? tail + notice : notice.trimStart();
    }
    if (this.#r) {
      let output = `
Output truncated (${Math.round(this.#a / 1024)}KB total): later output was discarded because this session writes no files.`;
      return this.#t ? this.#t + output : output.trimStart();
    }
    return this.#t;
  }
  async #p(value) {
    try {
      let taskOutputForRead = await openTaskOutputForRead(this.path);
      if (taskOutputForRead === null) {
        logForDebugging(`TaskOutput.#readStdoutFromFile: ${this.path} is gone (ENOENT)`);
        return this.#h("ENOENT");
      }
      let result = await readFileRange_2(taskOutputForRead, 0, value).finally(() =>
        taskOutputForRead.close(),
      );
      if (!result) {
        this.#u = true;
        return "";
      }
      let { content, bytesRead, bytesTotal } = result;
      this.#m = bytesTotal;
      this.#u = bytesTotal <= bytesRead;
      return content;
    } catch (err) {
      let code = err instanceof Error && "code" in err ? String(err.code) : "unknown";
      logForDebugging(`TaskOutput.#readStdoutFromFile: failed to read ${this.path} (${code}): ${err}`);
      return this.#h(code);
    }
  }
  #h(onProgress) {
    return `<bash output unavailable: output file ${this.path} could not be read (${onProgress}). This usually means another Claude Code process in the same project deleted it during startup cleanup.>`;
  }
  getStderr() {
    if (this.#o) return "";
    return this.#n;
  }
  get totalLines() {
    return this.#s;
  }
  get totalBytes() {
    return this.#a;
  }
  get pipedStdoutBytes() {
    return this.#d;
  }
  get outputFileRedundant() {
    return this.#u;
  }
  get outputFileSize() {
    return this.#m;
  }
  spillToDisk() {
    if (!this.#o) this.#y(null, null);
  }
  async flush() {
    await this.#o?.flush();
  }
  async deleteOutputFile() {
    try {
      await unlinkTaskOutput(this.path);
    } catch {}
  }
  clear() {
    releaseConvergentTaskOutputBinding(this.taskId);
    this.#t = "";
    this.#n = "";
    this.#i.clear();
    this.#l = null;
    this.#o?.cancel();
    TaskOutput.stopPolling(this.taskId);
    taskOutputRegistry().unregister(this.taskId);
  }
}
export { TaskOutput };
