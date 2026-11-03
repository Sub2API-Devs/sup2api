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

/**
 * 把内部的上下文用量数据复制为插件可见的形状：分类、网格、模型、记忆文件、MCP 工具、代理、斜杠命令、技能、自动压缩阈值与 API 用量。
 */
//@ chunk-e6aww6q8.js:787844-789339 placement
function toPluginContextData(e) {
  let {
      slashCommands: slashCommands,
      skills: skills,
      autoCompactThreshold: autoCompactThreshold,
      apiUsage: apiUsage,
    } = e,
    y = slashCommands !== void 0,
    S = skills !== void 0,
    w = autoCompactThreshold !== void 0,
    L = apiUsage !== null;
  return {
    categories: e.categories.map(
      ({ name: G, tokens: tokens, color: color, isDeferred: isDeferred = !1, kind: kind }) => ({
        name: G,
        tokens: tokens,
        color: color,
        isDeferred: isDeferred,
        kind: kind,
      }),
    ),
    totalTokens: e.totalTokens,
    maxTokens: e.maxTokens,
    rawMaxTokens: e.rawMaxTokens,
    autocompactSource: e.autocompactSource,
    percentage: e.percentage,
    gridRows: e.gridRows.map((gridRow) =>
      gridRow.map((q) => ({
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
    mcpTools: e.mcpTools.map(
      ({ name: G, serverName: serverName, tokens: tokens, isLoaded: isLoaded = !0 }) => ({
        name: G,
        serverName: serverName,
        tokens: tokens,
        isLoaded: isLoaded,
      }),
    ),
    agents: e.agents.map(({ agentType: agentType, source: source, tokens: tokens }) => ({
      agentType: agentType,
      source: source,
      tokens: tokens,
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
        skillFrontmatter: skills.skillFrontmatter.map(
          ({ name: G, source: source, pluginName: pluginName, tokens: tokens }) => ({
            name: G,
            source: source,
            ...(pluginName !== void 0 && { pluginName: pluginName }),
            tokens: tokens,
          }),
        ),
      },
    }),
    ...(w && { autoCompactThreshold: autoCompactThreshold }),
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
var D0t = async (e, n) =>
  toPluginContextData(await e.contextData({ detail: n.breakdown, terminalWidth: n.columns }));
//@ chunk-e6aww6q8.js:789491-789532 placement
var xEo = /^[A-Za-z_][A-Za-z0-9_-]{0,31}$/;

export { D0t, xEo };
