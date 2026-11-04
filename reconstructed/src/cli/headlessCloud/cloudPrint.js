/**
 * cli/headlessCloud/cloudPrint.ts
 *
 * 2.1.316 新增：`--cloud -p` 无头打印模式：在云会话里跑一次提示并输出结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-54xbtc53.js (13)
 * attribution: placement 13
 */
import { randomUUID } from "crypto";
import { StructuredIO } from "../structuredIO.js";
import { Stream } from "../../utils/stream.js";
import { sanitizeCloudText, clipCloudText } from "../cloudSession/headlessCloudClient.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { readSetupStepFields } from "../../services/cloudSessions/setupProgress.js";
import { autoRespondUnattended } from "../../entrypoints/sdk/controlSchemas.js";
import { displaySessionId } from "../cloudSession/launchFlags.js";
import { RemoteSessionManager, getSessionRequestConfig } from "../../remote/RemoteSessionManager.js";
import {
  cloudCreateGates,
  authenticateThenOpen,
  openBareAttachedSession,
  attachOpeningRequests,
  openBareCloudSession,
  registeredBuiltInToolNames,
  withNotApplied,
  notAppliedReport,
  getUnconfirmedOptions,
} from "./openBareCloudSession.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { writeToStdout } from "../../utils/process.js";
import { printCliError } from "../exit.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../../services/analytics/featureTelemetry.js";
import { setHasFormattedOutput } from "../../utils/debug.js";
import { setIsRemoteMode } from "../../bootstrap/state.js";
import { fetchSession } from "../../utils/teleport/api.js";
import { runHeadlessCloudClient } from "./HeadlessCloudClient.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { writePrintResult } from "../../entrypoints/sdk/coreSchemas.js";
import { drainSdkEvents } from "../../utils/sdkEventQueue.js";
import { fetchLatestEvents } from "../../assistant/sessionHistory.js";
import {
  filterResultErrors,
  stripCloudSessionKey,
  identity,
  stripApiErrorOrigin,
  stripProtoKey,
} from "./streamFilter.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-54xbtc53.js:18487-18528 placement
var CLOUD_PRINT_INITIALIZE = "cloud-print-initialize";
var MAX_CLOUD_PRINT_SESSION_READS = 3;
var CLOUD_PRINT_HISTORY_PAGE_SIZE = 200;
//@ chunk-54xbtc53.js:18528-18633 placement
let FrameCaptureIO; // deferred: uses StructuredIO (../structuredIO.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-54xbtc53.js:18528", () => {
  FrameCaptureIO = class FrameCaptureIO extends StructuredIO {
    onFrame;
    constructor(input, output, onFrame) {
      super(input, output);
      this.onFrame = onFrame;
    }
    async write(value) {
      this.onFrame(value);
    }
  };
});
//@ chunk-54xbtc53.js:18633-24895 placement
/**
 * `--cloud -p` 单次运行的状态机：发送用户消息、跟踪 worker 与宿主帧、识别本消息对应的 result；worker 消失时查询会话状态与已存结果；超时、中断与失败时给出相应说明与结果类别。
 */
