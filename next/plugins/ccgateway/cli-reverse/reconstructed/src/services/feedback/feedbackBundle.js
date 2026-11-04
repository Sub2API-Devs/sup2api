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
import { import_reject, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xx1vmpsq.js:20766-20827 placement (2.1.88 match: logEventTo1P, 1)
function logEventTo1P() {
  return isFeedbackAllowed() && getAPIProvider() === "firstParty" && feedbackCredentialStatus() === null;
}
//@ chunk-xx1vmpsq.js:20827-21189 placement
var FEEDBACK_META_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xx1vmpsq.js:20827", () => {
  FEEDBACK_META_FIELDS = new Set([
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
});
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
  let redactedDescription = redactSecrets_2(description);
  let payload = {
    latestAssistantMessageId: lastRealAssistantMessage?.requestId ?? null,
    latestAssistantAPIMessageId: lastRealAssistantMessage?.message.id ?? null,
    lastInterruptedAssistantAPIMessageId,
    message_count: messages.length,
    datetime: new Date().toISOString(),
    description:
      maxDescriptionChars === undefined
        ? redactedDescription
        : truncateToLength(redactedDescription, maxDescriptionChars),
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
    ...import_reject(fields, (value, fieldName) => FEEDBACK_META_FIELDS.has(fieldName)),
  };
  return submitFeedback(payload, signal, undefined, credentials);
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
  let cr = await submitFeedbackReport({
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
  if (cr.success) logFeatureOk("feedback_survey_followup");
  else logFeatureBad("feedback_survey_followup", cr.failureReason ?? "unknown");
  return cr;
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
  let firstResult = await submitFeedback(payload, signal, sessionIdForMessage, credentials);
  let result = firstResult;
  let stripLevel = 0;
  if (!result.success && result.payloadTooLarge) {
    let {
      transcript,
      subagentTranscripts,
      lastApiRequest,
      recentSessionTranscripts,
      rawTranscriptJsonl,
      debugLog,
      ...rest
    } = payload;
    stripLevel = 1;
    result = await submitFeedback(
      {
        ...rest,
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
    if (!result.success && result.payloadTooLarge) {
      stripLevel = 2;
      result = await submitFeedback(
        {
          ...rest,
          transcript: [],
        },
        signal,
        sessionIdForMessage,
        credentials,
      );
    }
  }
  if (result.success) {
    logEvent("tengu_bug_report_submitted", {
      surface: fromEnum(surface),
      remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
      retried_after_too_large: !firstResult.success && firstResult.payloadTooLarge === true,
      strip_level: fromNumber(stripLevel),
      third_party_transcripts_dropped: fromNumber(thirdPartyDroppedCount),
      laptop_memory_rows_dropped: fromNumber(laptopMemoryDroppedCount),
      feedback_id: sanitizeMarkName(result.feedbackId),
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
      feedback_id: sanitizeMarkName(result.feedbackId),
      descriptionLength: description.length,
    });
    let stripped = !firstResult.success && firstResult.payloadTooLarge === true;
    if (stripped) logFeatureSad("feedback_submit", "payload_stripped");
    else logFeatureOk("feedback_submit");
    return {
      success: true,
      feedbackId: result.feedbackId,
      retriedAfterTooLarge: stripped,
    };
  }
  if (result.failureReason) {
    logFeatureBad("feedback_submit", result.failureReason);
    logEvent("tengu_bug_report_failed", {
      surface: fromEnum(surface),
      remote_workspace: lit(payload.remoteWorkspace ? "true" : "false"),
      reason: fromEnum(result.failureReason),
      status_code: fromNumberOpt(result.statusCode) ?? lit(""),
      first_attempt_too_large: !firstResult.success && firstResult.payloadTooLarge === true,
    });
  }
  return {
    success: false,
    isZdrOrg: result.isZdrOrg,
    failureReason: result.failureReason,
    statusCode: result.statusCode,
    refusal: result.refusal,
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
async function writeFeedbackBundle(text, entryName = "feedback.json", signal, transcriptSource) {
  if (signal?.aborted) return CANCELLED_RESULT;
  let bundleId = `cc-${new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}-${randomBytes(3).toString("hex")}`;
  let bundleDir = join(getClaudeConfigDir(), "feedback-bundles");
  let zipPath = join(bundleDir, `${bundleId}.zip`);
  try {
    await mkdir(bundleDir, {
      recursive: true,
      mode: 448,
    });
    let { Zip, ZipDeflate } = await import("../../../vendor/fflate/esm/index.mjs");
    let writeStream = createWriteStream(zipPath, {
      mode: 384,
    });
    let transcriptProblem;
    await new Promise((resolve, reject) => {
      let failed = false;
      let fail = (error) => {
        failed = true;
        writeStream.destroy();
        reject(error);
      };
      writeStream.on("error", fail);
      let zip = new Zip((error, chunk, final) => {
        if (error) return fail(error);
        writeStream.write(chunk);
        if (final) writeStream.end((error) => (error ? fail(error) : resolve()));
      });
      let jsonEntry = new ZipDeflate(entryName);
      zip.add(jsonEntry);
      jsonEntry.push(text, true);
      if (transcriptSource === undefined) {
        zip.end();
        return;
      }
      let transcriptLines = streamTranscriptFile(
        transcriptSource.path,
        transcriptSource.inPlay,
        (problem) => {
          transcriptProblem = problem;
        },
      );
      (async () => {
        try {
          let transcriptEntry;
          for await (let line of transcriptLines) {
            if (failed || signal?.aborted) break;
            if (transcriptEntry === undefined) {
              transcriptEntry = new ZipDeflate("transcript.jsonl");
              zip.add(transcriptEntry);
            }
            transcriptEntry.push(line, false);
            if (writeStream.writableNeedDrain) await once(writeStream, "drain");
          }
          if (failed) return;
          transcriptEntry?.push(new Uint8Array(0), true);
          zip.end();
        } catch (error) {
          fail(error);
        }
      })();
    });
    if (signal?.aborted) {
      await retryTransient(() => unlink(zipPath)).catch(() => {});
      return CANCELLED_RESULT;
    }
    if (transcriptProblem === undefined) logFeatureOk("feedback_bundle");
    else logFeatureSad("feedback_bundle", transcriptProblem);
    return {
      success: true,
      bundleId,
      zipPath,
      ...(transcriptProblem !== undefined && {
        transcriptProblem,
      }),
    };
  } catch (error) {
    await rm(zipPath, {
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
var KEEP_VERBATIM_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xx1vmpsq.js:26066", () => {
  KEEP_VERBATIM_FIELDS = new Set(["type", "description", "title"]);
});
//@ chunk-xx1vmpsq.js:26113-26201 placement (2.1.88 match: redactSecrets, 0.815)
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
function redactHashInApiRequest(text, line) {
  return line.includes("api-request") ? text.replace(SHA256_HEX_RE, "[REDACTED]") : text;
}
//@ chunk-xx1vmpsq.js:26328-27242 placement
function redactSecretsInValue(value, mode = "data") {
  if (typeof value === "string") return redactHashInApiRequest(redactSecrets_2(value), value);
  if (Array.isArray(value)) return value.map((entry) => redactSecretsInValue(entry));
  if (value === null || typeof value !== "object") return value;
  let isObjectSchema = "type" in value && value.type === "object";
  let copy = Object.create(null);
  for (let [key, value_2] of Object.entries(value)) {
    let childIsObject = value_2 !== null && typeof value_2 === "object" && !Array.isArray(value_2);
    let redactWhole = false;
    let childMode = "data";
    if (mode === "credentialProperty") {
      if (childIsObject && (key === "items" || (key === "properties" && isObjectSchema)))
        childMode = key === "items" ? "credentialProperty" : "credentialPropertyNames";
      else if (KEEP_VERBATIM_FIELDS.has(key) && Array.isArray(value_2)) {
        copy[redactSecrets_2(key)] = value_2.map((entry) =>
          typeof entry === "string" ? redactSecrets_2(entry) : redactSecrets(entry),
        );
        continue;
      } else redactWhole = !KEEP_VERBATIM_FIELDS.has(key) || childIsObject;
    } else if (mode === "credentialPropertyNames") {
      redactWhole = !childIsObject;
      childMode = "credentialProperty";
    } else if (mode === "propertyNames" && childIsObject)
      childMode =
        redactSecrets_3({
          [key]: "",
        })[key] === "[REDACTED]"
          ? "credentialProperty"
          : "data";
    else if (key === "properties" && childIsObject && isObjectSchema) childMode = "propertyNames";
    else
      redactWhole =
        redactSecrets_3({
          [key]: "",
        })[key] === "[REDACTED]";
    if (redactWhole) copy[redactSecrets_2(key)] = redactSecrets(value_2);
    else if (typeof value_2 === "string")
      copy[redactSecrets_2(key)] = redactHashInApiRequest(redactKeyedValue(key, value_2), value_2);
    else copy[redactSecrets_2(key)] = redactSecretsInValue(value_2, childMode);
  }
  return copy;
}
//@ chunk-xx1vmpsq.js:27242-27271 placement
function redactFeedbackValue(value) {
  return redactSecretsInValue(value);
}
//@ chunk-xx1vmpsq.js:27271-27435 placement
function redactJsonlLines(text) {
  return text
    .split(
      `
`,
    )
    .map((line) => {
      if (!line) return line;
      let jsonlLine = safeParseJSON(line, false);
      if (jsonlLine === null) return redactHashInApiRequest(redactSecrets_2(line), line);
      try {
        return jsonStringify(redactSecretsInValue(jsonlLine));
      } catch {
        return redactHashInApiRequest(redactSecrets_2(line), line);
      }
    }).join(`
`);
}
//@ chunk-xx1vmpsq.js:27435-28144 placement
async function* streamTranscriptFile(
  filePath,
  inPlay,
  transcriptPath,
  inPlayContext = MAX_TRANSCRIPT_STREAM_BYTES,
) {
  let lines = readLines(filePath);
  let lineError;
  let pendingLines = [];
  let pendingBytes = 0;
  let emittedBytes = 0;
  try {
    for (;;) {
      let next = await lines.next().catch((error) => {
        lineError = {
          error,
        };
        return;
      });
      let done = next === undefined || next.done === true;
      if (next !== undefined && next.done !== true) {
        pendingLines.push(next.value.toString("utf8"));
        pendingBytes += next.value.byteLength;
      }
      if (done ? pendingLines.length > 0 : pendingBytes >= MAX_INLINE_TRANSCRIPT_BYTES) {
        let redacted = redactTranscript(
          withholdTranscriptLine(
            pendingLines.join(`
`),
            inPlay,
          ).jsonl,
        );
        let buffer = Buffer.from(
          redacted === ""
            ? ""
            : `${redacted}
`,
        );
        if (emittedBytes + buffer.byteLength > inPlayContext) {
          transcriptPath("transcript_over_zip_limit");
          return;
        }
        yield buffer;
        emittedBytes += buffer.byteLength;
        pendingLines = [];
        pendingBytes = 0;
      }
      if (done) break;
    }
  } catch (error) {
    logError(error);
    transcriptPath("transcript_incomplete");
    return;
  } finally {
    await lines.return();
  }
  if (lineError === undefined) return;
  let { error } = lineError;
  if (isPathAbsent(error)) {
    transcriptPath("transcript_missing");
    return;
  }
  if (isFsInaccessible(error) || isEISDIR(error))
    logForDebugging(`Feedback bundle: session transcript unreadable (${getErrnoCode(error)})`, {
      level: "error",
    });
  else logError(error);
  transcriptPath("transcript_incomplete");
}
//@ chunk-xx1vmpsq.js:28144-28178 placement
/**
 * 先按行脱敏再对整段做 JSON 行脱敏。
 */
function redactTranscript(text) {
  return redactJsonlLines(redactTranscriptLines(text));
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
  let payloadText;
  let transcriptSource;
  try {
    if (wholeTranscript) {
      let materializedSessionFile = getMaterializedSessionFile();
      transcriptSource = {
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
    let { rawTranscriptJsonl, recentSessionTranscripts, transcript, subagentTranscripts, ...rest } = payload;
    let redacted = {
      ...redactSecretsDeep(rest),
      transcript: redactFeedbackValue(transcript),
      ...(subagentTranscripts !== undefined && {
        subagentTranscripts: import_mapValues(subagentTranscripts, redactFeedbackValue),
      }),
      ...(rawTranscriptJsonl !== undefined && {
        rawTranscriptJsonl: redactTranscript(rawTranscriptJsonl),
      }),
      ...(recentSessionTranscripts !== undefined && {
        recentSessionTranscripts: import_mapValues(recentSessionTranscripts, redactTranscript),
      }),
    };
    payloadText = buildFeedbackPayload(redacted, TRANSCRIPT_FIELDS, SUBAGENT_TRANSCRIPT_FIELDS);
  } catch (error) {
    logError(error);
    logFeatureBad("feedback_bundle", "write_failed");
    return {
      success: false,
      error: errorMessage(error),
    };
  }
  return writeFeedbackBundle(payloadText, undefined, signal, transcriptSource);
}
//@ chunk-xx1vmpsq.js:29008-29865 placement
function buildInitMessageFields(initParams) {
  return {
    commands: initParams.commands ?? [],
    agents: initParams.agents ?? [],
    output_style: initParams.outputStyle ?? "default",
    available_output_styles: initParams.availableOutputStyles ?? ["default"],
    models: initParams.models ?? [],
    ...(initParams.unavailableModels &&
      initParams.unavailableModels.length > 0 && {
        unavailable_models: initParams.unavailableModels,
      }),
    account: initParams.account ?? {
      apiProvider: "firstParty",
    },
    pid: initParams.pid ?? process.pid,
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
    memories: memories.map((memory) => ({
      path: memory.path,
      scope: memoryScopeForPath(memory.path) ?? "personal",
    })),
    uuid: randomUUID(),
    session_id: getSessionId(),
  };
}
//@ chunk-xx1vmpsq.js:30129-30208 placement
function hasSeededComment(content) {
  if (!Array.isArray(content)) return isCommentNotificationText(content);
  return content.some((block) => isCommentNotificationText([block]));
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
