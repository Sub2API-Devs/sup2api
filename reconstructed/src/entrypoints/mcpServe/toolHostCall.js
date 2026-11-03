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
  xe,
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
import { N6 } from "../../utils/stableHash.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { kTs, isCallRunBarred } from "../../services/mcpServe/readCalls.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { rangeRaisedAtLaunch } from "../mcp/toolHostInterface.js";
import { Jje, serveModeDefaultAppState } from "./serveModeInput.js";
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
import { xo } from "../../bootstrap/sessionSlices.js";
import { Yg } from "../../remote/remoteMode.js";
import { asksForEditResult } from "./editResult.js";
import { Mn } from "../../utils/pathClassification.js";
import { Mr } from "../../utils/agentId.js";
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
function trackReadFileStateChanges(e) {
  let n = new Map(),
    t = new Set();
  return {
    entriesSetByCall: n,
    keysSetWithNoEntryBefore: t,
    readFileState: new Proxy(e, {
      get: (r, i, s) => {
        if (i === "set")
          return (d, k) => {
            if (!r.has(d)) t.add(normalize(d));
            r.set(d, k);
            let l = r.get(d);
            if (l !== void 0) n.set(normalize(d), l);
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
  if (e.isPartialView) return { is_partial_view: !0 };
  return e.readBaseline === void 0 || (e.offset ?? 1) > 1
    ? {}
    : { ...e.readBaseline, ...(e.contentNotInModelContext && { content_not_in_model_context: !0 }) };
}
//@ chunk-dz36xfxg.js:23954-24329 placement
function readFileStateTelemetry(e, n) {
  return {
    read_file_state_whole_file_count: count(e, (t) => t.sha256 !== void 0),
    read_file_state_not_in_model_context_count: count(
      e,
      (t) => t.sha256 !== void 0 && t.content_not_in_model_context === !0,
    ),
    read_file_state_partial_view_count: count(e, (t) => t.is_partial_view === !0),
    read_file_state_path_only_count: count(e, (t) => t.sha256 === void 0 && !t.is_partial_view),
    read_file_state_not_sent_count: n,
  };
}
//@ chunk-dz36xfxg.js:24329-24508 placement
function readFileStateChangesMeta(e, n) {
  let sliced = [...e].filter(([i]) => i.length <= MAX_DIRECTORY_PATH_LENGTH).slice(0, xe),
    mapped = sliced.map(([i, s]) => ({ path: i, ...(n ? {} : readStateMetaFor(s)) }));
  return {
    changes: mapped,
    counts: e.size === 0 ? void 0 : readFileStateTelemetry(mapped, e.size - sliced.length),
  };
}
//@ chunk-dz36xfxg.js:24508-24580 placement
function withReadFileStateChanges(e, n) {
  return n.length === 0 ? e : { ...e, _meta: { ...e._meta, [READ_FILE_STATE_META]: n } };
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
  ]),
  zn = new Set(["invalid", "allow", "deny", "ask", "output", "tool_failed"]);
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
function duplicateCallError(e) {
  return completedError(
    `${e} was not run again: this very call was already started here once. It may have finished, failed or been cut off: check what it did before you send a new call.`,
    "duplicate_call",
    [],
  );
}
/**
 * mcp serve 的 ToolHost 调用入口：带权限上下文的请求先做权限判定，否则直接执行。
 */
//@ chunk-dz36xfxg.js:26140-26901 placement
async function handleToolHostCall(e) {
  let n = bringsToolHostPermissionRequest(e.meta) ? runStepToolUseId(e.meta) : void 0;
  if (n === void 0) return runToolHostCall(e);
  let newCall = e.newCall(),
    { abortController: abortController, session: session } = newCall.toolUseContext,
    s = N6(e.name, e.args ?? {}),
    a = findKeptCallAnswer(session, n, s),
    d = { tool: toolNameForAnalytics(e.name), step: lit("run") };
  if (a === void 0 && kTs(session, n))
    return (
      newCall.release(),
      logFeatureSad("mcp_serve_tool_host_permission", "already_started", d),
      duplicateCallError(e.name)
    );
  if (a === void 0 || parseToolContainerStep(e.meta, rangeRaisedAtLaunch()).kind !== "requested")
    return keepCallAnswer(session, n, { call: s, stop: () => abortController.abort() }, () =>
      runToolHostCall({ ...e, newCall: () => ({ ...newCall, release: () => {} }) }).finally(newCall.release),
    );
  if (
    (logFeatureOk("mcp_serve_tool_host_permission", { ...d, outcome: lit("joined") }),
    abortController.signal.addEventListener("abort", a.stop, { once: !0 }),
    abortController.signal.aborted)
  )
    a.stop();
  using startHeartbeat = e.startHeartbeat();
  try {
    return await a.answer;
  } finally {
    (abortController.signal.removeEventListener("abort", a.stop), newCall.release());
  }
}
/**
 * 执行一次 ToolHost 工具调用：校验输入、按客户端权限上下文判定、运行工具并整理结果（含 readFileState 变化）。
 */
//@ chunk-dz36xfxg.js:26901-29780 placement
async function runToolHostCall({
  name: e,
  args: args,
  meta: meta,
  servedTools: servedTools,
  launchPermissionContext: launchPermissionContext,
  newCall: newCall,
  startHeartbeat: startHeartbeat,
  callerLogsSharedEvents: callerLogsSharedEvents,
}) {
  if (!bringsToolHostPermissionRequest(meta)) return;
  let k = rangeRaisedAtLaunch(),
    l = parseToolContainerStep(meta, k);
  if (l.kind === "absent" || l.kind === "other_request") return;
  let y = toolNameForAnalytics(e);
  if (l.kind === "declined")
    return (
      logFeatureOk("mcp_serve_tool_host_permission", {
        tool: y,
        step: fromEnum(l.request.step),
        outcome: lit("acknowledged"),
      }),
      acknowledgedResult(l.request.ask_digest)
    );
  let w = servedTools();
  if (
    launchPermissionContext === void 0 ||
    buildAnnouncedCapability(() => w, launchPermissionContext) === void 0
  )
    return (
      logFeatureSad("mcp_serve_tool_host_permission", "announces_nothing", { tool: y }),
      refusedResult({
        code: "unsupported_protocol",
        message: `${e} was not run: this server was launched so that it decides no permissions. Retrying won't help.`,
      })
    );
  if (l.kind !== "requested")
    return (
      logFeatureSad("mcp_serve_tool_host_permission", l.kind, {
        tool: y,
        daemon_interface_min_version: k.min_version,
        ...(l.kind === "not_honoured" && { part: fromEnum(l.part) }),
      }),
      refusedResult(toolHostRefusalResult(e, l, k))
    );
  let { request: request } = l,
    C = { tool: y, step: fromEnum(request.step), ...(hasRunApproval(request) && { approved: !0 }) },
    O =
      Jje.has(e) || (e === MONITOR && request.step === "check" && !("ws" in { ...args }))
        ? findToolByName(getAllBaseTools(), e)
        : isAnsweredWithOutput(e)
          ? findToolByName(w, e)
          : void 0;
  if (O === void 0)
    return (
      logFeatureSad("mcp_serve_tool_host_permission", "not_served", C),
      refusedResult({
        code: "not_served",
        message: `${e} was not run: this server does not decide permissions for a tool of that name.`,
      })
    );
  let { toolUseContext: toolUseContext, release: release } = newCall();
  try {
    let session = toolUseContext.session,
      { signal: signal } = toolUseContext.abortController,
      v = isMainAgentRun(request),
      D = await readRepoRulesForRequest(e, meta);
    if (D.refused !== void 0)
      return (
        (D.refused.cause === "repo_rules_read_failed" ? logFeatureBad : logFeatureSad)(
          "mcp_serve_tool_host_permission",
          D.refused.cause,
          C,
        ),
        notServedResult(D.refused.message)
      );
    let { repoRules: repoRules } = D,
      {
        daemonCwd: daemonCwd,
        intactDirectory: intactDirectory,
        launchDirectory: launchDirectory,
      } = await resolveServeDirectories(session),
      H = intactDirectory ?? launchDirectory;
    if (H === void 0)
      return (
        logFeatureSad("mcp_serve_tool_host_permission", "launch_directory_gone", C),
        notServedResult(launchDirGoneMessage(e))
      );
    if (intactDirectory === void 0 && v) {
      if (!signal.aborted)
        (logFeatureSad("mcp_serve_tool_host_permission", "start_directory_gone", C), session.setCwd(H));
      return withShellDirectoryMeta(notServedResult(startDirGoneMessage(e, H, daemonCwd)), H);
    }
    let withProject = session.withProject({ cwd: H });
    permissionCheckedCwds.of(withProject).set(withProject, xo(withProject).cwd);
    let z = await Yg(H, async () =>
      runPermissionedToolHostCall(
        O,
        args,
        request,
        callServedTool(
          { ...toolUseContext, session: withProject },
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
    ).catch((L) => {
      if (signal.aborted) throw L;
      return (
        logUnexpectedThrow(O, L),
        {
          result: failedResult(
            `${e}: this server failed while it handled the call (internal error). Check what it changed before running it again.`,
            [],
          ),
          outcome: "crashed_request",
        }
      );
    });
    if (!signal.aborted) {
      let { cwd: cwd } = xo(withProject),
        fe = v && cwd !== H;
      if (fe) session.setCwd(cwd);
      let ne = {
        ...C,
        ...z.readFileStateChangeCounts,
        ...(z.originalFileLeftOutReason && { original_file_left_out: fromEnum(z.originalFileLeftOutReason) }),
        ...(z.diffLeftOut && { diff_left_out: fromEnum(z.diffLeftOut) }),
        ...(z.settingsWriteSuspicion && { settings_write_reason: fromEnum(z.settingsWriteSuspicion.reason) }),
        ...(z.settingsWriteSuspicion?.isHoldLifted && { settings_write_hold_lifted: !0 }),
        ...(fe && { directory: fromEnum("moved") }),
        ...(intactDirectory === void 0 && { directory: fromEnum("launch_while_gone") }),
      };
      if (zn.has(z.outcome))
        logFeatureOk("mcp_serve_tool_host_permission", { ...ne, outcome: fromEnum(z.outcome) });
      else if (TOOL_HOST_REFUSAL_CODES.has(z.outcome))
        logFeatureSad("mcp_serve_tool_host_permission", z.outcome, ne);
      else logFeatureBad("mcp_serve_tool_host_permission", z.outcome, ne);
    }
    return v ? withShellDirectoryMeta(z.result, xo(session).cwd) : z.result;
  } finally {
    release();
  }
}
//@ chunk-dz36xfxg.js:29780-29949 placement
function launchDirGoneMessage(e) {
  return `${e} was not run: the directory that this server was started in is gone (deleted, moved, replaced by a link, or unreadable). Retrying won't help.`;
}
//@ chunk-dz36xfxg.js:29949-30210 placement
function startDirGoneMessage(e, n, t) {
  return `${e} was not run: the directory it was to start in is gone (deleted, moved, replaced by a link, or unreadable). The next call starts in ${n}. Check that this call still does what you mean there, then send it again. What is gone: ${t}`;
}
//@ chunk-dz36xfxg.js:30210-30291 placement
async function pe(e) {
  try {
    return Mn(await realpath(`${e}/`)) === e ? e : void 0;
  } catch {
    return;
  }
}
//@ chunk-dz36xfxg.js:30291-30431 placement
async function resolveServeDirectories(e) {
  let { cwd: cwd, originalCwd: originalCwd } = xo(e),
    r = await pe(originalCwd);
  return { daemonCwd: cwd, launchDirectory: r, intactDirectory: cwd === originalCwd ? r : await pe(cwd) };
}
//@ chunk-dz36xfxg.js:30431-30944 placement
function callServedTool(e, n, t, r) {
  return call(
    {
      ...e,
      inputFromAnotherMachine: !0,
      toolUseId: n.tool_use_id,
      readFileState: readFileStateFor(e.session, n.agent_id),
      agentId: n.agent_id === void 0 ? void 0 : Mr(n.agent_id),
      permissionLayers: [
        ...(e.permissionLayers ?? []),
        ...(n.agent_effort_level === void 0 ? [] : [{ kind: "effort", effort: n.agent_effort_level }]),
      ],
      options: {
        ...e.options,
        mainLoopModel: n.main_loop_model,
        tools:
          n.agent_has_read_tool === !0
            ? e.options.tools
            : e.options.tools.filter((tool) => !poolCanRead({ tools: [tool] })),
      },
    },
    buildNativeDoctorDiagnostics(n.permission_context, t, xo(e.session).originalCwd, r),
  );
}
//@ chunk-dz36xfxg.js:30944-31033 placement = call (0.777)
function call(onDone, context) {
  let t = { ...serveModeDefaultAppState(), toolPermissionContext: context };
  return { ...onDone, getAppState: () => t };
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
async function runPermissionedToolHostCall(e, n, t, r, i, s, a, d, k, l) {
  let y = await precheckToolHostCall(e, n, r);
  if ("refusal" in y) return notServedOutcome(y.refusal, y.message);
  if ("kind" in y) return permissionOnlyResult(e, y);
  let w = classifyBashBackgrounding(e, n, t.tool_host_interface.version, r, l);
  if (w === "under_a_rule")
    return notServedOutcome(
      "background_under_a_rule",
      `${e.name} was not run: a deny or ask permission rule names run_in_background. Send the call again without it. If you did not set it, a hook of this session did: tell the user.`,
    );
  if (isCallRunBarred(r.session, t.tool_use_id)) return barredCallOutcome(e);
  let { cwd: cwd } = xo(r.session),
    C = approvalForStep(t),
    O = t.classifier_may_approve ?? [],
    R =
      C === void 0
        ? await checkToolHostPermission(e, y, r, cwd, O)
        : await runWithNativeDoctor(e, y, r, cwd, O, C, i, s);
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
          ...permissionOnlyResult(e, { kind: "deny", message: R.message, reason: R.reason }),
          outcome: R.policy,
        };
      case "ask":
        return { ...permissionOnlyResult(e, R.verdict), settingsWriteSuspicion: R.settingsWriteSuspicion };
      case "deny":
        return permissionOnlyResult(e, R);
    }
  switch (t.step) {
    case "check":
      return permissionOnlyResult(e, {
        kind: "allow",
        ...(R.shellAllowSource !== void 0 && {
          shell_allow_source: R.shellAllowSource === "readOnly" ? "read_only" : "sandbox",
        }),
      });
    case "run":
      break;
    default:
      throw Error("A ToolHost permission request with an unknown step reached the permission check.");
  }
  if ((await pe(cwd)) === void 0)
    return notServedOutcome(
      C === void 0 ? "start_directory_changed" : "ask_changed",
      `${e.name} was not run: the directory it was to start in was deleted, moved, replaced by a link, or made unreadable while its permission was checked. Send the call again.`,
    );
  let S = claimCallRun(r.session, t.tool_use_id);
  if (S === "barred") return barredCallOutcome(e);
  if (S === "started_before") return { result: duplicateCallError(e.name), outcome: "already_started" };
  try {
    return {
      ...(await runServedBashCall(
        e,
        n,
        R.callInput,
        r,
        a,
        { sessionVersion: t.tool_host_interface.version, isSubagent: t.agent_id !== void 0 },
        d,
        k,
        w,
      )),
      settingsWriteSuspicion: R.settingsWriteSuspicion,
    };
  } finally {
    releaseCallRun(r.session, t.tool_use_id);
  }
}
/**
 * 对 ToolHost 调用做声明式权限检查（规则、模式、分类器），把结果映射为允许/拒绝/询问。
 */
//@ chunk-dz36xfxg.js:33128-34929 placement
async function checkToolHostPermission(e, n, t, r, i) {
  let s = await checkDeclarativePermission(e, n.observableInput, t, { crashIsObjection: !0 }).catch((P) => {
    if (t.abortController.signal.aborted) throw P;
    logUnexpectedThrow(e, P);
    return;
  });
  if (
    s === void 0 ||
    (s.decisionReason?.type === "other" && s.decisionReason.reason === PERMISSION_CHECK_CRASHED_REASON)
  )
    return { kind: "crashed" };
  if (s.behavior === "deny")
    return { kind: "deny", message: s.message, reason: serializeDecisionReason(s.decisionReason) };
  if (
    !isBashToolName(e.name) &&
    e.name !== MONITOR &&
    s.behavior === "ask" &&
    isOutsideReadsBlockedAsk(s.decisionReason)
  )
    return {
      kind: "denied_by_policy",
      policy: "outside_reads_blocked",
      message: s.message,
      reason: serializeDecisionReason({ type: "other", reason: s.decisionReason.reason }),
    };
  let a = s.updatedInput === void 0 || isEmptyObject(s.updatedInput) ? n.observableInput : s.updatedInput,
    d = restoreCallInput(n, a),
    k = s.behavior === "allow" ? planModeWriteAsk(e, a, getToolPermissionContext(t).mode, t) : s;
  if (k === void 0)
    return { kind: "allow", callInput: d, shellAllowSource: serverHeldShellAllowSource(e, s) };
  let l = e.name === MONITOR ? findToolByName(getAllBaseTools(), BASH_TOOL_NAME) : e;
  if (l === void 0) return { kind: "crashed" };
  let y = { mode: getToolPermissionContext(t).mode, classifierMayApprove: i },
    w = await resolveToolHostAsk(l, a, k, r, y, t).catch((P) => {
      if (t.abortController.signal.aborted) throw P;
      logUnexpectedThrow(e, P);
      return;
    });
  if (w === void 0) return { kind: "crashed" };
  let { ask: ask, suspicion: suspicion } = w,
    O = describeToolHostAsk(e, a, ask, y, t);
  if (O === void 0)
    return {
      kind: "refused",
      refusal: "ask_too_large",
      message: `${e.name} was not run: the permission check's objections are too many, or one is too long, to put to the user, so nobody was asked. Send smaller calls, or use shorter paths. The check said: ${ask.message}`,
    };
  let { toolUseId: toolUseId } = t;
  if (toolUseId === void 0) return { kind: "crashed" };
  let S = askRuleFromRule(ask.matchedAskRule);
  return {
    kind: "ask",
    verdict: {
      kind: "ask",
      message: ask.message,
      ask_digest: settingsFileContentHash({
        tool_name: e.name,
        input: a,
        cwd: r,
        reasons: O,
        tool_use_id: toolUseId,
        agent_id: t.agentId ?? null,
        tool_host_life_id: mcpServeSessionId(t.session),
      }),
      reasons: O,
      ...(S !== void 0 && { matched_ask_rule: S }),
      ...(ask.blockedPath && { blocked_path: ask.blockedPath }),
      suggested_allow_rules:
        offersAlwaysAllow(ask) && suspicion === void 0 ? allowRulesFromUpdates(ask.suggestions) : [],
    },
    callInput: d,
    settingsWriteSuspicion: suspicion,
  };
}
//@ chunk-dz36xfxg.js:34929-35066 placement
function planModeWriteAsk(e, n, t, r) {
  if (!isPlanModeWrite(e, n, t, r)) return;
  let i = { type: "mode", mode: "plan" };
  return { behavior: "ask", message: createPermissionRequestMessage(e.name, i), decisionReason: i };
}
//@ chunk-dz36xfxg.js:35066-36259 placement
async function runWithNativeDoctor(e, n, t, r, i, s, a, d) {
  let k = buildNativeDoctorDiagnostics(s.permission_context, a, xo(t.session).originalCwd, d),
    l = await checkToolHostPermission(e, n, call(t, k), r, i),
    y = await checkToolHostPermission(e, n, t, r, i);
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
  let mode = getToolPermissionContext(t).mode;
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
      reason: { type: "other", name: "other", description: "approver_not_user" },
    };
  return { kind: "allow", callInput: l.callInput, settingsWriteSuspicion: l.settingsWriteSuspicion };
}
//@ chunk-dz36xfxg.js:36259-36524 placement
async function denyNestedPermissionAsk(e) {
  return {
    behavior: "deny",
    message: `${e.name} was not run: a tool that runs in the cloud environment cannot ask for another permission while it runs. Send it as a call of its own.`,
    decisionReason: { type: "other", reason: "asked inside a served call" },
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
