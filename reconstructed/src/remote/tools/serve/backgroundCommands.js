/**
 * remote/tools/serve/backgroundCommands.ts
 *
 * 2.1.316 新增：服务端后台命令登记与拒绝信封
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (10)
 * attribution: placement 10
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../../services/analytics/growthbook.js";
import { logError } from "../../../utils/log.js";
import {
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../../utils/errors.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  getVerifiedTaskOutputTail,
  getTaskOutputPath,
  appendTaskOutput,
  evictTaskOutput,
} from "../../../utils/task/diskOutput.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import {
  backgroundRefusalMessage,
  backgroundStopReasonText,
} from "../../../services/remoteTools/hostRefusals.js";
import { getBackgroundTimeoutForDisplay } from "../../../tools/BashTool/prompt.js";
import {
  retireServedBackgroundShell,
  fileServedBackgroundShell,
  takeServedBackgroundStopRequest,
} from "./servedBackgroundShells.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";
import { clipText } from "../protocolSchemas.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";

//@ chunk-tr0s0d0k.js:2841-3024 placement
function readServedBackgroundOverride() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_ticklish_pnueli", false);
    return e === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_ticklish_pnueli could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-tr0s0d0k.js:3024-3096 placement
function isServedNeckEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_neck", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:3096-3180 placement
function isServedFrogEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_frog", true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-tr0s0d0k.js:3180-3252 placement
function isServedNutEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_nut", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:3289-3321 placement
/**
 * 远程工具服务端后台命令的限额：最多跟踪 4 条运行中的命令、16 条历史、输出尾部上限 8192 字节、停止轮询间隔 1 s。
 */
var SERVED_BACKGROUND_LIMITS = 4;
var MAX_TRACKED_BACKGROUND_COMMANDS = 16;
var MAX_BACKGROUND_OUTPUT_TAIL_BYTES = 8192;
var BACKGROUND_STOP_POLL_MS = 1000;
//@ chunk-tr0s0d0k.js:3321-5826 placement
/**
 * 远程工具服务端的后台命令表：登记/停止被云会话调用的后台 shell 命令，处理时间上限与所有权。
 */
