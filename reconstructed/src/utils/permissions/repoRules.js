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

/**
 * 组合仓库级 deny/ask 规则：每个来源先并入存储规则，再加启动规则（忽略以 ! 开头的例外规则并告警），读写规则额外生成锚定到仓库根的版本；有缓存键时走会话缓存。
 */
//@ chunk-4kzs0ch0.js:684-1422 placement
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
                if (!PATH_RULE_CARVE_OUT_RE.test(a)) return !0;
                return (
                  logForDebugging(
                    `Ignoring the launch ${u === "alwaysDenyRules" ? "deny" : "ask"} rule "${a}" (from CLAUDE_CODE_MCP_SERVE_SETTINGS, or for ReadFileForRemote and ListDirectoryForRemote a settings file here): a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, and here those include the calling session's own rules. Spell the rule without the exception instead.`,
                    { level: "warn" },
                  ),
                  !1
                );
              })
              .flatMap((a) => [a, ...anchorRuleToRepoRoot(a, repoRoot)]),
          ],
        ]),
      ),
    composed = {
      alwaysDenyRules: composeBehavior("alwaysDenyRules"),
      alwaysAskRules: composeBehavior("alwaysAskRules"),
    };
  return mergeOptions === void 0 ? composed : getCachedComposedRepoRules(composed, cacheKey);
}
//@ chunk-4kzs0ch0.js:1422-1603 placement
function getCachedComposedRepoRules(s, e) {
  let { composedRepoRules: composedRepoRules } = getSessionPathsCache(),
    o = composedRepoRules[e];
  if (o !== void 0 && En(o, s)) return o;
  let r = { alwaysDenyRules: R(s.alwaysDenyRules), alwaysAskRules: R(s.alwaysAskRules) };
  return ((composedRepoRules[e] = r), r);
}
//@ chunk-4kzs0ch0.js:1603-1689 placement
function R(s) {
  return (Object.values(s).forEach((e) => Object.freeze(e)), Object.freeze(s));
}
//@ chunk-4kzs0ch0.js:1845-2080 placement
function anchorRuleToRepoRoot(s, e) {
  let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(s);
  if (ruleContent === void 0 || (toolName !== FILE_READ_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME))
    return [];
  let { relativePattern: relativePattern, root: root } = patternWithRootFor(ruleContent, e);
  if (root !== null) return [];
  return [
    formatPermissionRule({
      toolName: toolName,
      ruleContent: `/${escapeRuleContent(`${toPosixPath(e)}/`, { escapeGlobs: !0 })}**/${relativePattern}`,
    }),
  ];
}

export { composeRepoDenyAskRules };
