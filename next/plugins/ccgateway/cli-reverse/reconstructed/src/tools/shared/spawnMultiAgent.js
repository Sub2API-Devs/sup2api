/**
 * tools/shared/spawnMultiAgent.ts
 *
 * 队友派生：进程内 / tmux 分屏 / 新窗口三种后端、权限模式透传参数与任务登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/shared/spawnMultiAgent.ts
 * pieces: chunk-5j7d17eb.js (13), chunk-5xgkngpb.js (1), chunk-pgmbxgj8.js (3)
 * attribution: fingerprint 9, placement 4, layout 1, affinity 1, sole-consumer 2
 */
import { withHostOwnedEnv } from "../../utils/settings/hostEnvWrites.js";
import { processWrapperError } from "../../utils/processWrapper.js";
import {
  SwarmPaneError,
  hasControlChars,
  updateTeamFile,
  removeTeamMember,
  recordSpawnedTeammatePane,
  sanitizeAgentName,
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
import {
  getTeammatePermissionMode,
  clipPromptDescription,
  spawnInProcessTeammate,
} from "../../utils/swarm/spawnInProcess.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
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
import { buildInheritedCliFlags_2_2 } from "../../utils/swarm/spawnUtils.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { dropSessionLevelIfModelDiffers } from "../../utils/effort.js";
import { keepModelForEffort } from "../../commands/fast/fast.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  clearMailbox,
  writeToMailbox,
  isStructuredProtocolMessage,
  PROTOCOL_FRAME_PROMPT_ERROR,
} from "../../utils/teammateMailbox.js";
import { respawnPaneWithCommand } from "../../utils/swarm/backends/TmuxBackend.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { startInProcessTeammate } from "../../utils/swarm/inProcessRunner.js";
import { isRegisteredAgent } from "../../utils/plugins/pluginLoadState.js";
import { AGENT } from "../AgentTool/constants.js";
import { getTeammateModeFromSnapshot } from "../../utils/swarm/backends/teammateModeSnapshot.js";

//@ chunk-5xgkngpb.js:4892318-4892449 fingerprint (2.1.88 match: generateUniqueTeammateName, 0.62)
function generateUniqueTeammateName(takenNames, candidateName, team) {
  return (
    takenNames.has(String(candidateName)) ||
    [...team.members.keys()].some((key) => takenNames.has(String(key))) ||
    [...team.handles].some((handle) => takenNames.has(handle))
  );
}
//@ chunk-pgmbxgj8.js:1274-1302 placement
/**
 * 返回队友进程的启动命令（自定义命令或当前二进制，套用宿主环境包装器）。
 */
function teammateLaunchCommandLine() {
  return withHostOwnedEnv(teammateLaunchCommand);
}
//@ chunk-pgmbxgj8.js:1302-1559 placement
/**
 * 队友进程的启动命令（自定义命令或当前二进制，套用进程包装器）；包装器配置错误时抛错。
 */
function teammateLaunchCommand() {
  let wrapperError = processWrapperError();
  if (wrapperError)
    throw new SwarmPaneError(
      `${wrapperError} \u2014 the teammate is not started unwrapped; fix the launcher setting, then retry`,
    );
  let commandFromEnv = process.env[TEAMMATE_COMMAND_ENV_VAR];
  let { cmd, prefixArgs } = commandFromEnv
    ? withProcessWrapper({
        cmd: commandFromEnv,
        prefixArgs: [],
        target: commandFromEnv,
      })
    : getLaunchCommand({
        pinToCurrentBinary: true,
      });
  return [cmd, ...prefixArgs];
}
//@ chunk-pgmbxgj8.js:1647-2079 fingerprint (2.1.88 match: buildInheritedCliFlags, 0.585)
/**
 * 把父会话的权限模式转成队友进程的 CLI 参数（--dangerously-skip-permissions / --permission-mode …），plan_mode_required 时用 plan。
 */
function buildInheritedCliFlags({
  planModeRequired,
  permissionMode,
  proactivityLevel,
  autoPickedByLevel = false,
}) {
  if (permissionMode === undefined) return [];
  let effectiveMode = getTeammatePermissionMode(permissionMode, planModeRequired ?? false);
  if (!planModeRequired && proactivityLevel !== undefined)
    effectiveMode = cycleAllTeammateModes(effectiveMode, proactivityLevel, autoPickedByLevel);
  switch (effectiveMode) {
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
      return [`--permission-mode ${toExternalPermissionMode(effectiveMode)}`];
  }
}
//@ chunk-5j7d17eb.js:16752-16831 fingerprint (2.1.88 match: hasSession, 1)
async function hasSession(sessionName) {
  return (await execFileNoThrow(TMUX, ["has-session", "-t", sessionName], getPDFPageCount())).code === 0;
}
//@ chunk-5j7d17eb.js:16831-17107 fingerprint (2.1.88 match: ensureSession, 0.71)
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
//@ chunk-5j7d17eb.js:18908-19906 placement
/**
 * 在团队文件中预留队友身份（名字、id、颜色）后启动；启动提交前失败则清理窗格并移除成员。
 */
