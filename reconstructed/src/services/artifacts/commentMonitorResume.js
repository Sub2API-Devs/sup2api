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
import { Ns, $s } from "../../cli/print/turnStreaming.js";
import { mergeArtifactCommentMonitorEntries, loadTranscriptFromFile } from "../../utils/sessionStorage.js";
import {
  readCommentMonitorIntent,
  takeRestoredMonitorIntents,
  Ozn,
  applyRemoteStops,
} from "./commentMonitor.js";
import { FT, sIe, getLiveState } from "../liveReplica/liveReplica.js";
import {
  Min,
  describeHolderWithOthers,
  getHolderTelemetry,
  Rzn,
  dropGoneHolders,
  findLiveReplyHolder,
} from "./comments/replyYield.js";
import { plural } from "../../utils/stringUtils.js";
import { Zz, ATTACHED } from "../../tools/ArtifactTool/artifactResumeCarry.js";
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
import { B9 } from "./comments/repliesConsent.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { $Us, formatAutoReplyNotice, BRo, oAe } from "../artifactComments/autoReplyNotices.js";
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
import { Xb } from "./artifactAvailability.js";

//@ chunk-0sfjpx19.js:91945-92607 placement
async function readCommentMonitorLogTail(e) {
  let { path: path, sessionId: sessionId, fromByte: fromByte, baseline: baseline } = e,
    y = e.maxAppendedBytes ?? Ns,
    _;
  try {
    let w = await open(path, "r");
    try {
      let { size: size } = await w.stat();
      if (size < fromByte || size - fromByte > y) return null;
      let T = fromByte > 0 ? 1 : 0,
        alloc = Buffer.alloc(size - fromByte + T),
        { bytesRead: bytesRead } = await w.read(alloc, 0, alloc.length, fromByte - T);
      if (bytesRead !== alloc.length) return null;
      _ = alloc.toString("utf8");
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
      sessionId: sessionId,
      artifacts: Object.fromEntries(baseline),
    },
    parts = _.split(`
`);
  if (parts.pop() !== "") return null;
  for (let w of parts) {
    if (!w.includes($s)) continue;
    let S;
    try {
      S = JSON.parse(w);
    } catch {
      return null;
    }
    if (isCommentMonitorNotification(sessionId, S)) b = mergeArtifactCommentMonitorEntries(b, S);
  }
  return readCommentMonitorIntent(b);
}
//@ chunk-0sfjpx19.js:92607-92744 placement
function isCommentMonitorNotification(e, n) {
  return (
    typeof n === "object" &&
    n !== null &&
    "type" in n &&
    n.type === "artifact-comment-monitor" &&
    "sessionId" in n &&
    n.sessionId === e
  );
}
//@ chunk-0sfjpx19.js:92744-92793 placement
var Io = `past the limit of ${FT} watched at once`;
//@ chunk-0sfjpx19.js:92793-94278 placement
function formatAutoReplyNotResumedShort(
  e,
  n,
  { backgroundSession: backgroundSession, liveHolder: liveHolder, jobStamped: jobStamped },
) {
  let y = `Automatic replies didn't resume for ${e}`,
    _ = backgroundSession ? "open this session and " : "",
    b = backgroundSession ? "open this session and publish it again" : "publish it again here";
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
      return `Automatic replies didn't resume here for ${e} \xB7 this conversation is also open in ${Min(liveHolder)}; ${describeCloseHolders(liveHolder)}${liveHolder?.surface === "background" || jobStamped ? ", then publish it again here" : " and resume again here"}`;
    case "held_by_job":
      return `Automatic replies didn't resume here for ${e} \xB7 a background agent keeps them while it runs; if it has ended, publish it again here`;
    case "other_org":
      return `${y} \xB7 /login to its organization, then ${b}`;
    case "public_outside_org":
      return `${y} \xB7 a public Artifact from outside your organization can't be watched`;
    case "watch_cap":
    case "watch_cap_reconnect":
      return `${y} \xB7 ${Io}; ${_}publish it again`;
    default:
      return `${y} \xB7 ${_}publish it again`;
  }
}
//@ chunk-0sfjpx19.js:94278-94832 placement
function formatAutoReplyNotResumedList(e, n, r) {
  let s = e.length - 1,
    h = `${e[0] ?? "these Artifacts"}${s > 0 ? ` and ${s} more` : ""}`,
    y = s > 0 ? "one" : "it",
    _ = `Automatic replies didn't resume for ${h}`;
  switch (n) {
    case "watch_cap":
      return `${_} \xB7 ${Io}; publish ${y} again`;
    case "unprovable":
    case "switched":
      return `${_} \xB7 ask Claude to watch ${y}, or publish it again`;
    case "incomplete":
      return `${_} \xB7 ask Claude to watch ${y}, then publish it`;
    case "held":
      return `Automatic replies didn't resume here for ${h} \xB7 this conversation is also open in ${Min(r)}; ${describeCloseHolders(r)} first, then publish again here`;
  }
}
//@ chunk-0sfjpx19.js:94832-95047 placement
function describeCloseHolders(e) {
  let n = e?.others ?? 0;
  if (e?.surface === "background")
    return `stop that agent with \`claude agents\`${n > 0 ? ` and close the other ${plural(n, "session")}` : ""}`;
  return n > 0 ? "close those sessions" : "close that session";
}
/**
 * 生成"自动回复未恢复"的说明（repl/短格式，指导重新发布或让 Claude 再监视）。
 */
