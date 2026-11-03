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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:64280-65544 fingerprint = HookProgressMessage (0.838)
/**
 * hook 进度："Running <事件> hooks…"，完成后 "N <事件> hooks ran"。
 */
function HookProgressMessage(props) {
  let $ = w(22);
  let { hookEvent, lookups, toolUseID, isTranscriptMode } = props;
  let t1;
  if ($[0] !== hookEvent || $[1] !== lookups.inProgressHookCounts || $[2] !== toolUseID) {
    t1 = lookups.inProgressHookCounts.get(toolUseID)?.get(hookEvent) ?? 0;
    $[0] = hookEvent;
    $[1] = lookups.inProgressHookCounts;
    $[2] = toolUseID;
    $[3] = t1;
  } else t1 = $[3];
  let inProgressHookCount = t1;
  let resolvedHookCount = lookups.resolvedHookCounts.get(toolUseID)?.get(hookEvent) ?? 0;
  if (inProgressHookCount === 0) {
    return null;
  }
  if (hookEvent === "PreToolUse" || hookEvent === "PostToolUse") {
    if (isTranscriptMode) {
      let t2;
      if ($[4] !== inProgressHookCount) {
        t2 = jsxProd_default_2(Text, {
          dimColor: true,
          children: [inProgressHookCount, " "],
        });
        $[4] = inProgressHookCount;
        $[5] = t2;
      } else t2 = $[5];
      let t3;
      if ($[6] !== hookEvent) {
        t3 = jsxProd_default(Text, {
          dimColor: true,
          bold: true,
          children: hookEvent,
        });
        $[6] = hookEvent;
        $[7] = t3;
      } else t3 = $[7];
      const t4 = inProgressHookCount === 1 ? " hook" : " hooks";
      let t5;
      if ($[8] !== t4) {
        t5 = jsxProd_default_2(Text, {
          dimColor: true,
          children: [t4, " ran"],
        });
        $[8] = t4;
        $[9] = t5;
      } else t5 = $[9];
      let t6;
      if ($[10] !== t2 || $[11] !== t3 || $[12] !== t5) {
        t6 = jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "row",
            children: [t2, t3, t5],
          }),
        });
        $[10] = t2;
        $[11] = t3;
        $[12] = t5;
        $[13] = t6;
      } else t6 = $[13];
      return t6;
    }
    return null;
  }
  if (resolvedHookCount >= inProgressHookCount) {
    return null;
  }
  let t2;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      dimColor: true,
      children: "Running ",
    });
    $[14] = t2;
  } else t2 = $[14];
  let t3;
  if ($[15] !== hookEvent) {
    t3 = jsxProd_default(Text, {
      dimColor: true,
      bold: true,
      children: hookEvent,
    });
    $[15] = hookEvent;
    $[16] = t3;
  } else t3 = $[16];
  const children = inProgressHookCount === 1 ? " hook\u2026" : " hooks\u2026";
  let t5;
  if ($[17] !== children) {
    t5 = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[17] = children;
    $[18] = t5;
  } else t5 = $[18];
  let t6;
  if ($[19] !== t3 || $[20] !== t5) {
    t6 = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [t2, t3, t5],
      }),
    });
    $[19] = t3;
    $[20] = t5;
    $[21] = t6;
  } else t6 = $[21];
  return t6;
}
export { HookProgressMessage };
