/**
 * hooks/toolPermission/handlers/interactiveHandlerState.ts
 *
 * 2.1.316 新增：交互式权限处理器宿主的存取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w1sz837t.js (3)
 * attribution: placement 3
 */

//@ chunk-w1sz837t.js:191-202 placement
var interactiveHandlerState = null;
//@ chunk-w1sz837t.js:202-222 placement
function setInteractiveHandlerHost(r) {
  interactiveHandlerState = r;
}
//@ chunk-w1sz837t.js:222-246 placement
function getInteractiveHandlerHost() {
  return interactiveHandlerState;
}
export { setInteractiveHandlerHost, getInteractiveHandlerHost };
