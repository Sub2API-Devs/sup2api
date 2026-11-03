/**
 * services/feedback/feedbackBundle.ts
 *
 * 2.1.316 新增：/feedback 提交与反馈包落盘：深度脱敏、组装 init 字段、POST 并记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (20)
 * attribution: placement 20
 */
import {
  randomBytes,
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { join, join as join_2 } from "path";
import { mkdir, unlink, rm } from "fs/promises";
import { createWriteStream } from "fs";
import { once } from "events";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  feedbackCredentialStatus,
  buildFeedbackRequest,
  findSessionIdForMessage,
  buildFeedbackPayload,
  TRANSCRIPT_FIELDS,
  xs,
} from "./submitFeedback.js";
import { use } from "../compact/autoCompact.js";
import {
  redactSecrets as redactSecrets_2,
  redactSecrets_3,
  redactKeyedValue,
  redactSecretsDeep,
} from "../teamMemorySync/secretScanner.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import { wi, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { submitFeedback } from "../../components/Feedback.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit, fromNumber, fromNumberOpt } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { logEventTo1P as logEventTo1P_2 } from "../analytics/firstPartyEventLogger.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { retryTransient } from "../../utils/atomicPublishWrite.js";
import { logError } from "../../utils/log.js";
import { errorMessage, isPathAbsent, isFsInaccessible, isEISDIR, getErrnoCode } from "../../utils/errors.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { readLines } from "../../utils/fsOperations.js";
import { withholdTranscriptLine } from "../../utils/transcriptWithholding.js";
import { logForDebugging } from "../../utils/debug.js";
import { redactTranscriptLines } from "../../utils/transcriptRequestBlobs.js";
import {
  getMaterializedSessionFile,
  isOwnTranscriptFile,
  getTranscriptPath,
} from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { memoryScopeForPath } from "../../utils/memoryFileDetection.js";
import { isCommentNotificationText } from "../artifacts/comments/autoreactState.js";

//@ chunk-xx1vmpsq.js:20766-20827 placement = logEventTo1P (1)
function logEventTo1P() {
  return isFeedbackAllowed() && getAPIProvider() === "firstParty" && feedbackCredentialStatus() === null;
}
//@ chunk-xx1vmpsq.js:20827-21189 placement
var FEEDBACK_META_FIELDS = new Set([
  "latestAssistantMessageId",
  "latestAssistantAPIMessageId",
  "lastInterruptedAssistantAPIMessageId",
  "message_count",
  "datetime",
  "description",
  "surface",
  "platform",
  "gitRepo",
  "commitSha",
  "remoteWorkspace",
  "remoteSessionId",
  "version",
  "hostEnvironment",
  ...[],
  "transcript",
  "subagentTranscripts",
  "rawTranscriptJsonl",
  "recentSessionTranscripts",
  "debugLog",
]);
//@ chunk-xx1vmpsq.js:21189-22269 placement
async function submitFeedbackReport({
  description: description,
  messages: messages,
  lastInterruptedAssistantAPIMessageId: lastInterruptedAssistantAPIMessageId,
  fields: fields,
  maxDescriptionChars: maxDescriptionChars,
  signal: signal,
  credentials: credentials,
}) {
  if (getAPIProvider() !== "firstParty") return { success: !1, failureReason: "not_first_party" };
  let C = use(messages),
    I = redactSecrets_2(description),
    M = {
      latestAssistantMessageId: C?.requestId ?? null,
      latestAssistantAPIMessageId: C?.message.id ?? null,
      lastInterruptedAssistantAPIMessageId: lastInterruptedAssistantAPIMessageId,
      message_count: messages.length,
      datetime: new Date().toISOString(),
      description: maxDescriptionChars === void 0 ? I : truncateToLength(I, maxDescriptionChars),
      surface: "cli",
      platform: env.platform,
      gitRepo: !1,
      commitSha: null,
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      transcript: [],
      ...wi(fields, (R, E) => FEEDBACK_META_FIELDS.has(E)),
    };
  return submitFeedback(M, signal, void 0, credentials);
}
//@ chunk-xx1vmpsq.js:22269-22708 placement
async function submitSurveyFollowup({
  description: description,
  appearanceId: appearanceId,
  surveyResponse: surveyResponse,
  surveyType: surveyType,
  messages: messages,
  lastInterruptedAssistantAPIMessageId: lastInterruptedAssistantAPIMessageId,
  credentials: credentials,
}) {
  let C = await submitFeedbackReport({
    description: description,
    messages: messages,
    lastInterruptedAssistantAPIMessageId: lastInterruptedAssistantAPIMessageId,
    fields: {
      survey_followup: !0,
      survey_appearance_id: appearanceId,
      survey_response: surveyResponse,
      survey_type: surveyType,
    },
    credentials: credentials,
  });
  if (C.success) logFeatureOk("feedback_survey_followup");
  else logFeatureBad("feedback_survey_followup", C.failureReason ?? "unknown");
  return C;
}
/**
 * 提交 /feedback：组装载荷、POST 到反馈接口、记 tengu_bug_report_submitted，返回反馈 id 或拒绝/失败信息。
 */
