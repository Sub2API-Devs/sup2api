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

//@ chunk-18hwfzwa.js:877453-877576 placement (2.1.88 match: SpeechBubble, 0.305)
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
  let isKbEscape = isKbCohesionFixesOn() && event.name === "escape";
  let isBackspaceOrClear = event.name === "backspace" || (event.ctrl && event.key === "u");
  if (
    (draft.cursorOffset === 0 || isKbEscape) &&
    (event.name === "escape" || event.name === "delete" || isBackspaceOrClear)
  ) {
    if (isBackspaceOrClear && (draft.mode !== "prompt" || helpOpen)) event.preventDefault();
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
function clearFooterSelectionState(state) {
  return state.footerSelection === null
    ? state
    : {
        ...state,
        footerSelection: null,
        idleTeammatesExpanded: false,
      };
}
//@ chunk-18hwfzwa.js:878334-878397 placement
function isDeleteKey(key) {
  return key.name === "backspace" || key.name === "delete";
}
//@ chunk-18hwfzwa.js:878397-878476 placement
function isDeleteOrKillKey(key) {
  return isDeleteKey(key) || (key.ctrl && (key.key === "u" || key.key === "w" || key.key === "k"));
}
//@ chunk-18hwfzwa.js:878476-878607 placement (2.1.88 match: decodeModifier, 0.87)
function getPrintableKey(modifier) {
  if (modifier === null) return null;
  let keystroke = keyEventToKeystroke(modifier);
  if (!keystroke || keystroke.ctrl || keystroke.meta || keystroke.super) return null;
  return modifier.key.length === 1 ? modifier.key : null;
}
//@ chunk-18hwfzwa.js:878607-879066 placement
function queuedHumanRows(viewSelectionMode, { queuedRowIds }) {
  let rows = [];
  for (let idx = viewSelectionMode.length - 1; idx >= 0; idx--) {
    let message = viewSelectionMode[idx];
    if (queuedRowIds.has(message.uuid)) continue;
    if (
      message.type === "user" &&
      !message.isMeta &&
      !isSyntheticMessage(message) &&
      !(message.origin && message.origin.kind !== "human") &&
      !message.stackedExpansion
    ) {
      let userMessageText = getUserMessageText(message);
      let rawText =
        message.stackedOriginalInput ??
        (userMessageText !== null && message.isCompactSummary
          ? renderCompactSummaryText(userMessageText, message.modelOnlyText)
          : userMessageText);
      let displayText =
        rawText === null || message.origin?.kind === "human" ? rawText : escapePastedContentTag(rawText);
      if (
        displayText?.trim() &&
        !isTeammateMessageText(displayText) &&
        displayText.length <= MAX_HISTORY_ENTRIES
      )
        rows.push({
          display: displayText,
          pastedContents: {},
        });
    }
  }
  return rows;
}
//@ chunk-18hwfzwa.js:879066-879104 placement
function selectCommands(state) {
  return state.commands;
}
//@ chunk-18hwfzwa.js:879104-879143 placement (2.1.88 match: _temp, 1)
function selectMcpClients2(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:879143-879200 placement
function selectAgentDefinitionsActiveAgents_3(state) {
  return state.agentDefinitions.activeAgents;
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