async function reserveTeammateAndSpawn(name, teamName, extraMemberFields, teammateColors, spawn, storageV5) {
  for (let [fieldName, fieldValue] of [
    ["name", name],
    ["team_name", teamName],
  ])
    if (hasControlChars(fieldValue)) {
      logFeatureBad("subagent_launch", "subagent_teammate_control_chars");
      throw Error(
        fieldName === "name"
          ? "Invalid name: control characters are not allowed in agent or team names"
          : "Invalid team_name: control characters are not allowed in agent or team names",
      );
    }
  let reservation = await updateTeamFile(
    teamName,
    (teamFile) => {
      let uniqueName = uniqueTeammateName(name, teamFile);
      let teammateId = agentAddress(uniqueName, teamName);
      let teammateColor = teammateColors.assign(teammateId);
      teamFile.members.push({
        agentId: teammateId,
        name: uniqueName,
        color: teammateColor,
        joinedAt: Date.now(),
        tmuxPaneId: "",
        subscriptions: [],
        ...extraMemberFields,
      });
      return {
        sanitizedName: uniqueName,
        teammateId,
        teammateColor,
      };
    },
    undefined,
    storageV5,
  );
  if (!reservation) {
    logFeatureBad("subagent_launch", "subagent_teammate_internal_invariant");
    throw Error("reserveTeammateIdentity: updateTeamFile returned undefined");
  }
  let committed = false;
  let paneCleanup;
  try {
    return await spawn(
      reservation,
      () => {
        committed = true;
      },
      (registerCleanup) => {
        paneCleanup = registerCleanup;
      },
    );
  } catch (error) {
    if (!committed) {
      if (paneCleanup)
        try {
          await paneCleanup();
        } catch (error) {
          logForDebugging(
            `[spawnTeammate] pane cleanup failed for ${reservation.teammateId}: ${errorMessage(error)}`,
          );
        }
      await removeTeamMember(teamName, reservation.teammateId, storageV5);
    } else
      logForDebugging(
        `[spawnTeammate] post-commit failure for ${reservation.teammateId}; entry kept (agent already running): ${errorMessage(error)}`,
      );
    throw error;
  }
}
//@ chunk-5j7d17eb.js:19906-20103 layout
/**
 * 把成员的 pane 信息（tmuxPaneId、backendType）写入团队文件，并记录为本会话创建的 pane。
 */
async function setMemberPaneInfo(teamName, agentId, paneInfo, storage) {
  recordSpawnedTeammatePane(paneInfo.backendType, paneInfo.tmuxPaneId);
  await updateTeamFile(
    teamName,
    (teamFile) => {
      let found = teamFile.members.find((member) => member.agentId === agentId);
      if (!found) return false;
      found.tmuxPaneId = paneInfo.tmuxPaneId;
      found.backendType = paneInfo.backendType;
    },
    undefined,
    storage,
  );
}
//@ chunk-5j7d17eb.js:20103-20674 placement
/**
 * 生成不冲突的队友名（拒绝保留名与 agent id 形状，重名加 -N）。
 */
