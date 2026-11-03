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
import { qt, Se, zt, P, j } from "../../vendor/react/cjs/react.production.js";
import { topBlockingDialog } from "../screens/replDialogState.js";
import { activityManager } from "../utils/activityManager.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Kmt, A0t } from "./Spinner/spinnerStatus.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useDialogSelector } from "../state/dialogQueue.js";
import { stripSuffix } from "../utils/stringUtils.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { SpinnerColumn } from "./Spinner/SpinnerColumn.js";

//@ chunk-ag5x7vhf.js:150636-150652 placement
var _i = qt(null);
//@ chunk-ag5x7vhf.js:150652-150675 placement
function KD() {
  return !0;
}
//@ chunk-ag5x7vhf.js:150675-150698 placement
function qD() {
  return !1;
}
//@ chunk-ag5x7vhf.js:150698-150733 placement
function YD(Y) {
  return topBlockingDialog(Y) !== null;
}
//@ chunk-ag5x7vhf.js:150733-150784 placement
function endCompactingActivity() {
  activityManager.endCLIActivity("compacting-line");
}
//@ chunk-ag5x7vhf.js:150784-150817 placement
var Zl = "Compacting conversation";
//@ chunk-ag5x7vhf.js:150817-151029 placement
function useIsViewedAgentCompacting() {
  let x = w(2),
    m = Se(_i),
    h = Se(Kmt),
    T;
  if (x[0] !== m)
    ((T = (k) => {
      let _ = m === null ? void 0 : k[m.agentId];
      return _?.isCompacting === !0 && _.retryStatus === null;
    }),
      (x[0] = m),
      (x[1] = T));
  else T = x[1];
  return useStoreSelector(m === null ? null : h, T) === !0;
}
//@ chunk-ag5x7vhf.js:151029-151687 placement
function CompactingLine() {
  let k = w(10),
    m = Se(_i),
    { overrideMessage: overrideMessage, compactingHintText: compactingHintText } = A0t(m?.agentId),
    T = m?.liveRowMounted,
    _,
    I;
  if (k[0] !== T)
    ((_ = () => {
      if (T === void 0) {
        return;
      }
      return (
        T.setState(KD),
        () => {
          T.setState(qD);
        }
      );
    }),
      (I = [T]),
      (k[0] = T),
      (k[1] = _),
      (k[2] = I));
  else ((_ = k[1]), (I = k[2]));
  zt(_, I);
  let D = useDialogSelector(YD),
    A,
    L;
  if (k[3] !== D)
    ((A = () => {
      if (D) {
        return;
      }
      return (activityManager.startCLIActivity("compacting-line"), endCompactingActivity);
    }),
      (L = [D]),
      (k[3] = D),
      (k[4] = A),
      (k[5] = L));
  else ((A = k[4]), (L = k[5]));
  P(A, L);
  const V = overrideMessage ?? Zl;
  let W;
  if (k[6] !== V) ((W = stripSuffix(V, "\u2026")), (k[6] = V), (k[7] = W));
  else W = k[7];
  let z = W;
  const K = z === Zl ? (compactingHintText ?? z) : z;
  let q;
  if (k[8] !== K)
    ((q = e(Box, {
      flexDirection: "column",
      marginTop: 1,
      width: "100%",
      children: e(SpinnerColumn, { tone: "dim", text: K }),
    })),
      (k[8] = K),
      (k[9] = q));
  else q = k[9];
  return q;
}
//@ chunk-ag5x7vhf.js:151687-151691 placement
j();

export { useIsViewedAgentCompacting, CompactingLine };
