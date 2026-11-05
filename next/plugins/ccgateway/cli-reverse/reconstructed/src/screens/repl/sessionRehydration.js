/**
 * screens/repl/sessionRehydration.ts
 *
 * 2.1.316 新增。会话再水合（恢复状态）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 */
import { extractTextContent_2 } from "../../utils/messages.js";
import { MAX_SESSION_TEXT_CHARS, rehydrateFooterLinks } from "../../components/PromptInput/footerLinks.js";
import { isBareMode } from "../../utils/envUtils.js";
import { sendPinsIfNotSettled, collectNamedAgentIds } from "../../tools/SendMessageTool/deliveryResults.js";
import { toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { closeWebViews, resetArtifactReadState } from "../../state/artifactReadState.js";
import { GOAL_PROPOSAL_DIALOG } from "../../components/goal/goalProposalDialog.js";
import { logGoalCleared } from "../../commands/goal/goal.js";

//@ chunk-czq1j3j2.js:379473-379811 placement
/**
 * 消息的首段文本（助手文本或工具结果）。
 */
function messageSnippet(message) {
  if (message.type === "assistant") {
    let block = message.message.content[0];
    return block.type === "text" ? capTextChars(block.text) : "";
  }
  if (message.type === "user") {
    if (message.isMeta) return "";
    let block = message.message.content[0];
    if (block.type !== "tool_result") return "";
    if (typeof block.content === "string") return capTextChars(block.content);
    if (Array.isArray(block.content))
      return capTextChars(
        extractTextContent_2(
          block.content,
          `
`,
        ),
      );
    return "";
  }
  return "";
}
//@ chunk-czq1j3j2.js:379811-379863 placement
function capTextChars(text) {
  return text.length > MAX_SESSION_TEXT_CHARS ? text.slice(-MAX_SESSION_TEXT_CHARS) : text;
}
//@ chunk-czq1j3j2.js:379863-380182 placement
function rehydrateSession(messages, state, { restoreAgentNames }) {
  if (isBareMode()) return state;
  let next = state;
  let footerLinks = tryRehydrate(() => rehydrateFooterLinks(messages, next.footerLinks));
  if (footerLinks !== null)
    next = {
      ...next,
      footerLinks,
    };
  let sendPins = tryRehydrate(() => sendPinsIfNotSettled(messages, next.sendMessagePins));
  if (sendPins !== null)
    next = {
      ...next,
      sendMessagePins: sendPins,
    };
  let agentNames = tryRehydrate(() =>
    restoreAgentNames ? collectNamedAgentIds(messages, next.agentNameRegistry) : null,
  );
  if (agentNames !== null)
    next = {
      ...next,
      agentNameRegistry: agentNames,
    };
  return next;
}
//@ chunk-czq1j3j2.js:380182-380316 placement
/**
 * 执行恢复步骤，出错时记日志并返回 null。
 */
function tryRehydrate(fn) {
  try {
    return fn();
  } catch (error) {
    let error_2 = toError(error);
    logForDebugging(`session rehydration threw: ${error_2.stack ?? error_2.message}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-czq1j3j2.js:380316-380329 placement
var responsePairRetirer = null;
//@ chunk-czq1j3j2.js:380329-380510 placement
/**
 * 恢复时清掉面板文件视图、展开状态与无键的页脚链接。
 */
function resetTransientUiState(state) {
  return {
    ...state,
    panelFileView: null,
    idleTeammatesExpanded: false,
    footerLinks: state.footerLinks.some((footerLink) => footerLink.key === undefined)
      ? state.footerLinks.filter((footerLink) => footerLink.key !== undefined)
      : state.footerLinks,
  };
}
//@ chunk-czq1j3j2.js:380510-380656 placement
function retireResumeSwapPair(getState, setState, dialogStore, session) {
  closeWebViews(getState);
  responsePairRetirer?.retireResponsePair(session);
  dialogStore.dismissKind(GOAL_PROPOSAL_DIALOG.kind);
  let activeGoal = getState().activeGoal;
  if (activeGoal !== undefined) logGoalCleared(activeGoal, "resume_swap");
  setState(resetArtifactReadState);
}
export { resetTransientUiState, retireResumeSwapPair, rehydrateSession, messageSnippet };
