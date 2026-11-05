/**
 * utils/embeddedTools.ts
 *
 * 判断是否使用二进制内嵌的搜索工具（ripgrep 等）并给出其路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/embeddedTools.ts
 * pieces: chunk-5xgkngpb.js (4), chunk-9ys74nhz.js (1), chunk-e5z7dpjd.js (1)
 * attribution: placement 4, fingerprint 2
 */
import { env } from "./env.js";
import { isEnvTruthy } from "./envUtils.js";
import { getSearchToolsOptIn } from "../bootstrap/state.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { isBashAvailable } from "./shell/shellToolUtils.js";
import { toolByAlias } from "../services/tools/batchTools.js";
import { jsonParse } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9ys74nhz.js:4645-4739 fingerprint (2.1.88 match: hasEmbeddedSearchTools, 0.81)
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
//@ chunk-5xgkngpb.js:179350-179454 placement
/**
 * hasEmbeddedSearchTools：是否用 claude 二进制内嵌的 bfs/ugrep 代替 Glob/Grep。旧版读 EMBEDDED_SEARCH_TOOLS，316 编译成常量 "true"；之后若启动参数点名了 Glob/Grep（searchToolsOptIn）或入口是 local-agent 则为假。
 */
function hasEmbeddedSearchTools() {
  if (!isEnvTruthy("true")) return false;
  if (getSearchToolsOptIn()) return false;
  return env.CLAUDE_CODE_ENTRYPOINT !== "local-agent";
}
//@ chunk-5xgkngpb.js:179454-179470 placement
var NO_SHADOWED_SEARCH_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:179454", () => {
  NO_SHADOWED_SEARCH_TOOLS = new Set();
});
//@ chunk-5xgkngpb.js:179470-179495 placement
var EMBEDDED_SHADOWED_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:179470", () => {
  EMBEDDED_SHADOWED_TOOL_NAMES = new Set([GLOB_TOOL_NAME, GREP_TOOL_NAME]);
});
//@ chunk-5xgkngpb.js:179495-179633 placement
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
//@ chunk-e5z7dpjd.js:20391-20547 fingerprint (2.1.88 match: embeddedSearchToolsBinaryPath, 0.725)
function embeddedSearchToolsBinaryPath(jsonText) {
  try {
    if (!jsonText || jsonText.trim() === "") return null;
    let parsed = jsonParse(jsonText);
    if (typeof parsed.pid !== "number" || !parsed.version || !parsed.execPath) return null;
    return parsed;
  } catch {
    return null;
  }
}
export {
  hasEmbeddedSearchTools,
  hasEmbeddedSearchTools_2,
  embeddedSearchToolsBinaryPath,
  getShadowedSearchToolNames,
};
