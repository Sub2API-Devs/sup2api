/**
 * tools/shared/spawnMultiAgent.ts
 *
 * 队友派生：进程内 / tmux 分屏 / 新窗口三种后端、权限模式透传参数与任务登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/shared/spawnMultiAgent.ts
 * pieces: chunk-cne5hsvz.js (13), chunk-hntsfzas.js (1)
 * attribution: sole-consumer 4, fingerprint 9, affinity 1
 */
import { withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
import { processWrapperError } from "../../utils/processWrapper.js";
import {
  SwarmPaneError,
  setMemberPaneInfo,
  sanitizeName,
  assertNoControlChars,
  isPaneBackendType,
} from "../../utils/swarm/teamHelpers.js";
import {
  TEAMMATE_COMMAND_ENV_VAR,
  TMUX,
  TEAM_LEAD,
  CLAUDE_SWARM,
  CAT,
  TEAMMATES_UNAVAILABLE_MESSAGE,
} from "../../utils/swarm/constants.js";
import { withProcessWrapper, getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { wasProactivityEverOn } from "../../Tool.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { getPDFPageCount } from "../../utils/pdf.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  teammateModelFlags,
  envAssignment,
  teammateEnvArgs,
} from "../../utils/swarm/teammateEnvForwarding.js";
import { getCwd } from "../../utils/cwd.js";
import { reserveTeammateAndSpawn } from "./_new/reserveTeammateAndSpawn.js";
import {
  detectAndGetBackend,
  resetBackendDetection,
  getBackendByType,
  isInProcessEnabled,
  markInProcessFallback,
} from "../../utils/swarm/backends/registry.js";
import { isTmuxAvailable, isInsideTmux, isInITerm2 } from "../../utils/swarm/backends/detection.js";
import { IT2_SETUP_DIALOG } from "../../utils/swarm/it2SetupResult.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { getSessionId, isDiskless } from "../../bootstrap/state.js";
import { buildInheritedCliFlags } from "../../utils/swarm/spawnUtils.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  clearMailbox,
  writeToMailbox,
  isStructuredProtocolMessage,
  PROTOCOL_FRAME_PROMPT_ERROR,
} from "../../utils/teammateMailbox.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { respawnPaneWithCommand } from "../../utils/swarm/backends/TmuxBackend.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { yOr, spawnInProcessTeammate } from "../../utils/swarm/spawnInProcess.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { logForDebugging } from "../../utils/debug.js";
import { startInProcessTeammate } from "../../utils/swarm/inProcessRunner.js";
import { MG } from "../../utils/swarm/teammateIds.js";
import { zSi } from "../../utils/plugins/pluginLoadState.js";
import { AGENT } from "../AgentTool/constants.js";
import { getTeammateModeFromSnapshot } from "../../utils/swarm/backends/teammateModeSnapshot.js";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";

//@ chunk-cne5hsvz.js:14172-14199 sole-consumer
function q() {
  return withHostOwnedEnv(teammateLaunchCommand);
}
/**
 * 队友进程的启动命令（自定义命令或当前二进制，套用进程包装器）；包装器配置错误时抛错。
 */
//@ chunk-cne5hsvz.js:14199-14457 sole-consumer
function teammateLaunchCommand() {
  let e = processWrapperError();
  if (e)
    throw new SwarmPaneError(
      `${e} \u2014 the teammate is not started unwrapped; fix the launcher setting, then retry`,
    );
  let n = process.env[TEAMMATE_COMMAND_ENV_VAR],
    { cmd: cmd, prefixArgs: prefixArgs } = n
      ? withProcessWrapper({ cmd: n, prefixArgs: [], target: n })
      : getLaunchCommand({ pinToCurrentBinary: !0 });
  return [cmd, ...prefixArgs];
}
/**
 * 把父会话的权限模式转成队友进程的 CLI 参数（--dangerously-skip-permissions / --permission-mode …），plan_mode_required 时用 plan。
 */
