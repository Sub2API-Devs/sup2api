/**
 * utils/permissions/repoRules.ts
 *
 * 2.1.316 新增：组合仓库的 deny/ask 权限规则（含启动规则过滤），供远程/服务端读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4kzs0ch0.js (4)
 * attribution: placement 4
 */
import { PERMISSION_RULE_SOURCES } from "./permissions.js";
import { mergeWithStoredRules } from "./PermissionUpdate.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { logForDebugging } from "../debug.js";
import { getSessionPathsCache } from "../sessionPathsCache.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { permissionRuleValueFromString, escapeRuleContent } from "./permissionRuleParser.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { patternWithRootFor, toPosixPath } from "./filesystem.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";

//@ chunk-4kzs0ch0.js:684-1422 placement
/**
 * 组合仓库级 deny/ask 规则：每个来源先并入存储规则，再加启动规则（忽略以 ! 开头的例外规则并告警），读写规则额外生成锚定到仓库根的版本；有缓存键时走会话缓存。
 */
function composeRepoDenyAskRules(storedRules, launchRules, repoRoot, mergeOptions, cacheKey) {
  let composeBehavior = (behaviorField) =>
    Object.fromEntries(
      PERMISSION_RULE_SOURCES.map((source) => [
        source,
        [
          ...mergeWithStoredRules(
            storedRules[behaviorField][source] ?? [],
            source,
            behaviorField === "alwaysDenyRules" ? "deny" : "ask",
            mergeOptions,
          ),
          ...(launchRules[behaviorField][source] ?? [])
            .filter((ruleString) => {
              if (!PATH_RULE_CARVE_OUT_RE.test(ruleString)) return true;
              logForDebugging(
                `Ignoring the launch ${behaviorField === "alwaysDenyRules" ? "deny" : "ask"} rule "${ruleString}" (from CLAUDE_CODE_MCP_SERVE_SETTINGS, or for ReadFileForRemote and ListDirectoryForRemote a settings file here): a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, and here those include the calling session's own rules. Spell the rule without the exception instead.`,
                {
                  level: "warn",
                },
              );
              return false;
            })
            .flatMap((ruleString) => [ruleString, ...anchorRuleToRepoRoot(ruleString, repoRoot)]),
        ],
      ]),
    );
  let composed = {
    alwaysDenyRules: composeBehavior("alwaysDenyRules"),
    alwaysAskRules: composeBehavior("alwaysAskRules"),
  };
  return mergeOptions === undefined ? composed : getCachedComposedRepoRules(composed, cacheKey);
}
//@ chunk-4kzs0ch0.js:1422-1603 placement
function getCachedComposedRepoRules(composed, cacheKey) {
  let { composedRepoRules } = getSessionPathsCache();
  let cached = composedRepoRules[cacheKey];
  if (cached !== undefined && import_sortedIndex_2(cached, composed)) return cached;
  let frozen = {
    alwaysDenyRules: freezeRuleTables(composed.alwaysDenyRules),
    alwaysAskRules: freezeRuleTables(composed.alwaysAskRules),
  };
  composedRepoRules[cacheKey] = frozen;
  return frozen;
}
//@ chunk-4kzs0ch0.js:1603-1689 placement
function freezeRuleTables(tables) {
  Object.values(tables).forEach((rules) => Object.freeze(rules));
  return Object.freeze(tables);
}
//@ chunk-4kzs0ch0.js:1845-2080 placement
function anchorRuleToRepoRoot(ruleString, repoRoot) {
  let { toolName, ruleContent } = permissionRuleValueFromString(ruleString);
  if (ruleContent === undefined || (toolName !== FILE_READ_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME))
    return [];
  let { relativePattern, root } = patternWithRootFor(ruleContent, repoRoot);
  if (root !== null) return [];
  return [
    formatPermissionRule({
      toolName,
      ruleContent: `/${escapeRuleContent(`${toPosixPath(repoRoot)}/`, {
        escapeGlobs: true,
      })}**/${relativePattern}`,
    }),
  ];
}
export { composeRepoDenyAskRules };
