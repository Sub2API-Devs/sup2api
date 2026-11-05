/**
 * services/artifacts/commentMonitorResume.ts
 *
 * 2.1.316 新增：恢复会话时重新开启 Artifact 评论监视（自动回复），并在失败时给出原因与操作建议
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (32)
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
import { countWhere } from "../../utils/collections.js";
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
import { matchesToolName } from "../../Tool.js";
import { hiddenBuiltInArtifactTool, isBuiltInArtifactHiddenForMcp } from "./artifactsMcpTools.js";
import { hasReplyAllowRule } from "./comments/autoreactGates.js";
import { derivePublishContextFrom, mainObservedArtifactVersion } from "./readObservation.js";
import { isTopHostSession, isClaudecodeSession, isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isArtifactReadOnlySurface } from "./artifactToolGates.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";

//@ chunk-nh1pvp1m.js:86911-87573 placement
async function readCommentMonitorLogTail(path) {
  let { path: path_2, sessionId, fromByte, baseline } = path;
  let maxAppendedBytes = path.maxAppendedBytes ?? MAX_ARTIFACT_COMMENT_TRANSCRIPT_BYTES;
  let fd;
  try {
    let file = await open(path_2, "r");
    try {
      let { size } = await file.stat();
      if (size < fromByte || size - fromByte > maxAppendedBytes) return null;
      let extra = fromByte > 0 ? 1 : 0;
      let buffer = Buffer.alloc(size - fromByte + extra);
      let { bytesRead } = await file.read(buffer, 0, buffer.length, fromByte - extra);
      if (bytesRead !== buffer.length) return null;
      fd = buffer.toString("utf8");
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
  if (fromByte > 0) {
    if (
      !fd.startsWith(`
`)
    )
      return null;
    fd = fd.slice(1);
  }
  let read = {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId,
    artifacts: Object.fromEntries(baseline),
  };
  let lines = fd.split(`
`);
  if (lines.pop() !== "") return null;
  for (let line of lines) {
    if (!line.includes(ARTIFACT_COMMENT_MONITOR_NAME)) continue;
    let lines;
    try {
      lines = JSON.parse(line);
    } catch {
      return null;
    }
    if (isCommentMonitorNotification(sessionId, lines))
      read = mergeArtifactCommentMonitorEntries(read, lines);
  }
  return readCommentMonitorIntent(read);
}
//@ chunk-nh1pvp1m.js:87573-87710 placement
function isCommentMonitorNotification(sessionId, targetSessionId) {
  return (
    typeof targetSessionId === "object" &&
    targetSessionId !== null &&
    "type" in targetSessionId &&
    targetSessionId.type === "artifact-comment-monitor" &&
    "sessionId" in targetSessionId &&
    targetSessionId.sessionId === sessionId
  );
}
//@ chunk-nh1pvp1m.js:87710-87759 placement
var watchLimitText = `past the limit of ${REFUSED_CAPACITY_HINT} watched at once`;
//@ chunk-nh1pvp1m.js:87759-89244 placement
function formatAutoReplyNotResumedShort(artifactName, url, { backgroundSession, liveHolder, jobStamped }) {
  let summary = `Automatic replies didn't resume for ${artifactName}`;
  let openPrefix = backgroundSession ? "open this session and " : "";
  let publishHint = backgroundSession ? "open this session and publish it again" : "publish it again here";
  switch (url) {
    case "auto_replies_disabled":
      return `${summary} \xB7 turned off in this session`;
    case "stop_latched":
    case "recorded_stop":
      return `Automatic replies stayed off for ${artifactName} \xB7 ${openPrefix}ask Claude to watch it again, then publish it`;
    case "record_incomplete":
      return `${summary} \xB7 ${openPrefix}ask Claude to watch it again, then publish it`;
    case "not_editor":
      return `${summary} \xB7 this account can't publish to it`;
    case "holder_unknown":
      return `${summary} \xB7 ${publishHint} if this conversation isn't open elsewhere`;
    case "arm_in_flight":
      return `Automatic replies for ${artifactName} were still starting \xB7 /tasks to check`;
    case "held_by_live_session":
      return `Automatic replies didn't resume here for ${artifactName} \xB7 this conversation is also open in ${holderElsewhereText(liveHolder)}; ${describeCloseHolders(liveHolder)}${liveHolder?.surface === "background" || jobStamped ? ", then publish it again here" : " and resume again here"}`;
    case "held_by_job":
      return `Automatic replies didn't resume here for ${artifactName} \xB7 a background agent keeps them while it runs; if it has ended, publish it again here`;
    case "other_org":
      return `${summary} \xB7 /login to its organization, then ${publishHint}`;
    case "public_outside_org":
      return `${summary} \xB7 a public Artifact from outside your organization can't be watched`;
    case "watch_cap":
    case "watch_cap_reconnect":
      return `${summary} \xB7 ${watchLimitText}; ${openPrefix}publish it again`;
    default:
      return `${summary} \xB7 ${openPrefix}publish it again`;
  }
}
//@ chunk-nh1pvp1m.js:89244-89798 placement
function formatAutoReplyNotResumedList(names, ui, reason) {
  let more = names.length - 1;
  let listText = `${names[0] ?? "these Artifacts"}${more > 0 ? ` and ${more} more` : ""}`;
  let pronoun = more > 0 ? "one" : "it";
  let summary = `Automatic replies didn't resume for ${listText}`;
  switch (ui) {
    case "watch_cap":
      return `${summary} \xB7 ${watchLimitText}; publish ${pronoun} again`;
    case "unprovable":
    case "switched":
      return `${summary} \xB7 ask Claude to watch ${pronoun}, or publish it again`;
    case "incomplete":
      return `${summary} \xB7 ask Claude to watch ${pronoun}, then publish it`;
    case "held":
      return `Automatic replies didn't resume here for ${listText} \xB7 this conversation is also open in ${holderElsewhereText(reason)}; ${describeCloseHolders(reason)} first, then publish again here`;
  }
}
//@ chunk-nh1pvp1m.js:89798-90013 placement
function describeCloseHolders(holder) {
  let others = holder?.others ?? 0;
  if (holder?.surface === "background")
    return `stop that agent with \`claude agents\`${others > 0 ? ` and close the other ${plural(others, "session")}` : ""}`;
  return others > 0 ? "close those sessions" : "close that session";
}
//@ chunk-nh1pvp1m.js:90013-94291 placement
/**
 * 生成"自动回复未恢复"的说明（repl/短格式，指导重新发布或让 Claude 再监视）。
 */
