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
var TENGU_PROJECTS_THREAD_STATE_STAMP = "tengu_projects_thread_state_stamp",
  TENGU_PROJECTS_THREAD_STATE = "tengu_projects_thread_state",
  Fmo = new HostScoped(() => ({}));
//@ chunk-e6aww6q8.js:549945-549983 placement
function Q9() {
  return Fmo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:549983-550013 placement
function TXs(e) {
  Q9().source = e;
}
//@ chunk-e6aww6q8.js:550013-550121 placement
function isThreadStateStampEnabled() {
  let source = Q9().source;
  return (
    source !== void 0 &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PROJECTS_THREAD_STATE_STAMP, !1) &&
    isProjectsHumanOriginEnabled() &&
    resolvedRowsMode() === "full" &&
    source.isProjectsSession()
  );
}
//@ chunk-e6aww6q8.js:550121-550214 placement
function $mo(e) {
  return e.origin?.kind === "human" || Q9().source?.ownerRowsWrittenAt(e) !== void 0;
}
//@ chunk-e6aww6q8.js:550214-550336 placement
function formatMinutesAgo(e) {
  let max = Math.max(0, Math.floor(e / 60000));
  if (max < 60) return `${max}m ago`;
  return `${Math.floor(max / 60)}h ${max % 60}m ago`;
}
//@ chunk-e6aww6q8.js:550336-550595 placement
function getHumanTurnTimestamp(e, n) {
  let r =
    e.type === "user"
      ? e
      : e.type === "attachment" && e.attachment.type === "queued_command"
        ? e.attachment
        : void 0;
  if (r === void 0) return;
  if (r.origin?.kind === "human") {
    let s = r.type === "user" ? void 0 : r.timestamp;
    return Date.parse(s ?? e.timestamp);
  }
  return n(r);
}
/**
 * 找到最后一条人类输入的时间，统计其后助手消息中调用指定回答工具的次数，返回距该输入的毫秒数和回复次数。
 */
//@ chunk-e6aww6q8.js:550595-551039 placement
function measureRepliesSinceUser(
  e,
  n,
  r,
  s = () => {
    return;
  },
) {
  let lastUserIndex = -1,
    lastUserTime = -1 / 0;
  for (let [index, message] of e.entries()) {
    let timestamp = getHumanTurnTimestamp(message, s);
    if (timestamp !== void 0 && Number.isFinite(timestamp) && timestamp >= lastUserTime)
      ((lastUserIndex = index), (lastUserTime = timestamp));
  }
  if (lastUserIndex < 0) return;
  let replyCount = 0;
  for (let [w, L] of e.entries()) {
    if (L.type !== "assistant" || !Array.isArray(L.message.content)) continue;
    let messageTime = Date.parse(L.timestamp);
    if (Number.isFinite(messageTime) ? messageTime <= lastUserTime : w <= lastUserIndex) continue;
    for (let block of L.message.content) if (block.type === "tool_use" && block.name === r) replyCount++;
  }
  return { sinceUserMs: n - lastUserTime, repliesSinceUser: replyCount };
}
//@ chunk-e6aww6q8.js:551039-551197 placement
function logThreadStateOutcome(e) {
  if ((logEvent(TENGU_PROJECTS_THREAD_STATE, { outcome: lit_2(e) }), e === "stamped"))
    logFeatureOk("projects_thread_state");
  else if (e === "not_thread" || e === "no_user_message") logFeatureSad("projects_thread_state", e);
}
/**
 * 判断本回合是否要附带 Projects 线程状态：需功能开启、处于线程（非概览）中，且不是用户回合或会话间消息回合。
 */
//@ chunk-e6aww6q8.js:551197-551497 placement
function shouldStampThreadState(e) {
  try {
    let source = Q9().source;
    if (source === void 0 || !isThreadStateStampEnabled() || source.isOverview()) return !1;
    if (e.carrier !== void 0 && $mo(e.carrier)) return (logThreadStateOutcome("user_turn"), !1);
    if (e.isPeer) return (logThreadStateOutcome("peer_turn"), !1);
    if (!source.isThread()) return (logThreadStateOutcome("not_thread"), !1);
    return !0;
  } catch (error) {
    return (logError(error), logFeatureBad("projects_thread_state", "threw"), !1);
  }
}
/**
 * 计算 Projects 线程状态：距最后一次用户输入多久以及之后回复了几次；没有用户消息时返回 undefined。
 */
//@ chunk-e6aww6q8.js:551497-551822 placement
function getProjectsThreadState(e = Date.now()) {
  try {
    let source = Q9().source;
    if (source === void 0 || !isThreadStateStampEnabled()) return;
    let r = measureRepliesSinceUser(source.messages(), e, source.answerToolName(), source.ownerRowsWrittenAt);
    if (!r) {
      logThreadStateOutcome("no_user_message");
      return;
    }
    return (
      logThreadStateOutcome("stamped"),
      { sinceUser: formatMinutesAgo(r.sinceUserMs), repliesSinceUser: r.repliesSinceUser }
    );
  } catch (error) {
    (logError(error), logFeatureBad("projects_thread_state", "threw"));
    return;
  }
}

export { shouldStampThreadState, TXs, getProjectsThreadState };
