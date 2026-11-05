/**
 * services/artifacts/comments/commentState.ts
 *
 * 2.1.316 新增：Artifact 评论的本地状态：记录本会话发出的回复 ID（有上限）、已见评论与回复跟踪。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-78ymyfsy.js (12)
 * attribution: placement 12
 */
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { extractMentions } from "./commentMentions.js";

//@ chunk-78ymyfsy.js:3602-3613 placement
var MAX_TRACKED_REPLY_IDS = 256;
//@ chunk-78ymyfsy.js:3613-3734 placement
/**
 * 记录由本会话发出的 Artifact 评论回复 ID（有上限）。
 */
function rememberPostedReplyId(replyId) {
  let postedReplyIds = getLiveState().postedReplyIds;
  postedReplyIds.add(replyId);
  if (postedReplyIds.size > MAX_TRACKED_REPLY_IDS) {
    let replyId = postedReplyIds.values().next().value;
    if (replyId !== undefined) postedReplyIds.delete(replyId);
  }
}
//@ chunk-78ymyfsy.js:3734-3792 placement
/**
 * 是否是本会话发出的评论回复。
 */
function isOwnPostedReply(replyId) {
  return replyId !== "" && getLiveState().postedReplyIds.has(replyId);
}
//@ chunk-78ymyfsy.js:3792-3931 placement
/**
 * 把本会话发出的回复标为"干净"（未被改写）。
 */
function markReplyClean(replyId) {
  if (!isOwnPostedReply(replyId)) return;
  let cleanReplyIds = getLiveState().cleanReplyIds;
  cleanReplyIds.add(replyId);
  if (cleanReplyIds.size > MAX_TRACKED_REPLY_IDS) {
    let replyId = cleanReplyIds.values().next().value;
    if (replyId !== undefined) cleanReplyIds.delete(replyId);
  }
}
//@ chunk-78ymyfsy.js:3931-3980 placement
/**
 * 本会话是否发过 Artifact 评论回复。
 */
function hasPostedReplies() {
  return getLiveState().postedReplyIds.size > 0;
}
//@ chunk-78ymyfsy.js:3980-4055 placement
/**
 * 只接受 owner / editor / commenter 三种访问级别。
 */
function normalizeCommentAccess(role) {
  return role === "owner" || role === "editor" || role === "commenter" ? role : undefined;
}
//@ chunk-78ymyfsy.js:4055-4161 placement
/**
 * 评论作者类别：degraded → unknown，无角色 → human，有角色 → agent。
 */
function getCommentAuthorKind(comment) {
  if (comment.role === "degraded") return "unknown";
  return comment.role === undefined || comment.role === "" ? "human" : "agent";
}
//@ chunk-78ymyfsy.js:4161-4338 placement
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
    extractMentions(comment.text).every((mention) => isOwnPrincipal(mention, account))
  );
}
//@ chunk-78ymyfsy.js:4338-4432 placement
/**
 * 解析 ISO 时间字符串为毫秒，失败返回 null。
 */
function parseTimestamp(value) {
  if (value === undefined) return null;
  let timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
//@ chunk-78ymyfsy.js:4432-4559 placement (2.1.88 match: findMissedTasks, 0.461)
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
//@ chunk-78ymyfsy.js:4559-4977 placement
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
  let lastComment = lastIndex >= 0 ? thread.comments[lastIndex] : undefined;
  let resolvedComment = thread.resolved
    ? {
        id: "resolution-gesture",
        account: "",
        text: "",
        createdAt: thread.resolvedAt,
      }
    : undefined;
  return thread.comments.filter(
    (comment, commentIndex) =>
      getCommentAuthorKind(comment) === "human" &&
      parseTimestamp(comment.toClaudeAt) !== null &&
      (lastComment === undefined ||
        commentIndex > lastIndex ||
        hasCommentSentAfter([comment], lastComment)) &&
      (resolvedComment === undefined || hasCommentSentAfter([comment], resolvedComment)),
  );
}
//@ chunk-78ymyfsy.js:4977-6539 placement
/**
 * 把评论线程序列化为给模型的结构（锚点、评论、awaiting_reply 等字段）。
 */
function serializeCommentThreads(threads) {
  return threads.map((thread) => {
    let awaiting = new Set(getCommentsAwaitingReply(thread));
    return {
      id: thread.id,
      ...(thread.createdAt !== undefined && {
        created_at: thread.createdAt,
      }),
      resolved: thread.resolved,
      ...(thread.resolvedDegraded && {
        resolved_degraded: true,
      }),
      ...(thread.resolvedByClaude && {
        resolved_by_claude: true,
      }),
      claude_activated: thread.claudeActivated,
      ...(thread.activatedAtDegraded && {
        activated_degraded: true,
      }),
      ...(thread.carried && {
        carried: true,
      }),
      ...(thread.commentsDegraded && {
        comments_degraded: true,
      }),
      ...(thread.anchorPath !== undefined &&
        !thread.anchorPathUnreadable && {
          anchor_path: thread.anchorPath,
        }),
      ...(thread.spanQuote !== undefined && {
        span_quote: thread.spanQuote,
      }),
      ...(thread.anchorFile !== undefined && {
        anchor_file: thread.anchorFile,
      }),
      ...(thread.anchorFileDegraded && {
        anchor_file_degraded: true,
      }),
      ...(thread.anchorFileSha !== undefined && {
        anchor_file_sha: thread.anchorFileSha,
      }),
      ...(thread.anchorMovedAt !== undefined && {
        anchor_moved_at: thread.anchorMovedAt,
      }),
      ...(thread.anchorLabel !== undefined && {
        anchor_label: thread.anchorLabel,
      }),
      ...(thread.anchorDetail !== undefined && {
        anchor_detail: thread.anchorDetail,
      }),
      ...(thread.region && {
        anchor_region: true,
      }),
      comments: thread.comments.map((comment) => {
        let commentAuthorKind = getCommentAuthorKind(comment);
        let hasValidTimestamp = parseTimestamp(comment.toClaudeAt) !== null;
        let timestampDegraded =
          comment.toClaudeAtDegraded === true || (comment.toClaudeAt !== undefined && !hasValidTimestamp);
        let sentDegraded = hasValidTimestamp || timestampDegraded;
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
            hasValidTimestamp && {
              sent_to_claude: true,
              ...(comment.sentByViewer !== undefined && {
                sent_by_viewer: comment.sentByViewer,
              }),
            }),
          ...(((commentAuthorKind === "human" && timestampDegraded) ||
            (commentAuthorKind === "unknown" && sentDegraded)) && {
            sent_to_claude_degraded: true,
          }),
          ...(comment.postedByArtifact && {
            posted_by_artifact: true,
          }),
          ...(awaiting.has(comment) && {
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
  getCommentAuthorKind,
  parseTimestamp,
  hasCommentSentAfter,
  isOwnPostedReply,
  normalizeCommentAccess,
  rememberPostedReplyId,
  getCommentsAwaitingReply,
  markReplyClean,
  isTrustedComment,
  serializeCommentThreads,
  hasPostedReplies,
};