//@ chunk-0sfjpx19.js:95047-99325 placement
function formatAutoReplyNotResumed(
  e,
  n,
  {
    backgroundSession: backgroundSession,
    liveHolder: liveHolder,
    jobStamped: jobStamped = !1,
    ui: ui = "repl",
  },
) {
  if (ui === "replShort")
    return formatAutoReplyNotResumedShort(e, n, {
      backgroundSession: backgroundSession,
      liveHolder: liveHolder,
      jobStamped: jobStamped,
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
        ? `Artifact comment monitor for ${e} didn't resume its automatic replies here: this conversation is also open in ${Min(liveHolder)}, which may already be replying to this artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`
        : `Artifact comment monitor for ${e} didn't resume its automatic replies here: this conversation is also open in ${Min(liveHolder)}, which may already be replying to this Artifact's comments. ${describeMonitorHolder(liveHolder, jobStamped, ui)}`;
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
      return `Artifact comment monitor for ${e} didn't resume: this session can watch at most ${FT} artifacts at once. ${backgroundSession ? "Open this session and publish the artifact again" : "Publish the artifact again"} to turn automatic replies back on. If that's refused too, ask Claude to stop watching one first.`;
    default:
      return formatRepublishHint(e, "it couldn't restart in this session", backgroundSession);
  }
}
//@ chunk-0sfjpx19.js:99325-99849 placement
function describeMonitorHolder(e, n, r) {
  let s = e?.others ?? 0,
    h = r === "host" ? "artifact" : "Artifact";
  if (e?.surface === "background") {
    let b = s > 0 ? ` and close the other ${plural(s, "session")}` : "";
    return `${r === "host" ? "Stop that agent" : "Stop it with `claude agents`"}${b}, then publish the ${h} again here to turn them back on.`;
  }
  let y = s > 0 ? "Close those sessions" : "Close that session",
    _ = s > 0 ? "keep using them there" : "keep using it there";
  return n
    ? `${y}, then publish the ${h} again here to move the replies.`
    : `${y} and resume again here to move the replies, or ${_}.`;
}
//@ chunk-0sfjpx19.js:99849-100051 placement
function formatRepublishHint(e, n, r) {
  return `Artifact comment monitor for ${e} didn't resume: ${n}. ${r ? "Open this session and publish the Artifact again" : "Publish the Artifact again"} to turn automatic replies back on.`;
}
//@ chunk-0sfjpx19.js:100051-100213 placement
function summarizeResumeLosses(e) {
  return {
    countsAsLoss: e.some((n) => n.stale !== !0),
    warnings: e
      .slice(0, sIe)
      .map((n) => ({ slug: n.slug, reason: n.stale === !0 ? "stale_handoff" : "unavailable" })),
  };
}
/**
 * 从会话记录里找出最近引用的 artifact（不是目标 slug 时）：在 frameUrls 里匹配同 slug 的链接，返回 slug、查看链接与已读版本；无版本时只认附件路径。
 */
//@ chunk-0sfjpx19.js:100213-100532 placement
function findAttachedArtifactRef(e, n) {
  let r = e.artifactRefs?.[0]?.slug;
  if (r === void 0 || r === n) return null;
  let s = e.artifactReadVersions?.[r] || void 0;
  for (let [h, y] of Zz(e.frameUrls ?? {})) {
    let _ = parseArtifactUrl(y.url);
    if (_ === null || _.slug !== r) continue;
    if (s === void 0 && !h.startsWith(ATTACHED)) return null;
    return { slug: r, url: artifactViewerUrlFor(_), ...(s !== void 0 && { version: s }) };
  }
  return null;
}
//@ chunk-0sfjpx19.js:100532-100675 placement
function formatNotResumedPrefix(e) {
  let sliced = e.slice(0, 2),
    r = e.length - sliced.length;
  return `Automatic replies were not resumed for ${sliced.join(", ")}${r > 0 ? ` and ${r} more` : ""}`;
}
//@ chunk-0sfjpx19.js:100675-101053 placement
function describeUnprovableResume(e, n = "unprovable", r = "repl") {
  if (r === "replShort") return formatAutoReplyNotResumedList(e, n);
  return n === "watch_cap"
    ? `${formatNotResumedPrefix(e)}: this session can watch at most ${FT} artifacts at once. Publish one of these again to turn its replies back on. If that's refused too, ask Claude to stop watching one first.`
    : `${formatNotResumedPrefix(e)}. Ask Claude to watch one of these, or publish it again, to turn its replies back on.`;
}
/**
 * 会话内切换对话后评论监听不会恢复的提示：列出 artifact，建议重新发布或让 Claude 重新监听（短格式时只给列表）。
 */
//@ chunk-0sfjpx19.js:101053-101307 placement
function describeNotResumedAfterSwitch(e, n = "repl") {
  if (n === "replShort") return formatAutoReplyNotResumedList(e, "switched");
  return `${formatNotResumedPrefix(e)} \u2014 switching conversations inside a session doesn't bring comment monitors back. Publish the Artifact again, or ask Claude to watch it, to turn its replies back on.`;
}
/**
 * 会话保存的监听状态不完整、自动回复未恢复的提示（短格式时只给列表）。
 */
//@ chunk-0sfjpx19.js:101307-101535 placement
function describeNotResumedIncomplete(e, n = "repl") {
  if (n === "replShort") return formatAutoReplyNotResumedList(e, "incomplete");
  return `${formatNotResumedPrefix(e)}: this conversation's saved watch state was incomplete. Ask Claude to watch one of these; replies come back with the next publish after that.`;
}
//@ chunk-0sfjpx19.js:101535-102325 placement
function describeHeldMonitor(e, n, r = "repl") {
  if (r === "replShort") return formatAutoReplyNotResumedList(e, "held", n);
  let s = n?.others ?? 0,
    h =
      n !== void 0
        ? `it is also open in ${describeHolderWithOthers(n)}`
        : "another live session of it is running",
    y =
      s > 0
        ? "If one of those sessions holds these monitors, replies continue there, and publishing again here while it does would make two sessions reply"
        : "If that session holds these monitors, replies continue there, and publishing again here while it does would make both sessions reply",
    _ = s > 0 ? ` and close the other ${plural(s, "session")}` : "",
    b =
      n?.surface === "background"
        ? `stop that agent${r === "host" ? "" : " with `claude agents`"}${_}`
        : s > 0
          ? "close those sessions"
          : "close that session";
  return `${formatNotResumedPrefix(e)} in this conversation \u2014 ${h}. ${y}; ${b} first, then publish the ${r === "host" ? "artifact" : "Artifact"} again here to move them.`;
}
//@ chunk-0sfjpx19.js:102325-102405 placement
function $o(e, n) {
  return Uo(e, n) ?? (n === "unknown" ? "holder_unknown" : "unavailable");
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
    ...(n.surface !== void 0 && { surface: n.surface }),
    holder_count: n.liveHolder !== void 0 ? 1 + n.otherHolders : 0,
    ...(n.liveHolder !== void 0 && getHolderTelemetry(n.liveHolder, n.now)),
  });
}
//@ chunk-0sfjpx19.js:102896-102991 placement
function Uo(e, n) {
  if (n === "live") return "held_by_live_session";
  return e === "bg" ? "held_by_job" : null;
}
//@ chunk-0sfjpx19.js:102991-103069 placement
function Ho(e, n, r, s = "repl") {
  return n === "live" ? describeHeldMonitor(e, r, s) : describeUnprovableResume(e, "unprovable", s);
}
//@ chunk-0sfjpx19.js:103069-103122 placement
function EAs(e, n) {
  return listOtherArmedSlugs(e, {}).filter((r) => !n(r));
}
//@ chunk-0sfjpx19.js:103122-103283 placement
function getCommentsUnavailableReason(e) {
  if (e.tool === void 0 || e.commentVerbsInSchema !== !0) return "comments_unavailable";
  if (e.autoReactEnabled === !1) return "auto_replies_disabled";
  return null;
}
//@ chunk-0sfjpx19.js:103283-103385 placement
function getResumeIssueLevel(e) {
  return e === "stop_latched" || e === "recorded_stop" || e === "arm_in_flight" ? "notice" : "warning";
}
//@ chunk-0sfjpx19.js:103385-103569 placement
function findResumeTarget(e, n, r) {
  let s = findAttachedArtifactRef(e, n) ?? findLatestArmedSlug(e, n, r);
  if (s === null) return null;
  let h = r?.get(s.slug);
  return h?.state === "armed"
    ? { slug: s.slug, url: s.url, ...(h.holder !== void 0 && { holder: h.holder }) }
    : null;
}
//@ chunk-0sfjpx19.js:103569-103775 placement
function listOtherArmedSlugs(e, n) {
  return [...e]
    .filter(
      ([r, s]) =>
        s.state === "armed" &&
        s.holder === void 0 &&
        r !== n.targetSlug &&
        r !== n.excludeSlug &&
        !(n.named?.has(r) ?? !1),
    )
    .sort(([, r], [, s]) => s.writtenAtMs - r.writtenAtMs)
    .map(([r]) => r);
}
/**
 * 在评论监控记录中找出最近写入、未被持有且不是当前 artifact 的已布防 slug，用于恢复会话时提示。
 */
