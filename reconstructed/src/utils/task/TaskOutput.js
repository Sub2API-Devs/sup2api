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
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-e6aww6q8.js:252979-253013 sole-consumer
var gco = 8388608,
  hco = 1000,
  yco = 4096;
/**
 * 后台任务输出实例的注册表：按 taskId 注册/注销/查询 TaskOutput，并维护相关的辅助映射与定时器状态。
 */
//@ chunk-e6aww6q8.js:253013-253502 sole-consumer
class TaskOutputRegistry {
  #e = new Map();
  #t = new Map();
  #n = null;
  register(e) {
    this.#e.set(e.taskId, e);
  }
  unregister(e) {
    this.#e.delete(e);
  }
  registeredInstance(e) {
    return this.#e.get(e);
  }
  startPolling(e) {
    if ((this.#t.set(e.taskId, e), !this.#n))
      ((this.#n = setInterval(() => this.#o(), hco)), this.#n.unref());
  }
  stopPolling(e) {
    if ((this.#t.delete(e), this.#t.size === 0 && this.#n)) (clearInterval(this.#n), (this.#n = null));
  }
  #o() {
    for (let [, e] of this.#t) e.pollProgress();
  }
  reset() {
    if (this.#n) clearInterval(this.#n);
    ((this.#n = null), this.#e.clear(), this.#t.clear());
  }
}
//@ chunk-e6aww6q8.js:253502-253529 sole-consumer
var _co = new HostScoped(() => new TaskOutputRegistry());
//@ chunk-e6aww6q8.js:253529-253568 sole-consumer
function Lue() {
  return _co.of(getRootSession().host);
}
/**
 * 后台任务输出缓冲：内存保存最近输出、超限时落盘到 .output 文件并给出截断提示。
 */
//@ chunk-e6aww6q8.js:253568-257176 fingerprint = TaskOutput (0.786)
class TaskOutput {
  taskId;
  stdoutToFile;
  #e;
  #t = "";
  #n = "";
  #o = null;
  #r = !1;
  #i = new CircularBuffer(1000);
  #s = 0;
  #a = 0;
  #d = 0;
  #c;
  #l;
  #u = !1;
  #m = 0;
  constructor(e, n, r = !1, s = gco) {
    if (
      ((this.taskId = e),
      (this.#e = r ? bindTaskOutputPath(e) : isDiskless() ? void 0 : getTaskOutputPath(e)),
      (this.stdoutToFile = r),
      (this.#c = s),
      (this.#l = n),
      r && n)
    )
      Lue().register(this);
  }
  get path() {
    return this.#e ?? getTaskOutputPath(this.taskId);
  }
  static startPolling(e) {
    let n = Lue(),
      registeredInstance = n.registeredInstance(e);
    if (!registeredInstance || !registeredInstance.#l) return;
    n.startPolling(registeredInstance);
  }
  static stopPolling(e) {
    Lue().stopPolling(e);
  }
  pollProgress() {
    if (!this.#l) return;
    tailTaskOutput(this.path, yco).then(
      ({ content: content, bytesRead: bytesRead, bytesTotal: bytesTotal }) => {
        if (!this.#l) return;
        if (!content) {
          this.#l("", "", this.#s, bytesTotal, !1);
          return;
        }
        let s = content.length,
          h = 0,
          y = 0,
          S = 0;
        while (s > 0) {
          if (
            ((s = content.lastIndexOf(
              `
`,
              s - 1,
            )),
            S++,
            S === 5)
          )
            h = s <= 0 ? 0 : s + 1;
          if (S === 100) y = s <= 0 ? 0 : s + 1;
        }
        let w = bytesRead >= bytesTotal ? S : Math.max(this.#s, Math.round((bytesTotal / bytesRead) * S));
        ((this.#s = w),
          (this.#a = bytesTotal),
          this.#l(content.slice(h), content.slice(y), w, bytesTotal, bytesRead < bytesTotal));
      },
      () => {},
    );
  }
  writeStdout(e) {
    this.#g(e, !1);
  }
  writeStderr(e) {
    this.#g(e, !0);
  }
  #g(e, n) {
    if (((this.#a += e.length), !n)) this.#d += e.length;
    if ((this.#S(e), this.#o)) {
      this.#o.append(n ? `[stderr] ${e}` : e);
      return;
    }
    if (this.#r) return;
    if (this.#t.length + this.#n.length + e.length > this.#c) {
      this.#y(n ? e : null, n ? null : e);
      return;
    }
    if (n) this.#n += e;
    else this.#t += e;
  }
  #S(e) {
    let s = 0,
      h = [],
      y = 0,
      S = e.length;
    while (S > 0) {
      let index = e.lastIndexOf(
        `
`,
        S - 1,
      );
      if (index === -1) break;
      if ((s++, h.length < 100 && y < 4096)) {
        let L = S - index - 1;
        if (L > 0 && L <= 4096 - y) {
          let sliced = e.slice(index + 1, S);
          if (sliced.trim()) (h.push(Buffer.from(sliced).toString()), (y += L));
        }
      }
      S = index;
    }
    this.#s += s;
    for (let w = h.length - 1; w >= 0; w--) this.#i.add(h[w]);
    if (this.#l && h.length > 0) {
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
  #y(e, n) {
    if (isDiskless()) {
      if (n !== null || e !== null) this.#r = !0;
      return;
    }
    if (((this.#o = new DiskTaskOutput(this.taskId, this.path)), this.#t))
      (this.#o.append(this.#t), (this.#t = ""));
    if (this.#n) (this.#o.append(`[stderr] ${this.#n}`), (this.#n = ""));
    if (n) this.#o.append(n);
    if (e) this.#o.append(`[stderr] ${e}`);
  }
  async getStdout(e) {
    if (this.stdoutToFile) return this.#p(e ?? getMaxOutputLength());
    if (this.#o) {
      let recent = this.#i.getRecent(5),
        r = safeJoinLines(
          recent,
          `
`,
        ),
        rounded = Math.round(this.#a / 1024),
        h =
          this.#o.failing || this.#o.lostOutput
            ? `
Output truncated (${rounded}KB total). The full output could not all be saved to ${this.path}; that file may be missing or incomplete.`
            : `
Output truncated (${rounded}KB total). Full output saved to: ${this.path}`;
      return r ? r + h : h.trimStart();
    }
    if (this.#r) {
      let r = `
Output truncated (${Math.round(this.#a / 1024)}KB total): later output was discarded because this session writes no files.`;
      return this.#t ? this.#t + r : r.trimStart();
    }
    return this.#t;
  }
  async #p(e) {
    try {
      let n = await openTaskOutputForRead(this.path);
      if (n === null)
        return (
          logForDebugging(`TaskOutput.#readStdoutFromFile: ${this.path} is gone (ENOENT)`),
          this.#h("ENOENT")
        );
      let r = await readFileRange_2(n, 0, e).finally(() => n.close());
      if (!r) return ((this.#u = !0), "");
      let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = r;
      return ((this.#m = bytesTotal), (this.#u = bytesTotal <= bytesRead), content);
    } catch (error) {
      let r = error instanceof Error && "code" in error ? String(error.code) : "unknown";
      return (
        logForDebugging(`TaskOutput.#readStdoutFromFile: failed to read ${this.path} (${r}): ${error}`),
        this.#h(r)
      );
    }
  }
  #h(e) {
    return `<bash output unavailable: output file ${this.path} could not be read (${e}). This usually means another Claude Code process in the same project deleted it during startup cleanup.>`;
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
    (releaseConvergentTaskOutputBinding(this.taskId),
      (this.#t = ""),
      (this.#n = ""),
      this.#i.clear(),
      (this.#l = null),
      this.#o?.cancel(),
      TaskOutput.stopPolling(this.taskId),
      Lue().unregister(this.taskId));
  }
}

export { TaskOutput };
