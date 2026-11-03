/**
 * bridge/sessionInbox.ts
 *
 * 2.1.316 新增。从会话收件箱读取消息（/v1/code/sessions/:id/inbox/:file_id）并渲染内容信封。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w12gsta7.js (12)
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

//@ chunk-w12gsta7.js:637-770 placement
var INBOX_FILE_ID_PATTERN = /^file_[A-Za-z0-9_]{8,80}$/;
var MAX_INBOX_BODY_CHARS = 8000;
var MAX_INBOX_HEAD_CHARS = 16000;
var MAX_SENDER_LABEL_CHARS = 64;
var MAX_SLACK_PERMALINK_CHARS = 512;
var MAX_SENDER_KIND_CHARS = 40;
var SLACK_ARCHIVE_URL_PATTERN = /^https:\/\/([a-z0-9-]+\.)*slack\.com\/archives\/[\x21-\x7e]+$/;
//@ chunk-w12gsta7.js:770-904 placement
function sanitizeInboxText(e, r) {
  let n = stripCombiningRepeated(e);
  return r
    ? n.replace(/(?![\n\t])[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")
    : n.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ").trim();
}
//@ chunk-w12gsta7.js:904-1093 placement
function foldSenderDisplayBrackets(e) {
  return e
    .replace(/(?!\()\p{Ps}|</gu, "(")
    .replace(/(?!\))\p{Pe}|>/gu, ")")
    .replace(/[\p{Pi}\p{Pf}]/gu, "'")
    .replace(/(?![\p{Sc}\p{Extended_Pictographic}\p{ASCII}])\p{S}/gu, "");
}
//@ chunk-w12gsta7.js:1093-1177 placement
function inboxSenderProvenanceCaption(senderKind) {
  return senderKind === "rc_owner" ? "your user \xB7 Remote Control" : "third-party";
}
//@ chunk-w12gsta7.js:1177-3114 placement
/**
 * 从会话收件箱读取消息（/v1/code/sessions/:id/inbox/:file_id）并渲染内容信封。
 */
