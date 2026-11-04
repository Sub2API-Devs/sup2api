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
import {
  init_react_production,
  useState,
  useEffect,
} from "../../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-y6fv30yg.js:17115-17119 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y6fv30yg.js:17115", () => {
  init_react_production();
});
//@ chunk-y6fv30yg.js:17119-19411 callgraph-fingerprint (2.1.88 match: LocationStep, 0.154)
function LocationStep() {
  let $ = useMemoCache(35);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let initialState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialState = {
      phase: "checking",
    };
    $[0] = initialState;
  } else initialState = $[0];
  let [probeState, setProbeState] = useState(initialState);
  let probeEffect;
  if ($[1] !== updateWizardData || $[2] !== wizardData) {
    probeEffect = () => {
      let cancelled = false;
      probeVertexCredentials(wizardData).then((probeResult) => {
        if (cancelled) {
          return;
        }
        if (probeResult.status === "ok")
          updateWizardData({
            verifiedIdentity: probeResult.identity,
          });
        else
          updateWizardData({
            verifiedIdentity: undefined,
          });
        setProbeState({
          phase: "done",
          result: probeResult,
        });
      });
      return () => {
        cancelled = true;
      };
    };
    $[1] = updateWizardData;
    $[2] = wizardData;
    $[3] = probeEffect;
  } else probeEffect = $[3];
  let probeDeps;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    probeDeps = [];
    $[4] = probeDeps;
  } else probeDeps = $[4];
  useEffect(probeEffect, probeDeps);
  if (probeState.phase === "checking") {
    let checkingLayout;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      checkingLayout = jsxProd_default(WizardDialogLayout, {
        subtitle: "Verifying credentials",
        children: jsxProd_default(WorkerBadge, {
          message: "Calling Google Cloud\u2026",
          subtitle: "This may take a few seconds.",
        }),
      });
      $[5] = checkingLayout;
    } else checkingLayout = $[5];
    return checkingLayout;
  }
  let { result } = probeState;
  switch (result.status) {
    case "ok": {
      let successIcon;
      if ($[6] === MEMO_CACHE_SENTINEL) {
        successIcon = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        $[6] = successIcon;
      } else successIcon = $[6];
      let identityLine;
      if ($[7] !== result.identity) {
        identityLine = jsxProd_default_2(Text, {
          children: [
            successIcon,
            "Authenticated as ",
            jsxProd_default(Text, {
              bold: true,
              children: result.identity,
            }),
          ],
        });
        $[7] = result.identity;
        $[8] = identityLine;
      } else identityLine = $[8];
      let noteText;
      if ($[9] !== result.note) {
        noteText =
          result.note &&
          jsxProd_default(Text, {
            dimColor: true,
            children: result.note,
          });
        $[9] = result.note;
        $[10] = noteText;
      } else noteText = $[10];
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
      let selector;
      if ($[14] !== goBack || $[15] !== onChange) {
        selector = jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: goBack,
        });
        $[14] = goBack;
        $[15] = onChange;
        $[16] = selector;
      } else selector = $[16];
      let successLayout;
      if ($[17] !== identityLine || $[18] !== noteText || $[19] !== selector) {
        successLayout = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [identityLine, noteText, selector],
          }),
        });
        $[17] = identityLine;
        $[18] = noteText;
        $[19] = selector;
        $[20] = successLayout;
      } else successLayout = $[20];
      return successLayout;
    }
    case "error": {
      let errorIcon;
      if ($[21] === MEMO_CACHE_SENTINEL) {
        errorIcon = jsxProd_default(StatusIcon, {
          status: "error",
          withSpace: true,
        });
        $[21] = errorIcon;
      } else errorIcon = $[21];
      let errorLine;
      if ($[22] !== result.error) {
        errorLine = jsxProd_default_2(Text, {
          children: [errorIcon, result.error],
        });
        $[22] = result.error;
        $[23] = errorLine;
      } else errorLine = $[23];
      let commandLine;
      if ($[24] !== result.command) {
        commandLine =
          result.command &&
          jsxProd_default_2(Text, {
            bold: true,
            color: "suggestion",
            children: ["    ", result.command],
          });
        $[24] = result.command;
        $[25] = commandLine;
      } else commandLine = $[25];
      let errorBox;
      if ($[26] !== errorLine || $[27] !== commandLine) {
        errorBox = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [errorLine, commandLine],
        });
        $[26] = errorLine;
        $[27] = commandLine;
        $[28] = errorBox;
      } else errorBox = $[28];
      let confirmSelect;
      if ($[29] !== goBack || $[30] !== goNext) {
        confirmSelect = jsxProd_default(ConfirmSelect, {
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
        $[31] = confirmSelect;
      } else confirmSelect = $[31];
      let errorLayout;
      if ($[32] !== errorBox || $[33] !== confirmSelect) {
        errorLayout = jsxProd_default(WizardDialogLayout, {
          subtitle: "Verification failed",
          color: "error",
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [errorBox, confirmSelect],
          }),
        });
        $[32] = errorBox;
        $[33] = confirmSelect;
        $[34] = errorLayout;
      } else errorLayout = $[34];
      return errorLayout;
    }
  }
}
export { LocationStep };
