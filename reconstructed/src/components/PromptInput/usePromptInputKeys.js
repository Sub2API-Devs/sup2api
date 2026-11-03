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
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { isSyntheticMessage, getUserMessageText, isTeammateMessageText } from "../../utils/messages.js";
import { renderCompactSummaryText } from "../CompactSummary.js";
import { escapePastedContentTag } from "../../utils/userTurnTags.js";
import { MAX_HISTORY_ENTRIES } from "../../history.js";

//@ chunk-18hwfzwa.js:877453-877576 placement = SpeechBubble (0.305)
/**
 * 编辑器等待提示条的边框样式（按模式取边框色，只画上下边）。
 */
function getEditorWaitBorderStyle(mode, plain) {
  if (plain) return {};
  return {
    borderColor: editorWaitBorderColor(mode),
    borderStyle: "round",
    borderLeft: false,
    borderRight: false,
    borderBottom: true,
  };
}
//@ chunk-18hwfzwa.js:877576-877699 placement
function editorWaitBorderColor(mode) {
  if (mode === "bash") return "bashBorder";
  if (isInProcessTeammate()) return "promptBorder";
  let teammateColor = getTeammateColor();
  return isAgentColorName(teammateColor) ? AGENT_COLOR_TO_THEME_COLOR[teammateColor] : "promptBorder";
}
//@ chunk-18hwfzwa.js:877699-878080 placement
function useComposerEscape(event, { draft, vimEnabled, vimMode, helpOpen, setHelpOpen }) {
  if (event.name === "escape" && vimEnabled && vimMode !== "NORMAL") return;
  let Re = isKbCohesionFixesOn() && event.name === "escape";
  let Be = event.name === "backspace" || (event.ctrl && event.key === "u");
  if ((draft.cursorOffset === 0 || Re) && (event.name === "escape" || event.name === "delete" || Be)) {
    if (Be && (draft.mode !== "prompt" || helpOpen)) event.preventDefault();
    draft.setMode("prompt");
    setHelpOpen(false);
  }
  if (helpOpen && draft.value === "" && isDeleteKey(event)) setHelpOpen(false);
}
//@ chunk-18hwfzwa.js:878080-878232 placement
function dismissPromptOverlay({ store, clearQueueSelection, helpOpen, setHelpOpen }) {
  if (store.getState().queueEditIndex !== null) {
    clearQueueSelection();
    return true;
  }
  if (helpOpen) {
    setHelpOpen(false);
    return true;
  }
  return false;
}
//@ chunk-18hwfzwa.js:878232-878334 placement
function clearFooterSelectionState(h) {
  return h.footerSelection === null
    ? h
    : {
        ...h,
        footerSelection: null,
        idleTeammatesExpanded: false,
      };
}
//@ chunk-18hwfzwa.js:878334-878397 placement
function isDeleteKey(h) {
  return h.name === "backspace" || h.name === "delete";
}
//@ chunk-18hwfzwa.js:878397-878476 placement
function isDeleteOrKillKey(prev) {
  return isDeleteKey(prev) || (prev.ctrl && (prev.key === "u" || prev.key === "w" || prev.key === "k"));
}
//@ chunk-18hwfzwa.js:878476-878607 placement = decodeModifier (0.87)
function getPrintableKey(modifier) {
  if (modifier === null) return null;
  let x = keyEventToKeystroke(modifier);
  if (!x || x.ctrl || x.meta || x.super) return null;
  return modifier.key.length === 1 ? modifier.key : null;
}
//@ chunk-18hwfzwa.js:878607-879066 placement
function queuedHumanRows(viewSelectionMode, { queuedRowIds }) {
  let D = [];
  for (let idx = viewSelectionMode.length - 1; idx >= 0; idx--) {
    let ee = viewSelectionMode[idx];
    if (queuedRowIds.has(ee.uuid)) continue;
    if (
      ee.type === "user" &&
      !ee.isMeta &&
      !isSyntheticMessage(ee) &&
      !(ee.origin && ee.origin.kind !== "human") &&
      !ee.stackedExpansion
    ) {
      let userMessageText = getUserMessageText(ee);
      let Re =
        ee.stackedOriginalInput ??
        (userMessageText !== null && ee.isCompactSummary
          ? renderCompactSummaryText(userMessageText, ee.modelOnlyText)
          : userMessageText);
      let Be = Re === null || ee.origin?.kind === "human" ? Re : escapePastedContentTag(Re);
      if (Be?.trim() && !isTeammateMessageText(Be) && Be.length <= MAX_HISTORY_ENTRIES)
        D.push({
          display: Be,
          pastedContents: {},
        });
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
  getEditorWaitBorderStyle,
  clearFooterSelectionState,
  useComposerEscape,
  dismissPromptOverlay,
  getPrintableKey,
  selectCommands,
  selectMcpClients2,
  selectAgentDefinitionsActiveAgents_3,
  queuedHumanRows,
  isDeleteOrKillKey,
};
