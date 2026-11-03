/**
 * services/artifacts/comments/commentState.ts
 *
 * 2.1.316 新增：Artifact 评论的本地状态：记录本会话发出的回复 ID（有上限）、已见评论与回复跟踪。
 *
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
//@ chunk-b0a246e7.js:3580-3701 placement
/**
 * 记录由本会话发出的 Artifact 评论回复 ID（有上限）。
 */
function rememberPostedReplyId(replyId) {
  let postedReplyIds = getLiveState().postedReplyIds;
  postedReplyIds.add(replyId);
  if (postedReplyIds.size > MAX_TRACKED_REPLY_IDS) {
    let n = postedReplyIds.values().next().value;
    if (n !== undefined) postedReplyIds.delete(n);
  }
}
//@ chunk-b0a246e7.js:3701-3759 placement
/**
 * 是否是本会话发出的评论回复。
 */
function isOwnPostedReply(replyId) {
  return replyId !== "" && getLiveState().postedReplyIds.has(replyId);
}
//@ chunk-b0a246e7.js:3759-3898 placement
/**
 * 把本会话发出的回复标为"干净"（未被改写）。
 */
function markReplyClean(replyId) {
  if (!isOwnPostedReply(replyId)) return;
  let cleanReplyIds = getLiveState().cleanReplyIds;
  cleanReplyIds.add(replyId);
  if (cleanReplyIds.size > MAX_TRACKED_REPLY_IDS) {
    let n = cleanReplyIds.values().next().value;
    if (n !== undefined) cleanReplyIds.delete(n);
  }
}
//@ chunk-b0a246e7.js:3898-3947 placement
/**
 * 本会话是否发过 Artifact 评论回复。
 */
function hasPostedReplies() {
  return getLiveState().postedReplyIds.size > 0;
}
//@ chunk-b0a246e7.js:3947-4022 placement
/**
 * 只接受 owner / editor / commenter 三种访问级别。
 */
function normalizeCommentAccess(role) {
  return role === "owner" || role === "editor" || role === "commenter" ? role : undefined;
}
//@ chunk-b0a246e7.js:4022-4128 placement
/**
 * 评论作者类别：degraded → unknown，无角色 → human，有角色 → agent。
 */
function getCommentAuthorKind(comment) {
  if (comment.role === "degraded") return "unknown";
  return comment.role === undefined || comment.role === "" ? "human" : "agent";
}
//@ chunk-b0a246e7.js:4128-4305 placement
/**
 * 评论是否可信：代理评论须是本会话发出的干净回复，人类评论须来自指定账户且提及的账户也都匹配。
 */
function isTrustedComment(comment, account) {
  let commentAuthorKind = getCommentAuthorKind(comment);
  return (
    (commentAuthorKind === "agent"
      ? isOwnPostedReply(comment.id) && getLiveState().cleanReplyIds.has(comment.id)
      : commentAuthorKind === "human" &&
        comment.postedByArtifact !== true &&
        isOwnPrincipal(comment.account, account)) &&
    extractMentions(comment.text).every((r) => isOwnPrincipal(r, account))
  );
}
//@ chunk-b0a246e7.js:4305-4399 placement
/**
 * 解析 ISO 时间字符串为毫秒，失败返回 null。
 */
