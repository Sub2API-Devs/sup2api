/**
 * components/PromptInput/SandboxPromptFooterHint.tsx
 *
 * 页脚沙箱提示：最近被沙箱拦截的操作数与查看方式（ctrl+o）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/SandboxPromptFooterHint.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-czq1j3j2.js:819371-820233 fingerprint (2.1.88 match: SandboxPromptFooterHint, 0.808)
function SandboxPromptFooterHint() {
  let $ = useMemoCache(7);
  let [recentViolationCount, setRecentViolationCount] = useState(0);
  let timerRef = useRef(null);
  let clock = useClock();
  let detailsShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let checkViolationEffect;
  let t1;
  if ($[0] !== clock) {
    checkViolationEffect = () => {
      if (!SandboxManager.isSandboxingEnabled()) {
        return;
      }
      let store = SandboxManager.getSandboxViolationStore();
      let lastCount = store.getTotalCount();
      let unsubscribe = store.subscribe(() => {
        let currentCount = store.getTotalCount();
        let newViolations = currentCount - lastCount;
        if (newViolations > 0) {
          setRecentViolationCount(newViolations);
          lastCount = currentCount;
          if (timerRef.current) timerRef.current();
          timerRef.current = clock.setTimeout(() => setRecentViolationCount(0), 5000);
        }
      });
      return () => {
        unsubscribe();
        if (timerRef.current) timerRef.current();
      };
    };
    t1 = [clock];
    $[0] = clock;
    $[1] = checkViolationEffect;
    $[2] = t1;
  } else {
    checkViolationEffect = $[1];
    t1 = $[2];
  }
  useEffect(checkViolationEffect, t1);
  if (!SandboxManager.isSandboxingEnabled() || recentViolationCount === 0) {
    return null;
  }
  const t2 = recentViolationCount === 1 ? "operation" : "operations";
  let t3;
  if ($[3] !== detailsShortcut || $[4] !== recentViolationCount || $[5] !== t2) {
    t3 = jsxProd_default(Box, {
      paddingX: 0,
      paddingY: 0,
      children: jsxProd_default_2(Text, {
        color: "inactive",
        wrap: "truncate",
        children: [
          "\u29C8 Sandbox blocked ",
          recentViolationCount,
          " ",
          t2,
          " \xB7",
          " ",
          detailsShortcut,
          " for details \xB7 /sandbox to disable",
        ],
      }),
    });
    $[3] = detailsShortcut;
    $[4] = recentViolationCount;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
export { SandboxPromptFooterHint };
