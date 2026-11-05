/**
 * plugins/functionHooks/contextDataApi.ts
 *
 * 2.1.316 新增：插件读取会话上下文数据的接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:799160-800664 placement
/**
 * 把内部的上下文用量数据复制为插件可见的形状：分类、网格、模型、记忆文件、MCP 工具、代理、斜杠命令、技能、自动压缩阈值与 API 用量。
 */
function toPluginContextData(data) {
  let { slashCommands, skills, autoCompactThreshold, apiUsage } = data;
  let hasSlashCommands = slashCommands !== undefined;
  let hasSkills = skills !== undefined;
  let hasThreshold = autoCompactThreshold !== undefined;
  let hasApiUsage = apiUsage !== null;
  return {
    categories: data.categories.map(({ name, tokens, color, isDeferred = false, kind }) => ({
      name,
      tokens,
      color,
      isDeferred,
      kind,
    })),
    totalTokens: data.totalTokens,
    maxTokens: data.maxTokens,
    rawMaxTokens: data.rawMaxTokens,
    autocompactSource: data.autocompactSource,
    percentage: data.percentage,
    gridRows: data.gridRows.map((row) =>
      row.map((cell) => ({
        color: cell.color,
        isFilled: cell.isFilled,
        categoryName: cell.categoryName,
        tokens: cell.tokens,
        percentage: cell.percentage,
        squareFullness: cell.squareFullness,
      })),
    ),
    model: data.model,
    memoryFiles: data.memoryFiles.map((memoryFile) => ({
      path: memoryFile.path,
      type: memoryFile.type,
      tokens: memoryFile.tokens,
    })),
    mcpTools: data.mcpTools.map(({ name, serverName, tokens, isLoaded = true }) => ({
      name,
      serverName,
      tokens,
      isLoaded,
    })),
    agents: data.agents.map(({ agentType, source, tokens }) => ({
      agentType,
      source,
      tokens,
    })),
    ...(hasSlashCommands && {
      slashCommands: {
        totalCommands: slashCommands.totalCommands,
        includedCommands: slashCommands.includedCommands,
        tokens: slashCommands.tokens,
      },
    }),
    ...(hasSkills && {
      skills: {
        totalSkills: skills.totalSkills,
        includedSkills: skills.includedSkills,
        tokens: skills.tokens,
        skillFrontmatter: skills.skillFrontmatter.map(({ name, source, pluginName, tokens }) => ({
          name,
          source,
          ...(pluginName !== undefined && {
            pluginName,
          }),
          tokens,
        })),
      },
    }),
    ...(hasThreshold && {
      autoCompactThreshold,
    }),
    isAutoCompactEnabled: data.isAutoCompactEnabled,
    apiUsage: hasApiUsage
      ? {
          input_tokens: apiUsage.input_tokens,
          output_tokens: apiUsage.output_tokens,
          cache_creation_input_tokens: apiUsage.cache_creation_input_tokens,
          cache_read_input_tokens: apiUsage.cache_read_input_tokens,
        }
      : null,
  };
}
//@ chunk-5xgkngpb.js:800664-800755 placement
/**
 * 读插件上下文数据
 */
var pluginContextData = async (ctx, options) =>
  toPluginContextData(
    await ctx.contextData({
      detail: options.breakdown,
      terminalWidth: options.columns,
    }),
  );
//@ chunk-5xgkngpb.js:800816-800857 placement
/**
 * detail 键名格式
 */
var DETAIL_KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]{0,31}$/;
export { pluginContextData, DETAIL_KEY_RE };
