/**
 * utils/embeddedTools.ts
 *
 * 判断是否使用二进制内嵌的搜索工具（ripgrep 等）并给出其路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/embeddedTools.ts
 * pieces: chunk-7dqf31r1.js (1), chunk-e6aww6q8.js (4), chunk-fb29jded.js (1)
 * attribution: fingerprint 2, placement 4
 */
import { promises } from "fs";
import { env } from "./env.js";
import { isEnvTruthy } from "./envUtils.js";
import { getSearchToolsOptIn } from "../bootstrap/state.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { isBashAvailable } from "./shell/shellToolUtils.js";
import { toolByAlias } from "../services/tools/batchTools.js";
import { resolveClaudePath } from "./deepLink/registerProtocol.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7dqf31r1.js:4635-4729 fingerprint = hasEmbeddedSearchTools (0.811)
/**
 * 是否使用内嵌的搜索工具二进制（ripgrep 等），按入口（sdk-ts/sdk-py/sdk-cli 等）判断。
 */
function hasEmbeddedSearchTools_2() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    CLAUDE_CODE_ENTRYPOINT === "sdk-ts" ||
    CLAUDE_CODE_ENTRYPOINT === "sdk-py" ||
    CLAUDE_CODE_ENTRYPOINT === "sdk-cli"
  );
}
//@ chunk-e6aww6q8.js:179240-179344 placement
/**
 * hasEmbeddedSearchTools：是否用 claude 二进制内嵌的 bfs/ugrep 代替 Glob/Grep。旧版读 EMBEDDED_SEARCH_TOOLS，316 编译成常量 "true"；之后若启动参数点名了 Glob/Grep（searchToolsOptIn）或入口是 local-agent 则为假。
 */
function hasEmbeddedSearchTools() {
  if (!isEnvTruthy("true")) return false;
  if (getSearchToolsOptIn()) return false;
  return env.CLAUDE_CODE_ENTRYPOINT !== "local-agent";
}
//@ chunk-e6aww6q8.js:179344-179360 placement
var NO_SHADOWED_SEARCH_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:179344", () => {
  NO_SHADOWED_SEARCH_TOOLS = new Set();
});
//@ chunk-e6aww6q8.js:179360-179385 placement
var EMBEDDED_SHADOWED_TOOL_NAMES; // deferred: uses GREP_TOOL_NAME (../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:179360", () => {
  EMBEDDED_SHADOWED_TOOL_NAMES = new Set([GLOB_TOOL_NAME, GREP_TOOL_NAME]);
});
//@ chunk-e6aww6q8.js:179385-179523 placement
/**
 * 被嵌入式搜索遮蔽的工具名：FC() 且 jd()（非 Windows，或 Windows 找到 Git Bash）时返回 {Glob, Grep} 及其 V2 别名名，否则空集。getAllBaseTools 据此不注册 Glob/Grep。
 */
function getShadowedSearchToolNames() {
  if (!hasEmbeddedSearchTools() || !isBashAvailable()) return NO_SHADOWED_SEARCH_TOOLS;
  let shadowedNames = EMBEDDED_SHADOWED_TOOL_NAMES;
  let alias;
  for (let name of shadowedNames) {
    let tool = toolByAlias(name);
    if (tool !== undefined) {
      alias ??= new Set(shadowedNames);
      alias.add(tool.name);
    }
  }
  return alias ?? shadowedNames;
}
//@ chunk-fb29jded.js:3379-3474 fingerprint = embeddedSearchToolsBinaryPath (0.676)
async function embeddedSearchToolsBinaryPath() {
  let claudePath = resolveClaudePath();
  try {
    await promises.realpath(claudePath);
    return claudePath;
  } catch {
    return process.execPath;
  }
}
export {
  hasEmbeddedSearchTools,
  hasEmbeddedSearchTools_2,
  getShadowedSearchToolNames,
  embeddedSearchToolsBinaryPath,
};
