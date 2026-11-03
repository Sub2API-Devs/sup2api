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

//@ chunk-e6aww6q8.js:2949462-2949516 placement
class gU {
  byToolUse = new Map();
  rounds = new Map();
  nextRound = 1;
}
//@ chunk-e6aww6q8.js:2949516-2949528 placement
var ekn = 256;
//@ chunk-e6aww6q8.js:2949528-2949584 placement
function ZM(e, n) {
  try {
    return n();
  } catch (error) {
    return (logError(error), e);
  }
}
//@ chunk-e6aww6q8.js:2949584-2949752 placement
function getActivePermissionRound(e, n) {
  if (e.permissionPhase !== void 0 || e.permissionRound === void 0) return;
  let r = e.toolState.get(gU).rounds.get(n);
  return r?.round === e.permissionRound ? r : void 0;
}
/**
 * 判断该工具调用的权限记录轮次是否属于给定工具；不属于时（只一次）记录错误。
 */
//@ chunk-e6aww6q8.js:2949752-2950068 placement
function isRoundOwnedByTool(e, n, r) {
  let s = getActivePermissionRound(e, n);
  if (s === void 0) return !1;
  if (s.toolName === r) return !0;
  if (!s.refusalLogged)
    ((s.refusalLogged = !0),
      logForDebugging(`permission record: a write for ${r} was refused under the round of ${s.toolName}`, {
        level: "error",
      }),
      logError(Error("permission record: a write for another tool was refused under a round")));
  return !1;
}
//@ chunk-e6aww6q8.js:2950068-2950365 placement
function getPermissionRecordSlot(e, n) {
  let r = e.toolState.get(gU),
    s = r.rounds.get(n)?.round ?? 0,
    h = r.byToolUse.get(n);
  if (h !== void 0 && h.round === s) return h;
  let y = { round: s, record: {} };
  if ((r.byToolUse.set(n, y), r.byToolUse.size > ekn)) {
    let [S] = r.byToolUse.keys();
    if (S !== void 0 && S !== n) (r.byToolUse.delete(S), r.rounds.delete(S));
  }
  return y;
}
/**
 * 为某 toolUseId 开始新一轮权限记录：分配轮次号，超出上限时淘汰最早的记录。
 */
//@ chunk-e6aww6q8.js:2950365-2950657 placement
function startPermissionRound(e, n, r) {
  return ZM(0, () => {
    let s = e.toolState.get(gU),
      h = s.nextRound++;
    if (
      (s.rounds.delete(n), s.rounds.set(n, { round: h, toolName: r, refusalLogged: !1 }), s.rounds.size > ekn)
    ) {
      let [y] = s.rounds.keys();
      if (y !== void 0 && y !== n) (s.rounds.delete(y), s.byToolUse.delete(y));
    }
    return (s.byToolUse.delete(n), h);
  });
}
//@ chunk-e6aww6q8.js:2950657-2950934 placement
function recordCheckedResult(e, n, r, s) {
  let { toolUseId: toolUseId } = e;
  if (!toolUseId) return;
  ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, toolUseId, s)) return;
    let y = getPermissionRecordSlot(e, toolUseId),
      S = { input: n, result: r, ...(y.pendingNote?.input === n && { note: y.pendingNote.note }) };
    if (((y.pendingNote = void 0), y.provisional?.open)) {
      y.provisional.checked = S;
      return;
    }
    y.record.checked = S;
  });
}
/**
 * 记录权限流水线的输入与结果到该工具调用的权限记录；拒绝时删除记录，允许时附带已回答的待定内容。
 */
//@ chunk-e6aww6q8.js:2950934-2951238 placement
function recordPipelineResult(e, n, r, s, h) {
  if (!n) return;
  ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, n, h)) return;
    if (s.behavior === "deny") {
      e.toolState.get(gU).byToolUse.delete(n);
      return;
    }
    let y = getPermissionRecordSlot(e, n);
    ((y.record.pipeline = {
      input: r,
      result: s,
      ...(y.pendingAnswered !== void 0 && s.behavior === "allow" && { answered: y.pendingAnswered }),
    }),
      (y.pendingAnswered = void 0));
  });
}
//@ chunk-e6aww6q8.js:2951238-2951337 placement
function VJe(e, n, r, s) {
  if (!n) return;
  ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, n, s)) return;
    getPermissionRecordSlot(e, n).pendingAnswered = r;
  });
}
/**
 * 为工具调用记录待定的权限说明（输入与备注）。
 */
//@ chunk-e6aww6q8.js:2951337-2951466 placement
function setPendingPermissionNote(e, n, r, s) {
  let { toolUseId: toolUseId } = e;
  if (!toolUseId) return;
  ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, toolUseId, s)) return;
    getPermissionRecordSlot(e, toolUseId).pendingNote = { input: n, note: r };
  });
}
/**
 * 在执行回调期间为该调用开一个临时记录槽，结束后关闭。
 */
//@ chunk-e6aww6q8.js:2951466-2951664 placement
async function withProvisionalRecord(e, n, r, s) {
  let h = ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, n, r)) return;
    let y = getPermissionRecordSlot(e, n);
    return ((y.provisional = { open: !0 }), y);
  });
  try {
    return await s();
  } finally {
    if (h?.provisional !== void 0) h.provisional.open = !1;
  }
}
/**
 * 把临时槽里的 checked 结果提交到正式记录，并写入 pipeline 结果。
 */
//@ chunk-e6aww6q8.js:2951664-2951872 placement
function commitProvisionalRecord(e, n, r, s, h) {
  ZM(void 0, () => {
    if (!isRoundOwnedByTool(e, n, h)) return;
    let y = getPermissionRecordSlot(e, n);
    if (y.provisional?.checked !== void 0) y.record.checked = y.provisional.checked;
    ((y.provisional = void 0), (y.record.pipeline = { input: r, result: s }));
  });
}
/**
 * 删除工具调用的权限记录。
 */
//@ chunk-e6aww6q8.js:2951872-2951975 placement
function dropPermissionRecord(e, n) {
  ZM(void 0, () => {
    if (getActivePermissionRound(e, n) === void 0) return;
    e.toolState.get(gU).byToolUse.delete(n);
  });
}
/**
 * 取出并清除指定轮次的权限记录（轮次不符时返回 undefined）。
 */
//@ chunk-e6aww6q8.js:2951975-2952198 placement
function takePermissionRecord(e, n, r) {
  return ZM(void 0, () => {
    let s = e.toolState.get(gU);
    if (s.rounds.get(n)?.round !== r) return;
    s.rounds.delete(n);
    let h = s.byToolUse.get(n);
    if (h === void 0 || h.round !== r) return;
    return (s.byToolUse.delete(n), h.record);
  });
}
//@ chunk-e6aww6q8.js:2952198-2952237 placement
var gkn = require("./chunk-hxj257dq.js");

export {
  VJe,
  recordPipelineResult,
  gkn,
  recordCheckedResult,
  setPendingPermissionNote,
  dropPermissionRecord,
  startPermissionRound,
  takePermissionRecord,
  commitProvisionalRecord,
  withProvisionalRecord,
};