async function fetchSessionInboxMessage(e) {
  let { sessionId, fileId, baseUrl, getAccessToken, getTrustedDeviceToken } = e;
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
  let l = `${baseUrl}/v1/code/sessions/${toInfraSessionId(sessionId)}/inbox/${fileId}`;
  let o;
  try {
    o = await axios_default.get(l, {
      headers: buildAuthHeaders(accessToken, {
        trustedDeviceToken: await getTrustedDeviceToken?.(),
      }),
      timeout: 1e4,
      maxContentLength: 262144,
      validateStatus: (a) => a < 500,
    });
  } catch (error) {
    logForDebugging(`[bridge] inbox fetch request failed: ${errorMessage(error)}`);
    logFeatureBad("bridge_inbox_fetch", "request_failed");
    return {
      ok: false,
      reason: "request_failed",
    };
  }
  if (o.status !== 200) {
    let errorReason = getErrorReason(o.data);
    let errorDetail = extractErrorDetail(o.data);
    logForDebugging(
      `[bridge] inbox fetch failed ${o.status}${errorReason ? ` [${errorReason}]` : ""}${errorDetail ? `: ${errorDetail}` : ""}`,
    );
    let _ = o.status === 403 ? classifyElevatedAuthError(o.data) : undefined;
    let b =
      o.status === 404
        ? "not_found"
        : _ === "untrusted_device"
          ? "untrusted_device"
          : _ === "session_stale_relogin"
            ? "relogin"
            : errorReason === "feature_disabled"
              ? "feature_disabled"
              : o.status === 403
                ? "forbidden"
                : "http_error";
    logFeatureBad("bridge_inbox_fetch", b);
    return {
      ok: false,
      reason: b,
      detail: extractPlainErrorDetail(o.data),
    };
  }
  let inboxMessageEnvelope = parseInboxMessageEnvelope(o.data, sessionId, fileId);
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
//@ chunk-w12gsta7.js:3114-3802 placement
function renderInboxContentEnvelope(message, r) {
  let n = {
    message_id: message.messageId,
    source: message.source,
    sender_kind: message.senderKind,
    body: message.body,
  };
  if (message.senderDisplay) n.sender_display = message.senderDisplay;
  if (message.slackPermalink) n.slack_permalink = message.slackPermalink;
  if (message.createdAt) n.received_at = message.createdAt;
  if (r) n.attachments = r;
  let p = MAX_INBOX_HEAD_CHARS;
  let c = `<event source="session-inbox" kind="message.content" from="${message.senderKind}" trust="relay" untrusted-keys="body,sender_display,slack_permalink,attachments">
`;
  let s = `
</event>`;
  let i = neutralizeConfusableTags("event", JSON.stringify(n));
  if (c.length + i.length + s.length > p) {
    let l = MAX_INBOX_BODY_CHARS;
    do {
      l = Math.floor(l / 2);
      n.body = truncateWithNote(message.bodyHead, l, message.bodyDroppedAtIngest);
      i = neutralizeConfusableTags("event", JSON.stringify(n));
    } while (l > 64 && c.length + i.length + s.length > p);
  }
  return `${c}${i}${s}`;
}
//@ chunk-w12gsta7.js:3802-3935 placement
function truncateWithNote(bodyHead, r, bodyDroppedAtIngest = 0) {
  return bodyHead.length > r
    ? `${truncateToLength(bodyHead, r)} [\u2026truncated ${bodyHead.length - r + bodyDroppedAtIngest} chars]`
    : bodyDroppedAtIngest > 0
      ? `${bodyHead} [\u2026truncated ${bodyDroppedAtIngest} chars]`
      : bodyHead;
}
//@ chunk-w12gsta7.js:3935-5023 placement
/**
 * 校验并解析收件箱消息响应
 */
function parseInboxMessageEnvelope(e, sessionId, fileId) {
  if (!e || typeof e !== "object") return null;
  let message = e.message;
  if (!message || typeof message !== "object") return null;
  let s = message;
  if (
    s.file_id !== fileId ||
    typeof s.message_id !== "string" ||
    normalizeUuidOrNull(s.message_id) === null ||
    typeof s.body !== "string"
  )
    return null;
  if (typeof s.session_id !== "string" || s.session_id === "") return null;
  let i;
  try {
    validateBridgeId(s.session_id, "session id");
    i = toInfraSessionId(s.session_id);
  } catch {
    return null;
  }
  if (i !== toInfraSessionId(sessionId)) return "wrong_session";
  let messageId = s.message_id.toLowerCase();
  let o = inboxSenderKind(s.sender_kind);
  let u =
    o === "rc_owner"
      ? extractInboundAttachments({
          file_attachments: s.attachments,
        })
      : [];
  let slack = s.slack && typeof s.slack === "object" ? s.slack : undefined;
  let f =
    slack && typeof slack.permalink === "string" ? sanitizeInboxText(slack.permalink, false) : undefined;
  let createdAt = typeof s.created_at === "string" ? s.created_at : undefined;
  let b =
    typeof s.sender_display === "string"
      ? foldSenderDisplayBrackets(sanitizeInboxText(s.sender_display, false))
      : "";
  let x = b.length > MAX_SENDER_LABEL_CHARS ? `${truncateToLength(b, MAX_SENDER_LABEL_CHARS)}\u2026` : b;
  return {
    message: {
      messageId,
      senderKind: o,
      senderDisplay: x || undefined,
      ...(u.length > 0 && {
        attachments: u,
      }),
      source: normalizeEnumLabel(s.source, "SESSION_INBOX_SOURCE_"),
      ...truncateInboxBody(sanitizeInboxText(s.body, true)),
      slackPermalink:
        f && f.length <= MAX_SLACK_PERMALINK_CHARS && SLACK_ARCHIVE_URL_PATTERN.test(f) ? f : undefined,
      createdAt:
        createdAt &&
        createdAt.length <= MAX_SENDER_KIND_CHARS &&
        /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}:\d{2})$/.test(createdAt)
          ? createdAt
          : undefined,
    },
  };
}
//@ chunk-w12gsta7.js:5023-5065 placement
var INBOX_SENDER_KINDS = ["slack_user", "account", "rc_owner"];
//@ chunk-w12gsta7.js:5065-5156 placement
function inboxSenderKind(senderKind) {
  let r = normalizeEnumLabel(senderKind, "SESSION_INBOX_SENDER_KIND_");
  return INBOX_SENDER_KINDS.find((n) => n === r) ?? "unknown";
}
//@ chunk-w12gsta7.js:5156-5327 placement
/**
 * 去前缀的枚举值转小写标签
 */
function normalizeEnumLabel(e, r) {
  if (typeof e !== "string") return "";
  let n = e.startsWith(r) ? e.slice(r.length) : e;
  return /^[A-Za-z_]{1,32}$/.test(n) && !n.endsWith("UNSPECIFIED") ? n.toLowerCase() : "";
}
//@ chunk-w12gsta7.js:5327-5520 placement
/**
 * 超长正文截断并标注丢弃字符数
 */
function truncateInboxBody(e) {
  if (e.length <= MAX_INBOX_BODY_CHARS)
    return {
      body: e,
      bodyHead: e,
      bodyDroppedAtIngest: 0,
    };
  let r = truncateToLength(e, MAX_INBOX_BODY_CHARS);
  let n = e.length - r.length;
  return {
    body: `${r} [\u2026truncated ${n} chars]`,
    bodyHead: r,
    bodyDroppedAtIngest: n,
  };
}
export {
  INBOX_FILE_ID_PATTERN,
  foldSenderDisplayBrackets,
  inboxSenderProvenanceCaption,
  renderInboxContentEnvelope,
  fetchSessionInboxMessage,
};
