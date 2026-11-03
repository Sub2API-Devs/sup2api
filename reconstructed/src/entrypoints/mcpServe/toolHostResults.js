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
import { SERVE_MODE_VALUE, strippedPrivilegeFieldsNote, parseServeModeInput } from "./serveModeInput.js";
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
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";

//@ chunk-dz36xfxg.js:37128-38278 placement
async function runServedBashCall(e, n, callInput, r, i, s, a, d, k) {
  let l = k === "kept";
  let y = k === "moves_at_timeout";
  let filtered = SERVE_MODE_VALUE.filter(
    (K) =>
      K in
        {
          ...n,
        } && !(l && K === "run_in_background"),
  );
  let h = filtered.length > 0 ? [strippedPrivilegeFieldsNote(filtered)] : [];
  let { readFileState, entriesSetByCall, keysSetWithNoEntryBefore } = trackReadFileStateChanges(
    r.readFileState,
  );
  let S = await ranTool(
    e,
    l
      ? {
          ...callInput,
          run_in_background: true,
        }
      : callInput,
    {
      ...r,
      readFileState,
      ...((l || y) && {
        keptBackgroundShells: backgroundCommands.of(r.session.host).starterFor({
          toolUseId: r.toolUseId,
          agentId: r.agentId,
          description: typeof callInput.description === "string" ? callInput.description : undefined,
          movedAtTimeout: y,
        }),
      }),
    },
    i,
    denyNestedPermissionAsk,
    a,
    d,
  );
  let { changes, counts } = readFileStateChangesMeta(entriesSetByCall, e.name === BASH_TOOL_NAME);
  let v =
    "failure" in S
      ? {
          result: completedError(S.failure, "ran", h),
          answer: "tool_failed",
        }
      : outputAnswer(e, S.data, h, s);
  let D =
    e.name === FILE_WRITE_TOOL_NAME &&
    keysSetWithNoEntryBefore.size > 0 &&
    "data" in S &&
    isPlainObject(S.data) &&
    S.data.type === "update" &&
    !("unsent" in v);
  let I = withReadFileStateChanges(
    "unsent" in v && v.unsent === "result_too_large"
      ? completedError(resultTooLargeHint(e), "ran", h)
      : d && !("failure" in S)
        ? await withEditResult(v.result, S)
        : v.result,
    changes,
  );
  return {
    ...(counts !== undefined && {
      readFileStateChangeCounts: counts,
    }),
    ...("originalFileLeftOutReason" in v && {
      originalFileLeftOutReason: v.originalFileLeftOutReason,
    }),
    ...("diffLeftOut" in v && {
      diffLeftOut: v.diffLeftOut,
    }),
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
      return {
        kind: "invalid",
        message: `Permission to use ${e.name} has been denied.`,
        denied_by_rule: true,
      };
    let serveModeInput = parseServeModeInput(e, {
      ...n,
    });
    if (!serveModeInput.success)
      return {
        kind: "invalid",
        message: `InputValidationError: ${formatZodValidationError(e.name, serveModeInput.error)}`,
      };
    let i = await runValidateInput(e, serveModeInput.data, (s) => e.validateInput?.(s, t));
    return i.ok
      ? i
      : {
          kind: "invalid",
          message: i.verdict.message,
          ...(i.verdict.deniedByPermissionRule === true && {
            denied_by_rule: true,
          }),
        };
  } catch (error) {
    logUnexpectedThrow(e, error);
    return {
      refusal: "crashed_validation",
      message: `${e.name} was not run: this server failed while it validated the input (internal error). The error: ${formatToolErrorMessage(error)}`,
    };
  }
}
//@ chunk-dz36xfxg.js:39015-39071 placement
function notServedResult(message) {
  return refusedResult({
    code: "not_served",
    message,
  });
}
//@ chunk-dz36xfxg.js:39071-39117 placement
function notServedOutcome(outcome, message) {
  return {
    result: notServedResult(message),
    outcome,
  };
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
  return {
    result: {
      ...t,
      _meta: {
        ...t._meta,
        ...toolHostDecisionMeta(n),
      },
    },
    outcome: n.kind,
  };
}
//@ chunk-dz36xfxg.js:39477-39669 placement
function permissionOnlyOutcome(e) {
  switch (e.kind) {
    case "invalid":
      return e.denied_by_rule === true ? "denied_by_rule" : "validation_failed";
    case "deny":
      return "denied_by_rule";
    case "allow":
    case "ask":
      return "asked_in_session";
  }
}
//@ chunk-dz36xfxg.js:39669-41656 placement
/**
 * 处理只请求权限判定（不执行）的 ToolHost 调用：返回 requested/declined 等决定。
 */
