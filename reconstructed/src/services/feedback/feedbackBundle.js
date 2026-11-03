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
import { randomBytes, randomUUID } from "crypto";
import { join } from "path";
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
  SUBAGENT_TRANSCRIPT_FIELDS,
} from "./submitFeedback.js";
import { findLastRealAssistantMessage } from "../compact/autoCompact.js";
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
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
  description,
  messages,
  lastInterruptedAssistantAPIMessageId,
  fields,
  maxDescriptionChars,
  signal,
  credentials,
}) {
  if (getAPIProvider() !== "firstParty")
    return {
      success: false,
      failureReason: "not_first_party",
    };
  let lastRealAssistantMessage = findLastRealAssistantMessage(messages);
  let I = redactSecrets_2(description);
  let M = {
    latestAssistantMessageId: lastRealAssistantMessage?.requestId ?? null,
    latestAssistantAPIMessageId: lastRealAssistantMessage?.message.id ?? null,
    lastInterruptedAssistantAPIMessageId,
    message_count: messages.length,
    datetime: new Date().toISOString(),
    description: maxDescriptionChars === undefined ? I : truncateToLength(I, maxDescriptionChars),
    surface: "cli",
    platform: env.platform,
    gitRepo: false,
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
  return submitFeedback(M, signal, undefined, credentials);
}
//@ chunk-xx1vmpsq.js:22269-22708 placement
async function submitSurveyFollowup({
  description,
  appearanceId,
  surveyResponse,
  surveyType,
  messages,
  lastInterruptedAssistantAPIMessageId,
  credentials,
}) {
  let C = await submitFeedbackReport({
    description,
    messages,
    lastInterruptedAssistantAPIMessageId,
    fields: {
      survey_followup: true,
      survey_appearance_id: appearanceId,
      survey_response: surveyResponse,
      survey_type: surveyType,
    },
    credentials,
  });
  if (C.success) logFeatureOk("feedback_survey_followup");
  else logFeatureBad("feedback_survey_followup", C.failureReason ?? "unknown");
  return C;
}
//@ chunk-xx1vmpsq.js:22708-24811 placement
/**
 * 提交 /feedback：组装载荷、POST 到反馈接口、记 tengu_bug_report_submitted，返回反馈 id 或拒绝/失败信息。
 */
async function postFeedbackSubmission({
  messages,
  description,
  surface,
  scope = "session",
  backgroundTasks,
  transcripts,
  signal,
  surveyFeedbackSource,
  storageV5,
  credentials,
  host,
}) {
  let { payload, thirdPartyDroppedCount, laptopMemoryDroppedCount } = await buildFeedbackRequest({
    messages,
    description,
    surface,
    scope,
    backgroundTasks,
    transcripts,
    surveyFeedbackSource,
    excludeThirdPartyTranscripts: true,
    storageV5,
    host,
  });
  let latestAssistantMessageId = payload.latestAssistantMessageId;
  let sessionIdForMessage = findSessionIdForMessage(
    payload.rawTranscriptJsonl,
    payload.latestAssistantAPIMessageId,
  );
  let re = await submitFeedback(payload, signal, sessionIdForMessage, credentials);
  let z = re;
  let fe = 0;
  if (!z.success && z.payloadTooLarge) {
    let {
      transcript,
      subagentTranscripts,
      lastApiRequest,
      recentSessionTranscripts,
      rawTranscriptJsonl,
      debugLog,
      ...nt
    } = payload;
    fe = 1;
    z = await submitFeedback(
      {
        ...nt,
        transcript: [],
        ...(rawTranscriptJsonl && {
          rawTranscriptJsonl,
        }),
        ...(debugLog && {
          debugLog,
        }),
      },
      signal,
      sessionIdForMessage,
      credentials,
    );
    if (!z.success && z.payloadTooLarge) {
      fe = 2;
      z = await submitFeedback(
        {
          ...nt,
          transcript: [],
        },
        signal,
        sessionIdForMessage,
        credentials,
      );
    }
  }
  if (z.success) {
    logEvent("tengu_bug_report_submitted", {
      surface: fromEnum(surface),
      remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
      retried_after_too_large: !re.success && re.payloadTooLarge === true,
      strip_level: fromNumber(fe),
      third_party_transcripts_dropped: fromNumber(thirdPartyDroppedCount),
      laptop_memory_rows_dropped: fromNumber(laptopMemoryDroppedCount),
      feedback_id: sanitizeMarkName(z.feedbackId),
      last_assistant_message_id: sanitizeMarkName(latestAssistantMessageId),
      last_assistant_api_message_id: sanitizeMarkName(payload.latestAssistantAPIMessageId),
      last_interrupted_assistant_api_message_id: sanitizeMarkName(
        payload.lastInterruptedAssistantAPIMessageId,
      ),
      ...(surveyFeedbackSource && {
        survey_appearance_id: sanitizeMarkName(surveyFeedbackSource.appearanceId),
        survey_response: fromEnum(surveyFeedbackSource.response),
        survey_type: fromEnum(surveyFeedbackSource.surveyType),
      }),
    });
    logEventTo1P_2("tengu_bug_report_description", {
      feedback_id: sanitizeMarkName(z.feedbackId),
      descriptionLength: description.length,
    });
    let ee = !re.success && re.payloadTooLarge === true;
    if (ee) logFeatureSad("feedback_submit", "payload_stripped");
    else logFeatureOk("feedback_submit");
    return {
      success: true,
      feedbackId: z.feedbackId,
      retriedAfterTooLarge: ee,
    };
  }
  if (z.failureReason) {
    logFeatureBad("feedback_submit", z.failureReason);
    logEvent("tengu_bug_report_failed", {
      surface: fromEnum(surface),
      remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
      reason: fromEnum(z.failureReason),
      status_code: fromNumberOpt(z.statusCode) ?? lit(""),
      first_attempt_too_large: !re.success && re.payloadTooLarge === true,
    });
  }
  return {
    success: false,
    isZdrOrg: z.isZdrOrg,
    failureReason: z.failureReason,
    statusCode: z.statusCode,
    refusal: z.refusal,
  };
}
//@ chunk-xx1vmpsq.js:24811-24873 placement
/**
 * 流转录文件时的字节上限（3.5 GiB）。
 */
var CANCELLED_RESULT = {
  success: false,
  error: "Cancelled",
};
var MAX_INLINE_TRANSCRIPT_BYTES = 262144;
var MAX_TRANSCRIPT_STREAM_BYTES = 3758096384;
//@ chunk-xx1vmpsq.js:24873-26066 placement
/**
 * 把反馈内容写成本地 zip 包（feedback.json + transcript.jsonl），供无法上传时手动分享。
 */
async function writeFeedbackBundle(e, s = "feedback.json", signal, y) {
  if (signal?.aborted) return CANCELLED_RESULT;
  let T = `cc-${new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}-${randomBytes(3).toString("hex")}`;
  let C = join(getClaudeConfigDir(), "feedback-bundles");
  let I = join(C, `${T}.zip`);
  try {
    await mkdir(C, {
      recursive: true,
      mode: 448,
    });
    let { Zip, ZipDeflate } = await import("./chunk-9t1jcaah.js");
    let writeStream = createWriteStream(I, {
      mode: 384,
    });
    let A;
    await new Promise((resolve, reject) => {
      let Q = false;
      let re = (Y) => {
        Q = true;
        writeStream.destroy();
        reject(Y);
      };
      writeStream.on("error", re);
      let z = new Zip((Y, ue, ze) => {
        if (Y) return re(Y);
        writeStream.write(ue);
        if (ze) writeStream.end((_e) => (_e ? re(_e) : resolve()));
      });
      let fe = new ZipDeflate(s);
      z.add(fe);
      fe.push(e, true);
      if (y === undefined) {
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
            if (Q || signal?.aborted) break;
            if (Y === undefined) {
              Y = new ZipDeflate("transcript.jsonl");
              z.add(Y);
            }
            Y.push(ue, false);
            if (writeStream.writableNeedDrain) await once(writeStream, "drain");
          }
          if (Q) return;
          Y?.push(new Uint8Array(0), true);
          z.end();
        } catch (error) {
          re(error);
        }
      })();
    });
    if (signal?.aborted) {
      await retryTransient(() => unlink(I)).catch(() => {});
      return CANCELLED_RESULT;
    }
    if (A === undefined) logFeatureOk("feedback_bundle");
    else logFeatureSad("feedback_bundle", A);
    return {
      success: true,
      bundleId: T,
      zipPath: I,
      ...(A !== undefined && {
        transcriptProblem: A,
      }),
    };
  } catch (error) {
    await rm(I, {
      force: true,
    }).catch(() => {});
    logError(error);
    logFeatureBad("feedback_bundle", "write_failed");
    return {
      success: false,
      error: errorMessage(error),
    };
  }
}
//@ chunk-xx1vmpsq.js:26066-26113 placement
/**
 * 反馈载荷里原样保留的字段名（type、description、title）。
 */
