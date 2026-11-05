/**
 * bridge/sessionInbox.ts
 *
 * 2.1.316 新增。从会话收件箱读取消息（/v1/code/sessions/:id/inbox/:file_id）并渲染内容信封。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kwawxaw.js (12)
 * attribution: placement 12
 */
import { stripCombiningRepeated } from "../utils/sanitization.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { validateBridgeId, toInfraSessionId } from "./sessionIdCompat.js";
import { logForDebugging } from "../utils/debug.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { buildAuthHeaders, getErrorReason } from "./githubPrSubscription.js";
import { errorMessage } from "../utils/errors.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { classifyElevatedAuthError } from "./codeSessionApi.js";
import { neutralizeConfusableTags } from "../utils/confusables.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { extractInboundAttachments } from "./inboundAttachments.js";

//@ chunk-1kwawxaw.js:669-802 placement
var INBOX_FILE_ID_PATTERN = /^file_[A-Za-z0-9_]{8,80}$/;
var MAX_INBOX_BODY_CHARS = 8000;
var MAX_INBOX_HEAD_CHARS = 16000;
var MAX_SENDER_LABEL_CHARS = 64;
var MAX_SLACK_PERMALINK_CHARS = 512;
var MAX_SENDER_KIND_CHARS = 40;
var SLACK_ARCHIVE_URL_PATTERN = /^https:\/\/([a-z0-9-]+\.)*slack\.com\/archives\/[\x21-\x7e]+$/;
//@ chunk-1kwawxaw.js:802-936 placement
function sanitizeInboxText(text, keepNewlines) {
  let stripped = stripCombiningRepeated(text);
  return keepNewlines
    ? stripped.replace(/(?![\n\t])[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")
    : stripped.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ").trim();
}
//@ chunk-1kwawxaw.js:936-1125 placement
function foldSenderDisplayBrackets(text) {
  return text
    .replace(/(?!\()\p{Ps}|</gu, "(")
    .replace(/(?!\))\p{Pe}|>/gu, ")")
    .replace(/[\p{Pi}\p{Pf}]/gu, "'")
    .replace(/(?![\p{Sc}\p{Extended_Pictographic}\p{ASCII}])\p{S}/gu, "");
}
//@ chunk-1kwawxaw.js:1125-1209 placement
function inboxSenderProvenanceCaption(provenance) {
  return provenance === "rc_owner" ? "your user \xB7 Remote Control" : "third-party";
}
//@ chunk-1kwawxaw.js:1209-3146 placement
/**
 * 从会话收件箱读取消息（/v1/code/sessions/:id/inbox/:file_id）并渲染内容信封。
 */
async function fetchSessionInboxMessage(options) {
  let { sessionId, fileId, baseUrl, getAccessToken, getTrustedDeviceToken } = options;
  if (!INBOX_FILE_ID_PATTERN.test(fileId)) {
    logFeatureBad("bridge_inbox_fetch", "malformed_id");
    return {
      ok: false,
      reason: "malformed",
      detail: "file_id must be a Files API id (file_\u2026)",
    };
  }
  try {
    validateBridgeId(sessionId, "session id");
  } catch {
    logFeatureBad("bridge_inbox_fetch", "malformed_session_id");
    return {
      ok: false,
      reason: "malformed",
      detail: "session id contains unsafe characters",
    };
  }
  let accessToken = getAccessToken();
  if (!accessToken) {
    logForDebugging("[bridge] No access token for inbox fetch");
    logFeatureBad("bridge_inbox_fetch", "no_token");
    return {
      ok: false,
      reason: "no_token",
    };
  }
  let url = `${baseUrl}/v1/code/sessions/${toInfraSessionId(sessionId)}/inbox/${fileId}`;
  let response;
  try {
    response = await axios_default.get(url, {
      headers: buildAuthHeaders(accessToken, {
        trustedDeviceToken: await getTrustedDeviceToken?.(),
      }),
      timeout: 1e4,
      maxContentLength: 262144,
      validateStatus: (status) => status < 500,
    });
  } catch (error) {
    logForDebugging(`[bridge] inbox fetch request failed: ${errorMessage(error)}`);
    logFeatureBad("bridge_inbox_fetch", "request_failed");
    return {
      ok: false,
      reason: "request_failed",
    };
  }
  if (response.status !== 200) {
    let errorReason = getErrorReason(response.data);
    let errorDetail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] inbox fetch failed ${response.status}${errorReason ? ` [${errorReason}]` : ""}${errorDetail ? `: ${errorDetail}` : ""}`,
    );
    let authError = response.status === 403 ? classifyElevatedAuthError(response.data) : undefined;
    let reason =
      response.status === 404
        ? "not_found"
        : authError === "untrusted_device"
          ? "untrusted_device"
          : authError === "session_stale_relogin"
            ? "relogin"
            : errorReason === "feature_disabled"
              ? "feature_disabled"
              : response.status === 403
                ? "forbidden"
                : "http_error";
    logFeatureBad("bridge_inbox_fetch", reason);
    return {
      ok: false,
      reason,
      detail: extractPlainErrorDetail(response.data),
    };
  }
  let inboxMessageEnvelope = parseInboxMessageEnvelope(response.data, sessionId, fileId);
  if (inboxMessageEnvelope === "wrong_session") {
    logForDebugging("[bridge] inbox fetch: the message names another session \u2014 refusing to relay it");
    logFeatureBad("bridge_inbox_fetch", "wrong_session");
    return {
      ok: false,
      reason: "wrong_session",
      detail: "that inbox message is not addressed to this session",
    };
  }
  if (!inboxMessageEnvelope) {
    logForDebugging(
      "[bridge] inbox fetch: 200 with an unusable body (missing message/body, a non-UUID message_id, or a file_id other than the one requested)",
    );
    logFeatureBad("bridge_inbox_fetch", "malformed_response");
    return {
      ok: false,
      reason: "malformed",
      detail: "unexpected response shape",
    };
  }
  logFeatureOk("bridge_inbox_fetch");
  return {
    ok: true,
    message: inboxMessageEnvelope.message,
    envelopedText: renderInboxContentEnvelope(inboxMessageEnvelope.message),
    download: {
      baseUrl,
      accessToken,
    },
  };
}
//@ chunk-1kwawxaw.js:3146-3834 placement
function renderInboxContentEnvelope(message, attachments) {
  let envelope = {
    message_id: message.messageId,
    source: message.source,
    sender_kind: message.senderKind,
    body: message.body,
  };
  if (message.senderDisplay) envelope.sender_display = message.senderDisplay;
  if (message.slackPermalink) envelope.slack_permalink = message.slackPermalink;
  if (message.createdAt) envelope.received_at = message.createdAt;
  if (attachments) envelope.attachments = attachments;
  let maxChars = MAX_INBOX_HEAD_CHARS;
  let openTag = `<event source="session-inbox" kind="message.content" from="${message.senderKind}" trust="relay" untrusted-keys="body,sender_display,slack_permalink,attachments">
`;
  let closeTag = `
</event>`;
  let body = neutralizeConfusableTags("event", JSON.stringify(envelope));
  if (openTag.length + body.length + closeTag.length > maxChars) {
    let bodyLimit = MAX_INBOX_BODY_CHARS;
    do {
      bodyLimit = Math.floor(bodyLimit / 2);
      envelope.body = truncateWithNote(message.bodyHead, bodyLimit, message.bodyDroppedAtIngest);
      body = neutralizeConfusableTags("event", JSON.stringify(envelope));
    } while (bodyLimit > 64 && openTag.length + body.length + closeTag.length > maxChars);
  }
  return `${openTag}${body}${closeTag}`;
}
//@ chunk-1kwawxaw.js:3834-3966 placement
function truncateWithNote(bodyHead, limit, bodyDroppedAtIngest = 0) {
  return bodyHead.length > limit
    ? `${truncateToLength(bodyHead, limit)} [\u2026truncated ${bodyHead.length - limit + bodyDroppedAtIngest} chars]`
    : bodyDroppedAtIngest > 0
      ? `${bodyHead} [\u2026truncated ${bodyDroppedAtIngest} chars]`
      : bodyHead;
}
//@ chunk-1kwawxaw.js:3966-5053 placement
/**
 * 校验并解析收件箱消息响应
 */
function parseInboxMessageEnvelope(data, sessionId, fileId) {
  if (!data || typeof data !== "object") return null;
  let message = data.message;
  if (!message || typeof message !== "object") return null;
  let raw = message;
  if (
    raw.file_id !== fileId ||
    typeof raw.message_id !== "string" ||
    normalizeUuidOrNull(raw.message_id) === null ||
    typeof raw.body !== "string"
  )
    return null;
  if (typeof raw.session_id !== "string" || raw.session_id === "") return null;
  let infraSessionId;
  try {
    validateBridgeId(raw.session_id, "session id");
    infraSessionId = toInfraSessionId(raw.session_id);
  } catch {
    return null;
  }
  if (infraSessionId !== toInfraSessionId(sessionId)) return "wrong_session";
  let messageId = raw.message_id.toLowerCase();
  let senderKind = inboxSenderKind(raw.sender_kind);
  let attachments =
    senderKind === "rc_owner"
      ? extractInboundAttachments({
          file_attachments: raw.attachments,
        })
      : [];
  let slack = raw.slack && typeof raw.slack === "object" ? raw.slack : undefined;
  let permalink =
    slack && typeof slack.permalink === "string" ? sanitizeInboxText(slack.permalink, false) : undefined;
  let createdAt = typeof raw.created_at === "string" ? raw.created_at : undefined;
  let senderDisplay =
    typeof raw.sender_display === "string"
      ? foldSenderDisplayBrackets(sanitizeInboxText(raw.sender_display, false))
      : "";
  let truncatedSenderDisplay =
    senderDisplay.length > MAX_SENDER_LABEL_CHARS
      ? `${truncateToLength(senderDisplay, MAX_SENDER_LABEL_CHARS)}\u2026`
      : senderDisplay;
  return {
    message: {
      messageId,
      senderKind,
      senderDisplay: truncatedSenderDisplay || undefined,
      ...(attachments.length > 0 && {
        attachments,
      }),
      source: normalizeEnumLabel(raw.source, "SESSION_INBOX_SOURCE_"),
      ...truncateInboxBody(sanitizeInboxText(raw.body, true)),
      slackPermalink:
        permalink &&
        permalink.length <= MAX_SLACK_PERMALINK_CHARS &&
        SLACK_ARCHIVE_URL_PATTERN.test(permalink)
          ? permalink
          : undefined,
      createdAt:
        createdAt &&
        createdAt.length <= MAX_SENDER_KIND_CHARS &&
        /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}:\d{2})$/.test(createdAt)
          ? createdAt
          : undefined,
    },
  };
}
//@ chunk-1kwawxaw.js:5053-5095 placement
var INBOX_SENDER_KINDS = ["slack_user", "account", "rc_owner"];
//@ chunk-1kwawxaw.js:5095-5186 placement
function inboxSenderKind(label) {
  let label_2 = normalizeEnumLabel(label, "SESSION_INBOX_SENDER_KIND_");
  return INBOX_SENDER_KINDS.find((kind) => kind === label_2) ?? "unknown";
}
//@ chunk-1kwawxaw.js:5186-5357 placement
/**
 * 去前缀的枚举值转小写标签
 */
function normalizeEnumLabel(label, prefix) {
  if (typeof label !== "string") return "";
  let stripped = label.startsWith(prefix) ? label.slice(prefix.length) : label;
  return /^[A-Za-z_]{1,32}$/.test(stripped) && !stripped.endsWith("UNSPECIFIED")
    ? stripped.toLowerCase()
    : "";
}
//@ chunk-1kwawxaw.js:5357-5549 placement
/**
 * 超长正文截断并标注丢弃字符数
 */
function truncateInboxBody(body) {
  if (body.length <= MAX_INBOX_BODY_CHARS)
    return {
      body,
      bodyHead: body,
      bodyDroppedAtIngest: 0,
    };
  let head = truncateToLength(body, MAX_INBOX_BODY_CHARS);
  let droppedCount = body.length - head.length;
  return {
    body: `${head} [\u2026truncated ${droppedCount} chars]`,
    bodyHead: head,
    bodyDroppedAtIngest: droppedCount,
  };
}
export {
  foldSenderDisplayBrackets,
  inboxSenderProvenanceCaption,
  INBOX_FILE_ID_PATTERN,
  renderInboxContentEnvelope,
  fetchSessionInboxMessage,
};
