/**
 * state/inProgressToolUses.ts
 *
 * 2.1.316 新增：进行中的工具调用状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (3)
 * attribution: placement 3
 */
//@ chunk-6vnxsn99.js:20588-20653 placement
/**
 * 空消息列表。
 */
var EMPTY_MESSAGES = [];
var EMPTY_TOOL_USE_IDS = new Set();
var INITIAL_IN_PROGRESS_STATE = {
  messages: EMPTY_MESSAGES,
  inProgressToolUseIDs: EMPTY_TOOL_USE_IDS,
};
//@ chunk-6vnxsn99.js:20653-20780 placement
function inProgressToolUpdate(inProgressToolUseIDs, n) {
  return inProgressToolUseIDs.size === 0 && n.size > 0
    ? {
        inProgressToolUseIDs: n,
        toolWindowStartTime: Date.now(),
      }
    : {
        inProgressToolUseIDs: n,
      };
}
//@ chunk-6vnxsn99.js:20780-21114 placement
/**
 * 维护某个代理的进行中工具调用集合（add/remove/clear），首个工具开始时记录 toolWindowStartTime。
 */
function applyInProgressToolUses(transcripts, n, r) {
  let o = transcripts[n] ?? INITIAL_IN_PROGRESS_STATE;
  let inProgressToolUseIDs = o.inProgressToolUseIDs;
  let a;
  switch (r.action) {
    case "add": {
      a = new Set(inProgressToolUseIDs);
      for (let id of r.ids) a.add(id);
      break;
    }
    case "remove": {
      a = new Set(inProgressToolUseIDs);
      for (let id of r.ids) a.delete(id);
      if (a.size === inProgressToolUseIDs.size) return transcripts;
      break;
    }
    case "clear":
      if (inProgressToolUseIDs.size === 0) return transcripts;
      a = new Set();
      break;
    default:
      return transcripts;
  }
  return {
    ...transcripts,
    [n]: {
      ...o,
      ...inProgressToolUpdate(inProgressToolUseIDs, a),
    },
  };
}
export { inProgressToolUpdate, EMPTY_MESSAGES, INITIAL_IN_PROGRESS_STATE, applyInProgressToolUses };
