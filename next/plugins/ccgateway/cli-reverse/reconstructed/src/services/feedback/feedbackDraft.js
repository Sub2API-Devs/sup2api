/**
 * services/feedback/feedbackDraft.ts
 *
 * 2.1.316 新增：反馈草稿
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-20ssm8df.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringifyRaw, slowLogging, jsonParseRaw } from "../../utils/slowOperations.js";
import {
  feedbackPayloadPartCount,
  MAX_PAYLOAD_PART_COUNT,
  selectTailWithinBudget,
  MAX_RAW_TRANSCRIPT_BYTES,
  orgRefusalError,
  orgFeedbackRefusalMessage,
  feedbackUnavailableReason,
  credentialRefusalMessage,
  serverStatusSuffix,
} from "./submitFeedback.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  recentEntries,
  sanitizeArea,
  asFailureMode,
  asTaskCategory,
  sanitizeEffort,
  asThinkingType,
  asTokenCount,
  sanitizeTitle,
  sanitizeDetails,
  sanitizeModel,
  sanitizeShortText,
  MAX_CLI_VERSION_LENGTH,
  MAX_OS_LENGTH,
  resolveDraftTranscript,
  transcriptCorroboratesDraft,
  deleteFeedbackDraft,
  decrementSessionDraftCount,
  dismissFeedbackNotice_2,
} from "./feedbackDrafts.js";
import { plural } from "../../utils/stringUtils.js";
import { getSessionId } from "../../bootstrap/state.js";
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { withholdForExport, withholdTranscriptLine } from "../../utils/transcriptWithholding.js";
import { tailFile } from "../../utils/fsOperations.js";
import { containsProviderId, anyMessageHasProviderId } from "../api/providerIds.js";
import { redactTranscriptLines } from "../../utils/transcriptRequestBlobs.js";
import { env } from "../../utils/env.js";
import { submitFeedback } from "../../components/Feedback.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getAuthHeaders } from "../../utils/http.js";
import { checkProductFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";

//@ chunk-20ssm8df.js:830-842 placement
/**
 * 计算反馈载荷大小时给转录留的余量（64 KiB）。
 */
var TRANSCRIPT_SIZE_SLACK_BYTES = 65536;
//@ chunk-20ssm8df.js:842-904 placement
/**
 * 计算单条转录消息序列化后的字节数。
 */
function serializedEntryBytes(entry) {
  return Buffer.byteLength(jsonStringifyRaw(jsonStringifyRaw(entry)).slice(1, -1));
}
//@ chunk-20ssm8df.js:904-986 placement
/**
 * 计算整个原始转录文本序列化后的字节数。
 */
function serializedRawBytes(rawTranscriptJsonl) {
  let sliced = jsonStringifyRaw(rawTranscriptJsonl).slice(1, -1);
  return Buffer.byteLength(jsonStringifyRaw(sliced).slice(1, -1));
}
//@ chunk-20ssm8df.js:986-2173 placement
/**
 * 反馈载荷超过大小预算时从最旧处裁剪转录消息与原始会话日志（保留最新，丢弃单条超大的），在描述后附加截断说明，返回 {payload, trim}。
 */
