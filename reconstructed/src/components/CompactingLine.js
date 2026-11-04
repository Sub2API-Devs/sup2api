/**
 * components/CompactingLine.tsx
 *
 * 2.1.316 新增：压缩中提示行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (9)
 * attribution: placement 9
 */
import {
  createContext,
  useContext,
  useLayoutEffect,
  useEffect,
  init_react_production,
} from "../../vendor/react/cjs/react.production.js";
import { topBlockingDialog } from "../screens/replDialogState.js";
import { activityManager } from "../utils/activityManager.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { statusOverrideSlot, useSpinnerStatus } from "./Spinner/spinnerStatus.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useDialogSelector } from "../state/dialogQueue.js";
import { stripSuffix } from "../utils/stringUtils.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { SpinnerColumn } from "./Spinner/SpinnerColumn.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:150636-150652 placement
var COMPACTING_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:150636", () => {
  COMPACTING_CONTEXT = createContext(null);
});
//@ chunk-ag5x7vhf.js:150652-150675 placement
function returnTrue() {
  return true;
}
//@ chunk-ag5x7vhf.js:150675-150698 placement
function returnFalse() {
  return false;
}
//@ chunk-ag5x7vhf.js:150698-150733 placement
function hasTopBlockingDialog(state) {
  return topBlockingDialog(state) !== null;
}
//@ chunk-ag5x7vhf.js:150733-150784 placement
function endCompactingActivity() {
  activityManager.endCLIActivity("compacting-line");
}
//@ chunk-ag5x7vhf.js:150784-150817 placement
var COMPACTING_TEXT = "Compacting conversation";
//@ chunk-ag5x7vhf.js:150817-151029 placement
function useIsViewedAgentCompacting() {
  let $ = useMemoCache(2);
  let compactingContext = useContext(COMPACTING_CONTEXT);
  let statusSlot = useContext(statusOverrideSlot);
  let selector;
  if ($[0] !== compactingContext) {
    selector = (agentStatuses) => {
      let _ = compactingContext === null ? undefined : agentStatuses[compactingContext.agentId];
      return _?.isCompacting === true && _.retryStatus === null;
    };
    $[0] = compactingContext;
    $[1] = selector;
  } else selector = $[1];
  return useStoreSelector(compactingContext === null ? null : statusSlot, selector) === true;
}
//@ chunk-ag5x7vhf.js:151029-151687 placement
function CompactingLine() {
  let $ = useMemoCache(10);
  let compactingContext = useContext(COMPACTING_CONTEXT);
  let { overrideMessage, compactingHintText } = useSpinnerStatus(compactingContext?.agentId);
  let liveRowMounted = compactingContext?.liveRowMounted;
  let _;
  let mountEffect;
  if ($[0] !== liveRowMounted) {
    _ = () => {
      if (liveRowMounted === undefined) {
        return;
      }
      liveRowMounted.setState(returnTrue);
      return () => {
        liveRowMounted.setState(returnFalse);
      };
    };
    mountEffect = [liveRowMounted];
    $[0] = liveRowMounted;
    $[1] = _;
    $[2] = mountEffect;
  } else {
    _ = $[1];
    mountEffect = $[2];
  }
  useLayoutEffect(_, mountEffect);
  let dialogSelector = useDialogSelector(hasTopBlockingDialog);
  let dialogEffect;
  let dialogDeps;
  if ($[3] !== dialogSelector) {
    dialogEffect = () => {
      if (dialogSelector) {
        return;
      }
      activityManager.startCLIActivity("compacting-line");
      return endCompactingActivity;
    };
    dialogDeps = [dialogSelector];
    $[3] = dialogSelector;
    $[4] = dialogEffect;
    $[5] = dialogDeps;
  } else {
    dialogEffect = $[4];
    dialogDeps = $[5];
  }
  useEffect(dialogEffect, dialogDeps);
  const message = overrideMessage ?? COMPACTING_TEXT;
  let strippedMessage;
  if ($[6] !== message) {
    strippedMessage = stripSuffix(message, "\u2026");
    $[6] = message;
    $[7] = strippedMessage;
  } else strippedMessage = $[7];
  let text = strippedMessage;
  const text_2 = text === COMPACTING_TEXT ? (compactingHintText ?? text) : text;
  let spinnerBox;
  if ($[8] !== text_2) {
    spinnerBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      width: "100%",
      children: jsxProd_default(SpinnerColumn, {
        tone: "dim",
        text: text_2,
      }),
    });
    $[8] = text_2;
    $[9] = spinnerBox;
  } else spinnerBox = $[9];
  return spinnerBox;
}
//@ chunk-ag5x7vhf.js:151687-151691 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:151687", () => {
  init_react_production();
});
export { useIsViewedAgentCompacting, CompactingLine };
