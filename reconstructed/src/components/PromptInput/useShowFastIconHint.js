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
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { packageManagerAutoUpdaterSlot } from "../PackageManagerAutoUpdater.js";
import { useHost } from "../../context/session.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:922094-922098 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:922094", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:922098-922111 placement
var FAST_ICON_HINT_MS = 5000;
//@ chunk-18hwfzwa.js:922111-922318 placement
function useShowFastIconHint(showFastIcon) {
  let [showHint, setShowHint] = useState(false);
  let clock = useClock();
  let updaterSlot = packageManagerAutoUpdaterSlot.of(useHost());
  useEffect(() => {
    if (updaterSlot.fastIconHintShown || !showFastIcon) return;
    updaterSlot.markFastIconHintShown();
    setShowHint(true);
    let timer = clock.setTimeout(() => setShowHint(false), FAST_ICON_HINT_MS);
    return () => {
      timer();
      setShowHint(false);
    };
  }, [showFastIcon, clock, updaterSlot]);
  return showHint;
}
export { useShowFastIconHint };
