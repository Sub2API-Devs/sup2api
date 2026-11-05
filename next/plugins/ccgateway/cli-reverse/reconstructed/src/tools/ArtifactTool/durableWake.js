/**
 * tools/ArtifactTool/durableWake.ts
 *
 * 2.1.316 新增：持久唤醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import {
  FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE,
  frameLiveSubscriptionLine,
} from "../../services/artifacts/frameLiveWording.js";
import { isArtifactsAvailable } from "../../services/artifacts/artifactAvailability.js";
import { parseArtifactUrl } from "./constants.js";
import { durableRowFor } from "../../services/artifacts/durableWatch.js";
import {
  getShareEntry,
  getShareEntryForPath,
  shareAudienceMark,
} from "../../services/artifacts/shareEntries.js";
import { expandPath } from "../../utils/path.js";
import { artifactCardTitleOf } from "./artifactUrls.js";
import { publishShimModule } from "./publishEdits.js";

//@ chunk-xzmy9dn4.js:360520-360803 placement
/**
 * 本次发布是回应某线程中发给 Claude 的评论时，提醒也在该线程回复（重新发布不会通知评论者）。
 */
function replyOnThreadNote(seededThread) {
  return `This publish responds to the comment sent to you on thread ${seededThread}. Reply on that thread too (action "reply", this url, thread_id "${seededThread}") so the commenter is notified \u2014 republishing the artifact does not notify them, even if you also answer in this session.`;
}
//@ chunk-xzmy9dn4.js:360803-361105 placement
/**
 * 持久唤醒相关的固定片段：他人 Artifact 读取形式子句、批准覆盖后续重读的说明，以及 relay 未承载订阅的原因前缀与解析正则。
 */
var OTHERS_READ_FORM_CLAUSE =
  "as an isolated summary, or in full wrapped as untrusted content where full reads of shared artifacts are enabled or it was published in your Slack channel";
var REREAD_APPROVAL_CLAUSE = "approving covers re-reads of this artifact for the rest of the conversation";
var DURABLE_UNRELAYED = "durable_unrelayed_";
var regExp_2 = new RegExp(`^${DURABLE_UNRELAYED}(\\d{3})$`);
//@ chunk-xzmy9dn4.js:361105-361167 placement
/**
 * 判断持久唤醒是否未就位（服务拒绝或网关未承载）。
 */
function isDurableNotArmed(status) {
  return status === "durable_refused" || status.startsWith(DURABLE_UNRELAYED);
}
//@ chunk-xzmy9dn4.js:361167-361734 placement
/**
 * 持久唤醒未就位的说明行：服务曾拒绝订阅（403）或网关未承载订阅（relay_unavailable，附 HTTP 状态），只有显式 watch 才会重新检查。
 */
function durableNotArmedLine(reason) {
  if (reason === "durable_refused")
    return "Durable wake subscription: not armed \u2014 the artifact service refused wake subscriptions from this session earlier (subscribe_forbidden: HTTP 403), so nothing will wake this session about this artifact; only an explicit watch re-checks.";
  let httpStatus = regExp_2.exec(reason)?.[1];
  return `Durable wake subscription: not armed \u2014 this session's gateway did not carry a wake subscription earlier (relay_unavailable${httpStatus !== undefined ? `: HTTP ${httpStatus}` : ""}), so nothing will wake this session about this artifact; only an explicit watch re-checks.`;
}
//@ chunk-xzmy9dn4.js:361734-362022 placement
/**
 * 用户之前拒绝了让 Claude 回复评论的询问、因此持久唤醒未就位的说明行。
 */
var DURABLE_DECLINED_LINE =
  "Durable wake subscription: not armed \u2014 an earlier ask in this session, to let Claude reply to this artifact's comments, wasn't approved, so nothing will wake this session about this artifact. If the user wants it watched, their own next message with its link can ask again.";
//@ chunk-xzmy9dn4.js:362022-362421 placement
/**
 * 根据发布结果的 liveSubscription 生成附加说明行：发布上下文简报、durable 被拒、arming/registered/未中继等状态。
 */