//@ chunk-0sfjpx19.js:103775-104077 placement
function findLatestArmedSlug(e, n, r) {
  if (r === void 0) return null;
  if (n !== void 0 && e.artifactRefs?.[0]?.slug === n) return null;
  let s;
  for (let [h, y] of r)
    if (
      y.state === "armed" &&
      y.holder === void 0 &&
      h !== n &&
      ARTIFACT_SLUG_RE.test(h) &&
      (s === void 0 || y.writtenAtMs > s[1].writtenAtMs)
    )
      s = [h, y];
  return s === void 0
    ? null
    : { slug: s[0], url: artifactViewerUrlFor({ slug: s[0], env: claudeAiEnvironment() }) };
}
//@ chunk-0sfjpx19.js:104077-104978 placement
function describeWsOpenOutcome(e) {
  let { slug: slug, url: url, record: record } = e;
  (e.arm ?? maybeSubscribeFrameLive)({
    slug: slug,
    url: url,
    publishContext: e.publishContext,
    getKnownVer: () => e.getKnownVer(slug),
    sessionResume: !0,
    ...(e.seedFromBoot && { seedKnownVerFromBoot: !0 }),
    tool: e.tool,
    commentVerbsInSchema: !0,
    ...(record?.title !== void 0 && { title: record.title }),
    resumedPublishConsent: !0,
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
        y.taskId !== void 0 &&
        getLiveState().live.supervisors.get(slug)?.autoReactWiring !== void 0
      );
      else if (y.outcome === "already_watching" && y.taskId === void 0)
        e.onCarriedSkip?.(slug, "arm_in_flight");
      else if (y.outcome === "already_watching") e.onNotArmed?.(slug);
    },
    () => {
      e.onNotArmed?.(slug);
    },
  );
}
/**
 * 决定恢复时为哪个 Artifact 重新武装评论监视（记录不完整、已停止、被其他会话持有）。
 */
