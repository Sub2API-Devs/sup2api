/**
 * utils/projectsThreadState.ts
 *
 * 2.1.316 新增：项目线程状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isProjectsHumanOriginEnabled } from "./crossSessionMessagingGate.js";
import { resolvedRowsMode } from "../services/projects/threadRows.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";

//@ chunk-e6aww6q8.js:549847-549945 placement
var TENGU_PROJECTS_THREAD_STATE_STAMP = "tengu_projects_thread_state_stamp";
var TENGU_PROJECTS_THREAD_STATE = "tengu_projects_thread_state";
var PROJECTS_THREAD_STATE_STAMP_FLAG = new HostScoped(() => ({}));
//@ chunk-e6aww6q8.js:549945-549983 placement
function projectsThreadState() {
  return PROJECTS_THREAD_STATE_STAMP_FLAG.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:549983-550013 placement
/**
 * setProjectsThreadStateSource：设置线程状态来源。
 */
function setProjectsThreadStateSource(source) {
  projectsThreadState().source = source;
}
//@ chunk-e6aww6q8.js:550013-550121 placement
function isThreadStateStampEnabled() {
  let source = projectsThreadState().source;
  return (
    source !== undefined &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PROJECTS_THREAD_STATE_STAMP, false) &&
    isProjectsHumanOriginEnabled() &&
    resolvedRowsMode() === "full" &&
    source.isProjectsSession()
  );
}
//@ chunk-e6aww6q8.js:550121-550214 placement
function isHumanOrOwnerRowWritten(carrier) {
  return (
    carrier.origin?.kind === "human" ||
    projectsThreadState().source?.ownerRowsWrittenAt(carrier) !== undefined
  );
}
//@ chunk-e6aww6q8.js:550214-550336 placement
function formatMinutesAgo(sinceUserMs) {
  let max = Math.max(0, Math.floor(sinceUserMs / 60000));
  if (max < 60) return `${max}m ago`;
  return `${Math.floor(max / 60)}h ${max % 60}m ago`;
}
//@ chunk-e6aww6q8.js:550336-550595 placement
function getHumanTurnTimestamp(message, n) {
  let r =
    message.type === "user"
      ? message
      : message.type === "attachment" && message.attachment.type === "queued_command"
        ? message.attachment
        : undefined;
  if (r === undefined) return;
  if (r.origin?.kind === "human") {
    let timestamp = r.type === "user" ? undefined : r.timestamp;
    return Date.parse(timestamp ?? message.timestamp);
  }
  return n(r);
}
//@ chunk-e6aww6q8.js:550595-551039 placement
/**
 * 找到最后一条人类输入的时间，统计其后助手消息中调用指定回答工具的次数，返回距该输入的毫秒数和回复次数。
 */
function measureRepliesSinceUser(
  e,
  n,
  r,
  ownerRowsWrittenAt = () => {
    return;
  },
) {
  let lastUserIndex = -1;
  let lastUserTime = -1 / 0;
  for (let [index, message] of e.entries()) {
    let timestamp = getHumanTurnTimestamp(message, ownerRowsWrittenAt);
    if (timestamp !== undefined && Number.isFinite(timestamp) && timestamp >= lastUserTime) {
      lastUserIndex = index;
      lastUserTime = timestamp;
    }
  }
  if (lastUserIndex < 0) return;
  let replyCount = 0;
  for (let [w, L] of e.entries()) {
    if (L.type !== "assistant" || !Array.isArray(L.message.content)) continue;
    let messageTime = Date.parse(L.timestamp);
    if (Number.isFinite(messageTime) ? messageTime <= lastUserTime : w <= lastUserIndex) continue;
    for (let block of L.message.content) if (block.type === "tool_use" && block.name === r) replyCount++;
  }
  return {
    sinceUserMs: n - lastUserTime,
    repliesSinceUser: replyCount,
  };
}
//@ chunk-e6aww6q8.js:551039-551197 placement
function logThreadStateOutcome(e) {
  logEvent(TENGU_PROJECTS_THREAD_STATE, {
    outcome: lit_2(e),
  });
  if (e === "stamped") logFeatureOk("projects_thread_state");
  else if (e === "not_thread" || e === "no_user_message") logFeatureSad("projects_thread_state", e);
}
//@ chunk-e6aww6q8.js:551197-551497 placement
/**
 * 判断本回合是否要附带 Projects 线程状态：需功能开启、处于线程（非概览）中，且不是用户回合或会话间消息回合。
 */
function shouldStampThreadState(e) {
  try {
    let source = projectsThreadState().source;
    if (source === undefined || !isThreadStateStampEnabled() || source.isOverview()) return false;
    if (e.carrier !== undefined && isHumanOrOwnerRowWritten(e.carrier)) {
      logThreadStateOutcome("user_turn");
      return false;
    }
    if (e.isPeer) {
      logThreadStateOutcome("peer_turn");
      return false;
    }
    if (!source.isThread()) {
      logThreadStateOutcome("not_thread");
      return false;
    }
    return true;
  } catch (error) {
    logError(error);
    logFeatureBad("projects_thread_state", "threw");
    return false;
  }
}
//@ chunk-e6aww6q8.js:551497-551822 placement
/**
 * 计算 Projects 线程状态：距最后一次用户输入多久以及之后回复了几次；没有用户消息时返回 undefined。
 */
function getProjectsThreadState(e = Date.now()) {
  try {
    let source = projectsThreadState().source;
    if (source === undefined || !isThreadStateStampEnabled()) return;
    let r = measureRepliesSinceUser(source.messages(), e, source.answerToolName(), source.ownerRowsWrittenAt);
    if (!r) {
      logThreadStateOutcome("no_user_message");
      return;
    }
    logThreadStateOutcome("stamped");
    return {
      sinceUser: formatMinutesAgo(r.sinceUserMs),
      repliesSinceUser: r.repliesSinceUser,
    };
  } catch (error) {
    logError(error);
    logFeatureBad("projects_thread_state", "threw");
    return;
  }
}
export { shouldStampThreadState, setProjectsThreadStateSource, getProjectsThreadState };
