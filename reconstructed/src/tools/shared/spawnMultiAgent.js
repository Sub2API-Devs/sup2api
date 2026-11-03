/**
 * tools/shared/spawnMultiAgent.ts
 *
 * 队友派生：进程内 / tmux 分屏 / 新窗口三种后端、权限模式透传参数与任务登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/shared/spawnMultiAgent.ts
 * pieces: chunk-cne5hsvz.js (15), chunk-hntsfzas.js (1)
 * attribution: sole-consumer 4, fingerprint 9, placement 2, affinity 1
 */
import { withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
import { processWrapperError } from "../../utils/processWrapper.js";
import {
  SwarmPaneError,
  hasControlChars,
  updateTeamFile,
  removeTeamMember,
  sanitizeAgentName,
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
import { agentAddress } from "../../utils/swarm/teammateIds.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { isReservedSessionName } from "../../utils/sessionAddresses.js";
import {
  teammateModelFlags,
  envAssignment,
  teammateEnvArgs,
} from "../../utils/swarm/teammateEnvForwarding.js";
import { getCwd } from "../../utils/cwd.js";
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
import { respawnPaneWithCommand } from "../../utils/swarm/backends/TmuxBackend.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { clipPromptDescription, spawnInProcessTeammate } from "../../utils/swarm/spawnInProcess.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { startInProcessTeammate } from "../../utils/swarm/inProcessRunner.js";
import { isRegisteredAgent } from "../../utils/plugins/pluginLoadState.js";
import { AGENT } from "../AgentTool/constants.js";
import { getTeammateModeFromSnapshot } from "../../utils/swarm/backends/teammateModeSnapshot.js";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";

//@ chunk-cne5hsvz.js:14172-14199 sole-consumer
/**
 * 返回队友进程的启动命令（自定义命令或当前二进制，套用宿主环境包装器）。
 */
function teammateLaunchCommandLine() {
  return withHostOwnedEnv(teammateLaunchCommand);
}
//@ chunk-cne5hsvz.js:14199-14457 sole-consumer
/**
 * 队友进程的启动命令（自定义命令或当前二进制，套用进程包装器）；包装器配置错误时抛错。
 */
function teammateLaunchCommand() {
  let e = processWrapperError();
  if (e)
    throw new SwarmPaneError(
      `${e} \u2014 the teammate is not started unwrapped; fix the launcher setting, then retry`,
    );
  let n = process.env[TEAMMATE_COMMAND_ENV_VAR];
  let { cmd, prefixArgs } = n
    ? withProcessWrapper({
        cmd: n,
        prefixArgs: [],
        target: n,
      })
    : getLaunchCommand({
        pinToCurrentBinary: true,
      });
  return [cmd, ...prefixArgs];
}
//@ chunk-cne5hsvz.js:14457-14913 fingerprint = buildInheritedCliFlags (0.584)
/**
 * 把父会话的权限模式转成队友进程的 CLI 参数（--dangerously-skip-permissions / --permission-mode …），plan_mode_required 时用 plan。
 */
function buildInheritedCliFlags_2({
  planModeRequired,
  permissionMode,
  proactivityLevel,
  autoPickedByLevel = false,
}) {
  if (permissionMode === undefined) return [];
  let E = permissionMode;
  if (planModeRequired) E = "plan";
  else if (proactivityLevel !== undefined)
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
      return proactivityLevel !== undefined && wasProactivityEverOn()
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
    let result = await execFileNoThrow(TMUX, ["new-session", "-d", "-s", sessionName], {
      ...getPDFPageCount(),
      useToolMemoryCgroup: false,
    });
    if (result.code !== 0) {
      logFeatureBad("subagent_launch", "subagent_teammate_tmux_session_failed");
      throw Error(`Failed to create tmux session '${sessionName}': ${result.stderr || "Unknown error"}`);
    }
  }
}
//@ chunk-cne5hsvz.js:21257-22255 placement
/**
 * 在团队文件中预留队友身份（名字、id、颜色）后启动；启动提交前失败则清理窗格并移除成员。
 */
async function reserveTeammateAndSpawn(name, teamName, a, teammateColors, E, storageV5) {
  for (let [T, _] of [
    ["name", name],
    ["team_name", teamName],
  ])
    if (hasControlChars(_)) {
      logFeatureBad("subagent_launch", "subagent_teammate_control_chars");
      throw Error(
        T === "name"
          ? "Invalid name: control characters are not allowed in agent or team names"
          : "Invalid team_name: control characters are not allowed in agent or team names",
      );
    }
  let o = await updateTeamFile(
    teamName,
    (T) => {
      let _ = uniqueTeammateName(name, T);
      let u = agentAddress(_, teamName);
      let w = teammateColors.assign(u);
      T.members.push({
        agentId: u,
        name: _,
        color: w,
        joinedAt: Date.now(),
        tmuxPaneId: "",
        subscriptions: [],
        ...a,
      });
      return {
        sanitizedName: _,
        teammateId: u,
        teammateColor: w,
      };
    },
    undefined,
    storageV5,
  );
  if (!o) {
    logFeatureBad("subagent_launch", "subagent_teammate_internal_invariant");
    throw Error("reserveTeammateIdentity: updateTeamFile returned undefined");
  }
  let h = false;
  let r;
  try {
    return await E(
      o,
      () => {
        h = true;
      },
      (T) => {
        r = T;
      },
    );
  } catch (error) {
    if (!h) {
      if (r)
        try {
          await r();
        } catch (error) {
          logForDebugging(`[spawnTeammate] pane cleanup failed for ${o.teammateId}: ${errorMessage(error)}`);
        }
      await removeTeamMember(teamName, o.teammateId, storageV5);
    } else
      logForDebugging(
        `[spawnTeammate] post-commit failure for ${o.teammateId}; entry kept (agent already running): ${errorMessage(error)}`,
      );
    throw error;
  }
}
//@ chunk-cne5hsvz.js:22452-23023 placement
/**
 * 生成不冲突的队友名（拒绝保留名与 agent id 形状，重名加 -N）。
 */
function uniqueTeammateName(e, n) {
  let a = sanitizeAgentName(e);
  if (a === MAIN)
    throw Error(
      '"main" is a reserved recipient name (SendMessage routes it to the main conversation) \u2014 choose another teammate name.',
    );
  if (isReservedSessionName(a))
    throw Error(
      'That teammate name is a reserved name ("main", "team-lead", "user" or "system", in any spelling) or has the shape of an agent id, which already addresses an agent directly \u2014 choose another teammate name.',
    );
  let l = new Set(n.members.map((member) => member.name.toLowerCase()));
  if (!l.has(a.toLowerCase())) return a;
  let E = 2;
  while (l.has(`${a}-${E}`.toLowerCase())) E++;
  return `${a}-${E}`;
}
//@ chunk-cne5hsvz.js:23023-26086 fingerprint = handleSpawnSplitPane (0.76)
/**
 * 在 tmux/iTerm2 分屏中启动队友进程。
 */
async function handleSpawnSplitPane(input, context) {
  let { setAppState, getAppState } = context;
  let { name, prompt, agent_type, cwd, plan_mode_required } = input;
  let model = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt) {
    logFeatureBad("subagent_launch", "subagent_teammate_missing_params");
    throw Error("name and prompt are required for spawn operation");
  }
  let appState = getAppState();
  let teamName = appState.teamContext?.teamName;
  if (!teamName) {
    logFeatureBad("subagent_launch", "subagent_teammate_no_team_name");
    throw Error(
      "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
    );
  }
  let w = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    teamName,
    {
      agentType: agent_type,
      model,
      prompt,
      planModeRequired: plan_mode_required,
      cwd: w,
    },
    context.teammateColors,
    async ({ sanitizedName, teammateId, teammateColor }, P, s) => {
      let detectionResult = await detectAndGetBackend();
      if (detectionResult.needsIt2Setup && context.requestDialog) {
        let tmuxAvailable = await isTmuxAvailable();
        let setupResult = await context.requestDialog(IT2_SETUP_DIALOG, {
          tmuxAvailable,
        });
        if (setupResult === "cancelled") {
          logFeatureBad("subagent_launch", "subagent_teammate_iterm_cancelled");
          throw new SwarmPaneError("Teammate spawn cancelled - iTerm2 setup required");
        }
        if (setupResult === "installed" || setupResult === "use-tmux") {
          resetBackendDetection();
          detectionResult = await detectAndGetBackend();
        }
      }
      let insideTmux = await isInsideTmux();
      let { paneId, isFirstTeammate } = await detectionResult.backend.createTeammatePaneInSwarmView(
        sanitizedName,
        teammateColor,
      );
      s(() => detectionResult.backend.killPane(paneId, !insideTmux));
      await setMemberPaneInfo(
        teamName,
        teammateId,
        {
          tmuxPaneId: paneId,
          backendType: detectionResult.backend.type,
        },
        context.storageV5,
      );
      if (isFirstTeammate && insideTmux) await detectionResult.backend.enablePaneBorderStatus();
      let binaryPath = teammateLaunchCommandLine();
      let teammateArgs = [
        envAssignment("--agent-id", teammateId),
        envAssignment("--agent-name", sanitizedName),
        envAssignment("--team-name", teamName),
        `--agent-color ${shellQuoteArgs([teammateColor])}`,
        `--parent-session-id ${shellQuoteArgs([getSessionId()])}`,
        plan_mode_required ? "--plan-mode-required" : "",
        agent_type ? envAssignment("--agent-type", agent_type) : "",
      ]
        .filter(Boolean)
        .join(" ");
      let inheritedFlags = buildInheritedCliFlags({
        planModeRequired: plan_mode_required,
        permissionMode: appState.toolPermissionContext.mode,
        proactivityLevel: appState.proactivityLevel,
        autoPickedByLevel: hasLeftProactivityBaseline(appState.toolPermissionContext),
        sessionEffort: appState.sessionEffort,
        permissionRules: getToolPermissionContext(context),
        skipModel: !!model,
      });
      if (model)
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} ${envAssignment("--model", model)}`
          : envAssignment("--model", model);
      let flagsStr = inheritedFlags ? ` ${inheritedFlags}` : "";
      let envStr = teammateEnvArgs();
      let spawnCommand = `cd ${shellQuoteArgs([w])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${flagsStr}`;
      await clearMailbox(sanitizedName, teamName, context.storageV5);
      if (
        (await writeToMailbox(
          sanitizedName,
          {
            from: TEAM_LEAD,
            text: prompt,
            timestamp: new Date().toISOString(),
          },
          teamName,
          context.storageV5,
        )) === undefined
      ) {
        logFeatureBad("subagent_launch", "subagent_teammate_prompt_write_failed");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to write initial instructions to ${sanitizedName}'s inbox \u2014 spawn aborted`,
          "spawnMultiAgent: failed to write initial teammate instructions \u2014 spawn aborted",
        );
      }
      await detectionResult.backend.sendCommandToPane(paneId, spawnCommand, !insideTmux);
      logFeatureOk("swarm_pane_spawn");
      P();
      let sessionName = insideTmux ? "current" : CLAUDE_SWARM;
      let windowName = insideTmux ? "current" : "swarm-view";
      setAppState((prev) => ({
        ...prev,
        teamContext: {
          ...prev.teamContext,
          teamName: teamName ?? prev.teamContext?.teamName ?? "default",
          teamFilePath: prev.teamContext?.teamFilePath ?? "",
          leadAgentId: prev.teamContext?.leadAgentId ?? "",
          teammates: {
            ...(prev.teamContext?.teammates || {}),
            [teammateId]: {
              name: sanitizedName,
              agentType: agent_type,
              color: teammateColor,
              tmuxSessionName: sessionName,
              tmuxPaneId: paneId,
              cwd: w,
              spawnedAt: Date.now(),
            },
          },
        },
      }));
      registerOutOfProcessTeammateTask(context.taskRegistry, {
        teammateId,
        sanitizedName,
        teamName,
        teammateColor,
        prompt,
        plan_mode_required,
        paneId,
        insideTmux,
        backendType: detectionResult.backend.type,
        toolUseId: context.toolUseId,
        cwd: w,
        description: input.description,
        spawnedWith: {
          description: input.description,
          agentType: agent_type,
          parentAgentId: context.agentId,
        },
      });
      return {
        data: {
          teammate_id: teammateId,
          agent_id: teammateId,
          agent_type,
          model,
          name: sanitizedName,
          color: teammateColor,
          tmux_session_name: sessionName,
          tmux_window_name: windowName,
          tmux_pane_id: paneId,
          team_name: teamName,
          is_splitpane: true,
          plan_mode_required,
        },
      };
    },
    context.storageV5,
  );
}
//@ chunk-cne5hsvz.js:26086-29036 fingerprint = handleSpawnSeparateWindow (0.743)
/**
 * 在新 tmux 窗口中启动队友进程。
 */
