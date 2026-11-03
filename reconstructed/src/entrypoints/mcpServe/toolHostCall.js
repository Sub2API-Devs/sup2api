/**
 * entrypoints/mcpServe/toolHostCall.ts
 *
 * 2.1.316 新增：工具宿主调用执行（权限检查、拒绝结果、原生诊断）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz36xfxg.js (23)
 * attribution: placement 23
 */
import { normalize } from "path";
import { realpath } from "fs/promises";
import { count } from "../../utils/collections.js";
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
import { permissionCheckedCwds } from "../../utils/Shell.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
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
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";

//@ chunk-dz36xfxg.js:23436-23757 placement
function trackReadFileStateChanges(readFileState) {
  let n = new Map();
  let t = new Set();
  return {
    entriesSetByCall: n,
    keysSetWithNoEntryBefore: t,
    readFileState: new Proxy(readFileState, {
      get: (r, i, s) => {
        if (i === "set")
          return (d, k) => {
            if (!r.has(d)) t.add(normalize(d));
            r.set(d, k);
            let l = r.get(d);
            if (l !== undefined) n.set(normalize(d), l);
            return s;
          };
        let a = Reflect.get(r, i, r);
        return typeof a === "function" ? a.bind(r) : a;
      },
    }),
  };
}
//@ chunk-dz36xfxg.js:23757-23954 placement
function readStateMetaFor(e) {
  if (e.isPartialView)
    return {
      is_partial_view: true,
    };
  return e.readBaseline === undefined || (e.offset ?? 1) > 1
    ? {}
    : {
        ...e.readBaseline,
        ...(e.contentNotInModelContext && {
          content_not_in_model_context: true,
        }),
      };
}
//@ chunk-dz36xfxg.js:23954-24329 placement
function readFileStateTelemetry(e, readFileStateNotSentCount) {
  return {
    read_file_state_whole_file_count: count(e, (t) => t.sha256 !== undefined),
    read_file_state_not_in_model_context_count: count(
      e,
      (t) => t.sha256 !== undefined && t.content_not_in_model_context === true,
    ),
    read_file_state_partial_view_count: count(e, (t) => t.is_partial_view === true),
    read_file_state_path_only_count: count(e, (t) => t.sha256 === undefined && !t.is_partial_view),
    read_file_state_not_sent_count: readFileStateNotSentCount,
  };
}
//@ chunk-dz36xfxg.js:24329-24508 placement
function readFileStateChangesMeta(entriesSetByCall, n) {
  let sliced = [...entriesSetByCall]
    .filter(([i]) => i.length <= MAX_DIRECTORY_PATH_LENGTH)
    .slice(0, MAX_REFS);
  let mapped = sliced.map(([i, s]) => ({
    path: i,
    ...(n ? {} : readStateMetaFor(s)),
  }));
  return {
    changes: mapped,
    counts:
      entriesSetByCall.size === 0
        ? undefined
        : readFileStateTelemetry(mapped, entriesSetByCall.size - sliced.length),
  };
}
//@ chunk-dz36xfxg.js:24508-24580 placement
function withReadFileStateChanges(e, changes) {
  return changes.length === 0
    ? e
    : {
        ...e,
        _meta: {
          ...e._meta,
          [READ_FILE_STATE_META]: changes,
        },
      };
}
//@ chunk-dz36xfxg.js:24580-24837 placement
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
//@ chunk-dz36xfxg.js:24837-25929 placement
function toolHostRefusalResult(e, n, t) {
  switch (n.kind) {
    case "too_large":
      return {
        code: "invalid_request",
        message: `${e} was not run: the permission context sent with it is larger than this server takes. Retrying won't help.`,
      };
    case "unlisted_restriction_on":
    case "malformed":
      return {
        code: "invalid_request",
        message: `${e} was not run: this server could not read the permission request sent with it. Retrying won't help.`,
      };
    case "not_honoured":
      return {
        code: "invalid_request",
        message: `${e} was not run: the permission request sent with it contains ${n.part}, which this server does not accept. Retrying won't help.`,
      };
    case "session_too_old":
      return {
        code: "unsupported_protocol",
        message: `${e} was not run: this session speaks version ${n.session.version} of the interface to this server, which works with version ${t.min_version} or later. Retrying won't help: tell the user.`,
      };
    case "daemon_too_old":
      return {
        code: "unsupported_protocol",
        message: `${e} was not run: this session works with version ${n.session.min_version} or later of the interface to this server, which speaks version ${t.version}. Retrying won't help: tell the user.`,
      };
  }
}
//@ chunk-dz36xfxg.js:25929-26140 placement
function duplicateCallError(name) {
  return completedError(
    `${name} was not run again: this very call was already started here once. It may have finished, failed or been cut off: check what it did before you send a new call.`,
    "duplicate_call",
    [],
  );
}
//@ chunk-dz36xfxg.js:26140-26901 placement
/**
 * mcp serve 的 ToolHost 调用入口：带权限上下文的请求先做权限判定，否则直接执行。
 */
