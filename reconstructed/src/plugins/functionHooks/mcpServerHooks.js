/**
 * plugins/functionHooks/mcpServerHooks.ts
 *
 * 2.1.316 新增：MCP 服务器相关事件钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { EN } from "../../services/mcp/mcpClientCapabilities.js";
import { lp } from "./surfaceBinding.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:55650-55739 placement
function Y3(e) {
  let serverKey = EN.serverKey(e);
  if ((EN.forget(e), serverKey !== void 0)) lp()?.removeMcpServer(serverKey);
}
//@ chunk-e6aww6q8.js:55739-55775 placement = getMcpPrefix (1)
var buildRawMcpToolName = (e, n) => `mcp__${normalizeNameForMCP(e)}__${n}`;
//@ chunk-e6aww6q8.js:55775-55833 placement
function Oyt() {
  let e;
  return {
    set: (n) => {
      e = n;
    },
    current: () => e,
  };
}
//@ chunk-e6aww6q8.js:55833-55847 placement
var mle = Oyt();
//@ chunk-e6aww6q8.js:55847-55873 placement
var Hto = (e) => {
  mle.set(e);
};
//@ chunk-e6aww6q8.js:55873-55893 placement
var Iyt = mle.current;
//@ chunk-e6aww6q8.js:55893-55991 placement
function XLe(e, n) {
  let serverKey = EN.serverKey(e);
  return serverKey !== void 0 && EN.list(e).some((s) => buildRawMcpToolName(serverKey, s.name) === n);
}
//@ chunk-e6aww6q8.js:55991-56007 placement
var list = EN.list;
/**
 * 若插件登记的工具已原样出现在会话工具中，返回其 mcp__服务器__工具 全名。
 */
//@ chunk-e6aww6q8.js:56007-56202 placement
function registeredMcpToolName(e, n, r) {
  let found = EN.list(r).find((L) => L.name === n.name),
    serverKey = EN.serverKey(r);
  if (found === void 0 || serverKey === void 0 || jsonStringify(found) !== jsonStringify(n)) return;
  let S = buildRawMcpToolName(serverKey, n.name);
  return e.tools().some((L) => L.name === S) ? S : void 0;
}

export { Y3, XLe, list, registeredMcpToolName, Iyt, buildRawMcpToolName, Hto };
