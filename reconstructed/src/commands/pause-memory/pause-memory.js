/**
 * commands/pause-memory/pause-memory.ts
 *
 * 2.1.316 新增：/pause-memory：暂停/恢复本会话的账号记忆（tengu_memory_toggled）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8dz40wpq.js (5)
 * attribution: placement 5
 */
import { getMemoryToggledOff, setMemoryToggledOff } from "../../bootstrap/state.js";
import { isEligibleDecisionSurface } from "../../services/orgMemory/orgMemoryDecision.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-8dz40wpq.js:3943-4696 placement
/**
 * /pause-memory 执行体：切换本会话记忆开关，通知元数据变化并上报 tengu_memory_toggled，返回暂停或恢复的提示文本；不能恢复的会话直接返回说明。
 */
var callPauseMemoryCommand = async (args, context) => {
  let pausing = !getMemoryToggledOff();
  let r = false;
  if (!pausing && !isEligibleDecisionSurface())
    return {
      type: "text",
      value: MEMORY_CANNOT_RESUME_MESSAGE,
    };
  setMemoryToggledOff(pausing);
  let m;
  let p = {
    unavailable: false,
    raiseRefused: undefined,
  };
  let f;
  let y = false;
  context.sessionState?.notifyInternalMetadataChanged({
    memory_toggled_off: pausing ? true : null,
  });
  logEvent("tengu_memory_toggled", {
    toggled_off: pausing,
  });
  let n;
  return {
    type: "text",
    value: pausing
      ? r
        ? `Memory paused${false ? "" : " for the rest of this session"} \xB7 Claude will not load your account memory or save new memories in this session, and memory already shown should not be referenced.${""}`
        : `Memory paused for this session \xB7 this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.${""}

${getResumeMemoryHint()}`
      : (n ?? "Memory resumed \xB7 memory content may be referenced and new memories can be saved.") + "",
  };
};
//@ chunk-8dz40wpq.js:4696-4705 placement
var unusedFalseFlag = false;
//@ chunk-8dz40wpq.js:4705-4723 placement
function resetUnusedFalseFlag() {
  unusedFalseFlag = false;
}
//@ chunk-8dz40wpq.js:4723-4909 placement
function getResumeMemoryHint() {
  return isEligibleDecisionSurface()
    ? "Run /pause-memory again to resume."
    : "This session cannot turn memory back on; resume from a Claude Code session you started yourself, or start a new session.";
}
//@ chunk-8dz40wpq.js:4909-5111 placement
var MEMORY_CANNOT_RESUME_MESSAGE =
  "Memory stays paused \xB7 it cannot be resumed from a session a tool call started or from a background session. Resume it from a Claude Code session you started yourself, or start a new session.";
