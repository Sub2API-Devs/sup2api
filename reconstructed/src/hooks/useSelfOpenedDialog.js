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
import { j, y, R } from "../../vendor/react/cjs/react.production.js";
import { hasEarlyInputField } from "../utils/earlyInput.js";
import { INPUT_SETTLE_MS, So } from "./useRecentInputGuard.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useInputRefusalWindow, useRefusalTracker } from "../components/CustomSelect/selectTypeahead.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdownSync, gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-c4c7q360.js:459-463 placement
j();
//@ chunk-c4c7q360.js:463-467 placement
j();
//@ chunk-c4c7q360.js:467-515 placement
function h() {
  let [o] = y(() => (hasEarlyInputField() ? INPUT_SETTLE_MS : So));
  return o;
}
/**
 * 由 Claude 自行打开的对话框的状态钩子：打开后的宽限期内忽略误触，取消时回调，退出时若仍未回答则记为欠答。
 */
//@ chunk-c4c7q360.js:515-1283 placement
function useSelfOpenedDialog(
  o,
  {
    selfOpened: selfOpened,
    hasOpeningGrace: hasOpeningGrace = selfOpened,
    onCancelled: onCancelled,
    owedAtExit: owedAtExit,
  },
) {
  let [C, s] = y(!1),
    n = R(!1),
    [c, E] = y(!1),
    e = R(!1),
    i = h(),
    x = useTimeout(hasOpeningGrace ? i : null),
    d = !hasOpeningGrace || x,
    A = useIsScreenReaderEnabled() ? !0 : !1,
    g = useInputRefusalWindow(i),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker();
  function _() {
    if (hasOpeningGrace && (g() || refusedWithin(i))) return (noteRefused(), !0);
    return !1;
  }
  let a = useGlobalExitKeybindings(
    () => {
      if (e.current) return;
      let t = n.current;
      n.current = !0;
      let l = onCancelled(t);
      if (l === void 0) {
        e.current = !0;
        let p = owedAtExit?.(t);
        if (p === void 0) {
          gracefulShutdownSync(1);
          return;
        }
        p.then(
          (m) => gracefulShutdown(1, "other", m === void 0 ? void 0 : { finalMessage: m }),
          () => gracefulShutdown(1),
        );
        return;
      }
      (s(!0), f(l));
    },
    void 0,
    selfOpened && !c,
  );
  function D() {
    if (n.current || !d) return !1;
    return ((n.current = !0), s(!0), !0);
  }
  function f(t) {
    if (e.current) return;
    ((e.current = !0), E(!0), o(t));
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
