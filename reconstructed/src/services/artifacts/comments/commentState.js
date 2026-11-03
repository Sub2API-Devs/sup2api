/**
 * services/artifacts/comments/commentState.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (12)
 * attribution: placement 12
 */
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { extractMentions } from "./commentMentions.js";

//@ chunk-b0a246e7.js:3569-3580 placement
var MAX_TRACKED_REPLY_IDS = 256;
/**
 * 记录由本会话发出的 Artifact 评论回复 ID（有上限）。
 */
//@ chunk-b0a246e7.js:3580-3701 placement
function rememberPostedReplyId(replyId) {
  let postedReplyIds = getLiveState().postedReplyIds;
  if ((postedReplyIds.add(replyId), postedReplyIds.size > MAX_TRACKED_REPLY_IDS)) {
    let n = postedReplyIds.values().next().value;
    if (n !== void 0) postedReplyIds.delete(n);
  }
}
/**
 * 是否是本会话发出的评论回复。
 */
//@ chunk-b0a246e7.js:3701-3759 placement
function isOwnPostedReply(replyId) {
  return replyId !== "" && getLiveState().postedReplyIds.has(replyId);
}
/**
 * 把本会话发出的回复标为"干净"（未被改写）。
 */
//@ chunk-b0a246e7.js:3759-3898 placement
function markReplyClean(replyId) {
  if (!isOwnPostedReply(replyId)) return;
  let cleanReplyIds = getLiveState().cleanReplyIds;
  if ((cleanReplyIds.add(replyId), cleanReplyIds.size > MAX_TRACKED_REPLY_IDS)) {
    let n = cleanReplyIds.values().next().value;
    if (n !== void 0) cleanReplyIds.delete(n);
  }
}
/**
 * 本会话是否发过 Artifact 评论回复。
 */
//@ chunk-b0a246e7.js:3898-3947 placement
function hasPostedReplies() {
  return getLiveState().postedReplyIds.size > 0;
}
/**
 * 只接受 owner / editor / commenter 三种访问级别。
 */
//@ chunk-b0a246e7.js:3947-4022 placement
function normalizeCommentAccess(role) {
  return role === "owner" || role === "editor" || role === "commenter" ? role : void 0;
}
/**
 * 评论作者类别：degraded → unknown，无角色 → human，有角色 → agent。
 */
//@ chunk-b0a246e7.js:4022-4128 placement
function getCommentAuthorKind(comment) {
  if (comment.role === "degraded") return "unknown";
  return comment.role === void 0 || comment.role === "" ? "human" : "agent";
}
/**
 * 评论是否可信：代理评论须是本会话发出的干净回复，人类评论须来自指定账户且提及的账户也都匹配。
 */
//@ chunk-b0a246e7.js:4128-4305 placement
function isTrustedComment(comment, account) {
  let n = getCommentAuthorKind(comment);
  return (
    (n === "agent"
      ? isOwnPostedReply(comment.id) && getLiveState().cleanReplyIds.has(comment.id)
      : n === "human" && comment.postedByArtifact !== !0 && isOwnPrincipal(comment.account, account)) &&
    extractMentions(comment.text).every((r) => isOwnPrincipal(r, account))
  );
}
/**
 * 解析 ISO 时间字符串为毫秒，失败返回 null。
 */
//@ chunk-b0a246e7.js:4305-4399 placement
function parseTimestamp(value) {
  if (value === void 0) return null;
  let parse = Date.parse(value);
  return Number.isFinite(parse) ? parse : null;
}
/**
 * 是否有任一项的 toClaudeAt 晚于参照项的 createdAt。与 cron 无关（Artifact 评论）。
 */
//@ chunk-b0a246e7.js:4399-4526 placement = findMissedTasks (0.461)
function hasCommentSentAfter(comments, reference) {
  let n = parseTimestamp(reference.createdAt);
  if (n === null) return !1;
  return comments.some((r) => {
    let o = parseTimestamp(r.toClaudeAt);
    return o !== null && o > n;
  });
}
/**
 * 线程中等待 Claude 回复的人类评论（在最后一条代理回复之后发给 Claude、且未被标记解决）。
 */
