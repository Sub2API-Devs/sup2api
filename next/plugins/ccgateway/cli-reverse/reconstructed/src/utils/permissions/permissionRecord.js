/**
 * utils/permissions/permissionRecord.ts
 *
 * 2.1.316 新增：权限记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2949462-2949516 placement
class PermissionRecords {
  byToolUse = new Map();
  rounds = new Map();
  nextRound = 1;
}
//@ chunk-e6aww6q8.js:2949516-2949528 placement
var MAX_PERMISSION_RECORDS = 256;
//@ chunk-e6aww6q8.js:2949528-2949584 placement
function guardRecordUpdate(fallback, update) {
  try {
    return update();
  } catch (error) {
    logError(error);
    return fallback;
  }
}
//@ chunk-e6aww6q8.js:2949584-2949752 placement
function getActivePermissionRound(toolUseContext, toolUseId) {
  if (toolUseContext.permissionPhase !== undefined || toolUseContext.permissionRound === undefined) return;
  let roundEntry = toolUseContext.toolState.get(PermissionRecords).rounds.get(toolUseId);
  return roundEntry?.round === toolUseContext.permissionRound ? roundEntry : undefined;
}
//@ chunk-e6aww6q8.js:2949752-2950068 placement
/**
 * 判断该工具调用的权限记录轮次是否属于给定工具；不属于时（只一次）记录错误。
 */
function isRoundOwnedByTool(toolUseContext, toolUseId, toolName) {
  let activePermissionRound = getActivePermissionRound(toolUseContext, toolUseId);
  if (activePermissionRound === undefined) return false;
  if (activePermissionRound.toolName === toolName) return true;
  if (!activePermissionRound.refusalLogged) {
    activePermissionRound.refusalLogged = true;
    logForDebugging(
      `permission record: a write for ${toolName} was refused under the round of ${activePermissionRound.toolName}`,
      {
        level: "error",
      },
    );
    logError(Error("permission record: a write for another tool was refused under a round"));
  }
  return false;
}
//@ chunk-e6aww6q8.js:2950068-2950365 placement
function getPermissionRecordSlot(toolUseContext, toolUseId) {
  let records = toolUseContext.toolState.get(PermissionRecords);
  let round = records.rounds.get(toolUseId)?.round ?? 0;
  let existing = records.byToolUse.get(toolUseId);
  if (existing !== undefined && existing.round === round) return existing;
  let slot = {
    round,
    record: {},
  };
  records.byToolUse.set(toolUseId, slot);
  if (records.byToolUse.size > MAX_PERMISSION_RECORDS) {
    let [oldestId] = records.byToolUse.keys();
    if (oldestId !== undefined && oldestId !== toolUseId) {
      records.byToolUse.delete(oldestId);
      records.rounds.delete(oldestId);
    }
  }
  return slot;
}
//@ chunk-e6aww6q8.js:2950365-2950657 placement
/**
 * 为某 toolUseId 开始新一轮权限记录：分配轮次号，超出上限时淘汰最早的记录。
 */
function startPermissionRound(toolUseContext, toolUseId, toolName) {
  return guardRecordUpdate(0, () => {
    let records = toolUseContext.toolState.get(PermissionRecords);
    let roundNumber = records.nextRound++;
    records.rounds.delete(toolUseId);
    records.rounds.set(toolUseId, {
      round: roundNumber,
      toolName,
      refusalLogged: false,
    });
    if (records.rounds.size > MAX_PERMISSION_RECORDS) {
      let [oldestToolUseId] = records.rounds.keys();
      if (oldestToolUseId !== undefined && oldestToolUseId !== toolUseId) {
        records.rounds.delete(oldestToolUseId);
        records.byToolUse.delete(oldestToolUseId);
      }
    }
    records.byToolUse.delete(toolUseId);
    return roundNumber;
  });
}
//@ chunk-e6aww6q8.js:2950657-2950934 placement
function recordCheckedResult(toolUseContext, parsedInput, result, name) {
  let { toolUseId } = toolUseContext;
  if (!toolUseId) return;
  guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(toolUseContext, toolUseId, name)) return;
    let permissionRecordSlot = getPermissionRecordSlot(toolUseContext, toolUseId);
    let checked = {
      input: parsedInput,
      result,
      ...(permissionRecordSlot.pendingNote?.input === parsedInput && {
        note: permissionRecordSlot.pendingNote.note,
      }),
    };
    permissionRecordSlot.pendingNote = undefined;
    if (permissionRecordSlot.provisional?.open) {
      permissionRecordSlot.provisional.checked = checked;
      return;
    }
    permissionRecordSlot.record.checked = checked;
  });
}
//@ chunk-e6aww6q8.js:2950934-2951238 placement
/**
 * 记录权限流水线的输入与结果到该工具调用的权限记录；拒绝时删除记录，允许时附带已回答的待定内容。
 */
