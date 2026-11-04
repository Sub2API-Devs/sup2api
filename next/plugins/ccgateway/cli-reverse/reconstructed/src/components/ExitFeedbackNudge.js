/**
 * components/ExitFeedbackNudge.tsx
 *
 * 2.1.316 新增：退出时的反馈提示与告别语
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xs5f70ym.js (6)
 * attribution: placement 6
 */
import { init_react_production, useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { discardFeedbackDraft } from "../services/feedback/feedbackDraft.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FeedbackQueue } from "../commands/feedback/FeedbackQueue.js";
import { plural } from "../utils/stringUtils.js";
import { Text } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { sampleAlias } from "./Spinner/spinnerStatus.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { noopBackgroundConfirm, sendDetachRequest } from "../screens/repl/backgroundConfirm.js";
import { call } from "../commands/stop/stop.js";
import { getCurrentWorktreeSession } from "../utils/worktree.js";
import { backgroundTaskDescription } from "../tasks/backgroundTaskLabels.js";
import { useExitFlow } from "../screens/repl/exitFlow.js";
import { isFeedbackDraftsEnabled } from "../services/feedbackDrafts.js";
import { listFeedbackDrafts } from "../services/feedback/feedbackDrafts.js";
import { getSessionId } from "../bootstrap/state.js";
import { ExitFlow } from "./ExitFlow.js";
import { submittedMessages, isMidTurnStreaming } from "../utils/promptSubmissionOrigin.js";

//@ chunk-xs5f70ym.js:16739-16743 placement
init_react_production();
//@ chunk-xs5f70ym.js:16743-16757 placement
function noopExitNudge() {}
//@ chunk-xs5f70ym.js:16757-18245 placement
function ExitFeedbackNudge(props) {
  let $ = useMemoCache(26);
  let { sessionDrafts, messages, renderExitFlow, onExit } = props;
  let { storageV5 } = useTheme_2();
  let [view, setView] = useState("nudge");
  let [panelElement, setPanelElement] = useState(null);
  let exitingRef = useRef(false);
  let discardAllCached;
  if ($[0] !== sessionDrafts || $[1] !== storageV5) {
    discardAllCached = async function discardAllDrafts() {
      for (const sessionDraft of sessionDrafts)
        await discardFeedbackDraft(sessionDraft, "exit_nudge", storageV5).catch(noopExitNudge);
    };
    $[0] = sessionDrafts;
    $[1] = storageV5;
    $[2] = discardAllCached;
  } else discardAllCached = $[2];
  let discardDrafts = discardAllCached;
  let finishCached;
  if ($[3] !== onExit || $[4] !== renderExitFlow) {
    finishCached = function finishExit() {
      if (renderExitFlow) setPanelElement(renderExitFlow());
      else onExit();
    };
    $[3] = onExit;
    $[4] = renderExitFlow;
    $[5] = finishCached;
  } else finishCached = $[5];
  let finishExitStable = finishCached;
  let keyHandlerCached;
  if (
    $[6] !== discardDrafts ||
    $[7] !== panelElement ||
    $[8] !== onExit ||
    $[9] !== renderExitFlow ||
    $[10] !== view
  ) {
    keyHandlerCached = function handleKeyDown(event) {
      if (view !== "nudge" || panelElement || event.ctrl || event.meta) {
        return;
      }
      if (exitingRef.current) {
        event.preventDefault();
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        setView("panel");
      } else if (event.key === "escape") {
        event.preventDefault();
        exitingRef.current = true;
        if (renderExitFlow) setPanelElement(renderExitFlow(discardDrafts));
        else
          (async () => {
            await discardDrafts();
            onExit();
          })();
      }
    };
    $[6] = discardDrafts;
    $[7] = panelElement;
    $[8] = onExit;
    $[9] = renderExitFlow;
    $[10] = view;
    $[11] = keyHandlerCached;
  } else keyHandlerCached = $[11];
  let onKeyDown = keyHandlerCached;
  if (panelElement) {
    return panelElement;
  }
  if (view === "panel") {
    let onDone;
    if ($[12] !== finishExitStable) {
      onDone = () => finishExitStable();
      $[12] = finishExitStable;
      $[13] = onDone;
    } else onDone = $[13];
    let queueElement;
    if ($[14] !== messages || $[15] !== onDone) {
      queueElement = jsxProd_default(FeedbackQueue, {
        messages,
        onDone,
      });
      $[14] = messages;
      $[15] = onDone;
      $[16] = queueElement;
    } else queueElement = $[16];
    return queueElement;
  }
  const draftCount = sessionDrafts.length;
  let draftNoun;
  if ($[17] !== sessionDrafts.length) {
    draftNoun = plural(sessionDrafts.length, "feedback draft");
    $[17] = sessionDrafts.length;
    $[18] = draftNoun;
  } else draftNoun = $[18];
  let messageElement;
  if ($[19] !== sessionDrafts.length || $[20] !== draftNoun) {
    messageElement = jsxProd_default_2(Text, {
      children: ["You have ", draftCount, " unsent", " ", draftNoun],
    });
    $[19] = sessionDrafts.length;
    $[20] = draftNoun;
    $[21] = messageElement;
  } else messageElement = $[21];
  let hintElement;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "review & send",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "esc",
            action: "discard and exit",
          }),
        ],
      }),
    });
    $[22] = hintElement;
  } else hintElement = $[22];
  let nudgeElement;
  if ($[23] !== onKeyDown || $[24] !== messageElement) {
    nudgeElement = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [messageElement, hintElement],
    });
    $[23] = onKeyDown;
    $[24] = messageElement;
    $[25] = nudgeElement;
  } else nudgeElement = $[25];
  return nudgeElement;
}
//@ chunk-xs5f70ym.js:18245-18301 placement (2.1.88 match: GOODBYE_MESSAGES, 1)
var GOODBYE_MESSAGES = ["Goodbye!", "See ya!", "Bye!", "Catch you later!"];
//@ chunk-xs5f70ym.js:18301-18340 placement (2.1.88 match: getRandomGoodbyeMessage, 1)
function getRandomGoodbyeMessage() {
  return sampleAlias(GOODBYE_MESSAGES) ?? "Goodbye!";
}
//@ chunk-xs5f70ym.js:18340-19111 placement
/**
 * /exit 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runExitWithFeedback(onDone, context) {
  if (isBgSession()) {
    if (noopBackgroundConfirm() !== undefined) return call(onDone, context);
    onDone();
    sendDetachRequest();
    return null;
  }
  let inWorktree = getCurrentWorktreeSession() !== null;
  let backgroundItems = backgroundTaskDescription(context.taskRegistry?.all(), context.options?.mcpClients);
  let renderExitFlow =
    inWorktree || backgroundItems.length > 0
      ? (onBeforeExit) =>
          jsxProd_default(useExitFlow, {
            showWorktree: inWorktree,
            backgroundItems,
            messages: context.messages,
            isMidTurn: context.isMidTurn,
            getMessages: context.getMessages,
            getIsResponseStreaming: context.getIsResponseStreaming,
            onDone,
            onCancel: () => onDone(),
            onBeforeExit,
          })
      : null;
  if (isFeedbackDraftsEnabled()) {
    let { queued } = await listFeedbackDrafts(
      {
        lightweight: true,
      },
      context.storageV5,
    ).catch(() => ({
      queued: [],
      expired: [],
    }));
    let filtered = queued.filter((draft) => draft.source_session_id === getSessionId());
    if (filtered.length > 0)
      return jsxProd_default(ExitFeedbackNudge, {
        sessionDrafts: filtered,
        messages: [...context.messages],
        renderExitFlow,
        onExit: () => {
          onDone(getRandomGoodbyeMessage());
          ExitFlow(
            submittedMessages(context),
            {
              responseStreaming: isMidTurnStreaming(context),
            },
            context.storageV5,
          );
        },
      });
  }
  if (renderExitFlow) return renderExitFlow();
  onDone(getRandomGoodbyeMessage());
  await ExitFlow(
    submittedMessages(context),
    {
      responseStreaming: isMidTurnStreaming(context),
    },
    context.storageV5,
  );
  return null;
}
export { runExitWithFeedback };