function formatAutoReplyNotResumed(
  artifactName,
  url,
  { backgroundSession, liveHolder, jobStamped = false, ui = "repl" },
) {
  if (ui === "replShort")
    return formatAutoReplyNotResumedShort(artifactName, url, {
      backgroundSession,
      liveHolder,
      jobStamped,
    });
  let head = backgroundSession
    ? "Open this session and ask Claude to watch it again"
    : "Ask Claude to watch it again";
  switch (url) {
    case "auto_replies_disabled":
      return `Artifact comment monitor for ${artifactName} didn't resume: automatic replies are turned off in this session.`;
    case "stop_latched":
      return `Artifact comment monitor for ${artifactName} is still off \u2014 watching this Artifact was stopped earlier in this session. ${head}; automatic replies resume with the next publish after that.`;
    case "stale_handoff":
      return formatRepublishHint(
        artifactName,
        "this session was in the background too long",
        backgroundSession,
      );
    case "comments_unavailable":
      return formatRepublishHint(
        artifactName,
        "comments aren't available in this session",
        backgroundSession,
      );
    case "recorded_stop":
      return `Automatic replies for ${artifactName} are still off \u2014 they were stopped last time. ${head}; replies come back with the next publish after that.`;
    case "record_incomplete":
      return `Automatic replies for ${artifactName} were not resumed: this conversation's saved watch state was incomplete. ${head}; replies come back with the next publish after that.`;
    case "not_editor":
      return `Artifact comment monitor for ${artifactName} didn't resume: only a publisher's earlier decision carries across a resume or a handoff, and this account can't publish to that Artifact, so it cannot reply to its comments automatically from here.`;
    case "holder_unknown":
      return `Artifact comment monitor for ${artifactName} didn't resume its automatic replies: this session couldn't confirm that no other session of this conversation is already replying for it. If no other session is running, ${backgroundSession ? "open this session and publish the Artifact again" : "publish the Artifact again here"} to turn them back on.`;
    case "arm_in_flight":
      return ui === "host"
        ? `Automatic replies for ${artifactName} are still starting up; ask Claude for that artifact's status to see whether they came back.`
        : `Automatic replies for ${artifactName} are still starting up; /tasks will show whether they came back.`;
    case "held_by_live_session":
      return ui === "host"
        ? `Artifact comment monitor for ${artifactName} didn't resume its automatic replies here: this conversation is also open in ${holderElsewhereText(liveHolder)}, which may already be replying to this artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`
        : `Artifact comment monitor for ${artifactName} didn't resume its automatic replies here: this conversation is also open in ${holderElsewhereText(liveHolder)}, which may already be replying to this Artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`;
    case "held_by_job":
      return ui === "host"
        ? `Artifact comment monitor for ${artifactName} didn't resume its automatic replies here: they were last turned on from a background agent of this conversation, which keeps them while it runs. If that agent has ended, publish the artifact again here to turn them back on.`
        : `Artifact comment monitor for ${artifactName} didn't resume its automatic replies here: they were last turned on from a background agent of this conversation, which keeps them while it runs (see \`claude agents\`). If that agent has ended, publish the Artifact again here to turn them back on.`;
    case "other_org": {
      let publishHint = backgroundSession
        ? "open this session and publish it again"
        : "publish it again here";
      return ui === "host"
        ? `Artifact comment monitor for ${artifactName} didn't resume: this artifact is in another of your organizations. Sign in to that organization, then ${publishHint} to turn automatic replies back on.`
        : `Artifact comment monitor for ${artifactName} didn't resume: this Artifact is in another of your organizations. Run /login and sign in to that organization, then ${publishHint} to turn automatic replies back on.`;
    }
    case "public_outside_org":
      return ui === "host"
        ? `Artifact comment monitor for ${artifactName} didn't resume: this is a public artifact from outside your organization. It can be read here, but its comments can't be watched from this account.`
        : `Artifact comment monitor for ${artifactName} didn't resume: this is a public Artifact from outside your organization. It can be read here, but its comments can't be watched from this account.`;
    case "watch_cap":
    case "watch_cap_reconnect":
      return `Artifact comment monitor for ${artifactName} didn't resume: this session can watch at most ${REFUSED_CAPACITY_HINT} artifacts at once. ${backgroundSession ? "Open this session and publish the artifact again" : "Publish the artifact again"} to turn automatic replies back on. If that's refused too, ask Claude to stop watching one first.`;
    default:
      return formatRepublishHint(artifactName, "it couldn't restart in this session", backgroundSession);
  }
}
//@ chunk-nh1pvp1m.js:94291-94815 placement
function describeMonitorHolder(liveHolder, jobStamped, ui) {
  let others = liveHolder?.others ?? 0;
  let label = ui === "host" ? "artifact" : "Artifact";
  if (liveHolder?.surface === "background") {
    let otherClause = others > 0 ? ` and close the other ${plural(others, "session")}` : "";
    return `${ui === "host" ? "Stop that agent" : "Stop it with `claude agents`"}${otherClause}, then publish the ${label} again here to turn them back on.`;
  }
  let closeVerb = others > 0 ? "Close those sessions" : "Close that session";
  let keepClause = others > 0 ? "keep using them there" : "keep using it there";
  return jobStamped
    ? `${closeVerb}, then publish the ${label} again here to move the replies.`
    : `${closeVerb} and resume again here to move the replies, or ${keepClause}.`;
}
//@ chunk-nh1pvp1m.js:94815-95017 placement
function formatRepublishHint(url, reason, backgroundSession) {
  return `Artifact comment monitor for ${url} didn't resume: ${reason}. ${backgroundSession ? "Open this session and publish the Artifact again" : "Publish the Artifact again"} to turn automatic replies back on.`;
}
//@ chunk-nh1pvp1m.js:95017-95179 placement
function summarizeResumeLosses(entries) {
  return {
    countsAsLoss: entries.some((countsAsLoss) => countsAsLoss.stale !== true),
    warnings: entries.slice(0, REFUSED_CAPACITY_WINDOW).map((entry) => ({
      slug: entry.slug,
      reason: entry.stale === true ? "stale_handoff" : "unavailable",
    })),
  };
}
//@ chunk-nh1pvp1m.js:95179-95498 placement
/**
 * 从会话记录里找出最近引用的 artifact（不是目标 slug 时）：在 frameUrls 里匹配同 slug 的链接，返回 slug、查看链接与已读版本；无版本时只认附件路径。
 */
function findAttachedArtifactRef(state, startupSlug) {
  let slug = state.artifactRefs?.[0]?.slug;
  if (slug === undefined || slug === startupSlug) return null;
  let version = state.artifactReadVersions?.[slug] || undefined;
  for (let [otherSlug, url] of nonOpenedFrameUrls(state.frameUrls ?? {})) {
    let artifactUrl = parseArtifactUrl(url.url);
    if (artifactUrl === null || artifactUrl.slug !== slug) continue;
    if (version === undefined && !otherSlug.startsWith(ATTACHED)) return null;
    return {
      slug,
      url: artifactViewerUrlFor(artifactUrl),
      ...(version !== undefined && {
        version,
      }),
    };
  }
  return null;
}
//@ chunk-nh1pvp1m.js:95498-95641 placement
function formatNotResumedPrefix(text) {
  let sliced = text.slice(0, 2);
  let offset = text.length - sliced.length;
  return `Automatic replies were not resumed for ${sliced.join(", ")}${offset > 0 ? ` and ${offset} more` : ""}`;
}
//@ chunk-nh1pvp1m.js:95641-96019 placement
function describeUnprovableResume(urls, reason = "unprovable", ui = "repl") {
  if (ui === "replShort") return formatAutoReplyNotResumedList(urls, reason);
  return reason === "watch_cap"
    ? `${formatNotResumedPrefix(urls)}: this session can watch at most ${REFUSED_CAPACITY_HINT} artifacts at once. Publish one of these again to turn its replies back on. If that's refused too, ask Claude to stop watching one first.`
    : `${formatNotResumedPrefix(urls)}. Ask Claude to watch one of these, or publish it again, to turn its replies back on.`;
}
//@ chunk-nh1pvp1m.js:96019-96273 placement
/**
 * 会话内切换对话后评论监听不会恢复的提示：列出 artifact，建议重新发布或让 Claude 重新监听（短格式时只给列表）。
 */
