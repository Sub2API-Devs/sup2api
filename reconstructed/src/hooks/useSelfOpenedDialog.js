/**
 * hooks/useSelfOpenedDialog.ts
 *
 * 2.1.316 新增：自打开对话框钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c4c7q360.js (4)
 * attribution: placement 4
 */
import { init_react_production, y, R } from "../../vendor/react/cjs/react.production.js";
import { hasEarlyInputField } from "../utils/earlyInput.js";
import { INPUT_SETTLE_MS, RECENT_INPUT_GUARD_MS } from "./useRecentInputGuard.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useInputRefusalWindow, useRefusalTracker } from "../components/CustomSelect/selectTypeahead.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdownSync, gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-c4c7q360.js:459-463 placement
init_react_production();
//@ chunk-c4c7q360.js:463-467 placement
init_react_production();
//@ chunk-c4c7q360.js:467-515 placement
function useSelfOpenedDialogValue() {
  let [o] = y(() => (hasEarlyInputField() ? INPUT_SETTLE_MS : RECENT_INPUT_GUARD_MS));
  return o;
}
//@ chunk-c4c7q360.js:515-1283 placement
/**
 * 由 Claude 自行打开的对话框的状态钩子：打开后的宽限期内忽略误触，取消时回调，退出时若仍未回答则记为欠答。
 */
function useSelfOpenedDialog(onDone, { selfOpened, hasOpeningGrace = selfOpened, onCancelled, owedAtExit }) {
  let [C, s] = y(false);
  let n = R(false);
  let [c, E] = y(false);
  let e = R(false);
  let selfOpenedDialogValue = useSelfOpenedDialogValue();
  let timeout = useTimeout(hasOpeningGrace ? selfOpenedDialogValue : null);
  let d = !hasOpeningGrace || timeout;
  let A = useIsScreenReaderEnabled() ? true : false;
  let inputRefusalWindow = useInputRefusalWindow(selfOpenedDialogValue);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function _() {
    if (hasOpeningGrace && (inputRefusalWindow() || refusedWithin(selfOpenedDialogValue))) {
      noteRefused();
      return true;
    }
    return false;
  }
  let a = useGlobalExitKeybindings(
    () => {
      if (e.current) return;
      let t = n.current;
      n.current = true;
      let l = onCancelled(t);
      if (l === undefined) {
        e.current = true;
        let p = owedAtExit?.(t);
        if (p === undefined) {
          gracefulShutdownSync(1);
          return;
        }
        p.then(
          (m) =>
            gracefulShutdown(
              1,
              "other",
              m === undefined
                ? undefined
                : {
                    finalMessage: m,
                  },
            ),
          () => gracefulShutdown(1),
        );
        return;
      }
      s(true);
      f(l);
    },
    undefined,
    selfOpened && !c,
  );
  function D() {
    if (n.current || !d) return false;
    n.current = true;
    s(true);
    return true;
  }
  function f(t) {
    if (e.current) return;
    e.current = true;
    E(true);
    onDone(t);
  }
  return {
    choicesDisabled: !d && !A,
    decided: C,
    take: D,
    refuseInput: _,
    settled: () => e.current,
    handBack: f,
    exit: a,
    exitHintShowing: a.pending && !c,
  };
}
export { useSelfOpenedDialog };