class ServedBackgroundCommands {
  #e = new Map();
  #t = 0;
  #o = 0;
  #n = new Map();
  get running() {
    return this.#e.size;
  }
  stopAll(e) {
    this.#o++;
    for (let n of [...this.#e.values()]) n(e);
  }
  holds(e) {
    return this.#e.has(e);
  }
  stop(e) {
    let n = this.#e.get(e);
    n?.("caller_stopped");
    return n !== undefined;
  }
  async statusOf(e) {
    let n = this.#n.get(e);
    if (n === undefined) return;
    let outputTail = await getVerifiedTaskOutputTail(
      n.started.shellId,
      MAX_BACKGROUND_OUTPUT_TAIL_BYTES,
    ).then(
      (verifiedTaskOutputTail) => verifiedTaskOutputTail.content,
      () => {
        return;
      },
    );
    return {
      command: {
        ...n,
      },
      outputTail,
    };
  }
  starterFor(e) {
    let n = this.#o;
    let o = false;
    let r;
    let s = () => {
      if (o) {
        o = false;
        this.#t--;
      }
    };
    let d = () =>
      e.lifetime.aborted || n !== this.#o || !e.enabled()
        ? "unavailable"
        : SandboxManager.getSandboxUnavailableReason() !== undefined ||
            (SandboxManager.passesCheapSandboxGates() && !SandboxManager.isSandboxingEnabled())
          ? "sandbox_down"
          : undefined;
    let u = () => {
      let p = d() ?? (!o && this.#e.size + this.#t >= e.max ? "full" : undefined);
      if (p === undefined) return;
      logFeatureSad("remote_tool_serve_background", p);
      return backgroundRefusalMessage(p, e);
    };
    return {
      started: () => r,
      settle: (p) => {
        s();
        if (p && r !== undefined) this.#e.get(r.shellId)?.("call_stopped");
      },
      starter: {
        reserve: () => {
          let p = u();
          if (p === undefined && !o) {
            o = true;
            this.#t++;
          }
          return p;
        },
        adopt: (p, h, _) => {
          let S = o ? d() : "unavailable";
          s();
          try {
            if (S !== undefined)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                backgroundRefusalMessage("unavailable", e),
                "served background command could not be owned",
              );
            r = this.#r(p, h, _, e);
            logFeatureOk("remote_tool_serve_background");
            return r.shellId;
          } catch (error) {
            logFeatureBad("remote_tool_serve_background", "not_owned");
            p.kill();
            p.cleanup();
            throw error;
          }
        },
      },
    };
  }
  #r(e, n, command, r) {
    let taskId = e.taskOutput.taskId;
    let outputPath = getTaskOutputPath(taskId);
    if (
      !e.background(taskId, {
        atExit: "kill",
      })
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        backgroundRefusalMessage("unavailable", r),
        "served background command had already ended",
      );
    let backgroundTimeoutForDisplay = getBackgroundTimeoutForDisplay(n);
    let p = {
      shellId: taskId,
      outputPath,
      limitMs: backgroundTimeoutForDisplay,
    };
    let h = {
      started: p,
      startedAt: Date.now(),
    };
    this.#n.set(r.callId, h);
    let _ = false;
    let S = (O, code) => {
      if (_) return;
      _ = true;
      clearTimeout(B);
      clearInterval(V);
      r.lifetime.removeEventListener("abort", R);
      this.#e.delete(taskId);
      h.ended = {
        how: O,
        exitCode: code,
        at: Date.now(),
      };
      this.#n.delete(r.callId);
      if (O !== "call_stopped") {
        this.#n.set(r.callId, h);
        let filtered = [...this.#n].filter(([, j]) => j.ended);
        for (let [j] of filtered.slice(0, -MAX_TRACKED_BACKGROUND_COMMANDS)) this.#n.delete(j);
      }
      try {
        r.onEvent(taskId, O);
      } catch (error) {
        logError(toError(error));
      }
      let J;
      try {
        if (O !== "exited") J = e.kill();
        e.cleanup();
        appendTaskOutput(
          taskId,
          O === "exited"
            ? `
[exited with code ${code}]
`
            : `
[stopped ${backgroundStopReasonText(O, r.targetName)}]
`,
        );
        evictTaskOutput(taskId);
      } catch (error) {
        logError(toError(error));
      }
      L = L.then(() => J)
        .then(() => retireServedBackgroundShell(taskId))
        .catch((error) => logError(toError(error)))
        .finally(A);
    };
    let R = () => S("serving_ended");
    let B = setTimeout(S, backgroundTimeoutForDisplay, "time_limit").unref();
    let L = fileServedBackgroundShell({
      id: taskId,
      pid: e.pid,
      command,
      caller: r.caller,
      folder: r.folder,
    });
    let V = setInterval(pollServedBackgroundStop, BACKGROUND_STOP_POLL_MS, taskId, S).unref();
    r.lifetime.addEventListener("abort", R, {
      once: true,
    });
    let A = registerCleanup(() => {
      R();
      return L;
    });
    this.#e.set(taskId, S);
    e.result
      .then(async (O) => {
        await e.taskOutput.flush();
        S("exited", O.code);
      })
      .catch((error) => logError(toError(error)));
    r.onEvent(taskId, "started");
    return p;
  }
}
//@ chunk-tr0s0d0k.js:5826-5891 placement
function pollServedBackgroundStop(e, n) {
  takeServedBackgroundStopRequest(e).then((o) => {
    if (o) n("stopped_by_person");
  });
}
//@ chunk-tr0s0d0k.js:5891-5986 placement
function sessionModeFromStamp(facts) {
  return facts.arrivedOver === "session" && facts.modeStamp === "present" ? facts.sessionMode : undefined;
}
//@ chunk-tr0s0d0k.js:5986-6083 placement
function createNoteSet() {
  let e = new Map();
  return {
    add(n, o) {
      if (!e.has(n)) e.set(n, o);
    },
    lines: () => [...e.values()],
  };
}
//@ chunk-tr0s0d0k.js:6083-6396 placement
function refusedEnvelope(target, facts, code, r, s = {}) {
  let d = clipText(r);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target,
      code,
      ...(s.reason !== undefined && {
        reason: s.reason,
      }),
      ...(s.limit !== undefined && {
        limit: s.limit,
      }),
      message: d,
      ...(s.notes !== undefined &&
        s.notes.length > 0 && {
          notes: s.notes,
        }),
    },
    content: [
      {
        type: "text",
        text: d,
      },
    ],
  };
}
export {
  refusedEnvelope,
  createNoteSet,
  sessionModeFromStamp,
  isServedNutEnabled,
  SERVED_BACKGROUND_LIMITS,
  ServedBackgroundCommands,
  readServedBackgroundOverride,
  isServedNeckEnabled,
  isServedFrogEnabled,
};