async function handleSpawnSeparateWindow(input, context) {
  let { setAppState, getAppState } = context;
  let { name, prompt, agent_type, cwd, plan_mode_required } = input;
  let T = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt) {
    logFeatureBad("subagent_launch", "subagent_teammate_missing_params");
    throw Error("name and prompt are required for spawn operation");
  }
  let appState = getAppState();
  let teamName = appState.teamContext?.teamName;
  if (!teamName) {
    logFeatureBad("subagent_launch", "subagent_teammate_no_team_name");
    throw Error(
      "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
    );
  }
  let w = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    teamName,
    {
      agentType: agent_type,
      model: T,
      prompt,
      planModeRequired: plan_mode_required,
      cwd: w,
    },
    context.teammateColors,
    async ({ sanitizedName, teammateId, teammateColor }, P, s) => {
      let windowName = `teammate-${sanitizeName(sanitizedName)}`;
      await ensureSession(CLAUDE_SWARM);
      let createWindowResult = await execFileNoThrow(
        TMUX,
        ["new-window", "-t", CLAUDE_SWARM, "-n", windowName, "-P", "-F", "#{pane_id}", "--", CAT],
        getPDFPageCount(),
      );
      if (createWindowResult.code !== 0) {
        logFeatureBad("subagent_launch", "subagent_teammate_tmux_window_failed");
        throw Error(`Failed to create tmux window: ${createWindowResult.stderr}`);
      }
      let paneId = createWindowResult.stdout.trim();
      s(() => execFileNoThrow(TMUX, ["kill-pane", "-t", paneId], getPDFPageCount()));
      await setMemberPaneInfo(
        teamName,
        teammateId,
        {
          tmuxPaneId: paneId,
          backendType: "tmux",
        },
        context.storageV5,
      );
      let binaryPath = teammateLaunchCommandLine();
      let teammateArgs = [
        envAssignment("--agent-id", teammateId),
        envAssignment("--agent-name", sanitizedName),
        envAssignment("--team-name", teamName),
        `--agent-color ${shellQuoteArgs([teammateColor])}`,
        `--parent-session-id ${shellQuoteArgs([getSessionId()])}`,
        plan_mode_required ? "--plan-mode-required" : "",
        agent_type ? envAssignment("--agent-type", agent_type) : "",
      ]
        .filter(Boolean)
        .join(" ");
      let inheritedFlags = buildInheritedCliFlags({
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
      let flagsStr = inheritedFlags ? ` ${inheritedFlags}` : "";
      let envStr = teammateEnvArgs();
      let spawnCommand = `cd ${shellQuoteArgs([w])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${flagsStr}`;
      await clearMailbox(sanitizedName, teamName, context.storageV5);
      if (
        (await writeToMailbox(
          sanitizedName,
          {
            from: TEAM_LEAD,
            text: prompt,
            timestamp: new Date().toISOString(),
          },
          teamName,
          context.storageV5,
        )) === undefined
      ) {
        logFeatureBad("subagent_launch", "subagent_teammate_prompt_write_failed");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to write initial instructions to ${sanitizedName}'s inbox \u2014 spawn aborted`,
          "spawnMultiAgent: failed to write initial teammate instructions \u2014 spawn aborted",
        );
      }
      try {
        assertNoControlChars(spawnCommand);
      } catch (error) {
        logFeatureBad("subagent_launch", "subagent_teammate_control_chars");
        throw error;
      }
      try {
        await respawnPaneWithCommand([], paneId, spawnCommand, getPDFPageCount());
      } catch (error) {
        logFeatureBad("subagent_launch", "subagent_teammate_tmux_respawn_failed");
        throw error;
      }
      P();
      setAppState((prev) => ({
        ...prev,
        teamContext: {
          ...prev.teamContext,
          teamName: teamName ?? prev.teamContext?.teamName ?? "default",
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
      }));
      registerOutOfProcessTeammateTask(context.taskRegistry, {
        teammateId,
        sanitizedName,
        teamName,
        teammateColor,
        prompt,
        plan_mode_required,
        paneId,
        insideTmux: false,
        backendType: "tmux",
        toolUseId: context.toolUseId,
        cwd: w,
        description: input.description,
        spawnedWith: {
          description: input.description,
          agentType: agent_type,
          parentAgentId: context.agentId,
        },
      });
      return {
        data: {
          teammate_id: teammateId,
          agent_id: teammateId,
          agent_type,
          model: T,
          name: sanitizedName,
          color: teammateColor,
          tmux_session_name: CLAUDE_SWARM,
          tmux_window_name: windowName,
          tmux_pane_id: paneId,
          team_name: teamName,
          is_splitpane: false,
          plan_mode_required,
        },
      };
    },
    context.storageV5,
  );
}
//@ chunk-cne5hsvz.js:29036-29789 fingerprint = registerOutOfProcessTeammateTask (0.909)
/**
 * 为 pane 队友在任务表登记 in_process_teammate 任务（可杀死 pane）。
 */
