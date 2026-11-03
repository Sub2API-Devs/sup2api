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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:786752-787614 fingerprint = SandboxPromptFooterHint (0.808)
function SandboxPromptFooterHint() {
  let $ = w(7),
    [h, x] = y(0),
    timerRef = R(null),
    L = useClock(),
    detailsShortcut = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o"),
    Re,
    Be;
  if ($[0] !== L)
    ((Re = () => {
      if (!SandboxManager.isSandboxingEnabled()) {
        return;
      }
      let store = SandboxManager.getSandboxViolationStore();
      let lastCount = store.getTotalCount();
      let unsubscribe = store.subscribe(() => {
        let currentCount = store.getTotalCount();
        let newViolations = currentCount - lastCount;
        if (newViolations > 0) {
          if ((x(newViolations), (lastCount = currentCount), timerRef.current)) timerRef.current();
          timerRef.current = L.setTimeout(() => x(0), 5000);
        }
      });
      return () => {
        if ((unsubscribe(), timerRef.current)) timerRef.current();
      };
    }),
      (Be = [L]),
      ($[0] = L),
      ($[1] = Re),
      ($[2] = Be));
  else ((Re = $[1]), (Be = $[2]));
  if ((P(Re, Be), !SandboxManager.isSandboxingEnabled() || h === 0)) {
    return null;
  }
  const t2 = h === 1 ? "operation" : "operations";
  let At;
  if ($[3] !== detailsShortcut || $[4] !== h || $[5] !== t2)
    ((At = e(Box, {
      paddingX: 0,
      paddingY: 0,
      children: r(Text, {
        color: "inactive",
        wrap: "truncate",
        children: [
          "\u29C8 Sandbox blocked ",
          h,
          " ",
          t2,
          " \xB7",
          " ",
          detailsShortcut,
          " for details \xB7 /sandbox to disable",
        ],
      }),
    })),
      ($[3] = detailsShortcut),
      ($[4] = h),
      ($[5] = t2),
      ($[6] = At));
  else At = $[6];
  return At;
}

export { SandboxPromptFooterHint };
