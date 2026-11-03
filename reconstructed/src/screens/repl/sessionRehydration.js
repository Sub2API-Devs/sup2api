/**
 * screens/repl/sessionRehydration.ts
 *
 * 2.1.316 新增。会话再水合（恢复状态）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
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

//@ chunk-18hwfzwa.js:341752-342090 placement
/**
 * 消息的首段文本（助手文本或工具结果）。
 */
function messageSnippet(h) {
  if (h.type === "assistant") {
    let x = h.message.content[0];
    return x.type === "text" ? capTextChars(x.text) : "";
  }
  if (h.type === "user") {
    if (h.isMeta) return "";
    let x = h.message.content[0];
    if (x.type !== "tool_result") return "";
    if (typeof x.content === "string") return capTextChars(x.content);
    if (Array.isArray(x.content))
      return capTextChars(
        extractTextContent_2(
          x.content,
          `
`,
        ),
      );
    return "";
  }
  return "";
}
//@ chunk-18hwfzwa.js:342090-342142 placement
function capTextChars(h) {
  return h.length > MAX_SESSION_TEXT_CHARS ? h.slice(-MAX_SESSION_TEXT_CHARS) : h;
}
//@ chunk-18hwfzwa.js:342142-342461 placement
function rehydrateSession(assistantMessages, x, { restoreAgentNames }) {
  if (isBareMode()) return x;
  let L = x;
  let ee = tryRehydrate(() => rehydrateFooterLinks(assistantMessages, L.footerLinks));
  if (ee !== null)
    L = {
      ...L,
      footerLinks: ee,
    };
  let ke = tryRehydrate(() => sendPinsIfNotSettled(assistantMessages, L.sendMessagePins));
  if (ke !== null)
    L = {
      ...L,
      sendMessagePins: ke,
    };
  let Re = tryRehydrate(() =>
    restoreAgentNames ? collectNamedAgentIds(assistantMessages, L.agentNameRegistry) : null,
  );
  if (Re !== null)
    L = {
      ...L,
      agentNameRegistry: Re,
    };
  return L;
}
//@ chunk-18hwfzwa.js:342461-342595 placement
/**
 * 执行恢复步骤，出错时记日志并返回 null。
 */
function tryRehydrate(h) {
  try {
    return h();
  } catch (error) {
    let error_2 = toError(error);
    logForDebugging(`session rehydration threw: ${error_2.stack ?? error_2.message}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-18hwfzwa.js:342595-342608 placement
var responsePairRetirer = null;
//@ chunk-18hwfzwa.js:342608-342789 placement
/**
 * 恢复时清掉面板文件视图、展开状态与无键的页脚链接。
 */
function resetTransientUiState(h) {
  return {
    ...h,
    panelFileView: null,
    idleTeammatesExpanded: false,
    footerLinks: h.footerLinks.some((footerLink) => footerLink.key === undefined)
      ? h.footerLinks.filter((footerLink) => footerLink.key !== undefined)
      : h.footerLinks,
  };
}
//@ chunk-18hwfzwa.js:342789-342935 placement
function retireResumeSwapPair(h, x, dialogStore, session) {
  closeWebViews(h);
  responsePairRetirer?.retireResponsePair(session);
  dialogStore.dismissKind(GOAL_PROPOSAL_DIALOG.kind);
  let activeGoal = h().activeGoal;
  if (activeGoal !== undefined) logGoalCleared(activeGoal, "resume_swap");
  x(resetArtifactReadState);
}
export { resetTransientUiState, messageSnippet, retireResumeSwapPair, rehydrateSession };