//@ chunk-cne5hsvz.js:14457-14913 fingerprint = buildInheritedCliFlags (0.584)
function buildInheritedCliFlags_2({
  planModeRequired: planModeRequired,
  permissionMode: permissionMode,
  proactivityLevel: proactivityLevel,
  autoPickedByLevel: autoPickedByLevel = !1,
}) {
  if (permissionMode === void 0) return [];
  let E = permissionMode;
  if (planModeRequired) E = "plan";
  else if (proactivityLevel !== void 0)
    E = cycleAllTeammateModes(permissionMode, proactivityLevel, autoPickedByLevel);
  switch (E) {
    case "bypassPermissions":
      return ["--dangerously-skip-permissions"];
    case "acceptEdits":
      return ["--permission-mode acceptEdits"];
    case "auto":
      return ["--permission-mode auto"];
    case "default":
    case "plan":
    case "dontAsk":
    case "bubble":
      return proactivityLevel !== void 0 && wasProactivityEverOn()
        ? [`--permission-mode ${toExternalPermissionMode(E)}`]
        : [];
  }
}
//@ chunk-cne5hsvz.js:19108-19187 fingerprint = hasSession (1)
async function hasSession(sessionName) {
  return (await execFileNoThrow(TMUX, ["has-session", "-t", sessionName], getPDFPageCount())).code === 0;
}
//@ chunk-cne5hsvz.js:19187-19463 fingerprint = ensureSession (0.71)
async function ensureSession(sessionName) {
  if (!(await hasSession(sessionName))) {
    let a = await execFileNoThrow(TMUX, ["new-session", "-d", "-s", sessionName], {
      ...getPDFPageCount(),
      useToolMemoryCgroup: !1,
    });
    if (a.code !== 0)
      throw (
        logFeatureBad("subagent_launch", "subagent_teammate_tmux_session_failed"),
        Error(`Failed to create tmux session '${sessionName}': ${a.stderr || "Unknown error"}`)
      );
  }
}
/**
 * 在 tmux/iTerm2 分屏中启动队友进程。
 */
