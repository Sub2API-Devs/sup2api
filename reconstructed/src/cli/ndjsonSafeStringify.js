/**
 * cli/ndjsonSafeStringify.ts
 *
 * 并入已有模块：桥接通道的 NDJSON 序列化（按需转义行分隔符）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/ndjsonSafeStringify.ts
 * pieces: chunk-2kh2r6st.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { hasPromptHooks } from "../utils/telemetry/sessionTracing.js";
import { oUo } from "../plugins/functionHooks/sessionHooks.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { escapeInvisibleChars } from "../utils/resultError.js";

//@ chunk-2kh2r6st.js:410-492 placement
function shouldEscapeNdjsonForBridge() {
  try {
    return hasPromptHooks() || oUo({ kind: "bridge" });
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-2kh2r6st.js:492-539 placement
var e = /\u2028|\u2029/g,
  TENGU_SOBER_INKWELL = "tengu_sober_inkwell";
//@ chunk-2kh2r6st.js:539-575 placement
function o() {
  return readFlagWithOverride(TENGU_SOBER_INKWELL, { safe: !0 });
}
/**
 * JSON 序列化后把 U+2028/U+2029 转义，保证 NDJSON 一行一条。
 */
//@ chunk-2kh2r6st.js:575-652 fingerprint = escapeJsLineTerminators (1)
function escapeJsLineTerminators(json) {
  return jsonStringify(json).replace(e, (n) => (n === "\u2028" ? "\\u2028" : "\\u2029"));
}
//@ chunk-2kh2r6st.js:652-705 placement
function ndjsonStringify(r) {
  if (o()) return escapeInvisibleChars(jsonStringify(r));
  return escapeJsLineTerminators(r);
}
//@ chunk-2kh2r6st.js:705-773 placement
function ndjsonStringifyWithReplacer(r, n) {
  if (o()) return escapeInvisibleChars(jsonStringify(r, null, n));
  return jsonStringify(r, null, n);
}

export { shouldEscapeNdjsonForBridge, ndjsonStringifyWithReplacer, ndjsonStringify, escapeJsLineTerminators };
