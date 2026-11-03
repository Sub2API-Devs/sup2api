/**
 * cli/print/bangCommands.ts
 *
 * 2.1.316 新增：无头/远程会话中 ! 命令的环境检查、确认与执行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (11)
 * attribution: placement 11
 */
import { resolve, resolve as resolve_2 } from "path";
import { Vt } from "../../utils/agentId.js";
import { logForDebugging } from "../../utils/debug.js";
import { BANG_COMMAND_LIMITS, aH, BANG_COMMAND_TEXT, PR, dH, f_, IR, AR, CR } from "./commandQueueDrain.js";
import { getStructuredIO } from "../print.js";
import { BASH_INPUT, BASH_STDERR } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { escapeControlChars } from "../../utils/stringUtils.js";
import { createChildAbortController } from "../../utils/abortController.js";
import { logError } from "../../utils/log.js";
import { rewindRequestAge } from "../remoteIO/turnHandoff.js";
import { OTHER_DIRECTORY_WORDS, describeSpawnFailure } from "../../utils/shell/headlessBash.js";
import { withDeadline } from "../../utils/sleep.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isAbortError } from "../../utils/errors.js";

/**
 * 处理 SDK/远程传来的 bash_command（"!" 命令）消息：去重、校验运行环境与时钟、执行并回传输出。
 */
