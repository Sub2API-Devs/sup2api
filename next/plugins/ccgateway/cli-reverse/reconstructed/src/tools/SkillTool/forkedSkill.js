/**
 * tools/SkillTool/forkedSkill.ts
 *
 * 2.1.316 新增。context=fork 的 skill 以子代理运行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n3ybm6q3.js (8)
 * attribution: placement 8
 */
import { resolve, dirname } from "path";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import {
  getProjectConfigRoot,
  isDiskless,
  getAdditionalDirectoriesForClaudeMd,
  getIsNonInteractiveSession,
  mainAgentId,
} from "../../bootstrap/state.js";
import { findGitRoot, runGitReadOnly } from "../../utils/git.js";
import { buildFilterNeutralizingArgs } from "../../utils/git/gitConfigFilters.js";
import { IGNORE_SUBMODULES_DIRTY_FLAG } from "../../utils/git/gitSafeEnv.js";
import { isPathWithin } from "../../utils/fsJunctions.js";
import {
  matchesUnqualifiedName,
  isSkillToolCommand,
  getBareCommandName,
  getCommands,
} from "../../commands.js";
import { isNonEmptyIdentifier } from "../../utils/sanitization.js";
import { slashTestPattern } from "../../utils/attributionFileClasses.js";
import {
  addSkillDirectories,
  discoverSkillDirsForPaths,
  getDynamicSkills,
} from "../../skills/loadSkillsDir.js";
import { isSyscallError, AbortError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { matchesToolName } from "../../Tool.js";
import { SKILL } from "./skillToolNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { createUserMessage, wrapInSystemReminder } from "../../utils/messages.js";
import { isForegroundAgentMoveOff } from "../AgentTool/backgroundGates.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getAgentDepth, alwaysFalse, getWorkflowRunFields } from "../../utils/agentContext.js";
import { getAgentModel } from "../../utils/model/agent.js";
import { getMainLoopModel, getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  unwrapAbortReason,
  createAbortController,
  attachDetachableAbortRelay,
} from "../../utils/abortController.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getMaxSubagentSpawnDepth } from "../AgentTool/spawnDepth.js";
import { FORKED_SKILL_SCOPING_SCHEMA } from "../../types/ids.js";
import { writeForkedSkillScoping } from "../../skills/forkedSkillMarkers.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import {
  resolveVisibleSubagentId,
  getOwnToolSurface,
  registerAsyncAgent,
  initAgentOutputSymlink,
  createAgentTaskState,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { willToolsLoseSessionState } from "../../services/compact/compactCarry.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { createDeferredReviewTools, runAgent } from "../AgentTool/runAgent.js";
import { runWithCwdOverride } from "../../utils/cwd.js";
import { runAsyncAgentLifecycle } from "../AgentTool/agentToolUtils.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { isSendMessageHandbackEnabled } from "../AgentTool/handbackReport.js";
import { registerTaskLoop } from "../../tasks/taskLoopRegistry.js";
import { evictTaskOutput } from "../../utils/task/diskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-n3ybm6q3.js:1538-1548 placement
/**
 * 已登记技能变体的上限（100）。
 */
var MAX_REGISTERED_SKILL_VARIANTS = 100;
//@ chunk-n3ybm6q3.js:1548-2124 placement
async function nestedSkillsForChangedFiles(changedPath) {
  if (
    isCustomizationDisabled("skills") ||
    !isSettingSourceEnabled("projectSettings") ||
    isRestrictedToPluginOnly("skills") ||
    getProjectConfigRoot() !== null ||
    isDiskless()
  )
    return [];
  let gitRoot = findGitRoot(changedPath);
  if (gitRoot === null) return [];
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(gitRoot);
  if (!filterNeutralizingArgs.ok) return [];
  let statusResult = await runGitReadOnly(gitRoot, [
    ...filterNeutralizingArgs.args,
    "status",
    "--porcelain",
    "-z",
    IGNORE_SUBMODULES_DIRTY_FLAG,
    "--untracked-files=normal",
  ]);
  if (!statusResult.ok) return [];
  let parts = statusResult.stdout.split("\x00");
  let dirs = new Map();
  for (let j = 0; j < parts.length; j++) {
    let entry = parts[j] ?? "";
    if (entry.length < 4) continue;
    let entryPaths = [entry.slice(3)];
    if (/[RC]/.test(entry.slice(0, 2))) {
      j++;
      entryPaths.push(parts[j] ?? "");
    }
    for (let entryPath of entryPaths) {
      let absolutePath = resolve(gitRoot, entryPath);
      if (
        entryPath !== "" &&
        absolutePath !== gitRoot &&
        dirs.size < MAX_REGISTERED_SKILL_VARIANTS &&
        isPathWithin(gitRoot, absolutePath, {
          alreadyComparable: true,
        })
      )
        dirs.set(dirname(absolutePath), absolutePath);
    }
  }
  return [...dirs.values()];
}
//@ chunk-n3ybm6q3.js:2124-2260 placement
/**
 * 找出与给定未限定名匹配、可由 Skill 工具调用的技能变体（排除正在派生自身的 fork 技能）。
 */
function matchingSkillVariants(commands, bareName, spawnedBySkill) {
  return commands.filter(
    (command) =>
      command.type === "prompt" &&
      matchesUnqualifiedName(command, bareName) &&
      isSkillToolCommand(command) &&
      isNonEmptyIdentifier(command.name) &&
      !(
        command.context === "fork" &&
        spawnedBySkill !== undefined &&
        getBareCommandName(command) === spawnedBySkill
      ),
  );
}
//@ chunk-n3ybm6q3.js:2260-3470 placement
async function scopedSkillVariantNote(command, projectRoot, toolContext) {
  if (command.type !== "prompt" || command.unqualifiedName != null) return null;
  if (projectRoot !== null && toolContext.session !== undefined && slashTestPattern(command.name) !== null)
    try {
      let changedDirs = await nestedSkillsForChangedFiles(projectRoot);
      if (changedDirs.length > 0)
        await addSkillDirectories(
          await discoverSkillDirsForPaths(
            toolContext.session.host,
            changedDirs,
            projectRoot,
            toolContext.storageV5,
          ),
        );
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(`[skills] Changed files not searched for nested skills: ${error}`);
      else logError(error);
    }
  if (getDynamicSkills().length === 0 && getAdditionalDirectoriesForClaudeMd().length === 0) return null;
  if (!toolContext.options.tools.some((tool) => matchesToolName(tool, SKILL))) return null;
  let variants = matchingSkillVariants(
    await getCommands(projectRoot, toolContext.storageV5),
    command.name,
    toolContext.options.spawnedBySkill,
  );
  if (variants.length === 0) return null;
  let mapped = variants.map((variant) => {
    let sliced = variant.name.slice(0, variant.name.length - command.name.length - 1);
    return `- \`${variant.name}\` \u2014 for files under ${sliced}/`;
  });
  logEvent("tengu_skill_scoped_variant_note", {
    variant_count: variants.length,
  });
  return createUserMessage({
    content: wrapInSystemReminder(
      [
        `Directory-scoped variants of the "${command.name}" skill exist in this repo:`,
        ...mapped,
        `The bare name always resolves to this unscoped skill; the variants are reachable only by their exact qualified names. If the files you are working on are under a variant's directory, invoke that variant now with the ${SKILL} tool and follow it instead \u2014 it carries that subtree's own instructions. If your changes span more than one variant's directory, run each matching variant.`,
      ].join(`
`),
    ),
    isMeta: true,
  });
}
//@ chunk-n3ybm6q3.js:3470-3575 placement
/**
 * 判断 fork 技能是否在后台运行：非交互、工作流内或已指定前台时为否，否则按技能的 background 设置（默认是）。
 */
function shouldBackgroundForkedSkill(input, toolContext, forceForeground) {
  if (
    forceForeground ||
    toolContext.spawnedByWorkflowRunId !== undefined ||
    isForegroundAgentMoveOff() ||
    getIsNonInteractiveSession()
  )
    return false;
  return input.background ?? true;
}
//@ chunk-n3ybm6q3.js:3575-6472 placement (2.1.88 match: updateMagicDoc, 0.155)
async function runForkedAgent({
  agentId,
  agentDefinition,
  command,
  description,
  prompt,
  promptMessages,
  context,
  canUseTool,
  getAppState,
  permissionLayers,
  readFileState,
  availableTools,
  webFetchReadmissionAllowed,
  spawnedBySkill,
  recordInvocationOnSuccess,
  frozenCommandDenies,
}) {
  let { taskRegistry } = context;
  let startTime = Date.now();
  let description_2 = description.length > 50 ? truncateToLength(description, 49) + "\u2026" : description;
  let depth = getAgentDepth(context.agentContext) + 1;
  let agentModel = getAgentModel(
    agentDefinition.model,
    getMainLoopModel(context),
    command.model,
    getToolPermissionContext(context).mode,
  );
  let hasLiveDuplicate = () => {
    if (context.abortController.signal.aborted) {
      if (unwrapAbortReason(context.abortController.signal.reason) !== "interrupt") throw new AbortError();
    }
    for (let task of Object.values(taskRegistry.all()))
      if (
        task.type === "local_agent" &&
        !isTerminalTaskStatus(task.status) &&
        task.forkedSkillName === command.name
      ) {
        logFeatureSad("subagent_launch", "forked_skill_live_duplicate");
        return true;
      }
    return false;
  };
  if (hasLiveDuplicate()) return null;
  let maxSubagentSpawnDepth = getMaxSubagentSpawnDepth();
  if (depth > maxSubagentSpawnDepth) {
    logFeatureSad("subagent_launch", "forked_skill_depth_cap");
    return null;
  }
  let scopingRecord = {
    skillName: command.name,
    attributionName: spawnedBySkill,
    ...(agentDefinition.effort !== undefined && {
      effort: agentDefinition.effort,
    }),
    ...(frozenCommandDenies !== undefined &&
      frozenCommandDenies.length > 0 && {
        frozenCommandDenies: [...frozenCommandDenies],
      }),
  };
  if (!FORKED_SKILL_SCOPING_SCHEMA().safeParse(scopingRecord).success) {
    logFeatureSad("subagent_launch", "forked_skill_scoping_unpersistable");
    return null;
  }
  try {
    await writeForkedSkillScoping(identityAgentId2(agentId), scopingRecord, context.storageV5);
  } catch (error) {
    spawnForkedSkill(error);
    logFeatureSad("subagent_launch", "forked_skill_scoping_write_failed");
    return null;
  }
  if (hasLiveDuplicate()) return null;
  let ownerAgentId = resolveVisibleSubagentId(context.agentId, taskRegistry) ?? mainAgentId();
  let ownToolSurface = getOwnToolSurface(context, ownerAgentId);
  let detected = registerAsyncAgent({
    outputFileReadable: willToolsLoseSessionState(context.options.tools),
    ownerCanContinueAgents: ownToolSurface,
    agentId,
    ownerAgentId,
    parentAgentId: context.agentId,
    spawnDepth: depth,
    description: description_2,
    prompt,
    model: agentModel,
    selectedAgent: agentDefinition,
    taskRegistry,
    toolUseId: context.toolUseId,
    forkedSkillName: command.name,
    sessionScratch: context.session.sessionScratch,
  });
  let abortController = detected.abortController;
  let displayName = context.agentLifecycle.allocateName(command.name);
  context.agentLifecycle.registerName(displayName, identityAgentId2(agentId));
  addAgentKeepaliveReason(
    resolveVisibleSubagentId(context.agentId, taskRegistry),
    `agent:${agentId}`,
    taskRegistry,
  );
  let agentContext = {
    agentId,
    parentAgentId: context.agentId,
    depth,
    ...(alwaysFalse(context) && {
      spawnedByMainThread: true,
    }),
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: agentDefinition.agentType,
    isBuiltIn: isBuiltInAgent(agentDefinition),
    displayName,
    isAsync: true,
    isBackgroundAgent: true,
    invocationKind: "spawn",
    invocationEmitted: false,
    ...getWorkflowRunFields(context.agentContext),
  };
  let agentLaunchOptions = {
    prompt,
    resolvedAgentModel: agentModel,
    isBuiltInAgent: isBuiltInAgent(agentDefinition),
    startTime,
    agentType: agentDefinition.agentType,
    isAsync: true,
    agentDepth: depth,
    callerCanContinueAgents: ownToolSurface,
    source: agentDefinition.source,
  };
  let { onToolPool, reviewTools } = createDeferredReviewTools(context.options.tools);
  runWithCwdOverride(agentContext, () =>
    runAsyncAgentLifecycle({
      taskId: detected.agentId,
      abortController,
      makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
        runAgent({
          agentDefinition,
          promptMessages,
          turnPrompt: prompt,
          toolUseContext: {
            ...context,
            getAppState,
            permissionLayers,
          },
          canUseTool,
          isAsync: true,
          querySource: "agent:custom",
          spawnedBySkill,
          spawnedByForkedSkill: true,
          model: command.model,
          onModelRestricted: agentModelRestrictionNotifier(spawnedBySkill, context.appendSystemMessage),
          availableTools,
          webFetchReadmissionAllowed,
          override: {
            agentId: identityAgentId2(agentId),
            agentContext,
            abortController,
            readFileState,
          },
          onCacheSafeParams,
          onQueryProgress,
          onStreamTokenEstimate,
          onToolPool,
          description: description_2,
          name: displayName,
        }),
      metadata: {
        ...agentLaunchOptions,
        agentContext,
      },
      description: description_2,
      toolUseContext: context,
      reviewTools,
      taskRegistry,
      agentIdForCleanup: agentId,
      enableSummarization: true,
      getWorktreeResult: async () => ({}),
      onTerminalSuccess: recordInvocationOnSuccess,
    }),
  );
  logFeatureOk("subagent_launch");
  return {
    agentId,
    name: displayName,
  };
}
//@ chunk-n3ybm6q3.js:6472-6542 placement
function spawnForkedSkill(error) {
  logForDebugging(`Failed to write forked-skill scoping sidecar: ${error}`);
}
//@ chunk-n3ybm6q3.js:6542-7134 placement
/**
 * context=fork 的技能作为后台任务登记：创建可分离的中止控制器与任务循环，注册代理任务状态；返回的 remove 会解绑并发出任务通知（被中止时为 stopped）。
 */
function registerForkedSkillTask({
  agentId,
  parentAgentId,
  spawnDepth,
  skillName,
  prompt,
  selectedAgent,
  taskRegistry,
  toolUseId,
  callerAbortController,
}) {
  if (!isSendMessageHandbackEnabled())
    return {
      abortController: callerAbortController,
      remove() {},
    };
  let abortController = createAbortController();
  let detachRelay = attachDetachableAbortRelay(callerAbortController, abortController);
  let unregisterLoop = registerTaskLoop(agentId, abortController);
  initAgentOutputSymlink(agentId);
  let description = `/${skillName}`;
  let taskState = createAgentTaskState({
    agentId,
    ownerAgentId: resolveVisibleSubagentId(parentAgentId, taskRegistry) ?? mainAgentId(),
    parentAgentId,
    spawnDepth,
    description,
    prompt,
    selectedAgent,
    toolUseId,
    abortController,
    forkWorker: true,
  });
  taskRegistry.register(taskState);
  return {
    abortController,
    remove(finalStatus) {
      detachRelay();
      unregisterLoop();
      taskRegistry.remove(agentId);
      evictTaskOutput(agentId);
      emitTaskNotification(agentId, abortController.signal.aborted ? "stopped" : finalStatus, {
        toolUseId,
        summary: description,
        outputFile: taskState.outputFile,
        skipTranscript: true,
        ambient: true,
      });
    },
  };
}
export {
  shouldBackgroundForkedSkill,
  scopedSkillVariantNote,
  runForkedAgent,
  registerForkedSkillTask,
  matchingSkillVariants,
};