function parseTimestamp(value) {
  if (value === undefined) return null;
  let timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
//@ chunk-b0a246e7.js:4399-4526 placement = findMissedTasks (0.461)
/**
 * 是否有任一项的 toClaudeAt 晚于参照项的 createdAt。与 cron 无关（Artifact 评论）。
 */
function hasCommentSentAfter(comments, reference) {
  let timestamp = parseTimestamp(reference.createdAt);
  if (timestamp === null) return false;
  return comments.some((t) => {
    let next = parseTimestamp(t.toClaudeAt);
    return next !== null && next > timestamp;
  });
}
//@ chunk-b0a246e7.js:4526-4944 placement
/**
 * 线程中等待 Claude 回复的人类评论（在最后一条代理回复之后发给 Claude、且未被标记解决）。
 */
function getCommentsAwaitingReply(thread) {
  if (
    thread.commentsDegraded === true ||
    thread.resolvedDegraded === true ||
    thread.comments.some((comment) => getCommentAuthorKind(comment) === "unknown")
  )
    return [];
  let lastIndex = thread.comments.findLastIndex((comment) => getCommentAuthorKind(comment) === "agent");
  let n = lastIndex >= 0 ? thread.comments[lastIndex] : undefined;
  let r = thread.resolved
    ? {
        id: "resolution-gesture",
        account: "",
        text: "",
        createdAt: thread.resolvedAt,
      }
    : undefined;
  return thread.comments.filter(
    (comment, u) =>
      getCommentAuthorKind(comment) === "human" &&
      parseTimestamp(comment.toClaudeAt) !== null &&
      (n === undefined || u > lastIndex || hasCommentSentAfter([comment], n)) &&
      (r === undefined || hasCommentSentAfter([comment], r)),
  );
}
//@ chunk-b0a246e7.js:4944-6506 placement
/**
 * 把评论线程序列化为给模型的结构（锚点、评论、awaiting_reply 等字段）。
 */
function serializeCommentThreads(threads) {
  return threads.map((t) => {
    let n = new Set(getCommentsAwaitingReply(t));
    return {
      id: t.id,
      ...(t.createdAt !== undefined && {
        created_at: t.createdAt,
      }),
      resolved: t.resolved,
      ...(t.resolvedDegraded && {
        resolved_degraded: true,
      }),
      ...(t.resolvedByClaude && {
        resolved_by_claude: true,
      }),
      claude_activated: t.claudeActivated,
      ...(t.activatedAtDegraded && {
        activated_degraded: true,
      }),
      ...(t.carried && {
        carried: true,
      }),
      ...(t.commentsDegraded && {
        comments_degraded: true,
      }),
      ...(t.anchorPath !== undefined &&
        !t.anchorPathUnreadable && {
          anchor_path: t.anchorPath,
        }),
      ...(t.spanQuote !== undefined && {
        span_quote: t.spanQuote,
      }),
      ...(t.anchorFile !== undefined && {
        anchor_file: t.anchorFile,
      }),
      ...(t.anchorFileDegraded && {
        anchor_file_degraded: true,
      }),
      ...(t.anchorFileSha !== undefined && {
        anchor_file_sha: t.anchorFileSha,
      }),
      ...(t.anchorMovedAt !== undefined && {
        anchor_moved_at: t.anchorMovedAt,
      }),
      ...(t.anchorLabel !== undefined && {
        anchor_label: t.anchorLabel,
      }),
      ...(t.anchorDetail !== undefined && {
        anchor_detail: t.anchorDetail,
      }),
      ...(t.region && {
        anchor_region: true,
      }),
      comments: t.comments.map((comment) => {
        let commentAuthorKind = getCommentAuthorKind(comment);
        let u = parseTimestamp(comment.toClaudeAt) !== null;
        let c = comment.toClaudeAtDegraded === true || (comment.toClaudeAt !== undefined && !u);
        let a = u || c;
        return {
          id: comment.id,
          account: comment.account,
          ...(comment.role !== undefined && {
            role: comment.role,
          }),
          text: comment.text,
          ...(comment.createdAt !== undefined && {
            created_at: comment.createdAt,
          }),
          ...(commentAuthorKind === "human" &&
            u && {
              sent_to_claude: true,
              ...(comment.sentByViewer !== undefined && {
                sent_by_viewer: comment.sentByViewer,
              }),
            }),
          ...(((commentAuthorKind === "human" && c) || (commentAuthorKind === "unknown" && a)) && {
            sent_to_claude_degraded: true,
          }),
          ...(comment.postedByArtifact && {
            posted_by_artifact: true,
          }),
          ...(n.has(comment) && {
            awaiting_reply: true,
          }),
          ...(commentAuthorKind === "human" &&
            comment.presence !== undefined && {
              presence: comment.presence,
            }),
          ...(commentAuthorKind === "human" &&
            comment.access !== undefined && {
              access: comment.access,
            }),
          ...(commentAuthorKind === "human" &&
            comment.outside && {
              outside: true,
            }),
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
