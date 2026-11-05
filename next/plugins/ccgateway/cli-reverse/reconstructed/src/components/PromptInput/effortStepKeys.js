/**
 * components/PromptInput/effortStepKeys.ts
 *
 * 2.1.316 新增。调整 effort 的按键处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useSetAppState } from "../../state/AppState.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { useSelection } from "../../ink/components/Input.js";
import { useNotifications } from "../../context/notifications.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { getEffortLevelOrHigh, resolveEffortLevel, shouldShowEffortHint } from "../../utils/effort.js";
import { applyEffortCommand } from "../../commands/effort/effort.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { findAdjacentEffortLevel, isOnlyMaxAboveEffort } from "../../services/api/errors.js";
import { UP_ARROW } from "../../constants/figures.js";
import { EFFORT_LEVEL_KEY } from "../EffortIndicator.js";
import { shouldShowEffortNotice } from "./promptInputState.js";
import { isMainThreadSource } from "../../utils/querySource.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { ModelEffortSwitchConfirm } from "../ModelEffortSwitchConfirm.js";
import { useFooterAwareMessageActions } from "../CoordinatorAgentStatus.js";

//@ chunk-czq1j3j2.js:958825-958861 placement
var EFFORT_STEP_MAX_VIA_EFFORT = "effort-step-max-via-effort";
//@ chunk-czq1j3j2.js:958861-960897 placement
function useEffortStepKeys(transcript, deps) {
  let $ = useMemoCache(32);
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let model = useMainLoopModel_3();
  let selection = useSelection();
  let { addNotification, removeNotification } = useNotifications();
  let keybindingContext = useKeybindingContext();
  let [pendingEffort, setPendingEffort] = useState(null);
  let queuedMessageText = useQueuedMessageText();
  let effortLevel;
  if ($[0] !== queuedMessageText || $[1] !== model) {
    effortLevel = getEffortLevelOrHigh(model, queuedMessageText);
    $[0] = queuedMessageText;
    $[1] = model;
    $[2] = effortLevel;
  } else effortLevel = $[2];
  let currentEffort = effortLevel;
  let clearMaxNoticeEff;
  if ($[3] !== removeNotification) {
    clearMaxNoticeEff = () => {
      removeNotification(EFFORT_STEP_MAX_VIA_EFFORT);
    };
    $[3] = removeNotification;
    $[4] = clearMaxNoticeEff;
  } else clearMaxNoticeEff = $[4];
  let clearMaxNoticeDeps;
  if ($[5] !== model || $[6] !== removeNotification || $[7] !== currentEffort) {
    clearMaxNoticeDeps = [currentEffort, model, removeNotification];
    $[5] = model;
    $[6] = removeNotification;
    $[7] = currentEffort;
    $[8] = clearMaxNoticeDeps;
  } else clearMaxNoticeDeps = $[8];
  useEffect(clearMaxNoticeEff, clearMaxNoticeDeps);
  let stepperActions;
  let confirmDialog = null;
  let applyEffortStep;
  if ($[9] !== setAppState || $[10] !== appStoreDirect) {
    applyEffortStep = (level) => {
      let state = appStoreDirect.getState();
      applyEffortCommand(
        level,
        {
          effort: resolveEffortLevel(state),
          ultracode: state.ultracode,
          route: "step_keys",
        },
        setAppState,
        false,
      );
      logFeatureOk("effort_step_keybinding");
    };
    $[9] = setAppState;
    $[10] = appStoreDirect;
    $[11] = applyEffortStep;
  } else applyEffortStep = $[11];
  let stepEffort;
  if (
    $[12] !== addNotification ||
    $[13] !== applyEffortStep ||
    $[14] !== keybindingContext ||
    $[15] !== model ||
    $[16] !== removeNotification ||
    $[17] !== selection ||
    $[18] !== appStoreDirect ||
    $[19] !== transcript
  ) {
    stepEffort = (direction) => {
      if (selection.hasSelection() || !shouldShowEffortHint(model)) {
        return false;
      }
      let state = appStoreDirect.getState();
      let effortLevel = resolveEffortLevel(state);
      let level = getEffortLevelOrHigh(model, effortLevel);
      let adjacentEffortLevel = findAdjacentEffortLevel(model, level, direction);
      if (adjacentEffortLevel === undefined) {
        if (direction === 1 && isOnlyMaxAboveEffort(model, level)) {
          let increaseHint =
            keybindingContext?.getDisplayText("chat:increaseEffort", "Chat") ?? `shift+${UP_ARROW}`;
          removeNotification(EFFORT_LEVEL_KEY);
          addNotification({
            key: EFFORT_STEP_MAX_VIA_EFFORT,
            kind: "feedback",
            text: `${increaseHint} stops below max \xB7 /effort max to set it`,
            priority: "immediate",
          });
        }
        return;
      }
      if (
        shouldShowEffortNotice({
          target: adjacentEffortLevel,
          current: effortLevel,
          model,
          permissionMode: state.toolPermissionContext.mode,
          messages: transcript.getSnapshot(),
          ackedAtOutputTokens: state.cacheMissAckedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(transcript.getSnapshot()),
        })
      ) {
        removeNotification(EFFORT_STEP_MAX_VIA_EFFORT);
        setPendingEffort(adjacentEffortLevel);
        return;
      }
      applyEffortStep(adjacentEffortLevel);
    };
    $[12] = addNotification;
    $[13] = applyEffortStep;
    $[14] = keybindingContext;
    $[15] = model;
    $[16] = removeNotification;
    $[17] = selection;
    $[18] = appStoreDirect;
    $[19] = transcript;
    $[20] = stepEffort;
  } else stepEffort = $[20];
  let stepEffortMemo = stepEffort;
  let needsConfirm;
  if ($[21] !== stepEffortMemo || $[22] !== pendingEffort) {
    needsConfirm =
      ((stepperActions = {
        "chat:increaseEffort": () => stepEffortMemo(1),
        "chat:decreaseEffort": () => stepEffortMemo(-1),
      }),
      pendingEffort !== null);
    $[21] = stepEffortMemo;
    $[22] = pendingEffort;
    $[23] = needsConfirm;
    $[24] = stepperActions;
  } else {
    needsConfirm = $[23];
    stepperActions = $[24];
  }
  if (needsConfirm) {
    let onConfirm;
    if ($[25] !== applyEffortStep || $[26] !== pendingEffort) {
      onConfirm = () => {
        setPendingEffort(null);
        applyEffortStep(pendingEffort);
      };
      $[25] = applyEffortStep;
      $[26] = pendingEffort;
      $[27] = onConfirm;
    } else onConfirm = $[27];
    let onCancel;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setPendingEffort(null);
      $[28] = onCancel;
    } else onCancel = $[28];
    let effortConfirmDialog;
    if ($[29] !== onConfirm || $[30] !== pendingEffort) {
      effortConfirmDialog = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(ModelEffortSwitchConfirm, {
          kind: "effort",
          model: null,
          effort: pendingEffort,
          overDraft: true,
          onConfirm,
          onCancel,
        }),
      });
      $[29] = onConfirm;
      $[30] = pendingEffort;
      $[31] = effortConfirmDialog;
    } else effortConfirmDialog = $[31];
    confirmDialog = effortConfirmDialog;
  }
  useFooterAwareMessageActions(stepperActions, deps);
  return confirmDialog;
}
export { useEffortStepKeys };