function liveSubscriptionLine(result) {
  if (typeof result.liveSubscription !== "string") return "";
  if (result.watchBrief === true && result.liveSubscription === "publish_context")
    return `

${FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE}`;
  if (result.liveSubscription === "durable_declined")
    return `

${DURABLE_DECLINED_LINE}`;
  return `

${result.liveSubscription === "durable_arming" || result.liveSubscription === "durable_registered" || isDurableNotArmed(result.liveSubscription) ? durableWakeStatusLine(result.liveSubscription, typeof result.url === "string" ? result.url : "") : frameLiveSubscriptionLine(result.liveSubscription)}`;
}
//@ chunk-xzmy9dn4.js:362421-363254 placement
/**
 * durable wake 订阅状态说明：已注册（是否重启后恢复）、后台预备中，或未中继/被拒（交给 durableNotArmedLine）；说明会在重新发布或收到评论时唤醒。
 */
function durableWakeStatusLine(state, url) {
  if (isDurableNotArmed(state)) return durableNotArmedLine(state);
  let includesComments = isArtifactsAvailable();
  let slug = parseArtifactUrl(url)?.slug;
  let subscription = slug !== undefined ? durableRowFor(slug) : undefined;
  if (subscription) includesComments = subscription.events.includes("comment");
  let wakeClause = includesComments
    ? "this session is woken by a new turn when this artifact is republished elsewhere, or when anyone sends a comment on it to Claude"
    : "this session is woken by a new turn when this artifact is republished elsewhere";
  return state === "durable_registered"
    ? subscription?.restored
      ? `Durable wake subscription: registered before this session restarted and not re-verified since (no action needed unless the user asks) \u2014 ${wakeClause}.`
      : `Durable wake subscription: already registered from earlier in this session \u2014 ${wakeClause}.`
    : `Durable wake subscription: arming in the background \u2014 not registered yet, so this is not a subscription until \`status\` lists it (you are told if it cannot be registered). Once registered, ${wakeClause}.`;
}
//@ chunk-xzmy9dn4.js:363282-363529 placement
function publishUpdateTarget(input) {
  let hasUrl = typeof input?.url === "string";
  try {
    let artifactUrl = hasUrl ? parseArtifactUrl(input.url) : null;
    let shareEntry =
      artifactUrl !== null
        ? getShareEntry(artifactUrl.slug)
        : !hasUrl && typeof input?.file_path === "string" && input.file_path
          ? getShareEntryForPath(expandPath(input.file_path))
          : undefined;
    return {
      updates: hasUrl || shareEntry !== undefined,
      share: shareEntry,
    };
  } catch {
    return {
      updates: hasUrl,
      share: undefined,
    };
  }
}
//@ chunk-xzmy9dn4.js:363529-364195 placement
/**
 * 生成发布询问/摘要的开头：实时文档垫片、更新已有 Artifact（标题或源文件名）或发布新 Artifact，附受众标记。
 */
function publishSummaryLead(input) {
  let fileTitle = typeof input?.file_path === "string" ? artifactCardTitleOf(basename(input.file_path)) : "";
  let { updates, share } = publishUpdateTarget(input);
  if (publishShimModule != null && input !== undefined) {
    let shimSlug = publishShimModule.publishShimSlug(publishShimModule.fillShimUrl(input));
    if (shimSlug !== undefined && publishShimModule.isPublishShim(input)) {
      let shareEntry = getShareEntry(shimSlug);
      return {
        lead: publishShimModule.liveDocShimSummaryLead(fileTitle, artifactCardTitleOf(shareEntry?.title)),
        marks: shareAudienceMark(shareEntry),
      };
    }
  }
  if (updates) {
    let shareTitle = artifactCardTitleOf(share?.title);
    return {
      lead:
        publishShimModule?.liveDocVersionSource(input) !== undefined && publishShimModule != null
          ? publishShimModule.liveDocVersionSummaryLead(shareTitle)
          : shareTitle !== ""
            ? `update the artifact "${shareTitle}"`
            : fileTitle !== ""
              ? `update an existing artifact from "${fileTitle}"`
              : "update an existing artifact",
      marks: shareAudienceMark(share),
    };
  }
  let titleText = typeof input?.title === "string" ? artifactCardTitleOf(input.title) : "";
  let bestTitle = titleText !== "" ? titleText : fileTitle;
  return {
    lead: bestTitle !== "" ? `publish "${bestTitle}" as an artifact` : "publish an artifact",
    marks: "",
  };
}
export {
  OTHERS_READ_FORM_CLAUSE,
  REREAD_APPROVAL_CLAUSE,
  publishSummaryLead,
  liveSubscriptionLine,
  isDurableNotArmed,
  durableNotArmedLine,
  DURABLE_DECLINED_LINE,
  replyOnThreadNote,
  DURABLE_UNRELAYED,
};
