/**
 * utils/messages/messageSource.ts
 *
 * 消息来源分类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-651cmq7s.js (9)
 * attribution: placement 9
 */
import { classifyMessageFrame, isPeerOrObserver } from "../messageProvenance.js";
import { logError } from "../log.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { HEARTH_READ_TOOLS } from "../../services/mcp/ccrMetaMcp.js";
import { allUserTurnsSatisfy } from "../turnOrigin.js";
import { isInterruptionOnlyMessage } from "../messages.js";
import { isHumanAuthoredTurn } from "../messagePredicates.js";

//@ chunk-651cmq7s.js:382-666 placement
/**
 * 把消息帧归类为 person（人类/中继人类/摘要/以用户身份的插件）、machine（其他非用户来源）或 unseen（不可见，Projects 中继除外视为 person）。
 */
function classifyMessageSource(message) {
  let frame = classifyMessageFrame(message);
  switch (frame.frame) {
    case "non-user":
      return frame.kind === "unclassified" || (frame.origin.kind === "plugin" && frame.origin.asUser === true)
        ? "person"
        : "machine";
    case "invisible":
      return frame.reason === "projects-relay" ? "person" : "unseen";
    case "human":
    case "relay-human":
    case "summary":
      return "person";
  }
}
//@ chunk-651cmq7s.js:666-775 placement
function isAuthoritativeProvenance(provenance) {
  switch (provenance?.authority) {
    case undefined:
    case "peer-agent":
    case "world-event":
      return false;
    default:
      return true;
  }
}
//@ chunk-651cmq7s.js:775-830 placement
function tryOrFallback(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    logError(error);
    return fallback;
  }
}
//@ chunk-651cmq7s.js:830-931 placement
/**
 * 判断队列输入是否来自人类（poll 事件来源可信或消息归类为 person），出错时视为是。
 */
function isPersonQueuedInput(command) {
  return tryOrFallback(
    () =>
      isAuthoritativeProvenance(command.pollEvent?.provenance) ||
      classifyMessageSource({
        ...command,
        commandMode: command.mode,
      }) === "person",
    true,
  );
}
//@ chunk-651cmq7s.js:931-1061 placement
/**
 * 判断消息是否是来源可信的 poll 事件附件，出错时视为是。
 */
function hasAuthoritativePollEvents(message) {
  return tryOrFallback(
    () =>
      message.type === "attachment" &&
      message.attachment.type === "poll_events" &&
      (message.attachment.provenance?.some(isAuthoritativeProvenance) ?? true),
    true,
  );
}
//@ chunk-651cmq7s.js:1061-1120 placement
/**
 * 判断工具名是否为提问类工具（AskUserQuestion 等），异常时按是处理。
 */
function isQuestionTool({ name: toolName }) {
  return tryOrFallback(() => toolName === ASKUSERQUESTION || HEARTH_READ_TOOLS.has(toolName), true);
}
//@ chunk-651cmq7s.js:1120-1418 placement
/**
 * 判断一段消息里所有用户回合都不是人类输入（或只是关机中断），且没有特定工具调用；出错时返回 false。
 */
function isMachineOnlyTurnRange(messages) {
  return tryOrFallback(
    () =>
      !messages.some(
        (message) =>
          message.type === "assistant" &&
          message.message.content.some((block) => block.type === "tool_use" && isQuestionTool(block)),
      ) &&
      allUserTurnsSatisfy(messages, (block, message) =>
        message.type === "user"
          ? classifyMessageSource(message) !== "person" ||
            (message.interruptedByShutdown === true && isInterruptionOnlyMessage(message))
          : message.type === "attachment" &&
            message.attachment.type === "queued_command" &&
            classifyMessageSource(message.attachment) !== "person",
      ),
    false,
  );
}
//@ chunk-651cmq7s.js:1418-1577 placement
/**
 * 判断消息末尾是否从一个由机器发起的人类形式回合开始全部为机器回合，出错时返回 false。
 */
function endsWithMachineTurn(messages) {
  return tryOrFallback(() => {
    let lastIndex = messages.findLastIndex(
      (message) =>
        message.type === "user" &&
        message.turnOrigin !== undefined &&
        isHumanAuthoredTurn(message) &&
        classifyMessageSource(message) === "machine",
    );
    return lastIndex !== -1 && isMachineOnlyTurnRange(messages.slice(lastIndex));
  }, false);
}
//@ chunk-651cmq7s.js:1577-1875 placement
function classifyMessageSource_2(messages) {
  return tryOrFallback(() => {
    let lastIndex = messages.findLastIndex(
      (message) =>
        message.type === "user" &&
        message.turnOrigin !== undefined &&
        isHumanAuthoredTurn(message) &&
        (message.wakeupSource !== undefined || classifyMessageSource(message) !== "unseen"),
    );
    let lastMessage = messages[lastIndex];
    if (lastMessage?.type !== "user") return false;
    return (
      (lastMessage.wakeupSource !== undefined ||
        (classifyMessageSource(lastMessage) === "machine" &&
          (lastMessage.origin?.kind !== "peer" || isPeerOrObserver(lastMessage.origin)))) &&
      isMachineOnlyTurnRange(messages.slice(lastIndex))
    );
  }, false);
}
export {
  isMachineOnlyTurnRange,
  endsWithMachineTurn,
  isPersonQueuedInput,
  hasAuthoritativePollEvents,
  isQuestionTool,
  classifyMessageSource_2,
};
