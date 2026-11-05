/**
 * hooks/toolPermission/handlers/interactiveHandlerState.ts
 *
 * 2.1.316 新增：交互式权限处理器宿主的存取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mjsw885w.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-mjsw885w.js:191-202 placement
var interactiveHandlerState = null;
//@ chunk-mjsw885w.js:202-222 placement
function setInteractiveHandlerHost(host) {
  interactiveHandlerState = host;
}
//@ chunk-mjsw885w.js:222-246 placement
function getInteractiveHandlerHost() {
  return interactiveHandlerState;
}
export { getInteractiveHandlerHost, setInteractiveHandlerHost };
