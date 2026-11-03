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
import { Us } from "../../services/projects/threadRows.js";
import { analyzeContextUsage } from "../../utils/analyzeContext.js";
import { isHostedWorker, isBridgeOrTransport } from "../../cli/transportState.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { u6 } from "../../utils/systemPrompt.js";

/**
 * 上下文超出上限的提示。
 */
//@ chunk-6a3xjg89.js:416-865 placement
function contextOverflowNotice(o) {
  let a = contextOverflowKind(o);
  if (a === null) return null;
  let n = formatTokens(o.totalTokens - o.rawMaxTokens),
    i = formatTokens(o.rawMaxTokens);
  if (a === "hard_limit") {
    let p = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear" : "/compact or /clear";
    return `Context exceeds the ${i}-token limit by ${n} tokens \u2014 run ${p} to continue.`;
  }
  let m = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear" : "/compact";
  return `Context is ${n} tokens past the ${i}-token compaction window \u2014 run ${m} to reduce usage.`;
}
//@ chunk-6a3xjg89.js:865-993 placement
function contextOverflowKind(o) {
  if (o.totalTokens <= o.rawMaxTokens) return null;
  return o.autocompactSource === "auto" ? "hard_limit" : "compaction_window";
}
//@ chunk-6a3xjg89.js:993-3125 fingerprint = formatContextAsMarkdownTable (0.861)
function formatContextAsMarkdownTable(data) {
  let {
      categories: categories,
      totalTokens: totalTokens,
      rawMaxTokens: rawMaxTokens,
      percentage: percentage,
      model: model,
      memoryFiles: memoryFiles,
      mcpTools: mcpTools,
      agents: agents,
      skills: skills,
      messageBreakdown: messageBreakdown,
      systemTools: systemTools,
      systemPromptSections: systemPromptSections,
    } = data,
    output = `## Context Usage

`;
  ((output += `**Model:** ${model}  
`),
    (output += `**Tokens:** ${formatTokens(totalTokens)} / ${formatTokens(rawMaxTokens)} (${percentage}%)
`));
  let d = contextOverflowNotice(data);
  if (d)
    output += `**Over limit:** ${d}
`;
  output += `
`;
  let visibleCategories = categories.filter(
    (cat) => cat.tokens > 0 && cat.name !== "Free space" && cat.name !== "Autocompact buffer",
  );
  if (visibleCategories.length > 0) {
    ((output += `### Estimated usage by category

`),
      (output += `| Category | Tokens | Percentage |
`),
      (output += `|----------|--------|------------|
`));
    for (let cat of visibleCategories) {
      let percentDisplay = ((cat.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| ${cat.name} | ${formatTokens(cat.tokens)} | ${percentDisplay}% |
`;
    }
    let freeSpaceCategory = categories.find((r) => r.name === "Free space");
    if (freeSpaceCategory && freeSpaceCategory.tokens > 0) {
      let percentDisplay = ((freeSpaceCategory.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| Free space | ${formatTokens(freeSpaceCategory.tokens)} | ${percentDisplay}% |
`;
    }
    let autocompactCategory = categories.find((r) => r.name === "Autocompact buffer");
    if (autocompactCategory && autocompactCategory.tokens > 0) {
      let percentDisplay = ((autocompactCategory.tokens / rawMaxTokens) * 100).toFixed(1);
      output += `| Autocompact buffer | ${formatTokens(autocompactCategory.tokens)} | ${percentDisplay}% |
`;
    }
    output += `
`;
  }
  if (mcpTools.length > 0) {
    ((output += `### MCP Tools

`),
      (output += `| Tool | Server | Tokens |
`),
      (output += `|------|--------|--------|
`));
    for (let tool of mcpTools)
      output += `| ${tool.name} | ${tool.serverName} | ${formatTokens(tool.tokens)} |
`;
    output += `
`;
  }
  if (
    (systemTools && systemTools.length > 0,
    systemPromptSections && systemPromptSections.length > 0,
    agents.length > 0)
  ) {
    ((output += `### Custom Agents

`),
      (output += `| Agent Type | Source | Tokens |
`),
      (output += `|------------|--------|--------|
`));
    for (let tool of agents) {
      let sourceDisplay;
      switch (tool.source) {
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
          sourceDisplay = String(tool.source);
      }
      output += `| ${tool.agentType} | ${sourceDisplay} | ${formatTokens(tool.tokens)} |
`;
    }
    output += `
`;
  }
  if (memoryFiles.length > 0) {
    ((output += `### Memory Files

`),
      (output += `| Type | Path | Tokens |
`),
      (output += `|------|------|--------|
`));
    for (let file of memoryFiles)
      output += `| ${file.type} | ${file.path} | ${formatTokens(file.tokens)} |
`;
    output += `
`;
  }
  if (skills && skills.tokens > 0 && skills.skillFrontmatter.length > 0) {
    ((output += `### Skills

`),
      (output += `| Skill | Source | Tokens |
`),
      (output += `|-------|--------|--------|
`));
    for (let skill of skills.skillFrontmatter) {
      let s =
        getSourceDisplayName(skill.source) +
        (skill.pluginName && skill.source !== "syncedSkills" ? ` (${skill.pluginName})` : "");
      output += `| ${skill.name} | ${s} | ${formatTokenEstimate(skill.tokens)} |
`;
    }
    output += `
`;
  }
  return output;
}
//@ chunk-6a3xjg89.js:3125-3849 placement
async function collectContextData(o) {
  let {
      session: session,
      messages: messages,
      getAppState: getAppState,
      options: {
        mainLoopModel: m,
        tools: p,
        agentDefinitions: u,
        customSystemPrompt: k,
        appendSystemPrompt: g,
        systemPromptSnapshot: l,
        excludeDynamicSections: y,
        mcpClients: f,
      },
      detail: detail,
      terminalWidth: terminalWidth,
      localPaths: localPaths,
    } = o,
    c = Us(messages),
    e = getAppState(),
    s = await analyzeContextUsage(c, m, async () => e.toolPermissionContext, p, u, {
      session: session,
      toolUseContext: {
        options: { customSystemPrompt: k, appendSystemPrompt: g, systemPromptSnapshot: l, mcpClients: f },
        getMcp: o.getMcp,
        storageV5: o.storageV5,
        credentials: o.credentials,
      },
      originalMessages: c,
      configuredWindow: e.autoCompactWindow,
      excludeDynamicSections: y,
      detail: detail,
      terminalWidth: terminalWidth,
      localPaths: localPaths,
    });
  return isHostedWorker(session)
    ? { ...s, deferredBuiltinTools: void 0, systemTools: void 0, systemPromptSections: void 0 }
    : s;
}
//@ chunk-6a3xjg89.js:3849-4031 placement
async function call(args, context) {
  let n = await collectContextData(context),
    m = isBridgeOrTransport(context.session) ? { ...n, memoryFiles: [] } : n;
  return {
    type: "text",
    value: formatContextAsMarkdownTable(
      isHostedWorker(context.session) ? { ...m, messageBreakdown: void 0 } : m,
    ),
    contextUsage: buildContextUsage(m),
  };
}
//@ chunk-6a3xjg89.js:4031-4764 placement
function buildContextUsage(o) {
  let a = contextOverflowKind(o);
  return {
    model: o.model,
    total_tokens: o.totalTokens,
    raw_max_tokens: o.rawMaxTokens,
    percentage: o.percentage,
    ...(a !== null && { over_limit: { tokens_over: o.totalTokens - o.rawMaxTokens, kind: a } }),
    categories: o.categories.map((category) => ({
      name: category.name,
      tokens: category.tokens,
      kind: category.kind,
    })),
    mcp_tools: o.mcpTools.map((mcpTool) => ({
      name: mcpTool.name,
      server_name: mcpTool.serverName,
      tokens: mcpTool.tokens,
    })),
    memory_files: o.memoryFiles.map((memoryFile) => ({
      path: memoryFile.path,
      type: memoryFile.type,
      tokens: memoryFile.tokens,
    })),
    agents: o.agents.map((agent) => ({
      agent_type: agent.agentType,
      source: agent.source,
      tokens: agent.tokens,
    })),
    ...(o.skills &&
      o.skills.skillFrontmatter.length > 0 && {
        skills: o.skills.skillFrontmatter.map((n) => ({
          name: n.name,
          source: n.source,
          ...(n.pluginName !== void 0 && { plugin_name: n.pluginName }),
          tokens: n.tokens,
        })),
      }),
  };
}
//@ chunk-7jbxc8kr.js:3444-3796 fingerprint = collectContextData (0.588)
async function collectContextData_2(context) {
  let appState = context.getAppState(),
    a = appState.agent
      ? appState.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === appState.agent)
      : void 0,
    n = await getSystemPrompt(context.options.tools, context.options.mainLoopModel);
  return u6({
    mainThreadAgentDefinition: a,
    toolUseContext: context,
    customSystemPrompt: context.options.customSystemPrompt,
    defaultSystemPrompt: n,
    appendSystemPrompt: context.options.appendSystemPrompt,
  });
}

export { contextOverflowNotice, formatContextAsMarkdownTable, collectContextData, collectContextData_2 };
