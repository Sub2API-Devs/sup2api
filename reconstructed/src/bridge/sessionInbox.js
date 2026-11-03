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
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { buildAuthHeaders, getErrorReason } from "./githubPrSubscription.js";
import { errorMessage } from "../utils/errors.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { classifyElevatedAuthError } from "./codeSessionApi.js";
import { neutralizeConfusableTags } from "../utils/confusables.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { Vt } from "../utils/agentId.js";
import { extractInboundAttachments } from "./inboundAttachments.js";

//@ chunk-w12gsta7.js:637-770 placement
var INBOX_FILE_ID_PATTERN = /^file_[A-Za-z0-9_]{8,80}$/,
  I = 8000,
  S = 16000,
  y = 64,
  A = 512,
  E = 40,
  D = /^https:\/\/([a-z0-9-]+\.)*slack\.com\/archives\/[\x21-\x7e]+$/;
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
function inboxSenderProvenanceCaption(e) {
  return e === "rc_owner" ? "your user \xB7 Remote Control" : "third-party";
}
/**
 * 从会话收件箱读取消息（/v1/code/sessions/:id/inbox/:file_id）并渲染内容信封。
 */
//@ chunk-w12gsta7.js:1177-3114 placement
async function fetchSessionInboxMessage(e) {
  let {
    sessionId: sessionId,
    fileId: fileId,
    baseUrl: baseUrl,
    getAccessToken: getAccessToken,
    getTrustedDeviceToken: getTrustedDeviceToken,
  } = e;
  if (!INBOX_FILE_ID_PATTERN.test(fileId))
    return (
      logFeatureBad("bridge_inbox_fetch", "malformed_id"),
      { ok: !1, reason: "malformed", detail: "file_id must be a Files API id (file_\u2026)" }
    );
  try {
    validateBridgeId(sessionId, "session id");
  } catch {
    return (
      logFeatureBad("bridge_inbox_fetch", "malformed_session_id"),
      { ok: !1, reason: "malformed", detail: "session id contains unsafe characters" }
    );
  }
  let i = getAccessToken();
  if (!i)
    return (
      logForDebugging("[bridge] No access token for inbox fetch"),
      logFeatureBad("bridge_inbox_fetch", "no_token"),
      { ok: !1, reason: "no_token" }
    );
  let l = `${baseUrl}/v1/code/sessions/${toInfraSessionId(sessionId)}/inbox/${fileId}`,
    o;
  try {
    o = await Dt.get(l, {
      headers: buildAuthHeaders(i, { trustedDeviceToken: await getTrustedDeviceToken?.() }),
      timeout: 1e4,
      maxContentLength: 262144,
      validateStatus: (a) => a < 500,
    });
  } catch (error) {
    return (
      logForDebugging(`[bridge] inbox fetch request failed: ${errorMessage(error)}`),
      logFeatureBad("bridge_inbox_fetch", "request_failed"),
      { ok: !1, reason: "request_failed" }
    );
  }
  if (o.status !== 200) {
    let a = getErrorReason(o.data),
      f = extractErrorDetail(o.data);
    logForDebugging(`[bridge] inbox fetch failed ${o.status}${a ? ` [${a}]` : ""}${f ? `: ${f}` : ""}`);
    let _ = o.status === 403 ? classifyElevatedAuthError(o.data) : void 0,
      b =
        o.status === 404
          ? "not_found"
          : _ === "untrusted_device"
            ? "untrusted_device"
            : _ === "session_stale_relogin"
              ? "relogin"
              : a === "feature_disabled"
                ? "feature_disabled"
                : o.status === 403
                  ? "forbidden"
                  : "http_error";
    return (
      logFeatureBad("bridge_inbox_fetch", b),
      { ok: !1, reason: b, detail: extractPlainErrorDetail(o.data) }
    );
  }
  let u = parseInboxMessageEnvelope(o.data, sessionId, fileId);
  if (u === "wrong_session")
    return (
      logForDebugging("[bridge] inbox fetch: the message names another session \u2014 refusing to relay it"),
      logFeatureBad("bridge_inbox_fetch", "wrong_session"),
      { ok: !1, reason: "wrong_session", detail: "that inbox message is not addressed to this session" }
    );
  if (!u)
    return (
      logForDebugging(
        "[bridge] inbox fetch: 200 with an unusable body (missing message/body, a non-UUID message_id, or a file_id other than the one requested)",
      ),
      logFeatureBad("bridge_inbox_fetch", "malformed_response"),
      { ok: !1, reason: "malformed", detail: "unexpected response shape" }
    );
  return (
    logFeatureOk("bridge_inbox_fetch"),
    {
      ok: !0,
      message: u.message,
      envelopedText: renderInboxContentEnvelope(u.message),
      download: { baseUrl: baseUrl, accessToken: i },
    }
  );
}
//@ chunk-w12gsta7.js:3114-3802 placement
function renderInboxContentEnvelope(e, r) {
  let n = { message_id: e.messageId, source: e.source, sender_kind: e.senderKind, body: e.body };
  if (e.senderDisplay) n.sender_display = e.senderDisplay;
  if (e.slackPermalink) n.slack_permalink = e.slackPermalink;
  if (e.createdAt) n.received_at = e.createdAt;
  if (r) n.attachments = r;
  let p = S,
    c = `<event source="session-inbox" kind="message.content" from="${e.senderKind}" trust="relay" untrusted-keys="body,sender_display,slack_permalink,attachments">
`,
    s = `
</event>`,
    i = neutralizeConfusableTags("event", JSON.stringify(n));
  if (c.length + i.length + s.length > p) {
    let l = I;
    do
      ((l = Math.floor(l / 2)),
        (n.body = truncateWithNote(e.bodyHead, l, e.bodyDroppedAtIngest)),
        (i = neutralizeConfusableTags("event", JSON.stringify(n))));
    while (l > 64 && c.length + i.length + s.length > p);
  }
  return `${c}${i}${s}`;
}
//@ chunk-w12gsta7.js:3802-3935 placement
function truncateWithNote(e, r, n = 0) {
  return e.length > r
    ? `${truncateToLength(e, r)} [\u2026truncated ${e.length - r + n} chars]`
    : n > 0
      ? `${e} [\u2026truncated ${n} chars]`
      : e;
}
/**
 * 校验并解析收件箱消息响应
 */