var KEEP_VERBATIM_FIELDS = new Set(["type", "description", "title"]);
//@ chunk-xx1vmpsq.js:26113-26201 placement = redactSecrets (0.815)
function redactSecrets(content) {
  return typeof content === "string" || (content !== null && typeof content === "object")
    ? "[REDACTED]"
    : content;
}
//@ chunk-xx1vmpsq.js:26201-26249 placement
/**
 * 匹配 64 位十六进制摘要的正则。
 */
var SHA256_HEX_RE = /(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/g;
//@ chunk-xx1vmpsq.js:26249-26328 placement
/**
 * 对 api-request 类型的内容把 64 位哈希替换成 [REDACTED]。
 */
function redactHashInApiRequest(e, line) {
  return line.includes("api-request") ? e.replace(SHA256_HEX_RE, "[REDACTED]") : e;
}
//@ chunk-xx1vmpsq.js:26328-27242 placement
function redactSecretsInValue(e, s = "data") {
  if (typeof e === "string") return redactHashInApiRequest(redactSecrets_2(e), e);
  if (Array.isArray(e)) return e.map((r) => redactSecretsInValue(r));
  if (e === null || typeof e !== "object") return e;
  let n = "type" in e && e.type === "object";
  let y = Object.create(null);
  for (let [key, value] of Object.entries(e)) {
    let T = value !== null && typeof value === "object" && !Array.isArray(value);
    let C = false;
    let I = "data";
    if (s === "credentialProperty") {
      if (T && (key === "items" || (key === "properties" && n)))
        I = key === "items" ? "credentialProperty" : "credentialPropertyNames";
      else if (KEEP_VERBATIM_FIELDS.has(key) && Array.isArray(value)) {
        y[redactSecrets_2(key)] = value.map((M) =>
          typeof M === "string" ? redactSecrets_2(M) : redactSecrets(M),
        );
        continue;
      } else C = !KEEP_VERBATIM_FIELDS.has(key) || T;
    } else if (s === "credentialPropertyNames") {
      C = !T;
      I = "credentialProperty";
    } else if (s === "propertyNames" && T)
      I =
        redactSecrets_3({
          [key]: "",
        })[key] === "[REDACTED]"
          ? "credentialProperty"
          : "data";
    else if (key === "properties" && T && n) I = "propertyNames";
    else
      C =
        redactSecrets_3({
          [key]: "",
        })[key] === "[REDACTED]";
    if (C) y[redactSecrets_2(key)] = redactSecrets(value);
    else if (typeof value === "string")
      y[redactSecrets_2(key)] = redactHashInApiRequest(redactKeyedValue(key, value), value);
    else y[redactSecrets_2(key)] = redactSecretsInValue(value, I);
  }
  return y;
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
    .map((line) => {
      if (!line) return line;
      let n = safeParseJSON(line, false);
      if (n === null) return redactHashInApiRequest(redactSecrets_2(line), line);
      try {
        return jsonStringify(redactSecretsInValue(n));
      } catch {
        return redactHashInApiRequest(redactSecrets_2(line), line);
      }
    }).join(`
`);
}
//@ chunk-xx1vmpsq.js:27435-28144 placement
async function* streamTranscriptFile(path, inPlay, n, y = MAX_TRANSCRIPT_STREAM_BYTES) {
  let lines = readLines(path);
  let w;
  let T = [];
  let C = 0;
  let I = 0;
  try {
    for (;;) {
      let R = await lines.next().catch((error) => {
        w = {
          error,
        };
        return;
      });
      let E = R === undefined || R.done === true;
      if (R !== undefined && R.done !== true) {
        T.push(R.value.toString("utf8"));
        C += R.value.byteLength;
      }
      if (E ? T.length > 0 : C >= MAX_INLINE_TRANSCRIPT_BYTES) {
        let A = redactTranscript(
          withholdTranscriptLine(
            T.join(`
`),
            inPlay,
          ).jsonl,
        );
        let buffer = Buffer.from(
          A === ""
            ? ""
            : `${A}
`,
        );
        if (I + buffer.byteLength > y) {
          n("transcript_over_zip_limit");
          return;
        }
        yield buffer;
        I += buffer.byteLength;
        T = [];
        C = 0;
      }
      if (E) break;
    }
  } catch (error) {
    logError(error);
    n("transcript_incomplete");
    return;
  } finally {
    await lines.return();
  }
  if (w === undefined) return;
  let { error } = w;
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
/**
 * 先按行脱敏再对整段做 JSON 行脱敏。
 */
function redactTranscript(e) {
  return redactJsonlLines(redactTranscriptLines(e));
}
//@ chunk-xx1vmpsq.js:28178-29008 placement
async function saveFeedbackBundle({
  messages,
  description,
  surface,
  scope = "session",
  backgroundTasks,
  transcripts,
  signal,
  surveyFeedbackSource,
  wholeTranscript = false,
  storageV5,
  host,
}) {
  let E;
  let A;
  try {
    if (wholeTranscript) {
      let materializedSessionFile = getMaterializedSessionFile();
      A = {
        path:
          materializedSessionFile !== null && isOwnTranscriptFile(getSessionId(), materializedSessionFile)
            ? materializedSessionFile
            : getTranscriptPath(),
        inPlay: {
          host,
        },
      };
    }
    let { payload } = await buildFeedbackRequest({
      messages,
      description,
      surface,
      scope,
      backgroundTasks,
      transcripts,
      surveyFeedbackSource,
      excludeThirdPartyTranscripts: false,
      storageV5,
      host,
    });
    let { rawTranscriptJsonl, recentSessionTranscripts, transcript, subagentTranscripts, ...fe } = payload;
    let ee = {
      ...redactSecretsDeep(fe),
      transcript: redactFeedbackValue(transcript),
      ...(subagentTranscripts !== undefined && {
        subagentTranscripts: xr(subagentTranscripts, redactFeedbackValue),
      }),
      ...(rawTranscriptJsonl !== undefined && {
        rawTranscriptJsonl: redactTranscript(rawTranscriptJsonl),
      }),
      ...(recentSessionTranscripts !== undefined && {
        recentSessionTranscripts: xr(recentSessionTranscripts, redactTranscript),
      }),
    };
    E = buildFeedbackPayload(ee, TRANSCRIPT_FIELDS, SUBAGENT_TRANSCRIPT_FIELDS);
  } catch (error) {
    logError(error);
    logFeatureBad("feedback_bundle", "write_failed");
    return {
      success: false,
      error: errorMessage(error),
    };
  }
  return writeFeedbackBundle(E, undefined, signal, A);
}
//@ chunk-xx1vmpsq.js:29008-29865 placement
function buildInitMessageFields(e) {
  return {
    commands: e.commands ?? [],
    agents: e.agents ?? [],
    output_style: e.outputStyle ?? "default",
    available_output_styles: e.availableOutputStyles ?? ["default"],
    models: e.models ?? [],
    ...(e.unavailableModels &&
      e.unavailableModels.length > 0 && {
        unavailable_models: e.unavailableModels,
      }),
    account: e.account ?? {
      apiProvider: "firstParty",
    },
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
function memoryRecallMessage(memories) {
  if (memories.length === 0) return;
  return {
    type: "system",
    subtype: "memory_recall",
    mode: "select",
    memories: memories.map((s) => ({
      path: s.path,
      scope: memoryScopeForPath(s.path) ?? "personal",
    })),
    uuid: randomUUID(),
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
  redactTranscript,
  redactFeedbackValue,
  writeFeedbackBundle,
  saveFeedbackBundle,
  hasSeededComment,
  buildInitMessageFields,
  memoryRecallMessage,
};