//@ chunk-xx1vmpsq.js:22708-24811 placement
async function postFeedbackSubmission({
  messages: messages,
  description: description,
  surface: surface,
  scope: scope = "session",
  backgroundTasks: backgroundTasks,
  transcripts: transcripts,
  signal: signal,
  surveyFeedbackSource: surveyFeedbackSource,
  storageV5: storageV5,
  credentials: credentials,
  host: host,
}) {
  let {
      payload: payload,
      thirdPartyDroppedCount: thirdPartyDroppedCount,
      laptopMemoryDroppedCount: laptopMemoryDroppedCount,
    } = await buildFeedbackRequest({
      messages: messages,
      description: description,
      surface: surface,
      scope: scope,
      backgroundTasks: backgroundTasks,
      transcripts: transcripts,
      surveyFeedbackSource: surveyFeedbackSource,
      excludeThirdPartyTranscripts: !0,
      storageV5: storageV5,
      host: host,
    }),
    latestAssistantMessageId = payload.latestAssistantMessageId,
    Q = findSessionIdForMessage(payload.rawTranscriptJsonl, payload.latestAssistantAPIMessageId),
    re = await submitFeedback(payload, signal, Q, credentials),
    z = re,
    fe = 0;
  if (!z.success && z.payloadTooLarge) {
    let {
      transcript: transcript,
      subagentTranscripts: subagentTranscripts,
      lastApiRequest: lastApiRequest,
      recentSessionTranscripts: recentSessionTranscripts,
      rawTranscriptJsonl: rawTranscriptJsonl,
      debugLog: debugLog,
      ...nt
    } = payload;
    if (
      ((fe = 1),
      (z = await submitFeedback(
        {
          ...nt,
          transcript: [],
          ...(rawTranscriptJsonl && { rawTranscriptJsonl: rawTranscriptJsonl }),
          ...(debugLog && { debugLog: debugLog }),
        },
        signal,
        Q,
        credentials,
      )),
      !z.success && z.payloadTooLarge)
    )
      ((fe = 2), (z = await submitFeedback({ ...nt, transcript: [] }, signal, Q, credentials)));
  }
  if (z.success) {
    (logEvent("tengu_bug_report_submitted", {
      surface: fromEnum(surface),
      remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
      retried_after_too_large: !re.success && re.payloadTooLarge === !0,
      strip_level: fromNumber(fe),
      third_party_transcripts_dropped: fromNumber(thirdPartyDroppedCount),
      laptop_memory_rows_dropped: fromNumber(laptopMemoryDroppedCount),
      feedback_id: ye(z.feedbackId),
      last_assistant_message_id: ye(latestAssistantMessageId),
      last_assistant_api_message_id: ye(payload.latestAssistantAPIMessageId),
      last_interrupted_assistant_api_message_id: ye(payload.lastInterruptedAssistantAPIMessageId),
      ...(surveyFeedbackSource && {
        survey_appearance_id: ye(surveyFeedbackSource.appearanceId),
        survey_response: fromEnum(surveyFeedbackSource.response),
        survey_type: fromEnum(surveyFeedbackSource.surveyType),
      }),
    }),
      logEventTo1P_2("tengu_bug_report_description", {
        feedback_id: ye(z.feedbackId),
        descriptionLength: description.length,
      }));
    let ee = !re.success && re.payloadTooLarge === !0;
    if (ee) logFeatureSad("feedback_submit", "payload_stripped");
    else logFeatureOk("feedback_submit");
    return { success: !0, feedbackId: z.feedbackId, retriedAfterTooLarge: ee };
  }
  if (z.failureReason)
    (logFeatureBad("feedback_submit", z.failureReason),
      logEvent("tengu_bug_report_failed", {
        surface: fromEnum(surface),
        remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
        reason: fromEnum(z.failureReason),
        status_code: fromNumberOpt(z.statusCode) ?? lit(""),
        first_attempt_too_large: !re.success && re.payloadTooLarge === !0,
      }));
  return {
    success: !1,
    isZdrOrg: z.isZdrOrg,
    failureReason: z.failureReason,
    statusCode: z.statusCode,
    refusal: z.refusal,
  };
}
//@ chunk-xx1vmpsq.js:24811-24873 placement
var Qs = { success: !1, error: "Cancelled" },
  pr = 262144,
  fr = 3758096384;
