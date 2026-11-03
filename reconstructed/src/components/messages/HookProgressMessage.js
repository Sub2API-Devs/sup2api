/**
 * components/messages/HookProgressMessage.tsx
 *
 * hook 运行进度："Running PreToolUse hooks…" / "N hooks ran"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/HookProgressMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

/**
 * hook 进度："Running <事件> hooks…"，完成后 "N <事件> hooks ran"。
 */
//@ chunk-ah34pb7m.js:64280-65544 fingerprint = HookProgressMessage (0.838)
function HookProgressMessage(t0) {
  let $ = w(22),
    { hookEvent: hookEvent, lookups: lookups, toolUseID: toolUseID, isTranscriptMode: isTranscriptMode } = t0,
    M;
  if ($[0] !== hookEvent || $[1] !== lookups.inProgressHookCounts || $[2] !== toolUseID)
    ((M = lookups.inProgressHookCounts.get(toolUseID)?.get(hookEvent) ?? 0),
      ($[0] = hookEvent),
      ($[1] = lookups.inProgressHookCounts),
      ($[2] = toolUseID),
      ($[3] = M));
  else M = $[3];
  let inProgressHookCount = M,
    resolvedHookCount = lookups.resolvedHookCounts.get(toolUseID)?.get(hookEvent) ?? 0;
  if (inProgressHookCount === 0) {
    return null;
  }
  if (hookEvent === "PreToolUse" || hookEvent === "PostToolUse") {
    if (isTranscriptMode) {
      let k;
      if ($[4] !== inProgressHookCount)
        ((k = r(Text, { dimColor: !0, children: [inProgressHookCount, " "] })),
          ($[4] = inProgressHookCount),
          ($[5] = k));
      else k = $[5];
      let b;
      if ($[6] !== hookEvent)
        ((b = e(Text, { dimColor: !0, bold: !0, children: hookEvent })), ($[6] = hookEvent), ($[7] = b));
      else b = $[7];
      const E = inProgressHookCount === 1 ? " hook" : " hooks";
      let B;
      if ($[8] !== E) ((B = r(Text, { dimColor: !0, children: [E, " ran"] })), ($[8] = E), ($[9] = B));
      else B = $[9];
      let L;
      if ($[10] !== k || $[11] !== b || $[12] !== B)
        ((L = e(MessageResponse, { children: r(Box, { flexDirection: "row", children: [k, b, B] }) })),
          ($[10] = k),
          ($[11] = b),
          ($[12] = B),
          ($[13] = L));
      else L = $[13];
      return L;
    }
    return null;
  }
  if (resolvedHookCount >= inProgressHookCount) {
    return null;
  }
  let k;
  if ($[14] === MEMO_CACHE_SENTINEL) ((k = e(Text, { dimColor: !0, children: "Running " })), ($[14] = k));
  else k = $[14];
  let b;
  if ($[15] !== hookEvent)
    ((b = e(Text, { dimColor: !0, bold: !0, children: hookEvent })), ($[15] = hookEvent), ($[16] = b));
  else b = $[16];
  const E = inProgressHookCount === 1 ? " hook\u2026" : " hooks\u2026";
  let B;
  if ($[17] !== E) ((B = e(Text, { dimColor: !0, children: E })), ($[17] = E), ($[18] = B));
  else B = $[18];
  let L;
  if ($[19] !== b || $[20] !== B)
    ((L = e(MessageResponse, { children: r(Box, { flexDirection: "row", children: [k, b, B] }) })),
      ($[19] = b),
      ($[20] = B),
      ($[21] = L));
  else L = $[21];
  return L;
}

export { HookProgressMessage };