//@ chunk-0sfjpx19.js:104978-108279 placement
function planCommentMonitorRearm(e) {
  let {
      state: state,
      excludeSlug: excludeSlug,
      getKnownVer: getKnownVer,
      context: context,
      publishContext: publishContext,
    } = e,
    _ = e.arm ?? maybeSubscribeFrameLive,
    b = publishContext !== "bg_session" && B9(publishContext) ? e.resumedIntent : void 0,
    k = findAttachedArtifactRef(state, excludeSlug),
    w = k ?? findLatestArmedSlug(state, excludeSlug, b),
    S = k?.version === void 0,
    T = w === null ? void 0 : b?.get(w.slug),
    D = new Set(),
    E = (z) => (e.tornStops?.has(z) === !0 ? "record_incomplete" : "recorded_stop"),
    N = new Set(),
    G = excludeSlug === void 0 ? FT : FT - 1,
    R = 0;
  if (e.carried !== void 0 && e.carried.length > 0) {
    let z = claudeAiEnvironment(),
      V = [];
    for (let j of e.carried.slice(0, sIe)) {
      let pe = artifactViewerUrlFor({ slug: j.slug, env: z });
      if (parseArtifactUrl(pe)?.slug !== j.slug) continue;
      if (j.slug === excludeSlug) continue;
      if (j.stale === !0) {
        if (e.resumedIntent?.get(j.slug)?.state === "stopped")
          (e.onCarriedSkip?.(j.slug, E(j.slug)), N.add(j.slug));
        else if (b?.get(j.slug)?.state !== "armed")
          (e.onCarriedSkip?.(j.slug, "stale_handoff"), N.add(j.slug));
        continue;
      }
      N.add(j.slug);
      let me = getCommentsUnavailableReason(e);
      if (me !== null) {
        e.onCarriedSkip?.(j.slug, me);
        continue;
      }
      if (D.has(j.slug)) continue;
      if ((D.add(j.slug), V.length >= G)) {
        e.onCarriedSkip?.(j.slug, "watch_cap");
        continue;
      }
      V.push({ entry: j, url: pe });
    }
    if (((R = V.length), V.length > 0)) e.parkInFlight?.park(V.map((j) => j.entry));
    for (let { entry: entry, url: url } of V)
      _({
        slug: entry.slug,
        url: url,
        publishContext: publishContext,
        getKnownVer: () => getKnownVer(entry.slug),
        ...(e.tool !== void 0 && { tool: e.tool }),
        ...(e.commentVerbsInSchema !== void 0 && { commentVerbsInSchema: e.commentVerbsInSchema }),
        ...(entry.title !== void 0 && { title: entry.title }),
        carriedPublishConsent: !0,
        sessionResume: !0,
        context: context,
      }).then(
        (me) => {
          if ((e.parkInFlight?.release(entry.slug), me.outcome === "skipped")) {
            if (me.reason !== "cancelled") e.onCarriedSkip?.(entry.slug, me.reason);
          } else if (me.outcome === "armed" && me.degraded === "not_editor")
            e.onCarriedSkip?.(entry.slug, "not_editor");
          else e.onCarriedArmed?.(entry.slug);
        },
        () => {},
      );
  }
  let P = e.holderProbe ?? "unknown",
    U = P === "live" ? (e.freedSlugs ?? new Set()) : void 0,
    L = (z) => (U?.has(z) === !0 ? "none" : P),
    oe = Uo(T?.holder, w !== null ? L(w.slug) : P),
    te = (z) => {
      if (b === void 0) return;
      for (let ce of e.tornStops ?? [])
        if (ce !== w?.slug && ce !== excludeSlug && !N.has(ce) && b.get(ce)?.state === "stopped")
          e.onCarriedSkip?.(ce, "record_incomplete");
      if (P === "live" && (U === void 0 || U.size === 0)) return;
      let filtered = listOtherArmedSlugs(b, {
          ...(w !== null && { targetSlug: w.slug }),
          ...(excludeSlug !== void 0 && { excludeSlug: excludeSlug }),
          named: N,
        }).filter((ce) => ARTIFACT_SLUG_RE.test(ce) && (U === void 0 || U.has(ce))),
        j = (P === "none" || U !== void 0) && getCommentsUnavailableReason(e) === null ? e.tool : void 0,
        pe = j !== void 0 ? Math.max(0, G - R - (z ? 1 : 0)) : 0,
        sliced = filtered.slice(0, pe);
      if (filtered.length > sliced.length)
        e.onRecordedNotResumed?.(filtered.slice(sliced.length), j !== void 0 ? "watch_cap" : "unprovable");
      if (j !== void 0)
        for (let ce of sliced)
          ne(
            j,
            ce,
            artifactViewerUrlFor({ slug: ce, env: claudeAiEnvironment() }),
            b.get(ce),
            getKnownVer(ce) === void 0,
          );
    };
  if (w === null || D.has(w.slug)) {
    te(!1);
    return;
  }
  if (T?.state === "stopped") {
    if (!N.has(w.slug)) e.onCarriedSkip?.(w.slug, E(w.slug));
    te(!1);
    return;
  }
  let Q = !1;
  if (T?.state === "armed" && N.has(w.slug));
  else if (T?.state === "armed" && oe !== null) e.onCarriedSkip?.(w.slug, oe);
  else if (T?.state === "armed")
    if (P === "unknown") e.onCarriedSkip?.(w.slug, "holder_unknown");
    else {
      let z = getCommentsUnavailableReason(e);
      if (z !== null) e.onCarriedSkip?.(w.slug, z);
      else Q = !0;
    }
  function ne(z, V, j, pe, me) {
    describeWsOpenOutcome({
      slug: V,
      url: j,
      record: pe,
      seedFromBoot: me,
      tool: z,
      context: context,
      publishContext: publishContext,
      getKnownVer: getKnownVer,
      ...(e.onCarriedSkip !== void 0 && { onCarriedSkip: e.onCarriedSkip }),
      ...(e.onNotArmed !== void 0 && { onNotArmed: e.onNotArmed }),
      arm: _,
    });
  }
  if (R >= G) {
    if (Q) e.onCarriedSkip?.(w.slug, "watch_cap");
    te(!1);
    return;
  }
  if (Q && e.tool !== void 0) ne(e.tool, w.slug, w.url, T, S);
  else
    _({
      slug: w.slug,
      url: w.url,
      publishContext: publishContext,
      getKnownVer: () => getKnownVer(w.slug),
      sessionResume: !0,
      ...(S && { seedKnownVerFromBoot: !0 }),
      context: context,
    }).catch(() => {});
  te(!0);
}
/**
 * 恢复会话时重新开启评论监听，异常只记日志不抛出。
 */
