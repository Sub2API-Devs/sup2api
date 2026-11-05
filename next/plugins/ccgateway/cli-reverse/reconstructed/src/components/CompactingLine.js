/**
 * components/CompactingLine.tsx
 *
 * 2.1.316 新增：压缩中提示行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (9)
 * attribution: placement 9
 */
import {
  init_react_production,
  createContext,
  useContext,
  useLayoutEffect,
  useEffect,
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

//@ chunk-hnxhr3bs.js:154309-154313 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:154309", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:154956-154972 placement
var COMPACTING_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:154956", () => {
  COMPACTING_CONTEXT = createContext(null);
});
//@ chunk-hnxhr3bs.js:154972-154995 placement
function returnTrue() {
  return true;
}
//@ chunk-hnxhr3bs.js:154995-155018 placement
function returnFalse() {
  return false;
}
//@ chunk-hnxhr3bs.js:155018-155053 placement
function hasTopBlockingDialog(state) {
  return topBlockingDialog(state) !== null;
}
//@ chunk-hnxhr3bs.js:155053-155104 placement
function endCompactingActivity() {
  activityManager.endCLIActivity("compacting-line");
}
//@ chunk-hnxhr3bs.js:155104-155137 placement
var COMPACTING_TEXT = "Compacting conversation";
//@ chunk-hnxhr3bs.js:155137-155349 placement
function useIsViewedAgentCompacting() {
  let $ = useMemoCache(2);
  let compactingContext = useContext(COMPACTING_CONTEXT);
  let statusSlot = useContext(statusOverrideSlot);
  let selector;
  if ($[0] !== compactingContext) {
    selector = (agentStatuses) => {
      let status = compactingContext === null ? undefined : agentStatuses[compactingContext.agentId];
      return status?.isCompacting === true && status.retryStatus === null;
    };
    $[0] = compactingContext;
    $[1] = selector;
  } else selector = $[1];
  return useStoreSelector(compactingContext === null ? null : statusSlot, selector) === true;
}
//@ chunk-hnxhr3bs.js:155349-156007 placement
function CompactingLine() {
  let $ = useMemoCache(10);
  let compactingContext = useContext(COMPACTING_CONTEXT);
  let { overrideMessage, compactingHintText } = useSpinnerStatus(compactingContext?.agentId);
  let liveRowMounted = compactingContext?.liveRowMounted;
  let mountedEffect;
  let mountEffect;
  if ($[0] !== liveRowMounted) {
    mountedEffect = () => {
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
    $[1] = mountedEffect;
    $[2] = mountEffect;
  } else {
    mountedEffect = $[1];
    mountEffect = $[2];
  }
  useLayoutEffect(mountedEffect, mountEffect);
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
export { useIsViewedAgentCompacting, CompactingLine };
