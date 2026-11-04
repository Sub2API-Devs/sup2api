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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useState, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getRandomGoodbyeMessage, noopExitHandler } from "../../commands/exit/exit.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WorktreeExitDialog } from "../../components/WorktreeExitDialog.js";
import { BackgroundAndExit, canBackgroundSession } from "../../utils/background/spawnBackgroundFork.js";
import { ExitBackgroundWorkDialog } from "../../components/ExitBackgroundWorkDialog.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1706461-1708386 placement
function useExitFlow(props) {
  let $ = useMemoCache(39);
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
  let [backgroundingConfirmed, setBackgroundingConfirmed] = useState(false);
  let getCurrentMessages;
  if ($[0] !== getMessages || $[1] !== messages) {
    getCurrentMessages = () => getMessages?.() ?? messages;
    $[0] = getMessages;
    $[1] = messages;
    $[2] = getCurrentMessages;
  } else getCurrentMessages = $[2];
  let readMessages = getCurrentMessages;
  let readIsStreaming;
  if ($[3] !== getIsMidTurn || $[4] !== getIsResponseStreaming || $[5] !== isMidTurn) {
    readIsStreaming = () => ((getIsResponseStreaming ?? getIsMidTurn)?.() ?? isMidTurn) === true;
    $[3] = getIsMidTurn;
    $[4] = getIsResponseStreaming;
    $[5] = isMidTurn;
    $[6] = readIsStreaming;
  } else readIsStreaming = $[6];
  let isStreaming = readIsStreaming;
  let flowResult;
  if (
    $[7] !== backgroundItems ||
    $[8] !== backgroundingConfirmed ||
    $[9] !== getIsMidTurn ||
    $[10] !== readMessages ||
    $[11] !== isMidTurn ||
    $[12] !== onBeforeExit ||
    $[13] !== onCancel ||
    $[14] !== onDone ||
    $[15] !== isStreaming ||
    $[16] !== showWorktree ||
    $[17] !== storageV5
  ) {
    flowResult = EARLY_RETURN_SENTINEL;
    Bo: {
      let currentMessages = readMessages();
      let midTurnFlag;
      if ($[19] !== getIsMidTurn || $[20] !== isMidTurn) {
        midTurnFlag = getIsMidTurn?.() ?? isMidTurn;
        $[19] = getIsMidTurn;
        $[20] = isMidTurn;
        $[21] = midTurnFlag;
      } else midTurnFlag = $[21];
      let isMidTurnNow = midTurnFlag;
      let finishExit;
      if (
        $[22] !== readMessages ||
        $[23] !== onBeforeExit ||
        $[24] !== onDone ||
        $[25] !== isStreaming ||
        $[26] !== storageV5
      ) {
        finishExit = async function finishExitImpl(goodbyeMessage, exitOptions) {
          await onBeforeExit?.();
          onDone(goodbyeMessage ?? getRandomGoodbyeMessage());
          let messagesAtExit = readMessages();
          if (messagesAtExit)
            await ExitFlow(
              messagesAtExit,
              {
                responseStreaming: isStreaming(),
              },
              storageV5,
              exitOptions?.removeWorktree,
            );
          else if (exitOptions?.removeWorktree)
            await gracefulShutdown(0, "prompt_input_exit", {
              removeWorktree: exitOptions.removeWorktree,
            });
          else await gracefulShutdown(0, "prompt_input_exit");
        };
        $[22] = readMessages;
        $[23] = onBeforeExit;
        $[24] = onDone;
        $[25] = isStreaming;
        $[26] = storageV5;
        $[27] = finishExit;
      } else finishExit = $[27];
      let onDialogDone = finishExit;
      if (showWorktree) {
        let worktreeDialog;
        if ($[28] !== onCancel || $[29] !== onDialogDone) {
          worktreeDialog = jsxProd_default(WorktreeExitDialog, {
            onDone: onDialogDone,
            onCancel,
          });
          $[28] = onCancel;
          $[29] = onDialogDone;
          $[30] = worktreeDialog;
        } else worktreeDialog = $[30];
        flowResult = worktreeDialog;
        break Bo;
      }
      if (backgroundingConfirmed && currentMessages) {
        flowResult = jsxProd_default(BackgroundAndExit, {
          messages: currentMessages,
          isMidTurn: isMidTurnNow ?? false,
          responseStreaming: isStreaming(),
        });
        break Bo;
      }
      if (backgroundItems.length > 0) {
        let onBackground;
        if (currentMessages !== undefined && canBackgroundSession(currentMessages)) {
          let onBackground_2;
          if ($[31] === MEMO_CACHE_SENTINEL) {
            onBackground_2 = () => setBackgroundingConfirmed(true);
            $[31] = onBackground_2;
          } else onBackground_2 = $[31];
          onBackground = onBackground_2;
        }
        let onExit;
        if ($[32] !== onDialogDone) {
          onExit = () => void onDialogDone();
          $[32] = onDialogDone;
          $[33] = onExit;
        } else onExit = $[33];
        const onCancel_2 = onCancel ?? noopExitHandler;
        let backgroundDialog;
        if ($[34] !== backgroundItems || $[35] !== onBackground || $[36] !== onExit || $[37] !== onCancel_2) {
          backgroundDialog = jsxProd_default(ExitBackgroundWorkDialog, {
            items: backgroundItems,
            onExit,
            onCancel: onCancel_2,
            onBackground,
          });
          $[34] = backgroundItems;
          $[35] = onBackground;
          $[36] = onExit;
          $[37] = onCancel_2;
          $[38] = backgroundDialog;
        } else backgroundDialog = $[38];
        flowResult = backgroundDialog;
        break Bo;
      }
    }
    $[7] = backgroundItems;
    $[8] = backgroundingConfirmed;
    $[9] = getIsMidTurn;
    $[10] = readMessages;
    $[11] = isMidTurn;
    $[12] = onBeforeExit;
    $[13] = onCancel;
    $[14] = onDone;
    $[15] = isStreaming;
    $[16] = showWorktree;
    $[17] = storageV5;
    $[18] = flowResult;
  } else flowResult = $[18];
  if (flowResult !== EARLY_RETURN_SENTINEL) return flowResult;
  return null;
}
//@ chunk-18hwfzwa.js:1708386-1708418 placement
function selectExit(chrome) {
  return chrome.exit;
}
//@ chunk-18hwfzwa.js:1708418-1709241 placement
function runExitInterstitial(props) {
  let $ = useMemoCache(9);
  let { chrome } = props;
  let storeSelector = useStoreSelector(chrome, selectExit);
  if (storeSelector.kind !== "interstitial") {
    return null;
  }
  let interstitial;
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
    interstitial = jsxProd_default(useExitFlow, {
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
    $[8] = interstitial;
  } else interstitial = $[8];
  return interstitial;
}
//@ chunk-18hwfzwa.js:1709241-1709257 placement
function noopExitFlow() {}
//@ chunk-18hwfzwa.js:1709257-1709261 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1709257", () => {
  init_react_production();
});
export { runExitInterstitial, useExitFlow };
