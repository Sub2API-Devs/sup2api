/**
 * commands/cd/index.ts
 *
 * 2.1.316 新增：/cd 命令对象：切换会话工作目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */

/**
 * /cd 命令对象（local-jsx）；描述：Move this session to a new working directory；实现 chunk-fh3th4b7.js 的 Vo。
 */
//@ chunk-e6aww6q8.js:1686713-1686839 placement
var cdCommandDefinition = {
    type: "local-jsx",
    name: "cd",
    description: "Move this session to a new working directory",
    argumentHint: "<path>",
  },
  cdCommand = cdCommandDefinition;

export { cdCommand };
