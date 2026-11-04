/**
 * services/artifacts/comments/commentMentions.ts
 *
 * 2.1.316 新增：评论中 @ 提及渲染与是否等待 Claude 判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (21)
 * attribution: placement 21
 */
import {
  getCommentAuthorKind,
  parseTimestamp,
  hasCommentSentAfter,
  isOwnPostedReply,
} from "./commentState.js";
import {
  INVISIBLE_BLANK_CODE_POINT,
  isDecisionSurfaceControl,
  sweepResultLine,
} from "../../../tools/ArtifactTool/artifactUrls.js";
import { extractPageText } from "../audience.js";
import { SESSION_ID_SHORT_RE } from "../../../utils/cronTasks.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { BOX_DRAWING_RANGES_2 } from "../../../utils/sanitization.js";
import { MAX_PRESENCE_BYTES } from "./presence.js";
import { create_2 } from "../../../../vendor/zod/lib/index.mjs";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-b0a246e7.js:6506-6636 placement
/**
 * 从文本中提取 <mention:…> 中的合法标识。
 */
function extractMentions(text) {
  if (!text.includes("<mention:")) return [];
  return [...text.matchAll(MENTION_PATTERNS)]
    .map((entry) => entry[1])
    .filter((mention) => MENTION_UUID_RE.test(mention) || MENTION_ID_RE.test(mention));
}
//@ chunk-b0a246e7.js:6636-6780 placement
function commentAuthorAccounts(threads) {
  let accounts = new Map();
  for (let thread of threads)
    for (let comment of thread.comments)
      if (comment.access !== undefined && !accounts.has(comment.account))
        accounts.set(comment.account, comment.access);
  return accounts;
}
//@ chunk-b0a246e7.js:6780-7234 placement
function threadAwaitsClaude(thread) {
  if (
    thread.commentsDegraded === true ||
    thread.comments.some(
      (comment) =>
        getCommentAuthorKind(comment) === "unknown" ||
        (getCommentAuthorKind(comment) === "human" && comment.toClaudeAtDegraded === true),
    )
  )
    return null;
  let lastIndex = thread.comments.findLastIndex((comment) => getCommentAuthorKind(comment) === "agent");
  if (lastIndex < 0) return null;
  let lastComment = thread.comments[lastIndex];
  if (parseTimestamp(lastComment.createdAt) === null) return null;
  let sawLaterComment = false;
  for (let [commentIndex, comment] of thread.comments.entries()) {
    if (getCommentAuthorKind(comment) !== "human" || comment.toClaudeAt == null) continue;
    if (parseTimestamp(comment.toClaudeAt) === null) return null;
    sawLaterComment = true;
    if (commentIndex > lastIndex || hasCommentSentAfter([comment], lastComment)) return null;
  }
  return sawLaterComment ? lastComment : null;
}
//@ chunk-b0a246e7.js:7234-7294 placement
function threadAwaitsClaudeById(comments, threadId) {
  let thread = findThread(comments, threadId);
  return thread === undefined ? null : threadAwaitsClaude(thread);
}
//@ chunk-b0a246e7.js:7294-7447 placement
function lastPersonComment(comments, threadId, scanRowIds) {
  let thread = findThread(comments, threadId);
  if (thread === undefined || thread.commentsDegraded === true) return null;
  return (
    thread.comments.findLast(
      (comment) => getCommentAuthorKind(comment) === "agent" && !scanRowIds.has(comment.id),
    ) ?? null
  );
}
//@ chunk-b0a246e7.js:7447-7570 placement
function findThread(comments, threadId) {
  if (comments.err !== null || comments.threadsDegraded === true || comments.threadsDropped === true) return;
  return comments.threads.find((thread) => thread.id === threadId);
}
//@ chunk-b0a246e7.js:7570-7777 placement
function lastCommentIsPersons(comments, threadId) {
  let thread = findThread(comments, threadId);
  if (
    thread === undefined ||
    thread.commentsDegraded === true ||
    thread.comments.some((comment) => getCommentAuthorKind(comment) === "unknown")
  )
    return;
  let last = thread.comments.findLast((comment) => getCommentAuthorKind(comment) === "agent");
  return last !== undefined && isOwnPostedReply(last.id) ? last.id : undefined;
}
//@ chunk-b0a246e7.js:7777-7790 placement
var MAX_COMMENT_CHARS = 4096;
//@ chunk-b0a246e7.js:7790-7837 placement
function isInvisibleBlankCodePoint(codePoint, char) {
  return codePoint !== 10240 && INVISIBLE_BLANK_CODE_POINT.test(char);
}
//@ chunk-b0a246e7.js:7837-8055 placement
var SPACE_LIKE_RE =
  /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/u;
