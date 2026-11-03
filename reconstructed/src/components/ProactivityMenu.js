/**
 * components/ProactivityMenu.tsx
 *
 * 2.1.316 新增。主动性（proactivity）设置菜单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 10
 */
import { init_react_production, Rh, P, y } from "../../vendor/react/cjs/react.production.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { getViewedTeammateTask_2 as getViewedTeammateTask_2_2 } from "../state/selectors.js";
import { nextPermissionMode } from "../utils/permissions/proactivityCycle.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:678371-678375 placement
init_react_production();
//@ chunk-18hwfzwa.js:678375-678379 placement
init_react_production();
//@ chunk-18hwfzwa.js:678379-678423 placement
function isViewingTeammate(state) {
  return isAgentSwarmsEnabled() && getViewedTeammateTask_2_2(state) !== undefined;
}
//@ chunk-18hwfzwa.js:678969-679013 placement
function selectProactivityLevel2(Go) {
  return Go.proactivityLevel;
}
//@ chunk-18hwfzwa.js:679013-679076 placement
function nextProactivityStepState(h, toolPermissionContext) {
  return {
    level: h,
    entryMode: nextPermissionMode(h, toolPermissionContext),
    mode: null,
  };
}
//@ chunk-18hwfzwa.js:679076-681799 placement
var ProactivityMenu = Rh(function (props) {
  let ze = w(45);
  let { toolPermissionContext, vimCommandMode, onChange, onConfirm, onTypeThrough, onCancel } = props;
  useRegisterOverlay("proactivity-dialog");
  useAppState(selectProactivityLevel2);
  let appState = useAppState(isViewingTeammate);
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let Xe;
  let rt;
  if (ze[0] !== appState || ze[1] !== onCancel || ze[2] !== dialogOfKind) {
    Xe = () => {
      if (appState || dialogOfKind) onCancel();
      return onProactivitySelectorGateChanged((kt) => {
        if (!kt) onCancel();
      });
    };
    rt = [appState, dialogOfKind, onCancel];
    ze[0] = appState;
    ze[1] = onCancel;
    ze[2] = dialogOfKind;
    ze[3] = Xe;
    ze[4] = rt;
  } else {
    Xe = ze[3];
    rt = ze[4];
  }
  P(Xe, rt);
  useShortcutDisplay("confirm:previous", "Confirmation", "up");
  useShortcutDisplay("confirm:next", "Confirmation", "down");
  useShortcutDisplay("proactivityMenu:previousMode", "ProactivityMenu", "left");
  useShortcutDisplay("proactivityMenu:nextMode", "ProactivityMenu", "right");
  let At;
  if (ze[5] !== onChange || ze[6] !== toolPermissionContext) {
    At = function Et(It) {
      onChange((Ot) =>
        nextProactivityStepState(
          It === "next" ? nextProactivityMode(Ot.level) : previousProactivityMode(Ot.level),
          toolPermissionContext,
        ),
      );
    };
    ze[5] = onChange;
    ze[6] = toolPermissionContext;
    ze[7] = At;
  } else At = ze[7];
  let Et = At;
  let Dt;
  if (ze[8] !== onChange || ze[9] !== toolPermissionContext) {
    Dt = function Xt(Lt) {
      onChange((oo) => ({
        ...oo,
        mode: getNextPermissionMode(
          {
            ...toolPermissionContext,
            mode: oo.mode ?? oo.entryMode,
          },
          Lt,
        ),
      }));
    };
    ze[8] = onChange;
    ze[9] = toolPermissionContext;
    ze[10] = Dt;
  } else Dt = ze[10];
  let Xt = Dt;
  let io;
  let so;
  let po;
  if (ze[11] !== Et) {
    io = () => Et("previous");
    so = () => Et("next");
    po = () => Et("next");
    ze[11] = Et;
    ze[12] = io;
    ze[13] = so;
    ze[14] = po;
  } else {
    io = ze[12];
    so = ze[13];
    po = ze[14];
  }
  let confirmation;
  if (ze[15] !== onConfirm || ze[16] !== io || ze[17] !== so || ze[18] !== po) {
    confirmation = {
      "confirm:yes": onConfirm,
      "confirm:previous": io,
      "confirm:next": so,
      "confirm:cycleMode": po,
    };
    ze[15] = onConfirm;
    ze[16] = io;
    ze[17] = so;
    ze[18] = po;
    ze[19] = confirmation;
  } else confirmation = ze[19];
  let modeRow;
  if (ze[20] !== Xt) {
    modeRow = {
      "proactivityMenu:previousMode": () => Xt("previous"),
      "proactivityMenu:nextMode": () => Xt("next"),
    };
    ze[20] = Xt;
    ze[21] = modeRow;
  } else modeRow = ze[21];
  let bo;
  if (ze[22] !== Xt) {
    bo = ["h", () => Xt("previous")];
    ze[22] = Xt;
    ze[23] = bo;
  } else bo = ze[23];
  let Ao;
  if (ze[24] !== Et) {
    Ao = ["j", () => Et("next")];
    ze[24] = Et;
    ze[25] = Ao;
  } else Ao = ze[25];
  let Bo;
  if (ze[26] !== Et) {
    Bo = ["k", () => Et("previous")];
    ze[26] = Et;
    ze[27] = Bo;
  } else Bo = ze[27];
  let Ro;
  if (ze[28] !== Xt) {
    Ro = ["l", () => Xt("next")];
    ze[28] = Xt;
    ze[29] = Ro;
  } else Ro = ze[29];
  let vimSteps;
  if (ze[30] !== bo || ze[31] !== Ao || ze[32] !== Bo || ze[33] !== Ro) {
    vimSteps = new Map([bo, Ao, Bo, Ro]);
    ze[30] = bo;
    ze[31] = Ao;
    ze[32] = Bo;
    ze[33] = Ro;
    ze[34] = vimSteps;
  } else vimSteps = ze[34];
  let Io;
  if (ze[35] !== vimSteps || ze[36] !== confirmation || ze[37] !== modeRow) {
    Io = {
      confirmation,
      modeRow,
      vimSteps,
    };
    ze[35] = vimSteps;
    ze[36] = confirmation;
    ze[37] = modeRow;
    ze[38] = Io;
  } else Io = ze[38];
  let Wo = Io;
  let mn;
  if (ze[39] === MEMO_CACHE_SENTINEL) {
    mn = {
      context: "Confirmation",
    };
    ze[39] = mn;
  } else mn = ze[39];
  MessageActionsKeybindings(Wo.confirmation, mn);
  let Cn;
  if (ze[40] === MEMO_CACHE_SENTINEL) {
    Cn = {
      context: "ProactivityMenu",
    };
    ze[40] = Cn;
  } else Cn = ze[40];
  MessageActionsKeybindings(Wo.modeRow, Cn);
  let No;
  if (ze[41] !== Wo.vimSteps || ze[42] !== onTypeThrough || ze[43] !== vimCommandMode) {
    No = (vo, Yo, kn) => {
      let printableKeyInput = getPrintableKeyInput(vo, Yo, kn);
      if (printableKeyInput === null) {
        return false;
      }
      if (vimCommandMode) {
        let bn = Wo.vimSteps.get(printableKeyInput);
        bn?.();
        return bn !== undefined;
      }
      onTypeThrough(printableKeyInput);
      return true;
    };
    ze[41] = Wo.vimSteps;
    ze[42] = onTypeThrough;
    ze[43] = vimCommandMode;
    ze[44] = No;
  } else No = ze[44];
  usePreDispatchKeyHandler(No);
  return null;
});
var IGNORED_KEY_NAMES = [
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
var ALLOWED_CONTROL_CHARS = new Set([
  `
`,
  "\r",
  "\t",
]);
//@ chunk-18hwfzwa.js:681799-682022 placement
function getPrintableKeyInput(h, x, D) {
  if (IGNORED_KEY_NAMES.some((ee) => x[ee])) return null;
  let L = h !== "" ? h : D;
  if (L === "" || (L.length === 1 && ALLOWED_CONTROL_CHARS.has(L))) return null;
  for (let ee of L) {
    let ke = ee.codePointAt(0) ?? 0;
    if ((ke < 32 || ke === 127) && !ALLOWED_CONTROL_CHARS.has(ee)) return null;
  }
  return L;
}
//@ chunk-18hwfzwa.js:682022-682026 placement
init_react_production();
//@ chunk-18hwfzwa.js:682026-682168 placement
/**
 * 跟踪主动性等级是否被单步调整过，并给出一个随等级变化重置的折叠计时状态。
 */
function useProactivityStepState() {
  let h = useAppState((ke) => ke.proactivityLevel);
  let [x, D] = y(h);
  let L = x === null;
  if (!L && h !== x) D(null);
  let collapsed = useTimeout(null, h);
  return {
    stepped: L,
    collapsed,
  };
}
//@ chunk-18hwfzwa.js:682168-682172 placement
init_react_production();
export { useProactivityStepState, isViewingTeammate };
