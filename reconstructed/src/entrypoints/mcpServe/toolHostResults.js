/**
 * entrypoints/mcpServe/toolHostResults.ts
 *
 * 2.1.316 新增：工具宿主权限请求答复、预检与服务端 Bash 调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz36xfxg.js (8)
 * attribution: placement 8
 */
import { Zde, strippedPrivilegeFieldsNote, parseServeModeInput } from "./serveModeInput.js";
import {
  trackReadFileStateChanges,
  denyNestedPermissionAsk,
  readFileStateChangesMeta,
  withReadFileStateChanges,
  resultTooLargeHint,
  toolHostRefusalResult,
  resolveServeDirectories,
  launchDirGoneMessage,
  startDirGoneMessage,
  callServedTool,
  checkToolHostPermission,
  runWithNativeDoctor,
} from "./toolHostCall.js";
import {
  ranTool,
  completedError,
  outputAnswer,
  logUnexpectedThrow,
  refusedResult,
} from "./toolOutputRequest.js";
import { backgroundCommands } from "../../services/mcpServe/readCalls.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { withEditResult } from "./editResult.js";
import { withChangeWithoutReadEntry, toolHostDecisionMeta } from "./toolHostPermissionContext.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { formatZodValidationError, formatToolErrorMessage } from "../../utils/toolErrors.js";
import { runValidateInput } from "../../services/tools/toolExecution.js";
import { rangeRaisedAtLaunch } from "../mcp/toolHostInterface.js";
import { parseToolContainerStep, claimCallRun, releaseCallRun } from "../../services/mcpServe/callClaims.js";
import { findToolByName } from "../../Tool.js";
import { getAllBaseTools } from "../../tools.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { readRepoRulesForRequest } from "../../services/mcpServe/repoPermissionRules.js";
import { permissionCheckedCwds } from "../../utils/Shell.js";
import { Yg } from "../../remote/remoteMode.js";

//@ chunk-dz36xfxg.js:37128-38278 placement
async function runServedBashCall(e, n, t, r, i, s, a, d, k) {
  let l = k === "kept",
    y = k === "moves_at_timeout",
    filtered = Zde.filter((K) => K in { ...n } && !(l && K === "run_in_background")),
    h = filtered.length > 0 ? [strippedPrivilegeFieldsNote(filtered)] : [],
    {
      readFileState: readFileState,
      entriesSetByCall: entriesSetByCall,
      keysSetWithNoEntryBefore: keysSetWithNoEntryBefore,
    } = trackReadFileStateChanges(r.readFileState),
    S = await ranTool(
      e,
      l ? { ...t, run_in_background: !0 } : t,
      {
        ...r,
        readFileState: readFileState,
        ...((l || y) && {
          keptBackgroundShells: backgroundCommands
            .of(r.session.host)
            .starterFor({
              toolUseId: r.toolUseId,
              agentId: r.agentId,
              description: typeof t.description === "string" ? t.description : void 0,
              movedAtTimeout: y,
            }),
        }),
      },
      i,
      denyNestedPermissionAsk,
      a,
      d,
    ),
    { changes: changes, counts: counts } = readFileStateChangesMeta(
      entriesSetByCall,
      e.name === BASH_TOOL_NAME,
    ),
    v =
      "failure" in S
        ? { result: completedError(S.failure, "ran", h), answer: "tool_failed" }
        : outputAnswer(e, S.data, h, s),
    D =
      e.name === FILE_WRITE_TOOL_NAME &&
      keysSetWithNoEntryBefore.size > 0 &&
      "data" in S &&
      isPlainObject(S.data) &&
      S.data.type === "update" &&
      !("unsent" in v),
    I = withReadFileStateChanges(
      "unsent" in v && v.unsent === "result_too_large"
        ? completedError(resultTooLargeHint(e), "ran", h)
        : d && !("failure" in S)
          ? await withEditResult(v.result, S)
          : v.result,
      changes,
    );
  return {
    ...(counts !== void 0 && { readFileStateChangeCounts: counts }),
    ...("originalFileLeftOutReason" in v && { originalFileLeftOutReason: v.originalFileLeftOutReason }),
    ...("diffLeftOut" in v && { diffLeftOut: v.diffLeftOut }),
    result: D ? withChangeWithoutReadEntry(I) : I,
    outcome: "unsent" in v ? v.unsent : v.answer === "tool_failed" ? "tool_failed" : "output",
  };
}
//@ chunk-dz36xfxg.js:38278-39015 placement
async function precheckToolHostCall(e, n, t) {
  try {
    if (!e.isEnabled())
      return {
        refusal: "not_served",
        message: `${e.name} was not run: it is switched off in this server. Retrying won't help.`,
      };
    if (getDenyRuleForTool(getToolPermissionContext(t), e))
      return { kind: "invalid", message: `Permission to use ${e.name} has been denied.`, denied_by_rule: !0 };
    let r = parseServeModeInput(e, { ...n });
    if (!r.success)
      return {
        kind: "invalid",
        message: `InputValidationError: ${formatZodValidationError(e.name, r.error)}`,
      };
    let i = await runValidateInput(e, r.data, (s) => e.validateInput?.(s, t));
    return i.ok
      ? i
      : {
          kind: "invalid",
          message: i.verdict.message,
          ...(i.verdict.deniedByPermissionRule === !0 && { denied_by_rule: !0 }),
        };
  } catch (error) {
    return (
      logUnexpectedThrow(e, error),
      {
        refusal: "crashed_validation",
        message: `${e.name} was not run: this server failed while it validated the input (internal error). The error: ${formatToolErrorMessage(error)}`,
      }
    );
  }
}
//@ chunk-dz36xfxg.js:39015-39071 placement
function notServedResult(e) {
  return refusedResult({ code: "not_served", message: e });
}
//@ chunk-dz36xfxg.js:39071-39117 placement
function notServedOutcome(e, n) {
  return { result: notServedResult(n), outcome: e };
}
//@ chunk-dz36xfxg.js:39117-39285 placement
function barredCallOutcome(e) {
  return notServedOutcome(
    "barred_call",
    `${e.name} was not run: this session was already told that this call had not started, so it can no longer run. Send a new call.`,
  );
}
//@ chunk-dz36xfxg.js:39285-39477 placement
function permissionOnlyResult(e, n) {
  let t = completedError(
    "message" in n ? n.message : `${e.name} was not run: only a permission decision was asked for.`,
    permissionOnlyOutcome(n),
    [],
  );
  return { result: { ...t, _meta: { ...t._meta, ...toolHostDecisionMeta(n) } }, outcome: n.kind };
}
//@ chunk-dz36xfxg.js:39477-39669 placement
function permissionOnlyOutcome(e) {
  switch (e.kind) {
    case "invalid":
      return e.denied_by_rule === !0 ? "denied_by_rule" : "validation_failed";
    case "deny":
      return "denied_by_rule";
    case "allow":
    case "ask":
      return "asked_in_session";
  }
}
/**
 * 处理只请求权限判定（不执行）的 ToolHost 调用：返回 requested/declined 等决定。
 */