//@ chunk-b0a246e7.js:4526-4944 placement
function getCommentsAwaitingReply(e) {
  if (
    e.commentsDegraded === !0 ||
    e.resolvedDegraded === !0 ||
    e.comments.some((comment) => getCommentAuthorKind(comment) === "unknown")
  )
    return [];
  let lastIndex = e.comments.findLastIndex((o) => getCommentAuthorKind(o) === "agent"),
    n = lastIndex >= 0 ? e.comments[lastIndex] : void 0,
    r = e.resolved ? { id: "resolution-gesture", account: "", text: "", createdAt: e.resolvedAt } : void 0;
  return e.comments.filter(
    (comment, u) =>
      getCommentAuthorKind(comment) === "human" &&
      parseTimestamp(comment.toClaudeAt) !== null &&
      (n === void 0 || u > lastIndex || hasCommentSentAfter([comment], n)) &&
      (r === void 0 || hasCommentSentAfter([comment], r)),
  );
}
/**
 * 把评论线程序列化为给模型的结构（锚点、评论、awaiting_reply 等字段）。
 */
//@ chunk-b0a246e7.js:4944-6506 placement
function serializeCommentThreads(e) {
  return e.map((t) => {
    let n = new Set(getCommentsAwaitingReply(t));
    return {
      id: t.id,
      ...(t.createdAt !== void 0 && { created_at: t.createdAt }),
      resolved: t.resolved,
      ...(t.resolvedDegraded && { resolved_degraded: !0 }),
      ...(t.resolvedByClaude && { resolved_by_claude: !0 }),
      claude_activated: t.claudeActivated,
      ...(t.activatedAtDegraded && { activated_degraded: !0 }),
      ...(t.carried && { carried: !0 }),
      ...(t.commentsDegraded && { comments_degraded: !0 }),
      ...(t.anchorPath !== void 0 && !t.anchorPathUnreadable && { anchor_path: t.anchorPath }),
      ...(t.spanQuote !== void 0 && { span_quote: t.spanQuote }),
      ...(t.anchorFile !== void 0 && { anchor_file: t.anchorFile }),
      ...(t.anchorFileDegraded && { anchor_file_degraded: !0 }),
      ...(t.anchorFileSha !== void 0 && { anchor_file_sha: t.anchorFileSha }),
      ...(t.anchorMovedAt !== void 0 && { anchor_moved_at: t.anchorMovedAt }),
      ...(t.anchorLabel !== void 0 && { anchor_label: t.anchorLabel }),
      ...(t.anchorDetail !== void 0 && { anchor_detail: t.anchorDetail }),
      ...(t.region && { anchor_region: !0 }),
      comments: t.comments.map((comment) => {
        let o = getCommentAuthorKind(comment),
          u = parseTimestamp(comment.toClaudeAt) !== null,
          c = comment.toClaudeAtDegraded === !0 || (comment.toClaudeAt !== void 0 && !u),
          a = u || c;
        return {
          id: comment.id,
          account: comment.account,
          ...(comment.role !== void 0 && { role: comment.role }),
          text: comment.text,
          ...(comment.createdAt !== void 0 && { created_at: comment.createdAt }),
          ...(o === "human" &&
            u && {
              sent_to_claude: !0,
              ...(comment.sentByViewer !== void 0 && { sent_by_viewer: comment.sentByViewer }),
            }),
          ...(((o === "human" && c) || (o === "unknown" && a)) && { sent_to_claude_degraded: !0 }),
          ...(comment.postedByArtifact && { posted_by_artifact: !0 }),
          ...(n.has(comment) && { awaiting_reply: !0 }),
          ...(o === "human" && comment.presence !== void 0 && { presence: comment.presence }),
          ...(o === "human" && comment.access !== void 0 && { access: comment.access }),
          ...(o === "human" && comment.outside && { outside: !0 }),
        };
      }),
    };
  });
}

export {
  isTrustedComment,
  getCommentAuthorKind,
  normalizeCommentAccess,
  parseTimestamp,
  serializeCommentThreads,
  hasPostedReplies,
  markReplyClean,
  getCommentsAwaitingReply,
  isOwnPostedReply,
  hasCommentSentAfter,
  rememberPostedReplyId,
};
