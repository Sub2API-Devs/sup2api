/**
 * services/feedback/feedbackDraft.ts
 *
 * 2.1.316 新增：反馈草稿
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d16hc1ab.js (10)
 * attribution: placement 10
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

//@ chunk-d16hc1ab.js:830-842 placement
/**
 * 计算反馈载荷大小时给转录留的余量（64 KiB）。
 */
var TRANSCRIPT_SIZE_SLACK_BYTES = 65536;
//@ chunk-d16hc1ab.js:842-904 placement
/**
 * 计算单条转录消息序列化后的字节数。
 */
function serializedEntryBytes(e) {
  return Buffer.byteLength(jsonStringifyRaw(jsonStringifyRaw(e)).slice(1, -1));
}
//@ chunk-d16hc1ab.js:904-986 placement
/**
 * 计算整个原始转录文本序列化后的字节数。
 */
function serializedRawBytes(rawTranscriptJsonl) {
  let sliced = jsonStringifyRaw(rawTranscriptJsonl).slice(1, -1);
  return Buffer.byteLength(jsonStringifyRaw(sliced).slice(1, -1));
}
//@ chunk-d16hc1ab.js:986-2202 placement
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
  using h = slowLogging`fitFeedbackPayloadToBudget(${size})`;
  let excess = size - (MAX_PAYLOAD_PART_COUNT - TRANSCRIPT_SIZE_SLACK_BYTES);
  let mapped = payload.transcript.map((o) => serializedEntryBytes(o) + 1);
  let reduced = mapped.reduce((acc, _) => acc + _, 0);
  let w = payload.rawTranscriptJsonl === undefined ? 0 : serializedRawBytes(payload.rawTranscriptJsonl);
  let M = excess <= reduced ? reduced - excess : Math.max(0, reduced - Math.max(0, excess - w));
  let { start, keptBytes, oversized } = selectTailWithinBudget(mapped, M);
  let sliced = payload.transcript.slice(start);
  let D = oversized.size === 0 ? sliced : sliced.filter((o, _) => !oversized.has(start + _));
  let v = excess - (reduced - keptBytes);
  let rawTranscriptJsonl = payload.rawTranscriptJsonl;
  let R = rawTranscriptJsonl === undefined ? "absent" : "untouched";
  if (v > 0 && rawTranscriptJsonl !== undefined) {
    let o = w - v;
    if (o <= 0) {
      rawTranscriptJsonl = undefined;
      R = "omitted";
    } else {
      let lines = rawTranscriptJsonl.split(`
`);
      let mapped = lines.map((line) =>
        serializedRawBytes(
          line +
            `
`,
        ),
      );
      let { start, oversized } = selectTailWithinBudget(mapped, o);
      let sliced = lines.slice(start);
      let joined = (oversized.size === 0 ? sliced : sliced.filter((E, x) => !oversized.has(start + x))).join(`
`);
      if (joined === "") {
        rawTranscriptJsonl = undefined;
        R = "omitted";
      } else {
        rawTranscriptJsonl = joined;
        R = "reduced";
      }
    }
  }
  let n = {
    keptMessageCount: D.length,
    totalMessageCount: payload.transcript.length,
    oversizedMessageCount: oversized.size,
    rawTail: R,
    rawTailKeptBytes: rawTranscriptJsonl === undefined ? 0 : Buffer.byteLength(rawTranscriptJsonl),
  };
  let F = describeTranscriptTrim(n);
  if (F === null)
    return {
      payload,
      trim: null,
    };
  let { rawTranscriptJsonl: rawTranscriptJsonl_2, ...A } = payload;
  let I = {
    ...A,
    message_count: D.length,
    description: `${payload.description}
${F}`,
    transcript: D,
    ...(rawTranscriptJsonl !== undefined && {
      rawTranscriptJsonl,
    }),
  };
  let P = feedbackPayloadPartCount(I);
  if (P > MAX_PAYLOAD_PART_COUNT)
    logForDebugging(
      `fitFeedbackPayloadToBudget: still ${P} bytes after trim (budget ${MAX_PAYLOAD_PART_COUNT})`,
      {
        level: "error",
      },
    );
  return {
    payload: I,
    trim: n,
  };
}
//@ chunk-d16hc1ab.js:2202-2701 placement
/**
 * 生成反馈草稿的转录裁剪说明：保留了多少条消息、原始日志保留多少 KiB 或已省略；未裁剪返回 null。
 */
