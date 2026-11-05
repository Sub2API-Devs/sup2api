/**
 * hooks/useSelfOpenedDialog.ts
 *
 * 2.1.316 新增：自打开对话框钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1d743z54.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { hasEarlyInputField } from "../utils/earlyInput.js";
import { INPUT_SETTLE_MS, RECENT_INPUT_GUARD_MS } from "./useRecentInputGuard.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useRecentInputWithin, useRefusalTracker } from "../components/CustomSelect/selectTypeahead.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdownSync, gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-1d743z54.js:459-463 placement
init_react_production();
//@ chunk-1d743z54.js:463-467 placement
init_react_production();
//@ chunk-1d743z54.js:467-515 placement
function useSelfOpenedDialogValue() {
  let [settleMs] = useState(() => (hasEarlyInputField() ? INPUT_SETTLE_MS : RECENT_INPUT_GUARD_MS));
  return settleMs;
}
//@ chunk-1d743z54.js:515-1283 placement
/**
 * 由 Claude 自行打开的对话框的状态钩子：打开后的宽限期内忽略误触，取消时回调，退出时若仍未回答则记为欠答。
 */
function useSelfOpenedDialog(onDone, { selfOpened, hasOpeningGrace = selfOpened, onCancelled, owedAtExit }) {
  let [decided, setDecided] = useState(false);
  let hasTakenRef = useRef(false);
  let [exitHintActive, setExitHintActive] = useState(false);
  let isSettledRef = useRef(false);
  let selfOpenedDialogValue = useSelfOpenedDialogValue();
  let timeout = useTimeout(hasOpeningGrace ? selfOpenedDialogValue : null);
  let isGraceOver = !hasOpeningGrace || timeout;
  let screenReaderOn = useIsScreenReaderEnabled() ? true : false;
  let isRecentInput = useRecentInputWithin(selfOpenedDialogValue);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function refuseInput() {
    if (hasOpeningGrace && (isRecentInput() || refusedWithin(selfOpenedDialogValue))) {
      noteRefused();
      return true;
    }
    return false;
  }
  let exitKeybinding = useGlobalExitKeybindings(
    () => {
      if (isSettledRef.current) return;
      let isExitHintShowing = hasTakenRef.current;
      hasTakenRef.current = true;
      let decision = onCancelled(isExitHintShowing);
      if (decision === undefined) {
        isSettledRef.current = true;
        let owedResult = owedAtExit?.(isExitHintShowing);
        if (owedResult === undefined) {
          gracefulShutdownSync(1);
          return;
        }
        owedResult.then(
          (finalMessage) =>
            gracefulShutdown(
              1,
              "other",
              finalMessage === undefined
                ? undefined
                : {
                    finalMessage,
                  },
            ),
          () => gracefulShutdown(1),
        );
        return;
      }
      setDecided(true);
      handBack(decision);
    },
    undefined,
    selfOpened && !exitHintActive,
  );
  function take() {
    if (hasTakenRef.current || !isGraceOver) return false;
    hasTakenRef.current = true;
    setDecided(true);
    return true;
  }
  function handBack(value) {
    if (isSettledRef.current) return;
    isSettledRef.current = true;
    setExitHintActive(true);
    onDone(value);
  }
  return {
    choicesDisabled: !isGraceOver && !screenReaderOn,
    decided,
    take,
    refuseInput,
    settled: () => isSettledRef.current,
    handBack,
    exit: exitKeybinding,
    exitHintShowing: exitKeybinding.pending && !exitHintActive,
  };
}
export { useSelfOpenedDialog };
