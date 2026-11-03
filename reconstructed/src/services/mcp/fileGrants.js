/**
 * services/mcp/fileGrants.ts
 *
 * 2.1.316 新增。取出并清空 MCP 文件授权。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cp2ytehj.js (5)
 * attribution: placement 5
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { kCt } from "../../components/permissions/hooks.js";

//@ chunk-cp2ytehj.js:264-304 placement
var t = new SessionRootSlot(() => ({ byToolUse: new Map() }));
//@ chunk-cp2ytehj.js:304-375 placement
function keepFileGrants(n, e, i) {
  (t.of(n).byToolUse.set(e, i),
    kCt(n, e, () => {
      dropFileGrants(n, e);
    }));
}
//@ chunk-cp2ytehj.js:375-424 placement
function dropFileGrants(n, e) {
  t.peek(n)?.byToolUse.delete(e);
}
//@ chunk-cp2ytehj.js:424-494 placement
function hasFileGrants(n, e) {
  return e !== void 0 && t.peek(n)?.byToolUse.has(e) === !0;
}
/**
 * 取出并清空 MCP 文件授权。
 */
//@ chunk-cp2ytehj.js:494-585 placement
function takeFileGrants(n, e) {
  if (e === void 0) return;
  let i = t.peek(n)?.byToolUse.get(e);
  return (dropFileGrants(n, e), i);
}

export { takeFileGrants, keepFileGrants, dropFileGrants };
