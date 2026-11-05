/**
 * plugins/functionHooks/sessionHooks.ts
 *
 * 2.1.316 新增：session.start/end/attach/detach 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 */
import {
  makeCoreEvent,
  TEXT_PASSTHROUGH_CORES,
  sessionSiteEvent,
  textPassthroughEvent,
} from "./coreHandlers.js";
import { HooksError } from "./hooksErrors.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:73713-73898 placement
/**
 * session.append 事件定义：核心把追加交给会话的 callAppended（无对话的进程中抛错）。
 */
var SESSION_APPEND_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73713", () => {
  SESSION_APPEND_EVENT = makeCoreEvent("session.append", async (request) => {
    let appendCores = TEXT_PASSTHROUGH_CORES.get();
    if (appendCores === null)
      throw new HooksError("$.session.append: this process keeps no conversation to append to");
    return (await appendCores()).callAppended(request);
  });
});
//@ chunk-5xgkngpb.js:73898-73927 placement
/**
 * session.attach 事件
 */
var SESSION_ATTACH_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73898", () => {
  SESSION_ATTACH_EVENT = sessionSiteEvent("session.attach");
});
//@ chunk-5xgkngpb.js:73927-73956 placement
/**
 * session.detach 事件
 */
var SESSION_DETACH_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73927", () => {
  SESSION_DETACH_EVENT = sessionSiteEvent("session.detach");
});
//@ chunk-5xgkngpb.js:73956-73982 placement
/**
 * session.end 事件
 */
var SESSION_END_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73956", () => {
  SESSION_END_EVENT = sessionSiteEvent("session.end");
});
//@ chunk-5xgkngpb.js:73982-74012 placement
/**
 * session.measure 事件
 */
var SESSION_MEASURE_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73982", () => {
  SESSION_MEASURE_EVENT = sessionSiteEvent("session.measure");
});
//@ chunk-5xgkngpb.js:74012-74058 placement
/**
 * session.receive 是否有钩子
 */
var isSessionReceiveHooked = (origin) =>
  hasModuleHookingSite("session.receive", {
    origin,
  });
//@ chunk-5xgkngpb.js:78056-78086 placement
/**
 * session.receive 事件
 */
var SESSION_RECEIVE_EVENT; // deferred: uses textPassthroughEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:78056", () => {
  SESSION_RECEIVE_EVENT = textPassthroughEvent("session.receive");
});
//@ chunk-5xgkngpb.js:78086-78114 placement
/**
 * session.start 事件
 */
var SESSION_START_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:78086", () => {
  SESSION_START_EVENT = sessionSiteEvent("session.start");
});
//@ chunk-5xgkngpb.js:78114-78145 placement
/**
 * 附上 frontmatter
 */
var withFrontmatter = (frontmatter) => ({
  frontmatter,
});
//@ chunk-5xgkngpb.js:80762-80790 placement
/**
 * turn.complete 事件
 */
var TURN_COMPLETE_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:80762", () => {
  TURN_COMPLETE_EVENT = sessionSiteEvent("turn.complete");
});
//@ chunk-5xgkngpb.js:80790-80815 placement
/**
 * turn.start 事件
 */
var TURN_START_EVENT; // deferred: uses sessionSiteEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:80790", () => {
  TURN_START_EVENT = sessionSiteEvent("turn.start");
});
export {
  isSessionReceiveHooked,
  withFrontmatter,
  SESSION_START_EVENT,
  SESSION_RECEIVE_EVENT,
  SESSION_APPEND_EVENT,
  SESSION_ATTACH_EVENT,
  SESSION_DETACH_EVENT,
  SESSION_MEASURE_EVENT,
  SESSION_END_EVENT,
  TURN_START_EVENT,
  TURN_COMPLETE_EVENT,
};
