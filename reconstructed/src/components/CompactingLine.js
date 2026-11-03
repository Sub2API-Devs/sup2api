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
import { qt, Se, zt, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
import { topBlockingDialog } from "../screens/replDialogState.js";
import { activityManager } from "../utils/activityManager.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { statusOverrideSlot, useSpinnerStatus } from "./Spinner/spinnerStatus.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useDialogSelector } from "../state/dialogQueue.js";
import { stripSuffix } from "../utils/stringUtils.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { SpinnerColumn } from "./Spinner/SpinnerColumn.js";

//@ chunk-ag5x7vhf.js:150636-150652 placement
var COMPACTING_CONTEXT = qt(null);
//@ chunk-ag5x7vhf.js:150652-150675 placement
function returnTrue() {
  return true;
}
//@ chunk-ag5x7vhf.js:150675-150698 placement
function returnFalse() {
  return false;
}
//@ chunk-ag5x7vhf.js:150698-150733 placement
function hasTopBlockingDialog(Y) {
  return topBlockingDialog(Y) !== null;
}
//@ chunk-ag5x7vhf.js:150733-150784 placement
function endCompactingActivity() {
  activityManager.endCLIActivity("compacting-line");
}
//@ chunk-ag5x7vhf.js:150784-150817 placement
var COMPACTING_TEXT = "Compacting conversation";
//@ chunk-ag5x7vhf.js:150817-151029 placement
function useIsViewedAgentCompacting() {
  let x = w(2);
  let m = Se(COMPACTING_CONTEXT);
  let h = Se(statusOverrideSlot);
  let T;
  if (x[0] !== m) {
    T = (k) => {
      let _ = m === null ? undefined : k[m.agentId];
      return _?.isCompacting === true && _.retryStatus === null;
    };
    x[0] = m;
    x[1] = T;
  } else T = x[1];
  return useStoreSelector(m === null ? null : h, T) === true;
}
//@ chunk-ag5x7vhf.js:151029-151687 placement
function CompactingLine() {
  let k = w(10);
  let m = Se(COMPACTING_CONTEXT);
  let { overrideMessage, compactingHintText } = useSpinnerStatus(m?.agentId);
  let liveRowMounted = m?.liveRowMounted;
  let _;
  let I;
  if (k[0] !== liveRowMounted) {
    _ = () => {
      if (liveRowMounted === undefined) {
        return;
      }
      liveRowMounted.setState(returnTrue);
      return () => {
        liveRowMounted.setState(returnFalse);
      };
    };
    I = [liveRowMounted];
    k[0] = liveRowMounted;
    k[1] = _;
    k[2] = I;
  } else {
    _ = k[1];
    I = k[2];
  }
  zt(_, I);
  let dialogSelector = useDialogSelector(hasTopBlockingDialog);
  let A;
  let L;
  if (k[3] !== dialogSelector) {
    A = () => {
      if (dialogSelector) {
        return;
      }
      activityManager.startCLIActivity("compacting-line");
      return endCompactingActivity;
    };
    L = [dialogSelector];
    k[3] = dialogSelector;
    k[4] = A;
    k[5] = L;
  } else {
    A = k[4];
    L = k[5];
  }
  P(A, L);
  const V = overrideMessage ?? COMPACTING_TEXT;
  let W;
  if (k[6] !== V) {
    W = stripSuffix(V, "\u2026");
    k[6] = V;
    k[7] = W;
  } else W = k[7];
  let z = W;
  const text = z === COMPACTING_TEXT ? (compactingHintText ?? z) : z;
  let q;
  if (k[8] !== text) {
    q = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      width: "100%",
      children: jsxProd_default(SpinnerColumn, {
        tone: "dim",
        text,
      }),
    });
    k[8] = text;
    k[9] = q;
  } else q = k[9];
  return q;
}
//@ chunk-ag5x7vhf.js:151687-151691 placement
init_react_production();
export { useIsViewedAgentCompacting, CompactingLine };