function registerOutOfProcessTeammateTask(
  setAppState,
  {
    teammateId,
    sanitizedName,
    teamName,
    teammateColor,
    prompt,
    plan_mode_required,
    paneId,
    insideTmux,
    backendType,
    toolUseId,
    cwd,
    description,
    spawnedWith,
  },
) {
  let taskId = generateTaskId("in_process_teammate");
  let description_2 = description || clipPromptDescription(prompt);
  let abortController = new AbortController();
  let s;
  let S = isPaneBackendType(backendType)
    ? () => (s ??= getBackendByType(backendType).killPane(paneId, !insideTmux))
    : undefined;
  let taskState = {
    ...createTaskStateBase(taskId, "in_process_teammate", description_2, toolUseId),
    type: "in_process_teammate",
    status: "running",
    cwd,
    identity: {
      agentId: teammateId,
      agentName: sanitizedName,
      teamName,
      color: teammateColor,
      planModeRequired: plan_mode_required ?? false,
      parentSessionId: getSessionId(),
    },
    spawnedWith,
    prompt,
    abortController,
    awaitingPlanApproval: false,
    permissionMode: plan_mode_required ? "plan" : "default",
    isIdle: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    pendingUserMessages: [],
    paneTeardown: S,
  };
  setAppState.register(taskState);
  if (S)
    abortController.signal.addEventListener(
      "abort",
      () => {
        S();
      },
      {
        once: true,
      },
    );
}
//@ chunk-cne5hsvz.js:29789-32223 fingerprint = handleSpawnInProcess (0.744)
/**
 * 进程内队友：准备团队成员记录、清空邮箱、spawnInProcessTeammate 并启动其循环。
 */
