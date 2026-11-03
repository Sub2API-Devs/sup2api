/**
 * commands/feedback/feedback.tsx
 *
 * /feedback 实现：反馈/报错对话框与分享开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/feedback/feedback.tsx
 * pieces: chunk-bzb0qnrm.js (1), chunk-seqjkch8.js (5)
 * attribution: fingerprint 1, facade-majority 3, layout 2
 */
import { feedbackMode } from "../../services/feedback/submitFeedback.js";
import { takePendingSurveyFeedbackSource, nAs } from "../../components/FeedbackSurvey/SurveyFollowup.js";
import { createFeedbackStatusStore, Feedback } from "../../components/Feedback.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { env } from "../../utils/env.js";
import { createAbortController } from "../../utils/abortController.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { FeedbackQueue } from "./FeedbackQueue.js";
import { R5 } from "../../services/feedbackDrafts.js";
import { createStore } from "../../state/store.js";
import { runRemotePluginHook } from "../../services/remoteTools/runPluginHook.js";
import { resyncForMissingEntry } from "../../services/remoteTools/commandRendering.js";

//@ chunk-seqjkch8.js:15835-16264 facade-majority = renderFeedbackComponent (0.262)
function renderFeedbackComponent(d, o, a, p, h = "", k = {}, c, P = "/feedback") {
  let b = feedbackMode(P);
  if (b.kind === "disabled") return (d(b.reason), null);
  let _ = takePendingSurveyFeedbackSource() ?? void 0,
    W = createFeedbackStatusStore(b.kind);
  return e(Feedback, {
    abortController: o,
    messages: a,
    initialDescription: h,
    onDone: d,
    applyMessageOp: p,
    backgroundTasks: k,
    mode: b.kind,
    readFileState: c,
    surveyFeedbackSource: _,
    command: P,
    wholeTranscript:
      b.kind === "bundle" &&
      (b.cause === "share_switch" || (P === "/share" && env.CLAUDE_CODE_ENABLE_SHARE_BUNDLE)),
    send: W,
  });
}
//@ chunk-seqjkch8.js:16264-16378 layout
function renderFeedbackFromContext(d, o, a, p) {
  return renderFeedbackComponent(
    d,
    createAbortController(),
    o.messages,
    o.applyMessageOp,
    a,
    { ...o.taskRegistry.all() },
    o.readFileState,
    p,
  );
}
//@ chunk-seqjkch8.js:16378-16473 facade-majority
async function callLegacyFeedbackDialog(d, o, a, p = "/feedback") {
  let h = a?.trim() === "public" ? "" : a || "";
  return renderFeedbackFromContext(d, o, h, p);
}
/**
 * /feedback 入口：有手动对话框时直接显示，否则显示反馈队列，“新写”时打开反馈对话框。
 */
//@ chunk-seqjkch8.js:16473-16958 layout
function FeedbackCommandView(d) {
  let k = w(10),
    { onDone: onDone, caller: caller, manualDialog: manualDialog } = d,
    h = useStoreSelector(manualDialog),
    c;
  if (k[0] !== caller.messages) ((c = () => [...caller.messages]), (k[0] = caller.messages), (k[1] = c));
  else c = k[1];
  let [P] = y(c);
  if (h !== void 0) {
    return h;
  }
  let b;
  if (k[2] !== caller || k[3] !== manualDialog || k[4] !== onDone)
    ((b = () => {
      if (manualDialog.getState() !== void 0) {
        return;
      }
      let _ = renderFeedbackFromContext(onDone, caller, "", "/feedback");
      manualDialog.setState(() => _);
    }),
      (k[2] = caller),
      (k[3] = manualDialog),
      (k[4] = onDone),
      (k[5] = b));
  else b = k[5];
  let W;
  if (k[6] !== P || k[7] !== onDone || k[8] !== b)
    ((W = e(FeedbackQueue, { messages: P, onDone: onDone, onWriteNew: b })),
      (k[6] = P),
      (k[7] = onDone),
      (k[8] = b),
      (k[9] = W));
  else W = k[9];
  return W;
}
//@ chunk-seqjkch8.js:16958-17087 facade-majority
async function call(onDone, context, args) {
  if (R5() && !args?.trim() && !nAs())
    return e(FeedbackCommandView, { onDone: onDone, caller: context, manualDialog: createStore(void 0) });
  return callLegacyFeedbackDialog(onDone, context, args);
}
//@ chunk-bzb0qnrm.js:5187-5293 fingerprint = call (0.643)
async function call_2(onDone, context, args) {
  let toolUseContext = args.toolUseContext();
  return runRemotePluginHook(onDone, toolUseContext, (i) =>
    resyncForMissingEntry(args, toolUseContext.abortController.signal, i),
  );
}

export { callLegacyFeedbackDialog, call_2 };
