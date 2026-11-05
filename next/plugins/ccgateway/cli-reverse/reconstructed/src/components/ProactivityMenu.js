/**
 * components/ProactivityMenu.tsx
 *
 * 2.1.316 新增。主动性（proactivity）设置菜单。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: placement 10
 */
import { init_react_production, memo, useEffect, useState } from "../../vendor/react/cjs/react.production.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { getViewedTeammateTask_2 as getViewedTeammateTask_2_2 } from "../state/selectors.js";
import { nextPermissionMode } from "../utils/permissions/proactivityCycle.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../context/overlayContext.js";
import { useAppState } from "../state/AppState.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { onProactivitySelectorGateChanged } from "../bootstrap/state.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { nextProactivityMode, previousProactivityMode } from "../utils/proactivityMode.js";
import { getNextPermissionMode } from "../utils/permissions/getNextPermissionMode.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:675319-675323 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:675319", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:687549-687553 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:687549", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:687553-687557 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:687553", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:696809-696813 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:696809", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:699109-699153 placement
function isViewingTeammate(state) {
  return isAgentSwarmsEnabled() && getViewedTeammateTask_2_2(state) !== undefined;
}
//@ chunk-czq1j3j2.js:699699-699743 placement
function selectProactivityLevel2(state) {
  return state.proactivityLevel;
}
//@ chunk-czq1j3j2.js:699743-699806 placement
function nextProactivityStepState(level, toolPermissionContext) {
  return {
    level,
    entryMode: nextPermissionMode(level, toolPermissionContext),
    mode: null,
  };
}
//@ chunk-czq1j3j2.js:699806-702529 placement
var ProactivityMenu; // deferred: uses useRegisterOverlay (../context/overlayContext.js) of its import cycle while loading; runs once the cycle is complete
var IGNORED_KEY_NAMES;
var ALLOWED_CONTROL_CHARS;
deferInit("chunk-czq1j3j2.js:699806", () => {
  ProactivityMenu = memo(function (props) {
    let $ = useMemoCache(45);
    let { toolPermissionContext, vimCommandMode, onChange, onConfirm, onTypeThrough, onCancel } = props;
    useRegisterOverlay("proactivity-dialog");
    useAppState(selectProactivityLevel2);
    let appState = useAppState(isViewingTeammate);
    let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
    let gateEffect;
    let gateDeps;
    if ($[0] !== appState || $[1] !== onCancel || $[2] !== dialogOfKind) {
      gateEffect = () => {
        if (appState || dialogOfKind) onCancel();
        return onProactivitySelectorGateChanged((gateOpen) => {
          if (!gateOpen) onCancel();
        });
      };
      gateDeps = [appState, dialogOfKind, onCancel];
      $[0] = appState;
      $[1] = onCancel;
      $[2] = dialogOfKind;
      $[3] = gateEffect;
      $[4] = gateDeps;
    } else {
      gateEffect = $[3];
      gateDeps = $[4];
    }
    useEffect(gateEffect, gateDeps);
    useShortcutDisplay("confirm:previous", "Confirmation", "up");
    useShortcutDisplay("confirm:next", "Confirmation", "down");
    useShortcutDisplay("proactivityMenu:previousMode", "ProactivityMenu", "left");
    useShortcutDisplay("proactivityMenu:nextMode", "ProactivityMenu", "right");
    let stepLevel;
    if ($[5] !== onChange || $[6] !== toolPermissionContext) {
      stepLevel = function stepLevelImpl(direction) {
        onChange((state) =>
          nextProactivityStepState(
            direction === "next" ? nextProactivityMode(state.level) : previousProactivityMode(state.level),
            toolPermissionContext,
          ),
        );
      };
      $[5] = onChange;
      $[6] = toolPermissionContext;
      $[7] = stepLevel;
    } else stepLevel = $[7];
    let stepLevelStable = stepLevel;
    let cycleMode;
    if ($[8] !== onChange || $[9] !== toolPermissionContext) {
      cycleMode = function cycleModeImpl(direction) {
        onChange((state) => ({
          ...state,
          mode: getNextPermissionMode(
            {
              ...toolPermissionContext,
              mode: state.mode ?? state.entryMode,
            },
            direction,
          ),
        }));
      };
      $[8] = onChange;
      $[9] = toolPermissionContext;
      $[10] = cycleMode;
    } else cycleMode = $[10];
    let cycleModeStable = cycleMode;
    let previousLevel;
    let nextLevel;
    let cycleLevel;
    if ($[11] !== stepLevelStable) {
      previousLevel = () => stepLevelStable("previous");
      nextLevel = () => stepLevelStable("next");
      cycleLevel = () => stepLevelStable("next");
      $[11] = stepLevelStable;
      $[12] = previousLevel;
      $[13] = nextLevel;
      $[14] = cycleLevel;
    } else {
      previousLevel = $[12];
      nextLevel = $[13];
      cycleLevel = $[14];
    }
    let confirmation;
    if ($[15] !== onConfirm || $[16] !== previousLevel || $[17] !== nextLevel || $[18] !== cycleLevel) {
      confirmation = {
        "confirm:yes": onConfirm,
        "confirm:previous": previousLevel,
        "confirm:next": nextLevel,
        "confirm:cycleMode": cycleLevel,
      };
      $[15] = onConfirm;
      $[16] = previousLevel;
      $[17] = nextLevel;
      $[18] = cycleLevel;
      $[19] = confirmation;
    } else confirmation = $[19];
    let modeRow;
    if ($[20] !== cycleModeStable) {
      modeRow = {
        "proactivityMenu:previousMode": () => cycleModeStable("previous"),
        "proactivityMenu:nextMode": () => cycleModeStable("next"),
      };
      $[20] = cycleModeStable;
      $[21] = modeRow;
    } else modeRow = $[21];
    let vimH;
    if ($[22] !== cycleModeStable) {
      vimH = ["h", () => cycleModeStable("previous")];
      $[22] = cycleModeStable;
      $[23] = vimH;
    } else vimH = $[23];
    let vimJ;
    if ($[24] !== stepLevelStable) {
      vimJ = ["j", () => stepLevelStable("next")];
      $[24] = stepLevelStable;
      $[25] = vimJ;
    } else vimJ = $[25];
    let vimK;
    if ($[26] !== stepLevelStable) {
      vimK = ["k", () => stepLevelStable("previous")];
      $[26] = stepLevelStable;
      $[27] = vimK;
    } else vimK = $[27];
    let vimL;
    if ($[28] !== cycleModeStable) {
      vimL = ["l", () => cycleModeStable("next")];
      $[28] = cycleModeStable;
      $[29] = vimL;
    } else vimL = $[29];
    let vimSteps;
    if ($[30] !== vimH || $[31] !== vimJ || $[32] !== vimK || $[33] !== vimL) {
      vimSteps = new Map([vimH, vimJ, vimK, vimL]);
      $[30] = vimH;
      $[31] = vimJ;
      $[32] = vimK;
      $[33] = vimL;
      $[34] = vimSteps;
    } else vimSteps = $[34];
    let allBindings;
    if ($[35] !== vimSteps || $[36] !== confirmation || $[37] !== modeRow) {
      allBindings = {
        confirmation,
        modeRow,
        vimSteps,
      };
      $[35] = vimSteps;
      $[36] = confirmation;
      $[37] = modeRow;
      $[38] = allBindings;
    } else allBindings = $[38];
    let allBindings_2 = allBindings;
    let confirmationContext;
    if ($[39] === MEMO_CACHE_SENTINEL) {
      confirmationContext = {
        context: "Confirmation",
      };
      $[39] = confirmationContext;
    } else confirmationContext = $[39];
    MessageActionsKeybindings(allBindings_2.confirmation, confirmationContext);
    let modeContext;
    if ($[40] === MEMO_CACHE_SENTINEL) {
      modeContext = {
        context: "ProactivityMenu",
      };
      $[40] = modeContext;
    } else modeContext = $[40];
    MessageActionsKeybindings(allBindings_2.modeRow, modeContext);
    let preDispatch;
    if ($[41] !== allBindings_2.vimSteps || $[42] !== onTypeThrough || $[43] !== vimCommandMode) {
      preDispatch = (input, key, event) => {
        let printableKeyInput = getPrintableKeyInput(input, key, event);
        if (printableKeyInput === null) {
          return false;
        }
        if (vimCommandMode) {
          let step = allBindings_2.vimSteps.get(printableKeyInput);
          step?.();
          return step !== undefined;
        }
        onTypeThrough(printableKeyInput);
        return true;
      };
      $[41] = allBindings_2.vimSteps;
      $[42] = onTypeThrough;
      $[43] = vimCommandMode;
      $[44] = preDispatch;
    } else preDispatch = $[44];
    usePreDispatchKeyHandler(preDispatch);
    return null;
  });
  IGNORED_KEY_NAMES = [
    "ctrl",
    "meta",
    "super",
    "return",
    "escape",
    "tab",
    "backspace",
    "delete",
    "upArrow",
    "downArrow",
    "leftArrow",
    "rightArrow",
    "pageUp",
    "pageDown",
    "home",
    "end",
  ];
  ALLOWED_CONTROL_CHARS = new Set([
    `
`,
    "\r",
    "\t",
  ]);
});
//@ chunk-czq1j3j2.js:702529-702752 placement
function getPrintableKeyInput(input, key, pastedText) {
  if (IGNORED_KEY_NAMES.some((keyName) => key[keyName])) return null;
  let text = input !== "" ? input : pastedText;
  if (text === "" || (text.length === 1 && ALLOWED_CONTROL_CHARS.has(text))) return null;
  for (let char of text) {
    let codePoint = char.codePointAt(0) ?? 0;
    if ((codePoint < 32 || codePoint === 127) && !ALLOWED_CONTROL_CHARS.has(char)) return null;
  }
  return text;
}
//@ chunk-czq1j3j2.js:702756-702898 placement
/**
 * 跟踪主动性等级是否被单步调整过，并给出一个随等级变化重置的折叠计时状态。
 */
function useProactivityStepState() {
  let level = useAppState((state) => state.proactivityLevel);
  let [steppedLevel, setSteppedLevel] = useState(level);
  let isStepped = steppedLevel === null;
  if (!isStepped && level !== steppedLevel) setSteppedLevel(null);
  let collapsed = useTimeout(null, level);
  return {
    stepped: isStepped,
    collapsed,
  };
}
export { useProactivityStepState, isViewingTeammate };