//@ chunk-cne5hsvz.js:23023-26086 fingerprint = handleSpawnSplitPane (0.76)
async function handleSpawnSplitPane(input, context) {
  let { setAppState: setAppState, getAppState: getAppState } = context,
    {
      name: name,
      prompt: prompt,
      agent_type: agent_type,
      cwd: cwd,
      plan_mode_required: plan_mode_required,
    } = input,
    T = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_missing_params"),
      Error("name and prompt are required for spawn operation")
    );
  let appState = getAppState(),
    u = appState.teamContext?.teamName;
  if (!u)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_no_team_name"),
      Error(
        "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
      )
    );
  let w = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    u,
    { agentType: agent_type, model: T, prompt: prompt, planModeRequired: plan_mode_required, cwd: w },
    context.teammateColors,
    async ({ sanitizedName: sanitizedName, teammateId: teammateId, teammateColor: teammateColor }, P, s) => {
      let detectionResult = await detectAndGetBackend();
      if (detectionResult.needsIt2Setup && context.requestDialog) {
        let tmuxAvailable = await isTmuxAvailable(),
          requestDialog = await context.requestDialog(IT2_SETUP_DIALOG, { tmuxAvailable: tmuxAvailable });
        if (requestDialog === "cancelled")
          throw (
            logFeatureBad("subagent_launch", "subagent_teammate_iterm_cancelled"),
            new SwarmPaneError("Teammate spawn cancelled - iTerm2 setup required")
          );
        if (requestDialog === "installed" || requestDialog === "use-tmux")
          (resetBackendDetection(), (detectionResult = await detectAndGetBackend()));
      }
      let insideTmux = await isInsideTmux(),
        { paneId: paneId, isFirstTeammate: isFirstTeammate } =
          await detectionResult.backend.createTeammatePaneInSwarmView(sanitizedName, teammateColor);
      if (
        (s(() => detectionResult.backend.killPane(paneId, !insideTmux)),
        await setMemberPaneInfo(
          u,
          teammateId,
          { tmuxPaneId: paneId, backendType: detectionResult.backend.type },
          context.storageV5,
        ),
        isFirstTeammate && insideTmux)
      )
        await detectionResult.backend.enablePaneBorderStatus();
      let binaryPath = q(),
        teammateArgs = [
          envAssignment("--agent-id", teammateId),
          envAssignment("--agent-name", sanitizedName),
          envAssignment("--team-name", u),
          `--agent-color ${shellQuoteArgs([teammateColor])}`,
          `--parent-session-id ${shellQuoteArgs([getSessionId()])}`,
          plan_mode_required ? "--plan-mode-required" : "",
          agent_type ? envAssignment("--agent-type", agent_type) : "",
        ]
          .filter(Boolean)
          .join(" "),
        inheritedFlags = buildInheritedCliFlags({
          planModeRequired: plan_mode_required,
          permissionMode: appState.toolPermissionContext.mode,
          proactivityLevel: appState.proactivityLevel,
          autoPickedByLevel: hasLeftProactivityBaseline(appState.toolPermissionContext),
          sessionEffort: appState.sessionEffort,
          permissionRules: getToolPermissionContext(context),
          skipModel: !!T,
        });
      if (T)
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} ${envAssignment("--model", T)}`
          : envAssignment("--model", T);
      let V = inheritedFlags ? ` ${inheritedFlags}` : "",
        envStr = teammateEnvArgs(),
        spawnCommand = `cd ${shellQuoteArgs([w])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${V}`;
      if (
        (await clearMailbox(sanitizedName, u, context.storageV5),
        (await writeToMailbox(
          sanitizedName,
          { from: TEAM_LEAD, text: prompt, timestamp: new Date().toISOString() },
          u,
          context.storageV5,
        )) === void 0)
      )
        throw (
          logFeatureBad("subagent_launch", "subagent_teammate_prompt_write_failed"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Failed to write initial instructions to ${sanitizedName}'s inbox \u2014 spawn aborted`,
            "spawnMultiAgent: failed to write initial teammate instructions \u2014 spawn aborted",
          )
        );
      (await detectionResult.backend.sendCommandToPane(paneId, spawnCommand, !insideTmux),
        logFeatureOk("swarm_pane_spawn"),
        P());
      let Q = insideTmux ? "current" : CLAUDE_SWARM,
        re = insideTmux ? "current" : "swarm-view";
      return (
        setAppState((prev) => ({
          ...prev,
          teamContext: {
            ...prev.teamContext,
            teamName: u ?? prev.teamContext?.teamName ?? "default",
            teamFilePath: prev.teamContext?.teamFilePath ?? "",
            leadAgentId: prev.teamContext?.leadAgentId ?? "",
            teammates: {
              ...(prev.teamContext?.teammates || {}),
              [teammateId]: {
                name: sanitizedName,
                agentType: agent_type,
                color: teammateColor,
                tmuxSessionName: Q,
                tmuxPaneId: paneId,
                cwd: w,
                spawnedAt: Date.now(),
              },
            },
          },
        })),
        registerOutOfProcessTeammateTask(context.taskRegistry, {
          teammateId: teammateId,
          sanitizedName: sanitizedName,
          teamName: u,
          teammateColor: teammateColor,
          prompt: prompt,
          plan_mode_required: plan_mode_required,
          paneId: paneId,
          insideTmux: insideTmux,
          backendType: detectionResult.backend.type,
          toolUseId: context.toolUseId,
          cwd: w,
          description: input.description,
          spawnedWith: {
            description: input.description,
            agentType: agent_type,
            parentAgentId: context.agentId,
          },
        }),
        {
          data: {
            teammate_id: teammateId,
            agent_id: teammateId,
            agent_type: agent_type,
            model: T,
            name: sanitizedName,
            color: teammateColor,
            tmux_session_name: Q,
            tmux_window_name: re,
            tmux_pane_id: paneId,
            team_name: u,
            is_splitpane: !0,
            plan_mode_required: plan_mode_required,
          },
        }
      );
    },
    context.storageV5,
  );
}
/**
 * 在新 tmux 窗口中启动队友进程。
 */
