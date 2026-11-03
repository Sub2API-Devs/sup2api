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
import { zbn } from "../../../tools/BashTool/prompt.js";
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
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_ticklish_pnueli",
      !1,
    );
    return e === !0 && source !== "override";
  } catch (error) {
    return (logError(Error("tengu_ticklish_pnueli could not be read", { cause: error })), !1);
  }
}
//@ chunk-tr0s0d0k.js:3024-3096 placement
function isServedNeckEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_neck", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:3096-3180 placement
function isServedFrogEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_frog", !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-tr0s0d0k.js:3180-3252 placement
function isServedNutEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_nut", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:3289-3321 placement
var SERVED_BACKGROUND_LIMITS = 4,
  To = 16,
  Mo = 8192,
  Oo = 1000;
/**
 * 远程工具服务端的后台命令表：登记/停止被云会话调用的后台 shell 命令，处理时间上限与所有权。
 */
//@ chunk-tr0s0d0k.js:3321-5826 placement
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
    return (n?.("caller_stopped"), n !== void 0);
  }
  async statusOf(e) {
    let n = this.#n.get(e);
    if (n === void 0) return;
    let o = await getVerifiedTaskOutputTail(n.started.shellId, Mo).then(
      (r) => r.content,
      () => {
        return;
      },
    );
    return { command: { ...n }, outputTail: o };
  }
  starterFor(e) {
    let n = this.#o,
      o = !1,
      r,
      s = () => {
        if (o) ((o = !1), this.#t--);
      },
      d = () =>
        e.lifetime.aborted || n !== this.#o || !e.enabled()
          ? "unavailable"
          : SandboxManager.getSandboxUnavailableReason() !== void 0 ||
              (SandboxManager.passesCheapSandboxGates() && !SandboxManager.isSandboxingEnabled())
            ? "sandbox_down"
            : void 0,
      u = () => {
        let p = d() ?? (!o && this.#e.size + this.#t >= e.max ? "full" : void 0);
        if (p === void 0) return;
        return (logFeatureSad("remote_tool_serve_background", p), backgroundRefusalMessage(p, e));
      };
    return {
      started: () => r,
      settle: (p) => {
        if ((s(), p && r !== void 0)) this.#e.get(r.shellId)?.("call_stopped");
      },
      starter: {
        reserve: () => {
          let p = u();
          if (p === void 0 && !o) ((o = !0), this.#t++);
          return p;
        },
        adopt: (p, h, _) => {
          let S = o ? d() : "unavailable";
          s();
          try {
            if (S !== void 0)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                backgroundRefusalMessage("unavailable", e),
                "served background command could not be owned",
              );
            return ((r = this.#r(p, h, _, e)), logFeatureOk("remote_tool_serve_background"), r.shellId);
          } catch (error) {
            throw (logFeatureBad("remote_tool_serve_background", "not_owned"), p.kill(), p.cleanup(), error);
          }
        },
      },
    };
  }
  #r(e, n, o, r) {
    let taskId = e.taskOutput.taskId,
      d = getTaskOutputPath(taskId);
    if (!e.background(taskId, { atExit: "kill" }))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        backgroundRefusalMessage("unavailable", r),
        "served background command had already ended",
      );
    let u = zbn(n),
      p = { shellId: taskId, outputPath: d, limitMs: u },
      h = { started: p, startedAt: Date.now() };
    this.#n.set(r.callId, h);
    let _ = !1,
      S = (O, X) => {
        if (_) return;
        if (
          ((_ = !0),
          clearTimeout(unref),
          clearInterval(unref_2),
          r.lifetime.removeEventListener("abort", R),
          this.#e.delete(taskId),
          (h.ended = { how: O, exitCode: X, at: Date.now() }),
          this.#n.delete(r.callId),
          O !== "call_stopped")
        ) {
          this.#n.set(r.callId, h);
          let filtered = [...this.#n].filter(([, j]) => j.ended);
          for (let [j] of filtered.slice(0, -To)) this.#n.delete(j);
        }
        try {
          r.onEvent(taskId, O);
        } catch (error) {
          logError(toError(error));
        }
        let J;
        try {
          if (O !== "exited") J = e.kill();
          (e.cleanup(),
            appendTaskOutput(
              taskId,
              O === "exited"
                ? `
[exited with code ${X}]
`
                : `
[stopped ${backgroundStopReasonText(O, r.targetName)}]
`,
            ),
            evictTaskOutput(taskId));
        } catch (error) {
          logError(toError(error));
        }
        L = L.then(() => J)
          .then(() => retireServedBackgroundShell(taskId))
          .catch((K) => logError(toError(K)))
          .finally(A);
      },
      R = () => S("serving_ended"),
      unref = setTimeout(S, u, "time_limit").unref(),
      L = fileServedBackgroundShell({
        id: taskId,
        pid: e.pid,
        command: o,
        caller: r.caller,
        folder: r.folder,
      }),
      unref_2 = setInterval(No, Oo, taskId, S).unref();
    r.lifetime.addEventListener("abort", R, { once: !0 });
    let A = registerCleanup(() => (R(), L));
    return (
      this.#e.set(taskId, S),
      e.result
        .then(async (O) => {
          (await e.taskOutput.flush(), S("exited", O.code));
        })
        .catch((O) => logError(toError(O))),
      r.onEvent(taskId, "started"),
      p
    );
  }
}
//@ chunk-tr0s0d0k.js:5826-5891 placement
function No(e, n) {
  takeServedBackgroundStopRequest(e).then((o) => {
    if (o) n("stopped_by_person");
  });
}
//@ chunk-tr0s0d0k.js:5891-5986 placement
function sessionModeFromStamp(e) {
  return e.arrivedOver === "session" && e.modeStamp === "present" ? e.sessionMode : void 0;
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
function refusedEnvelope(e, n, o, r, s = {}) {
  let d = clipText(r);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      ...(n.envelope && { call_id: n.envelope.call_id }),
      target: e,
      code: o,
      ...(s.reason !== void 0 && { reason: s.reason }),
      ...(s.limit !== void 0 && { limit: s.limit }),
      message: d,
      ...(s.notes !== void 0 && s.notes.length > 0 && { notes: s.notes }),
    },
    content: [{ type: "text", text: d }],
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
