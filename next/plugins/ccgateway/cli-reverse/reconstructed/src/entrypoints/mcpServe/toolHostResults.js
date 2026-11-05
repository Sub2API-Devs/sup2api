/**
 * entrypoints/mcpServe/toolHostResults.ts
 *
 * 2.1.316 新增：工具宿主权限请求答复、预检与服务端 Bash 调用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fb9qe48t.js (8)
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
import { isShellDirectoryTaken } from "./shellDirectoryHeld.js";
import { permissionCheckedCwds } from "../../utils/Shell.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";

//@ chunk-fb9qe48t.js:38900-40050 placement
async function runServedBashCall(
  tool,
  validated,
  callInput,
  toolUseContext,
  context,
  resultContext,
  wantsEditResult,
  callerLogsSharedEvents,
  backgrounding,
) {
  let isKept = backgrounding === "kept";
  let movesAtTimeout = backgrounding === "moves_at_timeout";
  let fields = SERVE_MODE_VALUE.filter(
    (field) =>
      field in
        {
          ...validated,
        } && !(isKept && field === "run_in_background"),
  );
  let notes = fields.length > 0 ? [strippedPrivilegeFieldsNote(fields)] : [];
  let { readFileState, entriesSetByCall, keysSetWithNoEntryBefore } = trackReadFileStateChanges(
    toolUseContext.readFileState,
  );
  let ran = await ranTool(
    tool,
    isKept
      ? {
          ...callInput,
          run_in_background: true,
        }
      : callInput,
    {
      ...toolUseContext,
      readFileState,
      ...((isKept || movesAtTimeout) && {
        keptBackgroundShells: backgroundCommands.of(toolUseContext.session.host).starterFor({
          toolUseId: toolUseContext.toolUseId,
          agentId: toolUseContext.agentId,
          description: typeof callInput.description === "string" ? callInput.description : undefined,
          movedAtTimeout: movesAtTimeout,
        }),
      }),
    },
    context,
    denyNestedPermissionAsk,
    wantsEditResult,
    callerLogsSharedEvents,
  );
  let { changes, counts } = readFileStateChangesMeta(entriesSetByCall, tool.name === BASH_TOOL_NAME);
  let answer =
    "failure" in ran
      ? {
          result: completedError(ran.failure, "ran", notes),
          answer: "tool_failed",
        }
      : outputAnswer(tool, ran.data, notes, resultContext);
  let writeWithoutRead =
    tool.name === FILE_WRITE_TOOL_NAME &&
    keysSetWithNoEntryBefore.size > 0 &&
    "data" in ran &&
    isPlainObject(ran.data) &&
    ran.data.type === "update" &&
    !("unsent" in answer);
  let finalResult = withReadFileStateChanges(
    "unsent" in answer && answer.unsent === "result_too_large"
      ? completedError(resultTooLargeHint(tool), "ran", notes)
      : callerLogsSharedEvents && !("failure" in ran)
        ? await withEditResult(answer.result, ran)
        : answer.result,
    changes,
  );
  return {
    ...(counts !== undefined && {
      readFileStateChangeCounts: counts,
    }),
    ...("originalFileLeftOutReason" in answer && {
      originalFileLeftOutReason: answer.originalFileLeftOutReason,
    }),
    ...("diffLeftOut" in answer && {
      diffLeftOut: answer.diffLeftOut,
    }),
    result: writeWithoutRead ? withChangeWithoutReadEntry(finalResult) : finalResult,
    outcome: "unsent" in answer ? answer.unsent : answer.answer === "tool_failed" ? "tool_failed" : "output",
  };
}
//@ chunk-fb9qe48t.js:40050-40786 placement
async function precheckToolHostCall(tool, input, toolUseContext) {
  try {
    if (!tool.isEnabled())
      return {
        refusal: "not_served",
        message: `${tool.name} was not run: it is switched off in this server. Retrying won't help.`,
      };
    if (getDenyRuleForTool(getToolPermissionContext(toolUseContext), tool))
      return {
        kind: "invalid",
        message: `Permission to use ${tool.name} has been denied.`,
        denied_by_rule: true,
      };
    let serveModeInput = parseServeModeInput(tool, {
      ...input,
    });
    if (!serveModeInput.success)
      return {
        kind: "invalid",
        message: `InputValidationError: ${formatZodValidationError(tool.name, serveModeInput.error)}`,
      };
    let validated = await runValidateInput(tool, serveModeInput.data, (input) =>
      tool.validateInput?.(input, toolUseContext),
    );
    return validated.ok
      ? validated
      : {
          kind: "invalid",
          message: validated.verdict.message,
          ...(validated.verdict.deniedByPermissionRule === true && {
            denied_by_rule: true,
          }),
        };
  } catch (error) {
    logUnexpectedThrow(tool, error);
    return {
      refusal: "crashed_validation",
      message: `${tool.name} was not run: this server failed while it validated the input (internal error). The error: ${formatToolErrorMessage(error)}`,
    };
  }
}
//@ chunk-fb9qe48t.js:40786-40842 placement
function notServedResult(message) {
  return refusedResult({
    code: "not_served",
    message,
  });
}
//@ chunk-fb9qe48t.js:40842-40888 placement
function notServedOutcome(outcome, message) {
  return {
    result: notServedResult(message),
    outcome,
  };
}
//@ chunk-fb9qe48t.js:40888-41056 placement
function barredCallOutcome(tool) {
  return notServedOutcome(
    "barred_call",
    `${tool.name} was not run: this session was already told that this call had not started, so it can no longer run. Send a new call.`,
  );
}
//@ chunk-fb9qe48t.js:41056-41248 placement
function permissionOnlyResult(tool, decision) {
  let result = completedError(
    "message" in decision
      ? decision.message
      : `${tool.name} was not run: only a permission decision was asked for.`,
    permissionOnlyOutcome(decision),
    [],
  );
  return {
    result: {
      ...result,
      _meta: {
        ...result._meta,
        ...toolHostDecisionMeta(decision),
      },
    },
    outcome: decision.kind,
  };
}
//@ chunk-fb9qe48t.js:41248-41440 placement
function permissionOnlyOutcome(decision) {
  switch (decision.kind) {
    case "invalid":
      return decision.denied_by_rule === true ? "denied_by_rule" : "validation_failed";
    case "deny":
      return "denied_by_rule";
    case "allow":
    case "ask":
      return "asked_in_session";
  }
}
//@ chunk-fb9qe48t.js:41440-43747 placement
/**
 * 处理只请求权限判定（不执行）的 ToolHost 调用：返回 requested/declined 等决定。
 */
