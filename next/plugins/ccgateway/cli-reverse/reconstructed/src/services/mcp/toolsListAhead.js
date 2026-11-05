/**
 * services/mcp/toolsListAhead.ts
 *
 * 2.1.316 新增：MCP tools/list 提前发送（在 initialize 处理器注册前）及其遥测字段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-btmgww0q.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getCliOwnedState } from "./cliOwnedClients.js";
import { officeBridgeListingState } from "./firstPartyServerIds.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { identityId2 } from "../../types/ids.js";

//@ chunk-btmgww0q.js:335-346 placement
/**
 * 提前发送的 tools/list 页的保留时长（5000 毫秒）。
 */
var AHEAD_PAGE_TTL_MS = 5000;
//@ chunk-btmgww0q.js:346-522 placement
/**
 * 为连接登记"提前发送 tools/list"的状态。
 */
function armToolsListAhead(client, flagSource, negotiationDenylisted, listed) {
  let state = {
    sentAhead: false,
    flagSource,
    negotiationDenylisted,
    listed,
    listChangedBeforeHandler: false,
    handlerRegistered: false,
  };
  getCliOwnedState().toolsListAhead.set(client, state);
  return state;
}
//@ chunk-btmgww0q.js:522-568 placement
/**
 * 登记提前发送的页与发送时间。
 */
function setAheadPage(state, page, pageSentAtMs) {
  state.page = page;
  state.pageSentAtMs = pageSentAtMs;
}
//@ chunk-btmgww0q.js:568-649 placement
/**
 * 为提前页设置过期清理定时器。
 */
function armAheadExpiry(state) {
  if (state.page !== undefined) {
    state.expiry = setTimeout(clearAheadPage, AHEAD_PAGE_TTL_MS, state);
    state.expiry.unref?.();
  }
}
//@ chunk-btmgww0q.js:649-670 placement
/**
 * 直接清掉提前页。
 */
function takeAheadPage(state) {
  clearAheadPage(state);
}
//@ chunk-btmgww0q.js:670-829 placement
/**
 * 取出提前收到的工具列表页（与发送时间）并清除。
 */
function takeAheadPage_2(client) {
  let state = getCliOwnedState().toolsListAhead.get(client);
  if (state?.page === undefined || state.pageSentAtMs === undefined) return;
  let page = {
    page: state.page,
    sentAtMs: state.pageSentAtMs,
  };
  clearAheadPage(state);
  return page;
}
//@ chunk-btmgww0q.js:829-967 placement
/**
 * 记录首个工具列表页的标记（office bridge 列表状态）。
 */
function noteFirstPageMark(client, listing) {
  try {
    let state = getCliOwnedState().toolsListAhead.get(client);
    if (state !== undefined && state.firstPageMark === undefined)
      state.firstPageMark = officeBridgeListingState(listing) ?? "unmarked";
  } catch {}
}
//@ chunk-btmgww0q.js:967-1048 placement
/**
 * 记录“处理器注册前收到列表变化通知”。
 */
function noteListChangedAhead(client, earlyAnswer) {
  let state = getCliOwnedState().toolsListAhead.get(client);
  if (state !== undefined) state.earlyAnswer = earlyAnswer;
}
//@ chunk-btmgww0q.js:1048-1190 placement
/**
 * 清除提前页；若在处理器注册前收到列表变化通知则做标记。
 */
function noteListChangedAhead_2(client) {
  let state = getCliOwnedState().toolsListAhead.get(client);
  if (state === undefined) return;
  clearAheadPage(state);
  if (state.sentAhead && !state.handlerRegistered) state.listChangedBeforeHandler = true;
}
//@ chunk-btmgww0q.js:1190-1357 placement
/**
 * 标记列表变化处理器已注册，返回此前是否有遗漏的变化通知。
 */
function markHandlerRegistered(client) {
  let state = getCliOwnedState().toolsListAhead.get(client);
  if (state === undefined) return false;
  state.handlerRegistered = true;
  let listChangedBeforeHandler = state.listChangedBeforeHandler;
  state.listChangedBeforeHandler = false;
  return listChangedBeforeHandler;
}
//@ chunk-btmgww0q.js:1357-1675 placement
/**
 * 生成"提前发送工具列表"的遥测字段。
 */
function toolsListAheadFields(state) {
  if (state === undefined) return {};
  return {
    toolsListAhead: state.sentAhead,
    toolsListAheadListed: state.listed,
    ...(state.flagSource !== undefined && {
      toolsListAheadFlagSource: fromEnum(state.flagSource),
    }),
    ...(state.earlyAnswer !== undefined && {
      toolsListAheadEarlyAnswer: fromEnum(state.earlyAnswer),
    }),
    ...(state.firstPageMark !== undefined && {
      toolsListFirstPageMark: fromEnum(state.firstPageMark),
    }),
  };
}
//@ chunk-btmgww0q.js:1675-1814 placement
/**
 * 取某客户端的"提前发送工具列表"遥测字段（含协商黑名单标记）。
 */
function toolsListAheadTelemetry(connection) {
  let state = getCliOwnedState().toolsListAhead.get(identityId2(connection.client));
  return state === undefined
    ? {}
    : {
        ...toolsListAheadFields(state),
        negotiationDenylisted: state.negotiationDenylisted,
      };
}
//@ chunk-btmgww0q.js:1814-1903 placement
/**
 * 清除提前页及其定时器。
 */
function clearAheadPage(state) {
  clearTimeout(state.expiry);
  state.page = undefined;
  state.pageSentAtMs = undefined;
  state.expiry = undefined;
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
