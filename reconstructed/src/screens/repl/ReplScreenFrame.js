/**
 * screens/repl/ReplScreenFrame.tsx
 *
 * 2.1.316 新增。REPL 屏幕框架。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppState } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useDialogOfKind } from "../../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import { useEditorMode } from "../../utils/subagentStatusLine.js";
import { useVimMode } from "./storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useBackgroundTaskNavigation } from "../../hooks/useBackgroundTaskNavigation.js";
import { useVoiceIntegration, useVoiceKeybindingHandler } from "../../hooks/useVoiceIntegration.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { transcriptMessagesStore } from "./ReplEffects.js";
import { zt, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { isHumanTurnNotInterrupt } from "../../utils/messages.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useBackgroundWorkItems, backgroundWorkSignal } from "../../hooks/useBackgroundWorkItems.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { useSessionPresence } from "./sessionPresence.js";
import { forkAttachControllerSlot } from "../../components/messages/UserLocalCommandOutputMessage.js";
import { LOCAL_JSX_REGISTRY_CONTEXT } from "../../components/dialogs/registry.js";
import { Box } from "../../ink/components/Text.js";
import { isMouseTrackingEnabled } from "../../utils/fullscreen.js";
import { AlternateScreen } from "../../ink/components/AlternateScreen.js";

//@ chunk-18hwfzwa.js:1438659-1438702 placement
function selectInputOwnsEscape2(Un) {
  return Un.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1438702-1438748 placement = _temp2 (1)
function selectViewingAgentTaskId_5(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:1438748-1438795 placement
function hasToolProgress(or) {
  return or.toolProgress.size > 0;
}
//@ chunk-18hwfzwa.js:1438795-1442441 placement
/**
 * ReplScreenFrame：REPL 屏幕框架（全屏/经典布局、消息区与输入区的排布）。
 */