async function answerToolHostPermissionRequest({
  name: e,
  meta,
  input,
  command,
  toolUseContext,
  launchPermissionContext,
}) {
  let a = rangeRaisedAtLaunch();
  let toolContainerStep = parseToolContainerStep(meta, a);
  if (toolContainerStep.kind !== "requested" || toolContainerStep.request.step !== "run")
    return {
      rejection: toolHostRefusalResult(
        e,
        toolContainerStep.kind === "requested" ||
          toolContainerStep.kind === "declined" ||
          toolContainerStep.kind === "absent" ||
          toolContainerStep.kind === "other_request"
          ? {
              kind: "malformed",
            }
          : toolContainerStep,
        a,
      ).message,
    };
  let { request } = toolContainerStep;
  if ("ws" in input || input.command !== command)
    return {
      rejection: `${e} was not run: its command is not the command of the Monitor call that was checked. Retrying won't help.`,
    };
  let toolByName = findToolByName(getAllBaseTools(), MONITOR);
  if (toolByName === undefined)
    return {
      rejection: `${e} was not run: this server does not decide permissions for a tool of that name.`,
    };
  let repoRulesForRequest = await readRepoRulesForRequest(e, meta);
  if (repoRulesForRequest.refused !== undefined)
    return {
      rejection: repoRulesForRequest.refused.message,
    };
  let { repoRules } = repoRulesForRequest;
  let { session } = toolUseContext;
  let { daemonCwd, intactDirectory, launchDirectory } = await resolveServeDirectories(session);
  let S = intactDirectory ?? launchDirectory;
  if (S === undefined)
    return {
      rejection: launchDirGoneMessage(e),
    };
  if (intactDirectory === undefined && request.agent_id === undefined) {
    if (!toolUseContext.abortController.signal.aborted) session.setCwd(S);
    return {
      rejection: startDirGoneMessage(e, S, daemonCwd),
    };
  }
  let P = session.withProject({
    cwd: S,
  });
  permissionCheckedCwds.of(P).set(P, S);
  let x = callServedTool(
    {
      ...toolUseContext,
      session: P,
    },
    request,
    launchPermissionContext,
    repoRules,
  );
  let classifierMayApprove = request.classifier_may_approve ?? [];
  let D = await runInRemoteCallFrameMain(S, async () => {
    let I = await precheckToolHostCall(toolByName, input, x);
    if ("refusal" in I || "kind" in I)
      return {
        message: I.message,
      };
    return request.approval === undefined
      ? checkToolHostPermission(toolByName, I, x, S, classifierMayApprove)
      : runWithNativeDoctor(
          toolByName,
          I,
          x,
          S,
          classifierMayApprove,
          request.approval,
          launchPermissionContext,
          repoRules,
        );
  });
  if (!("kind" in D))
    return {
      rejection: D.message,
    };
  switch (D.kind) {
    case "allow":
      break;
    case "crashed":
      return {
        rejection: `${toolByName.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      };
    case "ask":
      return {
        rejection: `${toolByName.name} was not run: a person has to approve it first, and the approval sent with it, if any, is not for this question. Check the Monitor again to have it asked. The check said: ${D.verdict.message}`,
      };
    case "deny":
    case "denied_by_policy":
    case "refused":
      return {
        rejection: D.message,
      };
  }
  if (D.callInput.command !== command)
    return {
      rejection: `${toolByName.name} was not run: the check gives another command to run than the one sent. Retrying won't help.`,
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