//@ chunk-cne5hsvz.js:26086-29036 fingerprint = handleSpawnSeparateWindow (0.743)
async function handleSpawnSeparateWindow(input, context) {
  let { setAppState: setAppState, getAppState: getAppState } = context,
    {
      name: name,
      prompt: prompt,
      agent_type: agent_type,
      cwd: cwd,
      plan_mode_required: plan_mode_required,
    } = input,
    T = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_missing_params"),
      Error("name and prompt are required for spawn operation")
    );
  let appState = getAppState(),
    u = appState.teamContext?.teamName;
  if (!u)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_no_team_name"),
      Error(
        "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
      )
    );
  let w = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    u,
    { agentType: agent_type, model: T, prompt: prompt, planModeRequired: plan_mode_required, cwd: w },
    context.teammateColors,
    async ({ sanitizedName: sanitizedName, teammateId: teammateId, teammateColor: teammateColor }, P, s) => {
      let windowName = `teammate-${sanitizeName(sanitizedName)}`;
      await ensureSession(CLAUDE_SWARM);
      let R = await execFileNoThrow(
        TMUX,
        ["new-window", "-t", CLAUDE_SWARM, "-n", windowName, "-P", "-F", "#{pane_id}", "--", CAT],
        getPDFPageCount(),
      );
      if (R.code !== 0)
        throw (
          logFeatureBad("subagent_launch", "subagent_teammate_tmux_window_failed"),
          Error(`Failed to create tmux window: ${R.stderr}`)
        );
      let paneId = R.stdout.trim();
      (s(() => execFileNoThrow(TMUX, ["kill-pane", "-t", paneId], getPDFPageCount())),
        await setMemberPaneInfo(
          u,
          teammateId,
          { tmuxPaneId: paneId, backendType: "tmux" },
          context.storageV5,
        ));
      let binaryPath = q(),
        teammateArgs = [
          envAssignment("--agent-id", teammateId),
          envAssignment("--agent-name", sanitizedName),
          envAssignment("--team-name", u),
          `--agent-color ${shellQuoteArgs([teammateColor])}`,
          `--parent-session-id ${shellQuoteArgs([getSessionId()])}`,
          plan_mode_required ? "--plan-mode-required" : "",
          agent_type ? envAssignment("--agent-type", agent_type) : "",
        ]
          .filter(Boolean)
          .join(" "),
        inheritedFlags = buildInheritedCliFlags({
          planModeRequired: plan_mode_required,
          permissionMode: appState.toolPermissionContext.mode,
          proactivityLevel: appState.proactivityLevel,
          autoPickedByLevel: hasLeftProactivityBaseline(appState.toolPermissionContext),
          sessionEffort: appState.sessionEffort,
          permissionRules: getToolPermissionContext(context),
          skipModel: !!T,
        });
      if (T)
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} ${envAssignment("--model", T)}`
          : envAssignment("--model", T);
      let flagsStr = inheritedFlags ? ` ${inheritedFlags}` : "",
        envStr = teammateEnvArgs(),
        spawnCommand = `cd ${shellQuoteArgs([w])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${flagsStr}`;
      if (
        (await clearMailbox(sanitizedName, u, context.storageV5),
        (await writeToMailbox(
          sanitizedName,
          { from: TEAM_LEAD, text: prompt, timestamp: new Date().toISOString() },
          u,
          context.storageV5,
        )) === void 0)
      )
        throw (
          logFeatureBad("subagent_launch", "subagent_teammate_prompt_write_failed"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Failed to write initial instructions to ${sanitizedName}'s inbox \u2014 spawn aborted`,
            "spawnMultiAgent: failed to write initial teammate instructions \u2014 spawn aborted",
          )
        );
      try {
        assertNoControlChars(spawnCommand);
      } catch (error) {
        throw (logFeatureBad("subagent_launch", "subagent_teammate_control_chars"), error);
      }
      try {
        await respawnPaneWithCommand([], paneId, spawnCommand, getPDFPageCount());
      } catch (error) {
        throw (logFeatureBad("subagent_launch", "subagent_teammate_tmux_respawn_failed"), error);
      }
      return (
        P(),
        setAppState((prev) => ({
          ...prev,
          teamContext: {
            ...prev.teamContext,
            teamName: u ?? prev.teamContext?.teamName ?? "default",
            teamFilePath: prev.teamContext?.teamFilePath ?? "",
            leadAgentId: prev.teamContext?.leadAgentId ?? "",
            teammates: {
              ...(prev.teamContext?.teammates || {}),
              [teammateId]: {
                name: sanitizedName,
                agentType: agent_type,
                color: teammateColor,
                tmuxSessionName: CLAUDE_SWARM,
                tmuxPaneId: paneId,
                cwd: w,
                spawnedAt: Date.now(),
              },
            },
          },
        })),
        registerOutOfProcessTeammateTask(context.taskRegistry, {
          teammateId: teammateId,
          sanitizedName: sanitizedName,
          teamName: u,
          teammateColor: teammateColor,
          prompt: prompt,
          plan_mode_required: plan_mode_required,
          paneId: paneId,
          insideTmux: !1,
          backendType: "tmux",
          toolUseId: context.toolUseId,
          cwd: w,
          description: input.description,
          spawnedWith: {
            description: input.description,
            agentType: agent_type,
            parentAgentId: context.agentId,
          },
        }),
        {
          data: {
            teammate_id: teammateId,
            agent_id: teammateId,
            agent_type: agent_type,
            model: T,
            name: sanitizedName,
            color: teammateColor,
            tmux_session_name: CLAUDE_SWARM,
            tmux_window_name: windowName,
            tmux_pane_id: paneId,
            team_name: u,
            is_splitpane: !1,
            plan_mode_required: plan_mode_required,
          },
        }
      );
    },
    context.storageV5,
  );
}
/**
 * 为 pane 队友在任务表登记 in_process_teammate 任务（可杀死 pane）。
 */
