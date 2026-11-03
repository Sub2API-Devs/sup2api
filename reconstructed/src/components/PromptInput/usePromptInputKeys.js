/**
 * components/PromptInput/usePromptInputKeys.ts
 *
 * 2.1.316 新增。输入框按键绑定 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 12
 */
import { isInProcessTeammate, getTeammateColor } from "../../utils/teammate.js";
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import { CC } from "../../utils/kbCohesionFixes.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { isSyntheticMessage, getUserMessageText, isTeammateMessageText } from "../../utils/messages.js";
import { renderCompactSummaryText } from "../CompactSummary.js";
import { ofe } from "../../utils/userTurnTags.js";
import { ert } from "../../history.js";

/**
 * 编辑器等待提示条的边框样式（按模式取边框色，只画上下边）。
 */
//@ chunk-18hwfzwa.js:877453-877576 placement = SpeechBubble (0.305)
function getEditorWaitBorderStyle(mode, plain) {
  if (plain) return {};
  return {
    borderColor: editorWaitBorderColor(mode),
    borderStyle: "round",
    borderLeft: !1,
    borderRight: !1,
    borderBottom: !0,
  };
}
//@ chunk-18hwfzwa.js:877576-877699 placement
function editorWaitBorderColor(h) {
  if (h === "bash") return "bashBorder";
  if (isInProcessTeammate()) return "promptBorder";
  let x = getTeammateColor();
  return isAgentColorName(x) ? AGENT_COLOR_TO_THEME_COLOR[x] : "promptBorder";
}
//@ chunk-18hwfzwa.js:877699-878080 placement
function useComposerEscape(
  h,
  { draft: draft, vimEnabled: vimEnabled, vimMode: vimMode, helpOpen: helpOpen, setHelpOpen: setHelpOpen },
) {
  if (h.name === "escape" && vimEnabled && vimMode !== "NORMAL") return;
  let Re = CC() && h.name === "escape",
    Be = h.name === "backspace" || (h.ctrl && h.key === "u");
  if ((draft.cursorOffset === 0 || Re) && (h.name === "escape" || h.name === "delete" || Be)) {
    if (Be && (draft.mode !== "prompt" || helpOpen)) h.preventDefault();
    (draft.setMode("prompt"), setHelpOpen(!1));
  }
  if (helpOpen && draft.value === "" && i6e(h)) setHelpOpen(!1);
}
//@ chunk-18hwfzwa.js:878080-878232 placement
function dismissPromptOverlay({
  store: store,
  clearQueueSelection: clearQueueSelection,
  helpOpen: helpOpen,
  setHelpOpen: setHelpOpen,
}) {
  if (store.getState().queueEditIndex !== null) return (clearQueueSelection(), !0);
  if (helpOpen) return (setHelpOpen(!1), !0);
  return !1;
}
//@ chunk-18hwfzwa.js:878232-878334 placement
function clearFooterSelectionState(h) {
  return h.footerSelection === null ? h : { ...h, footerSelection: null, idleTeammatesExpanded: !1 };
}
//@ chunk-18hwfzwa.js:878334-878397 placement
function i6e(h) {
  return h.name === "backspace" || h.name === "delete";
}
//@ chunk-18hwfzwa.js:878397-878476 placement
function Vye(h) {
  return i6e(h) || (h.ctrl && (h.key === "u" || h.key === "w" || h.key === "k"));
}
//@ chunk-18hwfzwa.js:878476-878607 placement = decodeModifier (0.87)
function getPrintableKey(modifier) {
  if (modifier === null) return null;
  let x = keyEventToKeystroke(modifier);
  if (!x || x.ctrl || x.meta || x.super) return null;
  return modifier.key.length === 1 ? modifier.key : null;
}
//@ chunk-18hwfzwa.js:878607-879066 placement
function queuedHumanRows(h, { queuedRowIds: queuedRowIds }) {
  let D = [];
  for (let L = h.length - 1; L >= 0; L--) {
    let ee = h[L];
    if (queuedRowIds.has(ee.uuid)) continue;
    if (
      ee.type === "user" &&
      !ee.isMeta &&
      !isSyntheticMessage(ee) &&
      !(ee.origin && ee.origin.kind !== "human") &&
      !ee.stackedExpansion
    ) {
      let ke = getUserMessageText(ee),
        Re =
          ee.stackedOriginalInput ??
          (ke !== null && ee.isCompactSummary ? renderCompactSummaryText(ke, ee.modelOnlyText) : ke),
        Be = Re === null || ee.origin?.kind === "human" ? Re : ofe(Re);
      if (Be?.trim() && !isTeammateMessageText(Be) && Be.length <= ert)
        D.push({ display: Be, pastedContents: {} });
    }
  }
  return D;
}
//@ chunk-18hwfzwa.js:879066-879104 placement
function selectCommands(UJo) {
  return UJo.commands;
}
//@ chunk-18hwfzwa.js:879104-879143 placement = _temp (1)
function selectMcpClients2(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:879143-879200 placement
function selectAgentDefinitionsActiveAgents_3(GB) {
  return GB.agentDefinitions.activeAgents;
}

export {
  selectCommands,
  selectMcpClients2,
  selectAgentDefinitionsActiveAgents_3,
  queuedHumanRows,
  clearFooterSelectionState,
  Vye,
  useComposerEscape,
  dismissPromptOverlay,
  getEditorWaitBorderStyle,
  getPrintableKey,
};
