/**
 * components/PromptInput/SandboxPromptFooterHint.tsx
 *
 * 页脚沙箱提示：最近被沙箱拦截的操作数与查看方式（ctrl+o）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/SandboxPromptFooterHint.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:786752-787614 fingerprint = SandboxPromptFooterHint (0.808)
function SandboxPromptFooterHint() {
  let $ = w(7);
  let [recentViolationCount, setRecentViolationCount] = y(0);
  let timerRef = R(null);
  let clock = useClock();
  let detailsShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let Re;
  let t1;
  if ($[0] !== clock) {
    Re = () => {
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
    $[1] = Re;
    $[2] = t1;
  } else {
    Re = $[1];
    t1 = $[2];
  }
  P(Re, t1);
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
