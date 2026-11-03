/**
 * plugins/functionHooks/contextDataApi.ts
 *
 * 2.1.316 新增：插件读取会话上下文数据的接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */

//@ chunk-e6aww6q8.js:787844-789339 placement
/**
 * 把内部的上下文用量数据复制为插件可见的形状：分类、网格、模型、记忆文件、MCP 工具、代理、斜杠命令、技能、自动压缩阈值与 API 用量。
 */
function toPluginContextData(e) {
  let { slashCommands, skills, autoCompactThreshold, apiUsage } = e;
  let y = slashCommands !== undefined;
  let S = skills !== undefined;
  let w = autoCompactThreshold !== undefined;
  let L = apiUsage !== null;
  return {
    categories: e.categories.map(({ name: G, tokens, color, isDeferred = false, kind }) => ({
      name: G,
      tokens,
      color,
      isDeferred,
      kind,
    })),
    totalTokens: e.totalTokens,
    maxTokens: e.maxTokens,
    rawMaxTokens: e.rawMaxTokens,
    autocompactSource: e.autocompactSource,
    percentage: e.percentage,
    gridRows: e.gridRows.map((G) =>
      G.map((q) => ({
        color: q.color,
        isFilled: q.isFilled,
        categoryName: q.categoryName,
        tokens: q.tokens,
        percentage: q.percentage,
        squareFullness: q.squareFullness,
      })),
    ),
    model: e.model,
    memoryFiles: e.memoryFiles.map((memoryFile) => ({
      path: memoryFile.path,
      type: memoryFile.type,
      tokens: memoryFile.tokens,
    })),
    mcpTools: e.mcpTools.map(({ name: G, serverName, tokens, isLoaded = true }) => ({
      name: G,
      serverName,
      tokens,
      isLoaded,
    })),
    agents: e.agents.map(({ agentType, source, tokens }) => ({
      agentType,
      source,
      tokens,
    })),
    ...(y && {
      slashCommands: {
        totalCommands: slashCommands.totalCommands,
        includedCommands: slashCommands.includedCommands,
        tokens: slashCommands.tokens,
      },
    }),
    ...(S && {
      skills: {
        totalSkills: skills.totalSkills,
        includedSkills: skills.includedSkills,
        tokens: skills.tokens,
        skillFrontmatter: skills.skillFrontmatter.map(({ name: G, source, pluginName, tokens }) => ({
          name: G,
          source,
          ...(pluginName !== undefined && {
            pluginName,
          }),
          tokens,
        })),
      },
    }),
    ...(w && {
      autoCompactThreshold,
    }),
    isAutoCompactEnabled: e.isAutoCompactEnabled,
    apiUsage: L
      ? {
          input_tokens: apiUsage.input_tokens,
          output_tokens: apiUsage.output_tokens,
          cache_creation_input_tokens: apiUsage.cache_creation_input_tokens,
          cache_read_input_tokens: apiUsage.cache_read_input_tokens,
        }
      : null,
  };
}
//@ chunk-e6aww6q8.js:789339-789430 placement
/**
 * 读插件上下文数据
 */
var pluginContextData = async (e, n) =>
  toPluginContextData(
    await e.contextData({
      detail: n.breakdown,
      terminalWidth: n.columns,
    }),
  );
//@ chunk-e6aww6q8.js:789491-789532 placement
/**
 * detail 键名格式
 */
var DETAIL_KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]{0,31}$/;
export { pluginContextData, DETAIL_KEY_RE };