function uniqueTeammateName(rawName, teamFile) {
  let sanitizedName = sanitizeAgentName(rawName);
  if (sanitizedName === MAIN)
    throw Error(
      '"main" is a reserved recipient name (SendMessage routes it to the main conversation) \u2014 choose another teammate name.',
    );
  if (isReservedSessionName(sanitizedName))
    throw Error(
      'That teammate name is a reserved name ("main", "team-lead", "user" or "system", in any spelling) or has the shape of an agent id, which already addresses an agent directly \u2014 choose another teammate name.',
    );
  let takenNames = new Set(teamFile.members.map((member) => member.name.toLowerCase()));
  if (!takenNames.has(sanitizedName.toLowerCase())) return sanitizedName;
  let suffix = 2;
  while (takenNames.has(`${sanitizedName}-${suffix}`.toLowerCase())) suffix++;
  return `${sanitizedName}-${suffix}`;
}
//@ chunk-5j7d17eb.js:20674-23765 fingerprint (2.1.88 match: handleSpawnSplitPane, 0.758)
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
  let targetCwd = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    teamName,
    {
      agentType: agent_type,
      model,
      prompt,
      planModeRequired: plan_mode_required,
      cwd: targetCwd,
    },
    context.teammateColors,
    async ({ sanitizedName, teammateId, teammateColor }, markCommitted, registerCleanup) => {
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
      registerCleanup(() => detectionResult.backend.killPane(paneId, !insideTmux));
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
      let inheritedFlags = buildInheritedCliFlags_2_2({
        planModeRequired: plan_mode_required,
        permissionMode: appState.toolPermissionContext.mode,
        proactivityLevel: appState.proactivityLevel,
        autoPickedByLevel: hasLeftProactivityBaseline(appState.toolPermissionContext),
        sessionEffort: dropSessionLevelIfModelDiffers(appState, model, keepModelForEffort(context, model))
          .sessionEffort,
        permissionRules: getToolPermissionContext(context),
        skipModel: !!model,
      });
      if (model)
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} ${envAssignment("--model", model)}`
          : envAssignment("--model", model);
      let flagsStr = inheritedFlags ? ` ${inheritedFlags}` : "";
      let envStr = teammateEnvArgs();
      let spawnCommand = `cd ${shellQuoteArgs([targetCwd])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${flagsStr}`;
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
      markCommitted();
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
              cwd: targetCwd,
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
        cwd: targetCwd,
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
//@ chunk-5j7d17eb.js:23765-26743 fingerprint (2.1.88 match: handleSpawnSeparateWindow, 0.741)
/**
 * 在新 tmux 窗口中启动队友进程。
 */
async function handleSpawnSeparateWindow(input, context) {
  let { setAppState, getAppState } = context;
  let { name, prompt, agent_type, cwd, plan_mode_required } = input;
  let modelFlags = teammateModelFlags(input.model, getAppState().mainLoopModel, input.modelSource);
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
  let targetCwd = cwd || getCwd();
  return reserveTeammateAndSpawn(
    name,
    teamName,
    {
      agentType: agent_type,
      model: modelFlags,
      prompt,
      planModeRequired: plan_mode_required,
      cwd: targetCwd,
    },
    context.teammateColors,
    async ({ sanitizedName, teammateId, teammateColor }, markCommitted, registerCleanup) => {
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
      registerCleanup(() => execFileNoThrow(TMUX, ["kill-pane", "-t", paneId], getPDFPageCount()));
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
      let inheritedFlags = buildInheritedCliFlags_2_2({
        planModeRequired: plan_mode_required,
        permissionMode: appState.toolPermissionContext.mode,
        proactivityLevel: appState.proactivityLevel,
        autoPickedByLevel: hasLeftProactivityBaseline(appState.toolPermissionContext),
        sessionEffort: dropSessionLevelIfModelDiffers(
          appState,
          modelFlags,
          keepModelForEffort(context, modelFlags),
        ).sessionEffort,
        permissionRules: getToolPermissionContext(context),
        skipModel: !!modelFlags,
      });
      if (modelFlags)
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} ${envAssignment("--model", modelFlags)}`
          : envAssignment("--model", modelFlags);
      let flagsStr = inheritedFlags ? ` ${inheritedFlags}` : "";
      let envStr = teammateEnvArgs();
      let spawnCommand = `cd ${shellQuoteArgs([targetCwd])} && env ${envStr} ${shellQuoteArgs(binaryPath)} ${teammateArgs}${flagsStr}`;
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
      markCommitted();
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
              cwd: targetCwd,
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
        cwd: targetCwd,
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
          model: modelFlags,
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
//@ chunk-5j7d17eb.js:26743-27495 fingerprint (2.1.88 match: registerOutOfProcessTeammateTask, 0.905)
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
  let paneKillPromise;
  let paneTeardown = isPaneBackendType(backendType)
    ? () => (paneKillPromise ??= getBackendByType(backendType).killPane(paneId, !insideTmux))
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
    paneTeardown,
  };
  setAppState.register(taskState);
  if (paneTeardown)
    abortController.signal.addEventListener(
      "abort",
      () => {
        paneTeardown();
      },
      {
        once: true,
      },
    );
}
//@ chunk-5j7d17eb.js:27495-29953 fingerprint (2.1.88 match: handleSpawnInProcess, 0.735)
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
    async ({ sanitizedName, teammateId, teammateColor }, markCommitted) => {
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
      markCommitted();
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
          pickedEffortModel: keepModelForEffort(context, model),
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
//@ chunk-5j7d17eb.js:29953-30773 fingerprint (2.1.88 match: handleSpawn, 0.326)
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
//@ chunk-5j7d17eb.js:30773-30791 affinity
/**
 * 记录“无法打开队友窗格、改用进程内运行”的提示是否已显示。
 */
class PaneFallbackNoticeState {
  shown = false;
}
//@ chunk-5j7d17eb.js:30791-31222 sole-consumer
/**
 * 无法打开队友窗格时提示改为进程内运行（只提示一次）。
 */
function notifyPaneFallback(fallbackState, onProgress) {
  if (fallbackState.shown) return;
  fallbackState.shown = true;
  let settingsHint = isInITerm2()
    ? 'To force iTerm2 panes, set teammateMode: "iterm2" in settings and enable the iTerm2 Python API (Preferences > General > Magic).'
    : 'To use terminal panes, set teammateMode: "tmux" in settings.';
  onProgress?.({
    type: "notification",
    notification: {
      key: "teammate-auto-fallback",
      text: `Couldn't open a teammate pane \u2014 running in-process instead. ${settingsHint}`,
      color: "warning",
      priority: "high",
    },
  });
}
//@ chunk-5j7d17eb.js:31222-31389 sole-consumer
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
export { buildInheritedCliFlags, generateUniqueTeammateName, spawnTeammateChecked };
