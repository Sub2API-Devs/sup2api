/**
 * services/artifacts/comments/commentConsent.ts
 *
 * 2.1.316 新增：评论读取同意的目标与摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-grzs9chm.js (11)
 * attribution: placement 11
 */
import { stripControlChars } from "./commentMentions.js";
import {
  INVISIBLE_BLANKS,
  QUOTE_HOMOGLYPHS,
  SINGLE_QUOTE_RUNS,
  spacedFromClosingQuote,
  characterReferencesAsBrackets,
  sweepProvenanceMarker,
  DECISION_SURFACE_BRACKETS_RE,
  ANGLE_BRACKET_RUN_RE,
  SCHEME_SEPARATOR_RE,
  DEFANGED_SCHEME_SEPARATOR,
} from "../../../tools/ArtifactTool/artifactUrls.js";
import { extractPageText } from "../audience.js";
import { truncateCodePoints } from "../../../utils/stringUtils.js";
import { isOwnPrincipal, ownPrincipalTokens } from "./commentAuthorship.js";
import { getCommentAuthorKind } from "./commentState.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import { readArtifactComments } from "./commentsRead.js";
import { getGatewayAccountInfoAsync } from "../../../utils/gatewayCredential.js";
import { logFeatureSad } from "../../analytics/featureTelemetry.js";
import { isAbortError } from "../../../utils/errors.js";

//@ chunk-grzs9chm.js:634-686 placement
/**
 * 评论目标的键与文本截断上限（目标 120 字符、正文 4000、@提及 32）。
 */
var COMMENT_TARGET_KEY = "__artifactCommentTarget";
var COMMENT_TARGET_MAX_CHARS = 120;
var COMMENT_TEXT_MAX_CHARS = 4000;
var MENTION_MAX_CHARS = 32;
//@ chunk-grzs9chm.js:686-720 placement
function _(slug, t) {
  return `${slug}/${t}`;
}
//@ chunk-grzs9chm.js:720-866 placement
function flattenCommentText(e) {
  return stripControlChars(e)
    .replace(/[\n\t]/g, " ")
    .replace(INVISIBLE_BLANKS, " ")
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(QUOTE_HOMOGLYPHS, "'")
    .replace(SINGLE_QUOTE_RUNS, "'")
    .trim();
}
//@ chunk-grzs9chm.js:866-950 placement
function truncateCommentText(e, t) {
  let o = flattenCommentText(e);
  return Array.from(o).length > t ? `${extractPageText(truncateCodePoints(o, t))}\u2026` : o;
}
//@ chunk-grzs9chm.js:950-1524 placement
function openingCommentExcerpt(threads, t, o) {
  let found = threads.find((s) => s.id === t);
  let n = found?.comments[0];
  if (found === undefined || n === undefined || found.commentsDegraded) return;
  let a = spacedFromClosingQuote(
    characterReferencesAsBrackets(
      sweepProvenanceMarker(
        truncateCommentText(n.text.replace(DECISION_SURFACE_BRACKETS_RE, " "), COMMENT_TARGET_MAX_CHARS),
      ),
    )
      .replace(ANGLE_BRACKET_RUN_RE, " ")
      .replace(SCHEME_SEPARATOR_RE, DEFANGED_SCHEME_SEPARATOR)
      .replace(/ {2,}/g, " ")
      .trim(),
  );
  if (a === "") return;
  let i = isOwnPrincipal(n.account, o);
  let commentAuthorKind = getCommentAuthorKind(n);
  let d =
    n.postedByArtifact || commentAuthorKind === "unknown"
      ? "unknown"
      : n.role === "assistant"
        ? i
          ? "claude"
          : "unknown"
        : commentAuthorKind === "agent"
          ? "unknown"
          : i
            ? "user"
            : "viewer";
  return {
    display: {
      thread_id: t,
      by: d,
      excerpt: a,
      replies: found.comments.length - 1,
      resolved: found.resolved && found.resolvedDegraded !== true,
    },
    ...(d === "viewer" &&
      n.access !== undefined && {
        access: n.access,
      }),
  };
}
//@ chunk-grzs9chm.js:1524-1637 placement
function canAskCommentConsent(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    e.toolUseId !== undefined &&
    toolPermissionContext.mode !== "dontAsk" &&
    toolPermissionContext.shouldAvoidPermissionPrompts !== true
  );
}
//@ chunk-grzs9chm.js:1637-2550 placement
/**
 * 读取 artifact 评论线程开头评论，用于构造"Claude 想读取此评论线程"的同意提示。
 */
