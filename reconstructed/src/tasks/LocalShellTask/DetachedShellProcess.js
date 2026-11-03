/**
 * tasks/LocalShellTask/DetachedShellProcess.ts
 *
 * 2.1.316 新增。脱离的 shell 进程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { A_o, readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSameProcessAsync } from "../../utils/processIdentity.js";
import { env } from "../../utils/env.js";
import { openTaskOutputForAppend } from "../../utils/task/diskOutput.js";

//@ chunk-18hwfzwa.js:343157-343170 placement
var xBt = 1000;
//@ chunk-18hwfzwa.js:343170-344654 placement
class DetachedShellProcess {
  taskOutput;
  #e;
  #t;
  #o;
  #n = "backgrounded";
  #s = null;
  #r;
  result;
  constructor(h) {
    if (
      ((this.#e = h.pid),
      (this.#t = h.procStart),
      (this.#o = h.startTimeTicks),
      this.#t === void 0 && this.#o !== void 0)
    )
      A_o("liveness");
    ((this.taskOutput = new TaskOutput(h.taskId, null, !0)),
      (this.result = new Promise((x) => {
        this.#r = x;
      })),
      (this.#s = setInterval(() => void this.#c(), xBt)),
      this.#s.unref());
  }
  async #c() {
    if (this.#n !== "backgrounded") return;
    let h = !0;
    try {
      if ((process.kill(this.#e, 0), this.#t !== void 0)) {
        if (!(await isSameProcessAsync(this.#e, this.#t))) h = !1;
      } else if (this.#o !== void 0) {
        let x = await readProcessStartTicks(this.#e);
        if (x !== null && x !== this.#o) h = !1;
      }
    } catch {
      h = !1;
    }
    if (!h) await this.#i(!1);
  }
  async #i(h) {
    if (this.#n !== "backgrounded") return;
    if (this.#s) (clearInterval(this.#s), (this.#s = null));
    this.#n = h ? "killed" : "completed";
    let x = this.#t !== void 0 || this.#o !== void 0,
      D = h
        ? x
          ? "[SIGTERM requested for detached process tree (sent if identity still matched) \u2014 adopted handle released]"
          : "[detached process still running \u2014 adopted handle released]"
        : "[process exited while detached; exit code unknown]";
    await openTaskOutputForAppend(this.taskOutput.path)
      .then(async (ee) => {
        try {
          await ee.appendFile(`
${D}
`);
        } finally {
          await ee.close();
        }
      })
      .catch(() => {});
    let stdout = await this.taskOutput.getStdout();
    this.#r({
      code: -1,
      stdout: stdout,
      stderr: "",
      interrupted: h,
      backgroundTaskId: this.taskOutput.taskId,
    });
  }
  get status() {
    return this.#n;
  }
  background() {
    return !0;
  }
  async kill() {
    (killIfSameProcess(this.#e, this.#o, this.#t), await this.#i(!0));
  }
  cleanup() {
    if (this.#s) (clearInterval(this.#s), (this.#s = null));
    this.taskOutput.clear();
  }
  detach() {
    return Promise.resolve(this.#e);
  }
}

export { DetachedShellProcess };
