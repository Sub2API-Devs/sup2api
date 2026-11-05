/**
 * utils/projectsThreadState.ts
 *
 * 2.1.316 新增：项目线程状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:556603-556701 placement
var TENGU_PROJECTS_THREAD_STATE_STAMP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TENGU_PROJECTS_THREAD_STATE;
var PROJECTS_THREAD_STATE_STAMP_FLAG;
deferInit("chunk-5xgkngpb.js:556603", () => {
  TENGU_PROJECTS_THREAD_STATE_STAMP = "tengu_projects_thread_state_stamp";
  TENGU_PROJECTS_THREAD_STATE = "tengu_projects_thread_state";
  PROJECTS_THREAD_STATE_STAMP_FLAG = new HostScoped(() => ({}));
});
//@ chunk-5xgkngpb.js:556701-556739 placement
function projectsThreadState() {
  return PROJECTS_THREAD_STATE_STAMP_FLAG.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:556739-556769 placement
/**
 * setProjectsThreadStateSource：设置线程状态来源。
 */
function setProjectsThreadStateSource(source) {
  projectsThreadState().source = source;
}
//@ chunk-5xgkngpb.js:556769-556877 placement
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
//@ chunk-5xgkngpb.js:556877-556970 placement
function isHumanOrOwnerRowWritten(carrier) {
  return (
    carrier.origin?.kind === "human" ||
    projectsThreadState().source?.ownerRowsWrittenAt(carrier) !== undefined
  );
}
//@ chunk-5xgkngpb.js:556970-557092 placement
function formatMinutesAgo(sinceUserMs) {
  let max = Math.max(0, Math.floor(sinceUserMs / 60000));
  if (max < 60) return `${max}m ago`;
  return `${Math.floor(max / 60)}h ${max % 60}m ago`;
}
//@ chunk-5xgkngpb.js:557092-557351 placement
function getHumanTurnTimestamp(message, ownerRowsWrittenAt) {
  let source =
    message.type === "user"
      ? message
      : message.type === "attachment" && message.attachment.type === "queued_command"
        ? message.attachment
        : undefined;
  if (source === undefined) return;
  if (source.origin?.kind === "human") {
    let timestamp = source.type === "user" ? undefined : source.timestamp;
    return Date.parse(timestamp ?? message.timestamp);
  }
  return ownerRowsWrittenAt(source);
}
//@ chunk-5xgkngpb.js:557351-557795 placement
/**
 * 找到最后一条人类输入的时间，统计其后助手消息中调用指定回答工具的次数，返回距该输入的毫秒数和回复次数。
 */
function measureRepliesSinceUser(
  messages,
  now,
  answerToolName,
  ownerRowsWrittenAt = () => {
    return;
  },
) {
  let lastUserIndex = -1;
  let lastUserTime = -1 / 0;
  for (let [index, message] of messages.entries()) {
    let timestamp = getHumanTurnTimestamp(message, ownerRowsWrittenAt);
    if (timestamp !== undefined && Number.isFinite(timestamp) && timestamp >= lastUserTime) {
      lastUserIndex = index;
      lastUserTime = timestamp;
    }
  }
  if (lastUserIndex < 0) return;
  let replyCount = 0;
  for (let [index, message] of messages.entries()) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    let messageTime = Date.parse(message.timestamp);
    if (Number.isFinite(messageTime) ? messageTime <= lastUserTime : index <= lastUserIndex) continue;
    for (let block of message.message.content)
      if (block.type === "tool_use" && block.name === answerToolName) replyCount++;
  }
  return {
    sinceUserMs: now - lastUserTime,
    repliesSinceUser: replyCount,
  };
}
//@ chunk-5xgkngpb.js:557795-557953 placement
function logThreadStateOutcome(outcome) {
  logEvent(TENGU_PROJECTS_THREAD_STATE, {
    outcome: lit_2(outcome),
  });
  if (outcome === "stamped") logFeatureOk("projects_thread_state");
  else if (outcome === "not_thread" || outcome === "no_user_message")
    logFeatureSad("projects_thread_state", outcome);
}
//@ chunk-5xgkngpb.js:557953-558253 placement
/**
 * 判断本回合是否要附带 Projects 线程状态：需功能开启、处于线程（非概览）中，且不是用户回合或会话间消息回合。
 */
function shouldStampThreadState(carrier) {
  try {
    let source = projectsThreadState().source;
    if (source === undefined || !isThreadStateStampEnabled() || source.isOverview()) return false;
    if (carrier.carrier !== undefined && isHumanOrOwnerRowWritten(carrier.carrier)) {
      logThreadStateOutcome("user_turn");
      return false;
    }
    if (carrier.isPeer) {
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
//@ chunk-5xgkngpb.js:558253-558578 placement
/**
 * 计算 Projects 线程状态：距最后一次用户输入多久以及之后回复了几次；没有用户消息时返回 undefined。
 */
function getProjectsThreadState(now = Date.now()) {
  try {
    let source = projectsThreadState().source;
    if (source === undefined || !isThreadStateStampEnabled()) return;
    let measurement = measureRepliesSinceUser(
      source.messages(),
      now,
      source.answerToolName(),
      source.ownerRowsWrittenAt,
    );
    if (!measurement) {
      logThreadStateOutcome("no_user_message");
      return;
    }
    logThreadStateOutcome("stamped");
    return {
      sinceUser: formatMinutesAgo(measurement.sinceUserMs),
      repliesSinceUser: measurement.repliesSinceUser,
    };
  } catch (error) {
    logError(error);
    logFeatureBad("projects_thread_state", "threw");
    return;
  }
}
export { setProjectsThreadStateSource, shouldStampThreadState, getProjectsThreadState };