//@ chunk-w12gsta7.js:3935-5023 placement
function parseInboxMessageEnvelope(e, r, n) {
  if (!e || typeof e !== "object") return null;
  let message = e.message;
  if (!message || typeof message !== "object") return null;
  let s = message;
  if (
    s.file_id !== n ||
    typeof s.message_id !== "string" ||
    Vt(s.message_id) === null ||
    typeof s.body !== "string"
  )
    return null;
  if (typeof s.session_id !== "string" || s.session_id === "") return null;
  let i;
  try {
    (validateBridgeId(s.session_id, "session id"), (i = toInfraSessionId(s.session_id)));
  } catch {
    return null;
  }
  if (i !== toInfraSessionId(r)) return "wrong_session";
  let lower = s.message_id.toLowerCase(),
    o = C(s.sender_kind),
    u = o === "rc_owner" ? extractInboundAttachments({ file_attachments: s.attachments }) : [],
    a = s.slack && typeof s.slack === "object" ? s.slack : void 0,
    f = a && typeof a.permalink === "string" ? sanitizeInboxText(a.permalink, !1) : void 0,
    _ = typeof s.created_at === "string" ? s.created_at : void 0,
    b =
      typeof s.sender_display === "string"
        ? foldSenderDisplayBrackets(sanitizeInboxText(s.sender_display, !1))
        : "",
    x = b.length > y ? `${truncateToLength(b, y)}\u2026` : b;
  return {
    message: {
      messageId: lower,
      senderKind: o,
      senderDisplay: x || void 0,
      ...(u.length > 0 && { attachments: u }),
      source: normalizeEnumLabel(s.source, "SESSION_INBOX_SOURCE_"),
      ...truncateInboxBody(sanitizeInboxText(s.body, !0)),
      slackPermalink: f && f.length <= A && D.test(f) ? f : void 0,
      createdAt: _ && _.length <= E && /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}:\d{2})$/.test(_) ? _ : void 0,
    },
  };
}
//@ chunk-w12gsta7.js:5023-5065 placement
var R = ["slack_user", "account", "rc_owner"];
//@ chunk-w12gsta7.js:5065-5156 placement
function C(e) {
  let r = normalizeEnumLabel(e, "SESSION_INBOX_SENDER_KIND_");
  return R.find((n) => n === r) ?? "unknown";
}
/**
 * 去前缀的枚举值转小写标签
 */
//@ chunk-w12gsta7.js:5156-5327 placement
function normalizeEnumLabel(e, r) {
  if (typeof e !== "string") return "";
  let n = e.startsWith(r) ? e.slice(r.length) : e;
  return /^[A-Za-z_]{1,32}$/.test(n) && !n.endsWith("UNSPECIFIED") ? n.toLowerCase() : "";
}
/**
 * 超长正文截断并标注丢弃字符数
 */
//@ chunk-w12gsta7.js:5327-5520 placement
function truncateInboxBody(e) {
  if (e.length <= I) return { body: e, bodyHead: e, bodyDroppedAtIngest: 0 };
  let r = truncateToLength(e, I),
    n = e.length - r.length;
  return { body: `${r} [\u2026truncated ${n} chars]`, bodyHead: r, bodyDroppedAtIngest: n };
}

export {
  INBOX_FILE_ID_PATTERN,
  foldSenderDisplayBrackets,
  inboxSenderProvenanceCaption,
  renderInboxContentEnvelope,
  fetchSessionInboxMessage,
};
