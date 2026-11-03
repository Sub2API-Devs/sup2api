/**
 * services/mcp/blockedServers.ts
 *
 * 2.1.316 新增：被阻止的 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1s0bgm1n.js (2)
 * attribution: placement 2
 */
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1s0bgm1n.js:227-315 placement
var _No = { delete_asset: "ask", delete_artifact: "ask", read_shared_artifact: "blocked", ...{} };
//@ chunk-1s0bgm1n.js:315-381 placement
function l6n(e) {
  return { ...e, ...wi(_No, (s, r) => e?.[r] === "blocked") };
}

export { l6n, _No };
