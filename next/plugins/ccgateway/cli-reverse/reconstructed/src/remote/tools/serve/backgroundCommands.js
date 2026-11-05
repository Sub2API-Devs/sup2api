/**
 * remote/tools/serve/backgroundCommands.ts
 *
 * 2.1.316 新增：服务端后台命令登记与拒绝信封
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6d2p9h2d.js (11)
 * attribution: placement 10, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { REQUEST_REAUTHORED } from "../reauthoredRequest.js";
import { clipText } from "../protocolSchemas.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";

//@ chunk-6d2p9h2d.js:3045-3228 placement
function readServedBackgroundOverride() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_ticklish_pnueli",
      false,
    );
    return flagValue === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_ticklish_pnueli could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-6d2p9h2d.js:3228-3300 placement
function isServedNeckEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_neck", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-6d2p9h2d.js:3300-3384 placement
function isServedFrogEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_frog", true) !== false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-6d2p9h2d.js:3384-3456 placement
function isServedNutEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_nut", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-6d2p9h2d.js:3493-3525 placement
/**
 * 远程工具服务端后台命令的限额：最多跟踪 4 条运行中的命令、16 条历史、输出尾部上限 8192 字节、停止轮询间隔 1 s。
 */
var SERVED_BACKGROUND_LIMITS = 4;
var MAX_TRACKED_BACKGROUND_COMMANDS = 16;
var MAX_BACKGROUND_OUTPUT_TAIL_BYTES = 8192;
var BACKGROUND_STOP_POLL_MS = 1000;
//@ chunk-6d2p9h2d.js:3525-6033 placement
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
  stopAll(reason) {
    this.#o++;
    for (let stopper of [...this.#e.values()]) stopper(reason);
  }
  holds(callId) {
    return this.#e.has(callId);
  }
  stop(callId) {
    let stopper = this.#e.get(callId);
    stopper?.("caller_stopped");
    return stopper !== undefined;
  }
  async statusOf(callId) {
    let record = this.#n.get(callId);
    if (record === undefined) return;
    let outputTail = await getVerifiedTaskOutputTail(
      record.started.shellId,
      MAX_BACKGROUND_OUTPUT_TAIL_BYTES,
    ).then(
      (verifiedTaskOutputTail) => verifiedTaskOutputTail.content,
      () => {
        return;
      },
    );
    return {
      command: {
        ...record,
      },
      outputTail,
    };
  }
  starterFor(serveOptions) {
    let epoch = this.#o;
    let reserved = false;
    let started;
    let releaseReservation = () => {
      if (reserved) {
        reserved = false;
        this.#t--;
      }
    };
    let unavailableReason = () =>
      serveOptions.lifetime.aborted || epoch !== this.#o || !serveOptions.enabled()
        ? "unavailable"
        : SandboxManager.getSandboxUnavailableReason() !== undefined ||
            (SandboxManager.passesCheapSandboxGates() && !SandboxManager.isSandboxingEnabled())
          ? "sandbox_down"
          : undefined;
    let refusalMessage = () => {
      let reason =
        unavailableReason() ?? (!reserved && this.#e.size + this.#t >= serveOptions.max ? "full" : undefined);
      if (reason === undefined) return;
      logFeatureSad("remote_tool_serve_background", reason);
      return backgroundRefusalMessage(reason, serveOptions);
    };
    return {
      started: () => started,
      settle: (completed) => {
        releaseReservation();
        if (completed && started !== undefined) this.#e.get(started.shellId)?.("call_stopped");
      },
      starter: {
        reserve: () => {
          let refusal = refusalMessage();
          if (refusal === undefined && !reserved) {
            reserved = true;
            this.#t++;
          }
          return refusal;
        },
        adopt: (proc, command, record) => {
          let refusal = reserved ? unavailableReason() : "unavailable";
          releaseReservation();
          try {
            if (refusal !== undefined)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                backgroundRefusalMessage("unavailable", serveOptions),
                "served background command could not be owned",
              );
            started = this.#r(proc, command, record, serveOptions);
            logFeatureOk("remote_tool_serve_background");
            return started.shellId;
          } catch (error) {
            logFeatureBad("remote_tool_serve_background", "not_owned");
            proc.kill();
            proc.cleanup();
            throw error;
          }
        },
      },
    };
  }
  #r(proc, timeoutMs, command, record) {
    let taskId = proc.taskOutput.taskId;
    let outputPath = getTaskOutputPath(taskId);
    if (
      !proc.background(taskId, {
        atExit: "kill",
      })
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        backgroundRefusalMessage("unavailable", record),
        "served background command had already ended",
      );
    let backgroundTimeoutForDisplay = getBackgroundTimeoutForDisplay(timeoutMs);
    let startedInfo = {
      shellId: taskId,
      outputPath,
      limitMs: backgroundTimeoutForDisplay,
    };
    let entry = {
      started: startedInfo,
      startedAt: Date.now(),
    };
    this.#n.set(record.callId, entry);
    let finished = false;
    let finish = (how, code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      clearInterval(pollTimer);
      record.lifetime.removeEventListener("abort", onLifetimeAbort);
      this.#e.delete(taskId);
      entry.ended = {
        how,
        exitCode: code,
        at: Date.now(),
      };
      this.#n.delete(record.callId);
      if (how !== "call_stopped") {
        this.#n.set(record.callId, entry);
        let filtered = [...this.#n].filter(([, kept]) => kept.ended);
        for (let [callId] of filtered.slice(0, -MAX_TRACKED_BACKGROUND_COMMANDS)) this.#n.delete(callId);
      }
      try {
        record.onEvent(taskId, how);
      } catch (error) {
        logError(toError(error));
      }
      let killResult;
      try {
        if (how !== "exited") killResult = proc.kill();
        proc.cleanup();
        appendTaskOutput(
          taskId,
          how === "exited"
            ? `
[exited with code ${code}]
`
            : `
[stopped ${backgroundStopReasonText(how, record.targetName)}]
`,
        );
        evictTaskOutput(taskId);
      } catch (error) {
        logError(toError(error));
      }
      filingPromise = filingPromise
        .then(() => killResult)
        .then(() => retireServedBackgroundShell(taskId))
        .catch((error) => logError(toError(error)))
        .finally(unregisterCleanup);
    };
    let onLifetimeAbort = () => finish("serving_ended");
    let timeoutTimer = setTimeout(finish, backgroundTimeoutForDisplay, "time_limit").unref();
    let filingPromise = fileServedBackgroundShell({
      id: taskId,
      pid: proc.pid,
      command,
      caller: record.caller,
      folder: record.folder,
    });
    let pollTimer = setInterval(pollServedBackgroundStop, BACKGROUND_STOP_POLL_MS, taskId, finish).unref();
    record.lifetime.addEventListener("abort", onLifetimeAbort, {
      once: true,
    });
    let unregisterCleanup = registerCleanup(() => {
      onLifetimeAbort();
      return filingPromise;
    });
    this.#e.set(taskId, finish);
    proc.result
      .then(async (result) => {
        await proc.taskOutput.flush();
        finish("exited", result.code);
      })
      .catch((error) => logError(toError(error)));
    record.onEvent(taskId, "started");
    return startedInfo;
  }
}
//@ chunk-6d2p9h2d.js:6033-6098 placement
function pollServedBackgroundStop(taskId, onStop) {
  takeServedBackgroundStopRequest(taskId).then((requested) => {
    if (requested) onStop("stopped_by_person");
  });
}
//@ chunk-6d2p9h2d.js:6098-6144 layout
function isMarkedMode(modeStamp) {
  return modeStamp === "present" || modeStamp === REQUEST_REAUTHORED;
}
//@ chunk-6d2p9h2d.js:6144-6232 placement
function sessionModeFromStamp(facts) {
  return facts.arrivedOver === "session" && isMarkedMode(facts.modeStamp) ? facts.sessionMode : undefined;
}
//@ chunk-6d2p9h2d.js:6232-6329 placement
function createNoteSet() {
  let notes = new Map();
  return {
    add(key, note) {
      if (!notes.has(key)) notes.set(key, note);
    },
    lines: () => [...notes.values()],
  };
}
//@ chunk-6d2p9h2d.js:6329-6642 placement
function refusedEnvelope(target, facts, code, message, options = {}) {
  let clippedMessage = clipText(message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target,
      code,
      ...(options.reason !== undefined && {
        reason: options.reason,
      }),
      ...(options.limit !== undefined && {
        limit: options.limit,
      }),
      message: clippedMessage,
      ...(options.notes !== undefined &&
        options.notes.length > 0 && {
          notes: options.notes,
        }),
    },
    content: [
      {
        type: "text",
        text: clippedMessage,
      },
    ],
  };
}
export {
  ServedBackgroundCommands,
  readServedBackgroundOverride,
  isServedNutEnabled,
  isServedNeckEnabled,
  isServedFrogEnabled,
  refusedEnvelope,
  createNoteSet,
  sessionModeFromStamp,
  SERVED_BACKGROUND_LIMITS,
  isMarkedMode,
};