class CloudPrintRun {
  note;
  progressShown;
  readSession;
  readLatestResults;
  input = new Stream();
  result = undefined;
  viewUrl = undefined;
  cloudSessionId = undefined;
  startFailed = false;
  timedOut = false;
  workerSeen = false;
  giveUp = new AbortController();
  ownMessageUuid = null;
  ownMessageEchoed = false;
  ended = undefined;
  resultFromLookup = false;
  sendFailure = undefined;
  checking = false;
  checkAgain = false;
  sessionReads = 0;
  notedOnce = new Set();
  constructor(note, progressShown, readSession, readLatestResults) {
    this.note = note;
    this.progressShown = progressShown;
    this.readSession = readSession;
    this.readLatestResults = readLatestResults;
  }
  noteOnce(message) {
    if (!this.notedOnce.has(message)) {
      this.notedOnce.add(message);
      this.note(message);
    }
  }
  checkSession(sessionId) {
    if (this.result !== undefined || this.ended !== undefined) return;
    if (this.checking) {
      this.checkAgain = true;
      return;
    }
    if (this.sessionReads >= MAX_CLOUD_PRINT_SESSION_READS) return;
    this.checking = true;
    this.readSession(sessionId)
      .then(
        (session) => {
          this.sessionReads += 1;
          if (this.result !== undefined) return;
          let ended =
            session.session_status === "running"
              ? undefined
              : session.session_status === "archived"
                ? {
                    kind: "archived",
                  }
                : session.startup_failure !== undefined
                  ? {
                      kind: "start_failed",
                      reason: session.startup_failure,
                    }
                  : session.session_status === "requires_action"
                    ? {
                        kind: "needs_answer",
                      }
                    : {
                        kind: "worker_stopped",
                      };
          if (ended === undefined) {
            this.noteOnce(
              `The cloud session stopped working mid-turn; the service may restart its worker and resume the turn (this can take minutes), so the run keeps waiting. Ctrl-C stops waiting; the session itself is unaffected${this.viewUrl ? ` (${this.viewUrl})` : ""}.`,
            );
            return;
          }
          return this.readLatestResults(sessionId).then(
            (events) => {
              if (this.result !== undefined) return;
              let result =
                events.findLast(
                  (event) =>
                    this.resultIsOwn(event) &&
                    !(
                      event.type === "result" &&
                      event.subtype === "success" &&
                      !event.is_error &&
                      event.num_turns === 0 &&
                      event.result === ""
                    ),
                ) ?? events.findLast((event) => this.resultIsOwn(event));
              if (result !== undefined) {
                this.result = sanitizeCloudResult(result);
                this.resultFromLookup = true;
              } else this.ended = ended;
              this.input.done();
            },
            (error) => {
              if (ended.kind === "needs_answer") {
                this.ended = ended;
                this.input.done();
                return;
              }
              this.noteOnce(
                `Could not check the cloud session's stored events (${sanitizeCloudText(errorMessage(error))}); still waiting.`,
              );
            },
          );
        },
        (error) => {
          this.noteOnce(
            `Could not read the cloud session's state (${sanitizeCloudText(errorMessage(error))}); still waiting.`,
          );
        },
      )
      .finally(() => {
        this.checking = false;
        if (this.checkAgain) {
          this.checkAgain = false;
          this.checkSession(sessionId);
        }
      });
  }
  sendOwnMessage(content) {
    this.ownMessageUuid = randomUUID();
    this.send({
      type: "user",
      uuid: this.ownMessageUuid,
      session_id: "",
      parent_tool_use_id: null,
      message: {
        role: "user",
        content,
      },
    });
  }
  resultIsOwn(event) {
    return this.ownMessageUuid === null || this.answersOwnMessage(event);
  }
  answersOwnMessage(event) {
    return (
      this.ownMessageUuid !== null &&
      (getResultUserMessageUuids(event)?.includes(this.ownMessageUuid) ?? false)
    );
  }
  send(message) {
    this.input.enqueue(
      jsonStringify(message) +
        `
`,
    );
  }
  onWireFrame(frame, meta) {
    if (frame.type === "env_manager_log") {
      let setupStepFields = readSetupStepFields(frame);
      if (!this.workerSeen && setupStepFields.stepId !== null && setupStepFields.stepStatus === "failed") {
        this.startFailed = true;
        this.input.done();
      }
      return;
    }
    if (frame.type === "user" && this.ownMessageUuid !== null && frame.uuid === this.ownMessageUuid) {
      this.ownMessageEchoed = true;
      return;
    }
    if (meta?.source !== "worker") return;
    if (frame.type === "result") {
      if (this.result === undefined && this.resultIsOwn(frame)) {
        this.result = sanitizeCloudResult(frame);
        this.input.done();
      }
      return;
    }
    if (frame.type !== "user") this.workerSeen = true;
  }
  onHostFrame(controlRequest) {
    if (controlRequest.type === "control_request") this.send(autoRespondUnattended(controlRequest));
    else if (controlRequest.type === "result") {
      if (
        this.result === undefined &&
        this.sendFailure === undefined &&
        !this.ownMessageEchoed &&
        this.answersOwnMessage(controlRequest)
      ) {
        this.sendFailure = firstErrorText(controlRequest) ?? "the message was not delivered";
        this.input.done();
      }
    } else if (
      controlRequest.type === "system" &&
      controlRequest.subtype === "informational" &&
      typeof controlRequest.content === "string" &&
      (controlRequest.level === "warning" || this.progressShown)
    )
      this.note(clipCloudText(controlRequest.content));
  }
  adopt(result) {
    if (result.kind !== "opened") return result;
    let cloudSession = result.session.cloudSession();
    this.viewUrl = cloudSession.view_url;
    this.cloudSessionId = displaySessionId(cloudSession.id);
    this.note(`Cloud session: ${this.cloudSessionId} (${cloudSession.view_url})`);
    return {
      kind: "opened",
      session: {
        ...result.session,
        hostAnswersUnattended: true,
        createManager: (options, callbacks) => {
          let callbacks_2 = {
            ...callbacks,
            onMessage: (frame, meta) => {
              this.onWireFrame(frame, meta);
              callbacks.onMessage(frame, meta);
            },
            onWorkerLive: () => {
              callbacks.onWorkerLive?.();
              this.sessionReads = 0;
            },
            onWorkerGone: () => {
              callbacks.onWorkerGone?.();
              if (this.workerSeen) this.checkSession(result.session);
            },
          };
          let sessionOptions = {
            ...options,
            keepStreamRedialling: true,
          };
          return result.session.createManager
            ? result.session.createManager(sessionOptions, callbacks_2)
            : new RemoteSessionManager(sessionOptions, callbacks_2);
        },
      },
    };
  }
  abandon() {
    this.timedOut = true;
    this.giveUp.abort();
    this.input.done();
  }
  armLimit(limitMs) {
    let timer = setTimeout(abandonOnTimeout, limitMs, this).unref();
    return () => clearTimeout(timer);
  }
  outcome(clientFailed) {
    return this.result !== undefined
      ? "result"
      : this.timedOut
        ? "timed_out"
        : clientFailed
          ? "client_failed"
          : this.sendFailure !== undefined
            ? "send_failed"
            : this.startFailed || this.ended?.kind === "start_failed"
              ? "start_failed"
              : this.ended !== undefined
                ? "session_ended"
                : "no_result";
  }
  interruptedLine() {
    let urlNote = this.viewUrl ? `: ${this.viewUrl}` : "";
    if (this.result !== undefined)
      return `Interrupted after the turn finished \u2014 the cloud session keeps its result${urlNote}`;
    if (this.ownMessageUuid !== null && !this.ownMessageEchoed)
      return `Interrupted \u2014 the message was not yet delivered; the cloud session is unchanged${urlNote}`;
    switch (this.getUnfinishedCreateStage()) {
      case "unanswered_create":
        return "Interrupted while the cloud session was being created \u2014 it may still have been created";
      case "unopened_session":
        return `Interrupted while the cloud session was being created \u2014 it may still be running${urlNote}`;
      case undefined:
        return `Interrupted \u2014 the cloud session keeps running${urlNote}`;
    }
  }
  getUnfinishedCreateStage() {
    if (this.ownMessageUuid !== null || this.cloudSessionId !== undefined) return;
    return this.viewUrl === undefined ? "unanswered_create" : "unopened_session";
  }
  noResultLine(errorLine, startedAt) {
    let viewUrl = this.viewUrl;
    if (this.timedOut) {
      let rounded = Math.round((Date.now() - startedAt) / 1000);
      if (this.getUnfinishedCreateStage() === "unopened_session")
        return `Error: gave up after ${rounded}s, while the cloud session was being created; it may still be running: ${viewUrl}`;
      return viewUrl
        ? `Error: no result from the cloud session after ${rounded}s; it is still running: ${viewUrl}`
        : `Error: gave up after ${rounded}s, before the cloud session was created`;
    }
    if (errorLine !== undefined) return `${errorLine}${viewUrl ? ` (session: ${viewUrl})` : ""}`;
    if (this.startFailed)
      return `Error: the cloud session's container failed to start${viewUrl ? ` (${viewUrl})` : ""}`;
    let urlNote = viewUrl ? ` (${viewUrl})` : "";
    if (this.sendFailure !== undefined) return `Error: ${this.sendFailure}${urlNote}`;
    switch (this.ended?.kind) {
      case "archived":
        return `Error: the cloud session was archived before it answered${urlNote}`;
      case "start_failed":
        return `Error: the cloud session failed to start: ${sanitizeCloudText(this.ended.reason)}${urlNote}`;
      case "worker_stopped":
        return `Error: the cloud session stopped before it produced a result${urlNote}`;
      case "needs_answer":
        return `Error: the session is waiting on a question this run cannot answer; open it to answer: ${viewUrl ?? "claude.ai/code"}`;
      case undefined:
        return `Error: no result from the cloud session${viewUrl ? `; it may still be running: ${viewUrl}` : ""}`;
    }
  }
}
//@ chunk-54xbtc53.js:24895-24938 placement
function cloudPrintCreateGates(options, host, entry) {
  return cloudCreateGates(options, host, entry, deviceLessGates(options, entry));
}
//@ chunk-54xbtc53.js:24938-25002 placement
function deviceLessGates(options, host) {
  return {
    isDeviceLess: true,
    poolLaunchFolder: undefined,
  };
}
//@ chunk-54xbtc53.js:25002-25028 placement
function abandonOnTimeout(run) {
  run.abandon();
}
//@ chunk-54xbtc53.js:25028-27303 placement
async function runHeadlessCloudPrint(options, host, runOptions, seams = {}) {
  let exit = seams.exit ?? gracefulShutdown;
  let stdout = seams.stdout ?? writeToStdout;
  let stderr = seams.stderr ?? printCliError;
  let note =
    seams.note ??
    ((line) =>
      void process.stderr.write(`${line}
`));
  let now = Date.now();
  let gateResult = await (seams.gates ?? cloudPrintCreateGates)(
    options,
    host,
    runOptions.sessionId !== undefined ? "attach" : "create",
  );
  if (gateResult.kind === "refused") {
    await logFeatureBadAsync("remote_headless_session", gateResult.code);
    stderr(gateResult.message);
    await logCloudPrintEnded("refused", 1, runOptions.outputFormat, now, gateResult.code);
    await exit(1);
    return;
  }
  let { policy } = gateResult;
  policy.notices.forEach((notice) => note(notice));
  setHasFormattedOutput(runOptions.outputFormat === "json");
  setIsRemoteMode(true);
  let run = new CloudPrintRun(
    note,
    seams.progressShown ?? process.stderr.isTTY === true,
    seams.readSession ??
      ((target) =>
        fetchSession(target.sessionId, {
          accessToken: target.getAccessToken(),
        })),
    seams.readLatestResults ?? ((target) => readLatestWorkerResults(target.sessionId, options.credentials)),
  );
  let openSession =
    seams.openSession ??
    ((openArgs) =>
      authenticateThenOpen(options.credentials, (apiCreds) =>
        openArgs.sessionId !== undefined
          ? openBareAttachedSession(
              {
                apiCreds,
                credentials: options.credentials,
                openingRequests: attachOpeningRequests(options.permissionModeCli, {
                  serveOnly: false,
                }),
              },
              openArgs.sessionId,
            )
          : openBareCloudSession(options, {
              apiCreds,
              prompt: openArgs.prompt,
              forwarded: openArgs.forwarded,
              repositoryAgent: policy.repositoryAgent,
              hostFillsDefault: false,
              carriedMode: host.inheritPermissionMode,
              signal: openArgs.signal,
              onSessionExists: openArgs.onSessionExists,
              storageV5: options.storageV5,
              credentials: options.credentials,
            }),
      ));
  let client = runHeadlessCloudClient({
    input: run.input,
    builtInToolNames: registeredBuiltInToolNames,
    replayUserMessages: false,
    includePartialMessages: false,
    initializePolicy: "strict",
    ignoredOptions: policy.ignored,
    createIO: (input, output) => new FrameCaptureIO(input, output, (frame) => run.onHostFrame(frame)),
    openSession: async () => {
      let adopted = run.adopt(
        await openSession({
          prompt: runOptions.prompt,
          forwarded: policy.forwarded,
          signal: run.giveUp.signal,
          onSessionExists: (viewUrl) => {
            run.viewUrl = viewUrl;
          },
          sessionId: runOptions.sessionId,
        }),
      );
      return withNotApplied(
        adopted,
        notAppliedReport(
          [...getUnconfirmedOptions(policy.forwarded, adopted), ...policy.notApplied],
          null,
          runOptions.sessionId !== undefined ? "attach" : "create",
          [],
        ),
      );
    },
  });
  let disarmLimit =
    runOptions.maxWaitMs !== undefined && runOptions.maxWaitMs > 0
      ? run.armLimit(runOptions.maxWaitMs)
      : undefined;
  let isFinished = false;
  let cleanup = registerCleanup(async () => {
    if (isFinished) return;
    isFinished = true;
    note(run.interruptedLine());
    await logCloudPrintEnded(
      "interrupted",
      null,
      runOptions.outputFormat,
      now,
      run.getUnfinishedCreateStage(),
    );
  });
  run.send({
    type: "control_request",
    request_id: CLOUD_PRINT_INITIALIZE,
    request: {
      subtype: "initialize",
    },
  });
  if (runOptions.sessionId !== undefined) run.sendOwnMessage(runOptions.prompt);
  let final = await client.done;
  disarmLimit?.();
  if (isFinished) return;
  isFinished = true;
  cleanup();
  let outcome = run.outcome(final.exitCode !== 0);
  if (run.result === undefined) {
    stderr(run.noResultLine(final.exitCode !== 0 ? final.message : undefined, now));
    await logCloudPrintEnded(outcome, 1, runOptions.outputFormat, now, run.ended?.kind);
    await exit(1);
    return;
  }
  if (final.message !== undefined && final.exitCode === 0) note(final.message);
  writePrintResult(
    drainSdkEvents(run.result, run.cloudSessionId, run.viewUrl),
    runOptions.outputFormat,
    stdout,
  );
  let exitCode = run.result.is_error ? 1 : 0;
  await logCloudPrintEnded(
    outcome,
    exitCode,
    runOptions.outputFormat,
    now,
    run.resultFromLookup ? "from_lookup" : undefined,
  );
  await exit(exitCode);
}
//@ chunk-54xbtc53.js:27303-27546 placement
async function readLatestWorkerResults(sessionId, credentials) {
  let latestEvents = await fetchLatestEvents(
    await getSessionRequestConfig(sessionId, credentials),
    CLOUD_PRINT_HISTORY_PAGE_SIZE,
    {
      reportFeatureHealth: false,
    },
  );
  if (latestEvents === null) throw Error("the session's events could not be read");
  return latestEvents.events
    .filter((event) => event.source === "worker" && event.payload.type === "result")
    .map((event) => event.payload);
}
//@ chunk-54xbtc53.js:27635-27683 placement
function sanitizeCloudResult(result) {
  return filterResultErrors(stripCloudSessionKey(identity(stripApiErrorOrigin(stripProtoKey(result)))));
}
//@ chunk-54xbtc53.js:27683-27985 placement
/**
 * 记录远程无头打印结束：上报结果、退出码、输出格式与等待时长，并按结果记成功或失败。
 */