function describeNotResumedAfterSwitch(url, ui = "repl") {
  if (ui === "replShort") return formatAutoReplyNotResumedList(url, "switched");
  return `${formatNotResumedPrefix(url)} \u2014 switching conversations inside a session doesn't bring comment monitors back. Publish the Artifact again, or ask Claude to watch it, to turn its replies back on.`;
}
//@ chunk-nh1pvp1m.js:96273-96501 placement
/**
 * 会话保存的监听状态不完整、自动回复未恢复的提示（短格式时只给列表）。
 */
function describeNotResumedIncomplete(url, ui = "repl") {
  if (ui === "replShort") return formatAutoReplyNotResumedList(url, "incomplete");
  return `${formatNotResumedPrefix(url)}: this conversation's saved watch state was incomplete. Ask Claude to watch one of these; replies come back with the next publish after that.`;
}
//@ chunk-nh1pvp1m.js:96501-97291 placement
function describeHeldMonitor(liveHolder, ui, reason = "repl") {
  if (reason === "replShort") return formatAutoReplyNotResumedList(liveHolder, "held", ui);
  let others = ui?.others ?? 0;
  let detail =
    ui !== undefined
      ? `it is also open in ${describeHolderWithOthers(ui)}`
      : "another live session of it is running";
  let hint =
    others > 0
      ? "If one of those sessions holds these monitors, replies continue there, and publishing again here while it does would make two sessions reply"
      : "If that session holds these monitors, replies continue there, and publishing again here while it does would make both sessions reply";
  let otherClause = others > 0 ? ` and close the other ${plural(others, "session")}` : "";
  let closeHint =
    ui?.surface === "background"
      ? `stop that agent${reason === "host" ? "" : " with `claude agents`"}${otherClause}`
      : others > 0
        ? "close those sessions"
        : "close that session";
  return `${formatNotResumedPrefix(liveHolder)} in this conversation \u2014 ${detail}. ${hint}; ${closeHint} first, then publish the ${reason === "host" ? "artifact" : "Artifact"} again here to move them.`;
}
//@ chunk-nh1pvp1m.js:97291-97371 placement
function heldReasonOrFallback(reason, holderEntry) {
  return heldReasonFor(reason, holderEntry) ?? (holderEntry === "unknown" ? "holder_unknown" : "unavailable");
}
//@ chunk-nh1pvp1m.js:97371-97862 placement
function classifyMonitorHold(reason, info) {
  let payload =
    reason === "held_by_live_session"
      ? "resume_held_live"
      : reason === "held_by_job"
        ? "resume_held_job"
        : reason === "holder_unknown"
          ? "resume_holder_unknown"
          : null;
  if (payload === null) return;
  logFeatureSad("artifact_live_subscribe", payload, {
    path: fromEnum(info.path),
    probed: info.probed,
    armed_monitor_count: info.monitors,
    job_stamped: info.jobStamped,
    takeover: fromEnum(info.takeover),
    job_holder: fromEnum(info.jobHolder),
    ...(info.surface !== undefined && {
      surface: info.surface,
    }),
    holder_count: info.liveHolder !== undefined ? 1 + info.otherHolders : 0,
    ...(info.liveHolder !== undefined && getHolderTelemetry(info.liveHolder, info.now)),
  });
}
//@ chunk-nh1pvp1m.js:97862-97957 placement
function heldReasonFor(reason, fallback) {
  if (fallback === "live") return "held_by_live_session";
  return reason === "bg" ? "held_by_job" : null;
}
//@ chunk-nh1pvp1m.js:97957-98035 placement
function resumeNotice(urls, verdict, liveHolderNote, ui = "repl") {
  return verdict === "live"
    ? describeHeldMonitor(urls, liveHolderNote, ui)
    : describeUnprovableResume(urls, "unprovable", ui);
}
//@ chunk-nh1pvp1m.js:98035-98088 placement
/**
 * 导出函数 `otherArmedSlugs`：参数 e, n，返回 listOtherArmedSlugs(e, {}).filter((r) => !n(r))。
 */
function otherArmedSlugs(excludeSlug, isAutoReactWired) {
  return listOtherArmedSlugs(excludeSlug, {}).filter((slug) => !isAutoReactWired(slug));
}
//@ chunk-nh1pvp1m.js:98088-98249 placement
function getCommentsUnavailableReason(context) {
  if (context.tool === undefined || context.commentVerbsInSchema !== true) return "comments_unavailable";
  if (context.autoReactEnabled === false) return "auto_replies_disabled";
  return null;
}
//@ chunk-nh1pvp1m.js:98249-98351 placement
function getResumeIssueLevel(reason) {
  return reason === "stop_latched" || reason === "recorded_stop" || reason === "arm_in_flight"
    ? "notice"
    : "warning";
}
//@ chunk-nh1pvp1m.js:98351-98535 placement
function findResumeTarget(frameState, startupSlug, intent) {
  let candidate =
    findAttachedArtifactRef(frameState, startupSlug) ?? findLatestArmedSlug(frameState, startupSlug, intent);
  if (candidate === null) return null;
  let record = intent?.get(candidate.slug);
  return record?.state === "armed"
    ? {
        slug: candidate.slug,
        url: candidate.url,
        ...(record.holder !== undefined && {
          holder: record.holder,
        }),
      }
    : null;
}
//@ chunk-nh1pvp1m.js:98535-98741 placement
function listOtherArmedSlugs(intent, options) {
  return [...intent]
    .filter(
      ([slug, record]) =>
        record.state === "armed" &&
        record.holder === undefined &&
        slug !== options.targetSlug &&
        slug !== options.excludeSlug &&
        !(options.named?.has(slug) ?? false),
    )
    .sort(([, a], [, b]) => b.writtenAtMs - a.writtenAtMs)
    .map(([slug]) => slug);
}
//@ chunk-nh1pvp1m.js:98741-99043 placement
/**
 * 在评论监控记录中找出最近写入、未被持有且不是当前 artifact 的已布防 slug，用于恢复会话时提示。
 */
