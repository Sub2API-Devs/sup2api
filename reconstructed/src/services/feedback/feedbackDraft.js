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
  dDe,
  selectTailWithinBudget,
  BLt,
  orgRefusalError,
  orgFeedbackRefusalMessage,
  feedbackUnavailableReason,
  credentialRefusalMessage,
  serverStatusSuffix,
} from "./submitFeedback.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  recentEntries,
  yIr,
  HLs,
  NLs,
  _Ir,
  $Ls,
  Oye,
  _on,
  gIr,
  hIr,
  mLe,
  MAX_CLI_VERSION_LENGTH,
  MAX_OS_LENGTH,
  resolveDraftTranscript,
  transcriptCorroboratesDraft,
  deleteFeedbackDraft,
  decrementSessionDraftCount,
  dismissFeedbackNotice,
} from "./feedbackDrafts.js";
import { plural } from "../../utils/stringUtils.js";
import { getSessionId } from "../../bootstrap/state.js";
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { withholdForExport, withholdTranscriptLine } from "../../utils/transcriptWithholding.js";
import { tailFile } from "../../utils/fsOperations.js";
import { Uue, jbt } from "../api/providerIds.js";
import { redactTranscriptLines } from "../../utils/transcriptRequestBlobs.js";
import { env } from "../../utils/env.js";
import { submitFeedback } from "../../components/Feedback.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getAuthHeaders } from "../../utils/http.js";
import { checkProductFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";

//@ chunk-d16hc1ab.js:830-842 placement
var H = 65536;
//@ chunk-d16hc1ab.js:842-904 placement
function J(e) {
  return Buffer.byteLength(jsonStringifyRaw(jsonStringifyRaw(e)).slice(1, -1));
}
//@ chunk-d16hc1ab.js:904-986 placement
function q(e) {
  let sliced = jsonStringifyRaw(e).slice(1, -1);
  return Buffer.byteLength(jsonStringifyRaw(sliced).slice(1, -1));
}
/**
 * 反馈载荷超过大小预算时从最旧处裁剪转录消息与原始会话日志（保留最新，丢弃单条超大的），在描述后附加截断说明，返回 {payload, trim}。
 */
//@ chunk-d16hc1ab.js:986-2202 placement
function fitFeedbackPayloadToBudget(payload) {
  let size = feedbackPayloadPartCount(payload);
  if (size <= dDe) return { payload: payload, trim: null };
  using h = slowLogging`fitFeedbackPayloadToBudget(${size})`;
  let excess = size - (dDe - H),
    mapped = payload.transcript.map((o) => J(o) + 1),
    reduced = mapped.reduce((o, _) => o + _, 0),
    w = payload.rawTranscriptJsonl === void 0 ? 0 : q(payload.rawTranscriptJsonl),
    M = excess <= reduced ? reduced - excess : Math.max(0, reduced - Math.max(0, excess - w)),
    { start: start, keptBytes: keptBytes, oversized: oversized } = selectTailWithinBudget(mapped, M),
    sliced = payload.transcript.slice(start),
    D = oversized.size === 0 ? sliced : sliced.filter((o, _) => !oversized.has(start + _)),
    v = excess - (reduced - keptBytes),
    rawTranscriptJsonl = payload.rawTranscriptJsonl,
    R = rawTranscriptJsonl === void 0 ? "absent" : "untouched";
  if (v > 0 && rawTranscriptJsonl !== void 0) {
    let o = w - v;
    if (o <= 0) ((rawTranscriptJsonl = void 0), (R = "omitted"));
    else {
      let parts = rawTranscriptJsonl.split(`
`),
        mapped = parts.map((E) =>
          q(
            E +
              `
`,
          ),
        ),
        { start: start, oversized: oversized } = selectTailWithinBudget(mapped, o),
        sliced = parts.slice(start),
        joined = (oversized.size === 0 ? sliced : sliced.filter((E, x) => !oversized.has(start + x))).join(`
`);
      if (joined === "") ((rawTranscriptJsonl = void 0), (R = "omitted"));
      else ((rawTranscriptJsonl = joined), (R = "reduced"));
    }
  }
  let n = {
      keptMessageCount: D.length,
      totalMessageCount: payload.transcript.length,
      oversizedMessageCount: oversized.size,
      rawTail: R,
      rawTailKeptBytes: rawTranscriptJsonl === void 0 ? 0 : Buffer.byteLength(rawTranscriptJsonl),
    },
    F = describeTranscriptTrim(n);
  if (F === null) return { payload: payload, trim: null };
  let { rawTranscriptJsonl: rawTranscriptJsonl_2, ...A } = payload,
    I = {
      ...A,
      message_count: D.length,
      description: `${payload.description}
${F}`,
      transcript: D,
      ...(rawTranscriptJsonl !== void 0 && { rawTranscriptJsonl: rawTranscriptJsonl }),
    },
    P = feedbackPayloadPartCount(I);
  if (P > dDe)
    logForDebugging(`fitFeedbackPayloadToBudget: still ${P} bytes after trim (budget ${dDe})`, {
      level: "error",
    });
  return { payload: I, trim: n };
}
/**
 * 生成反馈草稿的转录裁剪说明：保留了多少条消息、原始日志保留多少 KiB 或已省略；未裁剪返回 null。
 */
//@ chunk-d16hc1ab.js:2202-2701 placement
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
/**
 * 把反馈草稿格式化为提交描述：标题、详情、来源说明（是否经完整审阅）以及 trigger、area、模型、版本、轮次、request_ids 等元数据行。
 */
//@ chunk-d16hc1ab.js:2701-3866 placement
function formatDraftDescription(draft, via = "panel") {
  let h = recentEntries(draft.request_ids),
    d = yIr(draft.area),
    s = HLs(draft.failure_mode),
    y = NLs(draft.task_category),
    w = _Ir(draft.effort),
    M = $Ls(draft.thinking_type),
    T = Oye(draft.thinking_budget),
    k = Oye(draft.message_count),
    p = Oye(draft.assistant_turn_count),
    f = Oye(draft.subagent_count);
  return [
    `[${draft.type}] ${_on(draft.title)}`,
    "",
    gIr(draft.details),
    "",
    "---",
    via === "card_send_as_is"
      ? "Drafted by Claude via the SendFeedback tool; approved by the user from the above-prompt card without full review."
      : "Drafted by Claude via the SendFeedback tool; reviewed and approved by the user before sending.",
    `trigger: ${draft.trigger}`,
    ...(d !== void 0 ? [`area: ${d}`] : []),
    ...(s !== void 0 ? [`failure_mode: ${s}`] : []),
    ...(y !== void 0 ? [`task_category: ${y}`] : []),
    `draft_id: ${draft.draft_id}`,
    `drafted_at: ${draft.created_at}`,
    `source_session_id: ${draft.source_session_id}`,
    `model: ${hIr(draft.model)}`,
    `cli_version: ${mLe(draft.cli_version, MAX_CLI_VERSION_LENGTH)}`,
    `os: ${mLe(draft.os, MAX_OS_LENGTH)}`,
    ...(w !== void 0 ? [`effort: ${w}`] : []),
    ...(M !== void 0 ? [`thinking: ${M}${T !== void 0 ? ` (budget ${T})` : ""}`] : []),
    ...(p !== void 0
      ? [
          `turns: ${p} assistant${k !== void 0 ? ` / ${k} messages` : ""}${f !== void 0 && f > 0 ? `, ${f} ${plural(f, "subagent")}` : ""}`,
        ]
      : []),
    ...(h.length > 0 ? [`request_ids: ${h.join(", ")}`] : []),
  ].join(`
`);
}
/**
 * 解析草稿的 JSONL 转录，只保留主线（非 sidechain）的 user/assistant 消息并精简字段。
 */
//@ chunk-d16hc1ab.js:3866-4603 placement
function parseDraftTranscriptMessages(e) {
  let r = [];
  using h = slowLogging`parseDraftTranscriptMessages(${e.length})`;
  for (let d of e.split(`
`)) {
    if (!d) continue;
    let s;
    try {
      s = jsonParseRaw(d);
    } catch {
      continue;
    }
    if (typeof s !== "object" || s === null) continue;
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (typeof s.uuid !== "string" || typeof s.timestamp !== "string" || s.isSidechain === !0 || !s.message)
      continue;
    r.push(
      s.type === "user"
        ? {
            type: "user",
            uuid: s.uuid,
            timestamp: s.timestamp,
            message: s.message,
            ...(s.isMeta === !0 && { isMeta: !0 }),
            ...(s.toolUseResult !== void 0 && { toolUseResult: s.toolUseResult }),
            ...(s.isCompactSummary === !0 && { isCompactSummary: !0 }),
            ...(s.repeatsCompactSummary === !0 && { repeatsCompactSummary: !0 }),
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
var N = "Feedback payload too large. Try again without the transcript, or shorten the details.";
/**
 * 提交反馈草稿（可附会话记录），区分来源会话与界面。
 */
//@ chunk-d16hc1ab.js:4697-7857 placement
async function submitFeedbackDraft({
  draft: draft,
  includeTranscript: includeTranscript,
  currentSessionMessages: currentSessionMessages,
  surface: surface = "cli",
  via: via = "panel",
  signal: signal,
  storageV5: storageV5,
  credentials: credentials,
  host: host,
}) {
  let k = draft.source_session_id === getSessionId(),
    p = [],
    f;
  if (includeTranscript && draft.transcript_ref) {
    let o = await resolveDraftTranscript(draft);
    if (k) {
      if (
        ((p = normalizeMessagesForAPI(withholdForExport(currentSessionMessages, { host: host }))), o !== null)
      )
        try {
          let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(o, BLt),
            u = content;
          if (bytesRead < bytesTotal)
            u = u.slice(
              u.indexOf(`
`) + 1,
            );
          if (Uue(u))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else f = withholdTranscriptLine(redactTranscriptLines(u), { host: host }).jsonl;
        } catch {}
    } else if (o !== null)
      try {
        let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(o, BLt),
          u = content;
        if (bytesRead < bytesTotal)
          u = u.slice(
            u.indexOf(`
`) + 1,
          );
        if (!transcriptCorroboratesDraft(u, draft))
          logForDebugging("draft transcript withheld from feedback submit: identity_not_corroborated");
        else {
          let B = parseDraftTranscriptMessages(u);
          if (jbt(B))
            logForDebugging("draft transcript withheld from feedback submit: contains_3p_transcript_markers");
          else p = withholdForExport(B, { host: void 0 });
          if (Uue(u))
            logForDebugging(
              "rawTranscriptJsonl withheld from feedback draft submit: contains_3p_transcript_markers",
            );
          else f = withholdTranscriptLine(redactTranscriptLines(u), { host: void 0 }).jsonl;
        }
      } catch {}
  }
  let D = recentEntries(draft.request_ids).at(-1) ?? null,
    v = {
      latestAssistantMessageId: D,
      latestAssistantAPIMessageId: null,
      lastInterruptedAssistantAPIMessageId: null,
      message_count: p.length,
      datetime: new Date().toISOString(),
      description: formatDraftDescription(draft, via),
      surface: surface,
      platform: env.platform,
      gitRepo: !1,
      commitSha: null,
      version: draft.cli_version,
      transcript: p,
      ...(f && { rawTranscriptJsonl: f }),
    },
    { payload: payload, trim: trim } = fitFeedbackPayloadToBudget(v),
    n = await submitFeedback(payload, signal, void 0, credentials);
  if (n.success) {
    try {
      await deleteFeedbackDraft(draft.draft_id, storageV5);
    } catch (error) {
      (logForDebugging(
        `feedbackDrafts: post-submit draft delete failed: ${error instanceof Error ? error.name : "unknown"}`,
        { level: "error" },
      ),
        logEvent("tengu_feedback_draft_delete_failed", { phase: lit("post_submit") }));
    }
    if (k) decrementSessionDraftCount();
    if (via !== "card_send_as_is") dismissFeedbackNotice(draft.draft_id);
    return (
      logEvent("tengu_feedback_draft_submitted", {
        type: fromEnum(draft.type),
        trigger: fromEnum(draft.trigger),
        failure_mode: fromEnumOpt(draft.failure_mode),
        task_category: fromEnumOpt(draft.task_category),
        transcript_included:
          payload.transcript.length > 0 || payload.rawTranscriptJsonl ? lit("true") : lit("false"),
        transcript_trimmed: trim !== null ? lit("true") : lit("false"),
        transcript_requested: includeTranscript ? lit("true") : lit("false"),
        transcript_available: draft.transcriptAvailable ? lit("true") : lit("false"),
        from_this_session: k ? lit("true") : lit("false"),
        feedback_id: ye(n.feedbackId),
        last_request_id: ye(D),
      }),
      logFeatureOk("feedback_draft_submit"),
      { success: !0, feedbackId: n.feedbackId }
    );
  }
  let F = ye(n.requestId);
  logFeatureBad("feedback_draft_submit", n.failureReason ?? "network_error", {
    from_this_session: k ? lit("true") : lit("false"),
    ...(n.statusCode !== void 0 && { http_status: n.statusCode }),
    ...(F !== void 0 && { requestId: F }),
  });
  let z = orgRefusalError(n);
  if (z !== void 0) return { success: !1, error: z, orgRefusalReason: orgFeedbackRefusalMessage(n) };
  if (n.failureReason === "auth_error")
    return {
      success: !1,
      error:
        (!getAuthHeaders().error && feedbackUnavailableReason()) ||
        "Couldn't send feedback: not signed in. Run /login, then retry.",
    };
  if (n.payloadTooLarge) return { success: !1, error: N, payloadTooLarge: !0 };
  if (n.failureReason === "policy_blocked")
    return {
      success: !1,
      error: checkProductFeedbackAllowed() ?? "Feedback is disabled by your organization's policy.",
    };
  let A = credentialRefusalMessage(n);
  if (A !== void 0) return { success: !1, error: `${A} The draft is still queued.` };
  let I =
      serverStatusSuffix(n) ??
      (n.failureReason === "timeout" ? " (request timed out)" : " (couldn't reach the service)"),
    P = n.refusal?.kind === "other" ? "" : " Try again later.";
  return { success: !1, error: `Couldn't send feedback${I}. The draft is still queued.${P}` };
}
/**
 * 丢弃反馈草稿：删除草稿、关闭提示、调整会话草稿计数并上报 tengu_feedback_draft_discarded。
 */
//@ chunk-d16hc1ab.js:7857-8070 placement
async function discardFeedbackDraft(e, r, h) {
  let d = await deleteFeedbackDraft(e.draft_id, h);
  if ((dismissFeedbackNotice(e.draft_id), !d)) return;
  if (e.source_session_id === getSessionId()) decrementSessionDraftCount();
  logEvent("tengu_feedback_draft_discarded", {
    type: fromEnum(e.type),
    trigger: fromEnum(e.trigger),
    discarded_via: fromEnum(r),
  });
}

export { submitFeedbackDraft, discardFeedbackDraft };
