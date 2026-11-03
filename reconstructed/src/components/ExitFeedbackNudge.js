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
import { init_react_production, y, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
  let i = w(26);
  let { sessionDrafts, messages, renderExitFlow, onExit } = props;
  let { storageV5 } = useTheme_2();
  let [f, x] = y("nudge");
  let [u, V] = y(null);
  let G = R(false);
  let L;
  if (i[0] !== sessionDrafts || i[1] !== storageV5) {
    L = async function E() {
      for (const sessionDraft of sessionDrafts)
        await discardFeedbackDraft(sessionDraft, "exit_nudge", storageV5).catch(noopExitNudge);
    };
    i[0] = sessionDrafts;
    i[1] = storageV5;
    i[2] = L;
  } else L = i[2];
  let E = L;
  let W;
  if (i[3] !== onExit || i[4] !== renderExitFlow) {
    W = function v() {
      if (renderExitFlow) V(renderExitFlow());
      else onExit();
    };
    i[3] = onExit;
    i[4] = renderExitFlow;
    i[5] = W;
  } else W = i[5];
  let v = W;
  let _;
  if (i[6] !== E || i[7] !== u || i[8] !== onExit || i[9] !== renderExitFlow || i[10] !== f) {
    _ = function F(event) {
      if (f !== "nudge" || u || event.ctrl || event.meta) {
        return;
      }
      if (G.current) {
        event.preventDefault();
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        x("panel");
      } else if (event.key === "escape") {
        event.preventDefault();
        G.current = true;
        if (renderExitFlow) V(renderExitFlow(E));
        else
          (async () => {
            await E();
            onExit();
          })();
      }
    };
    i[6] = E;
    i[7] = u;
    i[8] = onExit;
    i[9] = renderExitFlow;
    i[10] = f;
    i[11] = _;
  } else _ = i[11];
  let onKeyDown = _;
  if (u) {
    return u;
  }
  if (f === "panel") {
    let onDone;
    if (i[12] !== v) {
      onDone = () => v();
      i[12] = v;
      i[13] = onDone;
    } else onDone = i[13];
    let p;
    if (i[14] !== messages || i[15] !== onDone) {
      p = jsxProd_default(FeedbackQueue, {
        messages,
        onDone,
      });
      i[14] = messages;
      i[15] = onDone;
      i[16] = p;
    } else p = i[16];
    return p;
  }
  const c = sessionDrafts.length;
  let p;
  if (i[17] !== sessionDrafts.length) {
    p = plural(sessionDrafts.length, "feedback draft");
    i[17] = sessionDrafts.length;
    i[18] = p;
  } else p = i[18];
  let D;
  if (i[19] !== sessionDrafts.length || i[20] !== p) {
    D = jsxProd_default_2(Text, {
      children: ["You have ", c, " unsent", " ", p],
    });
    i[19] = sessionDrafts.length;
    i[20] = p;
    i[21] = D;
  } else D = i[21];
  let A;
  if (i[22] === MEMO_CACHE_SENTINEL) {
    A = jsxProd_default(Text, {
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
    i[22] = A;
  } else A = i[22];
  let J;
  if (i[23] !== onKeyDown || i[24] !== D) {
    J = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [D, A],
    });
    i[23] = onKeyDown;
    i[24] = D;
    i[25] = J;
  } else J = i[25];
  return J;
}
//@ chunk-xs5f70ym.js:18245-18301 placement = GOODBYE_MESSAGES (1)
var GOODBYE_MESSAGES = ["Goodbye!", "See ya!", "Bye!", "Catch you later!"];
//@ chunk-xs5f70ym.js:18301-18340 placement = getRandomGoodbyeMessage (1)
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
  let g = getCurrentWorktreeSession() !== null;
  let o = backgroundTaskDescription(context.taskRegistry?.all(), context.options?.mcpClients);
  let t =
    g || o.length > 0
      ? (onBeforeExit) =>
          jsxProd_default(useExitFlow, {
            showWorktree: g,
            backgroundItems: o,
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
    let filtered = queued.filter((x) => x.source_session_id === getSessionId());
    if (filtered.length > 0)
      return jsxProd_default(ExitFeedbackNudge, {
        sessionDrafts: filtered,
        messages: [...context.messages],
        renderExitFlow: t,
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
  if (t) return t();
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
