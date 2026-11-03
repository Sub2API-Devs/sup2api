/**
 * commands/plan/plan.tsx
 *
 * /plan 实现：进入计划模式或显示/编辑当前计划
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plan/plan.tsx
 * pieces: chunk-ve85yyeb.js (3)
 * attribution: affinity 1, fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Title } from "../../components/design-system/Title.js";
import { Box, Text } from "../../ink/components/Text.js";
import { handlePlanModeTransition } from "../../bootstrap/state.js";
import { applyValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { prepareContextForPlanMode } from "../../utils/permissions/permissionSetup.js";
import { wt, ml, Jn } from "../../remote/remoteMode.js";
import { iAs, ModePushTimeoutError } from "../../remote/remotePermissionModeSync.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { createUserMessage } from "../../utils/messages.js";
import { withTimeout } from "../../utils/sleep.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { qa } from "../../utils/stripAnsi.js";
import { sLn } from "../../utils/stringUtils.js";
import { QFn } from "./_new/plan.helpers-h6f3.js";
import { peekPlanSlug, getPlanFilePath, notePlanFileForgotten, getPlanAsync } from "../../utils/plans.js";
import { editFileInEditor } from "../../utils/promptEditor.js";
import { logForDebugging } from "../../utils/debug.js";
import { wM } from "../../utils/editor.js";
import { toIDEDisplayName } from "../../utils/ide.js";

//@ chunk-ve85yyeb.js:12837-12861 affinity
var B = 15000,
  L = 1e4,
  F = 1e6;
//@ chunk-ve85yyeb.js:12861-13455 fingerprint = PlanDisplay (0.464)
function PlanDisplay(t0) {
  let E = w(10),
    { planContent: planContent, planPath: planPath, editorName: editorName } = t0,
    S;
  if (E[0] !== planPath)
    ((S = e(Title, { subtitle: planPath, children: "Current Plan" })), (E[0] = planPath), (E[1] = S));
  else S = E[1];
  let h;
  if (E[2] !== planContent)
    ((h = e(Box, { marginTop: 1, children: e(Text, { children: planContent }) })),
      (E[2] = planContent),
      (E[3] = h));
  else h = E[3];
  let d;
  if (E[4] !== editorName)
    ((d =
      editorName &&
      r(Box, {
        marginTop: 1,
        children: [
          e(Text, { dimColor: !0, children: '"/plan open"' }),
          e(Text, { dimColor: !0, children: " to edit this plan in " }),
          e(Text, { bold: !0, dimColor: !0, children: editorName }),
        ],
      })),
      (E[4] = editorName),
      (E[5] = d));
  else d = E[5];
  let c;
  if (E[6] !== S || E[7] !== h || E[8] !== d)
    ((c = r(Box, { flexDirection: "column", children: [S, h, d] })),
      (E[6] = S),
      (E[7] = h),
      (E[8] = d),
      (E[9] = c));
  else c = E[9];
  return c;
}
/**
 * /plan 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-ve85yyeb.js:13455-16570 fingerprint = call (0.414)
async function call(onDone, context, args) {
  let { getAppState: getAppState, setAppState: setAppState } = context,
    mode = getAppState().toolPermissionContext.mode,
    d = mode !== "plan";
  if (d)
    (handlePlanModeTransition(mode, "plan"),
      setAppState((i) => ({
        ...i,
        toolPermissionContext: applyValidatedPermissionUpdate(
          prepareContextForPlanMode(i.toolPermissionContext),
          { type: "setMode", mode: "plan", destination: "session" },
        ),
      })));
  if (wt()) {
    if (!ml()) return (onDone(d ? "Enabled plan mode" : "Already in plan mode."), null);
    let appState = Jn(),
      trimmed = args.trim();
    if (d && trimmed && trimmed !== "open" && trimmed !== "share") {
      try {
        await iAs(context.session, "plan", B);
      } catch (error) {
        let P = error instanceof ModePushTimeoutError;
        return (
          logFeatureBad("plan_remote_query", P ? "mode_push_timeout" : "mode_push_rejected"),
          onDone(
            P
              ? `Enabled plan mode locally, but the cloud session didn\u2019t confirm the switch in time \u2014 your description was not sent: ${trimmed}. The session may be having connection trouble; once it\u2019s responding again, send the description as a normal message.`
              : `The cloud session couldn\u2019t switch to plan mode, so your description was not sent: ${trimmed}`,
          ),
          null
        );
      }
      let p = createUserMessage({ content: trimmed, origin: { kind: "human" } });
      if ((context.setMessages((u) => [...u, p]), !(await appState.sendMessage(trimmed, { uuid: p.uuid }))))
        return (logFeatureBad("plan_remote_query", "send_failed"), onDone("Enabled plan mode"), null);
      return (logFeatureOk("plan_remote_query"), onDone("Enabled plan mode"), null);
    }
    if (trimmed.split(/\s+/)[0] === "open")
      return (
        logFeatureOk("plan_remote_open"),
        onDone(
          "The plan file lives in the cloud workspace, so /plan open can\u2019t open it in a local editor. Use /plan to view it; to change it, tell Claude what to revise, or edit the plan in the approval dialog when Claude finishes planning.",
        ),
        null
      );
    try {
      let p = await withTimeout(
        appState.sendControlRequest({ subtype: "get_plan" }),
        L,
        "get_plan timed out",
      );
      if (!p.exists || !p.content)
        return (
          logFeatureOk("plan_remote_view"),
          onDone(d ? "Enabled plan mode" : "Already in plan mode. No plan written yet."),
          null
        );
      logFeatureOk("plan_remote_view");
      let y = isBridgeOrTransport(context.session),
        content = p.content,
        P = (prev) =>
          e(PlanDisplay, {
            planContent: qa(content).slice(0, F),
            planPath: p.path !== void 0 && !prev ? sLn(qa(p.path)) : void 0,
            editorName: void 0,
          }),
        A = await QFn(P(y), { storageV5: context.storageV5 });
      if (!y && isBridgeOrTransport(context.session)) A = await QFn(P(!0), { storageV5: context.storageV5 });
      return (onDone(A), null);
    } catch (error) {
      let y = error instanceof Error ? error.message : String(error),
        included = y.includes("Unsupported control request subtype");
      return (
        logFeatureBad(
          "plan_remote_view",
          included ? "unsupported_subtype" : y.includes("get_plan timed out") ? "timeout" : "request_failed",
        ),
        onDone(
          d
            ? "Enabled plan mode"
            : included
              ? "Viewing plans in cloud sessions needs a newer session runtime."
              : "Couldn\u2019t fetch the plan from the cloud session \u2014 try again.",
        ),
        null
      );
    }
  }
  if (d) {
    let description = args.trim();
    if (description && description !== "open" && description !== "share")
      return (onDone("Enabled plan mode", { shouldQuery: !0 }), null);
    if (!peekPlanSlug()) return (onDone("Enabled plan mode"), null);
  }
  let planContent = getPlanFilePath();
  notePlanFileForgotten(planContent);
  let C = await getPlanAsync(void 0, context.storageV5);
  if (!C) return (onDone(d ? "Enabled plan mode" : "Already in plan mode. No plan written yet."), null);
  if (args.trim().split(/\s+/)[0] === "open") {
    let result = await editFileInEditor(planContent);
    notePlanFileForgotten(planContent);
    let l = isBridgeOrTransport(context.session);
    if (result.error) {
      if (l) logForDebugging(`/plan open failed: ${result.error}`, { level: "error" });
      onDone(l ? "Couldn't open the plan in the editor" : result.error);
    } else onDone(l ? "Opened plan in editor" : `Opened plan in editor: ${planContent}`);
    return null;
  }
  let editor = wM(),
    O = editor ? toIDEDisplayName(editor) : void 0,
    M = isBridgeOrTransport(context.session),
    T = (i) => e(PlanDisplay, { planContent: C, planPath: i ? void 0 : planContent, editorName: O }),
    N = await QFn(T(M), { storageV5: context.storageV5 });
  if (!M && isBridgeOrTransport(context.session)) N = await QFn(T(!0), { storageV5: context.storageV5 });
  return (onDone(N), null);
}