//@ chunk-0sfjpx19.js:108279-108400 placement
function rearmOnResumeSafe(e, n, r) {
  try {
    rearmCommentMonitorsOnResume(e, n, r);
  } catch (error) {
    (logForDebugging(`[frame-live] resume re-arm prelude failed: ${errorMessage(error)}`, { level: "error" }),
      logError(error));
  }
}
/**
 * 恢复时重新订阅 Artifact 评论（frame-live），记录结果并通知（约 8.5 KB）。
 */
//@ chunk-0sfjpx19.js:108400-116982 placement
function rearmCommentMonitorsOnResume(e, n, r) {
  let { initialMessages: initialMessages, startupWatchSlug: startupWatchSlug, storageV5: storageV5 } = e,
    { emit: emit } = n,
    carried = n.carried,
    k = fromEnum(n.publishContext === "bg_session" ? "bg_session" : n.ui),
    w = "unknown",
    S = !1,
    T,
    D = [],
    E = !1,
    N,
    G = "not_attempted",
    R = (re) => (T !== void 0 ? Rzn(T, D.length, re) : void 0),
    P = 0,
    U = new Set(),
    L = new Set(),
    oe = !1,
    te = !1,
    Q = new Map(),
    ne = !1,
    z = !1,
    V = [],
    j = new Map(),
    pe = (re, x, se, Z) => {
      if (te || oe || (re !== "held_by_live_session" && re !== "held_by_job" && re !== "holder_unknown"))
        return;
      ((te = !0),
        classifyMonitorHold(re, {
          path: x,
          probed: S,
          liveHolder: T,
          otherHolders: D.length,
          monitors: Math.max(1, P),
          jobStamped: se !== void 0 ? U.has(se) || j.has(se) : U.size > 0 || j.size > 0,
          jobHolder: se !== void 0 ? (j.get(se) ?? "none") : "none",
          takeover: G,
          surface: k,
          now: Z,
        }));
    },
    me = (re, x = new Set()) => {
      let se = count([...L], (ue) => !x.has(ue)),
        filtered = [...U].filter((ue) => !x.has(ue));
      if (w !== "none" && se > 0)
        pe(w === "live" ? "held_by_live_session" : "holder_unknown", re, void 0, Date.now());
      else if (filtered.length > 0) pe("held_by_job", re, filtered[0], Date.now());
    },
    ce = (re, x, se) => {
      let Z = Q.get(re);
      if (ne && Z !== void 0 && (Z !== "held_by_live_session" || se === Z)) return;
      Q.set(re, se);
      let now = Date.now();
      pe(se, "rearm", re, now);
      let ae = $Us(re);
      (se === "held_by_live_session" && z
        ? (we) => {
            V.push({ slug: re, messages: we });
          }
        : emit)([
        ...(ae > 0 ? [formatAutoReplyNotice(ae, { where: ` on ${x}`, stop: "" })] : []),
        createSystemMessage(
          formatAutoReplyNotResumed(x, se, {
            backgroundSession: isBgSession(),
            ui: pt(n),
            liveHolder: R(now),
            jobStamped: U.has(re),
          }),
          getResumeIssueLevel(se),
        ),
      ]);
    },
    Fe = (re) => {
      let x = summarizeResumeLosses(re);
      if (x.countsAsLoss) logFeatureSad("artifact_live_subscribe", "carried_consent_dropped", { surface: k });
      let se = claudeAiEnvironment();
      for (let warning of x.warnings) {
        let ue = artifactViewerUrlFor({ slug: warning.slug, env: se });
        if (parseArtifactUrl(ue)?.slug !== warning.slug) continue;
        ce(warning.slug, ue, warning.reason);
      }
    },
    Ne = (r?.readRecords ?? takeRestoredMonitorIntents)({
      ...(startupWatchSlug !== void 0 && { excludeSlug: startupWatchSlug }),
      ...(storageV5 !== void 0 && { storageV5: storageV5 }),
    }),
    ke = getSessionId(),
    Pe = (re) => {
      z = !1;
      let splice = V.splice(0);
      if (getSessionId() !== ke) return;
      let flattened = splice.flatMap((Z) => Z.messages.slice(0, -1));
      if (flattened.length > 0) emit(flattened);
      for (let Z of splice) {
        if (re === "drop" || slugRepliesWiredHere(Z.slug)) continue;
        if (re === "say") emit(Z.messages.slice(-1));
        else ce(Z.slug, artifactViewerUrlFor({ slug: Z.slug, env: claudeAiEnvironment() }), re);
      }
    },
    Ie = () => Pe("say");
  if ((!initialMessages || initialMessages.length === 0) && Ne.size === 0) return;
  if (
    carried === void 0 &&
    Ne.size === 0 &&
    findAttachedArtifactRef(n.readFrameState(), startupWatchSlug) === null
  )
    return;
  let M = isActingAsBgJob() ? void 0 : Ne,
    q = () => {
      let filtered = [...(M ?? new Map()).entries()].filter(([, x]) => x.state === "armed");
      ((P = filtered.length),
        (U = new Set(filtered.filter(([, x]) => x.holder === "bg").map(([x]) => x))),
        (L = new Set(filtered.filter(([, x]) => x.holder !== "bg").map(([x]) => x))));
    };
  q();
  let le = () => findResumeTarget(n.readFrameState(), startupWatchSlug, M),
    be = (re = []) => {
      let x = le(),
        se = new Set(re.map((he) => he.slug)),
        Z = [];
      if (x !== null && !se.has(x.slug)) {
        let he = $o(x.holder, w),
          now = Date.now();
        (pe(he, "cannot_run", x.slug, now),
          Z.push(
            formatAutoReplyNotResumed(x.url, he, {
              backgroundSession: isBgSession(),
              ui: pt(n),
              liveHolder: R(now),
              jobStamped: x.holder === "bg",
            }),
          ));
      }
      let ue = claudeAiEnvironment(),
        ae =
          M === void 0
            ? []
            : listOtherArmedSlugs(M, {
                ...(x !== null && { targetSlug: x.slug }),
                ...(startupWatchSlug !== void 0 && { excludeSlug: startupWatchSlug }),
                named: se,
              }).map((he) => artifactViewerUrlFor({ slug: he, env: ue }));
      if (ae.length > 0) me("cannot_run");
      if (Z.length > 0 || ae.length > 0)
        emit([
          ...Z.map((he) => createSystemMessage(he, "warning")),
          ...(ae.length > 0 ? [createSystemMessage(Ho(ae, w, R(Date.now()), pt(n)), "notice")] : []),
        ]);
    },
    Se = !1,
    ve;
  n.gate()
    .then(async ({ toolUseContext: toolUseContext, allowed: allowed }) => {
      let se = await carried?.adopted,
        Z = se?.entries ?? [],
        ue = se?.park,
        ae = Z.length > 0 && ue !== void 0 ? ue.take() : [];
      if (Z.length > 0 && ue !== void 0 && ae.length === 0) return;
      ve = Z;
      for (let J of Z.slice(0, sIe)) if (J.unattendedReplies !== void 0) BRo(J.slug, J.unattendedReplies);
      let any = Z.some((J) => J.stale !== !0);
      if (allowed && M !== void 0 && U.size > 0 && n.jobHolderVerdicts !== void 0)
        try {
          ((j = await n.jobHolderVerdicts(M, storageV5, Date.now())), (M = dropGoneHolders(M, j)), q());
          let J = count([...j.values()], (ie) => ie === "gone");
          if (J > 0) logFeatureOk("artifact_live_subscribe", { job_holder_gone: J, surface: k });
        } catch {
          logFeatureSad("artifact_live_subscribe", "job_holder_probe_failed", { surface: k });
        }
      let filtered = [...(M ?? new Map()).values()].filter((J) => J.state === "armed"),
        Je = filtered.length > 0,
        any_2 = filtered.some((J) => J.holder !== "bg"),
        kn = async () =>
          findLiveReplyHolder({
            records: await (
              r?.listSessionRecords ?? (await import("./chunk-ewxn4535.js")).listRegisteredSessionRecords
            )(),
            sessionId: ke,
            selfPid: process.pid,
            isRunning: r?.isRunning ?? isProcessRunning,
            isSameProcess: r?.isSameProcess ?? provenSameProcessAsync,
          });
      if (allowed && (le() !== null || Je))
        try {
          let J = await kn();
          ((S = !0),
            (w = J.verdict),
            (T = J.holder),
            (D = J.otherHolders ?? []),
            (E = J.verdict === "live" && J.unproven === !0));
        } catch {
          ((oe = !0), logFeatureSad("artifact_live_subscribe", "holder_probe_failed", { surface: k }));
        }
      let Be = findAttachedArtifactRef(n.readFrameState(), startupWatchSlug),
        wn =
          M === void 0
            ? []
            : [...M.entries()]
                .filter(
                  ([J, ie]) =>
                    ie.state === "armed" &&
                    ie.holder !== "bg" &&
                    J !== startupWatchSlug &&
                    !Z.some((_e) => _e.slug === J),
                )
                .sort(
                  ([J, ie], [_e, Ae]) =>
                    Number(_e === Be?.slug) - Number(J === Be?.slug) || Ae.writtenAtMs - ie.writtenAtMs,
                )
                .map(([J]) => J)
                .slice(
                  0,
                  Math.max(
                    0,
                    FT -
                      (startupWatchSlug !== void 0 ? 1 : 0) -
                      Z.length -
                      (Be !== null && M?.get(Be.slug) === void 0 && !Z.some((J) => J.slug === Be.slug)
                        ? 1
                        : 0),
                  ),
                ),
        gt = r?.isCommentWakeEnabled ?? isAutoreactArmed;
      if (
        w === "live" &&
        T !== void 0 &&
        wn.length > 0 &&
        getSessionId() === ke &&
        !isBgSession() &&
        n.mayRequestTakeover()
      )
        if (
          toolUseContext.options.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME)) &&
          n.commentsGateOpen() &&
          gt()
        ) {
          let ie = await (
            r?.requestReplyTakeover ?? (await import("./chunk-4te7h8m1.js")).requestReplyTakeover
          )({ holders: [T, ...D], holdersIncomplete: E, conversationId: ke, slugs: wn, reason: "resume" });
          if (((G = ie.kind), ie.armable.size > 0)) N = ie;
        } else G = "cannot_arm";
      let We = N?.armable ?? new Set(),
        tt = (J) => {
          let filtered = [...J].filter((_e) => We.has(_e) && !slugRepliesWiredHere(_e));
          if (filtered.length > 0) N?.undo(new Set(filtered));
        };
      if (getSessionId() !== ke) N?.undo();
      let nt = le(),
        Sn =
          allowed && (any || (((nt !== null && nt.holder !== "bg") || any_2) && w === "none") || We.size > 0),
        Wr = Sn ? n.commentsGateOpen : void 0,
        ht;
      if (Sn) ht = gt();
      let found = toolUseContext.options.tools.find((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME)),
        vn = hiddenBuiltInArtifactTool(),
        An = found ?? (vn !== void 0 && !hasReplyAllowRule(toolUseContext) ? vn : void 0),
        Rn = Wr?.() ?? !1;
      if (Z.length > 0 && oAe())
        carried?.discloseUnattended({
          willRearm: ht === !0 && found !== void 0 && !isBuiltInArtifactHiddenForMcp() && Rn,
        });
      if (!allowed) {
        if ((Fe(Z), getSessionId() === ke)) be(Z);
        return;
      }
      if (getSessionId() !== ke) {
        if (((Se = !0), ve !== void 0)) Fe(ve);
        return;
      }
      Se = !0;
      let Mn = (J) =>
          planCommentMonitorRearm({
            state: n.readFrameState(),
            ...(startupWatchSlug !== void 0 && { excludeSlug: startupWatchSlug }),
            getKnownVer: n.getKnownVer,
            context: toolUseContext,
            publishContext: n.publishContext,
            carried: J.carried,
            ...(J.intent !== void 0 && { resumedIntent: J.intent, tornStops: Ozn() }),
            holderProbe: J.holderProbe,
            ...(J.freedSlugs.size > 0 && { freedSlugs: J.freedSlugs }),
            ...(J.autoReactEnabled !== void 0 && { autoReactEnabled: J.autoReactEnabled }),
            tool: An,
            commentVerbsInSchema: J.commentVerbsInSchema,
            onNotArmed: (ie) => {
              tt([ie]);
            },
            onRecordedNotResumed: (ie, _e) => {
              tt(ie);
              let Ae = claudeAiEnvironment();
              emit([
                createSystemMessage(
                  describeUnprovableResume(
                    ie.map((Me) => artifactViewerUrlFor({ slug: Me, env: Ae })),
                    _e,
                    pt(n),
                  ),
                  "notice",
                ),
              ]);
            },
            onCarriedSkip: (ie, _e) => {
              if ((ce(ie, artifactViewerUrlFor({ slug: ie, env: claudeAiEnvironment() }), _e), !We.has(ie)))
                return;
              if (_e === "arm_in_flight" && getLiveState().live.inFlightWiredIntent.has(ie)) {
                onArmSettled(ie, () => tt([ie]));
                return;
              }
              tt([ie]);
            },
            ...(carried !== void 0 && { onCarriedArmed: carried.onCarriedArmed }),
            parkInFlight: {
              park: (ie) => {
                if (ue === void 0) return;
                let _e = new Set(ie.map((Ae) => Ae.slug));
                ue.repark(
                  ae
                    .filter((Ae) => _e.has(Ae.slug))
                    .map(({ unattendedReplies: unattendedReplies, ...Me }) => Me),
                );
              },
              release: (ie) => {
                if (ue !== void 0) ue.release(ie);
              },
            },
            ...(r?.arm !== void 0 && { arm: r.arm }),
          }),
        xn = n.reprobeHeldAfterMs !== void 0 && w === "live" && We.size === 0 && any_2 && An !== void 0;
      ((z = xn),
        Mn({
          holderProbe: w,
          carried: Z,
          freedSlugs: We,
          autoReactEnabled: ht,
          commentVerbsInSchema: Rn,
          intent: M,
        }));
      let jr = async () => {
        let J = r?.isShuttingDown ?? (await import("./chunk-r3wdn2dp.js")).isShuttingDown;
        if (nt !== null) await new Promise((Me) => onArmSettled(nt.slug, Me));
        if (getSessionId() !== ke || J()) {
          Ie();
          return;
        }
        let ie = () =>
            kn().then(
              (Me) => Me.verdict,
              () => {
                return;
              },
            ),
          _e = await ie();
        if (_e === void 0) {
          (logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", { surface: k }), Ie());
          return;
        }
        if (
          (logFeatureOk("artifact_live_subscribe", {
            holder_gone_on_reprobe: _e === "none",
            reprobe_verdict: fromEnum(_e),
            surface: k,
          }),
          _e !== "none" || getSessionId() !== ke || J())
        ) {
          Ie();
          return;
        }
        let Ae = M;
        if (n.rereadRecords !== void 0 && M !== void 0) {
          let Me = await n.rereadRecords(M).catch(() => null);
          if (Me === null) {
            (logFeatureSad("artifact_live_subscribe", "records_reread_failed", { surface: k }),
              Pe("record_incomplete"));
            return;
          }
          let yt = new Map(),
            In = new Map();
          for (let [kt, zr] of M) {
            let rt = Me.get(kt);
            if (rt === void 0) continue;
            if (rt.state === "stopped" && zr.state === "armed") yt.set(kt, rt.writtenAtMs);
            In.set(kt, rt);
          }
          if (yt.size > 0) applyRemoteStops(yt, { storageV5: storageV5 });
          Ae = In;
          let _t = await ie();
          if (_t !== "none" || getSessionId() !== ke || J()) {
            if (_t === void 0)
              logFeatureSad("artifact_live_subscribe", "holder_reprobe_failed", { surface: k });
            Pe(_t === "live" ? "say" : "holder_unknown");
            return;
          }
        }
        ((w = "none"),
          (T = void 0),
          (D = []),
          Pe("drop"),
          (ne = !0),
          Mn({
            holderProbe: "none",
            carried: [],
            freedSlugs: new Set(),
            autoReactEnabled: gt(),
            commentVerbsInSchema: n.commentsGateOpen(),
            intent: Ae,
          }));
      };
      if (xn && n.reprobeHeldAfterMs !== void 0)
        (
          r?.schedule ??
          ((ie, _e) => {
            setTimeout(ie, _e).unref();
          })
        )(() => {
          jr().catch((ie) => {
            (Ie(),
              logForDebugging(`[frame-live] resume re-probe failed: ${errorMessage(ie)}`, {
                level: "error",
              }));
          });
        }, n.reprobeHeldAfterMs);
      me("rearm", new Set(Z.map((J) => J.slug)));
    })
    .catch((re) => {
      if (
        (logForDebugging(`[frame-live] resume re-arm failed: ${errorMessage(re)}`, { level: "error" }),
        Ie(),
        Se)
      )
        return;
      if ((N?.undo(), getSessionId() === ke)) be(ve);
      if (ve !== void 0) {
        if (oAe()) carried?.discloseUnattended({ willRearm: !1 });
        Fe(ve);
        return;
      }
      carried?.adopted?.then((x) => {
        if (x === void 0 || x.entries.length === 0) return;
        if (x.park !== void 0 && x.park.take().length === 0) return;
        for (let se of x.entries.slice(0, sIe))
          if (se.unattendedReplies !== void 0) BRo(se.slug, se.unattendedReplies);
        if (oAe()) carried?.discloseUnattended({ willRearm: !1 });
        Fe(x.entries);
      });
    });
}
//@ chunk-0sfjpx19.js:116982-118512 placement
function rearmHeadlessCommentMonitors(e) {
  {
    let { hostInitialized: hostInitialized, getAppState: getAppState, deps: deps } = e,
      h;
    try {
      if (
        ((h =
          deps?.publishContext ??
          derivePublishContextFrom({ agentId: void 0, isNonInteractiveSession: !0 }).publishContext),
        h !== "interactive")
      )
        return;
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
      (logForDebugging(`[frame-live] headless resume re-arm gate failed: ${errorMessage(error)}`, {
        level: "error",
      }),
        logError(error));
      return;
    }
    let y =
        deps?.warmFlags ??
        (async () => {
          let { initializeGrowthBook: initializeGrowthBook } = await import("./chunk-6df1d6re.js");
          return initializeGrowthBook();
        }),
      _ =
        deps?.egressAllowed ??
        (async (T, D) => {
          let { isArtifactFetchEnabled: isArtifactFetchEnabled } = await import("./chunk-h6p2kdzg.js");
          return isArtifactFetchEnabled(T, D, { promptless: !0 });
        }),
      b = () => {
        let T = getAppState();
        return {
          artifactRefs: T.artifactRefs,
          artifactReadVersions: T.artifactReadVersions,
          frameUrls: T.frameUrls,
        };
      },
      transcriptAnchor = e.transcriptAnchor,
      w = isStorageV5Enabled() && e.storageV5 !== void 0,
      S = async (T) => {
        if (transcriptAnchor === void 0) return null;
        if (w) {
          let D = await loadTranscriptFromFile(transcriptAnchor.path, e.storageV5);
          if (D.artifactCommentMonitor === void 0) return new Map(T);
          let E = !1,
            N = readCommentMonitorIntent(D.artifactCommentMonitor, {
              onTornStop: () => {
                E = !0;
              },
            });
          return E ? null : N;
        }
        return readCommentMonitorLogTail({
          path: transcriptAnchor.path,
          sessionId: getSessionId(),
          fromByte: transcriptAnchor.size,
          baseline: T,
        });
      };
    rearmOnResumeSafe(
      { initialMessages: e.initialMessages, storageV5: e.storageV5 },
      {
        publishContext: h,
        ui: "host",
        shortNotices: () => !1,
        emit: e.emit,
        reprobeHeldAfterMs: deps?.reprobeHeldAfterMs ?? 1e4,
        gate: async () => {
          (await y().catch(() => null), await hostInitialized);
          let context = e.buildContext(),
            D = await _(context.options.tools, getAppState().toolPermissionContext);
          return { toolUseContext: context, allowed: D };
        },
        readFrameState: b,
        getKnownVer: (T) => mainObservedArtifactVersion(getAppState(), T),
        commentsGateOpen: deps?.commentsGateOpen ?? Xb,
        mayRequestTakeover: () => !1,
        rereadRecords: deps?.rereadRecords ?? S,
      },
      deps?.orchestration,
    );
  }
}
//@ chunk-0sfjpx19.js:118512-118583 placement
function pt(e) {
  return e.ui === "repl" && e.shortNotices() ? "replShort" : e.ui;
}

export {
  describeNotResumedIncomplete,
  EAs,
  classifyMonitorHold,
  describeHeldMonitor,
  describeNotResumedAfterSwitch,
  rearmOnResumeSafe,
  rearmHeadlessCommentMonitors,
};
