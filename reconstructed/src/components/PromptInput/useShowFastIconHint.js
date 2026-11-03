/**
 * components/PromptInput/useShowFastIconHint.ts
 *
 * 沿用旧版路径：是否显示快速模式图标提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useShowFastIconHint.ts
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { packageManagerAutoUpdaterSlot } from "../PackageManagerAutoUpdater.js";
import { useHost } from "../../context/session.js";

//@ chunk-18hwfzwa.js:922094-922098 placement
init_react_production();
//@ chunk-18hwfzwa.js:922098-922111 placement
var FAST_ICON_HINT_MS = 5000;
//@ chunk-18hwfzwa.js:922111-922318 placement
function useShowFastIconHint(showFastIcon) {
  let [showHint, setShowHint] = y(false);
  let clock = useClock();
  let ee = packageManagerAutoUpdaterSlot.of(useHost());
  P(() => {
    if (ee.fastIconHintShown || !showFastIcon) return;
    ee.markFastIconHintShown();
    setShowHint(true);
    let timer = clock.setTimeout(() => setShowHint(false), FAST_ICON_HINT_MS);
    return () => {
      timer();
      setShowHint(false);
    };
  }, [showFastIcon, clock, ee]);
  return showHint;
}
export { useShowFastIconHint };