async function logCloudPrintEnded(outcome, exitCode, outputFormat, startedAt, detail) {
  await logEventAsync("tengu_remote_headless_print_ended", {
    outcome: fromEnum(outcome),
    ...(exitCode !== null && {
      exit_code: exitCode,
    }),
    output_format: fromEnum(outputFormat),
    waited_ms: Date.now() - startedAt,
    ...(detail !== undefined && {
      detail: fromEnum(detail),
    }),
  });
  if (outcome === "result") await logFeatureOkAsync("remote_headless_print");
  else if (outcome !== "interrupted") await logFeatureBadAsync("remote_headless_print", detail ?? outcome);
}
//@ chunk-54xbtc53.js:28866-28880 placement
var MAX_LISTED_MCP_SERVER_NAMES = 64;
var MAX_MCP_SERVER_NAME_CHARS = 64;
//@ chunk-54xbtc53.js:28880-29153 placement
function getResultUserMessageUuids(result) {
  let userMessageUuids = "user_message_uuids" in result ? result.user_message_uuids : undefined;
  let isValid = (userMessageUuid) =>
    typeof userMessageUuid === "string" &&
    userMessageUuid.length > 0 &&
    userMessageUuid.length <= MAX_MCP_SERVER_NAME_CHARS;
  let uuids = Array.isArray(userMessageUuids)
    ? userMessageUuids.filter(isValid).slice(0, MAX_LISTED_MCP_SERVER_NAMES)
    : [];
  if (uuids.length > 0) return uuids;
  let userMessageUuid = "user_message_uuid" in result ? result.user_message_uuid : undefined;
  return isValid(userMessageUuid) ? [userMessageUuid] : undefined;
}
//@ chunk-54xbtc53.js:29153-29246 placement
function firstErrorText(resultMessage) {
  let errors = resultMessage.errors;
  return Array.isArray(errors) && typeof errors[0] === "string" ? sanitizeCloudText(errors[0]) : undefined;
}
export { firstErrorText, runHeadlessCloudPrint };
