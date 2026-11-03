/**
 * plugins/functionHooks/pluginLifecycle.ts
 *
 * 2.1.316 新增：插件函数钩子的启用、禁用与生命周期事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { rv } from "./toolCallHooks.js";

//@ chunk-e6aww6q8.js:84992-85025 placement
var Lso = { gapMs: 8000, capMs: 60000 };
//@ chunk-e6aww6q8.js:85025-85082 placement
var R8n = ge(to(), (e) => {
  (e.get()?.dispose(), e.set(void 0));
});
//@ chunk-e6aww6q8.js:85082-85094 placement
var Nso = 250;
//@ chunk-e6aww6q8.js:85094-85130 placement
var Yue = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:85130-85171 placement
var Fso = { limit: 5, gapMs: 2000, quietMs: 1e4 };
//@ chunk-e6aww6q8.js:85171-85209 placement
var Bde = ge(to(), (e) => {
  e.set(void 0);
});
//@ chunk-e6aww6q8.js:85209-85247 placement
var Ude = ge(to(), (e) => {
  e.set(void 0);
});
//@ chunk-e6aww6q8.js:85247-85312 placement
function _Ys(e) {
  Ude.set(e);
  let n = Bde.get();
  (Bde.set(void 0), n?.());
}
/**
 * 释放某插件对 MCP 服务器/命令的暂扣（若有），忽略错误。
 */
//@ chunk-e6aww6q8.js:85312-85429 placement
var releaseServerHold = (e) =>
  e === void 0
    ? Promise.resolve()
    : (R8n.get()?.release(e) ?? Promise.resolve()).then(
        () => {
          return;
        },
        () => {
          return;
        },
      );
/**
 * 工具调用前释放调用所属 MCP 服务器的插件暂扣。
 */
//@ chunk-e6aww6q8.js:85429-85537 placement
function releaseToolServerHold(e) {
  let n = e.mcpInfo?.serverName,
    { registered: registered } = rv;
  return releaseServerHold(n === void 0 ? void 0 : registered.ownerOfKey(n));
}

export { Yue, _Ys, releaseToolServerHold, R8n, Ude, Bde, Nso, Lso, Fso, releaseServerHold };
