/**
 * screens/repl/ReplScreenFrame.tsx
 *
 * 2.1.316 新增。REPL 屏幕框架。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useLayoutEffect,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1472239-1472243 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1472239", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1478886-1478929 placement
function selectInputOwnsEscape2(draft) {
  return draft.inputOwnsEscape;
}
//@ chunk-czq1j3j2.js:1478929-1478975 placement (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId_5(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-czq1j3j2.js:1478975-1479022 placement
function hasToolProgress(stream) {
  return stream.toolProgress.size > 0;
}
//@ chunk-czq1j3j2.js:1479022-1482670 placement
/**
 * ReplScreenFrame：REPL 屏幕框架（全屏/经典布局、消息区与输入区的排布）。
 */
function ReplScreenFrame(props) {
  let $ = useMemoCache(67);
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
  let isInVimNormalMode = editorMode && vimMode !== "INSERT";
  let inputOwnsEscape = useStoreSelector(draft, selectInputOwnsEscape2);
  const isTranscriptScreen = screen === "transcript";
  let composerOptions;
  if ($[0] !== dialogOfKind || $[1] !== inputOwnsEscape || $[2] !== isTranscriptScreen) {
    composerOptions = {
      inputOwnsEscape,
      isTranscriptScreen,
      isPanelOpen: dialogOfKind,
    };
    $[0] = dialogOfKind;
    $[1] = inputOwnsEscape;
    $[2] = isTranscriptScreen;
    $[3] = composerOptions;
  } else composerOptions = $[3];
  let { handleKeyDown, handleKeyDownCapture } = useBackgroundTaskNavigation(composerOptions);
  let composerConfig;
  if ($[4] !== draft) {
    composerConfig = {
      composer: draft,
    };
    $[4] = draft;
    $[5] = composerConfig;
  } else composerConfig = $[5];
  let voiceIntegration = useVoiceIntegration(composerConfig);
  const isActive = !dialogOfKind;
  const composerTakesTypedKeys = screen !== "transcript" && !isInVimNormalMode;
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
  let agentId;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    agentId = mainAgentId();
    $[14] = agentId;
  } else agentId = $[14];
  let { messages } = transcriptMessagesStore(agentId);
  let pinEffect;
  let pinDeps;
  if ($[15] !== messages.length || $[16] !== scrollPin) {
    pinEffect = () => {
      scrollPin.setRenderedLength(messages.length);
    };
    pinDeps = [scrollPin, messages.length];
    $[15] = messages.length;
    $[16] = scrollPin;
    $[17] = pinEffect;
    $[18] = pinDeps;
  } else {
    pinEffect = $[17];
    pinDeps = $[18];
  }
  useLayoutEffect(pinEffect, pinDeps);
  let lastHumanMessage;
  if ($[19] !== messages) {
    let message = messages.at(-1);
    lastHumanMessage = message != null && isHumanTurnNotInterrupt(message) ? message : undefined;
    $[19] = messages;
    $[20] = lastHumanMessage;
  } else lastHumanMessage = $[20];
  let anchorMessage = lastHumanMessage;
  let anchorEffect;
  let anchorDeps;
  if ($[21] !== anchorMessage || $[22] !== scrollPin) {
    anchorEffect = () => {
      if (anchorMessage) scrollPin.onUserRowLanded(anchorMessage);
    };
    anchorDeps = [anchorMessage, scrollPin];
    $[21] = anchorMessage;
    $[22] = scrollPin;
    $[23] = anchorEffect;
    $[24] = anchorDeps;
  } else {
    anchorEffect = $[23];
    anchorDeps = $[24];
  }
  useEffect(anchorEffect, anchorDeps);
  let appState = useAppState(selectViewingAgentTaskId_5);
  let someEffect;
  if ($[25] !== scrollPin) {
    someEffect = () => {
      scrollPin.repin(true, "agent-view-change");
    };
    $[25] = scrollPin;
    $[26] = someEffect;
  } else someEffect = $[26];
  let appStateDeps;
  if ($[27] !== appState) {
    appStateDeps = [appState];
    $[27] = appState;
    $[28] = appStateDeps;
  } else appStateDeps = $[28];
  useEffect(someEffect, appStateDeps);
  let storeSelector = useStoreSelector(turn.stream, hasToolProgress);
  let dialogEffect;
  let dialogDeps;
  if ($[29] !== dialogOfKind || $[30] !== storeSelector || $[31] !== scrollPin) {
    dialogEffect = () => {
      scrollPin.onBelowTranscriptSlotChange(storeSelector || dialogOfKind);
    };
    dialogDeps = [scrollPin, storeSelector, dialogOfKind];
    $[29] = dialogOfKind;
    $[30] = storeSelector;
    $[31] = scrollPin;
    $[32] = dialogEffect;
    $[33] = dialogDeps;
  } else {
    dialogEffect = $[32];
    dialogDeps = $[33];
  }
  useLayoutEffect(dialogEffect, dialogDeps);
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
  let backgroundItems;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    backgroundItems = jsxProd_default(useBackgroundWorkItems, {});
    $[37] = backgroundItems;
  } else backgroundItems = $[37];
  let isSessionWorking;
  if ($[38] !== appStoreDirect || $[39] !== turn.guard.isActive || $[40] !== turn.isExternalLoading) {
    isSessionWorking = () =>
      turn.guard.isActive || turn.isExternalLoading || hasActiveAgentTasks(appStoreDirect.getState().tasks);
    $[38] = appStoreDirect;
    $[39] = turn.guard.isActive;
    $[40] = turn.isExternalLoading;
    $[41] = isSessionWorking;
  } else isSessionWorking = $[41];
  let presenceElement;
  if ($[42] !== isSessionWorking || $[43] !== titles || $[44] !== transcript || $[45] !== turn) {
    presenceElement = jsxProd_default(useSessionPresence, {
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
    $[46] = presenceElement;
  } else presenceElement = $[46];
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
  let workSignal;
  if ($[53] !== dialogSurface || $[54] !== children_3) {
    workSignal = jsxProd_default(backgroundWorkSignal, {
      value: dialogSurface,
      children: children_3,
    });
    $[53] = dialogSurface;
    $[54] = children_3;
    $[55] = workSignal;
  } else workSignal = $[55];
  let bodyBox;
  if (
    $[56] !== handleKeyDown ||
    $[57] !== onKeyDownCapture ||
    $[58] !== presenceElement ||
    $[59] !== workSignal
  ) {
    bodyBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      width: "100%",
      onKeyDownCapture,
      onKeyDown: handleKeyDown,
      children: [backgroundItems, presenceElement, workSignal],
    });
    $[56] = handleKeyDown;
    $[57] = onKeyDownCapture;
    $[58] = presenceElement;
    $[59] = workSignal;
    $[60] = bodyBox;
  } else bodyBox = $[60];
  let body = bodyBox;
  if (!fullscreen) {
    return body;
  }
  if (embedded) {
    let frameBox;
    if ($[61] !== body || $[62] !== rows) {
      frameBox = jsxProd_default(Box, {
        flexDirection: "column",
        height: rows,
        width: "100%",
        flexShrink: 0,
        children: body,
      });
      $[61] = body;
      $[62] = rows;
      $[63] = frameBox;
    } else frameBox = $[63];
    return frameBox;
  }
  let mouseTracking;
  if ($[64] === MEMO_CACHE_SENTINEL) {
    mouseTracking = isMouseTrackingEnabled();
    $[64] = mouseTracking;
  } else mouseTracking = $[64];
  let frame;
  if ($[65] !== body) {
    frame = jsxProd_default(AlternateScreen, {
      mouseTracking,
      children: body,
    });
    $[65] = body;
    $[66] = frame;
  } else frame = $[66];
  return frame;
}
//@ chunk-czq1j3j2.js:1482674-1482713 placement
function selectIsBriefOnly2(state) {
  return state.isBriefOnly;
}
//@ chunk-czq1j3j2.js:1482713-1482750 placement
function selectUltracode2(state) {
  return state.ultracode;
}
//@ chunk-czq1j3j2.js:1482750-1482786 placement
function selectFastMode_3(state) {
  return state.fastMode;
}
export { ReplScreenFrame, selectIsBriefOnly2, selectUltracode2, selectFastMode_3 };
