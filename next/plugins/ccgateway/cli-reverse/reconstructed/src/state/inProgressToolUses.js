/**
 * state/inProgressToolUses.ts
 *
 * 2.1.316 新增：进行中的工具调用状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-01kgd7xg.js:20849-20914 placement
/**
 * 空消息列表。
 */
var EMPTY_MESSAGES = [];
var EMPTY_TOOL_USE_IDS = new Set();
var INITIAL_IN_PROGRESS_STATE = {
  messages: EMPTY_MESSAGES,
  inProgressToolUseIDs: EMPTY_TOOL_USE_IDS,
};
//@ chunk-01kgd7xg.js:20914-21041 placement
function inProgressToolUpdate(inProgressToolUseIDs, nextIds) {
  return inProgressToolUseIDs.size === 0 && nextIds.size > 0
    ? {
        inProgressToolUseIDs: nextIds,
        toolWindowStartTime: Date.now(),
      }
    : {
        inProgressToolUseIDs: nextIds,
      };
}
//@ chunk-01kgd7xg.js:21041-21375 placement
/**
 * 维护某个代理的进行中工具调用集合（add/remove/clear），首个工具开始时记录 toolWindowStartTime。
 */
function applyInProgressToolUses(transcripts, transcriptId, update) {
  let previous = transcripts[transcriptId] ?? INITIAL_IN_PROGRESS_STATE;
  let inProgressToolUseIDs = previous.inProgressToolUseIDs;
  let nextIds;
  switch (update.action) {
    case "add": {
      nextIds = new Set(inProgressToolUseIDs);
      for (let id of update.ids) nextIds.add(id);
      break;
    }
    case "remove": {
      nextIds = new Set(inProgressToolUseIDs);
      for (let id of update.ids) nextIds.delete(id);
      if (nextIds.size === inProgressToolUseIDs.size) return transcripts;
      break;
    }
    case "clear":
      if (inProgressToolUseIDs.size === 0) return transcripts;
      nextIds = new Set();
      break;
    default:
      return transcripts;
  }
  return {
    ...transcripts,
    [transcriptId]: {
      ...previous,
      ...inProgressToolUpdate(inProgressToolUseIDs, nextIds),
    },
  };
}
export { INITIAL_IN_PROGRESS_STATE, inProgressToolUpdate, EMPTY_MESSAGES, applyInProgressToolUses };