function describeTranscriptTrim(e) {
  let r = [];
  if (e.keptMessageCount < e.totalMessageCount)
    r.push(`kept ${e.keptMessageCount} of ${e.totalMessageCount} transcript messages (newest kept first)`);
  if (e.rawTail === "reduced")
    r.push(
      `kept ${Math.max(1, Math.round(e.rawTailKeptBytes / 1024))} KiB of the raw session log (newest kept first)`,
    );
  else if (e.rawTail === "omitted") r.push("omitted the raw session log");
  if (r.length === 0) return null;
  return `transcript_truncated: ${r.join("; ")} (trimmed client-side to fit the upload size limit)`;
}
//@ chunk-d16hc1ab.js:2701-3866 placement
/**
 * 把反馈草稿格式化为提交描述：标题、详情、来源说明（是否经完整审阅）以及 trigger、area、模型、版本、轮次、request_ids 等元数据行。
 */
function formatDraftDescription(draft, via = "panel") {
  let h = recentEntries(draft.request_ids);
  let d = sanitizeArea(draft.area);
  let s = asFailureMode(draft.failure_mode);
  let y = asTaskCategory(draft.task_category);
  let w = sanitizeEffort(draft.effort);
  let M = asThinkingType(draft.thinking_type);
  let T = asTokenCount(draft.thinking_budget);
  let k = asTokenCount(draft.message_count);
  let p = asTokenCount(draft.assistant_turn_count);
  let f = asTokenCount(draft.subagent_count);
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
    ...(d !== undefined ? [`area: ${d}`] : []),
    ...(s !== undefined ? [`failure_mode: ${s}`] : []),
    ...(y !== undefined ? [`task_category: ${y}`] : []),
    `draft_id: ${draft.draft_id}`,
    `drafted_at: ${draft.created_at}`,
    `source_session_id: ${draft.source_session_id}`,
    `model: ${sanitizeModel(draft.model)}`,
    `cli_version: ${sanitizeShortText(draft.cli_version, MAX_CLI_VERSION_LENGTH)}`,
    `os: ${sanitizeShortText(draft.os, MAX_OS_LENGTH)}`,
    ...(w !== undefined ? [`effort: ${w}`] : []),
    ...(M !== undefined ? [`thinking: ${M}${T !== undefined ? ` (budget ${T})` : ""}`] : []),
    ...(p !== undefined
      ? [
          `turns: ${p} assistant${k !== undefined ? ` / ${k} messages` : ""}${f !== undefined && f > 0 ? `, ${f} ${plural(f, "subagent")}` : ""}`,
        ]
      : []),
    ...(h.length > 0 ? [`request_ids: ${h.join(", ")}`] : []),
  ].join(`
`);
}
//@ chunk-d16hc1ab.js:3866-4603 placement
/**
 * 解析草稿的 JSONL 转录，只保留主线（非 sidechain）的 user/assistant 消息并精简字段。
 */