async function handleToolHostCall(e) {
  let n = bringsToolHostPermissionRequest(e.meta) ? runStepToolUseId(e.meta) : undefined;
  if (n === undefined) return runToolHostCall(e);
  let t = e.newCall();
  let { abortController, session } = t.toolUseContext;
  let s = stableHashWithSalt(e.name, e.args ?? {});
  let keptCallAnswer = findKeptCallAnswer(session, n, s);
  let d = {
    tool: toolNameForAnalytics(e.name),
    step: lit("run"),
  };
  if (keptCallAnswer === undefined && isKnownRun(session, n)) {
    t.release();
    logFeatureSad("mcp_serve_tool_host_permission", "already_started", d);
    return duplicateCallError(e.name);
  }
  if (
    keptCallAnswer === undefined ||
    parseToolContainerStep(e.meta, rangeRaisedAtLaunch()).kind !== "requested"
  )
    return keepCallAnswer(
      session,
      n,
      {
        call: s,
        stop: () => abortController.abort(),
      },
      () =>
        runToolHostCall({
          ...e,
          newCall: () => ({
            ...t,
            release: () => {},
          }),
        }).finally(t.release),
    );
  logFeatureOk("mcp_serve_tool_host_permission", {
    ...d,
    outcome: lit("joined"),
  });
  abortController.signal.addEventListener("abort", keptCallAnswer.stop, {
    once: true,
  });
  if (abortController.signal.aborted) keptCallAnswer.stop();
  using k = e.startHeartbeat();
  try {
    return await keptCallAnswer.answer;
  } finally {
    abortController.signal.removeEventListener("abort", keptCallAnswer.stop);
    t.release();
  }
}
//@ chunk-dz36xfxg.js:26901-29780 placement
/**
 * 执行一次 ToolHost 工具调用：校验输入、按客户端权限上下文判定、运行工具并整理结果（含 readFileState 变化）。
 */