//@ chunk-cne5hsvz.js:29036-29789 fingerprint = registerOutOfProcessTeammateTask (0.909)
function registerOutOfProcessTeammateTask(
  setAppState,
  {
    teammateId: teammateId,
    sanitizedName: sanitizedName,
    teamName: teamName,
    teammateColor: teammateColor,
    prompt: prompt,
    plan_mode_required: plan_mode_required,
    paneId: paneId,
    insideTmux: insideTmux,
    backendType: backendType,
    toolUseId: toolUseId,
    cwd: cwd,
    description: description,
    spawnedWith: spawnedWith,
  },
) {
  let taskId = generateTaskId("in_process_teammate"),
    y = description || yOr(prompt),
    abortController = new AbortController(),
    s,
    S = isPaneBackendType(backendType)
      ? () => (s ??= getBackendByType(backendType).killPane(paneId, !insideTmux))
      : void 0,
    R = {
      ...createTaskStateBase(taskId, "in_process_teammate", y, toolUseId),
      type: "in_process_teammate",
      status: "running",
      cwd: cwd,
      identity: {
        agentId: teammateId,
        agentName: sanitizedName,
        teamName: teamName,
        color: teammateColor,
        planModeRequired: plan_mode_required ?? !1,
        parentSessionId: getSessionId(),
      },
      spawnedWith: spawnedWith,
      prompt: prompt,
      abortController: abortController,
      awaitingPlanApproval: !1,
      permissionMode: plan_mode_required ? "plan" : "default",
      isIdle: !1,
      lastReportedToolCount: 0,
      lastReportedTokenCount: 0,
      pendingUserMessages: [],
      paneTeardown: S,
    };
  if ((setAppState.register(R), S))
    abortController.signal.addEventListener(
      "abort",
      () => {
        S();
      },
      { once: !0 },
    );
}
/**
 * 进程内队友：准备团队成员记录、清空邮箱、spawnInProcessTeammate 并启动其循环。
 */
