/**
 * commands/pause-memory/pause-memory.ts
 *
 * 2.1.316 新增：/pause-memory：暂停/恢复本会话的账号记忆（tengu_memory_toggled）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ae8n370g.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMemoryToggledOff, setMemoryToggledOff } from "../../bootstrap/state.js";
import { isEligibleDecisionSurface } from "../../services/orgMemory/orgMemoryDecision.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-ae8n370g.js:4251-5004 placement
/**
 * /pause-memory 执行体：切换本会话记忆开关，通知元数据变化并上报 tengu_memory_toggled，返回暂停或恢复的提示文本；不能恢复的会话直接返回说明。
 */
var callPauseMemoryCommand = async (args, context) => {
  let pausing = !getMemoryToggledOff();
  let failed = false;
  if (!pausing && !isEligibleDecisionSurface())
    return {
      type: "text",
      value: MEMORY_CANNOT_RESUME_MESSAGE,
    };
  setMemoryToggledOff(pausing);
  let resume;
  let unusedState = {
    unavailable: false,
    raiseRefused: undefined,
  };
  let note;
  let refused = false;
  context.sessionState?.notifyInternalMetadataChanged({
    memory_toggled_off: pausing ? true : null,
  });
  logEvent("tengu_memory_toggled", {
    toggled_off: pausing,
  });
  let result;
  return {
    type: "text",
    value: pausing
      ? failed
        ? `Memory paused${false ? "" : " for the rest of this session"} \xB7 Claude will not load your account memory or save new memories in this session, and memory already shown should not be referenced.${""}`
        : `Memory paused for this session \xB7 this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.${""}

${getResumeMemoryHint()}`
      : (result ?? "Memory resumed \xB7 memory content may be referenced and new memories can be saved.") +
        "",
  };
};
//@ chunk-ae8n370g.js:5004-5013 placement
var unusedFalseFlag = false;
//@ chunk-ae8n370g.js:5013-5031 placement
function resetUnusedFalseFlag() {
  unusedFalseFlag = false;
}
//@ chunk-ae8n370g.js:5031-5217 placement
function getResumeMemoryHint() {
  return isEligibleDecisionSurface()
    ? "Run /pause-memory again to resume."
    : "This session cannot turn memory back on; resume from a Claude Code session you started yourself, or start a new session.";
}
//@ chunk-ae8n370g.js:5217-5419 placement
var MEMORY_CANNOT_RESUME_MESSAGE =
  "Memory stays paused \xB7 it cannot be resumed from a session a tool call started or from a background session. Resume it from a Claude Code session you started yourself, or start a new session.";
export { callPauseMemoryCommand, resetUnusedFalseFlag };
