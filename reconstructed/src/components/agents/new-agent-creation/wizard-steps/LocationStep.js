/**
 * components/agents/new-agent-creation/wizard-steps/LocationStep.tsx
 *
 * 向导位置步骤；实际内容为 Google Cloud 凭证校验（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/LocationStep.tsx
 * pieces: chunk-y6fv30yg.js (2)
 * attribution: placement 1, callgraph-fingerprint 1
 */
import { j, y, P } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { probeVertexCredentials } from "../../../vertexSetup/vertexCredentials.js";
import { e, r } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { WorkerBadge } from "../../../permissions/WorkerBadge.js";
import { StatusIcon } from "../../../design-system/StatusIcon.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { ModelSelector } from "../../ModelSelector.js";
import { ConfirmSelect } from "../../../design-system/ConfirmSelect.js";

//@ chunk-y6fv30yg.js:17115-17119 placement
j();
//@ chunk-y6fv30yg.js:17119-19411 callgraph-fingerprint = LocationStep (0.154)
function LocationStep() {
  let $ = w(35),
    {
      goBack: goBack,
      goNext: goNext,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    h;
  if ($[0] === MEMO_CACHE_SENTINEL) ((h = { phase: "checking" }), ($[0] = h));
  else h = $[0];
  let [p, f] = y(h),
    u;
  if ($[1] !== updateWizardData || $[2] !== wizardData)
    ((u = () => {
      let k = !1;
      return (
        probeVertexCredentials(wizardData).then((g) => {
          if (k) {
            return;
          }
          if (g.status === "ok") updateWizardData({ verifiedIdentity: g.identity });
          else updateWizardData({ verifiedIdentity: void 0 });
          f({ phase: "done", result: g });
        }),
        () => {
          k = !0;
        }
      );
    }),
      ($[1] = updateWizardData),
      ($[2] = wizardData),
      ($[3] = u));
  else u = $[3];
  let _;
  if ($[4] === MEMO_CACHE_SENTINEL) ((_ = []), ($[4] = _));
  else _ = $[4];
  if ((P(u, _), p.phase === "checking")) {
    let A;
    if ($[5] === MEMO_CACHE_SENTINEL)
      ((A = e(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: e(WorkerBadge, {
          message: "Calling Google Cloud\u2026",
          subtitle: "This may take a few seconds.",
        }),
      })),
        ($[5] = A));
    else A = $[5];
    return A;
  }
  let { result: d } = p;
  switch (d.status) {
    case "ok": {
      let A;
      if ($[6] === MEMO_CACHE_SENTINEL)
        ((A = e(StatusIcon, { status: "success", withSpace: !0 })), ($[6] = A));
      else A = $[6];
      let D;
      if ($[7] !== d.identity)
        ((D = r(Text, { children: [A, "Authenticated as ", e(Text, { bold: !0, children: d.identity })] })),
          ($[7] = d.identity),
          ($[8] = D));
      else D = $[8];
      let x;
      if ($[9] !== d.note)
        ((x = d.note && e(Text, { dimColor: !0, children: d.note })), ($[9] = d.note), ($[10] = x));
      else x = $[10];
      let T;
      if ($[11] === MEMO_CACHE_SENTINEL) ((T = [{ label: "Continue", value: "continue" }]), ($[11] = T));
      else T = $[11];
      let C;
      if ($[12] !== goNext) ((C = () => goNext()), ($[12] = goNext), ($[13] = C));
      else C = $[13];
      let E;
      if ($[14] !== goBack || $[15] !== C)
        ((E = e(ModelSelector, { options: T, onChange: C, onCancel: goBack })),
          ($[14] = goBack),
          ($[15] = C),
          ($[16] = E));
      else E = $[16];
      let v;
      if ($[17] !== D || $[18] !== x || $[19] !== E)
        ((v = e(WizardDialogLayout, {
          subtitle: "Verification",
          children: r(Box, { flexDirection: "column", gap: 1, children: [D, x, E] }),
        })),
          ($[17] = D),
          ($[18] = x),
          ($[19] = E),
          ($[20] = v));
      else v = $[20];
      return v;
    }
    case "error": {
      let A;
      if ($[21] === MEMO_CACHE_SENTINEL)
        ((A = e(StatusIcon, { status: "error", withSpace: !0 })), ($[21] = A));
      else A = $[21];
      let D;
      if ($[22] !== d.error) ((D = r(Text, { children: [A, d.error] })), ($[22] = d.error), ($[23] = D));
      else D = $[23];
      let x;
      if ($[24] !== d.command)
        ((x = d.command && r(Text, { bold: !0, color: "suggestion", children: ["    ", d.command] })),
          ($[24] = d.command),
          ($[25] = x));
      else x = $[25];
      let T;
      if ($[26] !== D || $[27] !== x)
        ((T = r(Box, { flexDirection: "column", children: [D, x] })), ($[26] = D), ($[27] = x), ($[28] = T));
      else T = $[28];
      let C;
      if ($[29] !== goBack || $[30] !== goNext)
        ((C = e(ConfirmSelect, {
          hideIndexes: !0,
          cancelFirst: !0,
          focus: "cancel",
          confirmLabel: "Save anyway (skip verification)",
          cancelLabel: "Go back and fix",
          onConfirm: goNext,
          onCancel: goBack,
        })),
          ($[29] = goBack),
          ($[30] = goNext),
          ($[31] = C));
      else C = $[31];
      let E;
      if ($[32] !== T || $[33] !== C)
        ((E = e(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: r(Box, { flexDirection: "column", gap: 1, children: [T, C] }),
        })),
          ($[32] = T),
          ($[33] = C),
          ($[34] = E));
      else E = $[34];
      return E;
    }
  }
}

export { LocationStep };
