/**
 * utils/backgroundHandoff.ts
 *
 * 2.1.316 新增：后台交接状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8fqgaf3a.js (20)
 * attribution: placement 20
 */
import { isAgentsFleetEnabled } from "./fleetGates.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import { hooksSnapshotKey, screensChanged } from "./processUserInput/userPromptSubmitHooks.js";
import { logForDebugging } from "./debug.js";
import { isCheckinNotification } from "./messageQueueManager.js";
import { looksLikeSlashInput } from "../commands.js";
import { plural } from "./stringUtils.js";
import { isInterruptionOnlyMessage } from "./messages.js";
import { isTranscriptPersistenceDisabled } from "./sessionStorage.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8fqgaf3a.js:9830-9864 placement
/**
 * 允许 agent 编队且非远程模式（才能转后台）。
 */
function isFleetBackgroundAllowed() {
  return isAgentsFleetEnabled() && !getIsRemoteMode();
}
//@ chunk-8fqgaf3a.js:9864-9950 placement
/**
 * 按加载状态给出转后台方式（idle-fork、defer-then-fork、abort-then-fork）。
 */
function backgroundVia(isLoading, betweenCalls) {
  if (!isLoading) return "idle-fork";
  return betweenCalls ? "defer-then-fork" : "abort-then-fork";
}
//@ chunk-8fqgaf3a.js:9950-10350 placement
/**
 * 当前能否转后台及方式（detach 或其他），不能时给原因。
 */
function backgroundEligibility(options) {
  let { inFlight } = options;
  if (options.isBg)
    return {
      ok: true,
      via: "detach",
      inFlight,
    };
  if (!options.fleetEnabled)
    return {
      ok: false,
      reason: "fleet-disabled",
      inFlight,
    };
  if (options.isRemote)
    return {
      ok: false,
      reason: "remote",
      inFlight,
    };
  if (options.persistenceDisabled)
    return {
      ok: false,
      reason: "persistence",
      inFlight,
    };
  if (options.isExternalLoading)
    return {
      ok: false,
      reason: "loading",
      inFlight,
    };
  return {
    ok: true,
    via: backgroundVia(options.isLoading, options.betweenCalls),
    inFlight,
  };
}
//@ chunk-8fqgaf3a.js:10350-10385 placement
/**
 * 非远程且 assistant 未在流式输出（处于可转后台的空闲点）。
 */
function isIdleForBackground(snapshot, isBusy) {
  return !isBusy && !isAssistantStreaming(snapshot);
}
//@ chunk-8fqgaf3a.js:10385-10540 placement
function isAssistantStreaming(snapshot) {
  for (let i = snapshot.length - 1; i >= 0; i--) {
    let message = snapshot[i];
    if (message.type === "assistant") return message.message?.stop_reason === null;
    if (message.type === "user") return false;
  }
  return false;
}
//@ chunk-8fqgaf3a.js:10540-10813 placement
/**
 * 生成中助手文本长度。
 */
function streamingTextLength(snapshot) {
  let totalLength = 0;
  for (let i = snapshot.length - 1; i >= 0; i--) {
    let message = snapshot[i];
    if (message.type === "assistant") {
      if (message.message?.stop_reason !== null) return totalLength;
      for (let block of message.message?.content ?? [])
        if (block.type === "text" && typeof block.text === "string") totalLength += block.text.length;
    } else if (message.type === "user") return totalLength;
  }
  return totalLength;
}
//@ chunk-8fqgaf3a.js:10813-11175 placement
/**
 * 生成中助手文本（加未发送尾部）。
 */
