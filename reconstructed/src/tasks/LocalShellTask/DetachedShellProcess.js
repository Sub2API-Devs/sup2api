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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fireDeadProbe, readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSameProcessAsync } from "../../utils/processIdentity.js";
import { env } from "../../utils/env.js";
import { openTaskOutputForAppend } from "../../utils/task/diskOutput.js";

//@ chunk-18hwfzwa.js:343157-343170 placement
var DETACHED_SHELL_POLL_MS = 1000;
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
    this.#e = h.pid;
    this.#t = h.procStart;
    this.#o = h.startTimeTicks;
    if (this.#t === undefined && this.#o !== undefined) fireDeadProbe("liveness");
    this.taskOutput = new TaskOutput(h.taskId, null, true);
    this.result = new Promise((resolve) => {
      this.#r = resolve;
    });
    this.#s = setInterval(() => void this.#c(), DETACHED_SHELL_POLL_MS);
    this.#s.unref();
  }
  async #c() {
    if (this.#n !== "backgrounded") return;
    let h = true;
    try {
      process.kill(this.#e, 0);
      if (this.#t !== undefined) {
        if (!(await isSameProcessAsync(this.#e, this.#t))) h = false;
      } else if (this.#o !== undefined) {
        let processStartTicks = await readProcessStartTicks(this.#e);
        if (processStartTicks !== null && processStartTicks !== this.#o) h = false;
      }
    } catch {
      h = false;
    }
    if (!h) await this.#i(false);
  }
  async #i(h) {
    if (this.#n !== "backgrounded") return;
    if (this.#s) {
      clearInterval(this.#s);
      this.#s = null;
    }
    this.#n = h ? "killed" : "completed";
    let x = this.#t !== undefined || this.#o !== undefined;
    let D = h
      ? x
        ? "[SIGTERM requested for detached process tree (sent if identity still matched) \u2014 adopted handle released]"
        : "[detached process still running \u2014 adopted handle released]"
      : "[process exited while detached; exit code unknown]";
    await openTaskOutputForAppend(this.taskOutput.path)
      .then(async (taskOutputForAppend) => {
        try {
          await taskOutputForAppend.appendFile(`
${D}
`);
        } finally {
          await taskOutputForAppend.close();
        }
      })
      .catch(() => {});
    let stdout = await this.taskOutput.getStdout();
    this.#r({
      code: -1,
      stdout,
      stderr: "",
      interrupted: h,
      backgroundTaskId: this.taskOutput.taskId,
    });
  }
  get status() {
    return this.#n;
  }
  background() {
    return true;
  }
  async kill() {
    killIfSameProcess(this.#e, this.#o, this.#t);
    await this.#i(true);
  }
  cleanup() {
    if (this.#s) {
      clearInterval(this.#s);
      this.#s = null;
    }
    this.taskOutput.clear();
  }
  detach() {
    return Promise.resolve(this.#e);
  }
}
export { DetachedShellProcess };