async function readCommentConsentTarget(e, t, o) {
  if (!ARTIFACT_SLUG_RE.test(t)) return;
  let r = _(e.slug, t);
  let commentTargets = getLiveState().commentTargets;
  let accountEpoch = getLiveState().accountEpoch;
  let i = commentTargets.get(r);
  if (i !== undefined && o.toolUseId !== undefined && i.toolUseId === o.toolUseId) return i.target;
  let { signal, cleanup } = createCombinedAbortSignal(o.abortController.signal, {
    timeoutMs: COMMENT_TEXT_MAX_CHARS,
    refTimer: true,
  });
  try {
    let [artifactComments, gatewayAccountInfo] = await Promise.all([
      readArtifactComments(e, signal, o.credentials, "artifact_comment_consent_read", {
        skipBootProbe: true,
      }),
      getGatewayAccountInfoAsync(o.credentials),
    ]);
    if (artifactComments.err !== null) {
      commentTargets.delete(r);
      return;
    }
    let m = openingCommentExcerpt(artifactComments.threads, t, {
      account: gatewayAccountInfo?.accountUuid?.toLowerCase(),
      tokens: ownPrincipalTokens(),
    });
    if (m === undefined) {
      logFeatureSad("artifact_comment_consent_read", "no_opening_comment");
      commentTargets.delete(r);
      return;
    }
    if (getLiveState().accountEpoch !== accountEpoch) return;
    commentTargets.delete(r);
    commentTargets.set(r, {
      target: m,
      toolUseId: o.toolUseId,
    });
    while (commentTargets.size > MENTION_MAX_CHARS) {
      let u = commentTargets.keys().next().value;
      if (u === undefined) break;
      commentTargets.delete(u);
    }
    return m;
  } catch (error) {
    if (o.abortController.signal.aborted) throw error;
    logFeatureSad("artifact_comment_consent_read", isAbortError(error) ? "deadline" : "read_threw");
    return;
  } finally {
    cleanup();
  }
}
//@ chunk-grzs9chm.js:2550-2709 placement
function describeRolePossessive(access) {
  switch (access) {
    case "owner":
      return "the owner's";
    case "editor":
      return "an editor's";
    case "commenter":
      return "a commenter's";
    case undefined:
      return "a viewer's";
  }
}
//@ chunk-grzs9chm.js:2709-2959 placement
function describeCommentForConsent({ display, access }) {
  switch (display.by) {
    case "user":
      return `your comment "${display.excerpt}"`;
    case "claude":
      return `Claude's comment "${display.excerpt}"`;
    case "viewer":
      return `${describeRolePossessive(access)} comment "${display.excerpt}"`;
    case "unknown":
      return `the comment "${display.excerpt}"`;
  }
}
//@ chunk-grzs9chm.js:2959-3175 placement
function describeThreadForConsent({ display, access }) {
  switch (display.by) {
    case "user":
      return "your comment thread";
    case "claude":
      return "Claude's comment thread";
    case "viewer":
      return `${describeRolePossessive(access)} comment thread`;
    case "unknown":
      return "a comment thread";
  }
}
//@ chunk-grzs9chm.js:3175-3282 placement
function withCommentTarget(e, t) {
  if (t === undefined && !(COMMENT_TARGET_KEY in e)) return;
  let { [COMMENT_TARGET_KEY]: o, ...r } = e;
  return t === undefined
    ? r
    : {
        ...r,
        [COMMENT_TARGET_KEY]: t,
      };
}
export {
  canAskCommentConsent,
  readCommentConsentTarget,
  describeCommentForConsent,
  flattenCommentText,
  withCommentTarget,
  describeThreadForConsent,
  COMMENT_TARGET_KEY,
};