function streamingTextSoFar(snapshot, pendingText) {
  let startIndex = snapshot.length;
  for (let i = snapshot.length - 1; i >= 0; i--) {
    let message = snapshot[i];
    if (message.type === "assistant") {
      if (message.message?.stop_reason !== null) break;
      startIndex = i;
    } else if (message.type === "user") break;
  }
  let text = "";
  for (let index = startIndex; index < snapshot.length; index++) {
    let message = snapshot[index];
    if (message.type !== "assistant") continue;
    for (let block of message.message?.content ?? [])
      if (block.type === "text" && typeof block.text === "string") text += block.text;
  }
  return text + (pendingText ?? "");
}
//@ chunk-8fqgaf3a.js:11175-11363 placement
/**
 * 判断提示是否处于筛查保留中（读取失败视为保留）。
 */
function createHeldScreeningCheck(getScreening) {
  let baseline;
  let failed = false;
  return (promptSubmitted) => {
    if (failed) return true;
    try {
      baseline ??= hooksSnapshotKey(getScreening());
      return screensChanged(promptSubmitted.under, baseline);
    } catch (error) {
      failed = true;
      logForDebugging(`heldScreening could not read the screening: ${error}`, {
        level: "error",
      });
      return true;
    }
  };
}
//@ chunk-8fqgaf3a.js:11363-11641 placement
/**
 * 排队命令中不能随交接带走的数量。
 */
function countHeldQueuedCommands(commandQueue, heldScreeningCheck) {
  let heldCount = 0;
  for (let command of commandQueue) {
    if (isCheckinNotification(command)) continue;
    if (
      command.priority === "later" ||
      command.drainOnly === true ||
      command.screeningPending === true ||
      (command.promptSubmitted !== undefined &&
        heldScreeningCheck !== undefined &&
        heldScreeningCheck(command.promptSubmitted)) ||
      command.mode === "bash" ||
      command.mode === "poll-event" ||
      (looksLikeSlashInput(command.value) && !command.skipSlashCommands)
    )
      heldCount++;
  }
  return heldCount;
}
//@ chunk-8fqgaf3a.js:11641-11871 placement
/**
 * 等待子代理以便交接的提示。
 */
function waitingForSubagentsMessage(restartableCount) {
  return `Still backgrounding after the current tool \u2014 waiting for ${restartableCount} running ${plural(restartableCount, "subagent")} so the work carries over. Press \u2190 again to skip ahead and restart ${restartableCount === 1 ? "it" : "them"} from the beginning.`;
}
//@ chunk-8fqgaf3a.js:11871-11958 placement
/**
 * 生成转后台受阻的说明文本。
 */
function backgroundBlockedMessage(reason, detail) {
  return `Backgrounding cancelled \u2014 ${reason}.${detail === undefined ? "" : ` ${detail}`}`;
}
//@ chunk-8fqgaf3a.js:11958-12182 placement
/**
 * 转后台受阻提示。
 */
var UNSENT_INPUT_BLOCK; // deferred: uses backgroundBlockedMessage of its import cycle while loading; runs once the cycle is complete
var WAITING_FOR_ANSWER_MESSAGE;
var TURN_STOPPED_BLOCK;
deferInit("chunk-8fqgaf3a.js:11958", () => {
  UNSENT_INPUT_BLOCK = backgroundBlockedMessage(
    "you have unsent text in the input",
    "Send it or clear it, then press \u2190 again.",
  );
  WAITING_FOR_ANSWER_MESSAGE =
    "Still backgrounding after the current tool \u2014 a question is waiting for your answer.";
  TURN_STOPPED_BLOCK = backgroundBlockedMessage("the turn was stopped");
});
//@ chunk-8fqgaf3a.js:12182-12375 placement (2.1.88 match: _temp, 1)
function isToolResultUserMessage(c) {
  if (c.type !== "user") return false;
  let content = c.message?.content;
  return (
    Array.isArray(content) &&
    content[0]?.type === "tool_result" &&
    content.every((block) => block.type === "tool_result" || block.type === "text" || block.type === "image")
  );
}
//@ chunk-8fqgaf3a.js:12375-12547 placement
function isUnfinishedTailMessage(message) {
  if (message.type === "system") return true;
  if (message.type === "assistant") {
    let stopReason = message.message?.stop_reason;
    return stopReason === null || stopReason === "tool_use";
  }
  if (message.type === "user") return isInterruptionOnlyMessage(message);
  return false;
}
//@ chunk-8fqgaf3a.js:12547-12879 placement
/**
 * 去掉末尾未完成的助手/中断消息。
 */