function recordPipelineResult(context, toolUseID, input, decision, name) {
  if (!toolUseID) return;
  guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(context, toolUseID, name)) return;
    if (decision.behavior === "deny") {
      context.toolState.get(PermissionRecords).byToolUse.delete(toolUseID);
      return;
    }
    let permissionRecordSlot = getPermissionRecordSlot(context, toolUseID);
    permissionRecordSlot.record.pipeline = {
      input,
      result: decision,
      ...(permissionRecordSlot.pendingAnswered !== undefined &&
        decision.behavior === "allow" && {
          answered: permissionRecordSlot.pendingAnswered,
        }),
    };
    permissionRecordSlot.pendingAnswered = undefined;
  });
}
//@ chunk-e6aww6q8.js:2951238-2951337 placement
/**
 * notePendingPermissionAnswer：记录待定的权限回答。
 */
function notePendingPermissionAnswer(context, toolUseID, pendingAnswered, name) {
  if (!toolUseID) return;
  guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(context, toolUseID, name)) return;
    getPermissionRecordSlot(context, toolUseID).pendingAnswered = pendingAnswered;
  });
}
//@ chunk-e6aww6q8.js:2951337-2951466 placement
/**
 * 为工具调用记录待定的权限说明（输入与备注）。
 */
function setPendingPermissionNote(toolUseContext, input, note, toolName) {
  let { toolUseId } = toolUseContext;
  if (!toolUseId) return;
  guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(toolUseContext, toolUseId, toolName)) return;
    getPermissionRecordSlot(toolUseContext, toolUseId).pendingNote = {
      input,
      note,
    };
  });
}
//@ chunk-e6aww6q8.js:2951466-2951664 placement
/**
 * 在执行回调期间为该调用开一个临时记录槽，结束后关闭。
 */
async function withProvisionalRecord(toolUseContext, toolUseID, name, fn) {
  let slot = guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(toolUseContext, toolUseID, name)) return;
    let permissionRecordSlot = getPermissionRecordSlot(toolUseContext, toolUseID);
    permissionRecordSlot.provisional = {
      open: true,
    };
    return permissionRecordSlot;
  });
  try {
    return await fn();
  } finally {
    if (slot?.provisional !== undefined) slot.provisional.open = false;
  }
}
//@ chunk-e6aww6q8.js:2951664-2951872 placement
/**
 * 把临时槽里的 checked 结果提交到正式记录，并写入 pipeline 结果。
 */
function commitProvisionalRecord(toolUseContext, toolUseID, input, result, name) {
  guardRecordUpdate(undefined, () => {
    if (!isRoundOwnedByTool(toolUseContext, toolUseID, name)) return;
    let permissionRecordSlot = getPermissionRecordSlot(toolUseContext, toolUseID);
    if (permissionRecordSlot.provisional?.checked !== undefined)
      permissionRecordSlot.record.checked = permissionRecordSlot.provisional.checked;
    permissionRecordSlot.provisional = undefined;
    permissionRecordSlot.record.pipeline = {
      input,
      result,
    };
  });
}
//@ chunk-e6aww6q8.js:2951872-2951975 placement
/**
 * 删除工具调用的权限记录。
 */
function dropPermissionRecord(toolUseContext, toolUseId) {
  guardRecordUpdate(undefined, () => {
    if (getActivePermissionRound(toolUseContext, toolUseId) === undefined) return;
    toolUseContext.toolState.get(PermissionRecords).byToolUse.delete(toolUseId);
  });
}
//@ chunk-e6aww6q8.js:2951975-2952198 placement
/**
 * 取出并清除指定轮次的权限记录（轮次不符时返回 undefined）。
 */
function takePermissionRecord(toolUseContext, toolUseId, round) {
  return guardRecordUpdate(undefined, () => {
    let records = toolUseContext.toolState.get(PermissionRecords);
    if (records.rounds.get(toolUseId)?.round !== round) return;
    records.rounds.delete(toolUseId);
    let existing = records.byToolUse.get(toolUseId);
    if (existing === undefined || existing.round !== round) return;
    records.byToolUse.delete(toolUseId);
    return existing.record;
  });
}
//@ chunk-e6aww6q8.js:2952198-2952237 placement
/**
 * permissionRecordModule：权限记录模块的惰性 require。
 */
var permissionRecordModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-e6aww6q8.js:2952198", () => {
  permissionRecordModule = require("../../services/workflow/recordWorkflowUsageConsent.lazy.js");
});
export {
  notePendingPermissionAnswer,
  recordPipelineResult,
  permissionRecordModule,
  recordCheckedResult,
  setPendingPermissionNote,
  dropPermissionRecord,
  startPermissionRound,
  takePermissionRecord,
  commitProvisionalRecord,
  withProvisionalRecord,
};