async function runToolHostCall({
  name: e,
  args,
  meta,
  servedTools,
  launchPermissionContext,
  newCall,
  startHeartbeat,
  callerLogsSharedEvents,
}) {
  if (!bringsToolHostPermissionRequest(meta)) return;
  let k = rangeRaisedAtLaunch();
  let toolContainerStep = parseToolContainerStep(meta, k);
  if (toolContainerStep.kind === "absent" || toolContainerStep.kind === "other_request") return;
  let tool = toolNameForAnalytics(e);
  if (toolContainerStep.kind === "declined") {
    logFeatureOk("mcp_serve_tool_host_permission", {
      tool,
      step: fromEnum(toolContainerStep.request.step),
      outcome: lit("acknowledged"),
    });
    return acknowledgedResult(toolContainerStep.request.ask_digest);
  }
  let w = servedTools();
  if (
    launchPermissionContext === undefined ||
    buildAnnouncedCapability(() => w, launchPermissionContext) === undefined
  ) {
    logFeatureSad("mcp_serve_tool_host_permission", "announces_nothing", {
      tool,
    });
    return refusedResult({
      code: "unsupported_protocol",
      message: `${e} was not run: this server was launched so that it decides no permissions. Retrying won't help.`,
    });
  }
  if (toolContainerStep.kind !== "requested") {
    logFeatureSad("mcp_serve_tool_host_permission", toolContainerStep.kind, {
      tool,
      daemon_interface_min_version: k.min_version,
      ...(toolContainerStep.kind === "not_honoured" && {
        part: fromEnum(toolContainerStep.part),
      }),
    });
    return refusedResult(toolHostRefusalResult(e, toolContainerStep, k));
  }
  let { request } = toolContainerStep;
  let C = {
    tool,
    step: fromEnum(request.step),
    ...(hasRunApproval(request) && {
      approved: true,
    }),
  };
  let O =
    SERVE_MODE_KEYS.has(e) ||
    (e === MONITOR &&
      request.step === "check" &&
      !(
        "ws" in
        {
          ...args,
        }
      ))
      ? findToolByName(getAllBaseTools(), e)
      : isAnsweredWithOutput(e)
        ? findToolByName(w, e)
        : undefined;
  if (O === undefined) {
    logFeatureSad("mcp_serve_tool_host_permission", "not_served", C);
    return refusedResult({
      code: "not_served",
      message: `${e} was not run: this server does not decide permissions for a tool of that name.`,
    });
  }
  let { toolUseContext, release } = newCall();
  try {
    let session = toolUseContext.session;
    let { signal } = toolUseContext.abortController;
    let v = isMainAgentRun(request);
    let repoRulesForRequest = await readRepoRulesForRequest(e, meta);
    if (repoRulesForRequest.refused !== undefined) {
      (repoRulesForRequest.refused.cause === "repo_rules_read_failed" ? logFeatureBad : logFeatureSad)(
        "mcp_serve_tool_host_permission",
        repoRulesForRequest.refused.cause,
        C,
      );
      return notServedResult(repoRulesForRequest.refused.message);
    }
    let { repoRules } = repoRulesForRequest;
    let { daemonCwd, intactDirectory, launchDirectory } = await resolveServeDirectories(session);
    let H = intactDirectory ?? launchDirectory;
    if (H === undefined) {
      logFeatureSad("mcp_serve_tool_host_permission", "launch_directory_gone", C);
      return notServedResult(launchDirGoneMessage(e));
    }
    if (intactDirectory === undefined && v) {
      if (!signal.aborted) {
        logFeatureSad("mcp_serve_tool_host_permission", "start_directory_gone", C);
        session.setCwd(H);
      }
      return withShellDirectoryMeta(notServedResult(startDirGoneMessage(e, H, daemonCwd)), H);
    }
    let B = session.withProject({
      cwd: H,
    });
    permissionCheckedCwds.of(B).set(B, getSessionProject(B).cwd);
    let z = await runInRemoteCallFrameMain(H, async () =>
      runPermissionedToolHostCall(
        O,
        args,
        request,
        callServedTool(
          {
            ...toolUseContext,
            session: B,
          },
          request,
          launchPermissionContext,
          repoRules,
        ),
        launchPermissionContext,
        repoRules,
        startHeartbeat,
        callerLogsSharedEvents,
        asksForEditResult(e, meta),
        isValidSettingsFileIdentity(meta),
      ),
    ).catch((error) => {
      if (signal.aborted) throw error;
      logUnexpectedThrow(O, error);
      return {
        result: failedResult(
          `${e}: this server failed while it handled the call (internal error). Check what it changed before running it again.`,
          [],
        ),
        outcome: "crashed_request",
      };
    });
    if (!signal.aborted) {
      let { cwd } = getSessionProject(B);
      let fe = v && cwd !== H;
      if (fe) session.setCwd(cwd);
      let ne = {
        ...C,
        ...z.readFileStateChangeCounts,
        ...(z.originalFileLeftOutReason && {
          original_file_left_out: fromEnum(z.originalFileLeftOutReason),
        }),
        ...(z.diffLeftOut && {
          diff_left_out: fromEnum(z.diffLeftOut),
        }),
        ...(z.settingsWriteSuspicion && {
          settings_write_reason: fromEnum(z.settingsWriteSuspicion.reason),
        }),
        ...(z.settingsWriteSuspicion?.isHoldLifted && {
          settings_write_hold_lifted: true,
        }),
        ...(fe && {
          directory: fromEnum("moved"),
        }),
        ...(intactDirectory === undefined && {
          directory: fromEnum("launch_while_gone"),
        }),
      };
      if (HOST_CALL_RESULT_KINDS.has(z.outcome))
        logFeatureOk("mcp_serve_tool_host_permission", {
          ...ne,
          outcome: fromEnum(z.outcome),
        });
      else if (TOOL_HOST_REFUSAL_CODES.has(z.outcome))
        logFeatureSad("mcp_serve_tool_host_permission", z.outcome, ne);
      else logFeatureBad("mcp_serve_tool_host_permission", z.outcome, ne);
    }
    return v ? withShellDirectoryMeta(z.result, getSessionProject(session).cwd) : z.result;
  } finally {
    release();
  }
}
//@ chunk-dz36xfxg.js:29780-29949 placement
function launchDirGoneMessage(e) {
  return `${e} was not run: the directory that this server was started in is gone (deleted, moved, replaced by a link, or unreadable). Retrying won't help.`;
}
//@ chunk-dz36xfxg.js:29949-30210 placement
function startDirGoneMessage(e, n, daemonCwd) {
  return `${e} was not run: the directory it was to start in is gone (deleted, moved, replaced by a link, or unreadable). The next call starts in ${n}. Check that this call still does what you mean there, then send it again. What is gone: ${daemonCwd}`;
}
//@ chunk-dz36xfxg.js:30210-30291 placement
async function canonicalDir(e) {
  try {
    return identity(await realpath(`${e}/`)) === e ? e : undefined;
  } catch {
    return;
  }
}
//@ chunk-dz36xfxg.js:30291-30431 placement
async function resolveServeDirectories(session) {
  let { cwd, originalCwd } = getSessionProject(session);
  let r = await canonicalDir(originalCwd);
  return {
    daemonCwd: cwd,
    launchDirectory: r,
    intactDirectory: cwd === originalCwd ? r : await canonicalDir(cwd),
  };
}
//@ chunk-dz36xfxg.js:30431-30944 placement
function callServedTool(e, request, launchPermissionContext, repoRules) {
  return call(
    {
      ...e,
      inputFromAnotherMachine: true,
      toolUseId: request.tool_use_id,
      readFileState: readFileStateFor(e.session, request.agent_id),
      agentId: request.agent_id === undefined ? undefined : identityAgentId2(request.agent_id),
      permissionLayers: [
        ...(e.permissionLayers ?? []),
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
        ...e.options,
        mainLoopModel: request.main_loop_model,
        tools:
          request.agent_has_read_tool === true
            ? e.options.tools
            : e.options.tools.filter(
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
      getSessionProject(e.session).originalCwd,
      repoRules,
    ),
  );
}
//@ chunk-dz36xfxg.js:30944-31033 placement = call (0.777)
function call(onDone, context) {
  let t = {
    ...serveModeDefaultAppState(),
    toolPermissionContext: context,
  };
  return {
    ...onDone,
    getAppState: () => t,
  };
}
//@ chunk-dz36xfxg.js:31033-31215 placement
function approvalForStep(e) {
  switch (e.step) {
    case "check":
      return;
    case "run":
      return e.approval;
    default:
      throw Error("A ToolHost permission request with an unknown step reached the permission check.");
  }
}
//@ chunk-dz36xfxg.js:31215-33128 placement
async function runPermissionedToolHostCall(
  e,
  n,
  request,
  r,
  launchPermissionContext,
  repoRules,
  startHeartbeat,
  callerLogsSharedEvents,
  k,
  l,
) {
  let y = await precheckToolHostCall(e, n, r);
  if ("refusal" in y) return notServedOutcome(y.refusal, y.message);
  if ("kind" in y) return permissionOnlyResult(e, y);
  let w = classifyBashBackgrounding(e, n, request.tool_host_interface.version, r, l);
  if (w === "under_a_rule")
    return notServedOutcome(
      "background_under_a_rule",
      `${e.name} was not run: a deny or ask permission rule names run_in_background. Send the call again without it. If you did not set it, a hook of this session did: tell the user.`,
    );
  if (isCallRunBarred(r.session, request.tool_use_id)) return barredCallOutcome(e);
  let { cwd } = getSessionProject(r.session);
  let C = approvalForStep(request);
  let classifierMayApprove = request.classifier_may_approve ?? [];
  let R =
    C === undefined
      ? await checkToolHostPermission(e, y, r, cwd, classifierMayApprove)
      : await runWithNativeDoctor(e, y, r, cwd, classifierMayApprove, C, launchPermissionContext, repoRules);
  if (R.kind !== "allow")
    switch (R.kind) {
      case "crashed":
        return notServedOutcome(
          "crashed_check",
          `${e.name} was not run: the permission rules could not be evaluated for this call (internal error).`,
        );
      case "refused":
        return notServedOutcome(R.refusal, R.message);
      case "denied_by_policy":
        return {
          ...permissionOnlyResult(e, {
            kind: "deny",
            message: R.message,
            reason: R.reason,
          }),
          outcome: R.policy,
        };
      case "ask":
        return {
          ...permissionOnlyResult(e, R.verdict),
          settingsWriteSuspicion: R.settingsWriteSuspicion,
        };
      case "deny":
        return permissionOnlyResult(e, R);
    }
  switch (request.step) {
    case "check":
      return permissionOnlyResult(e, {
        kind: "allow",
        ...(R.shellAllowSource !== undefined && {
          shell_allow_source: R.shellAllowSource === "readOnly" ? "read_only" : "sandbox",
        }),
      });
    case "run":
      break;
    default:
      throw Error("A ToolHost permission request with an unknown step reached the permission check.");
  }
  if ((await canonicalDir(cwd)) === undefined)
    return notServedOutcome(
      C === undefined ? "start_directory_changed" : "ask_changed",
      `${e.name} was not run: the directory it was to start in was deleted, moved, replaced by a link, or made unreadable while its permission was checked. Send the call again.`,
    );
  let S = claimCallRun(r.session, request.tool_use_id);
  if (S === "barred") return barredCallOutcome(e);
  if (S === "started_before")
    return {
      result: duplicateCallError(e.name),
      outcome: "already_started",
    };
  try {
    return {
      ...(await runServedBashCall(
        e,
        n,
        R.callInput,
        r,
        startHeartbeat,
        {
          sessionVersion: request.tool_host_interface.version,
          isSubagent: request.agent_id !== undefined,
        },
        callerLogsSharedEvents,
        k,
        w,
      )),
      settingsWriteSuspicion: R.settingsWriteSuspicion,
    };
  } finally {
    releaseCallRun(r.session, request.tool_use_id);
  }
}
//@ chunk-dz36xfxg.js:33128-34929 placement
/**
 * 对 ToolHost 调用做声明式权限检查（规则、模式、分类器），把结果映射为允许/拒绝/询问。
 */
async function checkToolHostPermission(tool, n, t, r, classifierMayApprove) {
  let result = await checkDeclarativePermission(tool, n.observableInput, t, {
    crashIsObjection: true,
  }).catch((error) => {
    if (t.abortController.signal.aborted) throw error;
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
  let a =
    result.updatedInput === undefined || isEmptyObject(result.updatedInput)
      ? n.observableInput
      : result.updatedInput;
  let callInput = restoreCallInput(n, a);
  let k =
    result.behavior === "allow" ? planModeWriteAsk(tool, a, getToolPermissionContext(t).mode, t) : result;
  if (k === undefined)
    return {
      kind: "allow",
      callInput,
      shellAllowSource: serverHeldShellAllowSource(tool, result),
    };
  let l = tool.name === MONITOR ? findToolByName(getAllBaseTools(), BASH_TOOL_NAME) : tool;
  if (l === undefined)
    return {
      kind: "crashed",
    };
  let y = {
    mode: getToolPermissionContext(t).mode,
    classifierMayApprove,
  };
  let w = await resolveToolHostAsk(l, a, k, r, y, t).catch((error) => {
    if (t.abortController.signal.aborted) throw error;
    logUnexpectedThrow(tool, error);
    return;
  });
  if (w === undefined)
    return {
      kind: "crashed",
    };
  let { ask, suspicion } = w;
  let O = describeToolHostAsk(tool, a, ask, y, t);
  if (O === undefined)
    return {
      kind: "refused",
      refusal: "ask_too_large",
      message: `${tool.name} was not run: the permission check's objections are too many, or one is too long, to put to the user, so nobody was asked. Send smaller calls, or use shorter paths. The check said: ${ask.message}`,
    };
  let { toolUseId } = t;
  if (toolUseId === undefined)
    return {
      kind: "crashed",
    };
  let S = askRuleFromRule(ask.matchedAskRule);
  return {
    kind: "ask",
    verdict: {
      kind: "ask",
      message: ask.message,
      ask_digest: settingsFileContentHash({
        tool_name: tool.name,
        input: a,
        cwd: r,
        reasons: O,
        tool_use_id: toolUseId,
        agent_id: t.agentId ?? null,
        tool_host_life_id: mcpServeSessionId(t.session),
      }),
      reasons: O,
      ...(S !== undefined && {
        matched_ask_rule: S,
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
//@ chunk-dz36xfxg.js:34929-35066 placement
function planModeWriteAsk(e, n, mode, r) {
  if (!isPlanModeWrite(e, n, mode, r)) return;
  let i = {
    type: "mode",
    mode: "plan",
  };
  return {
    behavior: "ask",
    message: createPermissionRequestMessage(e.name, i),
    decisionReason: i,
  };
}
//@ chunk-dz36xfxg.js:35066-36259 placement
async function runWithNativeDoctor(e, n, onDone, r, classifierMayApprove, s, a, d) {
  let context = buildNativeDoctorDiagnostics(
    s.permission_context,
    a,
    getSessionProject(onDone.session).originalCwd,
    d,
  );
  let l = await checkToolHostPermission(e, n, call(onDone, context), r, classifierMayApprove);
  let y = await checkToolHostPermission(e, n, onDone, r, classifierMayApprove);
  if (y.kind !== "allow" && y.kind !== "ask") return y;
  if (l.kind === "crashed") return l;
  if (l.kind !== "ask" || l.verdict.ask_digest !== s.ask_digest)
    return {
      kind: "refused",
      refusal: "ask_changed",
      message: `${e.name} was not run: the approval given for it no longer counts. The start directory or what the permission check found has changed since, or the cloud environment has restarted. Send the call again.`,
    };
  if (
    y.kind === "ask" &&
    y.verdict.ask_digest !== s.ask_digest &&
    !(s.approver === "user" && y.verdict.reasons[0].type === "raisedAllow")
  )
    return y;
  let mode = getToolPermissionContext(onDone).mode;
  if (
    (s.approver !== "user" &&
      s.approver !== "hook" &&
      y.kind === "ask" &&
      mode !== "auto" &&
      mode !== "plan") ||
    (s.approver !== "user" && !l.verdict.reasons.every(isRaisedAllowReason))
  )
    return {
      kind: "denied_by_policy",
      policy: "approver_not_user",
      message: `${e.name} was not run: only the user may approve this call, and its approval did not come from the user. Tell the user what you wanted to run and why.`,
      reason: {
        type: "other",
        name: "other",
        description: "approver_not_user",
      },
    };
  return {
    kind: "allow",
    callInput: l.callInput,
    settingsWriteSuspicion: l.settingsWriteSuspicion,
  };
}
//@ chunk-dz36xfxg.js:36259-36524 placement
async function denyNestedPermissionAsk(e) {
  return {
    behavior: "deny",
    message: `${e.name} was not run: a tool that runs in the cloud environment cannot ask for another permission while it runs. Send it as a call of its own.`,
    decisionReason: {
      type: "other",
      reason: "asked inside a served call",
    },
  };
}
//@ chunk-dz36xfxg.js:36524-36803 placement
function resultTooLargeHint(e) {
  let n =
    e.name === FILE_READ_TOOL_NAME
      ? "Ask for less of it: for a PDF, fewer pages at a time with the pages parameter."
      : e.name === GREP_TOOL_NAME || e.name === GLOB_TOOL_NAME
        ? "Narrow the search."
        : "Check what it changed before running it again.";
  return `${e.name} ran, but its result is too large to send back. ${n}`;
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
};