function findLatestArmedSlug(frameState, startupSlug, intent) {
  if (intent === undefined) return null;
  if (startupSlug !== undefined && frameState.artifactRefs?.[0]?.slug === startupSlug) return null;
  let latest;
  for (let [slug, record] of intent)
    if (
      record.state === "armed" &&
      record.holder === undefined &&
      slug !== startupSlug &&
      ARTIFACT_SLUG_RE.test(slug) &&
      (latest === undefined || record.writtenAtMs > latest[1].writtenAtMs)
    )
      latest = [slug, record];
  return latest === undefined
    ? null
    : {
        slug: latest[0],
        url: artifactViewerUrlFor({
          slug: latest[0],
          env: claudeAiEnvironment(),
        }),
      };
}
//@ chunk-nh1pvp1m.js:99043-99944 placement
function describeWsOpenOutcome(outcome) {
  let { slug, url, record } = outcome;
  (outcome.arm ?? maybeSubscribeFrameLive)({
    slug,
    url,
    publishContext: outcome.publishContext,
    getKnownVer: () => outcome.getKnownVer(slug),
    sessionResume: true,
    ...(outcome.seedFromBoot && {
      seedKnownVerFromBoot: true,
    }),
    tool: outcome.tool,
    commentVerbsInSchema: true,
    ...(record?.title !== undefined && {
      title: record.title,
    }),
    resumedPublishConsent: true,
    onOpen: () => {},
    onGiveUp: () => outcome.onCarriedSkip?.(slug, "ws_open_error"),
    context: outcome.context,
  }).then(
    (supervisor) => {
      if (supervisor.outcome === "skipped" && supervisor.reason === "cancelled") outcome.onNotArmed?.(slug);
      else if (supervisor.outcome === "skipped") outcome.onCarriedSkip?.(slug, supervisor.reason);
      else if (supervisor.outcome === "armed" && supervisor.degraded === "not_editor")
        outcome.onCarriedSkip?.(slug, "not_editor");
      else if (
        supervisor.outcome === "already_watching" &&
        supervisor.taskId !== undefined &&
        getLiveState().live.supervisors.get(slug)?.autoReactWiring !== undefined
      );
      else if (supervisor.outcome === "already_watching" && supervisor.taskId === undefined)
        outcome.onCarriedSkip?.(slug, "arm_in_flight");
      else if (supervisor.outcome === "already_watching") outcome.onNotArmed?.(slug);
    },
    () => {
      outcome.onNotArmed?.(slug);
    },
  );
}
//@ chunk-nh1pvp1m.js:99944-103253 placement
/**
 * 决定恢复时为哪个 Artifact 重新武装评论监视（记录不完整、已停止、被其他会话持有）。
 */
function planCommentMonitorRearm(request) {
  let { state, excludeSlug, getKnownVer, context, publishContext } = request;
  let arm = request.arm ?? maybeSubscribeFrameLive;
  let resumedIntent =
    publishContext !== "bg_session" && isConsentUiKind(publishContext) ? request.resumedIntent : undefined;
  let attachedArtifactRef = findAttachedArtifactRef(state, excludeSlug);
  let target = attachedArtifactRef ?? findLatestArmedSlug(state, excludeSlug, resumedIntent);
  let seedFromBoot = attachedArtifactRef?.version === undefined;
  let record = target === null ? undefined : resumedIntent?.get(target.slug);
  let handled = new Set();
  let stopReason = (slug) => (request.tornStops?.has(slug) === true ? "record_incomplete" : "recorded_stop");
  let named = new Set();
  let capacity = excludeSlug === undefined ? REFUSED_CAPACITY_HINT : REFUSED_CAPACITY_HINT - 1;
  let carriedCount = 0;
  if (request.carried !== undefined && request.carried.length > 0) {
    let env = claudeAiEnvironment();
    let toArm = [];
    for (let entry of request.carried.slice(0, REFUSED_CAPACITY_WINDOW)) {
      let url = artifactViewerUrlFor({
        slug: entry.slug,
        env,
      });
      if (parseArtifactUrl(url)?.slug !== entry.slug) continue;
      if (entry.slug === excludeSlug) continue;
      if (entry.stale === true) {
        if (request.resumedIntent?.get(entry.slug)?.state === "stopped") {
          request.onCarriedSkip?.(entry.slug, stopReason(entry.slug));
          named.add(entry.slug);
        } else if (resumedIntent?.get(entry.slug)?.state !== "armed") {
          request.onCarriedSkip?.(entry.slug, "stale_handoff");
          named.add(entry.slug);
        }
        continue;
      }
      named.add(entry.slug);
      let commentsUnavailableReason = getCommentsUnavailableReason(request);
      if (commentsUnavailableReason !== null) {
        request.onCarriedSkip?.(entry.slug, commentsUnavailableReason);
        continue;
      }
      if (handled.has(entry.slug)) continue;
      handled.add(entry.slug);
      if (toArm.length >= capacity) {
        request.onCarriedSkip?.(entry.slug, "watch_cap");
        continue;
      }
      toArm.push({
        entry,
        url,
      });
    }
    carriedCount = toArm.length;
    if (toArm.length > 0) request.parkInFlight?.park(toArm.map((armed) => armed.entry));
    for (let { entry, url } of toArm)
      arm({
        slug: entry.slug,
        url,
        publishContext,
        getKnownVer: () => getKnownVer(entry.slug),
        ...(request.tool !== undefined && {
          tool: request.tool,
        }),
        ...(request.commentVerbsInSchema !== undefined && {
          commentVerbsInSchema: request.commentVerbsInSchema,
        }),
        ...(entry.title !== undefined && {
          title: entry.title,
        }),
        carriedPublishConsent: true,
        sessionResume: true,
        context,
      }).then(
        (result) => {
          request.parkInFlight?.release(entry.slug);
          if (result.outcome === "skipped") {
            if (result.reason !== "cancelled") request.onCarriedSkip?.(entry.slug, result.reason);
          } else if (result.outcome === "armed" && result.degraded === "not_editor")
            request.onCarriedSkip?.(entry.slug, "not_editor");
          else request.onCarriedArmed?.(entry.slug);
        },
        () => {},
      );
  }
  let holderProbe = request.holderProbe ?? "unknown";
  let liveSlugs = holderProbe === "live" ? (request.freedSlugs ?? new Set()) : undefined;
  let probeFor = (slug) => (liveSlugs?.has(slug) === true ? "none" : holderProbe);
  let heldReason = heldReasonFor(record?.holder, target !== null ? probeFor(target.slug) : holderProbe);
  let armOthers = (includeTarget) => {
    if (resumedIntent === undefined) return;
    for (let slug of request.tornStops ?? [])
      if (
        slug !== target?.slug &&
        slug !== excludeSlug &&
        !named.has(slug) &&
        resumedIntent.get(slug)?.state === "stopped"
      )
        request.onCarriedSkip?.(slug, "record_incomplete");
    if (holderProbe === "live" && (liveSlugs === undefined || liveSlugs.size === 0)) return;
    let filtered = listOtherArmedSlugs(resumedIntent, {
      ...(target !== null && {
        targetSlug: target.slug,
      }),
      ...(excludeSlug !== undefined && {
        excludeSlug,
      }),
      named,
    }).filter((slug) => ARTIFACT_SLUG_RE.test(slug) && (liveSlugs === undefined || liveSlugs.has(slug)));
    let tool =
      (holderProbe === "none" || liveSlugs !== undefined) && getCommentsUnavailableReason(request) === null
        ? request.tool
        : undefined;
    let slotCount = tool !== undefined ? Math.max(0, capacity - carriedCount - (includeTarget ? 1 : 0)) : 0;
    let sliced = filtered.slice(0, slotCount);
    if (filtered.length > sliced.length)
      request.onRecordedNotResumed?.(
        filtered.slice(sliced.length),
        tool !== undefined ? "watch_cap" : "unprovable",
      );
    if (tool !== undefined)
      for (let slug of sliced)
        armOne(
          tool,
          slug,
          artifactViewerUrlFor({
            slug,
            env: claudeAiEnvironment(),
          }),
          resumedIntent.get(slug),
          getKnownVer(slug) === undefined,
        );
  };
  if (target === null || handled.has(target.slug)) {
    armOthers(false);
    return;
  }
  if (record?.state === "stopped") {
    if (!named.has(target.slug)) request.onCarriedSkip?.(target.slug, stopReason(target.slug));
    armOthers(false);
    return;
  }
  let carryTarget = false;
  if (record?.state === "armed" && named.has(target.slug));
  else if (record?.state === "armed" && heldReason !== null) request.onCarriedSkip?.(target.slug, heldReason);
  else if (record?.state === "armed")
    if (holderProbe === "unknown") request.onCarriedSkip?.(target.slug, "holder_unknown");
    else {
      let commentsUnavailableReason = getCommentsUnavailableReason(request);
      if (commentsUnavailableReason !== null) request.onCarriedSkip?.(target.slug, commentsUnavailableReason);
      else carryTarget = true;
    }
  function armOne(tool, slug, url, record, seedFromBoot) {
    describeWsOpenOutcome({
      slug,
      url,
      record,
      seedFromBoot,
      tool,
      context,
      publishContext,
      getKnownVer,
      ...(request.onCarriedSkip !== undefined && {
        onCarriedSkip: request.onCarriedSkip,
      }),
      ...(request.onNotArmed !== undefined && {
        onNotArmed: request.onNotArmed,
      }),
      arm,
    });
  }
  if (carriedCount >= capacity) {
    if (carryTarget) request.onCarriedSkip?.(target.slug, "watch_cap");
    armOthers(false);
    return;
  }
  if (carryTarget && request.tool !== undefined)
    armOne(request.tool, target.slug, target.url, record, seedFromBoot);
  else
    arm({
      slug: target.slug,
      url: target.url,
      publishContext,
      getKnownVer: () => getKnownVer(target.slug),
      sessionResume: true,
      ...(seedFromBoot && {
        seedKnownVerFromBoot: true,
      }),
      context,
    }).catch(() => {});
  armOthers(true);
}
//@ chunk-nh1pvp1m.js:103253-103374 placement
/**
 * 恢复会话时重新开启评论监听，异常只记日志不抛出。
 */
