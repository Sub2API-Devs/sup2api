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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CommandKeybindingHandlers } from "../../hooks/useCommandKeybindings.js";
import { createAgentsKilledMessage } from "../../utils/messages.js";
import { CancelRequestHandler } from "../../hooks/useCancelRequest.js";
import { PaneDockNamespace } from "../../components/pluginUi/PaneDock.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:473910-473953 placement
function selectAbortController3(co) {
  return co.abortController;
}
//@ chunk-18hwfzwa.js:473953-473994 placement
function Cqt(bo) {
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
function xqt(Ho) {
  return Ho.value === "";
}
//@ chunk-18hwfzwa.js:474152-474205 placement
function Pqt(Io) {
  return Io.onDetachToCaller !== void 0;
}
//@ chunk-18hwfzwa.js:474205-474258 placement
function Aqt(Wo) {
  return Wo.cloudMessageHeld !== void 0;
}
//@ chunk-18hwfzwa.js:474258-474270 placement
var tY = null;
//@ chunk-18hwfzwa.js:474270-475900 placement
function PromptArea(h) {
  let $ = w(29),
    {
      turn: turn,
      transcript: transcript,
      draft: draft,
      chrome: chrome,
      submitController: submitController,
      stoppableWork: stoppableWork,
      screen: screen,
      isExternalLoading: isExternalLoading,
      sendsPromptsElsewhere: sendsPromptsElsewhere,
    } = h,
    ze = useStoreSelector(turn, selectAbortController3),
    Xe = useStoreSelector(chrome, Cqt),
    rt = useStoreSelector(draft, selectIsInputOverlayActive),
    kt = useStoreSelector(draft, selectIsVimEditing),
    At = useStoreSelector(draft, selectMode),
    It = useStoreSelector(draft, xqt),
    Ot = useStoreSelector(chrome, Pqt),
    Et = useAppState(Aqt),
    Lt;
  if ($[0] !== draft) ((Lt = tY && e(tY, { draft: draft })), ($[0] = draft), ($[1] = Lt));
  else Lt = $[1];
  let oo;
  if ($[2] !== submitController.submit)
    ((oo = e(CommandKeybindingHandlers, { onSubmit: submitController.submit })),
      ($[2] = submitController.submit),
      ($[3] = oo));
  else oo = $[3];
  let Xt;
  if ($[4] !== turn.stream.inFlightMessageId)
    ((Xt = () => turn.stream.inFlightMessageId), ($[4] = turn.stream.inFlightMessageId), ($[5] = Xt));
  else Xt = $[5];
  let io;
  if ($[6] !== transcript)
    ((io = () => transcript.apply({ type: "append", messages: [createAgentsKilledMessage()] })),
      ($[6] = transcript),
      ($[7] = io));
  else io = $[7];
  const so = ze?.signal;
  let po;
  if (
    $[8] !== Xe ||
    $[9] !== Ot ||
    $[10] !== At ||
    $[11] !== Et ||
    $[12] !== isExternalLoading ||
    $[13] !== It ||
    $[14] !== rt ||
    $[15] !== kt ||
    $[16] !== screen ||
    $[17] !== sendsPromptsElsewhere ||
    $[18] !== stoppableWork ||
    $[19] !== submitController.popQueuedIntoDraft ||
    $[20] !== Xt ||
    $[21] !== io ||
    $[22] !== so ||
    $[23] !== turn.cancel
  )
    ((po = e(CancelRequestHandler, {
      onCancel: turn.cancel,
      getInFlightMessageId: Xt,
      onAgentsKilled: io,
      isBackgroundTasksDialogVisible: Xe,
      screen: screen,
      abortSignal: so,
      isExternalLoading: isExternalLoading,
      isCloudMessageHeld: Et,
      popCommandFromQueue: submitController.popQueuedIntoDraft,
      isInputOverlayActive: rt,
      isVimEditing: kt,
      inputMode: At,
      isInputEmpty: It,
      exitDetachesToCaller: Ot,
      sendsPromptsElsewhere: sendsPromptsElsewhere,
      stoppableWork: stoppableWork,
    })),
      ($[8] = Xe),
      ($[9] = Ot),
      ($[10] = At),
      ($[11] = Et),
      ($[12] = isExternalLoading),
      ($[13] = It),
      ($[14] = rt),
      ($[15] = kt),
      ($[16] = screen),
      ($[17] = sendsPromptsElsewhere),
      ($[18] = stoppableWork),
      ($[19] = submitController.popQueuedIntoDraft),
      ($[20] = Xt),
      ($[21] = io),
      ($[22] = so),
      ($[23] = turn.cancel),
      ($[24] = po));
  else po = $[24];
  let ao;
  if ($[25] !== Lt || $[26] !== oo || $[27] !== po)
    ((ao = r(Fragment, { children: [Lt, oo, po] })), ($[25] = Lt), ($[26] = oo), ($[27] = po), ($[28] = ao));
  else ao = $[28];
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
function PromptDock(h) {
  let $ = w(5),
    { turn: turn, draft: draft, isOffered: isOffered, width: width } = h,
    ke = useStoreSelector(turn, selectIsLoading),
    Re = useStoreSelector(draft, selectInputOwnsEscape),
    He;
  if ($[0] !== ke || $[1] !== isOffered || $[2] !== Re || $[3] !== width)
    ((He = e(PaneDockNamespace.PaneDock, {
      isOffered: isOffered,
      width: width,
      working: ke,
      promptOwnsEscape: Re,
    })),
      ($[0] = ke),
      ($[1] = isOffered),
      ($[2] = Re),
      ($[3] = width),
      ($[4] = He));
  else He = $[4];
  return He;
}
//@ chunk-18hwfzwa.js:514445-514449 placement
j();

export { PromptArea, PromptDock };
