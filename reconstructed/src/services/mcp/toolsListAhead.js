/**
 * services/mcp/toolsListAhead.ts
 *
 * 2.1.316 新增：MCP tools/list 提前发送（在 initialize 处理器注册前）及其遥测字段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f4jsy3e7.js (13)
 * attribution: placement 13
 */
import { getCliOwnedState } from "./cliOwnedClients.js";
import { officeBridgeListingState } from "./firstPartyServerIds.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { identityId2 } from "../../types/ids.js";

//@ chunk-f4jsy3e7.js:335-346 placement
/**
 * 提前发送的 tools/list 页的保留时长（5000 毫秒）。
 */
var AHEAD_PAGE_TTL_MS = 5000;
//@ chunk-f4jsy3e7.js:346-522 placement
/**
 * 为连接登记"提前发送 tools/list"的状态。
 */
function armToolsListAhead(client, flagSource, negotiationDenylisted, listed) {
  let s = {
    sentAhead: false,
    flagSource,
    negotiationDenylisted,
    listed,
    listChangedBeforeHandler: false,
    handlerRegistered: false,
  };
  getCliOwnedState().toolsListAhead.set(client, s);
  return s;
}
//@ chunk-f4jsy3e7.js:522-568 placement
/**
 * 登记提前发送的页与发送时间。
 */
function setAheadPage(e, page, pageSentAtMs) {
  e.page = page;
  e.pageSentAtMs = pageSentAtMs;
}
//@ chunk-f4jsy3e7.js:568-649 placement
/**
 * 为提前页设置过期清理定时器。
 */
function armAheadExpiry(e) {
  if (e.page !== undefined) {
    e.expiry = setTimeout(clearAheadPage, AHEAD_PAGE_TTL_MS, e);
    e.expiry.unref?.();
  }
}
//@ chunk-f4jsy3e7.js:649-670 placement
/**
 * 直接清掉提前页。
 */
function takeAheadPage(e) {
  clearAheadPage(e);
}
//@ chunk-f4jsy3e7.js:670-829 placement
/**
 * 取出提前收到的工具列表页（与发送时间）并清除。
 */
function takeAheadPage_2(e) {
  let o = getCliOwnedState().toolsListAhead.get(e);
  if (o?.page === undefined || o.pageSentAtMs === undefined) return;
  let t = {
    page: o.page,
    sentAtMs: o.pageSentAtMs,
  };
  clearAheadPage(o);
  return t;
}
//@ chunk-f4jsy3e7.js:829-967 placement
/**
 * 记录首个工具列表页的标记（office bridge 列表状态）。
 */
function noteFirstPageMark(e, o) {
  try {
    let t = getCliOwnedState().toolsListAhead.get(e);
    if (t !== undefined && t.firstPageMark === undefined)
      t.firstPageMark = officeBridgeListingState(o) ?? "unmarked";
  } catch {}
}
//@ chunk-f4jsy3e7.js:967-1048 placement
/**
 * 记录“处理器注册前收到列表变化通知”。
 */
function noteListChangedAhead(e, earlyAnswer) {
  let t = getCliOwnedState().toolsListAhead.get(e);
  if (t !== undefined) t.earlyAnswer = earlyAnswer;
}
//@ chunk-f4jsy3e7.js:1048-1190 placement
/**
 * 清除提前页；若在处理器注册前收到列表变化通知则做标记。
 */
function noteListChangedAhead_2(e) {
  let o = getCliOwnedState().toolsListAhead.get(e);
  if (o === undefined) return;
  clearAheadPage(o);
  if (o.sentAhead && !o.handlerRegistered) o.listChangedBeforeHandler = true;
}
//@ chunk-f4jsy3e7.js:1190-1357 placement
/**
 * 标记列表变化处理器已注册，返回此前是否有遗漏的变化通知。
 */
function markHandlerRegistered(e) {
  let o = getCliOwnedState().toolsListAhead.get(e);
  if (o === undefined) return false;
  o.handlerRegistered = true;
  let listChangedBeforeHandler = o.listChangedBeforeHandler;
  o.listChangedBeforeHandler = false;
  return listChangedBeforeHandler;
}
//@ chunk-f4jsy3e7.js:1357-1675 placement
/**
 * 生成"提前发送工具列表"的遥测字段。
 */
function toolsListAheadFields(e) {
  if (e === undefined) return {};
  return {
    toolsListAhead: e.sentAhead,
    toolsListAheadListed: e.listed,
    ...(e.flagSource !== undefined && {
      toolsListAheadFlagSource: fromEnum(e.flagSource),
    }),
    ...(e.earlyAnswer !== undefined && {
      toolsListAheadEarlyAnswer: fromEnum(e.earlyAnswer),
    }),
    ...(e.firstPageMark !== undefined && {
      toolsListFirstPageMark: fromEnum(e.firstPageMark),
    }),
  };
}
//@ chunk-f4jsy3e7.js:1675-1814 placement
/**
 * 取某客户端的"提前发送工具列表"遥测字段（含协商黑名单标记）。
 */
function toolsListAheadTelemetry(e) {
  let o = getCliOwnedState().toolsListAhead.get(identityId2(e.client));
  return o === undefined
    ? {}
    : {
        ...toolsListAheadFields(o),
        negotiationDenylisted: o.negotiationDenylisted,
      };
}
//@ chunk-f4jsy3e7.js:1814-1903 placement
/**
 * 清除提前页及其定时器。
 */
function clearAheadPage(e) {
  clearTimeout(e.expiry);
  e.page = undefined;
  e.pageSentAtMs = undefined;
  e.expiry = undefined;
}
export {
  setAheadPage,
  takeAheadPage,
  armAheadExpiry,
  noteListChangedAhead_2,
  armToolsListAhead,
  toolsListAheadFields,
  markHandlerRegistered,
  noteListChangedAhead,
  takeAheadPage_2,
  noteFirstPageMark,
  toolsListAheadTelemetry,
};
