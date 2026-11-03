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
import {
  takePendingSurveyFeedbackSource,
  hasPendingSurveyFeedbackSource,
} from "../../components/FeedbackSurvey/SurveyFollowup.js";
import { createFeedbackStatusStore, Feedback } from "../../components/Feedback.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { env } from "../../utils/env.js";
import { createAbortController } from "../../utils/abortController.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { FeedbackQueue } from "./FeedbackQueue.js";
import { isFeedbackDraftsEnabled } from "../../services/feedbackDrafts.js";
import { createStore } from "../../state/store.js";
import { runRemotePluginHook } from "../../services/remoteTools/runPluginHook.js";
import { resyncForMissingEntry } from "../../services/remoteTools/commandRendering.js";

//@ chunk-seqjkch8.js:15835-16264 facade-majority = renderFeedbackComponent (0.262)
function renderFeedbackComponent(
  d,
  abortController,
  messages,
  applyMessageOp,
  initialDescription = "",
  backgroundTasks = {},
  readFileState,
  P = "/feedback",
) {
  let b = feedbackMode(P);
  if (b.kind === "disabled") {
    d(b.reason);
    return null;
  }
  let surveyFeedbackSource = takePendingSurveyFeedbackSource() ?? undefined;
  let send = createFeedbackStatusStore(b.kind);
  return jsxProd_default(Feedback, {
    abortController,
    messages,
    initialDescription,
    onDone: d,
    applyMessageOp,
    backgroundTasks,
    mode: b.kind,
    readFileState,
    surveyFeedbackSource,
    command: P,
    wholeTranscript:
      b.kind === "bundle" &&
      (b.cause === "share_switch" || (P === "/share" && env.CLAUDE_CODE_ENABLE_SHARE_BUNDLE)),
    send,
  });
}
//@ chunk-seqjkch8.js:16264-16378 layout
function renderFeedbackFromContext(d, o, initialDescription, p) {
  return renderFeedbackComponent(
    d,
    createAbortController(),
    o.messages,
    o.applyMessageOp,
    initialDescription,
    {
      ...o.taskRegistry.all(),
    },
    o.readFileState,
    p,
  );
}
//@ chunk-seqjkch8.js:16378-16473 facade-majority
async function callLegacyFeedbackDialog(onDone, context, a, p = "/feedback") {
  let h = a?.trim() === "public" ? "" : a || "";
  return renderFeedbackFromContext(onDone, context, h, p);
}
//@ chunk-seqjkch8.js:16473-16958 layout
/**
 * /feedback 入口：有手动对话框时直接显示，否则显示反馈队列，“新写”时打开反馈对话框。
 */
function FeedbackCommandView(props) {
  let k = w(10);
  let { onDone, caller, manualDialog } = props;
  let storeSelector = useStoreSelector(manualDialog);
  let c;
  if (k[0] !== caller.messages) {
    c = () => [...caller.messages];
    k[0] = caller.messages;
    k[1] = c;
  } else c = k[1];
  let [P] = y(c);
  if (storeSelector !== undefined) {
    return storeSelector;
  }
  let onWriteNew;
  if (k[2] !== caller || k[3] !== manualDialog || k[4] !== onDone) {
    onWriteNew = () => {
      if (manualDialog.getState() !== undefined) {
        return;
      }
      let _ = renderFeedbackFromContext(onDone, caller, "", "/feedback");
      manualDialog.setState(() => _);
    };
    k[2] = caller;
    k[3] = manualDialog;
    k[4] = onDone;
    k[5] = onWriteNew;
  } else onWriteNew = k[5];
  let W;
  if (k[6] !== P || k[7] !== onDone || k[8] !== onWriteNew) {
    W = jsxProd_default(FeedbackQueue, {
      messages: P,
      onDone,
      onWriteNew,
    });
    k[6] = P;
    k[7] = onDone;
    k[8] = onWriteNew;
    k[9] = W;
  } else W = k[9];
  return W;
}
//@ chunk-seqjkch8.js:16958-17087 facade-majority
async function call(onDone, context, args) {
  if (isFeedbackDraftsEnabled() && !args?.trim() && !hasPendingSurveyFeedbackSource())
    return jsxProd_default(FeedbackCommandView, {
      onDone,
      caller: context,
      manualDialog: createStore(undefined),
    });
  return callLegacyFeedbackDialog(onDone, context, args);
}
//@ chunk-bzb0qnrm.js:5187-5293 fingerprint = call (0.643)
async function call_2(onDone, context, args) {
  let s = args.toolUseContext();
  return runRemotePluginHook(onDone, s, (recheck) =>
    resyncForMissingEntry(args, s.abortController.signal, recheck),
  );
}
export { callLegacyFeedbackDialog, call_2 };
