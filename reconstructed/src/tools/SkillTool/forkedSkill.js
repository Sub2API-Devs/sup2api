/**
 * tools/SkillTool/forkedSkill.ts
 *
 * 2.1.316 新增。context=fork 的 skill 以子代理运行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0fs3a553.js (8)
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
import { lb } from "../../utils/git/gitSafeEnv.js";
import { isPathWithin } from "../../utils/fsJunctions.js";
import {
  matchesUnqualifiedName,
  isSkillToolCommand,
  getBareCommandName,
  getCommands,
} from "../../commands.js";
import { isNonEmptyIdentifier } from "../../utils/sanitization.js";
import { exe } from "../../utils/attributionFileClasses.js";
import {
  addSkillDirectories,
  discoverSkillDirsForPaths,
  getDynamicSkills,
} from "../../skills/loadSkillsDir.js";
import { isSyscallError, AbortError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { toolMatchesName } from "../../Tool.js";
import { SKILL } from "./skillToolNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { createUserMessage, wrapInSystemReminder } from "../../utils/messages.js";
import { C4 } from "../AgentTool/backgroundGates.js";
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
import { Mr } from "../../utils/agentId.js";
import {
  resolveVisibleSubagentId,
  getOwnToolSurface,
  registerAsyncAgent,
  SKe,
  createAgentTaskState,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { HM } from "../../services/compact/compactCarry.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { rue, runAgent } from "../AgentTool/runAgent.js";
import { runWithCwdOverride } from "../../utils/cwd.js";
import { runAsyncAgentLifecycle } from "../AgentTool/agentToolUtils.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { isSendMessageHandbackEnabled } from "../AgentTool/handbackReport.js";
import { registerTaskLoop } from "../../tasks/taskLoopRegistry.js";
import { evictTaskOutput } from "../../utils/task/diskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-0fs3a553.js:1506-1516 placement
var K = 100;
//@ chunk-0fs3a553.js:1516-2092 placement
async function nestedSkillsForChangedFiles(o) {
  if (
    isCustomizationDisabled("skills") ||
    !isSettingSourceEnabled("projectSettings") ||
    isRestrictedToPluginOnly("skills") ||
    getProjectConfigRoot() !== null ||
    isDiskless()
  )
    return [];
  let r = findGitRoot(o);
  if (r === null) return [];
  let n = await buildFilterNeutralizingArgs(r);
  if (!n.ok) return [];
  let i = await runGitReadOnly(r, [...n.args, "status", "--porcelain", "-z", lb, "--untracked-files=normal"]);
  if (!i.ok) return [];
  let parts = i.stdout.split("\x00"),
    s = new Map();
  for (let e = 0; e < parts.length; e++) {
    let u = parts[e] ?? "";
    if (u.length < 4) continue;
    let c = [u.slice(3)];
    if (/[RC]/.test(u.slice(0, 2))) (e++, c.push(parts[e] ?? ""));
    for (let p of c) {
      let d = resolve(r, p);
      if (p !== "" && d !== r && s.size < K && isPathWithin(r, d, { alreadyComparable: !0 }))
        s.set(dirname(d), d);
    }
  }
  return [...s.values()];
}
/**
 * 找出与给定未限定名匹配、可由 Skill 工具调用的技能变体（排除正在派生自身的 fork 技能）。
 */
//@ chunk-0fs3a553.js:2092-2228 placement
function matchingSkillVariants(o, r, n) {
  return o.filter(
    (i) =>
      i.type === "prompt" &&
      matchesUnqualifiedName(i, r) &&
      isSkillToolCommand(i) &&
      isNonEmptyIdentifier(i.name) &&
      !(i.context === "fork" && n !== void 0 && getBareCommandName(i) === n),
  );
}
//@ chunk-0fs3a553.js:2228-3438 placement
async function scopedSkillVariantNote(o, r, n) {
  if (o.type !== "prompt" || o.unqualifiedName != null) return null;
  if (r !== null && n.session !== void 0 && exe(o.name) !== null)
    try {
      let s = await nestedSkillsForChangedFiles(r);
      if (s.length > 0)
        await addSkillDirectories(await discoverSkillDirsForPaths(n.session.host, s, r, n.storageV5));
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(`[skills] Changed files not searched for nested skills: ${error}`);
      else logError(error);
    }
  if (getDynamicSkills().length === 0 && getAdditionalDirectoriesForClaudeMd().length === 0) return null;
  if (!n.options.tools.some((tool) => toolMatchesName(tool, SKILL))) return null;
  let i = matchingSkillVariants(await getCommands(r, n.storageV5), o.name, n.options.spawnedBySkill);
  if (i.length === 0) return null;
  let mapped = i.map((s) => {
    let sliced = s.name.slice(0, s.name.length - o.name.length - 1);
    return `- \`${s.name}\` \u2014 for files under ${sliced}/`;
  });
  return (
    logEvent("tengu_skill_scoped_variant_note", { variant_count: i.length }),
    createUserMessage({
      content: wrapInSystemReminder(
        [
          `Directory-scoped variants of the "${o.name}" skill exist in this repo:`,
          ...mapped,
          `The bare name always resolves to this unscoped skill; the variants are reachable only by their exact qualified names. If the files you are working on are under a variant's directory, invoke that variant now with the ${SKILL} tool and follow it instead \u2014 it carries that subtree's own instructions. If your changes span more than one variant's directory, run each matching variant.`,
        ].join(`
`),
      ),
      isMeta: !0,
    })
  );
}
/**
 * 判断 fork 技能是否在后台运行：非交互、工作流内或已指定前台时为否，否则按技能的 background 设置（默认是）。
 */
