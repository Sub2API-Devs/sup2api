/**
 * components/wizard/WizardProvider.tsx
 *
 * 向导状态 Provider：步骤栈、前进/后退、双击 Esc 退出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/WizardProvider.tsx
 * pieces: chunk-pqe1nn4c.js (7)
 * attribution: placement 6, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  useState,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pqe1nn4c.js:822-826 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pqe1nn4c.js:822", () => {
  init_react_production();
});
//@ chunk-pqe1nn4c.js:826-830 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pqe1nn4c.js:826", () => {
  init_react_production();
});
//@ chunk-pqe1nn4c.js:830-858 placement
function incrementStep(index) {
  return index + 1;
}
//@ chunk-pqe1nn4c.js:858-896 placement
function popStep(prev) {
  return prev.slice(0, -1);
}
//@ chunk-pqe1nn4c.js:896-924 placement
function decrementStep(index) {
  return index - 1;
}
//@ chunk-pqe1nn4c.js:924-940 placement
var wizardSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pqe1nn4c.js:924", () => {
  wizardSlot = createContext(null);
});
//@ chunk-pqe1nn4c.js:940-2761 fingerprint (2.1.88 match: WizardProvider, 0.583)
/**
 * 向导上下文：步骤列表与当前步骤、共享数据、next/back/goTo/cancel，Esc 双击退出。
 */
function WizardProvider(props) {
  let $ = useMemoCache(38);
  let { steps, stepProps, initialData, onComplete, onCancel, children, title, exitOnCtrlCD } = props;
  let t3;
  if ($[0] !== initialData) {
    t3 = initialData === undefined ? {} : initialData;
    $[0] = initialData;
    $[1] = t3;
  } else t3 = $[1];
  let initialData_2 = t3;
  let exitOnCtrlCD_ = exitOnCtrlCD === undefined ? false : exitOnCtrlCD;
  let [currentStepIndex, setCurrentStepIndex] = useState(0);
  let [wizardData, setWizardData] = useState(initialData_2);
  let [isCompleted, setIsCompleted] = useState(false);
  let t4;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t4 = [];
    $[2] = t4;
  } else t4 = $[2];
  let [navigationHistory, setNavigationHistory] = useState(t4);
  let t5;
  let t6;
  if ($[3] !== isCompleted || $[4] !== onComplete || $[5] !== wizardData) {
    t5 = () => {
      if (isCompleted) {
        setNavigationHistory([]);
        onComplete(wizardData);
      }
    };
    t6 = [isCompleted, wizardData, onComplete];
    $[3] = isCompleted;
    $[4] = onComplete;
    $[5] = wizardData;
    $[6] = t5;
    $[7] = t6;
  } else {
    t5 = $[6];
    t6 = $[7];
  }
  useEffect(t5, t6);
  let t7;
  if ($[8] !== currentStepIndex || $[9] !== navigationHistory || $[10] !== steps.length) {
    t7 = () => {
      if (currentStepIndex < steps.length - 1) {
        if (navigationHistory.length > 0) setNavigationHistory((prev) => [...prev, currentStepIndex]);
        setCurrentStepIndex(incrementStep);
      } else setIsCompleted(true);
    };
    $[8] = currentStepIndex;
    $[9] = navigationHistory;
    $[10] = steps.length;
    $[11] = t7;
  } else t7 = $[11];
  let goNext = t7;
  let t8;
  if ($[12] !== currentStepIndex || $[13] !== navigationHistory || $[14] !== onCancel) {
    t8 = () => {
      if (navigationHistory.length > 0) {
        let previousStep = navigationHistory.at(-1);
        if (previousStep !== undefined) {
          setNavigationHistory(popStep);
          setCurrentStepIndex(previousStep);
        }
      } else if (currentStepIndex > 0) setCurrentStepIndex(decrementStep);
      else if (onCancel) onCancel();
    };
    $[12] = currentStepIndex;
    $[13] = navigationHistory;
    $[14] = onCancel;
    $[15] = t8;
  } else t8 = $[15];
  let goBack = t8;
  let t9;
  if ($[16] !== currentStepIndex || $[17] !== steps.length) {
    t9 = (index) => {
      if (index >= 0 && index < steps.length) {
        setNavigationHistory((prev) => [...prev, currentStepIndex]);
        setCurrentStepIndex(index);
      }
    };
    $[16] = currentStepIndex;
    $[17] = steps.length;
    $[18] = t9;
  } else t9 = $[18];
  let goToStep = t9;
  let t10;
  if ($[19] !== onCancel) {
    t10 = () => {
      setNavigationHistory([]);
      if (onCancel) onCancel();
    };
    $[19] = onCancel;
    $[20] = t10;
  } else t10 = $[20];
  let globalExitKeybindings = useGlobalExitKeybindings(exitOnCtrlCD_ ? undefined : t10);
  let pendingExitHint = globalExitKeybindings.pending
    ? `Press ${globalExitKeybindings.keyName} again to ${exitOnCtrlCD_ ? "exit" : "cancel"}`
    : null;
  let t11;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    t11 = (updates) => {
      setWizardData((prev) => ({
        ...prev,
        ...updates,
      }));
    };
    $[21] = t11;
  } else t11 = $[21];
  let updateWizardData = t11;
  let t12;
  if (
    $[22] !== currentStepIndex ||
    $[23] !== goBack ||
    $[24] !== goNext ||
    $[25] !== goToStep ||
    $[26] !== pendingExitHint ||
    $[27] !== steps.length ||
    $[28] !== title ||
    $[29] !== wizardData
  ) {
    t12 = {
      currentStepIndex,
      totalSteps: steps.length,
      wizardData,
      updateWizardData,
      goNext,
      goBack,
      goToStep,
      title,
      pendingExitHint,
    };
    $[22] = currentStepIndex;
    $[23] = goBack;
    $[24] = goNext;
    $[25] = goToStep;
    $[26] = pendingExitHint;
    $[27] = steps.length;
    $[28] = title;
    $[29] = wizardData;
    $[30] = t12;
  } else t12 = $[30];
  let contextValue = t12;
  let step = steps[currentStepIndex];
  if (!step || isCompleted) {
    return null;
  }
  let children_2;
  if ($[31] !== step || $[32] !== children || $[33] !== stepProps) {
    children_2 =
      children ||
      jsxProd_default(step, {
        ...stepProps,
      });
    $[31] = step;
    $[32] = children;
    $[33] = stepProps;
    $[34] = children_2;
  } else children_2 = $[34];
  let t14;
  if ($[35] !== contextValue || $[36] !== children_2) {
    t14 = jsxProd_default(wizardSlot.Provider, {
      value: contextValue,
      children: children_2,
    });
    $[35] = contextValue;
    $[36] = children_2;
    $[37] = t14;
  } else t14 = $[37];
  return t14;
}
export { WizardProvider, wizardSlot };