//@ chunk-cne5hsvz.js:29789-32223 fingerprint = handleSpawnInProcess (0.744)
async function handleSpawnInProcess(input, context) {
  let { setAppState: setAppState, getAppState: getAppState } = context,
    { name: name, prompt: prompt, agent_type: agent_type, plan_mode_required: plan_mode_required } = input,
    r = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_missing_params"),
      Error("name and prompt are required for spawn operation")
    );
  let _ = getAppState().teamContext?.teamName;
  if (!_)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_no_team_name"),
      Error(
        "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
      )
    );
  let u = input.agentDefinition && !isBuiltInAgent(input.agentDefinition) ? input.agentDefinition : void 0;
  if (agent_type) logForDebugging(`[handleSpawnInProcess] agent_type=${agent_type}, found=${!!u}`);
  return reserveTeammateAndSpawn(
    name,
    _,
    { agentType: agent_type, model: r, prompt: prompt, planModeRequired: plan_mode_required, cwd: getCwd() },
    context.teammateColors,
    async ({ sanitizedName: sanitizedName, teammateId: teammateId, teammateColor: teammateColor }, y) => {
      await setMemberPaneInfo(
        _,
        teammateId,
        { tmuxPaneId: "in-process", backendType: "in-process" },
        context.storageV5,
      );
      let P = {
        name: sanitizedName,
        teamName: _,
        prompt: prompt,
        color: teammateColor,
        planModeRequired: plan_mode_required ?? !1,
        model: r,
        description: input.description,
        spawnedWith: {
          description: input.description,
          agentType: agent_type,
          parentAgentId: context.agentId,
        },
      };
      await clearMailbox(sanitizedName, _, context.storageV5);
      let uniqueName = await spawnInProcessTeammate(P, context);
      if (!uniqueName.ok)
        throw (
          logFeatureBad("subagent_launch", "subagent_teammate_inprocess_failed"),
          logForDebugging(`[handleSpawnInProcess] spawn failed: ${uniqueName.error}`),
          Error("Failed to spawn in-process teammate")
        );
      (y(),
        startInProcessTeammate({
          identity: uniqueName.identity,
          taskId: uniqueName.taskId,
          prompt: prompt,
          description: input.description,
          spawnedAgentType: agent_type,
          model: r,
          agentDefinition: u,
          teammateContext: uniqueName.teammateContext,
          toolUseContext: { ...context, messages: [] },
          abortController: uniqueName.abortController,
          invokingRequestId: input.invokingRequestId,
        }),
        logForDebugging(`[handleSpawnInProcess] Started agent execution for ${teammateId}`));
      let S = getAppState().teamContext?.leadAgentId,
        needsLeaderSetup = !S,
        I = S ?? MG(TEAM_LEAD, _),
        N = needsLeaderSetup ? context.teammateColors.assign(I) : void 0;
      return (
        setAppState((v) => {
          let U = v.teamContext?.teammates || {},
            M = needsLeaderSetup
              ? {
                  [I]: {
                    name: TEAM_LEAD,
                    agentType: TEAM_LEAD,
                    color: N,
                    tmuxSessionName: "in-process",
                    tmuxPaneId: "leader",
                    cwd: getCwd(),
                    spawnedAt: Date.now(),
                  },
                }
              : {};
          return {
            ...v,
            teamContext: {
              ...v.teamContext,
              teamName: _ ?? v.teamContext?.teamName ?? "default",
              teamFilePath: v.teamContext?.teamFilePath ?? "",
              leadAgentId: I,
              teammates: {
                ...U,
                ...M,
                [teammateId]: {
                  name: sanitizedName,
                  agentType: agent_type,
                  color: teammateColor,
                  tmuxSessionName: "in-process",
                  tmuxPaneId: "in-process",
                  cwd: getCwd(),
                  spawnedAt: Date.now(),
                },
              },
            },
          };
        }),
        {
          loopAgentId: uniqueName.identity.resumableAgentId,
          data: {
            teammate_id: teammateId,
            agent_id: uniqueName.identity.resumableAgentId ?? teammateId,
            agent_type: agent_type,
            model: r,
            name: sanitizedName,
            color: teammateColor,
            tmux_session_name: "in-process",
            tmux_window_name: "in-process",
            tmux_pane_id: "in-process",
            team_name: _,
            is_splitpane: !1,
            plan_mode_required: plan_mode_required,
          },
        }
      );
    },
    context.storageV5,
  );
}
/**
 * 派生队友：拒绝协议帧 prompt；启用进程内队友时直接进程内运行；否则探测 pane 后端（tmux/iTerm2），不可用且模式为 auto 时回退进程内，否则按 use_splitpane 开分屏或新窗口。
 */