function fitFeedbackPayloadToBudget(payload) {
  let size = feedbackPayloadPartCount(payload);
  if (size <= MAX_PAYLOAD_PART_COUNT)
    return {
      payload,
      trim: null,
    };
  using partCount = slowLogging`fitFeedbackPayloadToBudget(${size})`;
  let excess = size - (MAX_PAYLOAD_PART_COUNT - TRANSCRIPT_SIZE_SLACK_BYTES);
  let sizes = payload.transcript.map((entry) => serializedEntryBytes(entry) + 1);
  let reduced = sizes.reduce((acc, size) => acc + size, 0);
  let rawBytes =
    payload.rawTranscriptJsonl === undefined ? 0 : serializedRawBytes(payload.rawTranscriptJsonl);
  let transcriptBudget =
    excess <= reduced ? reduced - excess : Math.max(0, reduced - Math.max(0, excess - rawBytes));
  let { start, keptBytes, oversized } = selectTailWithinBudget(sizes, transcriptBudget);
  let sliced = payload.transcript.slice(start);
  let keptEntries =
    oversized.size === 0 ? sliced : sliced.filter((entry, index) => !oversized.has(start + index));
  let rawExcess = excess - (reduced - keptBytes);
  let rawTranscriptJsonl = payload.rawTranscriptJsonl;
  let rawTail = rawTranscriptJsonl === undefined ? "absent" : "untouched";
  if (rawExcess > 0 && rawTranscriptJsonl !== undefined) {
    let rawBudget = rawBytes - rawExcess;
    if (rawBudget <= 0) {
      rawTranscriptJsonl = undefined;
      rawTail = "omitted";
    } else {
      let lines = rawTranscriptJsonl.split(`
`);
      let sizes = lines.map((line) =>
        serializedRawBytes(
          line +
            `
`,
        ),
      );
      let { start, oversized } = selectTailWithinBudget(sizes, rawBudget);
      let sliced = lines.slice(start);
      let joined = (
        oversized.size === 0 ? sliced : sliced.filter((line, index) => !oversized.has(start + index))
      ).join(`
`);
      if (joined === "") {
        rawTranscriptJsonl = undefined;
        rawTail = "omitted";
      } else {
        rawTranscriptJsonl = joined;
        rawTail = "reduced";
      }
    }
  }
  let trimInfo = {
    keptMessageCount: keptEntries.length,
    totalMessageCount: payload.transcript.length,
    rawTail,
    rawTailKeptBytes: rawTranscriptJsonl === undefined ? 0 : Buffer.byteLength(rawTranscriptJsonl),
  };
  let trimNote = describeTranscriptTrim(trimInfo);
  if (trimNote === null)
    return {
      payload,
      trim: null,
    };
  let { rawTranscriptJsonl: rawTranscriptJsonl_2, ...rest } = payload;
  let nextPayload = {
    ...rest,
    message_count: keptEntries.length,
    description: `${payload.description}
${trimNote}`,
    transcript: keptEntries,
    ...(rawTranscriptJsonl !== undefined && {
      rawTranscriptJsonl,
    }),
  };
  let nextSize = feedbackPayloadPartCount(nextPayload);
  if (nextSize > MAX_PAYLOAD_PART_COUNT)
    logForDebugging(
      `fitFeedbackPayloadToBudget: still ${nextSize} bytes after trim (budget ${MAX_PAYLOAD_PART_COUNT})`,
      {
        level: "error",
      },
    );
  return {
    payload: nextPayload,
    trim: trimInfo,
  };
}
//@ chunk-20ssm8df.js:2173-2672 placement
/**
 * 生成反馈草稿的转录裁剪说明：保留了多少条消息、原始日志保留多少 KiB 或已省略；未裁剪返回 null。
 */
function describeTranscriptTrim(trim) {
  let lines = [];
  if (trim.keptMessageCount < trim.totalMessageCount)
    lines.push(
      `kept ${trim.keptMessageCount} of ${trim.totalMessageCount} transcript messages (newest kept first)`,
    );
  if (trim.rawTail === "reduced")
    lines.push(
      `kept ${Math.max(1, Math.round(trim.rawTailKeptBytes / 1024))} KiB of the raw session log (newest kept first)`,
    );
  else if (trim.rawTail === "omitted") lines.push("omitted the raw session log");
  if (lines.length === 0) return null;
  return `transcript_truncated: ${lines.join("; ")} (trimmed client-side to fit the upload size limit)`;
}
//@ chunk-20ssm8df.js:2672-3837 placement
/**
 * 把反馈草稿格式化为提交描述：标题、详情、来源说明（是否经完整审阅）以及 trigger、area、模型、版本、轮次、request_ids 等元数据行。
 */
function formatDraftDescription(draft, via = "panel") {
  let requestIds = recentEntries(draft.request_ids);
  let area = sanitizeArea(draft.area);
  let failureMode = asFailureMode(draft.failure_mode);
  let taskCategory = asTaskCategory(draft.task_category);
  let effort = sanitizeEffort(draft.effort);
  let thinkingType = asThinkingType(draft.thinking_type);
  let thinkingBudget = asTokenCount(draft.thinking_budget);
  let messageCount = asTokenCount(draft.message_count);
  let assistantTurnCount = asTokenCount(draft.assistant_turn_count);
  let subagentCount = asTokenCount(draft.subagent_count);
  return [
    `[${draft.type}] ${sanitizeTitle(draft.title)}`,
    "",
    sanitizeDetails(draft.details),
    "",
    "---",
    via === "card_send_as_is"
      ? "Drafted by Claude via the SendFeedback tool; approved by the user from the above-prompt card without full review."
      : "Drafted by Claude via the SendFeedback tool; reviewed and approved by the user before sending.",
    `trigger: ${draft.trigger}`,
    ...(area !== undefined ? [`area: ${area}`] : []),
    ...(failureMode !== undefined ? [`failure_mode: ${failureMode}`] : []),
    ...(taskCategory !== undefined ? [`task_category: ${taskCategory}`] : []),
    `draft_id: ${draft.draft_id}`,
    `drafted_at: ${draft.created_at}`,
    `source_session_id: ${draft.source_session_id}`,
    `model: ${sanitizeModel(draft.model)}`,
    `cli_version: ${sanitizeShortText(draft.cli_version, MAX_CLI_VERSION_LENGTH)}`,
    `os: ${sanitizeShortText(draft.os, MAX_OS_LENGTH)}`,
    ...(effort !== undefined ? [`effort: ${effort}`] : []),
    ...(thinkingType !== undefined
      ? [`thinking: ${thinkingType}${thinkingBudget !== undefined ? ` (budget ${thinkingBudget})` : ""}`]
      : []),
    ...(assistantTurnCount !== undefined
      ? [
          `turns: ${assistantTurnCount} assistant${messageCount !== undefined ? ` / ${messageCount} messages` : ""}${subagentCount !== undefined && subagentCount > 0 ? `, ${subagentCount} ${plural(subagentCount, "subagent")}` : ""}`,
        ]
      : []),
    ...(requestIds.length > 0 ? [`request_ids: ${requestIds.join(", ")}`] : []),
  ].join(`
`);
}
//@ chunk-20ssm8df.js:3837-4574 placement
/**
 * 解析草稿的 JSONL 转录，只保留主线（非 sidechain）的 user/assistant 消息并精简字段。
 */