async function answerToolHostPermissionRequest({
  name,
  meta,
  input,
  command,
  toolUseContext,
  launchPermissionContext,
}) {
  let range = rangeRaisedAtLaunch();
  let toolContainerStep = parseToolContainerStep(meta, range);
  if (toolContainerStep.kind !== "requested" || toolContainerStep.request.step !== "run")
    return {
      rejection: toolHostRefusalResult(
        name,
        toolContainerStep.kind === "requested" ||
          toolContainerStep.kind === "declined" ||
          toolContainerStep.kind === "absent" ||
          toolContainerStep.kind === "other_request"
          ? {
              kind: "malformed",
            }
          : toolContainerStep,
        range,
      ).message,
    };
  let { request } = toolContainerStep;
  if ("ws" in input || input.command !== command)
    return {
      rejection: `${name} was not run: its command is not the command of the Monitor call that was checked. Retrying won't help.`,
    };
  let tool = findToolByName(getAllBaseTools(), MONITOR);
  if (tool === undefined)
    return {
      rejection: `${name} was not run: this server does not decide permissions for a tool of that name.`,
    };
  let repoRulesForRequest = await readRepoRulesForRequest(name, meta);
  if (repoRulesForRequest.refused !== undefined)
    return {
      rejection: repoRulesForRequest.refused.message,
    };
  let { repoRules } = repoRulesForRequest;
  let { session } = toolUseContext;
  let { daemonCwd, intactDirectory, launchDirectory } = await resolveServeDirectories(session);
  let workingDir = intactDirectory ?? launchDirectory;
  if (workingDir === undefined)
    return {
      rejection: launchDirGoneMessage(name),
    };
  if (intactDirectory === undefined && request.agent_id === undefined) {
    if (!toolUseContext.abortController.signal.aborted) session.setCwd(workingDir);
    return {
      rejection: startDirGoneMessage(name, workingDir, daemonCwd),
    };
  }
  if (intactDirectory === undefined && isShellDirectoryTaken(session, daemonCwd))
    return {
      rejection: `${name} was not run: the directory it was to start in is gone (deleted, moved, replaced by a link, or unreadable). Your next shell command will be refused as well, and its answer names the directory that calls start in from then on. Then send this call again. What is gone: ${daemonCwd}`,
    };
  let projectSession = session.withProject({
    cwd: workingDir,
  });
  permissionCheckedCwds.of(projectSession).set(projectSession, workingDir);
  let toolUseContext_2 = callServedTool(
    {
      ...toolUseContext,
      session: projectSession,
    },
    request,
    launchPermissionContext,
    repoRules,
  );
  let classifierMayApprove = request.classifier_may_approve ?? [];
  let decision = await runInRemoteCallFrameMain(workingDir, async () => {
    let precheck = await precheckToolHostCall(tool, input, toolUseContext_2);
    if ("refusal" in precheck || "kind" in precheck)
      return {
        message: precheck.message,
      };
    return request.approval === undefined
      ? checkToolHostPermission(tool, precheck, toolUseContext_2, workingDir, classifierMayApprove)
      : runWithNativeDoctor(
          tool,
          precheck,
          toolUseContext_2,
          workingDir,
          classifierMayApprove,
          request.approval,
          launchPermissionContext,
          repoRules,
        );
  });
  if (!("kind" in decision))
    return {
      rejection: decision.message,
    };
  switch (decision.kind) {
    case "allow":
      break;
    case "crashed":
      return {
        rejection: `${tool.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
      };
    case "ask":
      return {
        rejection: `${tool.name} was not run: a person has to approve it first, and the approval sent with it, if any, is not for this question. Check the Monitor again to have it asked. The check said: ${decision.verdict.message}`,
      };
    case "deny":
    case "denied_by_policy":
    case "refused":
      return {
        rejection: decision.message,
      };
  }
  if (decision.callInput.command !== command)
    return {
      rejection: `${tool.name} was not run: the check gives another command to run than the one sent. Retrying won't help.`,
    };
  return {
    toolUseContext: toolUseContext_2,
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
  answerToolHostPermissionRequest,
};
