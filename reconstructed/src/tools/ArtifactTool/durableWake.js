/**
 * tools/ArtifactTool/durableWake.ts
 *
 * 2.1.316 新增：持久唤醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (10)
 * attribution: placement 10
 */
import { basename, basename as basename_2, basename as basename_3 } from "path";
import {
  FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE,
  frameLiveSubscriptionLine,
} from "../../services/artifacts/frameLiveWording.js";
import { Xb } from "../../services/artifacts/artifactAvailability.js";
import { parseArtifactUrl } from "./constants.js";
import { Hye } from "../../services/artifacts/durableWatch.js";
import { artifactCardTitle } from "./artifactUrls.js";
import {
  getShareEntry,
  getShareEntryForPath,
  shareAudienceMark,
} from "../../services/artifacts/shareEntries.js";
import { expandPath } from "../../utils/path.js";
import { X } from "./publishEdits.js";

/**
 * 本次发布是回应某线程中发给 Claude 的评论时，提醒也在该线程回复（重新发布不会通知评论者）。
 */
//@ chunk-8wvtd8sr.js:358250-358533 placement
function replyOnThreadNote(e) {
  return `This publish responds to the comment sent to you on thread ${e}. Reply on that thread too (action "reply", this url, thread_id "${e}") so the commenter is notified \u2014 republishing the artifact does not notify them, even if you also answer in this session.`;
}
/**
 * 持久唤醒相关的固定片段：他人 Artifact 读取形式子句、批准覆盖后续重读的说明，以及 relay 未承载订阅的原因前缀与解析正则。
 */
//@ chunk-8wvtd8sr.js:358533-358835 placement
var OTHERS_READ_FORM_CLAUSE =
    "as an isolated summary, or in full wrapped as untrusted content where full reads of shared artifacts are enabled or it was published in your Slack channel",
  REREAD_APPROVAL_CLAUSE = "approving covers re-reads of this artifact for the rest of the conversation",
  DURABLE_UNRELAYED = "durable_unrelayed_",
  regExp_2 = new RegExp(`^${DURABLE_UNRELAYED}(\\d{3})$`);
//@ chunk-8wvtd8sr.js:358835-358897 placement
function ic(e) {
  return e === "durable_refused" || e.startsWith(DURABLE_UNRELAYED);
}
/**
 * 持久唤醒未就位的说明行：服务曾拒绝订阅（403）或网关未承载订阅（relay_unavailable，附 HTTP 状态），只有显式 watch 才会重新检查。
 */
//@ chunk-8wvtd8sr.js:358897-359464 placement
function durableNotArmedLine(reason) {
  if (reason === "durable_refused")
    return "Durable wake subscription: not armed \u2014 the artifact service refused wake subscriptions from this session earlier (subscribe_forbidden: HTTP 403), so nothing will wake this session about this artifact; only an explicit watch re-checks.";
  let httpStatus = regExp_2.exec(reason)?.[1];
  return `Durable wake subscription: not armed \u2014 this session's gateway did not carry a wake subscription earlier (relay_unavailable${httpStatus !== void 0 ? `: HTTP ${httpStatus}` : ""}), so nothing will wake this session about this artifact; only an explicit watch re-checks.`;
}
/**
 * 用户之前拒绝了让 Claude 回复评论的询问、因此持久唤醒未就位的说明行。
 */
//@ chunk-8wvtd8sr.js:359464-359752 placement
var DURABLE_DECLINED_LINE =
  "Durable wake subscription: not armed \u2014 an earlier ask in this session, to let Claude reply to this artifact's comments, wasn't approved, so nothing will wake this session about this artifact. If the user wants it watched, their own next message with its link can ask again.";
/**
 * 根据发布结果的 liveSubscription 生成附加说明行：发布上下文简报、durable 被拒、arming/registered/未中继等状态。
 */
//@ chunk-8wvtd8sr.js:359752-360151 placement
function liveSubscriptionLine(e) {
  if (typeof e.liveSubscription !== "string") return "";
  if (e.watchBrief === !0 && e.liveSubscription === "publish_context")
    return `

${FRAME_LIVE_PUBLISH_CONTEXT_BRIEF_LINE}`;
  if (e.liveSubscription === "durable_declined")
    return `

${DURABLE_DECLINED_LINE}`;
  return `

${e.liveSubscription === "durable_arming" || e.liveSubscription === "durable_registered" || ic(e.liveSubscription) ? durableWakeStatusLine(e.liveSubscription, typeof e.url === "string" ? e.url : "") : frameLiveSubscriptionLine(e.liveSubscription)}`;
}
/**
 * durable wake 订阅状态说明：已注册（是否重启后恢复）、后台预备中，或未中继/被拒（交给 durableNotArmedLine）；说明会在重新发布或收到评论时唤醒。
 */
//@ chunk-8wvtd8sr.js:360151-360984 placement
function durableWakeStatusLine(state, url) {
  if (ic(state)) return durableNotArmedLine(state);
  let includesComments = Xb(),
    slug = parseArtifactUrl(url)?.slug,
    subscription = slug !== void 0 ? Hye(slug) : void 0;
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
//@ chunk-8wvtd8sr.js:360984-361012 placement
function Js(e) {
  return artifactCardTitle(e);
}
//@ chunk-8wvtd8sr.js:361012-361259 placement
function publishUpdateTarget(e) {
  let n = typeof e?.url === "string";
  try {
    let s = n ? parseArtifactUrl(e.url) : null,
      r =
        s !== null
          ? getShareEntry(s.slug)
          : !n && typeof e?.file_path === "string" && e.file_path
            ? getShareEntryForPath(expandPath(e.file_path))
            : void 0;
    return { updates: n || r !== void 0, share: r };
  } catch {
    return { updates: n, share: void 0 };
  }
}
/**
 * 生成发布询问/摘要的开头：实时文档垫片、更新已有 Artifact（标题或源文件名）或发布新 Artifact，附受众标记。
 */
//@ chunk-8wvtd8sr.js:361259-361925 placement
function publishSummaryLead(e) {
  let n = typeof e?.file_path === "string" ? Js(basename(e.file_path)) : "",
    { updates: updates, share: share } = publishUpdateTarget(e);
  if (X != null && e !== void 0) {
    let publishShimSlug = X.publishShimSlug(X.fillShimUrl(e));
    if (publishShimSlug !== void 0 && X.isPublishShim(e)) {
      let w = getShareEntry(publishShimSlug);
      return { lead: X.liveDocShimSummaryLead(n, Js(w?.title)), marks: shareAudienceMark(w) };
    }
  }
  if (updates) {
    let p = Js(share?.title);
    return {
      lead:
        X?.liveDocVersionSource(e) !== void 0 && X != null
          ? X.liveDocVersionSummaryLead(p)
          : p !== ""
            ? `update the artifact "${p}"`
            : n !== ""
              ? `update an existing artifact from "${n}"`
              : "update an existing artifact",
      marks: shareAudienceMark(share),
    };
  }
  let h = typeof e?.title === "string" ? Js(e.title) : "",
    y = h !== "" ? h : n;
  return { lead: y !== "" ? `publish "${y}" as an artifact` : "publish an artifact", marks: "" };
}

export {
  OTHERS_READ_FORM_CLAUSE,
  REREAD_APPROVAL_CLAUSE,
  Js,
  publishSummaryLead,
  liveSubscriptionLine,
  ic,
  durableNotArmedLine,
  DURABLE_DECLINED_LINE,
  replyOnThreadNote,
  DURABLE_UNRELAYED,
};
