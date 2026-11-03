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
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { Ipt } from "../PackageManagerAutoUpdater.js";
import { useHost } from "../../context/session.js";

//@ chunk-18hwfzwa.js:922094-922098 placement
j();
//@ chunk-18hwfzwa.js:922098-922111 placement
var Rao = 5000;
//@ chunk-18hwfzwa.js:922111-922318 placement
function useShowFastIconHint(showFastIcon) {
  let [x, D] = y(!1),
    L = useClock(),
    of = Ipt.of(useHost());
  return (
    P(() => {
      if (of.fastIconHintShown || !showFastIcon) return;
      (of.markFastIconHintShown(), D(!0));
      let ke = L.setTimeout(() => D(!1), Rao);
      return () => {
        (ke(), D(!1));
      };
    }, [showFastIcon, L, of]),
    x
  );
}

export { useShowFastIconHint };
