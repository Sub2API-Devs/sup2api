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
import { gh, nSt, RS, eA } from "./coreHandlers.js";
import { HooksError } from "./hooksErrors.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";

/**
 * session.append 事件定义：核心把追加交给会话的 callAppended（无对话的进程中抛错）。
 */
//@ chunk-e6aww6q8.js:71166-71351 placement
var SESSION_APPEND_EVENT = gh("session.append", async (e) => {
  let n = nSt.get();
  if (n === null) throw new HooksError("$.session.append: this process keeps no conversation to append to");
  return (await n()).callAppended(e);
});
//@ chunk-e6aww6q8.js:71351-71380 placement
var r_t = RS("session.attach");
//@ chunk-e6aww6q8.js:71380-71409 placement
var s_t = RS("session.detach");
//@ chunk-e6aww6q8.js:71409-71435 placement
var Yle = RS("session.end");
//@ chunk-e6aww6q8.js:71435-71465 placement
var Xle = RS("session.measure");
//@ chunk-e6aww6q8.js:71465-71511 placement
var oUo = (e) => hasModuleHookingSite("session.receive", { origin: e });
//@ chunk-e6aww6q8.js:75506-75536 placement
var sde = eA("session.receive");
//@ chunk-e6aww6q8.js:75536-75564 placement
var ade = RS("session.start");
//@ chunk-e6aww6q8.js:75564-75595 placement
var FNe = (e) => ({ frontmatter: e });
//@ chunk-e6aww6q8.js:78212-78240 placement
var T_t = RS("turn.complete");
//@ chunk-e6aww6q8.js:78240-78265 placement
var v_t = RS("turn.start");

export { oUo, SESSION_APPEND_EVENT, FNe, ade, sde, r_t, s_t, Xle, Yle, v_t, T_t };
