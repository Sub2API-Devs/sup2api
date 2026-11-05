/**
 * screens/repl/PromptArea.tsx
 *
 * 2.1.316 新增。REPL 输入区。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (14)
 * attribution: placement 14
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useAppState } from "../../state/AppState.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CommandKeybindingHandlers } from "../../hooks/useCommandKeybindings.js";
import { createAgentsKilledMessage } from "../../utils/messages.js";
import { CancelRequestHandler } from "../../hooks/useCancelRequest.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { PaneDockNamespace } from "../../components/pluginUi/PaneDock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:500380-500423 placement
function selectAbortController3(state) {
  return state.abortController;
}
//@ chunk-czq1j3j2.js:500423-500464 placement
function selectBashesDialogPromptArea(state) {
  return !!state.bashesDialog;
}
//@ chunk-czq1j3j2.js:500464-500512 placement
function selectIsInputOverlayActive(state) {
  return state.isInputOverlayActive;
}
//@ chunk-czq1j3j2.js:500512-500552 placement
function selectIsVimEditing(state) {
  return state.isVimEditing;
}
//@ chunk-czq1j3j2.js:500552-500584 placement
function selectMode(state) {
  return state.mode;
}
//@ chunk-czq1j3j2.js:500584-500622 placement
function selectDraftEmpty(draft) {
  return draft.value === "";
}
//@ chunk-czq1j3j2.js:500622-500675 placement
function selectHasDetachHandler(props) {
  return props.onDetachToCaller !== undefined;
}
//@ chunk-czq1j3j2.js:500675-500728 placement
function selectCloudMessageHeld(state) {
  return state.cloudMessageHeld !== undefined;
}
//@ chunk-czq1j3j2.js:500728-500740 placement
var PROMPT_ACCESSORY_COMPONENT = null;
//@ chunk-czq1j3j2.js:500740-502376 placement
function PromptArea(props) {
  let $ = useMemoCache(29);
  let {
    turn,
    transcript,
    draft,
    chrome,
    submitController,
    stoppableWork,
    screen,
    isExternalLoading,
    sendsPromptsElsewhere,
  } = props;
  let storeSelector = useStoreSelector(turn, selectAbortController3);
  let isBackgroundTasksDialogVisible = useStoreSelector(chrome, selectBashesDialogPromptArea);
  let isInputOverlayActive = useStoreSelector(draft, selectIsInputOverlayActive);
  let isVimEditing = useStoreSelector(draft, selectIsVimEditing);
  let inputMode = useStoreSelector(draft, selectMode);
  let isInputEmpty = useStoreSelector(draft, selectDraftEmpty);
  let exitDetachesToCaller = useStoreSelector(chrome, selectHasDetachHandler);
  let isCloudMessageHeld = useAppState(selectCloudMessageHeld);
  let accessory;
  if ($[0] !== draft) {
    accessory =
      PROMPT_ACCESSORY_COMPONENT &&
      jsxProd_default(PROMPT_ACCESSORY_COMPONENT, {
        draft,
      });
    $[0] = draft;
    $[1] = accessory;
  } else accessory = $[1];
  let keybindingHandlers;
  if ($[2] !== submitController.submit) {
    keybindingHandlers = jsxProd_default(CommandKeybindingHandlers, {
      onSubmit: submitController.submit,
    });
    $[2] = submitController.submit;
    $[3] = keybindingHandlers;
  } else keybindingHandlers = $[3];
  let getInFlightMessageId;
  if ($[4] !== turn.stream.inFlightMessageId) {
    getInFlightMessageId = () => turn.stream.inFlightMessageId;
    $[4] = turn.stream.inFlightMessageId;
    $[5] = getInFlightMessageId;
  } else getInFlightMessageId = $[5];
  let onAgentsKilled;
  if ($[6] !== transcript) {
    onAgentsKilled = () =>
      transcript.apply({
        type: "append",
        messages: [createAgentsKilledMessage()],
      });
    $[6] = transcript;
    $[7] = onAgentsKilled;
  } else onAgentsKilled = $[7];
  const abortSignal = storeSelector?.signal;
  let cancelHandler;
  if (
    $[8] !== isBackgroundTasksDialogVisible ||
    $[9] !== exitDetachesToCaller ||
    $[10] !== inputMode ||
    $[11] !== isCloudMessageHeld ||
    $[12] !== isExternalLoading ||
    $[13] !== isInputEmpty ||
    $[14] !== isInputOverlayActive ||
    $[15] !== isVimEditing ||
    $[16] !== screen ||
    $[17] !== sendsPromptsElsewhere ||
    $[18] !== stoppableWork ||
    $[19] !== submitController.popQueuedIntoDraft ||
    $[20] !== getInFlightMessageId ||
    $[21] !== onAgentsKilled ||
    $[22] !== abortSignal ||
    $[23] !== turn.cancel
  ) {
    cancelHandler = jsxProd_default(CancelRequestHandler, {
      onCancel: turn.cancel,
      getInFlightMessageId,
      onAgentsKilled,
      isBackgroundTasksDialogVisible,
      screen,
      abortSignal,
      isExternalLoading,
      isCloudMessageHeld,
      popCommandFromQueue: submitController.popQueuedIntoDraft,
      isInputOverlayActive,
      isVimEditing,
      inputMode,
      isInputEmpty,
      exitDetachesToCaller,
      sendsPromptsElsewhere,
      stoppableWork,
    });
    $[8] = isBackgroundTasksDialogVisible;
    $[9] = exitDetachesToCaller;
    $[10] = inputMode;
    $[11] = isCloudMessageHeld;
    $[12] = isExternalLoading;
    $[13] = isInputEmpty;
    $[14] = isInputOverlayActive;
    $[15] = isVimEditing;
    $[16] = screen;
    $[17] = sendsPromptsElsewhere;
    $[18] = stoppableWork;
    $[19] = submitController.popQueuedIntoDraft;
    $[20] = getInFlightMessageId;
    $[21] = onAgentsKilled;
    $[22] = abortSignal;
    $[23] = turn.cancel;
    $[24] = cancelHandler;
  } else cancelHandler = $[24];
  let composerSlot;
  if ($[25] !== accessory || $[26] !== keybindingHandlers || $[27] !== cancelHandler) {
    composerSlot = jsxProd_default_2(Fragment, {
      children: [accessory, keybindingHandlers, null, cancelHandler],
    });
    $[25] = accessory;
    $[26] = keybindingHandlers;
    $[27] = cancelHandler;
    $[28] = composerSlot;
  } else composerSlot = $[28];
  return composerSlot;
}
//@ chunk-czq1j3j2.js:536614-536618 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:536614", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:540558-540595 placement
function selectIsLoading(turn) {
  return turn.isLoading;
}
//@ chunk-czq1j3j2.js:540595-540638 placement
function selectInputOwnsEscape(draft) {
  return draft.inputOwnsEscape;
}
//@ chunk-czq1j3j2.js:540638-540923 placement
function PromptDock(props) {
  let $ = useMemoCache(5);
  let { turn, draft, isOffered, width } = props;
  let working = useStoreSelector(turn, selectIsLoading);
  let promptOwnsEscape = useStoreSelector(draft, selectInputOwnsEscape);
  let dock;
  if ($[0] !== working || $[1] !== isOffered || $[2] !== promptOwnsEscape || $[3] !== width) {
    dock = jsxProd_default(PaneDockNamespace.PaneDock, {
      isOffered,
      width,
      working,
      promptOwnsEscape,
    });
    $[0] = working;
    $[1] = isOffered;
    $[2] = promptOwnsEscape;
    $[3] = width;
    $[4] = dock;
  } else dock = $[4];
  return dock;
}
export { PromptArea, PromptDock };
