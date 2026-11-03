/**
 * services/mcp/schemaParse.ts
 *
 * 2.1.316 新增：MCP 消息 schema 的解析包装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zxqppt5p.js (2)
 * attribution: placement 2
 */
import { rlo, olo } from "../../../vendor/zod/v4/core/api.js";
import { Ygs, Xgs } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-zxqppt5p.js:240-273 placement
function t0(o) {
  return rlo(Ygs, o);
}
//@ chunk-zxqppt5p.js:273-307 placement
function t1i(o) {
  return olo(Xgs, o);
}

export { t0, t1i };
