/**
 * commands/plan/plan.tsx
 *
 * /plan 实现：进入计划模式或显示/编辑当前计划
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plan/plan.tsx
 * pieces: chunk-h6f3feta.js (1), chunk-ve85yyeb.js (3)
 * attribution: placement 1, affinity 1, fingerprint 2
 */
import { renderToAnsiString } from "../../utils/staticRender.js";
import { stripAnsi, stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Title } from "../../components/design-system/Title.js";
import { Box, Text } from "../../ink/components/Text.js";
import { handlePlanModeTransition } from "../../bootstrap/state.js";
import { applyValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { prepareContextForPlanMode } from "../../utils/permissions/permissionSetup.js";
import {
  isRemoteSessionAvailable,
  isRemoteControlChannelAvailable,
  getRemoteCaps,
} from "../../remote/remoteMode.js";
import { registerPendingModeAck, ModePushTimeoutError } from "../../remote/remotePermissionModeSync.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createUserMessage } from "../../utils/messages.js";
import { withTimeout } from "../../utils/sleep.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { stripLineBreaks } from "../../utils/stringUtils.js";
import { peekPlanSlug, getPlanFilePath, notePlanFileForgotten, getPlanAsync } from "../../utils/plans.js";
import { editFileInEditor } from "../../utils/promptEditor.js";
import { logForDebugging } from "../../utils/debug.js";
import { resolveEditorCommand } from "../../utils/editor.js";
import { toIDEDisplayName } from "../../utils/ide.js";

//@ chunk-h6f3feta.js:1126-1184 placement
/**
 * 把 React 元素渲染成 ANSI 字符串（plan 预览用）。
 */
async function renderPlanAnsi(element, options) {
  let rendered = await renderToAnsiString(element, options);
  return stripAnsi(rendered);
}
//@ chunk-ve85yyeb.js:12837-12861 affinity
var PLAN_SAVE_TIMEOUT_MS = 15000;
var PLAN_EDIT_TIMEOUT_MS = 1e4;
var MAX_PLAN_CONTENT_CHARS = 1e6;
//@ chunk-ve85yyeb.js:12861-13455 fingerprint (2.1.88 match: PlanDisplay, 0.464)
function PlanDisplay(props) {
  let $ = useMemoCache(10);
  let { planContent, planPath, editorName } = props;
  let body;
  if ($[0] !== planPath) {
    body = jsxProd_default(Title, {
      subtitle: planPath,
      children: "Current Plan",
    });
    $[0] = planPath;
    $[1] = body;
  } else body = $[1];
  let contentBody;
  if ($[2] !== planContent) {
    contentBody = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        children: planContent,
      }),
    });
    $[2] = planContent;
    $[3] = contentBody;
  } else contentBody = $[3];
  let editorBody;
  if ($[4] !== editorName) {
    editorBody =
      editorName &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: '"/plan open"',
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: " to edit this plan in ",
          }),
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: editorName,
          }),
        ],
      });
    $[4] = editorName;
    $[5] = editorBody;
  } else editorBody = $[5];
  let t5;
  if ($[6] !== body || $[7] !== contentBody || $[8] !== editorBody) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [body, contentBody, editorBody],
    });
    $[6] = body;
    $[7] = contentBody;
    $[8] = editorBody;
    $[9] = t5;
  } else t5 = $[9];
  return t5;
}
//@ chunk-ve85yyeb.js:13455-16570 fingerprint (2.1.88 match: call, 0.414)
/**
 * /plan 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  let { getAppState, setAppState } = context;
  let mode = getAppState().toolPermissionContext.mode;
  let leavesPlanMode = mode !== "plan";
  if (leavesPlanMode) {
    handlePlanModeTransition(mode, "plan");
    setAppState((prev) => ({
      ...prev,
      toolPermissionContext: applyValidatedPermissionUpdate(
        prepareContextForPlanMode(prev.toolPermissionContext),
        {
          type: "setMode",
          mode: "plan",
          destination: "session",
        },
      ),
    }));
  }
  if (isRemoteSessionAvailable()) {
    if (!isRemoteControlChannelAvailable()) {
      onDone(leavesPlanMode ? "Enabled plan mode" : "Already in plan mode.");
      return null;
    }
    let appState = getRemoteCaps();
    let trimmed = args.trim();
    if (leavesPlanMode && trimmed && trimmed !== "open" && trimmed !== "share") {
      try {
        await registerPendingModeAck(context.session, "plan", PLAN_SAVE_TIMEOUT_MS);
      } catch (error) {
        let pushTimeout = error instanceof ModePushTimeoutError;
        logFeatureBad("plan_remote_query", pushTimeout ? "mode_push_timeout" : "mode_push_rejected");
        onDone(
          pushTimeout
            ? `Enabled plan mode locally, but the cloud session didn\u2019t confirm the switch in time \u2014 your description was not sent: ${trimmed}. The session may be having connection trouble; once it\u2019s responding again, send the description as a normal message.`
            : `The cloud session couldn\u2019t switch to plan mode, so your description was not sent: ${trimmed}`,
        );
        return null;
      }
      let userMessage = createUserMessage({
        content: trimmed,
        origin: {
          kind: "human",
        },
      });
      context.setMessages((prev) => [...prev, userMessage]);
      if (
        !(await appState.sendMessage(trimmed, {
          uuid: userMessage.uuid,
        }))
      ) {
        logFeatureBad("plan_remote_query", "send_failed");
        onDone("Enabled plan mode");
        return null;
      }
      logFeatureOk("plan_remote_query");
      onDone("Enabled plan mode");
      return null;
    }
    if (trimmed.split(/\s+/)[0] === "open") {
      logFeatureOk("plan_remote_open");
      onDone(
        "The plan file lives in the cloud workspace, so /plan open can\u2019t open it in a local editor. Use /plan to view it; to change it, tell Claude what to revise, or edit the plan in the approval dialog when Claude finishes planning.",
      );
      return null;
    }
    try {
      let planResult = await withTimeout(
        appState.sendControlRequest({
          subtype: "get_plan",
        }),
        PLAN_EDIT_TIMEOUT_MS,
        "get_plan timed out",
      );
      if (!planResult.exists || !planResult.content) {
        logFeatureOk("plan_remote_view");
        onDone(leavesPlanMode ? "Enabled plan mode" : "Already in plan mode. No plan written yet.");
        return null;
      }
      logFeatureOk("plan_remote_view");
      let prev = isBridgeOrTransport(context.session);
      let content = planResult.content;
      let renderPlan = (prev) =>
        jsxProd_default(PlanDisplay, {
          planContent: stripAnsiPerLine(content).slice(0, MAX_PLAN_CONTENT_CHARS),
          planPath:
            planResult.path !== undefined && !prev
              ? stripLineBreaks(stripAnsiPerLine(planResult.path))
              : undefined,
          editorName: undefined,
        });
      let ansi = await renderPlanAnsi(renderPlan(prev), {
        storageV5: context.storageV5,
      });
      if (!prev && isBridgeOrTransport(context.session))
        ansi = await renderPlanAnsi(renderPlan(true), {
          storageV5: context.storageV5,
        });
      onDone(ansi);
      return null;
    } catch (error) {
      let errorText = error instanceof Error ? error.message : String(error);
      let included = errorText.includes("Unsupported control request subtype");
      logFeatureBad(
        "plan_remote_view",
        included
          ? "unsupported_subtype"
          : errorText.includes("get_plan timed out")
            ? "timeout"
            : "request_failed",
      );
      onDone(
        leavesPlanMode
          ? "Enabled plan mode"
          : included
            ? "Viewing plans in cloud sessions needs a newer session runtime."
            : "Couldn\u2019t fetch the plan from the cloud session \u2014 try again.",
      );
      return null;
    }
  }
  if (leavesPlanMode) {
    let description = args.trim();
    if (description && description !== "open" && description !== "share") {
      onDone("Enabled plan mode", {
        shouldQuery: true,
      });
      return null;
    }
    if (!peekPlanSlug()) {
      onDone("Enabled plan mode");
      return null;
    }
  }
  let planContent = getPlanFilePath();
  notePlanFileForgotten(planContent);
  let plan = await getPlanAsync(undefined, context.storageV5);
  if (!plan) {
    onDone(leavesPlanMode ? "Enabled plan mode" : "Already in plan mode. No plan written yet.");
    return null;
  }
  if (args.trim().split(/\s+/)[0] === "open") {
    let result = await editFileInEditor(planContent);
    notePlanFileForgotten(planContent);
    let isBridge = isBridgeOrTransport(context.session);
    if (result.error) {
      if (isBridge)
        logForDebugging(`/plan open failed: ${result.error}`, {
          level: "error",
        });
      onDone(isBridge ? "Couldn't open the plan in the editor" : result.error);
    } else onDone(isBridge ? "Opened plan in editor" : `Opened plan in editor: ${planContent}`);
    return null;
  }
  let editor = resolveEditorCommand();
  let editorName = editor ? toIDEDisplayName(editor) : undefined;
  let isBridge_2 = isBridgeOrTransport(context.session);
  let renderPlan = (prev) =>
    jsxProd_default(PlanDisplay, {
      planContent: plan,
      planPath: prev ? undefined : planContent,
      editorName,
    });
  let ansi = await renderPlanAnsi(renderPlan(isBridge_2), {
    storageV5: context.storageV5,
  });
  if (!isBridge_2 && isBridgeOrTransport(context.session))
    ansi = await renderPlanAnsi(renderPlan(true), {
      storageV5: context.storageV5,
    });
  onDone(ansi);
  return null;
}
export { call };
