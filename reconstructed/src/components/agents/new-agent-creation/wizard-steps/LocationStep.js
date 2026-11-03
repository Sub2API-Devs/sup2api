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
import { init_react_production, y, P } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { probeVertexCredentials } from "../../../vertexSetup/vertexCredentials.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { WorkerBadge } from "../../../permissions/WorkerBadge.js";
import { StatusIcon } from "../../../design-system/StatusIcon.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { ModelSelector } from "../../ModelSelector.js";
import { ConfirmSelect } from "../../../design-system/ConfirmSelect.js";

//@ chunk-y6fv30yg.js:17115-17119 placement
init_react_production();
//@ chunk-y6fv30yg.js:17119-19411 callgraph-fingerprint = LocationStep (0.154)
function LocationStep() {
  let $ = w(35);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let h;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    h = {
      phase: "checking",
    };
    $[0] = h;
  } else h = $[0];
  let [p, f] = y(h);
  let u;
  if ($[1] !== updateWizardData || $[2] !== wizardData) {
    u = () => {
      let k = false;
      probeVertexCredentials(wizardData).then((g) => {
        if (k) {
          return;
        }
        if (g.status === "ok")
          updateWizardData({
            verifiedIdentity: g.identity,
          });
        else
          updateWizardData({
            verifiedIdentity: undefined,
          });
        f({
          phase: "done",
          result: g,
        });
      });
      return () => {
        k = true;
      };
    };
    $[1] = updateWizardData;
    $[2] = wizardData;
    $[3] = u;
  } else u = $[3];
  let _;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    _ = [];
    $[4] = _;
  } else _ = $[4];
  P(u, _);
  if (p.phase === "checking") {
    let A;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      A = jsxProd_default(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: jsxProd_default(WorkerBadge, {
          message: "Calling Google Cloud\u2026",
          subtitle: "This may take a few seconds.",
        }),
      });
      $[5] = A;
    } else A = $[5];
    return A;
  }
  let { result: d } = p;
  switch (d.status) {
    case "ok": {
      let A;
      if ($[6] === MEMO_CACHE_SENTINEL) {
        A = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        $[6] = A;
      } else A = $[6];
      let D;
      if ($[7] !== d.identity) {
        D = jsxProd_default_2(Text, {
          children: [
            A,
            "Authenticated as ",
            jsxProd_default(Text, {
              bold: true,
              children: d.identity,
            }),
          ],
        });
        $[7] = d.identity;
        $[8] = D;
      } else D = $[8];
      let x;
      if ($[9] !== d.note) {
        x =
          d.note &&
          jsxProd_default(Text, {
            dimColor: true,
            children: d.note,
          });
        $[9] = d.note;
        $[10] = x;
      } else x = $[10];
      let options;
      if ($[11] === MEMO_CACHE_SENTINEL) {
        options = [
          {
            label: "Continue",
            value: "continue",
          },
        ];
        $[11] = options;
      } else options = $[11];
      let onChange;
      if ($[12] !== goNext) {
        onChange = () => goNext();
        $[12] = goNext;
        $[13] = onChange;
      } else onChange = $[13];
      let E;
      if ($[14] !== goBack || $[15] !== onChange) {
        E = jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: goBack,
        });
        $[14] = goBack;
        $[15] = onChange;
        $[16] = E;
      } else E = $[16];
      let v;
      if ($[17] !== D || $[18] !== x || $[19] !== E) {
        v = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [D, x, E],
          }),
        });
        $[17] = D;
        $[18] = x;
        $[19] = E;
        $[20] = v;
      } else v = $[20];
      return v;
    }
    case "error": {
      let A;
      if ($[21] === MEMO_CACHE_SENTINEL) {
        A = jsxProd_default(StatusIcon, {
          status: "error",
          withSpace: true,
        });
        $[21] = A;
      } else A = $[21];
      let D;
      if ($[22] !== d.error) {
        D = jsxProd_default_2(Text, {
          children: [A, d.error],
        });
        $[22] = d.error;
        $[23] = D;
      } else D = $[23];
      let x;
      if ($[24] !== d.command) {
        x =
          d.command &&
          jsxProd_default_2(Text, {
            bold: true,
            color: "suggestion",
            children: ["    ", d.command],
          });
        $[24] = d.command;
        $[25] = x;
      } else x = $[25];
      let T;
      if ($[26] !== D || $[27] !== x) {
        T = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [D, x],
        });
        $[26] = D;
        $[27] = x;
        $[28] = T;
      } else T = $[28];
      let C;
      if ($[29] !== goBack || $[30] !== goNext) {
        C = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          cancelFirst: true,
          focus: "cancel",
          confirmLabel: "Save anyway (skip verification)",
          cancelLabel: "Go back and fix",
          onConfirm: goNext,
          onCancel: goBack,
        });
        $[29] = goBack;
        $[30] = goNext;
        $[31] = C;
      } else C = $[31];
      let E;
      if ($[32] !== T || $[33] !== C) {
        E = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [T, C],
          }),
        });
        $[32] = T;
        $[33] = C;
        $[34] = E;
      } else E = $[34];
      return E;
    }
  }
}
export { LocationStep };