/**
 * 把反馈内容写成本地 zip 包（feedback.json + transcript.jsonl），供无法上传时手动分享。
 */
//@ chunk-xx1vmpsq.js:24873-26066 placement
async function writeFeedbackBundle(e, s = "feedback.json", n, y) {
  if (n?.aborted) return Qs;
  let T = `cc-${new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}-${randomBytes(3).toString("hex")}`,
    C = join(getClaudeConfigDir(), "feedback-bundles"),
    I = join(C, `${T}.zip`);
  try {
    await mkdir(C, { recursive: !0, mode: 448 });
    let { Zip: Zip, ZipDeflate: ZipDeflate } = await import("./chunk-9t1jcaah.js"),
      E = createWriteStream(I, { mode: 384 }),
      A;
    if (
      (await new Promise((v, U) => {
        let Q = !1,
          re = (Y) => {
            ((Q = !0), E.destroy(), U(Y));
          };
        E.on("error", re);
        let z = new Zip((Y, ue, ze) => {
            if (Y) return re(Y);
            if ((E.write(ue), ze)) E.end((_e) => (_e ? re(_e) : v()));
          }),
          fe = new ZipDeflate(s);
        if ((z.add(fe), fe.push(e, !0), y === void 0)) {
          z.end();
          return;
        }
        let ee = streamTranscriptFile(y.path, y.inPlay, (Y) => {
          A = Y;
        });
        (async () => {
          try {
            let Y;
            for await (let ue of ee) {
              if (Q || n?.aborted) break;
              if (Y === void 0) ((Y = new ZipDeflate("transcript.jsonl")), z.add(Y));
              if ((Y.push(ue, !1), E.writableNeedDrain)) await once(E, "drain");
            }
            if (Q) return;
            (Y?.push(new Uint8Array(0), !0), z.end());
          } catch (error) {
            re(error);
          }
        })();
      }),
      n?.aborted)
    )
      return (await retryTransient(() => unlink(I)).catch(() => {}), Qs);
    if (A === void 0) logFeatureOk("feedback_bundle");
    else logFeatureSad("feedback_bundle", A);
    return { success: !0, bundleId: T, zipPath: I, ...(A !== void 0 && { transcriptProblem: A }) };
  } catch (error) {
    return (
      await rm(I, { force: !0 }).catch(() => {}),
      logError(error),
      logFeatureBad("feedback_bundle", "write_failed"),
      { success: !1, error: errorMessage(error) }
    );
  }
}
//@ chunk-xx1vmpsq.js:26066-26113 placement
var Ys = new Set(["type", "description", "title"]);
//@ chunk-xx1vmpsq.js:26113-26201 placement = redactSecrets (0.815)
function redactSecrets(content) {
  return typeof content === "string" || (content !== null && typeof content === "object")
    ? "[REDACTED]"
    : content;
}
//@ chunk-xx1vmpsq.js:26201-26249 placement
var gr = /(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/g;
//@ chunk-xx1vmpsq.js:26249-26328 placement
function _s(e, s) {
  return s.includes("api-request") ? e.replace(gr, "[REDACTED]") : e;
}
//@ chunk-xx1vmpsq.js:26328-27242 placement
function redactSecretsInValue(e, s = "data") {
  if (typeof e === "string") return _s(redactSecrets_2(e), e);
  if (Array.isArray(e)) return e.map((r) => redactSecretsInValue(r));
  if (e === null || typeof e !== "object") return e;
  let n = "type" in e && e.type === "object",
    create = Object.create(null);
  for (let [r, w] of Object.entries(e)) {
    let T = w !== null && typeof w === "object" && !Array.isArray(w),
      C = !1,
      I = "data";
    if (s === "credentialProperty")
      if (T && (r === "items" || (r === "properties" && n)))
        I = r === "items" ? "credentialProperty" : "credentialPropertyNames";
      else if (Ys.has(r) && Array.isArray(w)) {
        create[redactSecrets_2(r)] = w.map((M) =>
          typeof M === "string" ? redactSecrets_2(M) : redactSecrets(M),
        );
        continue;
      } else C = !Ys.has(r) || T;
    else if (s === "credentialPropertyNames") ((C = !T), (I = "credentialProperty"));
    else if (s === "propertyNames" && T)
      I = redactSecrets_3({ [r]: "" })[r] === "[REDACTED]" ? "credentialProperty" : "data";
    else if (r === "properties" && T && n) I = "propertyNames";
    else C = redactSecrets_3({ [r]: "" })[r] === "[REDACTED]";
    if (C) create[redactSecrets_2(r)] = redactSecrets(w);
    else if (typeof w === "string") create[redactSecrets_2(r)] = _s(redactKeyedValue(r, w), w);
    else create[redactSecrets_2(r)] = redactSecretsInValue(w, I);
  }
  return create;
}
//@ chunk-xx1vmpsq.js:27242-27271 placement
function redactFeedbackValue(e) {
  return redactSecretsInValue(e);
}
//@ chunk-xx1vmpsq.js:27271-27435 placement
function redactJsonlLines(e) {
  return e
    .split(
      `
`,
    )
    .map((s) => {
      if (!s) return s;
      let n = safeParseJSON(s, !1);
      if (n === null) return _s(redactSecrets_2(s), s);
      try {
        return jsonStringify(redactSecretsInValue(n));
      } catch {
        return _s(redactSecrets_2(s), s);
      }
    }).join(`
`);
}
//@ chunk-xx1vmpsq.js:27435-28144 placement
async function* streamTranscriptFile(e, s, n, y = fr) {
  let r = readLines(e),
    w,
    T = [],
    C = 0,
    I = 0;
  try {
    for (;;) {
      let R = await r.next().catch((A) => {
          w = { error: A };
          return;
        }),
        E = R === void 0 || R.done === !0;
      if (R !== void 0 && R.done !== !0) (T.push(R.value.toString("utf8")), (C += R.value.byteLength));
      if (E ? T.length > 0 : C >= pr) {
        let A = SNn(
            withholdTranscriptLine(
              T.join(`
`),
              s,
            ).jsonl,
          ),
          buffer = Buffer.from(
            A === ""
              ? ""
              : `${A}
`,
          );
        if (I + buffer.byteLength > y) {
          n("transcript_over_zip_limit");
          return;
        }
        (yield buffer, (I += buffer.byteLength), (T = []), (C = 0));
      }
      if (E) break;
    }
  } catch (error) {
    (logError(error), n("transcript_incomplete"));
    return;
  } finally {
    await r.return();
  }
  if (w === void 0) return;
  let { error: error } = w;
  if (isPathAbsent(error)) {
    n("transcript_missing");
    return;
  }
  if (isFsInaccessible(error) || isEISDIR(error))
    logForDebugging(`Feedback bundle: session transcript unreadable (${getErrnoCode(error)})`, {
      level: "error",
    });
  else logError(error);
  n("transcript_incomplete");
}
//@ chunk-xx1vmpsq.js:28144-28178 placement
function SNn(e) {
  return redactJsonlLines(redactTranscriptLines(e));
}
//@ chunk-xx1vmpsq.js:28178-29008 placement
async function saveFeedbackBundle({
  messages: messages,
  description: description,
  surface: surface,
  scope: scope = "session",
  backgroundTasks: backgroundTasks,
  transcripts: transcripts,
  signal: signal,
  surveyFeedbackSource: surveyFeedbackSource,
  wholeTranscript: wholeTranscript = !1,
  storageV5: storageV5,
  host: host,
}) {
  let E, A;
  try {
    if (wholeTranscript) {
      let Y = getMaterializedSessionFile();
      A = {
        path: Y !== null && isOwnTranscriptFile(getSessionId(), Y) ? Y : getTranscriptPath(),
        inPlay: { host: host },
      };
    }
    let { payload: payload } = await buildFeedbackRequest({
        messages: messages,
        description: description,
        surface: surface,
        scope: scope,
        backgroundTasks: backgroundTasks,
        transcripts: transcripts,
        surveyFeedbackSource: surveyFeedbackSource,
        excludeThirdPartyTranscripts: !1,
        storageV5: storageV5,
        host: host,
      }),
      {
        rawTranscriptJsonl: rawTranscriptJsonl,
        recentSessionTranscripts: recentSessionTranscripts,
        transcript: transcript,
        subagentTranscripts: subagentTranscripts,
        ...fe
      } = payload,
      ee = {
        ...redactSecretsDeep(fe),
        transcript: redactFeedbackValue(transcript),
        ...(subagentTranscripts !== void 0 && {
          subagentTranscripts: xr(subagentTranscripts, redactFeedbackValue),
        }),
        ...(rawTranscriptJsonl !== void 0 && { rawTranscriptJsonl: SNn(rawTranscriptJsonl) }),
        ...(recentSessionTranscripts !== void 0 && {
          recentSessionTranscripts: xr(recentSessionTranscripts, SNn),
        }),
      };
    E = buildFeedbackPayload(ee, TRANSCRIPT_FIELDS, xs);
  } catch (error) {
    return (
      logError(error),
      logFeatureBad("feedback_bundle", "write_failed"),
      { success: !1, error: errorMessage(error) }
    );
  }
  return writeFeedbackBundle(E, void 0, signal, A);
}
//@ chunk-xx1vmpsq.js:29008-29865 placement
function buildInitMessageFields(e) {
  return {
    commands: e.commands ?? [],
    agents: e.agents ?? [],
    output_style: e.outputStyle ?? "default",
    available_output_styles: e.availableOutputStyles ?? ["default"],
    models: e.models ?? [],
    ...(e.unavailableModels && e.unavailableModels.length > 0 && { unavailable_models: e.unavailableModels }),
    account: e.account ?? { apiProvider: "firstParty" },
    pid: e.pid ?? process.pid,
    claude_code_version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
//@ chunk-xx1vmpsq.js:29902-30092 placement
function memoryRecallMessage(e) {
  if (e.length === 0) return;
  return {
    type: "system",
    subtype: "memory_recall",
    mode: "select",
    memories: e.map((s) => ({ path: s.path, scope: memoryScopeForPath(s.path) ?? "personal" })),
    uuid: randomUUID_2(),
    session_id: getSessionId(),
  };
}
//@ chunk-xx1vmpsq.js:30129-30208 placement
function hasSeededComment(e) {
  if (!Array.isArray(e)) return isCommentNotificationText(e);
  return e.some((s) => isCommentNotificationText([s]));
}

export {
  logEventTo1P,
  submitSurveyFollowup,
  submitFeedbackReport,
  postFeedbackSubmission,
  SNn,
  redactFeedbackValue,
  writeFeedbackBundle,
  saveFeedbackBundle,
  hasSeededComment,
  buildInitMessageFields,
  memoryRecallMessage,
};
