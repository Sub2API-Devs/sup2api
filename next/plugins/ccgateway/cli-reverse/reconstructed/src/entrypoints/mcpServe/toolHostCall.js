/**
 * entrypoints/mcpServe/toolHostCall.ts
 *
 * 2.1.316 新增：工具宿主调用执行（权限检查、拒绝结果、原生诊断）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fb9qe48t.js (23)
 * attribution: placement 23
 */
import { normalize } from "path";
import { realpath } from "fs/promises";
import { countWhere } from "../../utils/collections.js";
import { MAX_DIRECTORY_PATH_LENGTH } from "../../utils/permissions/permissionContextSerialization.js";
import {
  MAX_REFS,
  READ_FILE_STATE_META,
  withShellDirectoryMeta,
  isValidSettingsFileIdentity,
  serializeDecisionReason,
  isBashToolName,
  resolveToolHostAsk,
  describeToolHostAsk,
  askRuleFromRule,
  settingsFileContentHash,
  offersAlwaysAllow,
  allowRulesFromUpdates,
  isPlanModeWrite,
  isRaisedAllowReason,
} from "./toolHostPermissionContext.js";
import {
  completedError,
  bringsToolHostPermissionRequest,
  toolNameForAnalytics,
  acknowledgedResult,
  buildAnnouncedCapability,
  refusedResult,
  isAnsweredWithOutput,
  logUnexpectedThrow,
  failedResult,
} from "./toolOutputRequest.js";
import {
  runStepToolUseId,
  findKeptCallAnswer,
  parseToolContainerStep,
  keepCallAnswer,
  hasRunApproval,
  isMainAgentRun,
  mcpServeCallState,
  readFileStateFor,
  claimCallRun,
  releaseCallRun,
  mcpServeSessionId,
} from "../../services/mcpServe/callClaims.js";
import { stableHashWithSalt } from "../../utils/stableHash.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isKnownRun, isCallRunBarred } from "../../services/mcpServe/readCalls.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { rangeRaisedAtLaunch } from "../mcp/toolHostInterface.js";
import { SERVE_MODE_KEYS, serveModeDefaultAppState } from "./serveModeInput.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { findToolByName } from "../../Tool.js";
import { getAllBaseTools } from "../../tools.js";
import { readRepoRulesForRequest } from "../../services/mcpServe/repoPermissionRules.js";
import {
  notServedResult,
  precheckToolHostCall,
  notServedOutcome,
  permissionOnlyResult,
  barredCallOutcome,
  runServedBashCall,
} from "./toolHostResults.js";
import { isShellDirectoryTaken } from "./shellDirectoryHeld.js";
import { permissionCheckedCwds } from "../../utils/Shell.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { readBaselineOfCall } from "./readBaselineOfCall.js";
import { asksForEditResult } from "./editResult.js";
import { identity } from "../../utils/pathClassification.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { poolCanRead } from "../../utils/permissions/filesystem.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { classifyBashBackgrounding } from "../../tools/BashTool/backgroundPolicy.js";
import {
  checkDeclarativePermission,
  PERMISSION_CHECK_CRASHED_REASON,
  serverHeldShellAllowSource,
  createPermissionRequestMessage,
} from "../../utils/permissions/permissions.js";
import { isOutsideReadsBlockedAsk } from "../../types/permissions.js";
import { isEmptyObject } from "../../utils/toolInputPlaceholder.js";
import { restoreCallInput } from "../../services/tools/toolExecution.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";

