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
import { ht } from "./cliOwnedClients.js";
import { officeBridgeListingState } from "./firstPartyServerIds.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { oa } from "../../types/ids.js";

//@ chunk-f4jsy3e7.js:335-346 placement
var i = 5000;
/**
 * 为连接登记"提前发送 tools/list"的状态。
 */
//@ chunk-f4jsy3e7.js:346-522 placement
function armToolsListAhead(e, o, t, a) {
  let s = {
    sentAhead: !1,
    flagSource: o,
    negotiationDenylisted: t,
    listed: a,
    listChangedBeforeHandler: !1,
    handlerRegistered: !1,
  };
  return (ht().toolsListAhead.set(e, s), s);
}
//@ chunk-f4jsy3e7.js:522-568 placement
function WGs(e, o, t) {
  ((e.page = o), (e.pageSentAtMs = t));
}
//@ chunk-f4jsy3e7.js:568-649 placement
function GGs(e) {
  if (e.page !== void 0) ((e.expiry = setTimeout(n, i, e)), e.expiry.unref?.());
}
//@ chunk-f4jsy3e7.js:649-670 placement
function WDo(e) {
  n(e);
}
/**
 * 取出提前收到的工具列表页（与发送时间）并清除。
 */
//@ chunk-f4jsy3e7.js:670-829 placement
function takeAheadPage(e) {
  let o = ht().toolsListAhead.get(e);
  if (o?.page === void 0 || o.pageSentAtMs === void 0) return;
  let t = { page: o.page, sentAtMs: o.pageSentAtMs };
  return (n(o), t);
}
/**
 * 记录首个工具列表页的标记（office bridge 列表状态）。
 */
//@ chunk-f4jsy3e7.js:829-967 placement
function noteFirstPageMark(e, o) {
  try {
    let t = ht().toolsListAhead.get(e);
    if (t !== void 0 && t.firstPageMark === void 0)
      t.firstPageMark = officeBridgeListingState(o) ?? "unmarked";
  } catch {}
}
//@ chunk-f4jsy3e7.js:967-1048 placement
function VGs(e, o) {
  let t = ht().toolsListAhead.get(e);
  if (t !== void 0) t.earlyAnswer = o;
}
/**
 * 清除提前页；若在处理器注册前收到列表变化通知则做标记。
 */
//@ chunk-f4jsy3e7.js:1048-1190 placement
function noteListChangedAhead(e) {
  let o = ht().toolsListAhead.get(e);
  if (o === void 0) return;
  if ((n(o), o.sentAhead && !o.handlerRegistered)) o.listChangedBeforeHandler = !0;
}
/**
 * 标记列表变化处理器已注册，返回此前是否有遗漏的变化通知。
 */
//@ chunk-f4jsy3e7.js:1190-1357 placement
function markHandlerRegistered(e) {
  let o = ht().toolsListAhead.get(e);
  if (o === void 0) return !1;
  o.handlerRegistered = !0;
  let listChangedBeforeHandler = o.listChangedBeforeHandler;
  return ((o.listChangedBeforeHandler = !1), listChangedBeforeHandler);
}
/**
 * 生成"提前发送工具列表"的遥测字段。
 */
//@ chunk-f4jsy3e7.js:1357-1675 placement
function toolsListAheadFields(e) {
  if (e === void 0) return {};
  return {
    toolsListAhead: e.sentAhead,
    toolsListAheadListed: e.listed,
    ...(e.flagSource !== void 0 && { toolsListAheadFlagSource: fromEnum(e.flagSource) }),
    ...(e.earlyAnswer !== void 0 && { toolsListAheadEarlyAnswer: fromEnum(e.earlyAnswer) }),
    ...(e.firstPageMark !== void 0 && { toolsListFirstPageMark: fromEnum(e.firstPageMark) }),
  };
}
/**
 * 取某客户端的"提前发送工具列表"遥测字段（含协商黑名单标记）。
 */
//@ chunk-f4jsy3e7.js:1675-1814 placement
function toolsListAheadTelemetry(e) {
  let o = ht().toolsListAhead.get(oa(e.client));
  return o === void 0 ? {} : { ...toolsListAheadFields(o), negotiationDenylisted: o.negotiationDenylisted };
}
//@ chunk-f4jsy3e7.js:1814-1903 placement
function n(e) {
  (clearTimeout(e.expiry), (e.page = void 0), (e.pageSentAtMs = void 0), (e.expiry = void 0));
}

export {
  WGs,
  WDo,
  GGs,
  noteListChangedAhead,
  armToolsListAhead,
  toolsListAheadFields,
  markHandlerRegistered,
  VGs,
  takeAheadPage,
  noteFirstPageMark,
  toolsListAheadTelemetry,
};
