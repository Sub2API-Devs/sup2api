/**
 * components/wizard/WizardProvider.tsx
 *
 * 向导状态 Provider：步骤栈、前进/后退、双击 Esc 退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/WizardProvider.tsx
 * pieces: chunk-095ptjmr.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { j, qt, y, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-095ptjmr.js:821-825 placement
j();
//@ chunk-095ptjmr.js:825-829 placement
j();
//@ chunk-095ptjmr.js:829-857 placement
function Dn(yo) {
  return yo + 1;
}
//@ chunk-095ptjmr.js:857-895 placement
function Tn(prev_1) {
  return prev_1.slice(0, -1);
}
//@ chunk-095ptjmr.js:895-923 placement
function wn(vo) {
  return vo - 1;
}
//@ chunk-095ptjmr.js:923-939 placement
var he = qt(null);
/**
 * 向导上下文：步骤列表与当前步骤、共享数据、next/back/goTo/cancel，Esc 双击退出。
 */
//@ chunk-095ptjmr.js:939-2900 fingerprint = WizardProvider (0.652)
function WizardProvider(t0) {
  let $ = w(40),
    {
      steps: steps,
      stepProps: stepProps,
      initialData: t1,
      onComplete: onComplete,
      onCancel: onCancel,
      children: children,
      title: title,
      showStepCounter: t2,
      exitOnCtrlCD: exitOnCtrlCD,
    } = t0,
    R;
  if ($[0] !== t1) ((R = t1 === void 0 ? {} : t1), ($[0] = t1), ($[1] = R));
  else R = $[1];
  let z = R,
    A = t2 === void 0 ? !0 : t2,
    se = exitOnCtrlCD === void 0 ? !1 : exitOnCtrlCD,
    [v, u] = y(0),
    [m, a] = y(z),
    [k, B] = y(!1),
    J;
  if ($[2] === MEMO_CACHE_SENTINEL) ((J = []), ($[2] = J));
  else J = $[2];
  let [F, ke] = y(J),
    tn,
    nn;
  if ($[3] !== k || $[4] !== onComplete || $[5] !== m)
    ((tn = () => {
      if (k) (ke([]), onComplete(m));
    }),
      (nn = [k, m, onComplete]),
      ($[3] = k),
      ($[4] = onComplete),
      ($[5] = m),
      ($[6] = tn),
      ($[7] = nn));
  else ((tn = $[6]), (nn = $[7]));
  P(tn, nn);
  let on;
  if ($[8] !== v || $[9] !== F || $[10] !== steps.length)
    ((on = () => {
      if (v < steps.length - 1) {
        if (F.length > 0) ke((prev) => [...prev, v]);
        u(Dn);
      } else B(!0);
    }),
      ($[8] = v),
      ($[9] = F),
      ($[10] = steps.length),
      ($[11] = on));
  else on = $[11];
  let dt = on,
    rn;
  if ($[12] !== v || $[13] !== F || $[14] !== onCancel)
    ((rn = () => {
      if (F.length > 0) {
        let at = F.at(-1);
        if (at !== void 0) (ke(Tn), u(at));
      } else if (v > 0) u(wn);
      else if (onCancel) onCancel();
    }),
      ($[12] = v),
      ($[13] = F),
      ($[14] = onCancel),
      ($[15] = rn));
  else rn = $[15];
  let ut = rn,
    sn;
  if ($[16] !== v || $[17] !== steps.length)
    ((sn = (index) => {
      if (index >= 0 && index < steps.length) (ke((prev_3) => [...prev_3, v]), u(index));
    }),
      ($[16] = v),
      ($[17] = steps.length),
      ($[18] = sn));
  else sn = $[18];
  let mt = sn,
    ln;
  if ($[19] !== onCancel)
    ((ln = () => {
      if ((ke([]), onCancel)) onCancel();
    }),
      ($[19] = onCancel),
      ($[20] = ln));
  else ln = $[20];
  let Re = ln,
    dn = useGlobalExitKeybindings(se ? void 0 : Re),
    ft = dn.pending ? `Press ${dn.keyName} again to ${se ? "exit" : "cancel"}` : null,
    pn;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((pn = (updates) => {
      a((prev_4) => ({ ...prev_4, ...updates }));
    }),
      ($[21] = pn));
  else pn = $[21];
  let Co = pn,
    un;
  if (
    $[22] !== Re ||
    $[23] !== v ||
    $[24] !== ut ||
    $[25] !== dt ||
    $[26] !== mt ||
    $[27] !== ft ||
    $[28] !== A ||
    $[29] !== steps.length ||
    $[30] !== title ||
    $[31] !== m
  )
    ((un = {
      currentStepIndex: v,
      totalSteps: steps.length,
      wizardData: m,
      setWizardData: a,
      updateWizardData: Co,
      goNext: dt,
      goBack: ut,
      goToStep: mt,
      cancel: Re,
      title: title,
      showStepCounter: A,
      pendingExitHint: ft,
    }),
      ($[22] = Re),
      ($[23] = v),
      ($[24] = ut),
      ($[25] = dt),
      ($[26] = mt),
      ($[27] = ft),
      ($[28] = A),
      ($[29] = steps.length),
      ($[30] = title),
      ($[31] = m),
      ($[32] = un));
  else un = $[32];
  let xt = un,
    Me = steps[v];
  if (!Me || k) {
    return null;
  }
  let Ne;
  if ($[33] !== Me || $[34] !== children || $[35] !== stepProps)
    ((Ne = children || e(Me, { ...stepProps })),
      ($[33] = Me),
      ($[34] = children),
      ($[35] = stepProps),
      ($[36] = Ne));
  else Ne = $[36];
  let cn;
  if ($[37] !== xt || $[38] !== Ne)
    ((cn = e(he.Provider, { value: xt, children: Ne })), ($[37] = xt), ($[38] = Ne), ($[39] = cn));
  else cn = $[39];
  return cn;
}

export { he, WizardProvider };
