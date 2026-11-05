/**
 * services/mcp/toolSchemaSendability.ts
 *
 * 2.1.316 新增。判断 MCP 工具 schema 能否发给 API（不支持则丢弃或规范化）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d8kc7cr1.js (1)
 * attribution: placement 1
 */
import { flattenInputSchema } from "../../remote/tools/inputSchemaFlatten.js";
import { validateToolSchema } from "./toolSchemaValidation.js";

//@ chunk-d8kc7cr1.js:265-918 placement
/**
 * 判断 MCP 工具 schema 能否发给 API（不支持则丢弃或规范化）。
 */
function judgeToolSchemaSendability(schema, options) {
  let flattened = flattenInputSchema(schema);
  if (flattened.outcome === "drop")
    return {
      verdict: "drop",
      cause: "schema_unsupported",
      reason: flattened.reason,
    };
  if (flattened.outcome === "normalized" && !options.normalizeEnabled)
    return {
      verdict: "drop",
      cause: "normalize_gated",
      reason: `its input schema uses top-level ${flattened.combinators.join("/")}, which the Anthropic API does not accept`,
    };
  let normalized =
    flattened.outcome === "normalized"
      ? {
          schema: flattened.schema,
          note: flattened.note,
          combinators: flattened.combinators,
        }
      : undefined;
  let validation = validateToolSchema(normalized?.schema ?? schema);
  if (validation.valid)
    return {
      verdict: "send",
      normalized,
      apiWouldReject: undefined,
    };
  if (!options.apiValidateEnabled)
    return {
      verdict: "send",
      normalized,
      apiWouldReject: validation,
    };
  return {
    verdict: "drop",
    cause: "api_invalid",
    normalized,
    rejection: validation,
  };
}
export { judgeToolSchemaSendability };
