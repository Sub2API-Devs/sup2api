/**
 * cli/thinClient.ts
 *
 * 2.1.316 新增：thin-client 回复的模式校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q4eg3h09.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "../utils/debug.js";

//@ chunk-q4eg3h09.js:226-504 placement
/**
 * 按 schema 校验 thin-client 回复（不符记 warn 返回 null）。
 */
function parseThinClientReply(schema, parse, raw) {
  let parsed = parse.safeParse(raw);
  if (parsed.success) return parsed.data;
  let issue = parsed.error.issues[0];
  logForDebugging(
    `[thin-client] ${schema} reply did not match its schema (${parsed.error.issues.length} issue(s); first: ${issue ? `${issue.path.join(".") || "<root>"}: ${issue.message}` : "unknown"})`,
    {
      level: "warn",
    },
  );
  return null;
}
export { parseThinClientReply };