function parseDraftTranscriptMessages(jsonl) {
  let messages = [];
  using size = slowLogging`parseDraftTranscriptMessages(${jsonl.length})`;
  for (let line of jsonl.split(`
`)) {
    if (!line) continue;
    let entry;
    try {
      entry = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    if (entry.type !== "user" && entry.type !== "assistant") continue;
    if (
      typeof entry.uuid !== "string" ||
      typeof entry.timestamp !== "string" ||
      entry.isSidechain === true ||
      !entry.message
    )
      continue;
    messages.push(
      entry.type === "user"
        ? {
            type: "user",
            uuid: entry.uuid,
            timestamp: entry.timestamp,
            message: entry.message,
            ...(entry.isMeta === true && {
              isMeta: true,
            }),
            ...(entry.toolUseResult !== undefined && {
              toolUseResult: entry.toolUseResult,
            }),
            ...(entry.isCompactSummary === true && {
              isCompactSummary: true,
            }),
            ...(entry.repeatsCompactSummary === true && {
              repeatsCompactSummary: true,
            }),
          }
        : {
            type: "assistant",
            uuid: entry.uuid,
            timestamp: entry.timestamp,
            message: entry.message,
            requestId: entry.requestId,
          },
    );
  }
  return messages;
}
//@ chunk-20ssm8df.js:4574-4668 placement
/**
 * 载荷过大时的错误文案。
 */
var PAYLOAD_TOO_LARGE_MESSAGE =
  "Feedback payload too large. Try again without the transcript, or shorten the details.";
//@ chunk-20ssm8df.js:4668-7828 placement
/**
 * 提交反馈草稿（可附会话记录），区分来源会话与界面。
 */
async function submitFeedbackDraft({
  draft,
  includeTranscript,
  currentSessionMessages,
  surface = "cli",
  via = "panel",
  signal,
  storageV5,
  credentials,
  host,
}) {
  let fromThisSession = draft.source_session_id === getSessionId();
  let transcript = [];
  let rawTranscriptJsonl;
  if (includeTranscript && draft.transcript_ref) {
    let draftTranscript = await resolveDraftTranscript(draft);
    if (fromThisSession) {
      transcript = normalizeMessagesForAPI(
        withholdForExport(currentSessionMessages, {
          host,
        }),
      );
      if (draftTranscript !== null)
        try {
          let { content, bytesRead, bytesTotal } = await tailFile(draftTranscript, MAX_RAW_TRANSCRIPT_BYTES);
          let rawText = content;
          if (bytesRead < bytesTotal)
            rawText = rawText.slice(
              rawText.indexOf(`
`) + 1,
            );
          if (containsProviderId(rawText))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else
            rawTranscriptJsonl = withholdTranscriptLine(redactTranscriptLines(rawText), {
              host,
            }).jsonl;
        } catch {}
    } else if (draftTranscript !== null)
      try {
        let { content, bytesRead, bytesTotal } = await tailFile(draftTranscript, MAX_RAW_TRANSCRIPT_BYTES);
        let rawText = content;
        if (bytesRead < bytesTotal)
          rawText = rawText.slice(
            rawText.indexOf(`
`) + 1,
          );
        if (!transcriptCorroboratesDraft(rawText, draft))
          logForDebugging("draft transcript withheld from feedback submit: identity_not_corroborated");
        else {
          let messages = parseDraftTranscriptMessages(rawText);
          if (anyMessageHasProviderId(messages))
            logForDebugging("draft transcript withheld from feedback submit: contains_3p_transcript_markers");
          else
            transcript = withholdForExport(messages, {
              host: undefined,
            });
          if (containsProviderId(rawText))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else
            rawTranscriptJsonl = withholdTranscriptLine(redactTranscriptLines(rawText), {
              host: undefined,
            }).jsonl;
        }
      } catch {}
  }
  let lastRequestId = recentEntries(draft.request_ids).at(-1) ?? null;
  let payload = {
    latestAssistantMessageId: lastRequestId,
    latestAssistantAPIMessageId: null,
    lastInterruptedAssistantAPIMessageId: null,
    message_count: transcript.length,
    datetime: new Date().toISOString(),
    description: formatDraftDescription(draft, via),
    surface,
    platform: env.platform,
    gitRepo: false,
    commitSha: null,
    version: draft.cli_version,
    transcript,
    ...(rawTranscriptJsonl && {
      rawTranscriptJsonl,
    }),
  };
  let { payload: payload_2, trim } = fitFeedbackPayloadToBudget(payload);
  let result = await submitFeedback(payload_2, signal, undefined, credentials);
  if (result.success) {
    try {
      await deleteFeedbackDraft(draft.draft_id, storageV5);
    } catch (error) {
      logForDebugging(
        `feedbackDrafts: post-submit draft delete failed: ${error instanceof Error ? error.name : "unknown"}`,
        {
          level: "error",
        },
      );
      logEvent("tengu_feedback_draft_delete_failed", {
        phase: lit("post_submit"),
      });
    }
    if (fromThisSession) decrementSessionDraftCount();
    if (via !== "card_send_as_is") dismissFeedbackNotice_2(draft.draft_id);
    logEvent("tengu_feedback_draft_submitted", {
      type: fromEnum(draft.type),
      trigger: fromEnum(draft.trigger),
      failure_mode: fromEnumOpt(draft.failure_mode),
      task_category: fromEnumOpt(draft.task_category),
      transcript_included:
        payload_2.transcript.length > 0 || payload_2.rawTranscriptJsonl ? lit("true") : lit("false"),
      transcript_trimmed: trim !== null ? lit("true") : lit("false"),
      transcript_requested: includeTranscript ? lit("true") : lit("false"),
      transcript_available: draft.transcriptAvailable ? lit("true") : lit("false"),
      from_this_session: fromThisSession ? lit("true") : lit("false"),
      feedback_id: sanitizeMarkName(result.feedbackId),
      last_request_id: sanitizeMarkName(lastRequestId),
    });
    logFeatureOk("feedback_draft_submit");
    return {
      success: true,
      feedbackId: result.feedbackId,
    };
  }
  let requestId = sanitizeMarkName(result.requestId);
  logFeatureBad("feedback_draft_submit", result.failureReason ?? "network_error", {
    from_this_session: fromThisSession ? lit("true") : lit("false"),
    ...(result.statusCode !== undefined && {
      http_status: result.statusCode,
    }),
    ...(requestId !== undefined && {
      requestId,
    }),
  });
  let refusal = orgRefusalError(result);
  if (refusal !== undefined)
    return {
      success: false,
      error: refusal,
      orgRefusalReason: orgFeedbackRefusalMessage(result),
    };
  if (result.failureReason === "auth_error")
    return {
      success: false,
      error:
        (!getAuthHeaders().error && feedbackUnavailableReason()) ||
        "Couldn't send feedback: not signed in. Run /login, then retry.",
    };
  if (result.payloadTooLarge)
    return {
      success: false,
      error: PAYLOAD_TOO_LARGE_MESSAGE,
      payloadTooLarge: true,
    };
  if (result.failureReason === "policy_blocked")
    return {
      success: false,
      error: checkProductFeedbackAllowed() ?? "Feedback is disabled by your organization's policy.",
    };
  let credentialMessage = credentialRefusalMessage(result);
  if (credentialMessage !== undefined)
    return {
      success: false,
      error: `${credentialMessage} The draft is still queued.`,
    };
  let statusSuffix =
    serverStatusSuffix(result) ??
    (result.failureReason === "timeout" ? " (request timed out)" : " (couldn't reach the service)");
  let retryHint = result.refusal?.kind === "other" ? "" : " Try again later.";
  return {
    success: false,
    error: `Couldn't send feedback${statusSuffix}. The draft is still queued.${retryHint}`,
  };
}
//@ chunk-20ssm8df.js:7828-8041 placement
/**
 * 丢弃反馈草稿：删除草稿、关闭提示、调整会话草稿计数并上报 tengu_feedback_draft_discarded。
 */
async function discardFeedbackDraft(draft, storageV5, storageV5_2) {
  let deleted = await deleteFeedbackDraft(draft.draft_id, storageV5_2);
  dismissFeedbackNotice_2(draft.draft_id);
  if (!deleted) return;
  if (draft.source_session_id === getSessionId()) decrementSessionDraftCount();
  logEvent("tengu_feedback_draft_discarded", {
    type: fromEnum(draft.type),
    trigger: fromEnum(draft.trigger),
    discarded_via: fromEnum(storageV5),
  });
}
export { submitFeedbackDraft, discardFeedbackDraft };
