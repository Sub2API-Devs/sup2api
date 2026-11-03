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
import { j, y, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { discardFeedbackDraft } from "../services/feedback/feedbackDraft.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FeedbackQueue } from "../commands/feedback/FeedbackQueue.js";
import { plural } from "../utils/stringUtils.js";
import { Text } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { wz } from "./Spinner/spinnerStatus.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { tce, sendDetachRequest } from "../screens/repl/backgroundConfirm.js";
import { call } from "../commands/stop/stop.js";
import { getCurrentWorktreeSession } from "../utils/worktree.js";
import { backgroundTaskDescription } from "../tasks/backgroundTaskLabels.js";
import { useExitFlow } from "../screens/repl/exitFlow.js";
import { R5 } from "../services/feedbackDrafts.js";
import { listFeedbackDrafts } from "../services/feedback/feedbackDrafts.js";
import { getSessionId } from "../bootstrap/state.js";
import { ExitFlow } from "./ExitFlow.js";
import { yN, XRe } from "../utils/promptSubmissionOrigin.js";

//@ chunk-xs5f70ym.js:16739-16743 placement
j();
//@ chunk-xs5f70ym.js:16743-16757 placement
function Z() {}
//@ chunk-xs5f70ym.js:16757-18245 placement
function ExitFeedbackNudge(a) {
  let i = w(26),
    { sessionDrafts: sessionDrafts, messages: messages, renderExitFlow: renderExitFlow, onExit: onExit } = a,
    { storageV5: storageV5 } = Me(),
    [f, x] = y("nudge"),
    [u, V] = y(null),
    G = R(!1),
    L;
  if (i[0] !== sessionDrafts || i[1] !== storageV5)
    ((L = async function E() {
      for (const se of sessionDrafts) await discardFeedbackDraft(se, "exit_nudge", storageV5).catch(Z);
    }),
      (i[0] = sessionDrafts),
      (i[1] = storageV5),
      (i[2] = L));
  else L = i[2];
  let E = L,
    W;
  if (i[3] !== onExit || i[4] !== renderExitFlow)
    ((W = function v() {
      if (renderExitFlow) V(renderExitFlow());
      else onExit();
    }),
      (i[3] = onExit),
      (i[4] = renderExitFlow),
      (i[5] = W));
  else W = i[5];
  let v = W,
    _;
  if (i[6] !== E || i[7] !== u || i[8] !== onExit || i[9] !== renderExitFlow || i[10] !== f)
    ((_ = function F(l) {
      if (f !== "nudge" || u || l.ctrl || l.meta) {
        return;
      }
      if (G.current) {
        l.preventDefault();
        return;
      }
      if (l.key === "return") (l.preventDefault(), x("panel"));
      else if (l.key === "escape") {
        if ((l.preventDefault(), (G.current = !0), renderExitFlow)) V(renderExitFlow(E));
        else
          (async () => {
            (await E(), onExit());
          })();
      }
    }),
      (i[6] = E),
      (i[7] = u),
      (i[8] = onExit),
      (i[9] = renderExitFlow),
      (i[10] = f),
      (i[11] = _));
  else _ = i[11];
  let F = _;
  if (u) {
    return u;
  }
  if (f === "panel") {
    let c;
    if (i[12] !== v) ((c = () => v()), (i[12] = v), (i[13] = c));
    else c = i[13];
    let p;
    if (i[14] !== messages || i[15] !== c)
      ((p = e(FeedbackQueue, { messages: messages, onDone: c })),
        (i[14] = messages),
        (i[15] = c),
        (i[16] = p));
    else p = i[16];
    return p;
  }
  const c = sessionDrafts.length;
  let p;
  if (i[17] !== sessionDrafts.length)
    ((p = plural(sessionDrafts.length, "feedback draft")), (i[17] = sessionDrafts.length), (i[18] = p));
  else p = i[18];
  let D;
  if (i[19] !== sessionDrafts.length || i[20] !== p)
    ((D = r(Text, { children: ["You have ", c, " unsent", " ", p] })),
      (i[19] = sessionDrafts.length),
      (i[20] = p),
      (i[21] = D));
  else D = i[21];
  let A;
  if (i[22] === MEMO_CACHE_SENTINEL)
    ((A = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "review & send" }),
          e(KeyboardShortcutHint, { chord: "esc", action: "discard and exit" }),
        ],
      }),
    })),
      (i[22] = A));
  else A = i[22];
  let J;
  if (i[23] !== F || i[24] !== D)
    ((J = r(FocusColumn, { onKeyDown: F, children: [D, A] })), (i[23] = F), (i[24] = D), (i[25] = J));
  else J = i[25];
  return J;
}
//@ chunk-xs5f70ym.js:18245-18301 placement = GOODBYE_MESSAGES (1)
var GOODBYE_MESSAGES = ["Goodbye!", "See ya!", "Bye!", "Catch you later!"];
//@ chunk-xs5f70ym.js:18301-18340 placement = getRandomGoodbyeMessage (1)
function getRandomGoodbyeMessage() {
  return wz(GOODBYE_MESSAGES) ?? "Goodbye!";
}
/**
 * /exit 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-xs5f70ym.js:18340-19111 placement
async function runExitWithFeedback(onDone, context) {
  if (isBgSession()) {
    if (tce() !== void 0) return call(onDone, context);
    return (onDone(), sendDetachRequest(), null);
  }
  let g = getCurrentWorktreeSession() !== null,
    o = backgroundTaskDescription(context.taskRegistry?.all(), context.options?.mcpClients),
    t =
      g || o.length > 0
        ? (m) =>
            e(useExitFlow, {
              showWorktree: g,
              backgroundItems: o,
              messages: context.messages,
              isMidTurn: context.isMidTurn,
              getMessages: context.getMessages,
              getIsResponseStreaming: context.getIsResponseStreaming,
              onDone: onDone,
              onCancel: () => onDone(),
              onBeforeExit: m,
            })
        : null;
  if (R5()) {
    let { queued: queued } = await listFeedbackDrafts({ lightweight: !0 }, context.storageV5).catch(() => ({
        queued: [],
        expired: [],
      })),
      filtered = queued.filter((x) => x.source_session_id === getSessionId());
    if (filtered.length > 0)
      return e(ExitFeedbackNudge, {
        sessionDrafts: filtered,
        messages: [...context.messages],
        renderExitFlow: t,
        onExit: () => {
          (onDone(getRandomGoodbyeMessage()),
            ExitFlow(yN(context), { responseStreaming: XRe(context) }, context.storageV5));
        },
      });
  }
  if (t) return t();
  return (
    onDone(getRandomGoodbyeMessage()),
    await ExitFlow(yN(context), { responseStreaming: XRe(context) }, context.storageV5),
    null
  );
}
