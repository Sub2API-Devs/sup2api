/**
 * screens/repl/exitFlow.ts
 *
 * 2.1.316 新增。REPL 退出流程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { y, j } from "../../../vendor/react/cjs/react.production.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getRandomGoodbyeMessage, DVo } from "../../commands/exit/exit.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorktreeExitDialog } from "../../components/WorktreeExitDialog.js";
import { BackgroundAndExit, canBackgroundSession } from "../../utils/background/spawnBackgroundFork.js";
import { ExitBackgroundWorkDialog } from "../../components/ExitBackgroundWorkDialog.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";

//@ chunk-18hwfzwa.js:1706461-1708386 placement
function useExitFlow(h) {
  let $ = w(39),
    {
      showWorktree: showWorktree,
      backgroundItems: backgroundItems,
      messages: messages,
      getMessages: getMessages,
      getIsMidTurn: getIsMidTurn,
      getIsResponseStreaming: getIsResponseStreaming,
      isMidTurn: isMidTurn,
      onDone: onDone,
      onCancel: onCancel,
      onBeforeExit: onBeforeExit,
    } = h,
    { storageV5: storageV5 } = Me(),
    [rt, kt] = y(!1),
    It;
  if ($[0] !== getMessages || $[1] !== messages)
    ((It = () => getMessages?.() ?? messages), ($[0] = getMessages), ($[1] = messages), ($[2] = It));
  else It = $[2];
  let Ot = It,
    Et;
  if ($[3] !== getIsMidTurn || $[4] !== getIsResponseStreaming || $[5] !== isMidTurn)
    ((Et = () => ((getIsResponseStreaming ?? getIsMidTurn)?.() ?? isMidTurn) === !0),
      ($[3] = getIsMidTurn),
      ($[4] = getIsResponseStreaming),
      ($[5] = isMidTurn),
      ($[6] = Et));
  else Et = $[6];
  let Dt = Et,
    Lt;
  if (
    $[7] !== backgroundItems ||
    $[8] !== rt ||
    $[9] !== getIsMidTurn ||
    $[10] !== Ot ||
    $[11] !== isMidTurn ||
    $[12] !== onBeforeExit ||
    $[13] !== onCancel ||
    $[14] !== onDone ||
    $[15] !== Dt ||
    $[16] !== showWorktree ||
    $[17] !== storageV5
  ) {
    Lt = EARLY_RETURN_SENTINEL;
    Bo: {
      let oo = Ot();
      let Xt;
      if ($[19] !== getIsMidTurn || $[20] !== isMidTurn)
        ((Xt = getIsMidTurn?.() ?? isMidTurn), ($[19] = getIsMidTurn), ($[20] = isMidTurn), ($[21] = Xt));
      else Xt = $[21];
      let io = Xt;
      let so;
      if ($[22] !== Ot || $[23] !== onBeforeExit || $[24] !== onDone || $[25] !== Dt || $[26] !== storageV5)
        ((so = async function bo(po, ao) {
          (await onBeforeExit?.(), onDone(po ?? getRandomGoodbyeMessage()));
          let co = Ot();
          if (co) await ExitFlow(co, { responseStreaming: Dt() }, storageV5, ao?.removeWorktree);
          else if (ao?.removeWorktree)
            await gracefulShutdown(0, "prompt_input_exit", { removeWorktree: ao.removeWorktree });
          else await gracefulShutdown(0, "prompt_input_exit");
        }),
          ($[22] = Ot),
          ($[23] = onBeforeExit),
          ($[24] = onDone),
          ($[25] = Dt),
          ($[26] = storageV5),
          ($[27] = so));
      else so = $[27];
      let bo = so;
      if (showWorktree) {
        let Ao;
        if ($[28] !== onCancel || $[29] !== bo)
          ((Ao = e(WorktreeExitDialog, { onDone: bo, onCancel: onCancel })),
            ($[28] = onCancel),
            ($[29] = bo),
            ($[30] = Ao));
        else Ao = $[30];
        Lt = Ao;
        break Bo;
      }
      if (rt && oo) {
        Lt = e(BackgroundAndExit, { messages: oo, isMidTurn: io ?? !1, responseStreaming: Dt() });
        break Bo;
      }
      if (backgroundItems.length > 0) {
        let Ro;
        if (oo !== void 0 && canBackgroundSession(oo)) {
          let Ao;
          if ($[31] === MEMO_CACHE_SENTINEL) ((Ao = () => kt(!0)), ($[31] = Ao));
          else Ao = $[31];
          Ro = Ao;
        }
        let Ao;
        if ($[32] !== bo) ((Ao = () => void bo()), ($[32] = bo), ($[33] = Ao));
        else Ao = $[33];
        const Ho = onCancel ?? DVo;
        let Io;
        if ($[34] !== backgroundItems || $[35] !== Ro || $[36] !== Ao || $[37] !== Ho)
          ((Io = e(ExitBackgroundWorkDialog, {
            items: backgroundItems,
            onExit: Ao,
            onCancel: Ho,
            onBackground: Ro,
          })),
            ($[34] = backgroundItems),
            ($[35] = Ro),
            ($[36] = Ao),
            ($[37] = Ho),
            ($[38] = Io));
        else Io = $[38];
        Lt = Io;
        break Bo;
      }
    }
    (($[7] = backgroundItems),
      ($[8] = rt),
      ($[9] = getIsMidTurn),
      ($[10] = Ot),
      ($[11] = isMidTurn),
      ($[12] = onBeforeExit),
      ($[13] = onCancel),
      ($[14] = onDone),
      ($[15] = Dt),
      ($[16] = showWorktree),
      ($[17] = storageV5),
      ($[18] = Lt));
  } else Lt = $[18];
  if (Lt !== EARLY_RETURN_SENTINEL) return Lt;
  return null;
}
//@ chunk-18hwfzwa.js:1708386-1708418 placement
function selectExit(ke) {
  return ke.exit;
}
//@ chunk-18hwfzwa.js:1708418-1709241 placement
function runExitInterstitial(h) {
  let $ = w(9),
    { chrome: chrome } = h,
    D = useStoreSelector(chrome, selectExit);
  if (D.kind !== "interstitial") {
    return null;
  }
  let ee;
  if (
    $[0] !== chrome.cancelExit ||
    $[1] !== chrome.exitReaders.getMessages ||
    $[2] !== chrome.exitReaders.isMidTurn ||
    $[3] !== chrome.exitReaders.isResponseStreaming ||
    $[4] !== D.backgroundItems ||
    $[5] !== D.isMidTurn ||
    $[6] !== D.messages ||
    $[7] !== D.showWorktree
  )
    ((ee = e(useExitFlow, {
      showWorktree: D.showWorktree,
      backgroundItems: D.backgroundItems,
      messages: D.messages,
      isMidTurn: D.isMidTurn,
      getMessages: chrome.exitReaders.getMessages,
      getIsMidTurn: chrome.exitReaders.isMidTurn,
      getIsResponseStreaming: chrome.exitReaders.isResponseStreaming,
      onDone: l_t,
      onCancel: chrome.cancelExit,
    })),
      ($[0] = chrome.cancelExit),
      ($[1] = chrome.exitReaders.getMessages),
      ($[2] = chrome.exitReaders.isMidTurn),
      ($[3] = chrome.exitReaders.isResponseStreaming),
      ($[4] = D.backgroundItems),
      ($[5] = D.isMidTurn),
      ($[6] = D.messages),
      ($[7] = D.showWorktree),
      ($[8] = ee));
  else ee = $[8];
  return ee;
}
//@ chunk-18hwfzwa.js:1709241-1709257 placement
function l_t() {}
//@ chunk-18hwfzwa.js:1709257-1709261 placement
j();

export { runExitInterstitial, useExitFlow };
