/**
 * cli/ndjsonSafeStringify.ts
 *
 * 并入已有模块：桥接通道的 NDJSON 序列化（按需转义行分隔符）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/ndjsonSafeStringify.ts
 * pieces: chunk-md68gfrt.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { hasPromptHooks } from "../utils/telemetry/sessionTracing.js";
import { isSessionReceiveHooked } from "../plugins/functionHooks/sessionHooks.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { escapeInvisibleChars } from "../utils/resultError.js";

//@ chunk-md68gfrt.js:443-525 placement
function shouldEscapeNdjsonForBridge() {
  try {
    return (
      hasPromptHooks() ||
      isSessionReceiveHooked({
        kind: "bridge",
      })
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-md68gfrt.js:525-572 placement
var LINE_SEPARATOR_PATTERN = /\u2028|\u2029/g;
var TENGU_SOBER_INKWELL = "tengu_sober_inkwell";
//@ chunk-md68gfrt.js:572-608 placement
function shouldEscapeLineTerminators() {
  return readFlagWithOverride(TENGU_SOBER_INKWELL, {
    safe: true,
  });
}
//@ chunk-md68gfrt.js:608-685 fingerprint (2.1.88 match: escapeJsLineTerminators, 1)
/**
 * JSON 序列化后把 U+2028/U+2029 转义，保证 NDJSON 一行一条。
 */
function escapeJsLineTerminators(json) {
  return jsonStringify(json).replace(LINE_SEPARATOR_PATTERN, (json) =>
    json === "\u2028" ? "\\u2028" : "\\u2029",
  );
}
//@ chunk-md68gfrt.js:685-738 placement
function ndjsonStringify(json) {
  if (shouldEscapeLineTerminators()) return escapeInvisibleChars(jsonStringify(json));
  return escapeJsLineTerminators(json);
}
//@ chunk-md68gfrt.js:738-806 placement
function ndjsonStringifyWithReplacer(value, indent) {
  if (shouldEscapeLineTerminators()) return escapeInvisibleChars(jsonStringify(value, null, indent));
  return jsonStringify(value, null, indent);
}
export { ndjsonStringifyWithReplacer, ndjsonStringify, shouldEscapeNdjsonForBridge, escapeJsLineTerminators };