function ReplScreenFrame(props) {
  let $ = w(67);
  let {
    fullscreen,
    embedded,
    screen,
    turn,
    transcript,
    titles,
    localJsx,
    dialogSurface,
    attachRequests,
    draft,
    scrollPin,
    children,
  } = props;
  let appStoreDirect = useAppStoreDirect();
  let { rows } = useTerminalSize();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let editorMode = useEditorMode();
  let vimMode = useVimMode();
  let Dt = editorMode && vimMode !== "INSERT";
  let inputOwnsEscape = useStoreSelector(draft, selectInputOwnsEscape2);
  const isTranscriptScreen = screen === "transcript";
  let io;
  if ($[0] !== dialogOfKind || $[1] !== inputOwnsEscape || $[2] !== isTranscriptScreen) {
    io = {
      inputOwnsEscape,
      isTranscriptScreen,
      isPanelOpen: dialogOfKind,
    };
    $[0] = dialogOfKind;
    $[1] = inputOwnsEscape;
    $[2] = isTranscriptScreen;
    $[3] = io;
  } else io = $[3];
  let { handleKeyDown, handleKeyDownCapture } = useBackgroundTaskNavigation(io);
  let ao;
  if ($[4] !== draft) {
    ao = {
      composer: draft,
    };
    $[4] = draft;
    $[5] = ao;
  } else ao = $[5];
  let voiceIntegration = useVoiceIntegration(ao);
  const isActive = !dialogOfKind;
  const composerTakesTypedKeys = screen !== "transcript" && !Dt;
  let props_2;
  if (
    $[6] !== draft ||
    $[7] !== isActive ||
    $[8] !== composerTakesTypedKeys ||
    $[9] !== voiceIntegration.cancelRecording ||
    $[10] !== voiceIntegration.handleKeyEvent ||
    $[11] !== voiceIntegration.resetAnchor ||
    $[12] !== voiceIntegration.stripTrailing
  ) {
    props_2 = {
      voiceHandleKeyEvent: voiceIntegration.handleKeyEvent,
      voiceCancelRecording: voiceIntegration.cancelRecording,
      stripTrailing: voiceIntegration.stripTrailing,
      resetAnchor: voiceIntegration.resetAnchor,
      isActive,
      composerTakesTypedKeys,
      composer: draft,
    };
    $[6] = draft;
    $[7] = isActive;
    $[8] = composerTakesTypedKeys;
    $[9] = voiceIntegration.cancelRecording;
    $[10] = voiceIntegration.handleKeyEvent;
    $[11] = voiceIntegration.resetAnchor;
    $[12] = voiceIntegration.stripTrailing;
    $[13] = props_2;
  } else props_2 = $[13];
  let { handleKeyDown: handleKeyDown_2 } = useVoiceKeybindingHandler(props_2);
  let Ho;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    Ho = mainAgentId();
    $[14] = Ho;
  } else Ho = $[14];
  let { messages } = transcriptMessagesStore(Ho);
  let Wo;
  let mn;
  if ($[15] !== messages.length || $[16] !== scrollPin) {
    Wo = () => {
      scrollPin.setRenderedLength(messages.length);
    };
    mn = [scrollPin, messages.length];
    $[15] = messages.length;
    $[16] = scrollPin;
    $[17] = Wo;
    $[18] = mn;
  } else {
    Wo = $[17];
    mn = $[18];
  }
  zt(Wo, mn);
  let Cn;
  if ($[19] !== messages) {
    let last = messages.at(-1);
    Cn = last != null && isHumanTurnNotInterrupt(last) ? last : undefined;
    $[19] = messages;
    $[20] = Cn;
  } else Cn = $[20];
  let vo = Cn;
  let Yo;
  let kn;
  if ($[21] !== vo || $[22] !== scrollPin) {
    Yo = () => {
      if (vo) scrollPin.onUserRowLanded(vo);
    };
    kn = [vo, scrollPin];
    $[21] = vo;
    $[22] = scrollPin;
    $[23] = Yo;
    $[24] = kn;
  } else {
    Yo = $[23];
    kn = $[24];
  }
  P(Yo, kn);
  let appState = useAppState(selectViewingAgentTaskId_5);
  let bn;
  if ($[25] !== scrollPin) {
    bn = () => {
      scrollPin.repin(true, "agent-view-change");
    };
    $[25] = scrollPin;
    $[26] = bn;
  } else bn = $[26];
  let Go;
  if ($[27] !== appState) {
    Go = [appState];
    $[27] = appState;
    $[28] = Go;
  } else Go = $[28];
  P(bn, Go);
  let storeSelector = useStoreSelector(turn.stream, hasToolProgress);
  let Mn;
  let Xo;
  if ($[29] !== dialogOfKind || $[30] !== storeSelector || $[31] !== scrollPin) {
    Mn = () => {
      scrollPin.onBelowTranscriptSlotChange(storeSelector || dialogOfKind);
    };
    Xo = [scrollPin, storeSelector, dialogOfKind];
    $[29] = dialogOfKind;
    $[30] = storeSelector;
    $[31] = scrollPin;
    $[32] = Mn;
    $[33] = Xo;
  } else {
    Mn = $[32];
    Xo = $[33];
  }
  zt(Mn, Xo);
  let onKeyDownCapture;
  if ($[34] !== handleKeyDownCapture || $[35] !== handleKeyDown_2) {
    onKeyDownCapture = (event) => {
      handleKeyDown_2(event);
      if (!event.defaultPrevented) handleKeyDownCapture(event);
    };
    $[34] = handleKeyDownCapture;
    $[35] = handleKeyDown_2;
    $[36] = onKeyDownCapture;
  } else onKeyDownCapture = $[36];
  let on;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    on = jsxProd_default(useBackgroundWorkItems, {});
    $[37] = on;
  } else on = $[37];
  let isSessionWorking;
  if ($[38] !== appStoreDirect || $[39] !== turn.guard.isActive || $[40] !== turn.isExternalLoading) {
    isSessionWorking = () =>
      turn.guard.isActive || turn.isExternalLoading || hasActiveAgentTasks(appStoreDirect.getState().tasks);
    $[38] = appStoreDirect;
    $[39] = turn.guard.isActive;
    $[40] = turn.isExternalLoading;
    $[41] = isSessionWorking;
  } else isSessionWorking = $[41];
  let cn;
  if ($[42] !== isSessionWorking || $[43] !== titles || $[44] !== transcript || $[45] !== turn) {
    cn = jsxProd_default(useSessionPresence, {
      turn,
      guard: turn.guard,
      titles,
      transcript,
      isSessionWorking,
    });
    $[42] = isSessionWorking;
    $[43] = titles;
    $[44] = transcript;
    $[45] = turn;
    $[46] = cn;
  } else cn = $[46];
  let children_2;
  if ($[47] !== attachRequests || $[48] !== children) {
    children_2 = jsxProd_default(forkAttachControllerSlot, {
      value: attachRequests,
      children,
    });
    $[47] = attachRequests;
    $[48] = children;
    $[49] = children_2;
  } else children_2 = $[49];
  let children_3;
  if ($[50] !== localJsx || $[51] !== children_2) {
    children_3 = jsxProd_default(LOCAL_JSX_REGISTRY_CONTEXT, {
      value: localJsx,
      children: children_2,
    });
    $[50] = localJsx;
    $[51] = children_2;
    $[52] = children_3;
  } else children_3 = $[52];
  let mr;
  if ($[53] !== dialogSurface || $[54] !== children_3) {
    mr = jsxProd_default(backgroundWorkSignal, {
      value: dialogSurface,
      children: children_3,
    });
    $[53] = dialogSurface;
    $[54] = children_3;
    $[55] = mr;
  } else mr = $[55];
  let Kn;
  if ($[56] !== handleKeyDown || $[57] !== onKeyDownCapture || $[58] !== cn || $[59] !== mr) {
    Kn = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      width: "100%",
      onKeyDownCapture,
      onKeyDown: handleKeyDown,
      children: [on, cn, mr],
    });
    $[56] = handleKeyDown;
    $[57] = onKeyDownCapture;
    $[58] = cn;
    $[59] = mr;
    $[60] = Kn;
  } else Kn = $[60];
  let Wn = Kn;
  if (!fullscreen) {
    return Wn;
  }
  if (embedded) {
    let Fr;
    if ($[61] !== Wn || $[62] !== rows) {
      Fr = jsxProd_default(Box, {
        flexDirection: "column",
        height: rows,
        width: "100%",
        flexShrink: 0,
        children: Wn,
      });
      $[61] = Wn;
      $[62] = rows;
      $[63] = Fr;
    } else Fr = $[63];
    return Fr;
  }
  let mouseTracking;
  if ($[64] === MEMO_CACHE_SENTINEL) {
    mouseTracking = isMouseTrackingEnabled();
    $[64] = mouseTracking;
  } else mouseTracking = $[64];
  let Zn;
  if ($[65] !== Wn) {
    Zn = jsxProd_default(AlternateScreen, {
      mouseTracking,
      children: Wn,
    });
    $[65] = Wn;
    $[66] = Zn;
  } else Zn = $[66];
  return Zn;
}
//@ chunk-18hwfzwa.js:1442441-1442445 placement
init_react_production();
//@ chunk-18hwfzwa.js:1442445-1442484 placement
function selectIsBriefOnly2(Dt) {
  return Dt.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1442484-1442521 placement
function selectUltracode2(Lt) {
  return Lt.ultracode;
}
//@ chunk-18hwfzwa.js:1442521-1442557 placement
function selectFastMode_3(oo) {
  return oo.fastMode;
}
export { ReplScreenFrame, selectIsBriefOnly2, selectUltracode2, selectFastMode_3 };
