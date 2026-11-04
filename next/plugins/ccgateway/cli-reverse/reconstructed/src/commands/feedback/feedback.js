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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { FeedbackQueue } from "./FeedbackQueue.js";
import { isFeedbackDraftsEnabled } from "../../services/feedbackDrafts.js";
import { createStore } from "../../state/store.js";
import { runRemotePluginHook } from "../../services/remoteTools/runPluginHook.js";
import { resyncForMissingEntry } from "../../services/remoteTools/commandRendering.js";

//@ chunk-seqjkch8.js:15835-16264 facade-majority (2.1.88 match: renderFeedbackComponent, 0.262)
function renderFeedbackComponent(
  context,
  abortController,
  messages,
  applyMessageOp,
  initialDescription = "",
  backgroundTasks = {},
  readFileState,
  commandName = "/feedback",
) {
  let mode = feedbackMode(commandName);
  if (mode.kind === "disabled") {
    context(mode.reason);
    return null;
  }
  let surveyFeedbackSource = takePendingSurveyFeedbackSource() ?? undefined;
  let send = createFeedbackStatusStore(mode.kind);
  return jsxProd_default(Feedback, {
    abortController,
    messages,
    initialDescription,
    onDone: context,
    applyMessageOp,
    backgroundTasks,
    mode: mode.kind,
    readFileState,
    surveyFeedbackSource,
    command: commandName,
    wholeTranscript:
      mode.kind === "bundle" &&
      (mode.cause === "share_switch" || (commandName === "/share" && env.CLAUDE_CODE_ENABLE_SHARE_BUNDLE)),
    send,
  });
}
//@ chunk-seqjkch8.js:16264-16378 layout
function renderFeedbackFromContext(onDone, caller, initialDescription, commandName) {
  return renderFeedbackComponent(
    onDone,
    createAbortController(),
    caller.messages,
    caller.applyMessageOp,
    initialDescription,
    {
      ...caller.taskRegistry.all(),
    },
    caller.readFileState,
    commandName,
  );
}
//@ chunk-seqjkch8.js:16378-16473 facade-majority
async function callLegacyFeedbackDialog(onDone, caller, arg, commandName = "/feedback") {
  let description = arg?.trim() === "public" ? "" : arg || "";
  return renderFeedbackFromContext(onDone, caller, description, commandName);
}
//@ chunk-seqjkch8.js:16473-16958 layout
/**
 * /feedback 入口：有手动对话框时直接显示，否则显示反馈队列，“新写”时打开反馈对话框。
 */
function FeedbackCommandView(props) {
  let $ = useMemoCache(10);
  let { onDone, caller, manualDialog } = props;
  let storeSelector = useStoreSelector(manualDialog);
  let store;
  if ($[0] !== caller.messages) {
    store = () => [...caller.messages];
    $[0] = caller.messages;
    $[1] = store;
  } else store = $[1];
  let [snapshot] = useState(store);
  if (storeSelector !== undefined) {
    return storeSelector;
  }
  let onWriteNew;
  if ($[2] !== caller || $[3] !== manualDialog || $[4] !== onDone) {
    onWriteNew = () => {
      if (manualDialog.getState() !== undefined) {
        return;
      }
      let element = renderFeedbackFromContext(onDone, caller, "", "/feedback");
      manualDialog.setState(() => element);
    };
    $[2] = caller;
    $[3] = manualDialog;
    $[4] = onDone;
    $[5] = onWriteNew;
  } else onWriteNew = $[5];
  let footer;
  if ($[6] !== snapshot || $[7] !== onDone || $[8] !== onWriteNew) {
    footer = jsxProd_default(FeedbackQueue, {
      messages: snapshot,
      onDone,
      onWriteNew,
    });
    $[6] = snapshot;
    $[7] = onDone;
    $[8] = onWriteNew;
    $[9] = footer;
  } else footer = $[9];
  return footer;
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
//@ chunk-bzb0qnrm.js:5187-5293 fingerprint (2.1.88 match: call, 0.643)
async function call_2(onDone, context, args) {
  let toolContext = args.toolUseContext();
  return runRemotePluginHook(onDone, toolContext, (recheck) =>
    resyncForMissingEntry(args, toolContext.abortController.signal, recheck),
  );
}
export { callLegacyFeedbackDialog, call_2, call, renderFeedbackComponent };
