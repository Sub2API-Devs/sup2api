/**
 * tasks/LocalShellTask/DetachedShellProcess.ts
 *
 * 2.1.316 新增。脱离的 shell 进程。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 2, affinity 1
 */
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, booleanSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fireDeadProbe, readProcessStartTicks, killIfSameProcess } from "../../daemon/deadProbe.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { logEvent } from "../../services/analytics/index.js";
import { isSameProcessAsync } from "../../utils/processIdentity.js";
import { env } from "../../utils/env.js";
import { openTaskOutputForAppend } from "../../utils/task/diskOutput.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:337520-337713 placement
var DETACHED_SHELL_POLL_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AUTO_RESTORE_CANCEL;
var autoRestoreResultSchema;
deferInit("chunk-czq1j3j2.js:337520", () => {
  DETACHED_SHELL_POLL_MS = 1000;
  AUTO_RESTORE_CANCEL = fromEnum("auto_restore_cancel");
  autoRestoreResultSchema = DoctorLazy(() =>
    objectSchema({
      rewound: booleanSchema(),
      error: stringSchema().optional().catch(undefined),
      reason: stringSchema().optional().catch(undefined),
      prefillText: stringSchema().nullable().optional().catch(undefined),
    }),
  );
});
//@ chunk-czq1j3j2.js:380878-380891 affinity
var GESTURE_WINDOW_MS = 1000;
//@ chunk-czq1j3j2.js:380891-382375 placement
class DetachedShellProcess {
  taskOutput;
  #e;
  #t;
  #o;
  #n = "backgrounded";
  #r = null;
  #s;
  result;
  constructor(options) {
    this.#e = options.pid;
    this.#t = options.procStart;
    this.#o = options.startTimeTicks;
    if (this.#t === undefined && this.#o !== undefined) fireDeadProbe("liveness");
    this.taskOutput = new TaskOutput(options.taskId, null, true);
    this.result = new Promise((resolve) => {
      this.#s = resolve;
    });
    this.#r = setInterval(() => void this.#l(), GESTURE_WINDOW_MS);
    this.#r.unref();
  }
  async #l() {
    if (this.#n !== "backgrounded") return;
    let isAlive = true;
    try {
      process.kill(this.#e, 0);
      if (this.#t !== undefined) {
        if (!(await isSameProcessAsync(this.#e, this.#t))) isAlive = false;
      } else if (this.#o !== undefined) {
        let processStartTicks = await readProcessStartTicks(this.#e);
        if (processStartTicks !== null && processStartTicks !== this.#o) isAlive = false;
      }
    } catch {
      isAlive = false;
    }
    if (!isAlive) await this.#i(false);
  }
  async #i(wasKilled) {
    if (this.#n !== "backgrounded") return;
    if (this.#r) {
      clearInterval(this.#r);
      this.#r = null;
    }
    this.#n = wasKilled ? "killed" : "completed";
    let hasIdentity = this.#t !== undefined || this.#o !== undefined;
    let notice = wasKilled
      ? hasIdentity
        ? "[SIGTERM requested for detached process tree (sent if identity still matched) \u2014 adopted handle released]"
        : "[detached process still running \u2014 adopted handle released]"
      : "[process exited while detached; exit code unknown]";
    await openTaskOutputForAppend(this.taskOutput.path)
      .then(async (taskOutputForAppend) => {
        try {
          await taskOutputForAppend.appendFile(`
${notice}
`);
        } finally {
          await taskOutputForAppend.close();
        }
      })
      .catch(() => {});
    let stdout = await this.taskOutput.getStdout();
    this.#s({
      code: -1,
      stdout,
      stderr: "",
      interrupted: wasKilled,
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
    if (this.#r) {
      clearInterval(this.#r);
      this.#r = null;
    }
    this.taskOutput.clear();
  }
  detach() {
    return Promise.resolve(this.#e);
  }
}
export { DETACHED_SHELL_POLL_MS, AUTO_RESTORE_CANCEL, DetachedShellProcess };
