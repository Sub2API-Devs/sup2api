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
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getRandomGoodbyeMessage, noopExitHandler } from "../../commands/exit/exit.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorktreeExitDialog } from "../../components/WorktreeExitDialog.js";
import { BackgroundAndExit, canBackgroundSession } from "../../utils/background/spawnBackgroundFork.js";
import { ExitBackgroundWorkDialog } from "../../components/ExitBackgroundWorkDialog.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";

//@ chunk-18hwfzwa.js:1706461-1708386 placement
function useExitFlow(props) {
  let $ = w(39);
  let {
    showWorktree,
    backgroundItems,
    messages,
    getMessages,
    getIsMidTurn,
    getIsResponseStreaming,
    isMidTurn,
    onDone,
    onCancel,
    onBeforeExit,
  } = props;
  let { storageV5 } = useTheme_2();
  let [rt, kt] = y(false);
  let It;
  if ($[0] !== getMessages || $[1] !== messages) {
    It = () => getMessages?.() ?? messages;
    $[0] = getMessages;
    $[1] = messages;
    $[2] = It;
  } else It = $[2];
  let Ot = It;
  let Et;
  if ($[3] !== getIsMidTurn || $[4] !== getIsResponseStreaming || $[5] !== isMidTurn) {
    Et = () => ((getIsResponseStreaming ?? getIsMidTurn)?.() ?? isMidTurn) === true;
    $[3] = getIsMidTurn;
    $[4] = getIsResponseStreaming;
    $[5] = isMidTurn;
    $[6] = Et;
  } else Et = $[6];
  let Dt = Et;
  let Lt;
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
      if ($[19] !== getIsMidTurn || $[20] !== isMidTurn) {
        Xt = getIsMidTurn?.() ?? isMidTurn;
        $[19] = getIsMidTurn;
        $[20] = isMidTurn;
        $[21] = Xt;
      } else Xt = $[21];
      let io = Xt;
      let so;
      if ($[22] !== Ot || $[23] !== onBeforeExit || $[24] !== onDone || $[25] !== Dt || $[26] !== storageV5) {
        so = async function bo(po, ao) {
          await onBeforeExit?.();
          onDone(po ?? getRandomGoodbyeMessage());
          let co = Ot();
          if (co)
            await ExitFlow(
              co,
              {
                responseStreaming: Dt(),
              },
              storageV5,
              ao?.removeWorktree,
            );
          else if (ao?.removeWorktree)
            await gracefulShutdown(0, "prompt_input_exit", {
              removeWorktree: ao.removeWorktree,
            });
          else await gracefulShutdown(0, "prompt_input_exit");
        };
        $[22] = Ot;
        $[23] = onBeforeExit;
        $[24] = onDone;
        $[25] = Dt;
        $[26] = storageV5;
        $[27] = so;
      } else so = $[27];
      let bo = so;
      if (showWorktree) {
        let Ao;
        if ($[28] !== onCancel || $[29] !== bo) {
          Ao = jsxProd_default(WorktreeExitDialog, {
            onDone: bo,
            onCancel,
          });
          $[28] = onCancel;
          $[29] = bo;
          $[30] = Ao;
        } else Ao = $[30];
        Lt = Ao;
        break Bo;
      }
      if (rt && oo) {
        Lt = jsxProd_default(BackgroundAndExit, {
          messages: oo,
          isMidTurn: io ?? false,
          responseStreaming: Dt(),
        });
        break Bo;
      }
      if (backgroundItems.length > 0) {
        let onBackground;
        if (oo !== undefined && canBackgroundSession(oo)) {
          let Ao;
          if ($[31] === MEMO_CACHE_SENTINEL) {
            Ao = () => kt(true);
            $[31] = Ao;
          } else Ao = $[31];
          onBackground = Ao;
        }
        let onExit;
        if ($[32] !== bo) {
          onExit = () => void bo();
          $[32] = bo;
          $[33] = onExit;
        } else onExit = $[33];
        const onCancel_2 = onCancel ?? noopExitHandler;
        let Io;
        if ($[34] !== backgroundItems || $[35] !== onBackground || $[36] !== onExit || $[37] !== onCancel_2) {
          Io = jsxProd_default(ExitBackgroundWorkDialog, {
            items: backgroundItems,
            onExit,
            onCancel: onCancel_2,
            onBackground,
          });
          $[34] = backgroundItems;
          $[35] = onBackground;
          $[36] = onExit;
          $[37] = onCancel_2;
          $[38] = Io;
        } else Io = $[38];
        Lt = Io;
        break Bo;
      }
    }
    $[7] = backgroundItems;
    $[8] = rt;
    $[9] = getIsMidTurn;
    $[10] = Ot;
    $[11] = isMidTurn;
    $[12] = onBeforeExit;
    $[13] = onCancel;
    $[14] = onDone;
    $[15] = Dt;
    $[16] = showWorktree;
    $[17] = storageV5;
    $[18] = Lt;
  } else Lt = $[18];
  if (Lt !== EARLY_RETURN_SENTINEL) return Lt;
  return null;
}
//@ chunk-18hwfzwa.js:1708386-1708418 placement
function selectExit(ke) {
  return ke.exit;
}
//@ chunk-18hwfzwa.js:1708418-1709241 placement
function runExitInterstitial(props) {
  let $ = w(9);
  let { chrome } = props;
  let storeSelector = useStoreSelector(chrome, selectExit);
  if (storeSelector.kind !== "interstitial") {
    return null;
  }
  let ee;
  if (
    $[0] !== chrome.cancelExit ||
    $[1] !== chrome.exitReaders.getMessages ||
    $[2] !== chrome.exitReaders.isMidTurn ||
    $[3] !== chrome.exitReaders.isResponseStreaming ||
    $[4] !== storeSelector.backgroundItems ||
    $[5] !== storeSelector.isMidTurn ||
    $[6] !== storeSelector.messages ||
    $[7] !== storeSelector.showWorktree
  ) {
    ee = jsxProd_default(useExitFlow, {
      showWorktree: storeSelector.showWorktree,
      backgroundItems: storeSelector.backgroundItems,
      messages: storeSelector.messages,
      isMidTurn: storeSelector.isMidTurn,
      getMessages: chrome.exitReaders.getMessages,
      getIsMidTurn: chrome.exitReaders.isMidTurn,
      getIsResponseStreaming: chrome.exitReaders.isResponseStreaming,
      onDone: noopExitFlow,
      onCancel: chrome.cancelExit,
    });
    $[0] = chrome.cancelExit;
    $[1] = chrome.exitReaders.getMessages;
    $[2] = chrome.exitReaders.isMidTurn;
    $[3] = chrome.exitReaders.isResponseStreaming;
    $[4] = storeSelector.backgroundItems;
    $[5] = storeSelector.isMidTurn;
    $[6] = storeSelector.messages;
    $[7] = storeSelector.showWorktree;
    $[8] = ee;
  } else ee = $[8];
  return ee;
}
//@ chunk-18hwfzwa.js:1709241-1709257 placement
function noopExitFlow() {}
//@ chunk-18hwfzwa.js:1709257-1709261 placement
init_react_production();
export { runExitInterstitial, useExitFlow };
