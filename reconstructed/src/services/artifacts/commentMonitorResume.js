/**
 * services/artifacts/commentMonitorResume.ts
 *
 * 2.1.316 新增：恢复会话时重新开启 Artifact 评论监视（自动回复），并在失败时给出原因与操作建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (32)
 * attribution: placement 32
 */
import { open } from "fs/promises";
import {
  MAX_ARTIFACT_COMMENT_TRANSCRIPT_BYTES,
  ARTIFACT_COMMENT_MONITOR_NAME,
} from "../../cli/print/turnStreaming.js";
import { mergeArtifactCommentMonitorEntries, loadTranscriptFromFile } from "../../utils/sessionStorage.js";
import {
  readCommentMonitorIntent,
  takeRestoredMonitorIntents,
  tornStopIntents,
  applyRemoteStops,
} from "./commentMonitor.js";
import { REFUSED_CAPACITY_HINT, REFUSED_CAPACITY_WINDOW, getLiveState } from "../liveReplica/liveReplica.js";
import {
  holderElsewhereText,
  describeHolderWithOthers,
  getHolderTelemetry,
  describeHolderWithOthersComments,
  dropGoneHolders,
  findLiveReplyHolder,
} from "./comments/replyYield.js";
import { plural } from "../../utils/stringUtils.js";
import { nonOpenedFrameUrls, ATTACHED } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import {
  parseArtifactUrl,
  ARTIFACT_SLUG_RE,
  ARTIFACT_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { maybeSubscribeFrameLive, slugRepliesWiredHere, onArmSettled } from "./frameLive.js";
import { isConsentUiKind } from "./comments/repliesConsent.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import {
  takeUnattendedReplies,
  formatAutoReplyNotice,
  addUnattendedReplies,
  canAutoReply,
} from "../artifactComments/autoReplyNotices.js";
import { createSystemMessage } from "../../utils/messages.js";
import { isBgSession, isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { provenSameProcessAsync } from "../../utils/processIdentity.js";
import { isAutoreactArmed } from "./comments/postReply.js";
import { toolMatchesName } from "../../Tool.js";
import { hiddenBuiltInArtifactTool, isBuiltInArtifactHiddenForMcp } from "./artifactsMcpTools.js";
import { hasReplyAllowRule } from "./comments/autoreactGates.js";
import { derivePublishContextFrom, mainObservedArtifactVersion } from "./readObservation.js";
import { isTopHostSession, isClaudecodeSession, isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isArtifactReadOnlySurface } from "./artifactToolGates.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";

//@ chunk-0sfjpx19.js:91945-92607 placement
async function readCommentMonitorLogTail(e) {
  let { path, sessionId, fromByte, baseline } = e;
  let maxAppendedBytes = e.maxAppendedBytes ?? MAX_ARTIFACT_COMMENT_TRANSCRIPT_BYTES;
  let _;
  try {
    let w = await open(path, "r");
    try {
      let { size } = await w.stat();
      if (size < fromByte || size - fromByte > maxAppendedBytes) return null;
      let T = fromByte > 0 ? 1 : 0;
      let D = Buffer.alloc(size - fromByte + T);
      let { bytesRead } = await w.read(D, 0, D.length, fromByte - T);
      if (bytesRead !== D.length) return null;
      _ = D.toString("utf8");
    } finally {
      await w.close();
    }
  } catch {
    return null;
  }
  if (fromByte > 0) {
    if (
      !_.startsWith(`
`)
    )
      return null;
    _ = _.slice(1);
  }
  let b = {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId,
    artifacts: Object.fromEntries(baseline),
  };
  let lines = _.split(`
`);
  if (lines.pop() !== "") return null;
  for (let line of lines) {
    if (!line.includes(ARTIFACT_COMMENT_MONITOR_NAME)) continue;
    let S;
    try {
      S = JSON.parse(line);
    } catch {
      return null;
    }
    if (isCommentMonitorNotification(sessionId, S)) b = mergeArtifactCommentMonitorEntries(b, S);
  }
  return readCommentMonitorIntent(b);
}
//@ chunk-0sfjpx19.js:92607-92744 placement
function isCommentMonitorNotification(sessionId, n) {
  return (
    typeof n === "object" &&
    n !== null &&
    "type" in n &&
    n.type === "artifact-comment-monitor" &&
    "sessionId" in n &&
    n.sessionId === sessionId
  );
}
//@ chunk-0sfjpx19.js:92744-92793 placement
var watchLimitText = `past the limit of ${REFUSED_CAPACITY_HINT} watched at once`;
//@ chunk-0sfjpx19.js:92793-94278 placement
function formatAutoReplyNotResumedShort(e, n, { backgroundSession, liveHolder, jobStamped }) {
  let y = `Automatic replies didn't resume for ${e}`;
  let _ = backgroundSession ? "open this session and " : "";
  let b = backgroundSession ? "open this session and publish it again" : "publish it again here";
  switch (n) {
    case "auto_replies_disabled":
      return `${y} \xB7 turned off in this session`;
    case "stop_latched":
    case "recorded_stop":
      return `Automatic replies stayed off for ${e} \xB7 ${_}ask Claude to watch it again, then publish it`;
    case "record_incomplete":
      return `${y} \xB7 ${_}ask Claude to watch it again, then publish it`;
    case "not_editor":
      return `${y} \xB7 this account can't publish to it`;
    case "holder_unknown":
      return `${y} \xB7 ${b} if this conversation isn't open elsewhere`;
    case "arm_in_flight":
      return `Automatic replies for ${e} were still starting \xB7 /tasks to check`;
    case "held_by_live_session":
      return `Automatic replies didn't resume here for ${e} \xB7 this conversation is also open in ${holderElsewhereText(liveHolder)}; ${describeCloseHolders(liveHolder)}${liveHolder?.surface === "background" || jobStamped ? ", then publish it again here" : " and resume again here"}`;
    case "held_by_job":
      return `Automatic replies didn't resume here for ${e} \xB7 a background agent keeps them while it runs; if it has ended, publish it again here`;
    case "other_org":
      return `${y} \xB7 /login to its organization, then ${b}`;
    case "public_outside_org":
      return `${y} \xB7 a public Artifact from outside your organization can't be watched`;
    case "watch_cap":
    case "watch_cap_reconnect":
      return `${y} \xB7 ${watchLimitText}; ${_}publish it again`;
    default:
      return `${y} \xB7 ${_}publish it again`;
  }
}
//@ chunk-0sfjpx19.js:94278-94832 placement
function formatAutoReplyNotResumedList(e, n, r) {
  let s = e.length - 1;
  let h = `${e[0] ?? "these Artifacts"}${s > 0 ? ` and ${s} more` : ""}`;
  let y = s > 0 ? "one" : "it";
  let _ = `Automatic replies didn't resume for ${h}`;
  switch (n) {
    case "watch_cap":
      return `${_} \xB7 ${watchLimitText}; publish ${y} again`;
    case "unprovable":
    case "switched":
      return `${_} \xB7 ask Claude to watch ${y}, or publish it again`;
    case "incomplete":
      return `${_} \xB7 ask Claude to watch ${y}, then publish it`;
    case "held":
      return `Automatic replies didn't resume here for ${h} \xB7 this conversation is also open in ${holderElsewhereText(r)}; ${describeCloseHolders(r)} first, then publish again here`;
  }
}
//@ chunk-0sfjpx19.js:94832-95047 placement
function describeCloseHolders(e) {
  let others = e?.others ?? 0;
  if (e?.surface === "background")
    return `stop that agent with \`claude agents\`${others > 0 ? ` and close the other ${plural(others, "session")}` : ""}`;
  return others > 0 ? "close those sessions" : "close that session";
}
//@ chunk-0sfjpx19.js:95047-99325 placement
/**
 * 生成"自动回复未恢复"的说明（repl/短格式，指导重新发布或让 Claude 再监视）。
 */
function formatAutoReplyNotResumed(e, n, { backgroundSession, liveHolder, jobStamped = false, ui = "repl" }) {
  if (ui === "replShort")
    return formatAutoReplyNotResumedShort(e, n, {
      backgroundSession,
      liveHolder,
      jobStamped,
    });
  let _ = backgroundSession
    ? "Open this session and ask Claude to watch it again"
    : "Ask Claude to watch it again";
  switch (n) {
    case "auto_replies_disabled":
      return `Artifact comment monitor for ${e} didn't resume: automatic replies are turned off in this session.`;
    case "stop_latched":
      return `Artifact comment monitor for ${e} is still off \u2014 watching this Artifact was stopped earlier in this session. ${_}; automatic replies resume with the next publish after that.`;
    case "stale_handoff":
      return formatRepublishHint(e, "this session was in the background too long", backgroundSession);
    case "comments_unavailable":
      return formatRepublishHint(e, "comments aren't available in this session", backgroundSession);
    case "recorded_stop":
      return `Automatic replies for ${e} are still off \u2014 they were stopped last time. ${_}; replies come back with the next publish after that.`;
    case "record_incomplete":
      return `Automatic replies for ${e} were not resumed: this conversation's saved watch state was incomplete. ${_}; replies come back with the next publish after that.`;
    case "not_editor":
      return `Artifact comment monitor for ${e} didn't resume: only a publisher's earlier decision carries across a resume or a handoff, and this account can't publish to that Artifact, so it cannot reply to its comments automatically from here.`;
    case "holder_unknown":
      return `Artifact comment monitor for ${e} didn't resume its automatic replies: this session couldn't confirm that no other session of this conversation is already replying for it. If no other session is running, ${backgroundSession ? "open this session and publish the Artifact again" : "publish the Artifact again here"} to turn them back on.`;
    case "arm_in_flight":
      return ui === "host"
        ? `Automatic replies for ${e} are still starting up; ask Claude for that artifact's status to see whether they came back.`
        : `Automatic replies for ${e} are still starting up; /tasks will show whether they came back.`;
    case "held_by_live_session":
      return ui === "host"
        ? `Artifact comment monitor for ${e} didn't resume its automatic replies here: this conversation is also open in ${holderElsewhereText(liveHolder)}, which may already be replying to this artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`
        : `Artifact comment monitor for ${e} didn't resume its automatic replies here: this conversation is also open in ${holderElsewhereText(liveHolder)}, which may already be replying to this Artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`;
    case "held_by_job":
      return ui === "host"
        ? `Artifact comment monitor for ${e} didn't resume its automatic replies here: they were last turned on from a background agent of this conversation, which keeps them while it runs. If that agent has ended, publish the artifact again here to turn them back on.`
        : `Artifact comment monitor for ${e} didn't resume its automatic replies here: they were last turned on from a background agent of this conversation, which keeps them while it runs (see \`claude agents\`). If that agent has ended, publish the Artifact again here to turn them back on.`;
    case "other_org": {
      let b = backgroundSession ? "open this session and publish it again" : "publish it again here";
      return ui === "host"
        ? `Artifact comment monitor for ${e} didn't resume: this artifact is in another of your organizations. Sign in to that organization, then ${b} to turn automatic replies back on.`
        : `Artifact comment monitor for ${e} didn't resume: this Artifact is in another of your organizations. Run /login and sign in to that organization, then ${b} to turn automatic replies back on.`;
    }
    case "public_outside_org":
      return ui === "host"
        ? `Artifact comment monitor for ${e} didn't resume: this is a public artifact from outside your organization. It can be read here, but its comments can't be watched from this account.`
        : `Artifact comment monitor for ${e} didn't resume: this is a public Artifact from outside your organization. It can be read here, but its comments can't be watched from this account.`;
    case "watch_cap":
    case "watch_cap_reconnect":
      return `Artifact comment monitor for ${e} didn't resume: this session can watch at most ${REFUSED_CAPACITY_HINT} artifacts at once. ${backgroundSession ? "Open this session and publish the artifact again" : "Publish the artifact again"} to turn automatic replies back on. If that's refused too, ask Claude to stop watching one first.`;
    default:
      return formatRepublishHint(e, "it couldn't restart in this session", backgroundSession);
  }
}
//@ chunk-0sfjpx19.js:99325-99849 placement
function describeMonitorHolder(liveHolder, jobStamped, r) {
  let others = liveHolder?.others ?? 0;
  let h = r === "host" ? "artifact" : "Artifact";
  if (liveHolder?.surface === "background") {
    let b = others > 0 ? ` and close the other ${plural(others, "session")}` : "";
    return `${r === "host" ? "Stop that agent" : "Stop it with `claude agents`"}${b}, then publish the ${h} again here to turn them back on.`;
  }
  let y = others > 0 ? "Close those sessions" : "Close that session";
  let _ = others > 0 ? "keep using them there" : "keep using it there";
  return jobStamped
    ? `${y}, then publish the ${h} again here to move the replies.`
    : `${y} and resume again here to move the replies, or ${_}.`;
}
//@ chunk-0sfjpx19.js:99849-100051 placement
function formatRepublishHint(e, n, backgroundSession) {
  return `Artifact comment monitor for ${e} didn't resume: ${n}. ${backgroundSession ? "Open this session and publish the Artifact again" : "Publish the Artifact again"} to turn automatic replies back on.`;
}
//@ chunk-0sfjpx19.js:100051-100213 placement
function summarizeResumeLosses(e) {
  return {
    countsAsLoss: e.some((n) => n.stale !== true),
    warnings: e.slice(0, REFUSED_CAPACITY_WINDOW).map((n) => ({
      slug: n.slug,
      reason: n.stale === true ? "stale_handoff" : "unavailable",
    })),
  };
}
//@ chunk-0sfjpx19.js:100213-100532 placement
/**
 * 从会话记录里找出最近引用的 artifact（不是目标 slug 时）：在 frameUrls 里匹配同 slug 的链接，返回 slug、查看链接与已读版本；无版本时只认附件路径。
 */
function findAttachedArtifactRef(e, n) {
  let slug = e.artifactRefs?.[0]?.slug;
  if (slug === undefined || slug === n) return null;
  let s = e.artifactReadVersions?.[slug] || undefined;
  for (let [h, y] of nonOpenedFrameUrls(e.frameUrls ?? {})) {
    let artifactUrl = parseArtifactUrl(y.url);
    if (artifactUrl === null || artifactUrl.slug !== slug) continue;
    if (s === undefined && !h.startsWith(ATTACHED)) return null;
    return {
      slug,
      url: artifactViewerUrlFor(artifactUrl),
      ...(s !== undefined && {
        version: s,
      }),
    };
  }
  return null;
}
//@ chunk-0sfjpx19.js:100532-100675 placement
function formatNotResumedPrefix(e) {
  let sliced = e.slice(0, 2);
  let r = e.length - sliced.length;
  return `Automatic replies were not resumed for ${sliced.join(", ")}${r > 0 ? ` and ${r} more` : ""}`;
}
//@ chunk-0sfjpx19.js:100675-101053 placement
function describeUnprovableResume(e, n = "unprovable", r = "repl") {
  if (r === "replShort") return formatAutoReplyNotResumedList(e, n);
  return n === "watch_cap"
    ? `${formatNotResumedPrefix(e)}: this session can watch at most ${REFUSED_CAPACITY_HINT} artifacts at once. Publish one of these again to turn its replies back on. If that's refused too, ask Claude to stop watching one first.`
    : `${formatNotResumedPrefix(e)}. Ask Claude to watch one of these, or publish it again, to turn its replies back on.`;
}
//@ chunk-0sfjpx19.js:101053-101307 placement
/**
 * 会话内切换对话后评论监听不会恢复的提示：列出 artifact，建议重新发布或让 Claude 重新监听（短格式时只给列表）。
 */
function describeNotResumedAfterSwitch(e, n = "repl") {
  if (n === "replShort") return formatAutoReplyNotResumedList(e, "switched");
  return `${formatNotResumedPrefix(e)} \u2014 switching conversations inside a session doesn't bring comment monitors back. Publish the Artifact again, or ask Claude to watch it, to turn its replies back on.`;
}
//@ chunk-0sfjpx19.js:101307-101535 placement
/**
 * 会话保存的监听状态不完整、自动回复未恢复的提示（短格式时只给列表）。
 */
function describeNotResumedIncomplete(e, n = "repl") {
  if (n === "replShort") return formatAutoReplyNotResumedList(e, "incomplete");
  return `${formatNotResumedPrefix(e)}: this conversation's saved watch state was incomplete. Ask Claude to watch one of these; replies come back with the next publish after that.`;
}
//@ chunk-0sfjpx19.js:101535-102325 placement
function describeHeldMonitor(e, n, r = "repl") {
  if (r === "replShort") return formatAutoReplyNotResumedList(e, "held", n);
  let others = n?.others ?? 0;
  let h =
    n !== undefined
      ? `it is also open in ${describeHolderWithOthers(n)}`
      : "another live session of it is running";
  let y =
    others > 0
      ? "If one of those sessions holds these monitors, replies continue there, and publishing again here while it does would make two sessions reply"
      : "If that session holds these monitors, replies continue there, and publishing again here while it does would make both sessions reply";
  let _ = others > 0 ? ` and close the other ${plural(others, "session")}` : "";
  let b =
    n?.surface === "background"
      ? `stop that agent${r === "host" ? "" : " with `claude agents`"}${_}`
      : others > 0
        ? "close those sessions"
        : "close that session";
  return `${formatNotResumedPrefix(e)} in this conversation \u2014 ${h}. ${y}; ${b} first, then publish the ${r === "host" ? "artifact" : "Artifact"} again here to move them.`;
}
//@ chunk-0sfjpx19.js:102325-102405 placement
function heldReasonOrFallback(holder, n) {
  return heldReasonFor(holder, n) ?? (n === "unknown" ? "holder_unknown" : "unavailable");
}
//@ chunk-0sfjpx19.js:102405-102896 placement
function classifyMonitorHold(e, n) {
  let r =
    e === "held_by_live_session"
      ? "resume_held_live"
      : e === "held_by_job"
        ? "resume_held_job"
        : e === "holder_unknown"
          ? "resume_holder_unknown"
          : null;
  if (r === null) return;
  logFeatureSad("artifact_live_subscribe", r, {
    path: fromEnum(n.path),
    probed: n.probed,
    armed_monitor_count: n.monitors,
    job_stamped: n.jobStamped,
    takeover: fromEnum(n.takeover),
    job_holder: fromEnum(n.jobHolder),
    ...(n.surface !== undefined && {
      surface: n.surface,
    }),
    holder_count: n.liveHolder !== undefined ? 1 + n.otherHolders : 0,
    ...(n.liveHolder !== undefined && getHolderTelemetry(n.liveHolder, n.now)),
  });
}
//@ chunk-0sfjpx19.js:102896-102991 placement
function heldReasonFor(e, n) {
  if (n === "live") return "held_by_live_session";
  return e === "bg" ? "held_by_job" : null;
}
//@ chunk-0sfjpx19.js:102991-103069 placement
function resumeNotice(e, n, r, s = "repl") {
  return n === "live" ? describeHeldMonitor(e, r, s) : describeUnprovableResume(e, "unprovable", s);
}
//@ chunk-0sfjpx19.js:103069-103122 placement
/**
 * 导出函数 `otherArmedSlugs`：参数 e, n，返回 listOtherArmedSlugs(e, {}).filter((r) => !n(r))。
 */
function otherArmedSlugs(e, isAutoReactWired) {
  return listOtherArmedSlugs(e, {}).filter((r) => !isAutoReactWired(r));
}
//@ chunk-0sfjpx19.js:103122-103283 placement
function getCommentsUnavailableReason(e) {
  if (e.tool === undefined || e.commentVerbsInSchema !== true) return "comments_unavailable";
  if (e.autoReactEnabled === false) return "auto_replies_disabled";
  return null;
}
//@ chunk-0sfjpx19.js:103283-103385 placement
function getResumeIssueLevel(e) {
  return e === "stop_latched" || e === "recorded_stop" || e === "arm_in_flight" ? "notice" : "warning";
}
//@ chunk-0sfjpx19.js:103385-103569 placement
function findResumeTarget(frameState, startupWatchSlug, r) {
  let s =
    findAttachedArtifactRef(frameState, startupWatchSlug) ??
    findLatestArmedSlug(frameState, startupWatchSlug, r);
  if (s === null) return null;
  let h = r?.get(s.slug);
  return h?.state === "armed"
    ? {
        slug: s.slug,
        url: s.url,
        ...(h.holder !== undefined && {
          holder: h.holder,
        }),
      }
    : null;
}
//@ chunk-0sfjpx19.js:103569-103775 placement
function listOtherArmedSlugs(e, n) {
  return [...e]
    .filter(
      ([r, s]) =>
        s.state === "armed" &&
        s.holder === undefined &&
        r !== n.targetSlug &&
        r !== n.excludeSlug &&
        !(n.named?.has(r) ?? false),
    )
    .sort(([, r], [, s]) => s.writtenAtMs - r.writtenAtMs)
    .map(([r]) => r);
}
//@ chunk-0sfjpx19.js:103775-104077 placement
/**
 * 在评论监控记录中找出最近写入、未被持有且不是当前 artifact 的已布防 slug，用于恢复会话时提示。
 */
function findLatestArmedSlug(e, n, r) {
  if (r === undefined) return null;
  if (n !== undefined && e.artifactRefs?.[0]?.slug === n) return null;
  let s;
  for (let [h, y] of r)
    if (
      y.state === "armed" &&
      y.holder === undefined &&
      h !== n &&
      ARTIFACT_SLUG_RE.test(h) &&
      (s === undefined || y.writtenAtMs > s[1].writtenAtMs)
    )
      s = [h, y];
  return s === undefined
    ? null
    : {
        slug: s[0],
        url: artifactViewerUrlFor({
          slug: s[0],
          env: claudeAiEnvironment(),
        }),
      };
}
//@ chunk-0sfjpx19.js:104077-104978 placement
function describeWsOpenOutcome(e) {
  let { slug, url, record } = e;
  (e.arm ?? maybeSubscribeFrameLive)({
    slug,
    url,
    publishContext: e.publishContext,
    getKnownVer: () => e.getKnownVer(slug),
    sessionResume: true,
    ...(e.seedFromBoot && {
      seedKnownVerFromBoot: true,
    }),
    tool: e.tool,
    commentVerbsInSchema: true,
    ...(record?.title !== undefined && {
      title: record.title,
    }),
    resumedPublishConsent: true,
    onOpen: () => {},
    onGiveUp: () => e.onCarriedSkip?.(slug, "ws_open_error"),
    context: e.context,
  }).then(
    (y) => {
      if (y.outcome === "skipped" && y.reason === "cancelled") e.onNotArmed?.(slug);
      else if (y.outcome === "skipped") e.onCarriedSkip?.(slug, y.reason);
      else if (y.outcome === "armed" && y.degraded === "not_editor") e.onCarriedSkip?.(slug, "not_editor");
      else if (
        y.outcome === "already_watching" &&
        y.taskId !== undefined &&
        getLiveState().live.supervisors.get(slug)?.autoReactWiring !== undefined
      );
      else if (y.outcome === "already_watching" && y.taskId === undefined)
        e.onCarriedSkip?.(slug, "arm_in_flight");
      else if (y.outcome === "already_watching") e.onNotArmed?.(slug);
    },
    () => {
      e.onNotArmed?.(slug);
    },
  );
}
//@ chunk-0sfjpx19.js:104978-108279 placement
/**
 * 决定恢复时为哪个 Artifact 重新武装评论监视（记录不完整、已停止、被其他会话持有）。
 */
function planCommentMonitorRearm(e) {
  let { state, excludeSlug, getKnownVer, context, publishContext } = e;
  let arm = e.arm ?? maybeSubscribeFrameLive;
  let resumedIntent =
    publishContext !== "bg_session" && isConsentUiKind(publishContext) ? e.resumedIntent : undefined;
  let attachedArtifactRef = findAttachedArtifactRef(state, excludeSlug);
  let w = attachedArtifactRef ?? findLatestArmedSlug(state, excludeSlug, resumedIntent);
  let seedFromBoot = attachedArtifactRef?.version === undefined;
  let record = w === null ? undefined : resumedIntent?.get(w.slug);
  let D = new Set();
  let E = (slug) => (e.tornStops?.has(slug) === true ? "record_incomplete" : "recorded_stop");
  let N = new Set();
  let G = excludeSlug === undefined ? REFUSED_CAPACITY_HINT : REFUSED_CAPACITY_HINT - 1;
  let R = 0;
  if (e.carried !== undefined && e.carried.length > 0) {
    let env = claudeAiEnvironment();
    let V = [];
    for (let j of e.carried.slice(0, REFUSED_CAPACITY_WINDOW)) {
      let pe = artifactViewerUrlFor({
        slug: j.slug,
        env,
      });
      if (parseArtifactUrl(pe)?.slug !== j.slug) continue;
      if (j.slug === excludeSlug) continue;
      if (j.stale === true) {
        if (e.resumedIntent?.get(j.slug)?.state === "stopped") {
          e.onCarriedSkip?.(j.slug, E(j.slug));
          N.add(j.slug);
        } else if (resumedIntent?.get(j.slug)?.state !== "armed") {
          e.onCarriedSkip?.(j.slug, "stale_handoff");
          N.add(j.slug);
        }
        continue;
      }
      N.add(j.slug);
      let commentsUnavailableReason = getCommentsUnavailableReason(e);
      if (commentsUnavailableReason !== null) {
        e.onCarriedSkip?.(j.slug, commentsUnavailableReason);
        continue;
      }
      if (D.has(j.slug)) continue;
      D.add(j.slug);
      if (V.length >= G) {
        e.onCarriedSkip?.(j.slug, "watch_cap");
        continue;
      }
      V.push({
        entry: j,
        url: pe,
      });
    }
    R = V.length;
    if (V.length > 0) e.parkInFlight?.park(V.map((j) => j.entry));
    for (let { entry, url } of V)
      arm({
        slug: entry.slug,
        url,
        publishContext,
        getKnownVer: () => getKnownVer(entry.slug),
        ...(e.tool !== undefined && {
          tool: e.tool,
        }),
        ...(e.commentVerbsInSchema !== undefined && {
          commentVerbsInSchema: e.commentVerbsInSchema,
        }),
        ...(entry.title !== undefined && {
          title: entry.title,
        }),
        carriedPublishConsent: true,
        sessionResume: true,
        context,
      }).then(
        (me) => {
          e.parkInFlight?.release(entry.slug);
          if (me.outcome === "skipped") {
            if (me.reason !== "cancelled") e.onCarriedSkip?.(entry.slug, me.reason);
          } else if (me.outcome === "armed" && me.degraded === "not_editor")
            e.onCarriedSkip?.(entry.slug, "not_editor");
          else e.onCarriedArmed?.(entry.slug);
        },
        () => {},
      );
  }
  let holderProbe = e.holderProbe ?? "unknown";
  let U = holderProbe === "live" ? (e.freedSlugs ?? new Set()) : undefined;
  let L = (slug) => (U?.has(slug) === true ? "none" : holderProbe);
  let oe = heldReasonFor(record?.holder, w !== null ? L(w.slug) : holderProbe);
  let te = (z) => {
    if (resumedIntent === undefined) return;
    for (let ce of e.tornStops ?? [])
      if (ce !== w?.slug && ce !== excludeSlug && !N.has(ce) && resumedIntent.get(ce)?.state === "stopped")
        e.onCarriedSkip?.(ce, "record_incomplete");
    if (holderProbe === "live" && (U === undefined || U.size === 0)) return;
    let filtered = listOtherArmedSlugs(resumedIntent, {
      ...(w !== null && {
        targetSlug: w.slug,
      }),
      ...(excludeSlug !== undefined && {
        excludeSlug,
      }),
      named: N,
    }).filter((ce) => ARTIFACT_SLUG_RE.test(ce) && (U === undefined || U.has(ce)));
    let tool =
      (holderProbe === "none" || U !== undefined) && getCommentsUnavailableReason(e) === null
        ? e.tool
        : undefined;
    let pe = tool !== undefined ? Math.max(0, G - R - (z ? 1 : 0)) : 0;
    let sliced = filtered.slice(0, pe);
    if (filtered.length > sliced.length)
      e.onRecordedNotResumed?.(
        filtered.slice(sliced.length),
        tool !== undefined ? "watch_cap" : "unprovable",
      );
    if (tool !== undefined)
      for (let ce of sliced)
        ne(
          tool,
          ce,
          artifactViewerUrlFor({
            slug: ce,
            env: claudeAiEnvironment(),
          }),
          resumedIntent.get(ce),
          getKnownVer(ce) === undefined,
        );
  };
  if (w === null || D.has(w.slug)) {
    te(false);
    return;
  }
  if (record?.state === "stopped") {
    if (!N.has(w.slug)) e.onCarriedSkip?.(w.slug, E(w.slug));
    te(false);
    return;
  }
  let Q = false;
  if (record?.state === "armed" && N.has(w.slug));
  else if (record?.state === "armed" && oe !== null) e.onCarriedSkip?.(w.slug, oe);
  else if (record?.state === "armed")
    if (holderProbe === "unknown") e.onCarriedSkip?.(w.slug, "holder_unknown");
    else {
      let commentsUnavailableReason = getCommentsUnavailableReason(e);
      if (commentsUnavailableReason !== null) e.onCarriedSkip?.(w.slug, commentsUnavailableReason);
      else Q = true;
    }
  function ne(tool, slug, url, record, seedFromBoot) {
    describeWsOpenOutcome({
      slug,
      url,
      record,
      seedFromBoot,
      tool,
      context,
      publishContext,
      getKnownVer,
      ...(e.onCarriedSkip !== undefined && {
        onCarriedSkip: e.onCarriedSkip,
      }),
      ...(e.onNotArmed !== undefined && {
        onNotArmed: e.onNotArmed,
      }),
      arm,
    });
  }
  if (R >= G) {
    if (Q) e.onCarriedSkip?.(w.slug, "watch_cap");
    te(false);
    return;
  }
  if (Q && e.tool !== undefined) ne(e.tool, w.slug, w.url, record, seedFromBoot);
  else
    arm({
      slug: w.slug,
      url: w.url,
      publishContext,
      getKnownVer: () => getKnownVer(w.slug),
      sessionResume: true,
      ...(seedFromBoot && {
        seedKnownVerFromBoot: true,
      }),
      context,
    }).catch(() => {});
  te(true);
}
//@ chunk-0sfjpx19.js:108279-108400 placement
/**
 * 恢复会话时重新开启评论监听，异常只记日志不抛出。
 */
function rearmOnResumeSafe(e, n, orchestration) {
  try {
    rearmCommentMonitorsOnResume(e, n, orchestration);
  } catch (error) {
    logForDebugging(`[frame-live] resume re-arm prelude failed: ${errorMessage(error)}`, {
      level: "error",
    });
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:108400-116982 placement
/**
 * 恢复时重新订阅 Artifact 评论（frame-live），记录结果并通知（约 8.5 KB）。
 */
function rearmCommentMonitorsOnResume(e, n, r) {
  let { initialMessages, startupWatchSlug, storageV5 } = e;
  let { emit } = n;
  let carried = n.carried;
  let surface = fromEnum(n.publishContext === "bg_session" ? "bg_session" : n.ui);
  let w = "unknown";
  let probed = false;
  let T;
  let D = [];
  let holdersIncomplete = false;
  let N;
  let G = "not_attempted";
  let R = (re) => (T !== undefined ? describeHolderWithOthersComments(T, D.length, re) : undefined);
  let P = 0;
  let U = new Set();
  let L = new Set();
  let oe = false;
  let te = false;
  let Q = new Map();
  let ne = false;
  let z = false;
  let V = [];
  let j = new Map();
  let pe = (re, path, se, now) => {
    if (te || oe || (re !== "held_by_live_session" && re !== "held_by_job" && re !== "holder_unknown"))
      return;
    te = true;
    classifyMonitorHold(re, {
      path,
      probed,
      liveHolder: T,
      otherHolders: D.length,
      monitors: Math.max(1, P),
      jobStamped: se !== undefined ? U.has(se) || j.has(se) : U.size > 0 || j.size > 0,
      jobHolder: se !== undefined ? (j.get(se) ?? "none") : "none",
      takeover: G,
      surface,
      now,
    });
  };
  let me = (re, x = new Set()) => {
    let se = count([...L], (ue) => !x.has(ue));
    let filtered = [...U].filter((ue) => !x.has(ue));
    if (w !== "none" && se > 0)
      pe(w === "live" ? "held_by_live_session" : "holder_unknown", re, undefined, Date.now());
    else if (filtered.length > 0) pe("held_by_job", re, filtered[0], Date.now());
  };
  let ce = (slug, x, se) => {
    let Z = Q.get(slug);
    if (ne && Z !== undefined && (Z !== "held_by_live_session" || se === Z)) return;
    Q.set(slug, se);
    let now = Date.now();
    pe(se, "rearm", slug, now);
    let ae = takeUnattendedReplies(slug);
    (se === "held_by_live_session" && z
      ? (messages) => {
          V.push({
            slug,
            messages,
          });
        }
      : emit)([
      ...(ae > 0
        ? [
            formatAutoReplyNotice(ae, {
              where: ` on ${x}`,
              stop: "",
            }),
          ]
        : []),
      createSystemMessage(
        formatAutoReplyNotResumed(x, se, {
          backgroundSession: isBgSession(),
          ui: uiKind(n),
          liveHolder: R(now),
          jobStamped: U.has(slug),
        }),
        getResumeIssueLevel(se),
      ),
    ]);
  };
  let Fe = (entries) => {
    let x = summarizeResumeLosses(entries);
    if (x.countsAsLoss)
      logFeatureSad("artifact_live_subscribe", "carried_consent_dropped", {
        surface,
      });
    let env = claudeAiEnvironment();
    for (let warning of x.warnings) {
      let ue = artifactViewerUrlFor({
        slug: warning.slug,
        env,
      });
      if (parseArtifactUrl(ue)?.slug !== warning.slug) continue;
      ce(warning.slug, ue, warning.reason);
    }
  };
  let Ne = (r?.readRecords ?? takeRestoredMonitorIntents)({
    ...(startupWatchSlug !== undefined && {
      excludeSlug: startupWatchSlug,
    }),
    ...(storageV5 !== undefined && {
      storageV5,
    }),
  });
  let sessionId = getSessionId();
  let Pe = (re) => {
    z = false;
    let x = V.splice(0);
    if (getSessionId() !== sessionId) return;
    let flattened = x.flatMap((Z) => Z.messages.slice(0, -1));
    if (flattened.length > 0) emit(flattened);
    for (let Z of x) {
      if (re === "drop" || slugRepliesWiredHere(Z.slug)) continue;
      if (re === "say") emit(Z.messages.slice(-1));
      else
        ce(
          Z.slug,
          artifactViewerUrlFor({
            slug: Z.slug,
            env: claudeAiEnvironment(),
          }),
          re,
        );
    }
  };
  let Ie = () => Pe("say");
  if ((!initialMessages || initialMessages.length === 0) && Ne.size === 0) return;
  if (
    carried === undefined &&
    Ne.size === 0 &&
    findAttachedArtifactRef(n.readFrameState(), startupWatchSlug) === null
  )
    return;
  let M = isActingAsBgJob() ? undefined : Ne;
  let q = () => {
    let filtered = [...(M ?? new Map()).entries()].filter(([, x]) => x.state === "armed");
    P = filtered.length;
    U = new Set(filtered.filter(([, x]) => x.holder === "bg").map(([x]) => x));
    L = new Set(filtered.filter(([, x]) => x.holder !== "bg").map(([x]) => x));
  };
  q();
  let le = () => findResumeTarget(n.readFrameState(), startupWatchSlug, M);
  let be = (re = []) => {
    let x = le();
    let se = new Set(re.map((he) => he.slug));
    let Z = [];
    if (x !== null && !se.has(x.slug)) {
      let he = heldReasonOrFallback(x.holder, w);
      let now = Date.now();
      pe(he, "cannot_run", x.slug, now);
      Z.push(
        formatAutoReplyNotResumed(x.url, he, {
          backgroundSession: isBgSession(),
          ui: uiKind(n),
          liveHolder: R(now),
          jobStamped: x.holder === "bg",
        }),
      );
    }
    let env = claudeAiEnvironment();
    let ae =
      M === undefined
        ? []
        : listOtherArmedSlugs(M, {
            ...(x !== null && {
              targetSlug: x.slug,
            }),
            ...(startupWatchSlug !== undefined && {
              excludeSlug: startupWatchSlug,
            }),
            named: se,
          }).map((slug) =>
            artifactViewerUrlFor({
              slug,
              env,
            }),
          );
    if (ae.length > 0) me("cannot_run");
    if (Z.length > 0 || ae.length > 0)
      emit([
        ...Z.map((he) => createSystemMessage(he, "warning")),
        ...(ae.length > 0
          ? [createSystemMessage(resumeNotice(ae, w, R(Date.now()), uiKind(n)), "notice")]
          : []),
      ]);
  };
  let Se = false;
  let ve;
  n.gate()
    .then(async ({ toolUseContext, allowed }) => {
      let adopted = await carried?.adopted;
      let entries = adopted?.entries ?? [];
      let park = adopted?.park;
      let ae = entries.length > 0 && park !== undefined ? park.take() : [];
      if (entries.length > 0 && park !== undefined && ae.length === 0) return;
      ve = entries;
      for (let entry of entries.slice(0, REFUSED_CAPACITY_WINDOW))
        if (entry.unattendedReplies !== undefined) addUnattendedReplies(entry.slug, entry.unattendedReplies);
      let any = entries.some((entry) => entry.stale !== true);
      if (allowed && M !== undefined && U.size > 0 && n.jobHolderVerdicts !== undefined)
        try {
          j = await n.jobHolderVerdicts(M, storageV5, Date.now());
          M = dropGoneHolders(M, j);
          q();
          let J = count([...j.values()], (ie) => ie === "gone");
          if (J > 0)
            logFeatureOk("artifact_live_subscribe", {
              job_holder_gone: J,
              surface,
            });
        } catch {
          logFeatureSad("artifact_live_subscribe", "job_holder_probe_failed", {
            surface,
          });
        }
      let filtered = [...(M ?? new Map()).values()].filter((J) => J.state === "armed");
      let Je = filtered.length > 0;
      let any_2 = filtered.some((J) => J.holder !== "bg");
      let kn = async () =>
        findLiveReplyHolder({
          records: await (
            r?.listSessionRecords ?? (await import("./chunk-ewxn4535.js")).listRegisteredSessionRecords
          )(),
          sessionId,
          selfPid: process.pid,
          isRunning: r?.isRunning ?? isProcessRunning,
          isSameProcess: r?.isSameProcess ?? provenSameProcessAsync,
        });
      if (allowed && (le() !== null || Je))
        try {
          let J = await kn();
          probed = true;
          w = J.verdict;
          T = J.holder;
          D = J.otherHolders ?? [];
          holdersIncomplete = J.verdict === "live" && J.unproven === true;
        } catch {
          oe = true;
          logFeatureSad("artifact_live_subscribe", "holder_probe_failed", {
            surface,
          });
        }
      let attachedArtifactRef = findAttachedArtifactRef(n.readFrameState(), startupWatchSlug);
      let wn =
        M === undefined
          ? []
          : [...M.entries()]
              .filter(
                ([J, ie]) =>
                  ie.state === "armed" &&
                  ie.holder !== "bg" &&
                  J !== startupWatchSlug &&
                  !entries.some((entry) => entry.slug === J),
              )
              .sort(
                ([J, ie], [_e, Ae]) =>
                  Number(_e === attachedArtifactRef?.slug) - Number(J === attachedArtifactRef?.slug) ||
                  Ae.writtenAtMs - ie.writtenAtMs,
              )
              .map(([J]) => J)
              .slice(
                0,
                Math.max(
                  0,
                  REFUSED_CAPACITY_HINT -
                    (startupWatchSlug !== undefined ? 1 : 0) -
                    entries.length -
                    (attachedArtifactRef !== null &&
                    M?.get(attachedArtifactRef.slug) === undefined &&
                    !entries.some((entry) => entry.slug === attachedArtifactRef.slug)
                      ? 1
                      : 0),
                ),
              );
      let isCommentWakeEnabled = r?.isCommentWakeEnabled ?? isAutoreactArmed;
      if (
        w === "live" &&
        T !== undefined &&
        wn.length > 0 &&
        getSessionId() === sessionId &&
        !isBgSession() &&
        n.mayRequestTakeover()
      )
        if (
          toolUseContext.options.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME)) &&
          n.commentsGateOpen() &&
          isCommentWakeEnabled()
        ) {
          let ie = await (
            r?.requestReplyTakeover ?? (await import("./chunk-4te7h8m1.js")).requestReplyTakeover
          )({
            holders: [T, ...D],
            holdersIncomplete,
            conversationId: sessionId,
            slugs: wn,
            reason: "resume",
          });
          G = ie.kind;
          if (ie.armable.size > 0) N = ie;
        } else G = "cannot_arm";
      let We = N?.armable ?? new Set();
      let tt = (J) => {
        let filtered = [...J].filter((_e) => We.has(_e) && !slugRepliesWiredHere(_e));
        if (filtered.length > 0) N?.undo(new Set(filtered));
      };
      if (getSessionId() !== sessionId) N?.undo();
      let nt = le();
      let Sn =
        allowed && (any || (((nt !== null && nt.holder !== "bg") || any_2) && w === "none") || We.size > 0);
      let commentsGateOpen = Sn ? n.commentsGateOpen : undefined;
      let ht;
      if (Sn) ht = isCommentWakeEnabled();
      let found = toolUseContext.options.tools.find((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME));
      let vn = hiddenBuiltInArtifactTool();
      let An = found ?? (vn !== undefined && !hasReplyAllowRule(toolUseContext) ? vn : undefined);
      let Rn = commentsGateOpen?.() ?? false;
      if (entries.length > 0 && canAutoReply())
        carried?.discloseUnattended({
          willRearm: ht === true && found !== undefined && !isBuiltInArtifactHiddenForMcp() && Rn,
        });
      if (!allowed) {
        Fe(entries);
        if (getSessionId() === sessionId) be(entries);
        return;
      }
      if (getSessionId() !== sessionId) {
        Se = true;
        if (ve !== undefined) Fe(ve);
        return;
      }
      Se = true;
      let Mn = (J) =>
        planCommentMonitorRearm({
          state: n.readFrameState(),
          ...(startupWatchSlug !== undefined && {
            excludeSlug: startupWatchSlug,
          }),
          getKnownVer: n.getKnownVer,
          context: toolUseContext,
          publishContext: n.publishContext,
          carried: J.carried,
          ...(J.intent !== undefined && {
            resumedIntent: J.intent,
            tornStops: tornStopIntents(),
          }),
          holderProbe: J.holderProbe,
          ...(J.freedSlugs.size > 0 && {
            freedSlugs: J.freedSlugs,
          }),
          ...(J.autoReactEnabled !== undefined && {
            autoReactEnabled: J.autoReactEnabled,
          }),
          tool: An,
          commentVerbsInSchema: J.commentVerbsInSchema,
          onNotArmed: (ie) => {
            tt([ie]);
          },
          onRecordedNotResumed: (ie, _e) => {
            tt(ie);
            let env = claudeAiEnvironment();
            emit([
              createSystemMessage(
                describeUnprovableResume(
                  ie.map((slug) =>
                    artifactViewerUrlFor({
                      slug,
                      env,
                    }),
                  ),
                  _e,
                  uiKind(n),
                ),
                "notice",
              ),
            ]);
          },
          onCarriedSkip: (ie, _e) => {
            ce(
              ie,
              artifactViewerUrlFor({
                slug: ie,
                env: claudeAiEnvironment(),
              }),
              _e,
            );
            if (!We.has(ie)) return;
            if (_e === "arm_in_flight" && getLiveState().live.inFlightWiredIntent.has(ie)) {
              onArmSettled(ie, () => tt([ie]));
              return;
            }
            tt([ie]);
          },
          ...(carried !== undefined && {
            onCarriedArmed: carried.onCarriedArmed,
          }),
          parkInFlight: {
            park: (ie) => {
              if (park === undefined) return;
              let _e = new Set(ie.map((Ae) => Ae.slug));
              park.repark(ae.filter((Ae) => _e.has(Ae.slug)).map(({ unattendedReplies, ...Me }) => Me));
            },
            release: (ie) => {
              if (park !== undefined) park.release(ie);
            },
          },
          ...(r?.arm !== undefined && {
            arm: r.arm,
          }),
        });
      let xn =
        n.reprobeHeldAfterMs !== undefined && w === "live" && We.size === 0 && any_2 && An !== undefined;
      z = xn;
      Mn({
        holderProbe: w,
        carried: entries,
        freedSlugs: We,
        autoReactEnabled: ht,
        commentVerbsInSchema: Rn,
        intent: M,
      });
      let jr = async () => {
        let isShuttingDown = r?.isShuttingDown ?? (await import("./chunk-r3wdn2dp.js")).isShuttingDown;
        if (nt !== null) await new Promise((resolve) => onArmSettled(nt.slug, resolve));
        if (getSessionId() !== sessionId || isShuttingDown()) {
          Ie();
          return;
        }
        let ie = () =>
          kn().then(
            (Me) => Me.verdict,
            () => {
              return;
            },
          );
        let _e = await ie();
        if (_e === undefined) {
          logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", {
            surface,
          });
          Ie();
          return;
        }
        logFeatureOk("artifact_live_subscribe", {
          holder_gone_on_reprobe: _e === "none",
          reprobe_verdict: fromEnum(_e),
          surface,
        });
        if (_e !== "none" || getSessionId() !== sessionId || isShuttingDown()) {
          Ie();
          return;
        }
        let intent = M;
        if (n.rereadRecords !== undefined && M !== undefined) {
          let Me = await n.rereadRecords(M).catch(() => null);
          if (Me === null) {
            logFeatureSad("artifact_live_subscribe", "records_reread_failed", {
              surface,
            });
            Pe("record_incomplete");
            return;
          }
          let yt = new Map();
          let In = new Map();
          for (let [kt, zr] of M) {
            let rt = Me.get(kt);
            if (rt === undefined) continue;
            if (rt.state === "stopped" && zr.state === "armed") yt.set(kt, rt.writtenAtMs);
            In.set(kt, rt);
          }
          if (yt.size > 0)
            applyRemoteStops(yt, {
              storageV5,
            });
          intent = In;
          let _t = await ie();
          if (_t !== "none" || getSessionId() !== sessionId || isShuttingDown()) {
            if (_t === undefined)
              logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", {
                surface,
              });
            Pe(_t === "live" ? "say" : "holder_unknown");
            return;
          }
        }
        w = "none";
        T = undefined;
        D = [];
        Pe("drop");
        ne = true;
        Mn({
          holderProbe: "none",
          carried: [],
          freedSlugs: new Set(),
          autoReactEnabled: isCommentWakeEnabled(),
          commentVerbsInSchema: n.commentsGateOpen(),
          intent,
        });
      };
      if (xn && n.reprobeHeldAfterMs !== undefined)
        (
          r?.schedule ??
          ((ie, _e) => {
            setTimeout(ie, _e).unref();
          })
        )(() => {
          jr().catch((error) => {
            Ie();
            logForDebugging(`[frame-live] resume re-probe failed: ${errorMessage(error)}`, {
              level: "error",
            });
          });
        }, n.reprobeHeldAfterMs);
      me("rearm", new Set(entries.map((entry) => entry.slug)));
    })
    .catch((error) => {
      logForDebugging(`[frame-live] resume re-arm failed: ${errorMessage(error)}`, {
        level: "error",
      });
      Ie();
      if (Se) return;
      N?.undo();
      if (getSessionId() === sessionId) be(ve);
      if (ve !== undefined) {
        if (canAutoReply())
          carried?.discloseUnattended({
            willRearm: false,
          });
        Fe(ve);
        return;
      }
      carried?.adopted?.then((x) => {
        if (x === undefined || x.entries.length === 0) return;
        if (x.park !== undefined && x.park.take().length === 0) return;
        for (let entry of x.entries.slice(0, REFUSED_CAPACITY_WINDOW))
          if (entry.unattendedReplies !== undefined)
            addUnattendedReplies(entry.slug, entry.unattendedReplies);
        if (canAutoReply())
          carried?.discloseUnattended({
            willRearm: false,
          });
        Fe(x.entries);
      });
    });
}
//@ chunk-0sfjpx19.js:116982-118512 placement
function rearmHeadlessCommentMonitors(e) {
  {
    let { hostInitialized, getAppState, deps } = e;
    let h;
    try {
      h =
        deps?.publishContext ??
        derivePublishContextFrom({
          agentId: undefined,
          isNonInteractiveSession: true,
        }).publishContext;
      if (h !== "interactive") return;
      if (
        !(
          deps?.hostOwned ??
          (() =>
            (isTopHostSession() && !isClaudecodeSession() && !isArtifactReadOnlySurface()) ||
            isVsCodeTopSession())
        )()
      )
        return;
    } catch (error) {
      logForDebugging(`[frame-live] headless resume re-arm gate failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(error);
      return;
    }
    let y =
      deps?.warmFlags ??
      (async () => {
        let { initializeGrowthBook } = await import("./chunk-6df1d6re.js");
        return initializeGrowthBook();
      });
    let _ =
      deps?.egressAllowed ??
      (async (T, D) => {
        let { isArtifactFetchEnabled } = await import("./chunk-h6p2kdzg.js");
        return isArtifactFetchEnabled(T, D, {
          promptless: true,
        });
      });
    let readFrameState = () => {
      let appState = getAppState();
      return {
        artifactRefs: appState.artifactRefs,
        artifactReadVersions: appState.artifactReadVersions,
        frameUrls: appState.frameUrls,
      };
    };
    let transcriptAnchor = e.transcriptAnchor;
    let w = isStorageV5Enabled() && e.storageV5 !== undefined;
    let S = async (T) => {
      if (transcriptAnchor === undefined) return null;
      if (w) {
        let transcriptFromFile = await loadTranscriptFromFile(transcriptAnchor.path, e.storageV5);
        if (transcriptFromFile.artifactCommentMonitor === undefined) return new Map(T);
        let E = false;
        let commentMonitorIntent = readCommentMonitorIntent(transcriptFromFile.artifactCommentMonitor, {
          onTornStop: () => {
            E = true;
          },
        });
        return E ? null : commentMonitorIntent;
      }
      return readCommentMonitorLogTail({
        path: transcriptAnchor.path,
        sessionId: getSessionId(),
        fromByte: transcriptAnchor.size,
        baseline: T,
      });
    };
    rearmOnResumeSafe(
      {
        initialMessages: e.initialMessages,
        storageV5: e.storageV5,
      },
      {
        publishContext: h,
        ui: "host",
        shortNotices: () => false,
        emit: e.emit,
        reprobeHeldAfterMs: deps?.reprobeHeldAfterMs ?? 1e4,
        gate: async () => {
          await y().catch(() => null);
          await hostInitialized;
          let context = e.buildContext();
          let allowed = await _(context.options.tools, getAppState().toolPermissionContext);
          return {
            toolUseContext: context,
            allowed,
          };
        },
        readFrameState,
        getKnownVer: (T) => mainObservedArtifactVersion(getAppState(), T),
        commentsGateOpen: deps?.commentsGateOpen ?? isArtifactsAvailable,
        mayRequestTakeover: () => false,
        rereadRecords: deps?.rereadRecords ?? S,
      },
      deps?.orchestration,
    );
  }
}
//@ chunk-0sfjpx19.js:118512-118583 placement
function uiKind(e) {
  return e.ui === "repl" && e.shortNotices() ? "replShort" : e.ui;
}
export {
  describeNotResumedIncomplete,
  otherArmedSlugs,
  classifyMonitorHold,
  describeHeldMonitor,
  describeNotResumedAfterSwitch,
  rearmOnResumeSafe,
  rearmHeadlessCommentMonitors,
};