var SPACE_RUN_RE =
  /[ \t\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]{3,}/gu;
//@ chunk-b0a246e7.js:8055-8231 placement
function containsBlockedChars(text) {
  for (let run of text.match(SPACE_RUN_RE) ?? []) if (SPACE_LIKE_RE.test(run)) return true;
  return Array.from(text).some((char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 10 || codePoint === 9) return false;
    return isDecisionSurfaceControl(codePoint) || isInvisibleBlankCodePoint(codePoint, char);
  });
}
//@ chunk-b0a246e7.js:8231-8395 placement
function stripControlChars(text) {
  let joined = Array.from(text, (char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 10 || codePoint === 9) return char;
    if (codePoint === 13) return "";
    return isDecisionSurfaceControl(codePoint) || isInvisibleBlankCodePoint(codePoint, char) ? " " : char;
  }).join("");
  return extractPageText(joined);
}
//@ chunk-b0a246e7.js:8395-8501 placement
/**
 * 评论里 @提及 的解析：<mention:...> 模式、UUID 与短 id 两种合法形态，及不可见空白字符处理。
 */
var MENTION_PATTERNS; // deferred: uses SESSION_ID_SHORT_RE (../../../utils/cronTasks.js) of its import cycle while loading; runs once the cycle is complete
var MENTION_UUID_RE;
var MENTION_ID_RE;
deferInit("chunk-b0a246e7.js:8395", () => {
  MENTION_PATTERNS = /<mention:([^<>\s]+)>/g;
  MENTION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  MENTION_ID_RE = SESSION_ID_SHORT_RE;
});
//@ chunk-b0a246e7.js:8501-8741 placement
function renderMentions(text, viewerPrincipal, nameById) {
  if (!text.includes("<mention:")) return text;
  return text.replace(MENTION_PATTERNS, (match, id) => {
    if (id === "claude") return "@Claude";
    if (!MENTION_UUID_RE.test(id) && !MENTION_ID_RE.test(id)) return match;
    if (viewerPrincipal !== undefined && isOwnPrincipal(id, viewerPrincipal)) return "@you";
    return `@${nameById?.get(id) ?? "viewer"} ${id.slice(0, 8)}`;
  });
}
//@ chunk-b0a246e7.js:8741-8813 placement
var regExp; // deferred: uses SPACE_LIKE_RE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b0a246e7.js:8741", () => {
  regExp = new RegExp(`^[\\s${SPACE_LIKE_RE.source.slice(1, -1)}]*[\\p{Ps}${BOX_DRAWING_RANGES_2}]`, "u");
});
//@ chunk-b0a246e7.js:8813-8918 placement
function quoteCommentLines(text, prefix, indent = "", forcePrefix = false) {
  let replaced = stripControlChars(text).replace(
    /\n/g,
    `
${indent}${prefix}| `,
  );
  return forcePrefix || regExp.test(replaced) ? `${prefix}| ${replaced}` : replaced;
}
//@ chunk-b0a246e7.js:8918-9010 placement
function presenceLine(presence, prefix) {
  let swept = sweepResultLine(presence, MAX_PRESENCE_BYTES, {
    joiners: true,
  });
  return `${prefix}| ${swept.kept}${swept.cut ? "\u2026" : ""}`;
}
//@ chunk-b0a246e7.js:9010-9063 placement
function countGate(gateState, gateName) {
  gateState.gates.set(gateName, (gateState.gates.get(gateName) ?? 0) + 1);
}
//@ chunk-b0a246e7.js:9063-9102 placement
function gateFallback(gateState, gateName, fallbackValue) {
  return () => {
    countGate(gateState, gateName);
    return fallbackValue;
  };
}
//@ chunk-b0a246e7.js:9102-9118 placement
var EMPTY_MENTION_LIST = [];
var EMPTY_MENTION_LIST_B = [];
//@ chunk-b0a246e7.js:9118-9212 placement
function nullableStringField(gateState, gateName, fallbackValue) {
  return create_2()
    .nullable()
    .optional()
    .catch(gateFallback(gateState, gateName, fallbackValue))
    .transform((value) => value ?? undefined);
}
export {
  MAX_COMMENT_CHARS,
  commentAuthorAccounts,
  extractMentions,
  quoteCommentLines,
  renderMentions,
  presenceLine,
  containsBlockedChars,
  threadAwaitsClaudeById,
  lastCommentIsPersons,
  lastPersonComment,
  stripControlChars,
  nullableStringField,
  gateFallback,
  EMPTY_MENTION_LIST_B,
  EMPTY_MENTION_LIST,
  countGate,
};