//@ chunk-dz36xfxg.js:39669-41656 placement
async function answerToolHostPermissionRequest({
  name: e,
  meta: meta,
  input: input,
  command: command,
  toolUseContext: toolUseContext,
  launchPermissionContext: launchPermissionContext,
}) {
  let a = rangeRaisedAtLaunch(),
    d = parseToolContainerStep(meta, a);
  if (d.kind !== "requested" || d.request.step !== "run")
    return {
      rejection: toolHostRefusalResult(
        e,
        d.kind === "requested" || d.kind === "declined" || d.kind === "absent" || d.kind === "other_request"
          ? { kind: "malformed" }
          : d,
        a,
      ).message,
    };
  let { request: request } = d;
  if ("ws" in input || input.command !== command)
    return {
      rejection: `${e} was not run: its command is not the command of the Monitor call that was checked. Retrying won't help.`,
    };
  let l = findToolByName(getAllBaseTools(), MONITOR);
  if (l === void 0)
    return {
      rejection: `${e} was not run: this server does not decide permissions for a tool of that name.`,
    };
  let y = await readRepoRulesForRequest(e, meta);
  if (y.refused !== void 0) return { rejection: y.refused.message };
  let { repoRules: repoRules } = y,
    { session: session } = toolUseContext,
    {
      daemonCwd: daemonCwd,
      intactDirectory: intactDirectory,
      launchDirectory: launchDirectory,
    } = await resolveServeDirectories(session),
    S = intactDirectory ?? launchDirectory;
  if (S === void 0) return { rejection: launchDirGoneMessage(e) };
  if (intactDirectory === void 0 && request.agent_id === void 0) {
    if (!toolUseContext.abortController.signal.aborted) session.setCwd(S);
    return { rejection: startDirGoneMessage(e, S, daemonCwd) };
  }
  let withProject = session.withProject({ cwd: S });
  permissionCheckedCwds.of(withProject).set(withProject, S);
  let x = callServedTool(
      { ...toolUseContext, session: withProject },
      request,
      launchPermissionContext,
      repoRules,
    ),
    v = request.classifier_may_approve ?? [],
    D = await Yg(S, async () => {
      let I = await precheckToolHostCall(l, input, x);
      if ("refusal" in I || "kind" in I) return { message: I.message };
      return request.approval === void 0
        ? checkToolHostPermission(l, I, x, S, v)
        : runWithNativeDoctor(l, I, x, S, v, request.approval, launchPermissionContext, repoRules);
    });
  if (!("kind" in D)) return { rejection: D.message };
  switch (D.kind) {
    case "allow":
      break;
    case "crashed":
      return {
        rejection: `${l.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      };
    case "ask":
      return {
        rejection: `${l.name} was not run: a person has to approve it first, and the approval sent with it, if any, is not for this question. Check the Monitor again to have it asked. The check said: ${D.verdict.message}`,
      };
    case "deny":
    case "denied_by_policy":
    case "refused":
      return { rejection: D.message };
  }
  if (D.callInput.command !== command)
    return {
      rejection: `${l.name} was not run: the check gives another command to run than the one sent. Retrying won't help.`,
    };
  return {
    toolUseContext: x,
    claim: () => claimCallRun(session, request.tool_use_id),
    release: () => releaseCallRun(session, request.tool_use_id),
  };
}

export {
  notServedResult,
  precheckToolHostCall,
  notServedOutcome,
  permissionOnlyResult,
  barredCallOutcome,
  runServedBashCall,
};