//@ chunk-0fs3a553.js:3438-3543 placement
function shouldBackgroundForkedSkill(o, r, n) {
  if (n || r.spawnedByWorkflowRunId !== void 0 || C4() || getIsNonInteractiveSession()) return !1;
  return o.background ?? !0;
}
//@ chunk-0fs3a553.js:3543-6441 placement = updateMagicDoc (0.152)
async function runForkedAgent({
  agentId: agentId,
  agentDefinition: agentDefinition,
  command: command,
  description: description,
  prompt: prompt,
  promptMessages: promptMessages,
  context: context,
  canUseTool: canUseTool,
  getAppState: getAppState,
  permissionLayers: permissionLayers,
  readFileState: readFileState,
  availableTools: availableTools,
  webFetchReadmissionAllowed: webFetchReadmissionAllowed,
  spawnedBySkill: spawnedBySkill,
  recordInvocationOnSuccess: recordInvocationOnSuccess,
  frozenCommandDenies: frozenCommandDenies,
}) {
  let { taskRegistry: taskRegistry } = context,
    now = Date.now(),
    w = description.length > 50 ? truncateToLength(description, 49) + "\u2026" : description,
    C = getAgentDepth(context.agentContext) + 1,
    _ = getAgentModel(
      agentDefinition.model,
      getMainLoopModel(context),
      command.model,
      getToolPermissionContext(context).mode,
    ),
    M = () => {
      if (context.abortController.signal.aborted) {
        if (unwrapAbortReason(context.abortController.signal.reason) !== "interrupt") throw new AbortError();
      }
      for (let k of Object.values(taskRegistry.all()))
        if (k.type === "local_agent" && !isTerminalTaskStatus(k.status) && k.forkedSkillName === command.name)
          return (logFeatureSad("subagent_launch", "forked_skill_live_duplicate"), !0);
      return !1;
    };
  if (M()) return null;
  let P = getMaxSubagentSpawnDepth();
  if (C > P) return (logFeatureSad("subagent_launch", "forked_skill_depth_cap"), null);
  let R = {
    skillName: command.name,
    attributionName: spawnedBySkill,
    ...(agentDefinition.effort !== void 0 && { effort: agentDefinition.effort }),
    ...(frozenCommandDenies !== void 0 &&
      frozenCommandDenies.length > 0 && { frozenCommandDenies: [...frozenCommandDenies] }),
  };
  if (!FORKED_SKILL_SCOPING_SCHEMA().safeParse(R).success)
    return (logFeatureSad("subagent_launch", "forked_skill_scoping_unpersistable"), null);
  try {
    await writeForkedSkillScoping(Mr(agentId), R, context.storageV5);
  } catch (error) {
    return (
      spawnForkedSkill(error),
      logFeatureSad("subagent_launch", "forked_skill_scoping_write_failed"),
      null
    );
  }
  if (M()) return null;
  let D = resolveVisibleSubagentId(context.agentId, taskRegistry) ?? mainAgentId(),
    I = getOwnToolSurface(context, D),
    detected = registerAsyncAgent({
      outputFileReadable: HM(context.options.tools),
      ownerCanContinueAgents: I,
      agentId: agentId,
      ownerAgentId: D,
      parentAgentId: context.agentId,
      spawnDepth: C,
      description: w,
      prompt: prompt,
      model: _,
      selectedAgent: agentDefinition,
      taskRegistry: taskRegistry,
      toolUseId: context.toolUseId,
      forkedSkillName: command.name,
      sessionScratch: context.session.sessionScratch,
    }),
    abortController = detected.abortController,
    allocateName = context.agentLifecycle.allocateName(command.name);
  (context.agentLifecycle.registerName(allocateName, Mr(agentId)),
    addAgentKeepaliveReason(
      resolveVisibleSubagentId(context.agentId, taskRegistry),
      `agent:${agentId}`,
      taskRegistry,
    ));
  let F = {
      agentId: agentId,
      parentAgentId: context.agentId,
      depth: C,
      ...(alwaysFalse(context) && { spawnedByMainThread: !0 }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: agentDefinition.agentType,
      isBuiltIn: isBuiltInAgent(agentDefinition),
      displayName: allocateName,
      isAsync: !0,
      isBackgroundAgent: !0,
      invocationKind: "spawn",
      invocationEmitted: !1,
      ...getWorkflowRunFields(context.agentContext),
    },
    L = {
      prompt: prompt,
      resolvedAgentModel: _,
      isBuiltInAgent: isBuiltInAgent(agentDefinition),
      startTime: now,
      agentType: agentDefinition.agentType,
      isAsync: !0,
      agentDepth: C,
      callerCanContinueAgents: I,
      source: agentDefinition.source,
    },
    { onToolPool: onToolPool, reviewTools: reviewTools } = rue(context.options.tools);
  return (
    runWithCwdOverride(F, () =>
      runAsyncAgentLifecycle({
        taskId: detected.agentId,
        abortController: abortController,
        makeStream: (k, V, W) =>
          runAgent({
            agentDefinition: agentDefinition,
            promptMessages: promptMessages,
            turnPrompt: prompt,
            toolUseContext: { ...context, getAppState: getAppState, permissionLayers: permissionLayers },
            canUseTool: canUseTool,
            isAsync: !0,
            querySource: "agent:custom",
            spawnedBySkill: spawnedBySkill,
            spawnedByForkedSkill: !0,
            model: command.model,
            onModelRestricted: agentModelRestrictionNotifier(spawnedBySkill, context.appendSystemMessage),
            availableTools: availableTools,
            webFetchReadmissionAllowed: webFetchReadmissionAllowed,
            override: {
              agentId: Mr(agentId),
              agentContext: F,
              abortController: abortController,
              readFileState: readFileState,
            },
            onCacheSafeParams: k,
            onQueryProgress: V,
            onStreamTokenEstimate: W,
            onToolPool: onToolPool,
            description: w,
            name: allocateName,
          }),
        metadata: { ...L, agentContext: F },
        description: w,
        toolUseContext: context,
        reviewTools: reviewTools,
        taskRegistry: taskRegistry,
        agentIdForCleanup: agentId,
        enableSummarization: !0,
        getWorktreeResult: async () => ({}),
        onTerminalSuccess: recordInvocationOnSuccess,
      }),
    ),
    logFeatureOk("subagent_launch"),
    { agentId: agentId, name: allocateName }
  );
}
//@ chunk-0fs3a553.js:6441-6511 placement
function spawnForkedSkill(o) {
  logForDebugging(`Failed to write forked-skill scoping sidecar: ${o}`);
}
/**
 * context=fork 的技能作为后台任务登记：创建可分离的中止控制器与任务循环，注册代理任务状态；返回的 remove 会解绑并发出任务通知（被中止时为 stopped）。
 */
//@ chunk-0fs3a553.js:6511-7103 placement
function registerForkedSkillTask({
  agentId: agentId,
  parentAgentId: parentAgentId,
  spawnDepth: spawnDepth,
  skillName: skillName,
  prompt: prompt,
  selectedAgent: selectedAgent,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  callerAbortController: callerAbortController,
}) {
  if (!isSendMessageHandbackEnabled()) return { abortController: callerAbortController, remove() {} };
  let abortController = createAbortController(),
    detachRelay = attachDetachableAbortRelay(callerAbortController, abortController),
    unregisterLoop = registerTaskLoop(agentId, abortController);
  SKe(agentId);
  let description = `/${skillName}`,
    taskState = createAgentTaskState({
      agentId: agentId,
      ownerAgentId: resolveVisibleSubagentId(parentAgentId, taskRegistry) ?? mainAgentId(),
      parentAgentId: parentAgentId,
      spawnDepth: spawnDepth,
      description: description,
      prompt: prompt,
      selectedAgent: selectedAgent,
      toolUseId: toolUseId,
      abortController: abortController,
      forkWorker: !0,
    });
  return (
    taskRegistry.register(taskState),
    {
      abortController: abortController,
      remove(T) {
        (detachRelay(),
          unregisterLoop(),
          taskRegistry.remove(agentId),
          evictTaskOutput(agentId),
          emitTaskNotification(agentId, abortController.signal.aborted ? "stopped" : T, {
            toolUseId: toolUseId,
            summary: description,
            outputFile: taskState.outputFile,
            skipTranscript: !0,
            ambient: !0,
          }));
      },
    }
  );
}

export {
  shouldBackgroundForkedSkill,
  scopedSkillVariantNote,
  runForkedAgent,
  registerForkedSkillTask,
  matchingSkillVariants,
};
