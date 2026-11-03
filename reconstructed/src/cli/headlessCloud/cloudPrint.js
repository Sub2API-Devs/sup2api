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
  rpo,
  stripApiErrorOrigin,
  stripProtoKey,
} from "./streamFilter.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-54xbtc53.js:18487-18528 placement
var CLOUD_PRINT_INITIALIZE = "cloud-print-initialize",
  L = 3,
  T = 200;
//@ chunk-54xbtc53.js:18528-18633 placement
class FrameCaptureIO extends StructuredIO {
  onFrame;
  constructor(e, t, s) {
    super(e, t);
    this.onFrame = s;
  }
  async write(e) {
    this.onFrame(e);
  }
}
/**
 * `--cloud -p` 单次运行的状态机：发送用户消息、跟踪 worker 与宿主帧、识别本消息对应的 result；worker 消失时查询会话状态与已存结果；超时、中断与失败时给出相应说明与结果类别。
 */
//@ chunk-54xbtc53.js:18633-24895 placement
class CloudPrintRun {
  note;
  progressShown;
  readSession;
  readLatestResults;
  input = new Stream();
  result = void 0;
  viewUrl = void 0;
  cloudSessionId = void 0;
  startFailed = !1;
  timedOut = !1;
  workerSeen = !1;
  giveUp = new AbortController();
  ownMessageUuid = null;
  ownMessageEchoed = !1;
  ended = void 0;
  resultFromLookup = !1;
  sendFailure = void 0;
  checking = !1;
  checkAgain = !1;
  sessionReads = 0;
  notedOnce = new Set();
  constructor(note, progressShown, readSession, readLatestResults) {
    this.note = note;
    this.progressShown = progressShown;
    this.readSession = readSession;
    this.readLatestResults = readLatestResults;
  }
  noteOnce(e) {
    if (!this.notedOnce.has(e)) (this.notedOnce.add(e), this.note(e));
  }
  checkSession(e) {
    if (this.result !== void 0 || this.ended !== void 0) return;
    if (this.checking) {
      this.checkAgain = !0;
      return;
    }
    if (this.sessionReads >= L) return;
    ((this.checking = !0),
      this.readSession(e)
        .then(
          (t) => {
            if (((this.sessionReads += 1), this.result !== void 0)) return;
            let s =
              t.session_status === "running"
                ? void 0
                : t.session_status === "archived"
                  ? { kind: "archived" }
                  : t.startup_failure !== void 0
                    ? { kind: "start_failed", reason: t.startup_failure }
                    : t.session_status === "requires_action"
                      ? { kind: "needs_answer" }
                      : { kind: "worker_stopped" };
            if (s === void 0) {
              this.noteOnce(
                `The cloud session stopped working mid-turn; the service may restart its worker and resume the turn (this can take minutes), so the run keeps waiting. Ctrl-C stops waiting; the session itself is unaffected${this.viewUrl ? ` (${this.viewUrl})` : ""}.`,
              );
              return;
            }
            return this.readLatestResults(e).then(
              (n) => {
                if (this.result !== void 0) return;
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
                if (r !== void 0) ((this.result = E(r)), (this.resultFromLookup = !0));
                else this.ended = s;
                this.input.done();
              },
              (n) => {
                if (s.kind === "needs_answer") {
                  ((this.ended = s), this.input.done());
                  return;
                }
                this.noteOnce(
                  `Could not check the cloud session's stored events (${sanitizeCloudText(errorMessage(n))}); still waiting.`,
                );
              },
            );
          },
          (t) => {
            this.noteOnce(
              `Could not read the cloud session's state (${sanitizeCloudText(errorMessage(t))}); still waiting.`,
            );
          },
        )
        .finally(() => {
          if (((this.checking = !1), this.checkAgain)) ((this.checkAgain = !1), this.checkSession(e));
        }));
  }
  sendOwnMessage(e) {
    ((this.ownMessageUuid = randomUUID()),
      this.send({
        type: "user",
        uuid: this.ownMessageUuid,
        session_id: "",
        parent_tool_use_id: null,
        message: { role: "user", content: e },
      }));
  }
  resultIsOwn(e) {
    return this.ownMessageUuid === null || this.answersOwnMessage(e);
  }
  answersOwnMessage(e) {
    return (
      this.ownMessageUuid !== null && (getResultUserMessageUuids(e)?.includes(this.ownMessageUuid) ?? !1)
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
      let s = readSetupStepFields(e);
      if (!this.workerSeen && s.stepId !== null && s.stepStatus === "failed")
        ((this.startFailed = !0), this.input.done());
      return;
    }
    if (e.type === "user" && this.ownMessageUuid !== null && e.uuid === this.ownMessageUuid) {
      this.ownMessageEchoed = !0;
      return;
    }
    if (t?.source !== "worker") return;
    if (e.type === "result") {
      if (this.result === void 0 && this.resultIsOwn(e)) ((this.result = E(e)), this.input.done());
      return;
    }
    if (e.type !== "user") this.workerSeen = !0;
  }
  onHostFrame(e) {
    if (e.type === "control_request") this.send(autoRespondUnattended(e));
    else if (e.type === "result") {
      if (
        this.result === void 0 &&
        this.sendFailure === void 0 &&
        !this.ownMessageEchoed &&
        this.answersOwnMessage(e)
      )
        ((this.sendFailure = y(e) ?? "the message was not delivered"), this.input.done());
    } else if (
      e.type === "system" &&
      e.subtype === "informational" &&
      typeof e.content === "string" &&
      (e.level === "warning" || this.progressShown)
    )
      this.note(clipCloudText(e.content));
  }
  adopt(e) {
    if (e.kind !== "opened") return e;
    let cloudSession = e.session.cloudSession();
    return (
      (this.viewUrl = cloudSession.view_url),
      (this.cloudSessionId = displaySessionId(cloudSession.id)),
      this.note(`Cloud session: ${this.cloudSessionId} (${cloudSession.view_url})`),
      {
        kind: "opened",
        session: {
          ...e.session,
          hostAnswersUnattended: !0,
          createManager: (n, r) => {
            let u = {
                ...r,
                onMessage: (l, a) => {
                  (this.onWireFrame(l, a), r.onMessage(l, a));
                },
                onWorkerLive: () => {
                  (r.onWorkerLive?.(), (this.sessionReads = 0));
                },
                onWorkerGone: () => {
                  if ((r.onWorkerGone?.(), this.workerSeen)) this.checkSession(e.session);
                },
              },
              h = { ...n, keepStreamRedialling: !0 };
            return e.session.createManager ? e.session.createManager(h, u) : new RemoteSessionManager(h, u);
          },
        },
      }
    );
  }
  abandon() {
    ((this.timedOut = !0), this.giveUp.abort(), this.input.done());
  }
  armLimit(e) {
    let unref = setTimeout(D, e, this).unref();
    return () => clearTimeout(unref);
  }
  outcome(e) {
    return this.result !== void 0
      ? "result"
      : this.timedOut
        ? "timed_out"
        : e
          ? "client_failed"
          : this.sendFailure !== void 0
            ? "send_failed"
            : this.startFailed || this.ended?.kind === "start_failed"
              ? "start_failed"
              : this.ended !== void 0
                ? "session_ended"
                : "no_result";
  }
  interruptedLine() {
    let e = this.viewUrl ? `: ${this.viewUrl}` : "";
    if (this.result !== void 0)
      return `Interrupted after the turn finished \u2014 the cloud session keeps its result${e}`;
    if (this.ownMessageUuid !== null && !this.ownMessageEchoed)
      return `Interrupted \u2014 the message was not yet delivered; the cloud session is unchanged${e}`;
    switch (this.getUnfinishedCreateStage()) {
      case "unanswered_create":
        return "Interrupted while the cloud session was being created \u2014 it may still have been created";
      case "unopened_session":
        return `Interrupted while the cloud session was being created \u2014 it may still be running${e}`;
      case void 0:
        return `Interrupted \u2014 the cloud session keeps running${e}`;
    }
  }
  getUnfinishedCreateStage() {
    if (this.ownMessageUuid !== null || this.cloudSessionId !== void 0) return;
    return this.viewUrl === void 0 ? "unanswered_create" : "unopened_session";
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
    if (e !== void 0) return `${e}${viewUrl ? ` (session: ${viewUrl})` : ""}`;
    if (this.startFailed)
      return `Error: the cloud session's container failed to start${viewUrl ? ` (${viewUrl})` : ""}`;
    let n = viewUrl ? ` (${viewUrl})` : "";
    if (this.sendFailure !== void 0) return `Error: ${this.sendFailure}${n}`;
    switch (this.ended?.kind) {
      case "archived":
        return `Error: the cloud session was archived before it answered${n}`;
      case "start_failed":
        return `Error: the cloud session failed to start: ${sanitizeCloudText(this.ended.reason)}${n}`;
      case "worker_stopped":
        return `Error: the cloud session stopped before it produced a result${n}`;
      case "needs_answer":
        return `Error: the session is waiting on a question this run cannot answer; open it to answer: ${viewUrl ?? "claude.ai/code"}`;
      case void 0:
        return `Error: no result from the cloud session${viewUrl ? `; it may still be running: ${viewUrl}` : ""}`;
    }
  }
}
//@ chunk-54xbtc53.js:24895-24938 placement
function q(e, t, s) {
  return cloudCreateGates(e, t, s, H(e, s));
}
//@ chunk-54xbtc53.js:24938-25002 placement
function H(e, t) {
  return { isDeviceLess: !0, poolLaunchFolder: void 0 };
}
//@ chunk-54xbtc53.js:25002-25028 placement
function D(e) {
  e.abandon();
}
//@ chunk-54xbtc53.js:25028-27303 placement
async function runHeadlessCloudPrint(e, t, s, n = {}) {
  let r = n.exit ?? gracefulShutdown,
    u = n.stdout ?? writeToStdout,
    h = n.stderr ?? printCliError,
    l =
      n.note ??
      ((i) =>
        void process.stderr.write(`${i}
`)),
    now = Date.now(),
    m = await (n.gates ?? q)(e, t, s.sessionId !== void 0 ? "attach" : "create");
  if (m.kind === "refused") {
    (await logFeatureBadAsync("remote_headless_session", m.code),
      h(m.message),
      await logCloudPrintEnded("refused", 1, s.outputFormat, now, m.code),
      await r(1));
    return;
  }
  let { policy: policy } = m;
  (policy.notices.forEach((notice) => l(notice)),
    setHasFormattedOutput(s.outputFormat === "json"),
    setIsRemoteMode(!0));
  let o = new CloudPrintRun(
      l,
      n.progressShown ?? process.stderr.isTTY === !0,
      n.readSession ?? ((i) => fetchSession(i.sessionId, { accessToken: i.getAccessToken() })),
      n.readLatestResults ?? ((i) => readLatestWorkerResults(i.sessionId, e.credentials)),
    ),
    b =
      n.openSession ??
      ((i) =>
        authenticateThenOpen(e.credentials, (g) =>
          i.sessionId !== void 0
            ? openBareAttachedSession(
                {
                  apiCreds: g,
                  credentials: e.credentials,
                  openingRequests: attachOpeningRequests(e.permissionModeCli, { serveOnly: !1 }),
                },
                i.sessionId,
              )
            : openBareCloudSession(e, {
                apiCreds: g,
                prompt: i.prompt,
                forwarded: i.forwarded,
                repositoryAgent: policy.repositoryAgent,
                hostFillsDefault: !1,
                carriedMode: t.inheritPermissionMode,
                signal: i.signal,
                onSessionExists: i.onSessionExists,
                storageV5: e.storageV5,
                credentials: e.credentials,
              }),
        )),
    R = runHeadlessCloudClient({
      input: o.input,
      builtInToolNames: registeredBuiltInToolNames,
      replayUserMessages: !1,
      includePartialMessages: !1,
      initializePolicy: "strict",
      ignoredOptions: policy.ignored,
      createIO: (i, g) => new FrameCaptureIO(i, g, (I) => o.onHostFrame(I)),
      openSession: async () => {
        let adopt = o.adopt(
          await b({
            prompt: s.prompt,
            forwarded: policy.forwarded,
            signal: o.giveUp.signal,
            onSessionExists: (g) => {
              o.viewUrl = g;
            },
            sessionId: s.sessionId,
          }),
        );
        return withNotApplied(
          adopt,
          notAppliedReport(
            [...getUnconfirmedOptions(policy.forwarded, adopt), ...policy.notApplied],
            null,
            s.sessionId !== void 0 ? "attach" : "create",
            [],
          ),
        );
      },
    }),
    F = s.maxWaitMs !== void 0 && s.maxWaitMs > 0 ? o.armLimit(s.maxWaitMs) : void 0,
    w = !1,
    U = registerCleanup(async () => {
      if (w) return;
      ((w = !0),
        l(o.interruptedLine()),
        await logCloudPrintEnded("interrupted", null, s.outputFormat, now, o.getUnfinishedCreateStage()));
    });
  if (
    (o.send({
      type: "control_request",
      request_id: CLOUD_PRINT_INITIALIZE,
      request: { subtype: "initialize" },
    }),
    s.sessionId !== void 0)
  )
    o.sendOwnMessage(s.prompt);
  let f = await R.done;
  if ((F?.(), w)) return;
  ((w = !0), U());
  let outcome = o.outcome(f.exitCode !== 0);
  if (o.result === void 0) {
    (h(o.noResultLine(f.exitCode !== 0 ? f.message : void 0, now)),
      await logCloudPrintEnded(outcome, 1, s.outputFormat, now, o.ended?.kind),
      await r(1));
    return;
  }
  if (f.message !== void 0 && f.exitCode === 0) l(f.message);
  writePrintResult(drainSdkEvents(o.result, o.cloudSessionId, o.viewUrl), s.outputFormat, u);
  let k = o.result.is_error ? 1 : 0;
  (await logCloudPrintEnded(outcome, k, s.outputFormat, now, o.resultFromLookup ? "from_lookup" : void 0),
    await r(k));
}
//@ chunk-54xbtc53.js:27303-27546 placement
async function readLatestWorkerResults(e, t) {
  let s = await fetchLatestEvents(await getSessionRequestConfig(e, t), T, { reportFeatureHealth: !1 });
  if (s === null) throw Error("the session's events could not be read");
  return s.events
    .filter((event) => event.source === "worker" && event.payload.type === "result")
    .map((n) => n.payload);
}
//@ chunk-54xbtc53.js:27635-27683 placement
function E(e) {
  return filterResultErrors(stripCloudSessionKey(rpo(stripApiErrorOrigin(stripProtoKey(e)))));
}
/**
 * 记录远程无头打印结束：上报结果、退出码、输出格式与等待时长，并按结果记成功或失败。
 */