//@ chunk-fb9qe48t.js:24872-25193 placement
function trackReadFileStateChanges(readFileState) {
  let entriesSetByCall = new Map();
  let keysSetWithNoEntryBefore = new Set();
  return {
    entriesSetByCall,
    keysSetWithNoEntryBefore,
    readFileState: new Proxy(readFileState, {
      get: (target, prop, receiver) => {
        if (prop === "set")
          return (key, entry) => {
            if (!target.has(key)) keysSetWithNoEntryBefore.add(normalize(key));
            target.set(key, entry);
            let stored = target.get(key);
            if (stored !== undefined) entriesSetByCall.set(normalize(key), stored);
            return receiver;
          };
        let value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
}
//@ chunk-fb9qe48t.js:25193-25390 placement
function readStateMetaFor(entry) {
  if (entry.isPartialView)
    return {
      is_partial_view: true,
    };
  return entry.readBaseline === undefined || (entry.offset ?? 1) > 1
    ? {}
    : {
        ...entry.readBaseline,
        ...(entry.contentNotInModelContext && {
          content_not_in_model_context: true,
        }),
      };
}
//@ chunk-fb9qe48t.js:25390-25765 placement
function readFileStateTelemetry(changes, readFileStateNotSentCount) {
  return {
    read_file_state_whole_file_count: countWhere(changes, (change) => change.sha256 !== undefined),
    read_file_state_not_in_model_context_count: countWhere(
      changes,
      (change) => change.sha256 !== undefined && change.content_not_in_model_context === true,
    ),
    read_file_state_partial_view_count: countWhere(changes, (change) => change.is_partial_view === true),
    read_file_state_path_only_count: countWhere(
      changes,
      (change) => change.sha256 === undefined && !change.is_partial_view,
    ),
    read_file_state_not_sent_count: readFileStateNotSentCount,
  };
}
//@ chunk-fb9qe48t.js:25765-25944 placement
function readFileStateChangesMeta(entriesSetByCall, isBash) {
  let sliced = [...entriesSetByCall]
    .filter(([path]) => path.length <= MAX_DIRECTORY_PATH_LENGTH)
    .slice(0, MAX_REFS);
  let changes = sliced.map(([path, entry]) => ({
    path,
    ...(isBash ? {} : readStateMetaFor(entry)),
  }));
  return {
    changes,
    counts:
      entriesSetByCall.size === 0
        ? undefined
        : readFileStateTelemetry(changes, entriesSetByCall.size - sliced.length),
  };
}
//@ chunk-fb9qe48t.js:25944-26016 placement
function withReadFileStateChanges(result, changes) {
  return changes.length === 0
    ? result
    : {
        ...result,
        _meta: {
          ...result._meta,
          [READ_FILE_STATE_META]: changes,
        },
      };
}
//@ chunk-fb9qe48t.js:26016-26273 placement
var TOOL_HOST_REFUSAL_CODES = new Set([
  "already_started",
  "not_served",
  "background_under_a_rule",
  "barred_call",
  "outside_reads_blocked",
  "ask_too_large",
  "start_directory_changed",
  "ask_changed",
  "approver_not_user",
]);
var HOST_CALL_RESULT_KINDS = new Set(["invalid", "allow", "deny", "ask", "output", "tool_failed"]);
//@ chunk-fb9qe48t.js:26273-27365 placement
function toolHostRefusalResult(toolName, refusal, range) {
  switch (refusal.kind) {
    case "too_large":
      return {
        code: "invalid_request",
        message: `${toolName} was not run: the permission context sent with it is larger than this server takes. Retrying won't help.`,
      };
    case "unlisted_restriction_on":
    case "malformed":
      return {
        code: "invalid_request",
        message: `${toolName} was not run: this server could not read the permission request sent with it. Retrying won't help.`,
      };
    case "not_honoured":
      return {
        code: "invalid_request",
        message: `${toolName} was not run: the permission request sent with it contains ${refusal.part}, which this server does not accept. Retrying won't help.`,
      };
    case "session_too_old":
      return {
        code: "unsupported_protocol",
        message: `${toolName} was not run: this session speaks version ${refusal.session.version} of the interface to this server, which works with version ${range.min_version} or later. Retrying won't help: tell the user.`,
      };
    case "daemon_too_old":
      return {
        code: "unsupported_protocol",
        message: `${toolName} was not run: this session works with version ${refusal.session.min_version} or later of the interface to this server, which speaks version ${range.version}. Retrying won't help: tell the user.`,
      };
  }
}
//@ chunk-fb9qe48t.js:27365-27576 placement
function duplicateCallError(name) {
  return completedError(
    `${name} was not run again: this very call was already started here once. It may have finished, failed or been cut off: check what it did before you send a new call.`,
    "duplicate_call",
    [],
  );
}
//@ chunk-fb9qe48t.js:27576-28337 placement
/**
 * mcp serve 的 ToolHost 调用入口：带权限上下文的请求先做权限判定，否则直接执行。
 */
async function handleToolHostCall(request) {
  let runStepToolUseId_2 = bringsToolHostPermissionRequest(request.meta)
    ? runStepToolUseId(request.meta)
    : undefined;
  if (runStepToolUseId_2 === undefined) return runToolHostCall(request);
  let callHandle = request.newCall();
  let { abortController, session } = callHandle.toolUseContext;
  let callHash = stableHashWithSalt(request.name, request.args ?? {});
  let keptCallAnswer = findKeptCallAnswer(session, runStepToolUseId_2, callHash);
  let logAttrs = {
    tool: toolNameForAnalytics(request.name),
    step: lit("run"),
  };
  if (keptCallAnswer === undefined && isKnownRun(session, runStepToolUseId_2)) {
    callHandle.release();
    logFeatureSad("mcp_serve_tool_host_permission", "already_started", logAttrs);
    return duplicateCallError(request.name);
  }
  if (
    keptCallAnswer === undefined ||
    parseToolContainerStep(request.meta, rangeRaisedAtLaunch()).kind !== "requested"
  )
    return keepCallAnswer(
      session,
      runStepToolUseId_2,
      {
        call: callHash,
        stop: () => abortController.abort(),
      },
      () =>
        runToolHostCall({
          ...request,
          newCall: () => ({
            ...callHandle,
            release: () => {},
          }),
        }).finally(callHandle.release),
    );
  logFeatureOk("mcp_serve_tool_host_permission", {
    ...logAttrs,
    outcome: lit("joined"),
  });
  abortController.signal.addEventListener("abort", keptCallAnswer.stop, {
    once: true,
  });
  if (abortController.signal.aborted) keptCallAnswer.stop();
  using heartbeatScope = request.startHeartbeat();
  try {
    return await keptCallAnswer.answer;
  } finally {
    abortController.signal.removeEventListener("abort", keptCallAnswer.stop);
    callHandle.release();
  }
}
//@ chunk-fb9qe48t.js:28337-31552 placement
/**
 * 执行一次 ToolHost 工具调用：校验输入、按客户端权限上下文判定、运行工具并整理结果（含 readFileState 变化）。
 */
async function runToolHostCall({
  name,
  args,
  meta,
  servedTools,
  launchPermissionContext,
  newCall,
  startHeartbeat,
  callerLogsSharedEvents,
}) {
  if (!bringsToolHostPermissionRequest(meta)) return;
  let range = rangeRaisedAtLaunch();
  let refusal = parseToolContainerStep(meta, range);
  if (refusal.kind === "absent" || refusal.kind === "other_request") return;
  let tool = toolNameForAnalytics(name);
  if (refusal.kind === "declined") {
    logFeatureOk("mcp_serve_tool_host_permission", {
      tool,
      step: fromEnum(refusal.request.step),
      outcome: lit("acknowledged"),
    });
    return acknowledgedResult(refusal.request.ask_digest);
  }
  let servedTools_2 = servedTools();
  if (
    launchPermissionContext === undefined ||
    buildAnnouncedCapability(() => servedTools_2, launchPermissionContext) === undefined
  ) {
    logFeatureSad("mcp_serve_tool_host_permission", "announces_nothing", {
      tool,
    });
    return refusedResult({
      code: "unsupported_protocol",
      message: `${name} was not run: this server was launched so that it decides no permissions. Retrying won't help.`,
    });
  }
  if (refusal.kind !== "requested") {
    logFeatureSad("mcp_serve_tool_host_permission", refusal.kind, {
      tool,
      daemon_interface_min_version: range.min_version,
      ...(refusal.kind === "not_honoured" && {
        part: fromEnum(refusal.part),
      }),
    });
    return refusedResult(toolHostRefusalResult(name, refusal, range));
  }
  let { request } = refusal;
  let logAttrs = {
    tool,
    step: fromEnum(request.step),
    ...(hasRunApproval(request) && {
      approved: true,
    }),
  };
  let tool_2 =
    SERVE_MODE_KEYS.has(name) ||
    (name === MONITOR &&
      request.step === "check" &&
      !(
        "ws" in
        {
          ...args,
        }
      ))
      ? findToolByName(getAllBaseTools(), name)
      : isAnsweredWithOutput(name)
        ? findToolByName(servedTools_2, name)
        : undefined;
  if (tool_2 === undefined) {
    logFeatureSad("mcp_serve_tool_host_permission", "not_served", logAttrs);
    return refusedResult({
      code: "not_served",
      message: `${name} was not run: this server does not decide permissions for a tool of that name.`,
    });
  }
  let { toolUseContext, release } = newCall();
  try {
    let session = toolUseContext.session;
    let { signal } = toolUseContext.abortController;
    let isMainAgent = isMainAgentRun(request);
    let repoRulesForRequest = await readRepoRulesForRequest(name, meta);
    if (repoRulesForRequest.refused !== undefined) {
      (repoRulesForRequest.refused.cause === "repo_rules_read_failed" ? logFeatureBad : logFeatureSad)(
        "mcp_serve_tool_host_permission",
        repoRulesForRequest.refused.cause,
        logAttrs,
      );
      return notServedResult(repoRulesForRequest.refused.message);
    }
    let { repoRules } = repoRulesForRequest;
    let { daemonCwd, intactDirectory, launchDirectory } = await resolveServeDirectories(session);
    let workingDir = intactDirectory ?? launchDirectory;
    if (workingDir === undefined) {
      logFeatureSad("mcp_serve_tool_host_permission", "launch_directory_gone", logAttrs);
      return notServedResult(launchDirGoneMessage(name));
    }
    if (
      intactDirectory === undefined &&
      (isMainAgent || (request.step === "run" && isShellDirectoryTaken(session, daemonCwd)))
    ) {
      if (!signal.aborted) {
        logFeatureSad("mcp_serve_tool_host_permission", "start_directory_gone", logAttrs);
        session.setCwd(workingDir);
        mcpServeCallState.of(session).shell.goneUntoldToMainAgent = isMainAgent ? undefined : daemonCwd;
      }
      return withShellDirectoryMeta(
        notServedResult(startDirGoneMessage(name, workingDir, daemonCwd)),
        workingDir,
      );
    }
    let { shell } = mcpServeCallState.of(session);
    if (isMainAgent && shell.goneUntoldToMainAgent !== undefined && !signal.aborted) {
      let goneUntoldToMainAgent = shell.goneUntoldToMainAgent;
      shell.goneUntoldToMainAgent = undefined;
      logFeatureSad("mcp_serve_tool_host_permission", "start_directory_gone", logAttrs);
      return withShellDirectoryMeta(
        notServedResult(startDirGoneMessage(name, workingDir, goneUntoldToMainAgent)),
        workingDir,
      );
    }
    let projectSession = session.withProject({
      cwd: workingDir,
    });
    permissionCheckedCwds.of(projectSession).set(projectSession, getSessionProject(projectSession).cwd);
    let outcome = await runInRemoteCallFrameMain(workingDir, async () =>
      runPermissionedToolHostCall(
        tool_2,
        args,
        request,
        {
          ...callServedTool(
            {
              ...toolUseContext,
              session: projectSession,
            },
            request,
            launchPermissionContext,
            repoRules,
          ),
          carriedReadBaseline: readBaselineOfCall(meta),
        },
        launchPermissionContext,
        repoRules,
        startHeartbeat,
        callerLogsSharedEvents,
        asksForEditResult(name, meta),
        isValidSettingsFileIdentity(meta),
      ),
    ).catch((error) => {
      if (signal.aborted) throw error;
      logUnexpectedThrow(tool_2, error);
      return {
        result: failedResult(
          `${name}: this server failed while it handled the call (internal error). Check what it changed before running it again.`,
          [],
        ),
        outcome: "crashed_request",
      };
    });
    if (!signal.aborted) {
      let { cwd } = getSessionProject(projectSession);
      let cwdMoved = isMainAgent && cwd !== workingDir;
      if (cwdMoved) session.setCwd(cwd);
      let attrs = {
        ...logAttrs,
        ...outcome.readFileStateChangeCounts,
        ...(outcome.originalFileLeftOutReason && {
          original_file_left_out: fromEnum(outcome.originalFileLeftOutReason),
        }),
        ...(outcome.diffLeftOut && {
          diff_left_out: fromEnum(outcome.diffLeftOut),
        }),
        ...(outcome.settingsWriteSuspicion && {
          settings_write_reason: fromEnum(outcome.settingsWriteSuspicion.reason),
        }),
        ...(outcome.settingsWriteSuspicion?.isHoldLifted && {
          settings_write_hold_lifted: true,
        }),
        ...(cwdMoved && {
          directory: fromEnum("moved"),
        }),
        ...(intactDirectory === undefined && {
          directory: fromEnum("launch_while_gone"),
        }),
      };
      if (HOST_CALL_RESULT_KINDS.has(outcome.outcome))
        logFeatureOk("mcp_serve_tool_host_permission", {
          ...attrs,
          outcome: fromEnum(outcome.outcome),
        });
      else if (TOOL_HOST_REFUSAL_CODES.has(outcome.outcome))
        logFeatureSad("mcp_serve_tool_host_permission", outcome.outcome, attrs);
      else logFeatureBad("mcp_serve_tool_host_permission", outcome.outcome, attrs);
    }
    return isMainAgent
      ? withShellDirectoryMeta(outcome.result, getSessionProject(session).cwd)
      : outcome.result;
  } finally {
    release();
  }
}
//@ chunk-fb9qe48t.js:31552-31721 placement
function launchDirGoneMessage(toolName) {
  return `${toolName} was not run: the directory that this server was started in is gone (deleted, moved, replaced by a link, or unreadable). Retrying won't help.`;
}
//@ chunk-fb9qe48t.js:31721-31982 placement
function startDirGoneMessage(toolName, nextDir, gonePath) {
  return `${toolName} was not run: the directory it was to start in is gone (deleted, moved, replaced by a link, or unreadable). The next call starts in ${nextDir}. Check that this call still does what you mean there, then send it again. What is gone: ${gonePath}`;
}
//@ chunk-fb9qe48t.js:31982-32063 placement
async function canonicalDir(dir) {
  try {
    return identity(await realpath(`${dir}/`)) === dir ? dir : undefined;
  } catch {
    return;
  }
}
//@ chunk-fb9qe48t.js:32063-32203 placement
async function resolveServeDirectories(session) {
  let { cwd, originalCwd } = getSessionProject(session);
  let launchDirectory = await canonicalDir(originalCwd);
  return {
    daemonCwd: cwd,
    launchDirectory,
    intactDirectory: cwd === originalCwd ? launchDirectory : await canonicalDir(cwd),
  };
}
//@ chunk-fb9qe48t.js:32203-32716 placement
function callServedTool(toolUseContext, request, launchPermissionContext, repoRules) {
  return call(
    {
      ...toolUseContext,
      inputFromAnotherMachine: true,
      toolUseId: request.tool_use_id,
      readFileState: readFileStateFor(toolUseContext.session, request.agent_id),
      agentId: request.agent_id === undefined ? undefined : identityAgentId2(request.agent_id),
      permissionLayers: [
        ...(toolUseContext.permissionLayers ?? []),
        ...(request.agent_effort_level === undefined
          ? []
          : [
              {
                kind: "effort",
                effort: request.agent_effort_level,
              },
            ]),
      ],
      options: {
        ...toolUseContext.options,
        mainLoopModel: request.main_loop_model,
        tools:
          request.agent_has_read_tool === true
            ? toolUseContext.options.tools
            : toolUseContext.options.tools.filter(
                (tool) =>
                  !poolCanRead({
                    tools: [tool],
                  }),
              ),
      },
    },
    buildNativeDoctorDiagnostics(
      request.permission_context,
      launchPermissionContext,
      getSessionProject(toolUseContext.session).originalCwd,
      repoRules,
    ),
  );
}
//@ chunk-fb9qe48t.js:32716-32805 placement (2.1.88 match: call, 0.777)
function call(onDone, context) {
  let appState = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: context,
  };
  return {
    ...onDone,
    getAppState: () => appState,
  };
}
//@ chunk-fb9qe48t.js:32805-32987 placement
function approvalForStep(request) {
  switch (request.step) {
    case "check":
      return;
    case "run":
      return request.approval;
    default:
      throw Error("A ToolHost permission request with an unknown step reached the permission check.");
  }
}
//@ chunk-fb9qe48t.js:32987-34900 placement
async function runPermissionedToolHostCall(
  tool,
  validated,
  request,
  toolUseContext,
  launchPermissionContext,
  repoRules,
  context,
  wantsEditResult,
  wantsEditResult_2,
  settingsFileValid,
) {
  let precheck = await precheckToolHostCall(tool, validated, toolUseContext);
  if ("refusal" in precheck) return notServedOutcome(precheck.refusal, precheck.message);
  if ("kind" in precheck) return permissionOnlyResult(tool, precheck);
  let backgrounding = classifyBashBackgrounding(
    tool,
    validated,
    request.tool_host_interface.version,
    toolUseContext,
    settingsFileValid,
  );
  if (backgrounding === "under_a_rule")
    return notServedOutcome(
      "background_under_a_rule",
      `${tool.name} was not run: a deny or ask permission rule names run_in_background. Send the call again without it. If you did not set it, a hook of this session did: tell the user.`,
    );
  if (isCallRunBarred(toolUseContext.session, request.tool_use_id)) return barredCallOutcome(tool);
  let { cwd } = getSessionProject(toolUseContext.session);
  let approval = approvalForStep(request);
  let classifierMayApprove = request.classifier_may_approve ?? [];
  let permission =
    approval === undefined
      ? await checkToolHostPermission(tool, precheck, toolUseContext, cwd, classifierMayApprove)
      : await runWithNativeDoctor(
          tool,
          precheck,
          toolUseContext,
          cwd,
          classifierMayApprove,
          approval,
          launchPermissionContext,
          repoRules,
        );
  if (permission.kind !== "allow")
    switch (permission.kind) {
      case "crashed":
        return notServedOutcome(
          "crashed_check",
          `${tool.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
        );
      case "refused":
        return notServedOutcome(permission.refusal, permission.message);
      case "denied_by_policy":
        return {
          ...permissionOnlyResult(tool, {
            kind: "deny",
            message: permission.message,
            reason: permission.reason,
          }),
          outcome: permission.policy,
        };
      case "ask":
        return {
          ...permissionOnlyResult(tool, permission.verdict),
          settingsWriteSuspicion: permission.settingsWriteSuspicion,
        };
      case "deny":
        return permissionOnlyResult(tool, permission);
    }
  switch (request.step) {
    case "check":
      return permissionOnlyResult(tool, {
        kind: "allow",
        ...(permission.shellAllowSource !== undefined && {
          shell_allow_source: permission.shellAllowSource === "readOnly" ? "read_only" : "sandbox",
        }),
      });
    case "run":
      break;
    default:
      throw Error("A ToolHost permission request with an unknown step reached the permission check.");
  }
  if ((await canonicalDir(cwd)) === undefined)
    return notServedOutcome(
      approval === undefined ? "start_directory_changed" : "ask_changed",
      `${tool.name} was not run: the directory it was to start in was deleted, moved, replaced by a link, or made unreadable while its permission was checked. Send the call again.`,
    );
  let claim = claimCallRun(toolUseContext.session, request.tool_use_id);
  if (claim === "barred") return barredCallOutcome(tool);
  if (claim === "started_before")
    return {
      result: duplicateCallError(tool.name),
      outcome: "already_started",
    };
  try {
    return {
      ...(await runServedBashCall(
        tool,
        validated,
        permission.callInput,
        toolUseContext,
        context,
        {
          sessionVersion: request.tool_host_interface.version,
          isSubagent: request.agent_id !== undefined,
        },
        wantsEditResult,
        wantsEditResult_2,
        backgrounding,
      )),
      settingsWriteSuspicion: permission.settingsWriteSuspicion,
    };
  } finally {
    releaseCallRun(toolUseContext.session, request.tool_use_id);
  }
}
//@ chunk-fb9qe48t.js:34900-36701 placement
/**
 * 对 ToolHost 调用做声明式权限检查（规则、模式、分类器），把结果映射为允许/拒绝/询问。
 */
async function checkToolHostPermission(tool, validated, toolUseContext, cwd, classifierMayApprove) {
  let result = await checkDeclarativePermission(tool, validated.observableInput, toolUseContext, {
    crashIsObjection: true,
  }).catch((error) => {
    if (toolUseContext.abortController.signal.aborted) throw error;
    logUnexpectedThrow(tool, error);
    return;
  });
  if (
    result === undefined ||
    (result.decisionReason?.type === "other" &&
      result.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
  )
    return {
      kind: "crashed",
    };
  if (result.behavior === "deny")
    return {
      kind: "deny",
      message: result.message,
      reason: serializeDecisionReason(result.decisionReason),
    };
  if (
    !isBashToolName(tool.name) &&
    tool.name !== MONITOR &&
    result.behavior === "ask" &&
    isOutsideReadsBlockedAsk(result.decisionReason)
  )
    return {
      kind: "denied_by_policy",
      policy: "outside_reads_blocked",
      message: result.message,
      reason: serializeDecisionReason({
        type: "other",
        reason: result.decisionReason.reason,
      }),
    };
  let effectiveInput =
    result.updatedInput === undefined || isEmptyObject(result.updatedInput)
      ? validated.observableInput
      : result.updatedInput;
  let callInput = restoreCallInput(validated, effectiveInput);
  let decision =
    result.behavior === "allow"
      ? planModeWriteAsk(tool, effectiveInput, getToolPermissionContext(toolUseContext).mode, toolUseContext)
      : result;
  if (decision === undefined)
    return {
      kind: "allow",
      callInput,
      shellAllowSource: serverHeldShellAllowSource(tool, result),
    };
  let toolForAsk = tool.name === MONITOR ? findToolByName(getAllBaseTools(), BASH_TOOL_NAME) : tool;
  if (toolForAsk === undefined)
    return {
      kind: "crashed",
    };
  let askContext = {
    mode: getToolPermissionContext(toolUseContext).mode,
    classifierMayApprove,
  };
  let askResult = await resolveToolHostAsk(
    toolForAsk,
    effectiveInput,
    decision,
    cwd,
    askContext,
    toolUseContext,
  ).catch((error) => {
    if (toolUseContext.abortController.signal.aborted) throw error;
    logUnexpectedThrow(tool, error);
    return;
  });
  if (askResult === undefined)
    return {
      kind: "crashed",
    };
  let { ask, suspicion } = askResult;
  let reasons = describeToolHostAsk(tool, effectiveInput, ask, askContext, toolUseContext);
  if (reasons === undefined)
    return {
      kind: "refused",
      refusal: "ask_too_large",
      message: `${tool.name} was not run: the permission check's objections are too many, or one is too long, to put to the user, so nobody was asked. Send smaller calls, or use shorter paths. The check said: ${ask.message}`,
    };
  let { toolUseId } = toolUseContext;
  if (toolUseId === undefined)
    return {
      kind: "crashed",
    };
  let matchedAskRule = askRuleFromRule(ask.matchedAskRule);
  return {
    kind: "ask",
    verdict: {
      kind: "ask",
      message: ask.message,
      ask_digest: settingsFileContentHash({
        tool_name: tool.name,
        input: effectiveInput,
        cwd,
        reasons,
        tool_use_id: toolUseId,
        agent_id: toolUseContext.agentId ?? null,
        tool_host_life_id: mcpServeSessionId(toolUseContext.session),
      }),
      reasons,
      ...(matchedAskRule !== undefined && {
        matched_ask_rule: matchedAskRule,
      }),
      ...(ask.blockedPath && {
        blocked_path: ask.blockedPath,
      }),
      suggested_allow_rules:
        offersAlwaysAllow(ask) && suspicion === undefined ? allowRulesFromUpdates(ask.suggestions) : [],
    },
    callInput,
    settingsWriteSuspicion: suspicion,
  };
}
//@ chunk-fb9qe48t.js:36701-36838 placement
function planModeWriteAsk(tool, input, mode, toolUseContext) {
  if (!isPlanModeWrite(tool, input, mode, toolUseContext)) return;
  let reason = {
    type: "mode",
    mode: "plan",
  };
  return {
    behavior: "ask",
    message: createPermissionRequestMessage(tool.name, reason),
    decisionReason: reason,
  };
}
//@ chunk-fb9qe48t.js:36838-38031 placement
async function runWithNativeDoctor(
  tool,
  validated,
  onDone,
  toolUseContext,
  classifierMayApprove,
  request,
  launchPermissionContext,
  repoRules,
) {
  let context = buildNativeDoctorDiagnostics(
    request.permission_context,
    launchPermissionContext,
    getSessionProject(onDone.session).originalCwd,
    repoRules,
  );
  let recheckWithNativeContext = await checkToolHostPermission(
    tool,
    validated,
    call(onDone, context),
    toolUseContext,
    classifierMayApprove,
  );
  let recheck = await checkToolHostPermission(tool, validated, onDone, toolUseContext, classifierMayApprove);
  if (recheck.kind !== "allow" && recheck.kind !== "ask") return recheck;
  if (recheckWithNativeContext.kind === "crashed") return recheckWithNativeContext;
  if (
    recheckWithNativeContext.kind !== "ask" ||
    recheckWithNativeContext.verdict.ask_digest !== request.ask_digest
  )
    return {
      kind: "refused",
      refusal: "ask_changed",
      message: `${tool.name} was not run: the approval given for it no longer counts. The start directory or what the permission check found has changed since, or the cloud environment has restarted. Send the call again.`,
    };
  if (
    recheck.kind === "ask" &&
    recheck.verdict.ask_digest !== request.ask_digest &&
    !(request.approver === "user" && recheck.verdict.reasons[0].type === "raisedAllow")
  )
    return recheck;
  let mode = getToolPermissionContext(onDone).mode;
  if (
    (request.approver !== "user" &&
      request.approver !== "hook" &&
      recheck.kind === "ask" &&
      mode !== "auto" &&
      mode !== "plan") ||
    (request.approver !== "user" && !recheckWithNativeContext.verdict.reasons.every(isRaisedAllowReason))
  )
    return {
      kind: "denied_by_policy",
      policy: "approver_not_user",
      message: `${tool.name} was not run: only the user may approve this call, and its approval did not come from the user. Tell the user what you wanted to run and why.`,
      reason: {
        type: "other",
        name: "other",
        description: "approver_not_user",
      },
    };
  return {
    kind: "allow",
    callInput: recheckWithNativeContext.callInput,
    settingsWriteSuspicion: recheckWithNativeContext.settingsWriteSuspicion,
  };
}
//@ chunk-fb9qe48t.js:38031-38296 placement
async function denyNestedPermissionAsk(tool) {
  return {
    behavior: "deny",
    message: `${tool.name} was not run: a tool that runs in the cloud environment cannot ask for another permission while it runs. Send it as a call of its own.`,
    decisionReason: {
      type: "other",
      reason: "asked inside a served call",
    },
  };
}
//@ chunk-fb9qe48t.js:38296-38575 placement
function resultTooLargeHint(tool) {
  let hint =
    tool.name === READ
      ? "Ask for less of it: for a PDF, fewer pages at a time with the pages parameter."
      : tool.name === GREP_TOOL_NAME || tool.name === GLOB_TOOL_NAME
        ? "Narrow the search."
        : "Check what it changed before running it again.";
  return `${tool.name} ran, but its result is too large to send back. ${hint}`;
}
export {
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
  handleToolHostCall,
};
