/**
 * services/mcp/schemaParse.ts
 *
 * 2.1.316 新增：MCP 消息 schema 的解析包装
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hh0872ys.js (2)
 * attribution: placement 2
 */
import { _isoDateTime, _isoDate } from "../../../vendor/zod/v4/core/api.js";
import { ZodISODateTime, ZodISODate } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-hh0872ys.js:240-273 placement
/**
 * 用输出 schema 解析值（内部包装）。
 */
function parseToolOutputSchema(params) {
  return _isoDateTime(ZodISODateTime, params);
}
//@ chunk-hh0872ys.js:273-307 placement
/**
 * 用输入 schema 宽松解析值（内部包装）。
 */
function parseToolInputSchemaLoose(params) {
  return _isoDate(ZodISODate, params);
}
export { parseToolOutputSchema, parseToolInputSchemaLoose };