//@ chunk-54xbtc53.js:27683-27985 placement
async function logCloudPrintEnded(e, t, s, n, r) {
  if (
    (await logEventAsync("tengu_remote_headless_print_ended", {
      outcome: fromEnum(e),
      ...(t !== null && { exit_code: t }),
      output_format: fromEnum(s),
      waited_ms: Date.now() - n,
      ...(r !== void 0 && { detail: fromEnum(r) }),
    }),
    e === "result")
  )
    await logFeatureOkAsync("remote_headless_print");
  else if (e !== "interrupted") await logFeatureBadAsync("remote_headless_print", r ?? e);
}
//@ chunk-54xbtc53.js:28866-28880 placement
var B = 64,
  z = 64;
//@ chunk-54xbtc53.js:28880-29153 placement
function getResultUserMessageUuids(e) {
  let t = "user_message_uuids" in e ? e.user_message_uuids : void 0,
    s = (u) => typeof u === "string" && u.length > 0 && u.length <= z,
    n = Array.isArray(t) ? t.filter(s).slice(0, B) : [];
  if (n.length > 0) return n;
  let r = "user_message_uuid" in e ? e.user_message_uuid : void 0;
  return s(r) ? [r] : void 0;
}
//@ chunk-54xbtc53.js:29153-29246 placement
function y(e) {
  let errors = e.errors;
  return Array.isArray(errors) && typeof errors[0] === "string" ? sanitizeCloudText(errors[0]) : void 0;
}

export { y };
