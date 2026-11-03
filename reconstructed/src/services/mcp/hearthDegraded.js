/**
 * services/mcp/hearthDegraded.ts
 *
 * 2.1.316 新增：记录 MCP 下游不可达时的降级状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-st7cjqc5.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { HEARTHBOT } from "./ccrMetaMcp.js";
import { rY } from "./mcpResultErrors.js";

//@ chunk-st7cjqc5.js:333-366 placement
var d = new HostScoped(() => ({ degraded: !1 }));
//@ chunk-st7cjqc5.js:366-401 placement
function t() {
  return d.of(getRootSession().host);
}
/**
 * 根据 hearthbot 工具调用的错误更新其降级状态（下游不可达时降级，下游错误或成功时恢复）。
 */
//@ chunk-st7cjqc5.js:401-585 placement
function noteHearthDegraded(n, r) {
  if (n !== HEARTHBOT) return;
  let e = t();
  if (r === void 0) {
    e.degraded = !1;
    return;
  }
  let o = rY(r);
  if (o === "downstream_unreachable") e.degraded = !0;
  else if (o === "downstream_error") e.degraded = !1;
}
//@ chunk-st7cjqc5.js:585-620 placement
function MKs() {
  return t().degraded;
}

export { noteHearthDegraded, MKs };
