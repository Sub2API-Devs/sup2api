/**
 * cli/thinClient.ts
 *
 * 2.1.316 新增：thin-client 回复的模式校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d28cbsz3.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "../utils/debug.js";

/**
 * 按 schema 校验 thin-client 回复（不符记 warn 返回 null）。
 */
//@ chunk-d28cbsz3.js:226-504 placement
function parseThinClientReply(r, n, o) {
  let safeParse = n.safeParse(o);
  if (safeParse.success) return safeParse.data;
  let s = safeParse.error.issues[0];
  return (
    logForDebugging(
      `[thin-client] ${r} reply did not match its schema (${safeParse.error.issues.length} issue(s); first: ${s ? `${s.path.join(".") || "<root>"}: ${s.message}` : "unknown"})`,
      { level: "warn" },
    ),
    null
  );
}

export { parseThinClientReply };