function rearmOnResumeSafe(host, options, hooks) {
  try {
    rearmCommentMonitorsOnResume(host, options, hooks);
  } catch (error) {
    logForDebugging(`[frame-live] resume re-arm prelude failed: ${errorMessage(error)}`, {
      level: "error",
    });
    logError(error);
  }
}
//@ chunk-nh1pvp1m.js:103374-111956 placement
/**
 * 恢复时重新订阅 Artifact 评论（frame-live），记录结果并通知（约 8.5 KB）。
 */
function rearmCommentMonitorsOnResume(ctx, host, hooks) {
  let { initialMessages, startupWatchSlug, storageV5 } = ctx;
  let { emit } = host;
  let carried = host.carried;
  let surface = fromEnum(host.publishContext === "bg_session" ? "bg_session" : host.ui);
  let holderVerdict = "unknown";
  let probed = false;
  let liveHolder;
  let otherHolders = [];
  let holdersIncomplete = false;
  let takeover;
  let takeoverOutcome = "not_attempted";
  let liveHolderNote = (now) =>
    liveHolder !== undefined
      ? describeHolderWithOthersComments(liveHolder, otherHolders.length, now)
      : undefined;
  let monitorCount = 0;
  let jobHolderSlugs = new Set();
  let sessionHolderSlugs = new Set();
  let probeFailed = false;
  let holdReported = false;
  let reportedReasons = new Map();
  let suppressRepeats = false;
  let parkedInFlight = false;
  let parkedNotices = [];
  let jobHolderVerdicts = new Map();
  let reportHold = (reason, path, slug, now) => {
    if (
      holdReported ||
      probeFailed ||
      (reason !== "held_by_live_session" && reason !== "held_by_job" && reason !== "holder_unknown")
    )
      return;
    holdReported = true;
    classifyMonitorHold(reason, {
      path,
      probed,
      liveHolder,
      otherHolders: otherHolders.length,
      monitors: Math.max(1, monitorCount),
      jobStamped:
        slug !== undefined
          ? jobHolderSlugs.has(slug) || jobHolderVerdicts.has(slug)
          : jobHolderSlugs.size > 0 || jobHolderVerdicts.size > 0,
      jobHolder: slug !== undefined ? (jobHolderVerdicts.get(slug) ?? "none") : "none",
      takeover: takeoverOutcome,
      surface,
      now,
    });
  };
  let reportOtherHeldSlugs = (when, excludeSlugs = new Set()) => {
    let sessionHeldCount = countWhere([...sessionHolderSlugs], (slug) => !excludeSlugs.has(slug));
    let filtered = [...jobHolderSlugs].filter((slug) => !excludeSlugs.has(slug));
    if (holderVerdict !== "none" && sessionHeldCount > 0)
      reportHold(
        holderVerdict === "live" ? "held_by_live_session" : "holder_unknown",
        when,
        undefined,
        Date.now(),
      );
    else if (filtered.length > 0) reportHold("held_by_job", when, filtered[0], Date.now());
  };
  let reportNotResumed = (slug, url, reason) => {
    let prior = reportedReasons.get(slug);
    if (suppressRepeats && prior !== undefined && (prior !== "held_by_live_session" || reason === prior))
      return;
    reportedReasons.set(slug, reason);
    let now = Date.now();
    reportHold(reason, "rearm", slug, now);
    let pendingReplies = takeUnattendedReplies(slug);
    (reason === "held_by_live_session" && parkedInFlight
      ? (messages) => {
          parkedNotices.push({
            slug,
            messages,
          });
        }
      : emit)([
      ...(pendingReplies > 0
        ? [
            formatAutoReplyNotice(pendingReplies, {
              where: ` on ${url}`,
              stop: "",
            }),
          ]
        : []),
      createSystemMessage(
        formatAutoReplyNotResumed(url, reason, {
          backgroundSession: isBgSession(),
          ui: uiKind(host),
          liveHolder: liveHolderNote(now),
          jobStamped: jobHolderSlugs.has(slug),
        }),
        getResumeIssueLevel(reason),
      ),
    ]);
  };
  let reportCarriedLosses = (entries) => {
    let losses = summarizeResumeLosses(entries);
    if (losses.countsAsLoss)
      logFeatureSad("artifact_live_subscribe", "carried_consent_dropped", {
        surface,
      });
    let env = claudeAiEnvironment();
    for (let warning of losses.warnings) {
      let url = artifactViewerUrlFor({
        slug: warning.slug,
        env,
      });
      if (parseArtifactUrl(url)?.slug !== warning.slug) continue;
      reportNotResumed(warning.slug, url, warning.reason);
    }
  };
  let restoredIntents = (hooks?.readRecords ?? takeRestoredMonitorIntents)({
    ...(startupWatchSlug !== undefined && {
      excludeSlug: startupWatchSlug,
    }),
    ...(storageV5 !== undefined && {
      storageV5,
    }),
  });
  let sessionId = getSessionId();
  let flushParked = (mode) => {
    parkedInFlight = false;
    let parked = parkedNotices.splice(0);
    if (getSessionId() !== sessionId) return;
    let flattened = parked.flatMap((item) => item.messages.slice(0, -1));
    if (flattened.length > 0) emit(flattened);
    for (let item of parked) {
      if (mode === "drop" || slugRepliesWiredHere(item.slug)) continue;
      if (mode === "say") emit(item.messages.slice(-1));
      else
        reportNotResumed(
          item.slug,
          artifactViewerUrlFor({
            slug: item.slug,
            env: claudeAiEnvironment(),
          }),
          mode,
        );
    }
  };
  let flushParkedAsSay = () => flushParked("say");
  if ((!initialMessages || initialMessages.length === 0) && restoredIntents.size === 0) return;
  if (
    carried === undefined &&
    restoredIntents.size === 0 &&
    findAttachedArtifactRef(host.readFrameState(), startupWatchSlug) === null
  )
    return;
  let intent = isActingAsBgJob() ? undefined : restoredIntents;
  let recountHolders = () => {
    let filtered = [...(intent ?? new Map()).entries()].filter(([, record]) => record.state === "armed");
    monitorCount = filtered.length;
    jobHolderSlugs = new Set(filtered.filter(([, record]) => record.holder === "bg").map(([slug]) => slug));
    sessionHolderSlugs = new Set(
      filtered.filter(([, record]) => record.holder !== "bg").map(([slug]) => slug),
    );
  };
  recountHolders();
  let findTarget = () => findResumeTarget(host.readFrameState(), startupWatchSlug, intent);
  let emitCannotRun = (carriedEntries = []) => {
    let target = findTarget();
    let carriedSlugs = new Set(carriedEntries.map((entry) => entry.slug));
    let notices = [];
    if (target !== null && !carriedSlugs.has(target.slug)) {
      let reason = heldReasonOrFallback(target.holder, holderVerdict);
      let now = Date.now();
      reportHold(reason, "cannot_run", target.slug, now);
      notices.push(
        formatAutoReplyNotResumed(target.url, reason, {
          backgroundSession: isBgSession(),
          ui: uiKind(host),
          liveHolder: liveHolderNote(now),
          jobStamped: target.holder === "bg",
        }),
      );
    }
    let env = claudeAiEnvironment();
    let otherSlugs =
      intent === undefined
        ? []
        : listOtherArmedSlugs(intent, {
            ...(target !== null && {
              targetSlug: target.slug,
            }),
            ...(startupWatchSlug !== undefined && {
              excludeSlug: startupWatchSlug,
            }),
            named: carriedSlugs,
          }).map((slug) =>
            artifactViewerUrlFor({
              slug,
              env,
            }),
          );
    if (otherSlugs.length > 0) reportOtherHeldSlugs("cannot_run");
    if (notices.length > 0 || otherSlugs.length > 0)
      emit([
        ...notices.map((notice) => createSystemMessage(notice, "warning")),
        ...(otherSlugs.length > 0
          ? [
              createSystemMessage(
                resumeNotice(otherSlugs, holderVerdict, liveHolderNote(Date.now()), uiKind(host)),
                "notice",
              ),
            ]
          : []),
      ]);
  };
  let gateSettled = false;
  let carriedForLoss;
  host
    .gate()
    .then(async ({ toolUseContext, allowed }) => {
      let adopted = await carried?.adopted;
      let entries = adopted?.entries ?? [];
      let park = adopted?.park;
      let parkedEntries = entries.length > 0 && park !== undefined ? park.take() : [];
      if (entries.length > 0 && park !== undefined && parkedEntries.length === 0) return;
      carriedForLoss = entries;
      for (let entry of entries.slice(0, REFUSED_CAPACITY_WINDOW))
        if (entry.unattendedReplies !== undefined) addUnattendedReplies(entry.slug, entry.unattendedReplies);
      let any = entries.some((entry) => entry.stale !== true);
      if (allowed && intent !== undefined && jobHolderSlugs.size > 0 && host.jobHolderVerdicts !== undefined)
        try {
          jobHolderVerdicts = await host.jobHolderVerdicts(intent, storageV5, Date.now());
          intent = dropGoneHolders(intent, jobHolderVerdicts);
          recountHolders();
          let goneCount = countWhere([...jobHolderVerdicts.values()], (verdict) => verdict === "gone");
          if (goneCount > 0)
            logFeatureOk("artifact_live_subscribe", {
              job_holder_gone: goneCount,
              surface,
            });
        } catch {
          logFeatureSad("artifact_live_subscribe", "job_holder_probe_failed", {
            surface,
          });
        }
      let filtered = [...(intent ?? new Map()).values()].filter((record) => record.state === "armed");
      let hasArmed = filtered.length > 0;
      let any_2 = filtered.some((record) => record.holder !== "bg");
      let probeHolder = async () =>
        findLiveReplyHolder({
          records: await (
            hooks?.listSessionRecords ??
            (await import("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js"))
              .listRegisteredSessionRecords
          )(),
          sessionId,
          selfPid: process.pid,
          isRunning: hooks?.isRunning ?? isProcessRunning,
          isSameProcess: hooks?.isSameProcess ?? provenSameProcessAsync,
        });
      if (allowed && (findTarget() !== null || hasArmed))
        try {
          let probe = await probeHolder();
          probed = true;
          holderVerdict = probe.verdict;
          liveHolder = probe.holder;
          otherHolders = probe.otherHolders ?? [];
          holdersIncomplete = probe.verdict === "live" && probe.unproven === true;
        } catch {
          probeFailed = true;
          logFeatureSad("artifact_live_subscribe", "holder_probe_failed", {
            surface,
          });
        }
      let attachedArtifactRef = findAttachedArtifactRef(host.readFrameState(), startupWatchSlug);
      let takeoverSlugs =
        intent === undefined
          ? []
          : [...intent.entries()]
              .filter(
                ([slug, record]) =>
                  record.state === "armed" &&
                  record.holder !== "bg" &&
                  slug !== startupWatchSlug &&
                  !entries.some((entry) => entry.slug === slug),
              )
              .sort(
                ([slug, record], [otherSlug, otherRecord]) =>
                  Number(otherSlug === attachedArtifactRef?.slug) -
                    Number(slug === attachedArtifactRef?.slug) ||
                  otherRecord.writtenAtMs - record.writtenAtMs,
              )
              .map(([slug]) => slug)
              .slice(
                0,
                Math.max(
                  0,
                  REFUSED_CAPACITY_HINT -
                    (startupWatchSlug !== undefined ? 1 : 0) -
                    entries.length -
                    (attachedArtifactRef !== null &&
                    intent?.get(attachedArtifactRef.slug) === undefined &&
                    !entries.some((entry) => entry.slug === attachedArtifactRef.slug)
                      ? 1
                      : 0),
                ),
              );
      let isCommentWakeEnabled = hooks?.isCommentWakeEnabled ?? isAutoreactArmed;
      if (
        holderVerdict === "live" &&
        liveHolder !== undefined &&
        takeoverSlugs.length > 0 &&
        getSessionId() === sessionId &&
        !isBgSession() &&
        host.mayRequestTakeover()
      )
        if (
          toolUseContext.options.tools.some((tool) => matchesToolName(tool, ARTIFACT_TOOL_NAME)) &&
          host.commentsGateOpen() &&
          isCommentWakeEnabled()
        ) {
          let requestOutcome = await (
            hooks?.requestReplyTakeover ?? (await import("./replyYieldHolder.js")).requestReplyTakeover
          )({
            holders: [liveHolder, ...otherHolders],
            holdersIncomplete,
            conversationId: sessionId,
            slugs: takeoverSlugs,
            reason: "resume",
          });
          takeoverOutcome = requestOutcome.kind;
          if (requestOutcome.armable.size > 0) takeover = requestOutcome;
        } else takeoverOutcome = "cannot_arm";
      let armable = takeover?.armable ?? new Set();
      let releaseUnarmed = (slugs) => {
        let filtered = [...slugs].filter((slug) => armable.has(slug) && !slugRepliesWiredHere(slug));
        if (filtered.length > 0) takeover?.undo(new Set(filtered));
      };
      if (getSessionId() !== sessionId) takeover?.undo();
      let startupTarget = findTarget();
      let shouldRearm =
        allowed &&
        (any ||
          (((startupTarget !== null && startupTarget.holder !== "bg") || any_2) &&
            holderVerdict === "none") ||
          armable.size > 0);
      let commentsGateOpen = shouldRearm ? host.commentsGateOpen : undefined;
      let autoReactOn;
      if (shouldRearm) autoReactOn = isCommentWakeEnabled();
      let found = toolUseContext.options.tools.find((tool) => matchesToolName(tool, ARTIFACT_TOOL_NAME));
      let builtInFallback = hiddenBuiltInArtifactTool();
      let tool =
        found ??
        (builtInFallback !== undefined && !hasReplyAllowRule(toolUseContext) ? builtInFallback : undefined);
      let commentVerbs = commentsGateOpen?.() ?? false;
      if (entries.length > 0 && canAutoReply())
        carried?.discloseUnattended({
          willRearm:
            autoReactOn === true && found !== undefined && !isBuiltInArtifactHiddenForMcp() && commentVerbs,
        });
      if (!allowed) {
        reportCarriedLosses(entries);
        if (getSessionId() === sessionId) emitCannotRun(entries);
        return;
      }
      if (getSessionId() !== sessionId) {
        gateSettled = true;
        if (carriedForLoss !== undefined) reportCarriedLosses(carriedForLoss);
        return;
      }
      gateSettled = true;
      let rearmPlan = (input) =>
        planCommentMonitorRearm({
          state: host.readFrameState(),
          ...(startupWatchSlug !== undefined && {
            excludeSlug: startupWatchSlug,
          }),
          getKnownVer: host.getKnownVer,
          context: toolUseContext,
          publishContext: host.publishContext,
          carried: input.carried,
          ...(input.intent !== undefined && {
            resumedIntent: input.intent,
            tornStops: tornStopIntents(),
          }),
          holderProbe: input.holderProbe,
          ...(input.freedSlugs.size > 0 && {
            freedSlugs: input.freedSlugs,
          }),
          ...(input.autoReactEnabled !== undefined && {
            autoReactEnabled: input.autoReactEnabled,
          }),
          tool,
          commentVerbsInSchema: input.commentVerbsInSchema,
          onNotArmed: (slug) => {
            releaseUnarmed([slug]);
          },
          onRecordedNotResumed: (slugs, reason) => {
            releaseUnarmed(slugs);
            let env = claudeAiEnvironment();
            emit([
              createSystemMessage(
                describeUnprovableResume(
                  slugs.map((slug) =>
                    artifactViewerUrlFor({
                      slug,
                      env,
                    }),
                  ),
                  reason,
                  uiKind(host),
                ),
                "notice",
              ),
            ]);
          },
          onCarriedSkip: (slug, reason) => {
            reportNotResumed(
              slug,
              artifactViewerUrlFor({
                slug,
                env: claudeAiEnvironment(),
              }),
              reason,
            );
            if (!armable.has(slug)) return;
            if (reason === "arm_in_flight" && getLiveState().live.inFlightWiredIntent.has(slug)) {
              onArmSettled(slug, () => releaseUnarmed([slug]));
              return;
            }
            releaseUnarmed([slug]);
          },
          ...(carried !== undefined && {
            onCarriedArmed: carried.onCarriedArmed,
          }),
          parkInFlight: {
            park: (armed) => {
              if (park === undefined) return;
              let armedSlugs = new Set(armed.map((item) => item.slug));
              park.repark(
                parkedEntries
                  .filter((item) => armedSlugs.has(item.slug))
                  .map(({ unattendedReplies, ...rest }) => rest),
              );
            },
            release: (slug) => {
              if (park !== undefined) park.release(slug);
            },
          },
          ...(hooks?.arm !== undefined && {
            arm: hooks.arm,
          }),
        });
      let reprobeWanted =
        host.reprobeHeldAfterMs !== undefined &&
        holderVerdict === "live" &&
        armable.size === 0 &&
        any_2 &&
        tool !== undefined;
      parkedInFlight = reprobeWanted;
      rearmPlan({
        holderProbe: holderVerdict,
        carried: entries,
        freedSlugs: armable,
        autoReactEnabled: autoReactOn,
        commentVerbsInSchema: commentVerbs,
        intent,
      });
      let reprobeRun = async () => {
        let isShuttingDown =
          hooks?.isShuttingDown ?? (await import("../../utils/gracefulShutdown.js")).isShuttingDown;
        if (startupTarget !== null) await new Promise((resolve) => onArmSettled(startupTarget.slug, resolve));
        if (getSessionId() !== sessionId || isShuttingDown()) {
          flushParkedAsSay();
          return;
        }
        let probeVerdict = () =>
          probeHolder().then(
            (probe) => probe.verdict,
            () => {
              return;
            },
          );
        let verdict = await probeVerdict();
        if (verdict === undefined) {
          logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", {
            surface,
          });
          flushParkedAsSay();
          return;
        }
        logFeatureOk("artifact_live_subscribe", {
          holder_gone_on_reprobe: verdict === "none",
          reprobe_verdict: fromEnum(verdict),
          surface,
        });
        if (verdict !== "none" || getSessionId() !== sessionId || isShuttingDown()) {
          flushParkedAsSay();
          return;
        }
        let intent_2 = intent;
        if (host.rereadRecords !== undefined && intent !== undefined) {
          let freshRecords = await host.rereadRecords(intent).catch(() => null);
          if (freshRecords === null) {
            logFeatureSad("artifact_live_subscribe", "records_reread_failed", {
              surface,
            });
            flushParked("record_incomplete");
            return;
          }
          let remoteStops = new Map();
          let nextIntent = new Map();
          for (let [slug, record] of intent) {
            let fresh = freshRecords.get(slug);
            if (fresh === undefined) continue;
            if (fresh.state === "stopped" && record.state === "armed")
              remoteStops.set(slug, fresh.writtenAtMs);
            nextIntent.set(slug, fresh);
          }
          if (remoteStops.size > 0)
            applyRemoteStops(remoteStops, {
              storageV5,
            });
          intent_2 = nextIntent;
          let verdict = await probeVerdict();
          if (verdict !== "none" || getSessionId() !== sessionId || isShuttingDown()) {
            if (verdict === undefined)
              logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", {
                surface,
              });
            flushParked(verdict === "live" ? "say" : "holder_unknown");
            return;
          }
        }
        holderVerdict = "none";
        liveHolder = undefined;
        otherHolders = [];
        flushParked("drop");
        suppressRepeats = true;
        rearmPlan({
          holderProbe: "none",
          carried: [],
          freedSlugs: new Set(),
          autoReactEnabled: isCommentWakeEnabled(),
          commentVerbsInSchema: host.commentsGateOpen(),
          intent: intent_2,
        });
      };
      if (reprobeWanted && host.reprobeHeldAfterMs !== undefined)
        (
          hooks?.schedule ??
          ((fn, delayMs) => {
            setTimeout(fn, delayMs).unref();
          })
        )(() => {
          reprobeRun().catch((error) => {
            flushParkedAsSay();
            logForDebugging(`[frame-live] resume re-probe failed: ${errorMessage(error)}`, {
              level: "error",
            });
          });
        }, host.reprobeHeldAfterMs);
      reportOtherHeldSlugs("rearm", new Set(entries.map((entry) => entry.slug)));
    })
    .catch((error) => {
      logForDebugging(`[frame-live] resume re-arm failed: ${errorMessage(error)}`, {
        level: "error",
      });
      flushParkedAsSay();
      if (gateSettled) return;
      takeover?.undo();
      if (getSessionId() === sessionId) emitCannotRun(carriedForLoss);
      if (carriedForLoss !== undefined) {
        if (canAutoReply())
          carried?.discloseUnattended({
            willRearm: false,
          });
        reportCarriedLosses(carriedForLoss);
        return;
      }
      carried?.adopted?.then((adopted) => {
        if (adopted === undefined || adopted.entries.length === 0) return;
        if (adopted.park !== undefined && adopted.park.take().length === 0) return;
        for (let entry of adopted.entries.slice(0, REFUSED_CAPACITY_WINDOW))
          if (entry.unattendedReplies !== undefined)
            addUnattendedReplies(entry.slug, entry.unattendedReplies);
        if (canAutoReply())
          carried?.discloseUnattended({
            willRearm: false,
          });
        reportCarriedLosses(adopted.entries);
      });
    });
}
//@ chunk-nh1pvp1m.js:111956-113486 placement
function rearmHeadlessCommentMonitors(request) {
  {
    let { hostInitialized, getAppState, deps } = request;
    let publishContext;
    try {
      publishContext =
        deps?.publishContext ??
        derivePublishContextFrom({
          agentId: undefined,
          isNonInteractiveSession: true,
        }).publishContext;
      if (publishContext !== "interactive") return;
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
    let warmFlags =
      deps?.warmFlags ??
      (async () => {
        let { initializeGrowthBook } = await import("../analytics/ATIS_REQUEST_HEADER.lazy.js");
        return initializeGrowthBook();
      });
    let egressAllowed =
      deps?.egressAllowed ??
      (async (model, options) => {
        let { isArtifactFetchEnabled } = await import("../../tools/WebFetchTool/WebFetchTool.js");
        return isArtifactFetchEnabled(model, options, {
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
    let transcriptAnchor = request.transcriptAnchor;
    let storageV5On = isStorageV5Enabled() && request.storageV5 !== undefined;
    let readIntent = async (fallback) => {
      if (transcriptAnchor === undefined) return null;
      if (storageV5On) {
        let transcriptFromFile = await loadTranscriptFromFile(transcriptAnchor.path, request.storageV5);
        if (transcriptFromFile.artifactCommentMonitor === undefined) return new Map(fallback);
        let torn = false;
        let commentMonitorIntent = readCommentMonitorIntent(transcriptFromFile.artifactCommentMonitor, {
          onTornStop: () => {
            torn = true;
          },
        });
        return torn ? null : commentMonitorIntent;
      }
      return readCommentMonitorLogTail({
        path: transcriptAnchor.path,
        sessionId: getSessionId(),
        fromByte: transcriptAnchor.size,
        baseline: fallback,
      });
    };
    rearmOnResumeSafe(
      {
        initialMessages: request.initialMessages,
        storageV5: request.storageV5,
      },
      {
        publishContext,
        ui: "host",
        shortNotices: () => false,
        emit: request.emit,
        reprobeHeldAfterMs: deps?.reprobeHeldAfterMs ?? 1e4,
        gate: async () => {
          await warmFlags().catch(() => null);
          await hostInitialized;
          let context = request.buildContext();
          let allowed = await egressAllowed(context.options.tools, getAppState().toolPermissionContext);
          return {
            toolUseContext: context,
            allowed,
          };
        },
        readFrameState,
        getKnownVer: (slug) => mainObservedArtifactVersion(getAppState(), slug),
        commentsGateOpen: deps?.commentsGateOpen ?? isArtifactsAvailable,
        mayRequestTakeover: () => false,
        rereadRecords: deps?.rereadRecords ?? readIntent,
      },
      deps?.orchestration,
    );
  }
}
//@ chunk-nh1pvp1m.js:113486-113557 placement
function uiKind(ui) {
  return ui.ui === "repl" && ui.shortNotices() ? "replShort" : ui.ui;
}
export {
  rearmHeadlessCommentMonitors,
  describeNotResumedIncomplete,
  otherArmedSlugs,
  classifyMonitorHold,
  describeHeldMonitor,
  describeNotResumedAfterSwitch,
  rearmOnResumeSafe,
};
