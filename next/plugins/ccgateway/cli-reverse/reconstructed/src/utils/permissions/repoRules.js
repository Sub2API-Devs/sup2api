/**
 * utils/permissions/repoRules.ts
 *
 * 2.1.316 新增：组合仓库的 deny/ask 权限规则（含启动规则过滤），供远程/服务端读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ejn7s5p2.js (5)
 * attribution: placement 4, layout 1
 */
import { PERMISSION_RULE_SOURCES } from "./permissions.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { logForDebugging } from "../debug.js";
import { getSessionPathsCache } from "../sessionPathsCache.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { parseRuleString, permissionRuleValueFromString, escapeRuleContent } from "./permissionRuleParser.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { patternWithRootFor, toPosixPath } from "./filesystem.js";

//@ chunk-ejn7s5p2.js:684-1422 placement
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
//@ chunk-ejn7s5p2.js:1422-1603 placement
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
//@ chunk-ejn7s5p2.js:1603-1689 placement
function freezeRuleTables(tables) {
  Object.values(tables).forEach((rules) => Object.freeze(rules));
  return Object.freeze(tables);
}
//@ chunk-ejn7s5p2.js:1689-1845 layout (2.1.88 match: supportsPersistence, 1)
/**
 * 与磁盘已存规则合并：目的地为 user/project/local 设置时，把已存规则放前、再加上新规则中非特殊形式的项。
 */
function mergeWithStoredRules(rules, destination, behavior, mergeOptions) {
  if (
    mergeOptions === undefined ||
    (destination !== "userSettings" && destination !== "projectSettings" && destination !== "localSettings")
  )
    return rules;
  return [
    ...mergeOptions[destination][behavior],
    ...rules.filter((ruleString) => !PATH_RULE_CARVE_OUT_RE.test(ruleString)),
  ];
}
//@ chunk-ejn7s5p2.js:1845-2080 placement
function anchorRuleToRepoRoot(ruleString, repoRoot) {
  let { toolName, ruleContent } = parseRuleString(ruleString);
  if (ruleContent === undefined || (toolName !== READ && toolName !== EDIT)) return [];
  let { relativePattern, root } = patternWithRootFor(ruleContent, repoRoot);
  if (root !== null) return [];
  return [
    permissionRuleValueFromString({
      toolName,
      ruleContent: `/${escapeRuleContent(`${toPosixPath(repoRoot)}/`, {
        escapeGlobs: true,
      })}**/${relativePattern}`,
    }),
  ];
}
export { composeRepoDenyAskRules };
