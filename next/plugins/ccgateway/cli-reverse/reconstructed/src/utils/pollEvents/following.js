/**
 * utils/pollEvents/following.ts
 *
 * poll_event 的 following 折叠：把被跟随轮次的 hook 停止标记、model 设置层和 turnCompanion 消息整理成可交付的消息流，并提供 clear/判定辅助（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-16n0efh2.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isStoppedContinuation } from "../hooks/replHookFeedback.js";
import { normalizeAttachmentOrEmpty, isEmptyUserMessage } from "../messages.js";
import { stripWideningPermissionLayers } from "../../dialogLaunchers.js";
import { isAbortError } from "../errors.js";
import { logError } from "../log.js";
import { isSkillModelOverrideAllowedInMode } from "../betas.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isPollEventMode } from "../pollEvents.js";
import { sanitizeFileName } from "../../bridge/inboundAttachments.js";
import { isToolResultMessage } from "../messageProvenance.js";

//@ chunk-16n0efh2.js:13032-13428 placement
/**
 * 把 poll_event 的 following 展开成消息与上下文层，跟随命中时把 hook 停止标记换回原消息，非 user 消息标 turnCompanion。
 */
function followedTurnMessages(commands, ownTurn, onlyCommands = false) {
  let messages = [];
  let companions = [];
  for (let command of commands) {
    let following = command.pollEvent?.following;
    if (following === undefined) continue;
    try {
      let isSameTurn = ownTurn !== undefined && isNonEmpty(following.turn, ownTurn.chainId);
      let mapped = following.messages
        .flatMap((message) =>
          isStoppedContinuation(message) && !isSameTurn && !onlyCommands
            ? normalizeAttachmentOrEmpty(message.attachment)
            : [message],
        )
        .map((message) =>
          message.type === "user"
            ? {
                ...message,
                turnCompanion: true,
              }
            : message,
        );
      let layer =
        isSameTurn && ownTurn !== undefined
          ? filterRunnablePool(stripWideningPermissionLayers(following.contextLayers) ?? [], ownTurn)
          : [];
      messages.push(...mapped);
      companions.push(...layer);
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  return {
    messages,
    contextLayers: companions,
  };
}
//@ chunk-16n0efh2.js:13428-13612 placement
/**
 * 过滤模型设置层，去掉当前 mode/fastMode 下不可用的项。
 */
function filterRunnablePool(pool, { mode, fastMode }) {
  return pool.filter((entry) => {
    if (entry.kind !== "model") return true;
    try {
      return isSkillModelOverrideAllowedInMode({
        skillModel: entry.mainLoopModel,
        mode,
        fastMode,
      });
    } catch (error) {
      if (!isAbortError(error)) logError(error);
      return false;
    }
  });
}
//@ chunk-16n0efh2.js:13612-13838 placement
/**
 * 取 following 的消息并在输入尚未开始的场景下判定是否要丢弃迟到技能，必要时记一条遥测。
 */
function lateSkillMessages(messages, turn) {
  let { messages: out } = followedTurnMessages(messages, undefined, true);
  if (out.length === 0) return out;
  let pool;
  try {
    pool = endsWithToolResult(turn);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return expandCompanions(out);
  }
  if (!pool) {
    if (!out.every(isStoppedContinuation))
      logFeatureSad("poll_event_delivery", "late_skill_dropped_new_input");
    return expandCompanions(out);
  }
  return out;
}
//@ chunk-16n0efh2.js:13838-13939 placement
/**
 * 把消息里的 hook 停止标记还原为 turnCompanion 消息。
 */
function expandCompanions(messages) {
  return messages.flatMap((message) =>
    isStoppedContinuation(message)
      ? normalizeAttachmentOrEmpty(message.attachment).map((expanded) => ({
          ...expanded,
          turnCompanion: true,
        }))
      : [],
  );
}
//@ chunk-16n0efh2.js:13999-14043 placement
/**
 * 判定从某下标起是否新增了 hook 停止标记。
 */
function hasCompanionAfter(messages, index) {
  return messages.slice(index).some(isStoppedContinuation);
}
//@ chunk-16n0efh2.js:14043-14232 placement
/**
 * 输入里的 hook 停止若不处理会搁浅时，把带 following 的输入消息滤掉。
 */
function stripFollowedCompanions(commands, turn) {
  try {
    return commands.some(
      ({ pollEvent: command }) =>
        command?.following !== undefined &&
        isNonEmpty(command.following.turn, turn) &&
        command.following.messages.some(isStoppedContinuation),
    )
      ? commands.filter(isPollEventMode)
      : commands;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return commands.filter(isPollEventMode);
  }
}
//@ chunk-16n0efh2.js:14232-14325 placement
/**
 * 清空所有消息上的 pollEvent.following 标记。
 */
function clearFollowing(commands) {
  for (let command of commands)
    if (command.pollEvent?.following !== undefined) command.pollEvent.following = undefined;
}
//@ chunk-16n0efh2.js:14325-14480 placement
/**
 * 轮次开始时交付 following 消息的生成器，返回追加后的输入列表。
 */
function* takeLateSkillMessages(commands, turn) {
  let out;
  try {
    out = lateSkillMessages(commands, turn);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    clearFollowing(commands);
    return turn;
  }
  let late = out.filter(sanitizeFileName);
  let kept = late.length > 0 ? [...turn, ...late] : turn;
  for (let message of out) yield message;
  clearFollowing(commands);
  return kept;
}
//@ chunk-16n0efh2.js:14480-14682 placement
/**
 * 轮次中途交付 following 消息的生成器，收集要应用的上下文层。
 */
function* yieldFollowedCompanions(commands, ownTurn, late) {
  let result;
  try {
    result = followedTurnMessages(commands, ownTurn());
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    result = {
      messages: followedTurnMessages(commands, undefined, true).messages.filter(isStoppedContinuation),
      contextLayers: [],
    };
  }
  for (let message of result.messages) {
    yield message;
    if (sanitizeFileName(message)) late.push(message);
  }
  return result.contextLayers;
}
//@ chunk-16n0efh2.js:14682-14759 placement
/**
 * 取出要应用的 following 设置层并清掉 following 标记。
 */
function withTools(toolName, tools, build) {
  try {
    clearFollowing(toolName);
    return filterRunnablePool(tools, build());
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return [];
  }
}
//@ chunk-16n0efh2.js:14759-14821 placement
/**
 * 判定 following.turn 是否等于当前 chainId。
 */
function isNonEmpty(value, expected) {
  return typeof value === "string" && value.length > 0 && value === expected;
}
//@ chunk-16n0efh2.js:14821-15218 placement
/**
 * 从后往前判定最近一轮是否又回到 assistant，用于决定迟到技能能否丢弃。
 */
function endsWithToolResult(messages) {
  let afterTool = false;
  for (let index = messages.length - 1; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant" && message.isVirtual === true) continue;
    if (message.type === "assistant") return true;
    if (message.type === "attachment") {
      if (message.attachment.type === "poll_events" && message.attachment.deliveredVia === "value_dispatch")
        afterTool = true;
      continue;
    }
    if (message.type !== "user") continue;
    let isMeta = (message.isMeta === true && isEmptyUserMessage(message)) || afterTool;
    let isCompact = isToolResultMessage(message) || message.isCompactSummary === true;
    afterTool = false;
    if (!isMeta && !isCompact) return false;
  }
  return true;
}
export {
  clearFollowing,
  yieldFollowedCompanions,
  takeLateSkillMessages,
  hasCompanionAfter,
  withTools,
  followedTurnMessages,
  stripFollowedCompanions,
};
