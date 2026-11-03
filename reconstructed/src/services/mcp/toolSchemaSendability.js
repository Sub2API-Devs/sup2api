/**
 * services/mcp/toolSchemaSendability.ts
 *
 * 2.1.316 新增。判断 MCP 工具 schema 能否发给 API（不支持则丢弃或规范化）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rm24v4ew.js (1)
 * attribution: placement 1
 */
import { flattenInputSchema } from "../../remote/tools/inputSchemaFlatten.js";
import { validateToolSchema } from "./toolSchemaValidation.js";

//@ chunk-rm24v4ew.js:265-918 placement
/**
 * 判断 MCP 工具 schema 能否发给 API（不支持则丢弃或规范化）。
 */
function judgeToolSchemaSendability(inputSchema, n) {
  let e = flattenInputSchema(inputSchema);
  if (e.outcome === "drop")
    return {
      verdict: "drop",
      cause: "schema_unsupported",
      reason: e.reason,
    };
  if (e.outcome === "normalized" && !n.normalizeEnabled)
    return {
      verdict: "drop",
      cause: "normalize_gated",
      reason: `its input schema uses top-level ${e.combinators.join("/")}, which the Anthropic API does not accept`,
    };
  let o =
    e.outcome === "normalized"
      ? {
          schema: e.schema,
          note: e.note,
          combinators: e.combinators,
        }
      : undefined;
  let i = validateToolSchema(o?.schema ?? inputSchema);
  if (i.valid)
    return {
      verdict: "send",
      normalized: o,
      apiWouldReject: undefined,
    };
  if (!n.apiValidateEnabled)
    return {
      verdict: "send",
      normalized: o,
      apiWouldReject: i,
    };
  return {
    verdict: "drop",
    cause: "api_invalid",
    normalized: o,
    rejection: i,
  };
}
export { judgeToolSchemaSendability };
