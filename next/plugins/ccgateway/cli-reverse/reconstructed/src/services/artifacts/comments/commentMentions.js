/**
 * services/artifacts/comments/commentMentions.ts
 *
 * 2.1.316 新增：评论中 @ 提及渲染与是否等待 Claude 判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-78ymyfsy.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { scrubThirdPartyText } from "../audience.js";
import { SESSION_ID_SHORT_RE } from "../../../utils/cronTasks.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { BOX_DRAWING_RANGES_2 } from "../../../utils/sanitization.js";
import { MAX_PRESENCE_BYTES } from "./presence.js";
import { create_2 } from "../../../../vendor/zod/lib/index.mjs";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-78ymyfsy.js:6539-6669 placement
/**
 * 从文本中提取 <mention:…> 中的合法标识。
 */
function extractMentions(text) {
  if (!text.includes("<mention:")) return [];
  return [...text.matchAll(MENTION_PATTERNS)]
    .map((entry) => entry[1])
    .filter((mention) => MENTION_UUID_RE.test(mention) || MENTION_ID_RE.test(mention));
}
//@ chunk-78ymyfsy.js:6669-6813 placement
function commentAuthorAccounts(threads) {
  let accounts = new Map();
  for (let thread of threads)
    for (let comment of thread.comments)
      if (comment.access !== undefined && !accounts.has(comment.account))
        accounts.set(comment.account, comment.access);
  return accounts;
}
//@ chunk-78ymyfsy.js:6813-7267 placement
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
//@ chunk-78ymyfsy.js:7267-7327 placement
function threadAwaitsClaudeById(comments, threadId) {
  let thread = findThread(comments, threadId);
  return thread === undefined ? null : threadAwaitsClaude(thread);
}
//@ chunk-78ymyfsy.js:7327-7480 placement
function lastPersonComment(comments, threadId, scanRowIds) {
  let thread = findThread(comments, threadId);
  if (thread === undefined || thread.commentsDegraded === true) return null;
  return (
    thread.comments.findLast(
      (comment) => getCommentAuthorKind(comment) === "agent" && !scanRowIds.has(comment.id),
    ) ?? null
  );
}
//@ chunk-78ymyfsy.js:7480-7603 placement
function findThread(comments, threadId) {
  if (comments.err !== null || comments.threadsDegraded === true || comments.threadsDropped === true) return;
  return comments.threads.find((thread) => thread.id === threadId);
}
//@ chunk-78ymyfsy.js:7603-7810 placement
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
//@ chunk-78ymyfsy.js:7810-7823 placement
var MAX_COMMENT_CHARS = 4096;
//@ chunk-78ymyfsy.js:7823-7870 placement
function isInvisibleBlankCodePoint(codePoint, char) {
  return codePoint !== 10240 && INVISIBLE_BLANK_CODE_POINT.test(char);
}
//@ chunk-78ymyfsy.js:7870-8088 placement
var SPACE_LIKE_RE =
  /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/u;
var SPACE_RUN_RE =
  /[ \t\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]{3,}/gu;
//@ chunk-78ymyfsy.js:8088-8264 placement
function containsBlockedChars(text) {
  for (let run of text.match(SPACE_RUN_RE) ?? []) if (SPACE_LIKE_RE.test(run)) return true;
  return Array.from(text).some((char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 10 || codePoint === 9) return false;
    return isDecisionSurfaceControl(codePoint) || isInvisibleBlankCodePoint(codePoint, char);
  });
}
//@ chunk-78ymyfsy.js:8264-8428 placement
function stripControlChars(text) {
  let joined = Array.from(text, (char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    if (codePoint === 10 || codePoint === 9) return char;
    if (codePoint === 13) return "";
    return isDecisionSurfaceControl(codePoint) || isInvisibleBlankCodePoint(codePoint, char) ? " " : char;
  }).join("");
  return scrubThirdPartyText(joined);
}
//@ chunk-78ymyfsy.js:8428-8534 placement
/**
 * 评论里 @提及 的解析：<mention:...> 模式、UUID 与短 id 两种合法形态，及不可见空白字符处理。
 */
var MENTION_PATTERNS; // deferred: uses SESSION_ID_SHORT_RE (../../../utils/cronTasks.js) of its import cycle while loading; runs once the cycle is complete
var MENTION_UUID_RE;
var MENTION_ID_RE;
deferInit("chunk-78ymyfsy.js:8428", () => {
  MENTION_PATTERNS = /<mention:([^<>\s]+)>/g;
  MENTION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  MENTION_ID_RE = SESSION_ID_SHORT_RE;
});
//@ chunk-78ymyfsy.js:8534-8774 placement
function renderMentions(text, viewerPrincipal, nameById) {
  if (!text.includes("<mention:")) return text;
  return text.replace(MENTION_PATTERNS, (match, id) => {
    if (id === "claude") return "@Claude";
    if (!MENTION_UUID_RE.test(id) && !MENTION_ID_RE.test(id)) return match;
    if (viewerPrincipal !== undefined && isOwnPrincipal(id, viewerPrincipal)) return "@you";
    return `@${nameById?.get(id) ?? "viewer"} ${id.slice(0, 8)}`;
  });
}
//@ chunk-78ymyfsy.js:8774-8846 placement
var regExp; // deferred: uses SPACE_LIKE_RE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-78ymyfsy.js:8774", () => {
  regExp = new RegExp(`^[\\s${SPACE_LIKE_RE.source.slice(1, -1)}]*[\\p{Ps}${BOX_DRAWING_RANGES_2}]`, "u");
});
//@ chunk-78ymyfsy.js:8846-8951 placement
function quoteCommentLines(text, prefix, indent = "", forcePrefix = false) {
  let replaced = stripControlChars(text).replace(
    /\n/g,
    `
${indent}${prefix}| `,
  );
  return forcePrefix || regExp.test(replaced) ? `${prefix}| ${replaced}` : replaced;
}
//@ chunk-78ymyfsy.js:8951-9043 placement
function presenceLine(presence, prefix) {
  let swept = sweepResultLine(presence, MAX_PRESENCE_BYTES, {
    joiners: true,
  });
  return `${prefix}| ${swept.kept}${swept.cut ? "\u2026" : ""}`;
}
//@ chunk-78ymyfsy.js:9043-9096 placement
function countGate(gateState, gateName) {
  gateState.gates.set(gateName, (gateState.gates.get(gateName) ?? 0) + 1);
}
//@ chunk-78ymyfsy.js:9096-9135 placement
function gateFallback(gateState, gateName, fallbackValue) {
  return () => {
    countGate(gateState, gateName);
    return fallbackValue;
  };
}
//@ chunk-78ymyfsy.js:9135-9151 placement
var EMPTY_MENTION_LIST = [];
var EMPTY_MENTION_LIST_B = [];
//@ chunk-78ymyfsy.js:9151-9245 placement
function nullableStringField(gateState, gateName, fallbackValue) {
  return create_2()
    .nullable()
    .optional()
    .catch(gateFallback(gateState, gateName, fallbackValue))
    .transform((value) => value ?? undefined);
}
export {
  extractMentions,
  nullableStringField,
  gateFallback,
  EMPTY_MENTION_LIST_B,
  EMPTY_MENTION_LIST,
  countGate,
  containsBlockedChars,
  stripControlChars,
  renderMentions,
  quoteCommentLines,
  lastPersonComment,
  threadAwaitsClaudeById,
  commentAuthorAccounts,
  MAX_COMMENT_CHARS,
  presenceLine,
  lastCommentIsPersons,
};