//@ chunk-tyg7f3ek.js:122542-124062 placement
function handleRemoteBashCommand(e, n, r) {
  let s = Vt(e.uuid) ?? void 0;
  if (s !== void 0) {
    if (!r.receivedMessageUuids.track(s)) {
      logForDebugging(`Skipping duplicate bash_command message: ${s}`);
      return;
    }
    (r.started(s), r.completed(s));
  }
  let h =
    typeof e.command === "string"
      ? e.command.replace(
          /\r\n/g,
          `
`,
        )
      : e.command;
  if (typeof h !== "string" || h.trim() === "") {
    emitRemoteBashInput(r, "no_command", "Not run: no command was given.");
    return;
  }
  if (h.length > BANG_COMMAND_LIMITS) {
    emitRemoteBashInput(
      r,
      "command_too_long",
      `Not run: the command is longer than ${BANG_COMMAND_LIMITS.toLocaleString("en-US")} characters. Ask Claude to run it instead.`,
    );
    return;
  }
  let y = typeof e.cwd === "string" ? e.cwd : void 0,
    S = aH.test(h)
      ? {
          reason: "control_characters",
          words:
            "Not run: the command contains hidden control characters, such as an Escape or a carriage return, which often come from pasted text. Type the command in yourself instead of pasting it.",
        }
      : checkBangCommandEnvironment(r, n, s),
    R = S === void 0 ? conversationJoins(r) : !1;
  if (
    (r.emit(
      getStructuredIO(r.sessionId, `<${BASH_INPUT}>${escapeXml(escapeControlChars(h))}</${BASH_INPUT}>`),
    ),
    S !== void 0)
  ) {
    emitRemoteBashInput(r, S.reason, S.words);
    return;
  }
  let w = (q) => {
    let x = checkBangCommandRunnable(r, y, q);
    if (x !== void 0) {
      emitRemoteBashInput(r, x.reason, x.words);
      return;
    }
    if (q && r.conversation !== void 0) {
      let { enqueue: enqueue } = r.conversation,
        Z = createChildAbortController(r.abortController);
      return r.running
        .whileAdmitting(s, Z, waitForBangAckConfirmation(r, h, Z.signal))
        .then((re) => {
          if (re) enqueue(h, s, y);
        })
        .catch(logError);
    }
    return r.running.start(s, r.abortController, async (G) => {
      if (await waitForBangAckConfirmation(r, h, G))
        r.emit(getStructuredIO(r.sessionId, await runBangCommand(r, h, y, G)));
    });
  };
  if (typeof R === "boolean") return w(R);
  let P = createChildAbortController(r.abortController),
    L;
  return r.running
    .whileAdmitting(
      s,
      P,
      Promise.race([R, abortSignalPromise(P.signal)]).then((q) => {
        if (P.signal.aborted || q === void 0) return (emitBangCommandAborted(r, h), !1);
        return ((L = w(q)), !0);
      }),
    )
    .then(() => L, logError);
}
//@ chunk-tyg7f3ek.js:124062-124194 placement
function conversationJoins(e) {
  try {
    let n = e.conversation?.joins() ?? !1;
    return typeof n === "boolean" ? n : n.catch((r) => (logError(r), !1));
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-tyg7f3ek.js:124194-125759 placement
function checkBangCommandEnvironment(e, n, r) {
  let { hosting: hosting, readsSessionStream: readsSessionStream } = e.worker;
  if (!(readsSessionStream ? hosting === "anthropic_cloud" || hosting === "runner" : hosting === "local"))
    return {
      reason: "environment_kind_refused",
      words:
        hosting === "bridge"
          ? "Not run: '!' commands aren't available in Remote Control sessions. Run the command directly on the computer the session is running on."
          : `Not run: '!' commands aren't available for this kind of session. ${BANG_COMMAND_TEXT}`,
    };
  if (e.worker.sessionKind !== void 0)
    return {
      reason: "unattended_session",
      words: `Not run: '!' commands don't run in a background session. ${BANG_COMMAND_TEXT}`,
    };
  if (n.startedBefore)
    return {
      reason: "started_before_restart",
      words:
        "Not run: the machine restarted before it could run this command. Send it again if you still want it.",
    };
  if (readsSessionStream) {
    if (r === void 0) return { reason: "no_event_id", words: PR };
    if (n.storedAt === void 0) return { reason: "age_unknown", words: PR };
    if (n.serviceNow === void 0 && n.serviceNowAtMost === void 0)
      return { reason: "clock_unknown", words: dH };
    if (n.joinedAt === void 0)
      return {
        reason: "join_time_unknown",
        words:
          "Not run: this machine can't tell whether it started before or after the command was sent. Ask Claude to run it instead.",
      };
    if (n.storedAt < n.joinedAt)
      return {
        reason: "sent_before_start",
        words:
          "Not run: this session's machine started (or restarted) after the command was sent. Send it again now.",
      };
  }
  let S = n.serviceNow ?? n.serviceNowAtMost,
    R =
      n.storedAt !== void 0 && S !== void 0
        ? Math.max(S, n.newestFrameAt ?? S) - n.storedAt
        : rewindRequestAge(n);
  if (R !== void 0 && R > f_)
    return {
      reason: "late",
      words:
        "Not run: this command reached the machine more than 90 seconds after it was sent. Send it again if you still want it.",
    };
  return;
}
//@ chunk-tyg7f3ek.js:125759-126208 placement
function checkBangCommandRunnable(e, n, r) {
  if (r && n !== void 0 && resolve(n) !== resolve(e.currentDirectory()))
    return { reason: "other_directory", words: OTHER_DIRECTORY_WORDS };
  if (e.running.isRunning)
    return {
      reason: "another_running",
      words:
        "Not run: another '!' command is still running. Wait for it to finish or press Stop, then send this again.",
    };
  if (e.abortController.signal.aborted)
    return {
      reason: "session_ending",
      words: "Not run: this session is shutting down. Send it again once the session is running.",
    };
  return;
}
//@ chunk-tyg7f3ek.js:126208-126556 placement
async function waitForBangAckConfirmation(e, n, r) {
  let winner = await Promise.race([
    withDeadline(
      e.acksConfirmed().catch(() => !1),
      (e.waits ?? IR).ackConfirmMs,
    ),
    abortSignalPromise(r),
  ]);
  if (r.aborted) return (emitBangCommandAborted(e, n), !1);
  if (winner !== !0)
    return (
      logFeatureBad("input_remote_bash", "ack_unconfirmed"),
      e.emit(
        getStructuredIO(
          e.sessionId,
          `<${BASH_STDERR}>Not run: the server didn't confirm it received the command. Send it again. ${quoteBangCommand(n)}</${BASH_STDERR}>`,
        ),
      ),
      !1
    );
  return !0;
}
//@ chunk-tyg7f3ek.js:126556-126844 placement
async function runBangCommand(e, n, r, s) {
  let h = e.run(n, r, s).then(
      (S) => S.outputText,
      (S) => {
        if (s.aborted && isAbortError(S)) return AR;
        return (
          logError(S),
          `<${BASH_STDERR}>Command failed: ${escapeXml(describeSpawnFailure(S, e.session))}</${BASH_STDERR}>`
        );
      },
    ),
    winner = await Promise.race([h, abortSignalPromise(s)]);
  if (winner !== void 0) return winner;
  return (await withDeadline(h, (e.waits ?? IR).interruptedAnswerMs)) ?? AR;
}
//@ chunk-tyg7f3ek.js:126844-127147 placement
function emitBangCommandNotRun(e, n, r) {
  emitRemoteBashInput(
    e,
    r === "stopped" ? "stopped_before_start" : "session_ending",
    r === "stopped"
      ? `Not run: this command was stopped before it started. Send it again if you still want it. ${quoteBangCommand(n)}`
      : `Not run: the session ended before this command started. Send it again once the session is running. ${quoteBangCommand(n)}`,
  );
}
//@ chunk-tyg7f3ek.js:127147-127231 placement
function emitBangCommandAborted(e, n) {
  emitBangCommandNotRun(e, n, e.abortController.signal.aborted ? "session_ended" : "stopped");
}
//@ chunk-tyg7f3ek.js:127231-127377 placement
function quoteBangCommand(e) {
  let n = [...escapeControlChars(e.trim().replace(/[\t\n\r ]+/g, " "))],
    r = n.length > CR ? `${n.slice(0, CR).join("")}\u2026` : n.join("");
  return `(! ${escapeXml(r)})`;
}
//@ chunk-tyg7f3ek.js:127377-127499 placement = createChildAbortController (0.879)
function abortSignalPromise(e) {
  return new Promise((n) => {
    if (e.aborted) n(void 0);
    else e.addEventListener("abort", () => n(void 0), { once: !0 });
  });
}
/**
 * 把远程 bash 输入作为 replay 用户消息（<bash-input> 标签）发出。
 */
//@ chunk-tyg7f3ek.js:127499-127589 placement
function emitRemoteBashInput(e, n, r) {
  (logFeatureSad("input_remote_bash", n),
    e.emit(getStructuredIO(e.sessionId, `<${BASH_STDERR}>${r}</${BASH_STDERR}>`)));
}

export { emitBangCommandNotRun, handleRemoteBashCommand };
