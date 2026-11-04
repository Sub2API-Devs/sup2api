/**
 * commands/context/context-noninteractive.ts
 *
 * /context 非交互输出：上下文用量收集与超限提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/context/context-noninteractive.ts
 * pieces: chunk-6a3xjg89.js (6), chunk-7jbxc8kr.js (1)
 * attribution: placement 5, fingerprint 2
 */
import { formatTokens, formatTokenEstimate } from "../../utils/format.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { getSourceDisplayName } from "../../utils/settings/constants.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { analyzeContextUsage } from "../../utils/analyzeContext.js";
import { isHostedWorker, isBridgeOrTransport } from "../../cli/transportState.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";

//@ chunk-6a3xjg89.js:416-865 placement
/**
 * 上下文超出上限的提示。
 */
function contextOverflowNotice(usage) {
  let kind = contextOverflowKind(usage);
  if (kind === null) return null;
  let overBy = formatTokens(usage.totalTokens - usage.rawMaxTokens);
  let maxTokens = formatTokens(usage.rawMaxTokens);
  if (kind === "hard_limit") {
    let commandHint = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear" : "/compact or /clear";
    return `Context exceeds the ${maxTokens}-token limit by ${overBy} tokens \u2014 run ${commandHint} to continue.`;
  }
  let compactCommand = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear" : "/compact";
  return `Context is ${overBy} tokens past the ${maxTokens}-token compaction window \u2014 run ${compactCommand} to reduce usage.`;
}
//@ chunk-6a3xjg89.js:865-993 placement
function contextOverflowKind(usage) {
  if (usage.totalTokens <= usage.rawMaxTokens) return null;
  return usage.autocompactSource === "auto" ? "hard_limit" : "compaction_window";
}
//@ chunk-6a3xjg89.js:993-3125 fingerprint (2.1.88 match: formatContextAsMarkdownTable, 0.861)
function formatContextAsMarkdownTable(data) {
  let {
    categories,
    totalTokens,
    rawMaxTokens,
    percentage,
    model,
    memoryFiles,
    mcpTools,
    agents,
    skills,
    messageBreakdown,
    systemTools,
    systemPromptSections,
  } = data;
  let output = `## Context Usage

`;
  output += `**Model:** ${model}  
`;
  output += `**Tokens:** ${formatTokens(totalTokens)} / ${formatTokens(rawMaxTokens)} (${percentage}%)
`;
  let notice = contextOverflowNotice(data);
  if (notice)
    output += `**Over limit:** ${notice}
`;
  output += `
`;
  let visibleCategories = categories.filter(
    (cat) => cat.tokens > 0 && cat.name !== "Free space" && cat.name !== "Autocompact buffer",
  );
  if (visibleCategories.length > 0) {
    output += `### Estimated usage by category

`;
    output += `| Category | Tokens | Percentage |
`;
    output += `|----------|--------|------------|
`;
    for (let cat of visibleCategories) {
      let percentDisplay = ((cat.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| ${cat.name} | ${formatTokens(cat.tokens)} | ${percentDisplay}% |
`;
    }
    let freeSpaceCategory = categories.find((category) => category.name === "Free space");
    if (freeSpaceCategory && freeSpaceCategory.tokens > 0) {
      let percentDisplay = ((freeSpaceCategory.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| Free space | ${formatTokens(freeSpaceCategory.tokens)} | ${percentDisplay}% |
`;
    }
    let autocompactCategory = categories.find((category) => category.name === "Autocompact buffer");
    if (autocompactCategory && autocompactCategory.tokens > 0) {
      let percentDisplay = ((autocompactCategory.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| Autocompact buffer | ${formatTokens(autocompactCategory.tokens)} | ${percentDisplay}% |
`;
    }
    output += `
`;
  }
  if (mcpTools.length > 0) {
    output += `### MCP Tools

`;
    output += `| Tool | Server | Tokens |
`;
    output += `|------|--------|--------|
`;
    for (let tool of mcpTools)
      output += `| ${tool.name} | ${tool.serverName} | ${formatTokens(tool.tokens)} |
`;
    output += `
`;
  }
  if (systemTools) systemTools.length > 0;
  if (systemPromptSections) systemPromptSections.length > 0;
  if (agents.length > 0) {
    output += `### Custom Agents

`;
    output += `| Agent Type | Source | Tokens |
`;
    output += `|------------|--------|--------|
`;
    for (let agent of agents) {
      let sourceDisplay;
      switch (agent.source) {
        case "projectSettings":
          sourceDisplay = "Project";
          break;
        case "userSettings":
          sourceDisplay = "User";
          break;
        case "localSettings":
          sourceDisplay = "Local";
          break;
        case "flagSettings":
          sourceDisplay = "Flag";
          break;
        case "policySettings":
          sourceDisplay = "Policy";
          break;
        case "plugin":
          sourceDisplay = "Plugin";
          break;
        case "built-in":
          sourceDisplay = "Built-in";
          break;
        default:
          sourceDisplay = String(agent.source);
      }
      output += `| ${agent.agentType} | ${sourceDisplay} | ${formatTokens(agent.tokens)} |
`;
    }
    output += `
`;
  }
  if (memoryFiles.length > 0) {
    output += `### Memory Files

`;
    output += `| Type | Path | Tokens |
`;
    output += `|------|------|--------|
`;
    for (let file of memoryFiles)
      output += `| ${file.type} | ${file.path} | ${formatTokens(file.tokens)} |
`;
    output += `
`;
  }
  if (skills && skills.tokens > 0 && skills.skillFrontmatter.length > 0) {
    output += `### Skills

`;
    output += `| Skill | Source | Tokens |
`;
    output += `|-------|--------|--------|
`;
    for (let skill of skills.skillFrontmatter) {
      let skillLines =
        getSourceDisplayName(skill.source) +
        (skill.pluginName && skill.source !== "syncedSkills" ? ` (${skill.pluginName})` : "");
      output += `| ${skill.name} | ${skillLines} | ${formatTokenEstimate(skill.tokens)} |
`;
    }
    output += `
`;
  }
  return output;
}
//@ chunk-6a3xjg89.js:3125-3849 placement
async function collectContextData(context) {
  let {
    session,
    messages,
    getAppState,
    options: {
      mainLoopModel,
      tools,
      agentDefinitions,
      customSystemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
      excludeDynamicSections,
      mcpClients,
    },
    detail,
    terminalWidth,
    localPaths,
  } = context;
  let messages_2 = messagesSinceCompactBoundary(messages);
  let appState = getAppState();
  let analysis = await analyzeContextUsage(
    messages_2,
    mainLoopModel,
    async () => appState.toolPermissionContext,
    tools,
    agentDefinitions,
    {
      session,
      toolUseContext: {
        options: {
          customSystemPrompt,
          appendSystemPrompt,
          systemPromptSnapshot,
          mcpClients,
        },
        getMcp: context.getMcp,
        storageV5: context.storageV5,
        credentials: context.credentials,
      },
      originalMessages: messages_2,
      configuredWindow: appState.autoCompactWindow,
      excludeDynamicSections,
      detail,
      terminalWidth,
      localPaths,
    },
  );
  return isHostedWorker(session)
    ? {
        ...analysis,
        deferredBuiltinTools: undefined,
        systemTools: undefined,
        systemPromptSections: undefined,
      }
    : analysis;
}
//@ chunk-6a3xjg89.js:3849-4031 placement
async function call(args, context) {
  let contextData = await collectContextData(context);
  let usage = isBridgeOrTransport(context.session)
    ? {
        ...contextData,
        memoryFiles: [],
      }
    : contextData;
  return {
    type: "text",
    value: formatContextAsMarkdownTable(
      isHostedWorker(context.session)
        ? {
            ...usage,
            messageBreakdown: undefined,
          }
        : usage,
    ),
    contextUsage: buildContextUsage(usage),
  };
}
//@ chunk-6a3xjg89.js:4031-4764 placement
function buildContextUsage(usage) {
  let kind = contextOverflowKind(usage);
  return {
    model: usage.model,
    total_tokens: usage.totalTokens,
    raw_max_tokens: usage.rawMaxTokens,
    percentage: usage.percentage,
    ...(kind !== null && {
      over_limit: {
        tokens_over: usage.totalTokens - usage.rawMaxTokens,
        kind,
      },
    }),
    categories: usage.categories.map((category) => ({
      name: category.name,
      tokens: category.tokens,
      kind: category.kind,
    })),
    mcp_tools: usage.mcpTools.map((mcpTool) => ({
      name: mcpTool.name,
      server_name: mcpTool.serverName,
      tokens: mcpTool.tokens,
    })),
    memory_files: usage.memoryFiles.map((memoryFile) => ({
      path: memoryFile.path,
      type: memoryFile.type,
      tokens: memoryFile.tokens,
    })),
    agents: usage.agents.map((agent) => ({
      agent_type: agent.agentType,
      source: agent.source,
      tokens: agent.tokens,
    })),
    ...(usage.skills &&
      usage.skills.skillFrontmatter.length > 0 && {
        skills: usage.skills.skillFrontmatter.map((skill) => ({
          name: skill.name,
          source: skill.source,
          ...(skill.pluginName !== undefined && {
            plugin_name: skill.pluginName,
          }),
          tokens: skill.tokens,
        })),
      }),
  };
}
//@ chunk-7jbxc8kr.js:3444-3796 fingerprint (2.1.88 match: collectContextData, 0.588)
async function collectContextData_2(context) {
  let appState = context.getAppState();
  let mainThreadAgentDefinition = appState.agent
    ? appState.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === appState.agent)
    : undefined;
  let defaultSystemPrompt = await getSystemPrompt(context.options.tools, context.options.mainLoopModel);
  return effectiveSystemPromptText({
    mainThreadAgentDefinition,
    toolUseContext: context,
    customSystemPrompt: context.options.customSystemPrompt,
    defaultSystemPrompt,
    appendSystemPrompt: context.options.appendSystemPrompt,
  });
}
export {
  contextOverflowNotice,
  formatContextAsMarkdownTable,
  collectContextData,
  collectContextData_2,
  buildContextUsage,
  call,
};
