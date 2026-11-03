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
function classifyMessageSource(e) {
  let r = classifyMessageFrame(e);
  switch (r.frame) {
    case "non-user":
      return r.kind === "unclassified" || (r.origin.kind === "plugin" && r.origin.asUser === true)
        ? "person"
        : "machine";
    case "invisible":
      return r.reason === "projects-relay" ? "person" : "unseen";
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
function tryOrFallback(e, r) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return r;
  }
}
//@ chunk-651cmq7s.js:830-931 placement
/**
 * 判断队列输入是否来自人类（poll 事件来源可信或消息归类为 person），出错时视为是。
 */
function isPersonQueuedInput(e) {
  return tryOrFallback(
    () =>
      isAuthoritativeProvenance(e.pollEvent?.provenance) ||
      classifyMessageSource({
        ...e,
        commandMode: e.mode,
      }) === "person",
    true,
  );
}
//@ chunk-651cmq7s.js:931-1061 placement
/**
 * 判断消息是否是来源可信的 poll 事件附件，出错时视为是。
 */
function hasAuthoritativePollEvents(e) {
  return tryOrFallback(
    () =>
      e.type === "attachment" &&
      e.attachment.type === "poll_events" &&
      (e.attachment.provenance?.some(isAuthoritativeProvenance) ?? true),
    true,
  );
}
//@ chunk-651cmq7s.js:1061-1120 placement
/**
 * 判断工具名是否为提问类工具（AskUserQuestion 等），异常时按是处理。
 */
function isQuestionTool({ name: e }) {
  return tryOrFallback(() => e === ASKUSERQUESTION || HEARTH_READ_TOOLS.has(e), true);
}
//@ chunk-651cmq7s.js:1120-1418 placement
/**
 * 判断一段消息里所有用户回合都不是人类输入（或只是关机中断），且没有特定工具调用；出错时返回 false。
 */
function isMachineOnlyTurnRange(e) {
  return tryOrFallback(
    () =>
      !e.some(
        (r) =>
          r.type === "assistant" && r.message.content.some((n) => n.type === "tool_use" && isQuestionTool(n)),
      ) &&
      allUserTurnsSatisfy(e, (r, n) =>
        n.type === "user"
          ? classifyMessageSource(n) !== "person" ||
            (n.interruptedByShutdown === true && isInterruptionOnlyMessage(n))
          : n.type === "attachment" &&
            n.attachment.type === "queued_command" &&
            classifyMessageSource(n.attachment) !== "person",
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
      (n) =>
        n.type === "user" &&
        n.turnOrigin !== undefined &&
        isHumanAuthoredTurn(n) &&
        classifyMessageSource(n) === "machine",
    );
    return lastIndex !== -1 && isMachineOnlyTurnRange(messages.slice(lastIndex));
  }, false);
}
//@ chunk-651cmq7s.js:1577-1875 placement
function classifyMessageSource_2(messages) {
  return tryOrFallback(() => {
    let lastIndex = messages.findLastIndex(
      (s) =>
        s.type === "user" &&
        s.turnOrigin !== undefined &&
        isHumanAuthoredTurn(s) &&
        (s.wakeupSource !== undefined || classifyMessageSource(s) !== "unseen"),
    );
    let n = messages[lastIndex];
    if (n?.type !== "user") return false;
    return (
      (n.wakeupSource !== undefined ||
        (classifyMessageSource(n) === "machine" &&
          (n.origin?.kind !== "peer" || isPeerOrObserver(n.origin)))) &&
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