//@ chunk-cne5hsvz.js:32223-33045 fingerprint = handleSpawn (0.326)
async function handleSpawn(spawnInput, context, onProgress) {
  if (spawnInput.prompt && isStructuredProtocolMessage(spawnInput.prompt))
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_protocol_frame_prompt"),
      Error(PROTOCOL_FRAME_PROMPT_ERROR)
    );
  if (isInProcessEnabled()) return handleSpawnInProcess(spawnInput, context);
  if (spawnInput.agent_type && zSi(spawnInput.agent_type))
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_runtime_agent_type"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Agent type '${spawnInput.agent_type}' was registered at run time by a plugin and exists only in this process; a pane-based teammate cannot run it. Spawn it with the ${AGENT} tool instead, or use in-process teammates.`,
        "pane teammate cannot run a run-time registered agent type",
      )
    );
  try {
    await detectAndGetBackend();
  } catch (error) {
    if (getTeammateModeFromSnapshot() !== "auto")
      throw (logFeatureBad("subagent_launch", "subagent_teammate_pane_unavailable"), error);
    return (
      logForDebugging(
        `[handleSpawn] No pane backend available, falling back to in-process: ${errorMessage(error)}`,
      ),
      markInProcessFallback(),
      notifyPaneFallback(context.toolState.get(oe), onProgress),
      handleSpawnInProcess(spawnInput, context)
    );
  }
  if (spawnInput.use_splitpane !== !1) return handleSpawnSplitPane(spawnInput, context);
  return handleSpawnSeparateWindow(spawnInput, context);
}
//@ chunk-cne5hsvz.js:33045-33063 affinity
class oe {
  shown = !1;
}
/**
 * 无法打开队友窗格时提示改为进程内运行（只提示一次）。
 */
//@ chunk-cne5hsvz.js:33063-33494 sole-consumer
function notifyPaneFallback(e, n) {
  if (e.shown) return;
  e.shown = !0;
  let a = isInITerm2()
    ? 'To force iTerm2 panes, set teammateMode: "iterm2" in settings and enable the iTerm2 Python API (Preferences > General > Magic).'
    : 'To use terminal panes, set teammateMode: "tmux" in settings.';
  n?.({
    type: "notification",
    notification: {
      key: "teammate-auto-fallback",
      text: `Couldn't open a teammate pane \u2014 running in-process instead. ${a}`,
      color: "warning",
      priority: "high",
    },
  });
}
/**
 * 无盘会话拒绝派生队友，否则执行派生。
 */
//@ chunk-cne5hsvz.js:33494-33661 sole-consumer
async function spawnTeammateChecked(e, n, a) {
  if (isDiskless())
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_diskless"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        TEAMMATES_UNAVAILABLE_MESSAGE,
        "teammate spawn refused in a session with no disk",
      )
    );
  return handleSpawn(e, n, a);
}
/**
 * 队友启动命令：编译版用 execPath，否则 argv[1]。
 */
//@ chunk-hntsfzas.js:6798-6916 fingerprint = getTeammateCommand (1)
function getTeammateCommand() {
  try {
    if (isStandaloneExecutable()) return process.execPath || "unknown";
    return process.argv[1] || "unknown";
  } catch {
    return "unknown";
  }
}

export { buildInheritedCliFlags_2, getTeammateCommand };
