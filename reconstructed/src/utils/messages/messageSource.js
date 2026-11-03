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
import { isHumanAuthoredTurn } from "./_new/isHumanAuthoredTurn.js";

/**
 * 把消息帧归类为 person（人类/中继人类/摘要/以用户身份的插件）、machine（其他非用户来源）或 unseen（不可见，Projects 中继除外视为 person）。
 */
//@ chunk-651cmq7s.js:382-666 placement
function classifyMessageSource(e) {
  let r = classifyMessageFrame(e);
  switch (r.frame) {
    case "non-user":
      return r.kind === "unclassified" || (r.origin.kind === "plugin" && r.origin.asUser === !0)
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
function isAuthoritativeProvenance(e) {
  switch (e?.authority) {
    case void 0:
    case "peer-agent":
    case "world-event":
      return !1;
    default:
      return !0;
  }
}
//@ chunk-651cmq7s.js:775-830 placement
function t(e, r) {
  try {
    return e();
  } catch (error) {
    return (logError(error), r);
  }
}
/**
 * 判断队列输入是否来自人类（poll 事件来源可信或消息归类为 person），出错时视为是。
 */
//@ chunk-651cmq7s.js:830-931 placement
function isPersonQueuedInput(e) {
  return t(
    () =>
      isAuthoritativeProvenance(e.pollEvent?.provenance) ||
      classifyMessageSource({ ...e, commandMode: e.mode }) === "person",
    !0,
  );
}
/**
 * 判断消息是否是来源可信的 poll 事件附件，出错时视为是。
 */
//@ chunk-651cmq7s.js:931-1061 placement
function hasAuthoritativePollEvents(e) {
  return t(
    () =>
      e.type === "attachment" &&
      e.attachment.type === "poll_events" &&
      (e.attachment.provenance?.some(isAuthoritativeProvenance) ?? !0),
    !0,
  );
}
//@ chunk-651cmq7s.js:1061-1120 placement
function iCo({ name: e }) {
  return t(() => e === ASKUSERQUESTION || HEARTH_READ_TOOLS.has(e), !0);
}
/**
 * 判断一段消息里所有用户回合都不是人类输入（或只是关机中断），且没有特定工具调用；出错时返回 false。
 */
//@ chunk-651cmq7s.js:1120-1418 placement
function isMachineOnlyTurnRange(e) {
  return t(
    () =>
      !e.some(
        (r) => r.type === "assistant" && r.message.content.some((n) => n.type === "tool_use" && iCo(n)),
      ) &&
      allUserTurnsSatisfy(e, (r, n) =>
        n.type === "user"
          ? classifyMessageSource(n) !== "person" ||
            (n.interruptedByShutdown === !0 && isInterruptionOnlyMessage(n))
          : n.type === "attachment" &&
            n.attachment.type === "queued_command" &&
            classifyMessageSource(n.attachment) !== "person",
      ),
    !1,
  );
}
/**
 * 判断消息末尾是否从一个由机器发起的人类形式回合开始全部为机器回合，出错时返回 false。
 */
//@ chunk-651cmq7s.js:1418-1577 placement
function endsWithMachineTurn(e) {
  return t(() => {
    let lastIndex = e.findLastIndex(
      (n) =>
        n.type === "user" &&
        n.turnOrigin !== void 0 &&
        isHumanAuthoredTurn(n) &&
        classifyMessageSource(n) === "machine",
    );
    return lastIndex !== -1 && isMachineOnlyTurnRange(e.slice(lastIndex));
  }, !1);
}
//@ chunk-651cmq7s.js:1577-1875 placement
function classifyMessageSource_2(e) {
  return t(() => {
    let lastIndex = e.findLastIndex(
        (s) =>
          s.type === "user" &&
          s.turnOrigin !== void 0 &&
          isHumanAuthoredTurn(s) &&
          (s.wakeupSource !== void 0 || classifyMessageSource(s) !== "unseen"),
      ),
      n = e[lastIndex];
    if (n?.type !== "user") return !1;
    return (
      (n.wakeupSource !== void 0 ||
        (classifyMessageSource(n) === "machine" &&
          (n.origin?.kind !== "peer" || isPeerOrObserver(n.origin)))) &&
      isMachineOnlyTurnRange(e.slice(lastIndex))
    );
  }, !1);
}

export {
  isMachineOnlyTurnRange,
  endsWithMachineTurn,
  isPersonQueuedInput,
  hasAuthoritativePollEvents,
  iCo,
  classifyMessageSource_2,
};
