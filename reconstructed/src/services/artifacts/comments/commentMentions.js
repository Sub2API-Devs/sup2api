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
import { K_t } from "../../../utils/cronTasks.js";
import { isOwnPrincipal } from "./commentAuthorship.js";
import { BOX_DRAWING_RANGES } from "../../../utils/sanitization.js";
import { MAX_PRESENCE_BYTES } from "./presence.js";
import { create_2 } from "../../../../vendor/zod/lib/index.mjs";

/**
 * 从文本中提取 <mention:…> 中的合法标识。
 */
//@ chunk-b0a246e7.js:6506-6636 placement
function extractMentions(text) {
  if (!text.includes("<mention:")) return [];
  return [...text.matchAll(MENTION_PATTERNS)].map((t) => t[1]).filter((t) => ye.test(t) || Ae.test(t));
}
//@ chunk-b0a246e7.js:6636-6780 placement
function commentAuthorAccounts(e) {
  let t = new Map();
  for (let n of e)
    for (let comment of n.comments)
      if (comment.access !== void 0 && !t.has(comment.account)) t.set(comment.account, comment.access);
  return t;
}
//@ chunk-b0a246e7.js:6780-7234 placement
function threadAwaitsClaude(e) {
  if (
    e.commentsDegraded === !0 ||
    e.comments.some(
      (comment) =>
        getCommentAuthorKind(comment) === "unknown" ||
        (getCommentAuthorKind(comment) === "human" && comment.toClaudeAtDegraded === !0),
    )
  )
    return null;
  let lastIndex = e.comments.findLastIndex((o) => getCommentAuthorKind(o) === "agent");
  if (lastIndex < 0) return null;
  let n = e.comments[lastIndex];
  if (parseTimestamp(n.createdAt) === null) return null;
  let r = !1;
  for (let [o, u] of e.comments.entries()) {
    if (getCommentAuthorKind(u) !== "human" || u.toClaudeAt == null) continue;
    if (parseTimestamp(u.toClaudeAt) === null) return null;
    if (((r = !0), o > lastIndex || hasCommentSentAfter([u], n))) return null;
  }
  return r ? n : null;
}
//@ chunk-b0a246e7.js:7234-7294 placement
function threadAwaitsClaudeById(e, t) {
  let n = findThread(e, t);
  return n === void 0 ? null : threadAwaitsClaude(n);
}
//@ chunk-b0a246e7.js:7294-7447 placement
function lastPersonComment(e, t, n) {
  let r = findThread(e, t);
  if (r === void 0 || r.commentsDegraded === !0) return null;
  return r.comments.findLast((o) => getCommentAuthorKind(o) === "agent" && !n.has(o.id)) ?? null;
}
//@ chunk-b0a246e7.js:7447-7570 placement
function findThread(e, t) {
  if (e.err !== null || e.threadsDegraded === !0 || e.threadsDropped === !0) return;
  return e.threads.find((thread) => thread.id === t);
}
//@ chunk-b0a246e7.js:7570-7777 placement
function lastCommentIsPersons(e, t) {
  let n = findThread(e, t);
  if (
    n === void 0 ||
    n.commentsDegraded === !0 ||
    n.comments.some((comment) => getCommentAuthorKind(comment) === "unknown")
  )
    return;
  let last = n.comments.findLast((o) => getCommentAuthorKind(o) === "agent");
  return last !== void 0 && isOwnPostedReply(last.id) ? last.id : void 0;
}
//@ chunk-b0a246e7.js:7777-7790 placement
var MAX_COMMENT_CHARS = 4096;
//@ chunk-b0a246e7.js:7790-7837 placement
function pe(e, t) {
  return e !== 10240 && INVISIBLE_BLANK_CODE_POINT.test(t);
}
//@ chunk-b0a246e7.js:7837-8055 placement
var SPACE_LIKE_RE =
    /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/u,
  SPACE_RUN_RE =
    /[ \t\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]{3,}/gu;
//@ chunk-b0a246e7.js:8055-8231 placement
function containsBlockedChars(e) {
  for (let t of e.match(SPACE_RUN_RE) ?? []) if (SPACE_LIKE_RE.test(t)) return !0;
  return Array.from(e).some((t) => {
    let n = t.codePointAt(0) ?? 0;
    if (n === 10 || n === 9) return !1;
    return isDecisionSurfaceControl(n) || pe(n, t);
  });
}
//@ chunk-b0a246e7.js:8231-8395 placement
function stripControlChars(e) {
  let joined = Array.from(e, (n) => {
    let r = n.codePointAt(0) ?? 0;
    if (r === 10 || r === 9) return n;
    if (r === 13) return "";
    return isDecisionSurfaceControl(r) || pe(r, n) ? " " : n;
  }).join("");
  return extractPageText(joined);
}
//@ chunk-b0a246e7.js:8395-8501 placement
var MENTION_PATTERNS = /<mention:([^<>\s]+)>/g,
  ye = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  Ae = K_t;
//@ chunk-b0a246e7.js:8501-8741 placement
function renderMentions(e, t, n) {
  if (!e.includes("<mention:")) return e;
  return e.replace(MENTION_PATTERNS, (r, o) => {
    if (o === "claude") return "@Claude";
    if (!ye.test(o) && !Ae.test(o)) return r;
    if (t !== void 0 && isOwnPrincipal(o, t)) return "@you";
    return `@${n?.get(o) ?? "viewer"} ${o.slice(0, 8)}`;
  });
}
//@ chunk-b0a246e7.js:8741-8813 placement
var regExp = new RegExp(`^[\\s${SPACE_LIKE_RE.source.slice(1, -1)}]*[\\p{Ps}${BOX_DRAWING_RANGES}]`, "u");
//@ chunk-b0a246e7.js:8813-8918 placement
function quoteCommentLines(e, t, n = "", r = !1) {
  let replaced = stripControlChars(e).replace(
    /\n/g,
    `
${n}${t}| `,
  );
  return r || regExp.test(replaced) ? `${t}| ${replaced}` : replaced;
}
//@ chunk-b0a246e7.js:8918-9010 placement
function presenceLine(e, t) {
  let n = sweepResultLine(e, MAX_PRESENCE_BYTES, { joiners: !0 });
  return `${t}| ${n.kept}${n.cut ? "\u2026" : ""}`;
}
//@ chunk-b0a246e7.js:9010-9063 placement
function countGate(e, t) {
  e.gates.set(t, (e.gates.get(t) ?? 0) + 1);
}
//@ chunk-b0a246e7.js:9063-9102 placement
function gateFallback(e, t, n) {
  return () => (countGate(e, t), n);
}
//@ chunk-b0a246e7.js:9102-9118 placement
var Re = [],
  be = [];
//@ chunk-b0a246e7.js:9118-9212 placement
function nullableStringField(e, t, n) {
  return create_2()
    .nullable()
    .optional()
    .catch(gateFallback(e, t, n))
    .transform((r) => r ?? void 0);
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
  be,
  Re,
  countGate,
};
