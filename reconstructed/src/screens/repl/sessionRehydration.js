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
import { _We, rehydrateFooterLinks } from "../../components/PromptInput/footerLinks.js";
import { isBareMode } from "../../utils/envUtils.js";
import { hHs, collectNamedAgentIds } from "../../tools/SendMessageTool/deliveryResults.js";
import { toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { closeWebViews, resetArtifactReadState } from "../../state/artifactReadState.js";
import { GOAL_PROPOSAL_DIALOG } from "../../components/goal/goalProposalDialog.js";
import { logGoalCleared } from "../../commands/goal/goal.js";

/**
 * 消息的首段文本（助手文本或工具结果）。
 */
//@ chunk-18hwfzwa.js:341752-342090 placement
function messageSnippet(h) {
  if (h.type === "assistant") {
    let x = h.message.content[0];
    return x.type === "text" ? Mae(x.text) : "";
  }
  if (h.type === "user") {
    if (h.isMeta) return "";
    let x = h.message.content[0];
    if (x.type !== "tool_result") return "";
    if (typeof x.content === "string") return Mae(x.content);
    if (Array.isArray(x.content))
      return Mae(
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
function Mae(h) {
  return h.length > _We ? h.slice(-_We) : h;
}
//@ chunk-18hwfzwa.js:342142-342461 placement
function rehydrateSession(h, x, { restoreAgentNames: restoreAgentNames }) {
  if (isBareMode()) return x;
  let L = x,
    ee = tryRehydrate(() => rehydrateFooterLinks(h, L.footerLinks));
  if (ee !== null) L = { ...L, footerLinks: ee };
  let ke = tryRehydrate(() => hHs(h, L.sendMessagePins));
  if (ke !== null) L = { ...L, sendMessagePins: ke };
  let Re = tryRehydrate(() => (restoreAgentNames ? collectNamedAgentIds(h, L.agentNameRegistry) : null));
  if (Re !== null) L = { ...L, agentNameRegistry: Re };
  return L;
}
/**
 * 执行恢复步骤，出错时记日志并返回 null。
 */
//@ chunk-18hwfzwa.js:342461-342595 placement
function tryRehydrate(h) {
  try {
    return h();
  } catch (error) {
    let D = toError(error);
    return (logForDebugging(`session rehydration threw: ${D.stack ?? D.message}`, { level: "error" }), null);
  }
}
//@ chunk-18hwfzwa.js:342595-342608 placement
var RBt = null;
/**
 * 恢复时清掉面板文件视图、展开状态与无键的页脚链接。
 */
//@ chunk-18hwfzwa.js:342608-342789 placement
function resetTransientUiState(h) {
  return {
    ...h,
    panelFileView: null,
    idleTeammatesExpanded: !1,
    footerLinks: h.footerLinks.some((footerLink) => footerLink.key === void 0)
      ? h.footerLinks.filter((footerLink) => footerLink.key !== void 0)
      : h.footerLinks,
  };
}
//@ chunk-18hwfzwa.js:342789-342935 placement
function retireResumeSwapPair(h, x, D, L) {
  (closeWebViews(h), RBt?.retireResponsePair(L), D.dismissKind(GOAL_PROPOSAL_DIALOG.kind));
  let activeGoal = h().activeGoal;
  if (activeGoal !== void 0) logGoalCleared(activeGoal, "resume_swap");
  x(resetArtifactReadState);
}

export { resetTransientUiState, messageSnippet, retireResumeSwapPair, rehydrateSession };