function trimIncompleteTail(messages) {
  let endIndex = messages.length;
  let sawToolResult = false;
  while (endIndex > 0) {
    let message = messages[endIndex - 1];
    if (message.type === "user") {
      if (isInterruptionOnlyMessage(message)) sawToolResult ||= isToolResultUserMessage(message);
      else if (sawToolResult && isToolResultUserMessage(message));
      else break;
    } else if (message.type === "assistant") {
      if (!isUnfinishedTailMessage(message)) break;
      sawToolResult = false;
    }
    endIndex--;
  }
  let filtered = messages
    .slice(endIndex)
    .filter(
      (message) => message.type !== "user" && message.type !== "assistant" && message.type !== "system",
    );
  if (endIndex + filtered.length === messages.length) return messages;
  return [...messages.slice(0, endIndex), ...filtered];
}
//@ chunk-8fqgaf3a.js:12879-13010 placement
/**
 * 修剪后最后一条用户或助手消息 uuid。
 */
function lastSettledMessageUuid(snapshot) {
  let trimmed = trimIncompleteTail(snapshot);
  for (let i = trimmed.length - 1; i >= 0; i--) {
    let type = trimmed[i].type;
    if (type === "user" || type === "assistant") return trimmed[i].uuid;
  }
  return;
}
//@ chunk-8fqgaf3a.js:13010-13229 placement
/**
 * 消息列表是否仍停在记录的位置之后。
 */
function isAtResumePoint(resumePoint, snapshot) {
  if (resumePoint === null || resumePoint.length < 1 || resumePoint.length > snapshot.length) return false;
  let pointIndex = resumePoint.length - 1;
  if (snapshot[pointIndex]?.uuid !== resumePoint.uuid) return false;
  for (let index = resumePoint.length; index < snapshot.length; index++) {
    let type = snapshot[index].type;
    if (type === "user" || type === "assistant") return false;
  }
  return true;
}
//@ chunk-8fqgaf3a.js:13229-13361 placement
/**
 * 最后一条对话消息是非中断的用户消息。
 */
function endsWithUserPrompt(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message.type === "user") return !isInterruptionOnlyMessage(message);
    if (message.type === "assistant") return false;
  }
  return false;
}
//@ chunk-8fqgaf3a.js:13361-13407 placement
/**
 * 转后台可行、但不是直接 detach 时需要先 detach。
 */
function needsDetachBeforeBackground(eligibility) {
  return eligibility.ok && eligibility.via !== "detach";
}
//@ chunk-8fqgaf3a.js:13407-13498 placement
/**
 * 按当前会话状态（编队、远程、持久化）计算能否转后台。
 */
function backgroundEligibilityForSession(base) {
  return backgroundEligibility({
    ...base,
    fleetEnabled: isAgentsFleetEnabled(),
    isRemote: getIsRemoteMode(),
    persistenceDisabled: isTranscriptPersistenceDisabled(),
  });
}
export {
  trimIncompleteTail,
  endsWithUserPrompt,
  TURN_STOPPED_BLOCK,
  UNSENT_INPUT_BLOCK,
  backgroundEligibilityForSession,
  needsDetachBeforeBackground,
  countHeldQueuedCommands,
  createHeldScreeningCheck,
  streamingTextLength,
  streamingTextSoFar,
  lastSettledMessageUuid,
  isIdleForBackground,
  waitingForSubagentsMessage,
  WAITING_FOR_ANSWER_MESSAGE,
  isAtResumePoint,
  backgroundBlockedMessage,
  isFleetBackgroundAllowed,
};
