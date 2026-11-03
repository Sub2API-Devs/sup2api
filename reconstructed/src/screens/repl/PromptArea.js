/**
 * screens/repl/PromptArea.tsx
 *
 * 2.1.316 新增。REPL 输入区。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { PaneDockNamespace } from "../../components/pluginUi/PaneDock.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:473910-473953 placement
function selectAbortController3(co) {
  return co.abortController;
}
//@ chunk-18hwfzwa.js:473953-473994 placement
function selectBashesDialogPromptArea(bo) {
  return !!bo.bashesDialog;
}
//@ chunk-18hwfzwa.js:473994-474042 placement
function selectIsInputOverlayActive(Ao) {
  return Ao.isInputOverlayActive;
}
//@ chunk-18hwfzwa.js:474042-474082 placement
function selectIsVimEditing(Bo) {
  return Bo.isVimEditing;
}
//@ chunk-18hwfzwa.js:474082-474114 placement
function selectMode(Ro) {
  return Ro.mode;
}
//@ chunk-18hwfzwa.js:474114-474152 placement
function selectDraftEmpty(Ho) {
  return Ho.value === "";
}
//@ chunk-18hwfzwa.js:474152-474205 placement
function selectHasDetachHandler(Io) {
  return Io.onDetachToCaller !== undefined;
}
//@ chunk-18hwfzwa.js:474205-474258 placement
function selectCloudMessageHeld(Wo) {
  return Wo.cloudMessageHeld !== undefined;
}
//@ chunk-18hwfzwa.js:474258-474270 placement
var PROMPT_ACCESSORY_COMPONENT = null;
//@ chunk-18hwfzwa.js:474270-475900 placement
function PromptArea(props) {
  let $ = w(29);
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
  let Lt;
  if ($[0] !== draft) {
    Lt =
      PROMPT_ACCESSORY_COMPONENT &&
      jsxProd_default(PROMPT_ACCESSORY_COMPONENT, {
        draft,
      });
    $[0] = draft;
    $[1] = Lt;
  } else Lt = $[1];
  let oo;
  if ($[2] !== submitController.submit) {
    oo = jsxProd_default(CommandKeybindingHandlers, {
      onSubmit: submitController.submit,
    });
    $[2] = submitController.submit;
    $[3] = oo;
  } else oo = $[3];
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
  let po;
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
    po = jsxProd_default(CancelRequestHandler, {
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
    $[24] = po;
  } else po = $[24];
  let ao;
  if ($[25] !== Lt || $[26] !== oo || $[27] !== po) {
    ao = jsxProd_default_2(Fragment, {
      children: [Lt, oo, po],
    });
    $[25] = Lt;
    $[26] = oo;
    $[27] = po;
    $[28] = ao;
  } else ao = $[28];
  return ao;
}
//@ chunk-18hwfzwa.js:514080-514117 placement
function selectIsLoading(We) {
  return We.isLoading;
}
//@ chunk-18hwfzwa.js:514117-514160 placement
function selectInputOwnsEscape(ze) {
  return ze.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:514160-514445 placement
function PromptDock(props) {
  let $ = w(5);
  let { turn, draft, isOffered, width } = props;
  let working = useStoreSelector(turn, selectIsLoading);
  let promptOwnsEscape = useStoreSelector(draft, selectInputOwnsEscape);
  let He;
  if ($[0] !== working || $[1] !== isOffered || $[2] !== promptOwnsEscape || $[3] !== width) {
    He = jsxProd_default(PaneDockNamespace.PaneDock, {
      isOffered,
      width,
      working,
      promptOwnsEscape,
    });
    $[0] = working;
    $[1] = isOffered;
    $[2] = promptOwnsEscape;
    $[3] = width;
    $[4] = He;
  } else He = $[4];
  return He;
}
//@ chunk-18hwfzwa.js:514445-514449 placement
init_react_production();
export { PromptArea, PromptDock };