function parseDraftTranscriptMessages(e) {
  let r = [];
  using h = slowLogging`parseDraftTranscriptMessages(${e.length})`;
  for (let line of e.split(`
`)) {
    if (!line) continue;
    let s;
    try {
      s = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (typeof s !== "object" || s === null) continue;
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (typeof s.uuid !== "string" || typeof s.timestamp !== "string" || s.isSidechain === true || !s.message)
      continue;
    r.push(
      s.type === "user"
        ? {
            type: "user",
            uuid: s.uuid,
            timestamp: s.timestamp,
            message: s.message,
            ...(s.isMeta === true && {
              isMeta: true,
            }),
            ...(s.toolUseResult !== undefined && {
              toolUseResult: s.toolUseResult,
            }),
            ...(s.isCompactSummary === true && {
              isCompactSummary: true,
            }),
            ...(s.repeatsCompactSummary === true && {
              repeatsCompactSummary: true,
            }),
          }
        : {
            type: "assistant",
            uuid: s.uuid,
            timestamp: s.timestamp,
            message: s.message,
            requestId: s.requestId,
          },
    );
  }
  return r;
}
//@ chunk-d16hc1ab.js:4603-4697 placement
/**
 * 载荷过大时的错误文案。
 */
var PAYLOAD_TOO_LARGE_MESSAGE =
  "Feedback payload too large. Try again without the transcript, or shorten the details.";
//@ chunk-d16hc1ab.js:4697-7857 placement
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
  let k = draft.source_session_id === getSessionId();
  let p = [];
  let f;
  if (includeTranscript && draft.transcript_ref) {
    let draftTranscript = await resolveDraftTranscript(draft);
    if (k) {
      p = normalizeMessagesForAPI(
        withholdForExport(currentSessionMessages, {
          host,
        }),
      );
      if (draftTranscript !== null)
        try {
          let { content, bytesRead, bytesTotal } = await tailFile(draftTranscript, MAX_RAW_TRANSCRIPT_BYTES);
          let u = content;
          if (bytesRead < bytesTotal)
            u = u.slice(
              u.indexOf(`
`) + 1,
            );
          if (containsProviderId(u))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else
            f = withholdTranscriptLine(redactTranscriptLines(u), {
              host,
            }).jsonl;
        } catch {}
    } else if (draftTranscript !== null)
      try {
        let { content, bytesRead, bytesTotal } = await tailFile(draftTranscript, MAX_RAW_TRANSCRIPT_BYTES);
        let u = content;
        if (bytesRead < bytesTotal)
          u = u.slice(
            u.indexOf(`
`) + 1,
          );
        if (!transcriptCorroboratesDraft(u, draft))
          logForDebugging("draft transcript withheld from feedback submit: identity_not_corroborated");
        else {
          let draftTranscriptMessages = parseDraftTranscriptMessages(u);
          if (anyMessageHasProviderId(draftTranscriptMessages))
            logForDebugging("draft transcript withheld from feedback submit: contains_3p_transcript_markers");
          else
            p = withholdForExport(draftTranscriptMessages, {
              host: undefined,
            });
          if (containsProviderId(u))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else
            f = withholdTranscriptLine(redactTranscriptLines(u), {
              host: undefined,
            }).jsonl;
        }
      } catch {}
  }
  let D = recentEntries(draft.request_ids).at(-1) ?? null;
  let payload = {
    latestAssistantMessageId: D,
    latestAssistantAPIMessageId: null,
    lastInterruptedAssistantAPIMessageId: null,
    message_count: p.length,
    datetime: new Date().toISOString(),
    description: formatDraftDescription(draft, via),
    surface,
    platform: env.platform,
    gitRepo: false,
    commitSha: null,
    version: draft.cli_version,
    transcript: p,
    ...(f && {
      rawTranscriptJsonl: f,
    }),
  };
  let { payload: payload_2, trim } = fitFeedbackPayloadToBudget(payload);
  let n = await submitFeedback(payload_2, signal, undefined, credentials);
  if (n.success) {
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
    if (k) decrementSessionDraftCount();
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
      from_this_session: k ? lit("true") : lit("false"),
      feedback_id: sanitizeMarkName(n.feedbackId),
      last_request_id: sanitizeMarkName(D),
    });
    logFeatureOk("feedback_draft_submit");
    return {
      success: true,
      feedbackId: n.feedbackId,
    };
  }
  let F = sanitizeMarkName(n.requestId);
  logFeatureBad("feedback_draft_submit", n.failureReason ?? "network_error", {
    from_this_session: k ? lit("true") : lit("false"),
    ...(n.statusCode !== undefined && {
      http_status: n.statusCode,
    }),
    ...(F !== undefined && {
      requestId: F,
    }),
  });
  let z = orgRefusalError(n);
  if (z !== undefined)
    return {
      success: false,
      error: z,
      orgRefusalReason: orgFeedbackRefusalMessage(n),
    };
  if (n.failureReason === "auth_error")
    return {
      success: false,
      error:
        (!getAuthHeaders().error && feedbackUnavailableReason()) ||
        "Couldn't send feedback: not signed in. Run /login, then retry.",
    };
  if (n.payloadTooLarge)
    return {
      success: false,
      error: PAYLOAD_TOO_LARGE_MESSAGE,
      payloadTooLarge: true,
    };
  if (n.failureReason === "policy_blocked")
    return {
      success: false,
      error: checkProductFeedbackAllowed() ?? "Feedback is disabled by your organization's policy.",
    };
  let A = credentialRefusalMessage(n);
  if (A !== undefined)
    return {
      success: false,
      error: `${A} The draft is still queued.`,
    };
  let I =
    serverStatusSuffix(n) ??
    (n.failureReason === "timeout" ? " (request timed out)" : " (couldn't reach the service)");
  let P = n.refusal?.kind === "other" ? "" : " Try again later.";
  return {
    success: false,
    error: `Couldn't send feedback${I}. The draft is still queued.${P}`,
  };
}
//@ chunk-d16hc1ab.js:7857-8070 placement
/**
 * 丢弃反馈草稿：删除草稿、关闭提示、调整会话草稿计数并上报 tengu_feedback_draft_discarded。
 */
async function discardFeedbackDraft(e, r, storageV5) {
  let d = await deleteFeedbackDraft(e.draft_id, storageV5);
  dismissFeedbackNotice_2(e.draft_id);
  if (!d) return;
  if (e.source_session_id === getSessionId()) decrementSessionDraftCount();
  logEvent("tengu_feedback_draft_discarded", {
    type: fromEnum(e.type),
    trigger: fromEnum(e.trigger),
    discarded_via: fromEnum(r),
  });
}
export { submitFeedbackDraft, discardFeedbackDraft };
