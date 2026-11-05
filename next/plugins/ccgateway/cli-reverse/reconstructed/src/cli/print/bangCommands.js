/**
 * cli/print/bangCommands.ts
 *
 * 2.1.316 新增：无头/远程会话中 ! 命令的环境检查、确认与执行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (11)
 * attribution: placement 11
 */
import { resolve } from "path";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  BANG_COMMAND_LIMITS,
  CONTROL_CHARS_PATTERN,
  BANG_COMMAND_TEXT,
  BANG_APP_METADATA_MISSING_TEXT,
  BANG_NO_SERVER_CLOCK_TEXT,
  BANG_COMMAND_MAX_AGE_MS,
  BANG_COMMAND_ASYNC_WAITS,
  BANG_INTERRUPTED_RESULT_FRAME,
  MAX_BANG_COMMAND_OUTPUT_CHARS,
} from "./commandQueueDrain.js";
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

//@ chunk-0yw3taqg.js:152325-153848 placement
/**
 * 处理 SDK/远程传来的 bash_command（"!" 命令）消息：去重、校验运行环境与时钟、执行并回传输出。
 */
function handleRemoteBashCommand(message, sendTiming, sessionIO) {
  let eventId = normalizeUuidOrNull(message.uuid) ?? undefined;
  if (eventId !== undefined) {
    if (!sessionIO.receivedMessageUuids.track(eventId)) {
      logForDebugging(`Skipping duplicate bash_command message: ${eventId}`);
      return;
    }
    sessionIO.started(eventId);
    sessionIO.completed(eventId);
  }
  let command =
    typeof message.command === "string"
      ? message.command.replace(
          /\r\n/g,
          `
`,
        )
      : message.command;
  if (typeof command !== "string" || command.trim() === "") {
    emitRemoteBashInput(sessionIO, "no_command", "Not run: no command was given.");
    return;
  }
  if (command.length > BANG_COMMAND_LIMITS) {
    emitRemoteBashInput(
      sessionIO,
      "command_too_long",
      `Not run: the command is longer than ${BANG_COMMAND_LIMITS.toLocaleString("en-US")} characters. Ask Claude to run it instead.`,
    );
    return;
  }
  let cwd = typeof message.cwd === "string" ? message.cwd : undefined;
  let refusal = CONTROL_CHARS_PATTERN.test(command)
    ? {
        reason: "control_characters",
        words:
          "Not run: the command contains hidden control characters, such as an Escape or a carriage return, which often come from pasted text. Type the command in yourself instead of pasting it.",
      }
    : checkBangCommandEnvironment(sessionIO, sendTiming, eventId);
  let joinsOutcome = refusal === undefined ? conversationJoins(sessionIO) : false;
  sessionIO.emit(
    getStructuredIO(
      sessionIO.sessionId,
      `<${BASH_INPUT}>${escapeXml(escapeControlChars(command))}</${BASH_INPUT}>`,
    ),
  );
  if (refusal !== undefined) {
    emitRemoteBashInput(sessionIO, refusal.reason, refusal.words);
    return;
  }
  let runWhenJoined = (canRun) => {
    let runnableRefusal = checkBangCommandRunnable(sessionIO, cwd, canRun);
    if (runnableRefusal !== undefined) {
      emitRemoteBashInput(sessionIO, runnableRefusal.reason, runnableRefusal.words);
      return;
    }
    if (canRun && sessionIO.conversation !== undefined) {
      let { enqueue } = sessionIO.conversation;
      let childAbortController = createChildAbortController(sessionIO.abortController);
      return sessionIO.running
        .whileAdmitting(
          eventId,
          childAbortController,
          waitForBangAckConfirmation(sessionIO, command, childAbortController.signal),
        )
        .then((ackConfirmed) => {
          if (ackConfirmed) enqueue(command, eventId, cwd);
        })
        .catch(logError);
    }
    return sessionIO.running.start(eventId, sessionIO.abortController, async (signal) => {
      if (await waitForBangAckConfirmation(sessionIO, command, signal))
        sessionIO.emit(
          getStructuredIO(sessionIO.sessionId, await runBangCommand(sessionIO, command, cwd, signal)),
        );
    });
  };
  if (typeof joinsOutcome === "boolean") return runWhenJoined(joinsOutcome);
  let childAbortController = createChildAbortController(sessionIO.abortController);
  let runPromise;
  return sessionIO.running
    .whileAdmitting(
      eventId,
      childAbortController,
      Promise.race([joinsOutcome, abortSignalPromise(childAbortController.signal)]).then((joined) => {
        if (childAbortController.signal.aborted || joined === undefined) {
          emitBangCommandAborted(sessionIO, command);
          return false;
        }
        runPromise = runWhenJoined(joined);
        return true;
      }),
    )
    .then(() => runPromise, logError);
}
//@ chunk-0yw3taqg.js:153848-153980 placement
function conversationJoins(sessionIO) {
  try {
    let joins = sessionIO.conversation?.joins() ?? false;
    return typeof joins === "boolean"
      ? joins
      : joins.catch((error) => {
          logError(error);
          return false;
        });
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:153980-155545 placement
function checkBangCommandEnvironment(sessionIO, sendTiming, eventId) {
  let { hosting, readsSessionStream } = sessionIO.worker;
  if (!(readsSessionStream ? hosting === "anthropic_cloud" || hosting === "runner" : hosting === "local"))
    return {
      reason: "environment_kind_refused",
      words:
        hosting === "bridge"
          ? "Not run: '!' commands aren't available in Remote Control sessions. Run the command directly on the computer the session is running on."
          : `Not run: '!' commands aren't available for this kind of session. ${BANG_COMMAND_TEXT}`,
    };
  if (sessionIO.worker.sessionKind !== undefined)
    return {
      reason: "unattended_session",
      words: `Not run: '!' commands don't run in a background session. ${BANG_COMMAND_TEXT}`,
    };
  if (sendTiming.startedBefore)
    return {
      reason: "started_before_restart",
      words:
        "Not run: the machine restarted before it could run this command. Send it again if you still want it.",
    };
  if (readsSessionStream) {
    if (eventId === undefined)
      return {
        reason: "no_event_id",
        words: BANG_APP_METADATA_MISSING_TEXT,
      };
    if (sendTiming.storedAt === undefined)
      return {
        reason: "age_unknown",
        words: BANG_APP_METADATA_MISSING_TEXT,
      };
    if (sendTiming.serviceNow === undefined && sendTiming.serviceNowAtMost === undefined)
      return {
        reason: "clock_unknown",
        words: BANG_NO_SERVER_CLOCK_TEXT,
      };
    if (sendTiming.joinedAt === undefined)
      return {
        reason: "join_time_unknown",
        words:
          "Not run: this machine can't tell whether it started before or after the command was sent. Ask Claude to run it instead.",
      };
    if (sendTiming.storedAt < sendTiming.joinedAt)
      return {
        reason: "sent_before_start",
        words:
          "Not run: this session's machine started (or restarted) after the command was sent. Send it again now.",
      };
  }
  let serverNow = sendTiming.serviceNow ?? sendTiming.serviceNowAtMost;
  let ageMs =
    sendTiming.storedAt !== undefined && serverNow !== undefined
      ? Math.max(serverNow, sendTiming.newestFrameAt ?? serverNow) - sendTiming.storedAt
      : rewindRequestAge(sendTiming);
  if (ageMs !== undefined && ageMs > BANG_COMMAND_MAX_AGE_MS)
    return {
      reason: "late",
      words:
        "Not run: this command reached the machine more than 90 seconds after it was sent. Send it again if you still want it.",
    };
  return;
}
//@ chunk-0yw3taqg.js:155545-155994 placement
function checkBangCommandRunnable(sessionIO, cwd, joinResult) {
  if (joinResult && cwd !== undefined && resolve(cwd) !== resolve(sessionIO.currentDirectory()))
    return {
      reason: "other_directory",
      words: OTHER_DIRECTORY_WORDS,
    };
  if (sessionIO.running.isRunning)
    return {
      reason: "another_running",
      words:
        "Not run: another '!' command is still running. Wait for it to finish or press Stop, then send this again.",
    };
  if (sessionIO.abortController.signal.aborted)
    return {
      reason: "session_ending",
      words: "Not run: this session is shutting down. Send it again once the session is running.",
    };
  return;
}
//@ chunk-0yw3taqg.js:155994-156342 placement
async function waitForBangAckConfirmation(sessionIO, command, signal) {
  let winner = await Promise.race([
    withDeadline(
      sessionIO.acksConfirmed().catch(() => false),
      (sessionIO.waits ?? BANG_COMMAND_ASYNC_WAITS).ackConfirmMs,
    ),
    abortSignalPromise(signal),
  ]);
  if (signal.aborted) {
    emitBangCommandAborted(sessionIO, command);
    return false;
  }
  if (winner !== true) {
    logFeatureBad("input_remote_bash", "ack_unconfirmed");
    sessionIO.emit(
      getStructuredIO(
        sessionIO.sessionId,
        `<${BASH_STDERR}>Not run: the server didn't confirm it received the command. Send it again. ${quoteBangCommand(command)}</${BASH_STDERR}>`,
      ),
    );
    return false;
  }
  return true;
}
//@ chunk-0yw3taqg.js:156342-156630 placement
async function runBangCommand(sessionIO, command, cwd, signal) {
  let runPromise = sessionIO.run(command, cwd, signal).then(
    (result) => result.outputText,
    (error) => {
      if (signal.aborted && isAbortError(error)) return BANG_INTERRUPTED_RESULT_FRAME;
      logError(error);
      return `<${BASH_STDERR}>Command failed: ${escapeXml(describeSpawnFailure(error, sessionIO.session))}</${BASH_STDERR}>`;
    },
  );
  let winner = await Promise.race([runPromise, abortSignalPromise(signal)]);
  if (winner !== undefined) return winner;
  return (
    (await withDeadline(runPromise, (sessionIO.waits ?? BANG_COMMAND_ASYNC_WAITS).interruptedAnswerMs)) ??
    BANG_INTERRUPTED_RESULT_FRAME
  );
}
//@ chunk-0yw3taqg.js:156630-156933 placement
function emitBangCommandNotRun(sessionIO, command, reason) {
  emitRemoteBashInput(
    sessionIO,
    reason === "stopped" ? "stopped_before_start" : "session_ending",
    reason === "stopped"
      ? `Not run: this command was stopped before it started. Send it again if you still want it. ${quoteBangCommand(command)}`
      : `Not run: the session ended before this command started. Send it again once the session is running. ${quoteBangCommand(command)}`,
  );
}
//@ chunk-0yw3taqg.js:156933-157017 placement
function emitBangCommandAborted(sessionIO, command) {
  emitBangCommandNotRun(
    sessionIO,
    command,
    sessionIO.abortController.signal.aborted ? "session_ended" : "stopped",
  );
}
//@ chunk-0yw3taqg.js:157017-157163 placement
function quoteBangCommand(command) {
  let chars = [...escapeControlChars(command.trim().replace(/[\t\n\r ]+/g, " "))];
  let quoted =
    chars.length > MAX_BANG_COMMAND_OUTPUT_CHARS
      ? `${chars.slice(0, MAX_BANG_COMMAND_OUTPUT_CHARS).join("")}\u2026`
      : chars.join("");
  return `(! ${escapeXml(quoted)})`;
}
//@ chunk-0yw3taqg.js:157163-157285 placement (2.1.88 match: createChildAbortController, 0.878)
function abortSignalPromise(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) resolve(undefined);
    else
      signal.addEventListener("abort", () => resolve(undefined), {
        once: true,
      });
  });
}
//@ chunk-0yw3taqg.js:157285-157375 placement
/**
 * 把远程 bash 输入作为 replay 用户消息（<bash-input> 标签）发出。
 */
function emitRemoteBashInput(sessionIO, reason, text) {
  logFeatureSad("input_remote_bash", reason);
  sessionIO.emit(getStructuredIO(sessionIO.sessionId, `<${BASH_STDERR}>${text}</${BASH_STDERR}>`));
}
export { emitBangCommandNotRun, handleRemoteBashCommand };
