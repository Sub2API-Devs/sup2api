/**
 * plugins/functionHooks/sessionHooks.ts
 *
 * 2.1.316 新增：session.start/end/attach/detach 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
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

//@ chunk-e6aww6q8.js:71166-71351 placement
/**
 * session.append 事件定义：核心把追加交给会话的 callAppended（无对话的进程中抛错）。
 */
var SESSION_APPEND_EVENT = makeCoreEvent("session.append", async (e) => {
  let n = TEXT_PASSTHROUGH_CORES.get();
  if (n === null) throw new HooksError("$.session.append: this process keeps no conversation to append to");
  return (await n()).callAppended(e);
});
//@ chunk-e6aww6q8.js:71351-71380 placement
/**
 * session.attach 事件
 */
var SESSION_ATTACH_EVENT = sessionSiteEvent("session.attach");
//@ chunk-e6aww6q8.js:71380-71409 placement
/**
 * session.detach 事件
 */
var SESSION_DETACH_EVENT = sessionSiteEvent("session.detach");
//@ chunk-e6aww6q8.js:71409-71435 placement
/**
 * session.end 事件
 */
var SESSION_END_EVENT = sessionSiteEvent("session.end");
//@ chunk-e6aww6q8.js:71435-71465 placement
/**
 * session.measure 事件
 */
var SESSION_MEASURE_EVENT = sessionSiteEvent("session.measure");
//@ chunk-e6aww6q8.js:71465-71511 placement
/**
 * session.receive 是否有钩子
 */
var isSessionReceiveHooked = (origin) =>
  hasModuleHookingSite("session.receive", {
    origin,
  });
//@ chunk-e6aww6q8.js:75506-75536 placement
/**
 * session.receive 事件
 */
var SESSION_RECEIVE_EVENT = textPassthroughEvent("session.receive");
//@ chunk-e6aww6q8.js:75536-75564 placement
/**
 * session.start 事件
 */
var SESSION_START_EVENT = sessionSiteEvent("session.start");
//@ chunk-e6aww6q8.js:75564-75595 placement
/**
 * 附上 frontmatter
 */
var withFrontmatter = (frontmatter) => ({
  frontmatter,
});
//@ chunk-e6aww6q8.js:78212-78240 placement
/**
 * turn.complete 事件
 */
var TURN_COMPLETE_EVENT = sessionSiteEvent("turn.complete");
//@ chunk-e6aww6q8.js:78240-78265 placement
/**
 * turn.start 事件
 */
var TURN_START_EVENT = sessionSiteEvent("turn.start");
export {
  isSessionReceiveHooked,
  SESSION_APPEND_EVENT,
  withFrontmatter,
  SESSION_START_EVENT,
  SESSION_RECEIVE_EVENT,
  SESSION_ATTACH_EVENT,
  SESSION_DETACH_EVENT,
  SESSION_MEASURE_EVENT,
  SESSION_END_EVENT,
  TURN_START_EVENT,
  TURN_COMPLETE_EVENT,
};
