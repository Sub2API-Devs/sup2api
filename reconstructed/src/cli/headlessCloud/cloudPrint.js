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

//@ chunk-54xbtc53.js:18487-18528 placement
var CLOUD_PRINT_INITIALIZE = "cloud-print-initialize";
var MAX_CLOUD_PRINT_SESSION_READS = 3;
var CLOUD_PRINT_HISTORY_PAGE_SIZE = 200;
//@ chunk-54xbtc53.js:18528-18633 placement
class FrameCaptureIO extends StructuredIO {
  onFrame;
  constructor(e, t, onFrame) {
    super(e, t);
    this.onFrame = onFrame;
  }
  async write(e) {
    this.onFrame(e);
  }
}
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
  noteOnce(e) {
    if (!this.notedOnce.has(e)) {
      this.notedOnce.add(e);
      this.note(e);
    }
  }
  checkSession(e) {
    if (this.result !== undefined || this.ended !== undefined) return;
    if (this.checking) {
      this.checkAgain = true;
      return;
    }
    if (this.sessionReads >= MAX_CLOUD_PRINT_SESSION_READS) return;
    this.checking = true;
    this.readSession(e)
      .then(
        (t) => {
          this.sessionReads += 1;
          if (this.result !== undefined) return;
          let s =
            t.session_status === "running"
              ? undefined
              : t.session_status === "archived"
                ? {
                    kind: "archived",
                  }
                : t.startup_failure !== undefined
                  ? {
                      kind: "start_failed",
                      reason: t.startup_failure,
                    }
                  : t.session_status === "requires_action"
                    ? {
                        kind: "needs_answer",
                      }
                    : {
                        kind: "worker_stopped",
                      };
          if (s === undefined) {
            this.noteOnce(
              `The cloud session stopped working mid-turn; the service may restart its worker and resume the turn (this can take minutes), so the run keeps waiting. Ctrl-C stops waiting; the session itself is unaffected${this.viewUrl ? ` (${this.viewUrl})` : ""}.`,
            );
            return;
          }
          return this.readLatestResults(e).then(
            (n) => {
              if (this.result !== undefined) return;
              let r =
                n.findLast(
                  (u) =>
                    this.resultIsOwn(u) &&
                    !(
                      u.type === "result" &&
                      u.subtype === "success" &&
                      !u.is_error &&
                      u.num_turns === 0 &&
                      u.result === ""
                    ),
                ) ?? n.findLast((u) => this.resultIsOwn(u));
              if (r !== undefined) {
                this.result = sanitizeCloudResult(r);
                this.resultFromLookup = true;
              } else this.ended = s;
              this.input.done();
            },
            (error) => {
              if (s.kind === "needs_answer") {
                this.ended = s;
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
          this.checkSession(e);
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
  resultIsOwn(e) {
    return this.ownMessageUuid === null || this.answersOwnMessage(e);
  }
  answersOwnMessage(e) {
    return (
      this.ownMessageUuid !== null && (getResultUserMessageUuids(e)?.includes(this.ownMessageUuid) ?? false)
    );
  }
  send(e) {
    this.input.enqueue(
      jsonStringify(e) +
        `
`,
    );
  }
  onWireFrame(e, t) {
    if (e.type === "env_manager_log") {
      let setupStepFields = readSetupStepFields(e);
      if (!this.workerSeen && setupStepFields.stepId !== null && setupStepFields.stepStatus === "failed") {
        this.startFailed = true;
        this.input.done();
      }
      return;
    }
    if (e.type === "user" && this.ownMessageUuid !== null && e.uuid === this.ownMessageUuid) {
      this.ownMessageEchoed = true;
      return;
    }
    if (t?.source !== "worker") return;
    if (e.type === "result") {
      if (this.result === undefined && this.resultIsOwn(e)) {
        this.result = sanitizeCloudResult(e);
        this.input.done();
      }
      return;
    }
    if (e.type !== "user") this.workerSeen = true;
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
  adopt(e) {
    if (e.kind !== "opened") return e;
    let t = e.session.cloudSession();
    this.viewUrl = t.view_url;
    this.cloudSessionId = displaySessionId(t.id);
    this.note(`Cloud session: ${this.cloudSessionId} (${t.view_url})`);
    return {
      kind: "opened",
      session: {
        ...e.session,
        hostAnswersUnattended: true,
        createManager: (n, r) => {
          let callbacks = {
            ...r,
            onMessage: (l, a) => {
              this.onWireFrame(l, a);
              r.onMessage(l, a);
            },
            onWorkerLive: () => {
              r.onWorkerLive?.();
              this.sessionReads = 0;
            },
            onWorkerGone: () => {
              r.onWorkerGone?.();
              if (this.workerSeen) this.checkSession(e.session);
            },
          };
          let h = {
            ...n,
            keepStreamRedialling: true,
          };
          return e.session.createManager
            ? e.session.createManager(h, callbacks)
            : new RemoteSessionManager(h, callbacks);
        },
      },
    };
  }
  abandon() {
    this.timedOut = true;
    this.giveUp.abort();
    this.input.done();
  }
  armLimit(e) {
    let t = setTimeout(abandonOnTimeout, e, this).unref();
    return () => clearTimeout(t);
  }
  outcome(e) {
    return this.result !== undefined
      ? "result"
      : this.timedOut
        ? "timed_out"
        : e
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
    let e = this.viewUrl ? `: ${this.viewUrl}` : "";
    if (this.result !== undefined)
      return `Interrupted after the turn finished \u2014 the cloud session keeps its result${e}`;
    if (this.ownMessageUuid !== null && !this.ownMessageEchoed)
      return `Interrupted \u2014 the message was not yet delivered; the cloud session is unchanged${e}`;
    switch (this.getUnfinishedCreateStage()) {
      case "unanswered_create":
        return "Interrupted while the cloud session was being created \u2014 it may still have been created";
      case "unopened_session":
        return `Interrupted while the cloud session was being created \u2014 it may still be running${e}`;
      case undefined:
        return `Interrupted \u2014 the cloud session keeps running${e}`;
    }
  }
  getUnfinishedCreateStage() {
    if (this.ownMessageUuid !== null || this.cloudSessionId !== undefined) return;
    return this.viewUrl === undefined ? "unanswered_create" : "unopened_session";
  }
  noResultLine(e, t) {
    let viewUrl = this.viewUrl;
    if (this.timedOut) {
      let rounded = Math.round((Date.now() - t) / 1000);
      if (this.getUnfinishedCreateStage() === "unopened_session")
        return `Error: gave up after ${rounded}s, while the cloud session was being created; it may still be running: ${viewUrl}`;
      return viewUrl
        ? `Error: no result from the cloud session after ${rounded}s; it is still running: ${viewUrl}`
        : `Error: gave up after ${rounded}s, before the cloud session was created`;
    }
    if (e !== undefined) return `${e}${viewUrl ? ` (session: ${viewUrl})` : ""}`;
    if (this.startFailed)
      return `Error: the cloud session's container failed to start${viewUrl ? ` (${viewUrl})` : ""}`;
    let n = viewUrl ? ` (${viewUrl})` : "";
    if (this.sendFailure !== undefined) return `Error: ${this.sendFailure}${n}`;
    switch (this.ended?.kind) {
      case "archived":
        return `Error: the cloud session was archived before it answered${n}`;
      case "start_failed":
        return `Error: the cloud session failed to start: ${sanitizeCloudText(this.ended.reason)}${n}`;
      case "worker_stopped":
        return `Error: the cloud session stopped before it produced a result${n}`;
      case "needs_answer":
        return `Error: the session is waiting on a question this run cannot answer; open it to answer: ${viewUrl ?? "claude.ai/code"}`;
      case undefined:
        return `Error: no result from the cloud session${viewUrl ? `; it may still be running: ${viewUrl}` : ""}`;
    }
  }
}
//@ chunk-54xbtc53.js:24895-24938 placement
function cloudPrintCreateGates(e, t, entry) {
  return cloudCreateGates(e, t, entry, deviceLessGates(e, entry));
}
//@ chunk-54xbtc53.js:24938-25002 placement
function deviceLessGates(e, t) {
  return {
    isDeviceLess: true,
    poolLaunchFolder: undefined,
  };
}
//@ chunk-54xbtc53.js:25002-25028 placement
function abandonOnTimeout(e) {
  e.abandon();
}
//@ chunk-54xbtc53.js:25028-27303 placement
async function runHeadlessCloudPrint(e, t, s, n = {}) {
  let exit = n.exit ?? gracefulShutdown;
  let stdout = n.stdout ?? writeToStdout;
  let stderr = n.stderr ?? printCliError;
  let note =
    n.note ??
    ((i) =>
      void process.stderr.write(`${i}
`));
  let now = Date.now();
  let m = await (n.gates ?? cloudPrintCreateGates)(e, t, s.sessionId !== undefined ? "attach" : "create");
  if (m.kind === "refused") {
    await logFeatureBadAsync("remote_headless_session", m.code);
    stderr(m.message);
    await logCloudPrintEnded("refused", 1, s.outputFormat, now, m.code);
    await exit(1);
    return;
  }
  let { policy } = m;
  policy.notices.forEach((notice) => note(notice));
  setHasFormattedOutput(s.outputFormat === "json");
  setIsRemoteMode(true);
  let o = new CloudPrintRun(
    note,
    n.progressShown ?? process.stderr.isTTY === true,
    n.readSession ??
      ((i) =>
        fetchSession(i.sessionId, {
          accessToken: i.getAccessToken(),
        })),
    n.readLatestResults ?? ((i) => readLatestWorkerResults(i.sessionId, e.credentials)),
  );
  let b =
    n.openSession ??
    ((i) =>
      authenticateThenOpen(e.credentials, (apiCreds) =>
        i.sessionId !== undefined
          ? openBareAttachedSession(
              {
                apiCreds,
                credentials: e.credentials,
                openingRequests: attachOpeningRequests(e.permissionModeCli, {
                  serveOnly: false,
                }),
              },
              i.sessionId,
            )
          : openBareCloudSession(e, {
              apiCreds,
              prompt: i.prompt,
              forwarded: i.forwarded,
              repositoryAgent: policy.repositoryAgent,
              hostFillsDefault: false,
              carriedMode: t.inheritPermissionMode,
              signal: i.signal,
              onSessionExists: i.onSessionExists,
              storageV5: e.storageV5,
              credentials: e.credentials,
            }),
      ));
  let R = runHeadlessCloudClient({
    input: o.input,
    builtInToolNames: registeredBuiltInToolNames,
    replayUserMessages: false,
    includePartialMessages: false,
    initializePolicy: "strict",
    ignoredOptions: policy.ignored,
    createIO: (i, g) => new FrameCaptureIO(i, g, (I) => o.onHostFrame(I)),
    openSession: async () => {
      let i = o.adopt(
        await b({
          prompt: s.prompt,
          forwarded: policy.forwarded,
          signal: o.giveUp.signal,
          onSessionExists: (viewUrl) => {
            o.viewUrl = viewUrl;
          },
          sessionId: s.sessionId,
        }),
      );
      return withNotApplied(
        i,
        notAppliedReport(
          [...getUnconfirmedOptions(policy.forwarded, i), ...policy.notApplied],
          null,
          s.sessionId !== undefined ? "attach" : "create",
          [],
        ),
      );
    },
  });
  let F = s.maxWaitMs !== undefined && s.maxWaitMs > 0 ? o.armLimit(s.maxWaitMs) : undefined;
  let w = false;
  let U = registerCleanup(async () => {
    if (w) return;
    w = true;
    note(o.interruptedLine());
    await logCloudPrintEnded("interrupted", null, s.outputFormat, now, o.getUnfinishedCreateStage());
  });
  o.send({
    type: "control_request",
    request_id: CLOUD_PRINT_INITIALIZE,
    request: {
      subtype: "initialize",
    },
  });
  if (s.sessionId !== undefined) o.sendOwnMessage(s.prompt);
  let f = await R.done;
  F?.();
  if (w) return;
  w = true;
  U();
  let v = o.outcome(f.exitCode !== 0);
  if (o.result === undefined) {
    stderr(o.noResultLine(f.exitCode !== 0 ? f.message : undefined, now));
    await logCloudPrintEnded(v, 1, s.outputFormat, now, o.ended?.kind);
    await exit(1);
    return;
  }
  if (f.message !== undefined && f.exitCode === 0) note(f.message);
  writePrintResult(drainSdkEvents(o.result, o.cloudSessionId, o.viewUrl), s.outputFormat, stdout);
  let k = o.result.is_error ? 1 : 0;
  await logCloudPrintEnded(v, k, s.outputFormat, now, o.resultFromLookup ? "from_lookup" : undefined);
  await exit(k);
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
function sanitizeCloudResult(e) {
  return filterResultErrors(stripCloudSessionKey(identity(stripApiErrorOrigin(stripProtoKey(e)))));
}
//@ chunk-54xbtc53.js:27683-27985 placement
/**
 * 记录远程无头打印结束：上报结果、退出码、输出格式与等待时长，并按结果记成功或失败。
 */
async function logCloudPrintEnded(e, t, outputFormat, n, r) {
  await logEventAsync("tengu_remote_headless_print_ended", {
    outcome: fromEnum(e),
    ...(t !== null && {
      exit_code: t,
    }),
    output_format: fromEnum(outputFormat),
    waited_ms: Date.now() - n,
    ...(r !== undefined && {
      detail: fromEnum(r),
    }),
  });
  if (e === "result") await logFeatureOkAsync("remote_headless_print");
  else if (e !== "interrupted") await logFeatureBadAsync("remote_headless_print", r ?? e);
}
//@ chunk-54xbtc53.js:28866-28880 placement
var MAX_LISTED_MCP_SERVER_NAMES = 64;
var MAX_MCP_SERVER_NAME_CHARS = 64;
//@ chunk-54xbtc53.js:28880-29153 placement
function getResultUserMessageUuids(e) {
  let userMessageUuids = "user_message_uuids" in e ? e.user_message_uuids : undefined;
  let s = (userMessageUuid) =>
    typeof userMessageUuid === "string" &&
    userMessageUuid.length > 0 &&
    userMessageUuid.length <= MAX_MCP_SERVER_NAME_CHARS;
  let n = Array.isArray(userMessageUuids)
    ? userMessageUuids.filter(s).slice(0, MAX_LISTED_MCP_SERVER_NAMES)
    : [];
  if (n.length > 0) return n;
  let userMessageUuid = "user_message_uuid" in e ? e.user_message_uuid : undefined;
  return s(userMessageUuid) ? [userMessageUuid] : undefined;
}
//@ chunk-54xbtc53.js:29153-29246 placement
function firstErrorText(resultMessage) {
  let errors = resultMessage.errors;
  return Array.isArray(errors) && typeof errors[0] === "string" ? sanitizeCloudText(errors[0]) : undefined;
}
export { firstErrorText };
