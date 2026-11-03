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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  let composeBehavior = (u) =>
    Object.fromEntries(
      PERMISSION_RULE_SOURCES.map((m) => [
        m,
        [
          ...mergeWithStoredRules(
            storedRules[u][m] ?? [],
            m,
            u === "alwaysDenyRules" ? "deny" : "ask",
            mergeOptions,
          ),
          ...(launchRules[u][m] ?? [])
            .filter((a) => {
              if (!PATH_RULE_CARVE_OUT_RE.test(a)) return true;
              logForDebugging(
                `Ignoring the launch ${u === "alwaysDenyRules" ? "deny" : "ask"} rule "${a}" (from CLAUDE_CODE_MCP_SERVE_SETTINGS, or for ReadFileForRemote and ListDirectoryForRemote a settings file here): a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, and here those include the calling session's own rules. Spell the rule without the exception instead.`,
                {
                  level: "warn",
                },
              );
              return false;
            })
            .flatMap((a) => [a, ...anchorRuleToRepoRoot(a, repoRoot)]),
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
  let o = composedRepoRules[cacheKey];
  if (o !== undefined && En(o, composed)) return o;
  let r = {
    alwaysDenyRules: freezeRuleTables(composed.alwaysDenyRules),
    alwaysAskRules: freezeRuleTables(composed.alwaysAskRules),
  };
  composedRepoRules[cacheKey] = r;
  return r;
}
//@ chunk-4kzs0ch0.js:1603-1689 placement
function freezeRuleTables(s) {
  Object.values(s).forEach((e) => Object.freeze(e));
  return Object.freeze(s);
}
//@ chunk-4kzs0ch0.js:1845-2080 placement
function anchorRuleToRepoRoot(s, repoRoot) {
  let { toolName, ruleContent } = permissionRuleValueFromString(s);
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