async function handleSpawnInProcess(input, context) {
  let { setAppState, getAppState } = context;
  let { name, prompt, agent_type, plan_mode_required } = input;
  let model = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
  if (!name || !prompt) {
    logFeatureBad("subagent_launch", "subagent_teammate_missing_params");
    throw Error("name and prompt are required for spawn operation");
  }
  let teamName = getAppState().teamContext?.teamName;
  if (!teamName) {
    logFeatureBad("subagent_launch", "subagent_teammate_no_team_name");
    throw Error(
      "Internal error: session team not initialized. This should have happened at startup when agent swarms are enabled.",
    );
  }
  let agentDefinition =
    input.agentDefinition && !isBuiltInAgent(input.agentDefinition) ? input.agentDefinition : undefined;
  if (agent_type)
    logForDebugging(`[handleSpawnInProcess] agent_type=${agent_type}, found=${!!agentDefinition}`);
  return reserveTeammateAndSpawn(
    name,
    teamName,
    {
      agentType: agent_type,
      model,
      prompt,
      planModeRequired: plan_mode_required,
      cwd: getCwd(),
    },
    context.teammateColors,
    async ({ sanitizedName, teammateId, teammateColor }, y) => {
      await setMemberPaneInfo(
        teamName,
        teammateId,
        {
          tmuxPaneId: "in-process",
          backendType: "in-process",
        },
        context.storageV5,
      );
      let config = {
        name: sanitizedName,
        teamName,
        prompt,
        color: teammateColor,
        planModeRequired: plan_mode_required ?? false,
        model,
        description: input.description,
        spawnedWith: {
          description: input.description,
          agentType: agent_type,
          parentAgentId: context.agentId,
        },
      };
      await clearMailbox(sanitizedName, teamName, context.storageV5);
      let result = await spawnInProcessTeammate(config, context);
      if (!result.ok) {
        logFeatureBad("subagent_launch", "subagent_teammate_inprocess_failed");
        logForDebugging(`[handleSpawnInProcess] spawn failed: ${result.error}`);
        throw Error("Failed to spawn in-process teammate");
      }
      y();
      startInProcessTeammate({
        identity: result.identity,
        taskId: result.taskId,
        prompt,
        description: input.description,
        spawnedAgentType: agent_type,
        model,
        agentDefinition,
        teammateContext: result.teammateContext,
        toolUseContext: {
          ...context,
          messages: [],
        },
        abortController: result.abortController,
        invokingRequestId: input.invokingRequestId,
      });
      logForDebugging(`[handleSpawnInProcess] Started agent execution for ${teammateId}`);
      let leadAgentId = getAppState().teamContext?.leadAgentId;
      let needsLeaderSetup = !leadAgentId;
      let leadAgentId_2 = leadAgentId ?? agentAddress(TEAM_LEAD, teamName);
      let color = needsLeaderSetup ? context.teammateColors.assign(leadAgentId_2) : undefined;
      setAppState((prev) => {
        let existingTeammates = prev.teamContext?.teammates || {};
        let leadEntry = needsLeaderSetup
          ? {
              [leadAgentId_2]: {
                name: TEAM_LEAD,
                agentType: TEAM_LEAD,
                color,
                tmuxSessionName: "in-process",
                tmuxPaneId: "leader",
                cwd: getCwd(),
                spawnedAt: Date.now(),
              },
            }
          : {};
        return {
          ...prev,
          teamContext: {
            ...prev.teamContext,
            teamName: teamName ?? prev.teamContext?.teamName ?? "default",
            teamFilePath: prev.teamContext?.teamFilePath ?? "",
            leadAgentId: leadAgentId_2,
            teammates: {
              ...existingTeammates,
              ...leadEntry,
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
      });
      return {
        loopAgentId: result.identity.resumableAgentId,
        data: {
          teammate_id: teammateId,
          agent_id: result.identity.resumableAgentId ?? teammateId,
          agent_type,
          model,
          name: sanitizedName,
          color: teammateColor,
          tmux_session_name: "in-process",
          tmux_window_name: "in-process",
          tmux_pane_id: "in-process",
          team_name: teamName,
          is_splitpane: false,
          plan_mode_required,
        },
      };
    },
    context.storageV5,
  );
}
//@ chunk-cne5hsvz.js:32223-33045 fingerprint = handleSpawn (0.326)
/**
 * 派生队友：拒绝协议帧 prompt；启用进程内队友时直接进程内运行；否则探测 pane 后端（tmux/iTerm2），不可用且模式为 auto 时回退进程内，否则按 use_splitpane 开分屏或新窗口。
 */
async function handleSpawn(spawnInput, context, onProgress) {
  if (spawnInput.prompt && isStructuredProtocolMessage(spawnInput.prompt)) {
    logFeatureBad("subagent_launch", "subagent_teammate_protocol_frame_prompt");
    throw Error(PROTOCOL_FRAME_PROMPT_ERROR);
  }
  if (isInProcessEnabled()) return handleSpawnInProcess(spawnInput, context);
  if (spawnInput.agent_type && isRegisteredAgent(spawnInput.agent_type)) {
    logFeatureBad("subagent_launch", "subagent_teammate_runtime_agent_type");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Agent type '${spawnInput.agent_type}' was registered at run time by a plugin and exists only in this process; a pane-based teammate cannot run it. Spawn it with the ${AGENT} tool instead, or use in-process teammates.`,
      "pane teammate cannot run a run-time registered agent type",
    );
  }
  try {
    await detectAndGetBackend();
  } catch (error) {
    if (getTeammateModeFromSnapshot() !== "auto") {
      logFeatureBad("subagent_launch", "subagent_teammate_pane_unavailable");
      throw error;
    }
    logForDebugging(
      `[handleSpawn] No pane backend available, falling back to in-process: ${errorMessage(error)}`,
    );
    markInProcessFallback();
    notifyPaneFallback(context.toolState.get(PaneFallbackNoticeState), onProgress);
    return handleSpawnInProcess(spawnInput, context);
  }
  if (spawnInput.use_splitpane !== false) return handleSpawnSplitPane(spawnInput, context);
  return handleSpawnSeparateWindow(spawnInput, context);
}
//@ chunk-cne5hsvz.js:33045-33063 affinity
/**
 * 记录“无法打开队友窗格、改用进程内运行”的提示是否已显示。
 */
class PaneFallbackNoticeState {
  shown = false;
}
//@ chunk-cne5hsvz.js:33063-33494 sole-consumer
/**
 * 无法打开队友窗格时提示改为进程内运行（只提示一次）。
 */
function notifyPaneFallback(e, onProgress) {
  if (e.shown) return;
  e.shown = true;
  let a = isInITerm2()
    ? 'To force iTerm2 panes, set teammateMode: "iterm2" in settings and enable the iTerm2 Python API (Preferences > General > Magic).'
    : 'To use terminal panes, set teammateMode: "tmux" in settings.';
  onProgress?.({
    type: "notification",
    notification: {
      key: "teammate-auto-fallback",
      text: `Couldn't open a teammate pane \u2014 running in-process instead. ${a}`,
      color: "warning",
      priority: "high",
    },
  });
}
//@ chunk-cne5hsvz.js:33494-33661 sole-consumer
/**
 * 无盘会话拒绝派生队友，否则执行派生。
 */
async function spawnTeammateChecked(spawnInput, context, onProgress) {
  if (isDiskless()) {
    logFeatureBad("subagent_launch", "subagent_teammate_diskless");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      TEAMMATES_UNAVAILABLE_MESSAGE,
      "teammate spawn refused in a session with no disk",
    );
  }
  return handleSpawn(spawnInput, context, onProgress);
}
//@ chunk-hntsfzas.js:6798-6916 fingerprint = getTeammateCommand (1)
/**
 * 队友启动命令：编译版用 execPath，否则 argv[1]。
 */
function getTeammateCommand() {
  try {
    if (isStandaloneExecutable()) return process.execPath || "unknown";
    return process.argv[1] || "unknown";
  } catch {
    return "unknown";
  }
}
export { buildInheritedCliFlags_2, getTeammateCommand };
