/**
 * utils/settings/permissionValidation.ts
 *
 * 权限规则 Tool(content) 的格式校验与 zod schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/permissionValidation.ts
 * pieces: chunk-dcmhvw5a.js (12)
 * attribution: placement 9, fingerprint 2, layout 1
 */
import {
  hasWildcard,
  classifyRuleParens,
  permissionRuleValueFromString,
} from "../permissions/permissionRuleParser.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { capitalize as capitalize_3 } from "../stringUtils.js";
import { isFilePatternTool, getCustomValidation, isBashPrefixTool } from "./toolValidationConfig.js";
import { formatPermissionRule } from "../permissions/disallowedToolsFlag.js";
import { permissionRuleExtractPrefix, endsWithUnescapedStar } from "../permissions/shellRuleMatching.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ZodIssueCode } from "../../../vendor/zod/v4/classic/compat.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:215644-215722 placement
function isEscapedAt(text, index) {
  let backslashes = 0;
  let j = index - 1;
  while (j >= 0 && text[j] === "\\") {
    backslashes++;
    j--;
  }
  return backslashes % 2 !== 0;
}
//@ chunk-dcmhvw5a.js:215722-215809 placement
function countUnescapedChar(str, char) {
  let count = 0;
  for (let i = 0; i < str.length; i++) if (str[i] === char && !isEscapedAt(str, i)) count++;
  return count;
}
//@ chunk-dcmhvw5a.js:215809-215836 placement
var ESCAPED_PAREN_RE = /(?:^|[^\\])\\[()]/;
//@ chunk-dcmhvw5a.js:215836-215892 placement
function hasUnbalancedParens(rawContent) {
  return (
    ESCAPED_PAREN_RE.test(rawContent) &&
    countUnescapedChar(rawContent, "(") !== countUnescapedChar(rawContent, ")")
  );
}
//@ chunk-dcmhvw5a.js:215892-215922 placement
var LEADING_SHELL_OPERATOR_RE = /^(?:[|&;<>]|\d+[<>])/;
//@ chunk-dcmhvw5a.js:215922-215955 placement
function hasLeadingShellOperator(text) {
  return LEADING_SHELL_OPERATOR_RE.test(text);
}
//@ chunk-dcmhvw5a.js:215955-216039 placement
function hasUnescapedEmptyParens(str) {
  for (let i = 0; i < str.length; i++) if (str[i] === "*" && !isEscapedAt(str, i)) return true;
  return false;
}
//@ chunk-dcmhvw5a.js:216039-216301 placement
function emptyParensCommandName(content) {
  if (content.endsWith(":*")) return;
  let filtered = content.trim().split(/\s+/).filter(Boolean);
  let words = filtered[0];
  if (filtered.length < 3 || words === undefined || hasUnescapedEmptyParens(words)) return;
  let sawEmpty = false;
  for (let word of filtered.slice(1)) {
    if (hasLeadingShellOperator(word)) return;
    if (hasUnescapedEmptyParens(word)) {
      sawEmpty = true;
      continue;
    }
    if (word.startsWith("-")) continue;
    return sawEmpty ? words : undefined;
  }
  return;
}
//@ chunk-dcmhvw5a.js:216301-216720 placement
/**
 * 校验工具名中的通配符。
 */
function validateWildcardToolName(toolName) {
  if (!hasWildcard(toolName)) return null;
  let mcpInfo = mcpInfoFromString(toolName);
  if (mcpInfo && !hasWildcard(mcpInfo.serverName)) return null;
  return {
    valid: false,
    error: `Wildcard tool name "${toolName}" is not supported in allow rules`,
    suggestion:
      "An allow pattern must name the scope it widens \u2014 globs are permitted only in the tool position after a literal mcp__<server>__ prefix. Deny and ask rules accept wildcards anywhere",
    examples: ["mcp__puppeteer__*", "mcp__github__get_*"],
  };
}
//@ chunk-dcmhvw5a.js:216720-221819 fingerprint = validatePermissionRule (0.5)
/**
 * 校验单条权限规则 Tool 或 Tool(content) 的格式，按工具类型检查内容（文件模式、Bash 前缀等）。
 */
function validatePermissionRule(rule, mode) {
  if (!rule || rule.trim() === "")
    return {
      valid: false,
      error: "Permission rule cannot be empty",
    };
  let parsed = classifyRuleParens(rule);
  if (parsed.kind === "malformed")
    return {
      valid: false,
      error: "Malformed Tool(content) rule",
      suggestion:
        'Rules take the form Tool or Tool(content) and must end at the closing ")"; parentheses inside the content are literal',
    };
  if (parsed.kind === "call" && parsed.rawContent === "") {
    if (!parsed.toolName)
      return {
        valid: false,
        error: "Empty parentheses with no tool name",
        suggestion: "Specify a tool name before the parentheses",
      };
    return {
      valid: false,
      error: "Empty parentheses",
      suggestion: `Either specify a pattern or use just "${parsed.toolName}" without parentheses`,
      examples: [`${parsed.toolName}`, `${parsed.toolName}(some-pattern)`],
    };
  }
  let ruleValue = permissionRuleValueFromString(rule);
  let mcpInfo = mcpInfoFromString(ruleValue.toolName);
  if (mcpInfo) {
    if (parsed.kind === "call") {
      let suggestion =
        mcpInfo.toolName && !hasWildcard(mcpInfo.toolName) ? `${ruleValue.toolName}__*` : undefined;
      return {
        valid: false,
        error: "MCP rules do not support patterns in parentheses",
        suggestion:
          suggestion === undefined
            ? `Use "${ruleValue.toolName}" without parentheses, or use "mcp__${mcpInfo.serverName}__*" for all tools`
            : `Use "${ruleValue.toolName}" without parentheses. For all tools of a server, use "mcp__${mcpInfo.serverName}__*" for the server "${mcpInfo.serverName}", or "${suggestion}" for a server named "${mcpInfo.serverName}__${mcpInfo.toolName}"`,
        examples: [
          `mcp__${mcpInfo.serverName}`,
          `mcp__${mcpInfo.serverName}__*`,
          mcpInfo.toolName && mcpInfo.toolName !== "*"
            ? `mcp__${mcpInfo.serverName}__${mcpInfo.toolName}`
            : undefined,
          suggestion,
        ].filter(Boolean),
      };
    }
    if (mode === "allow") {
      let result = validateWildcardToolName(ruleValue.toolName);
      if (result) return result;
    }
    return {
      valid: true,
    };
  }
  if (!ruleValue.toolName || ruleValue.toolName.length === 0)
    return {
      valid: false,
      error: "Tool name cannot be empty",
    };
  if (mode === "allow") {
    let parsed = validateWildcardToolName(ruleValue.toolName);
    if (parsed) return parsed;
  }
  if (!ruleValue.toolName.includes("_") && ruleValue.toolName[0] !== ruleValue.toolName[0]?.toUpperCase())
    return {
      valid: false,
      error: "Tool names must start with uppercase",
      suggestion: `Use "${capitalize_3(String(ruleValue.toolName))}"`,
    };
  if (parsed.kind === "call" && hasUnbalancedParens(parsed.rawContent)) {
    let mcpInfo = isFilePatternTool(ruleValue.toolName);
    return {
      valid: false,
      error: 'Ambiguous "\\(" or "\\)" beside an unescaped parenthesis',
      suggestion: mcpInfo
        ? "Write a Windows path with forward slashes, or spell a literal parenthesis as [(] or [)]"
        : 'Double a backslash that is a path separator ("\\\\("), and escape literal parentheses in pairs',
      examples: mcpInfo
        ? [
            `${ruleValue.toolName}(C:/Projects/(drafts)/**)`,
            `${ruleValue.toolName}(C:\\Projects\\[(]drafts)\\**)`,
          ]
        : [`${ruleValue.toolName}(C:\\tools\\\\(x86)\\run.exe *)`],
    };
  }
  let customValidation = getCustomValidation(ruleValue.toolName);
  if (customValidation && ruleValue.ruleContent !== undefined) {
    let customResult = customValidation(ruleValue.ruleContent);
    if (!customResult.valid) return customResult;
  }
  if (isBashPrefixTool(ruleValue.toolName) && ruleValue.ruleContent !== undefined) {
    let content = ruleValue.ruleContent;
    if (content === ":*")
      return {
        valid: false,
        error: "Prefix cannot be empty before :*",
        suggestion: "Specify a command prefix before :*",
        examples: ["Bash(npm *)", "Bash(git *)"],
      };
    if (mode === "allow") {
      let name = emptyParensCommandName(content);
      if (name !== undefined) {
        let isGit = name === "git";
        let gitNote = isGit ? " For git, options such as -c and --exec-path can run arbitrary commands." : "";
        let example = isGit ? " (for example Bash(git status *))" : "";
        return {
          valid: true,
          warning: `${formatPermissionRule(ruleValue)} has a wildcard before the rest of the command, so it also matches any options inserted at that position and approves them without a prompt.${gitNote} Replace that * with the exact value you mean, or only use * after the subcommand${example}.`,
          securityNotice: `${formatPermissionRule(ruleValue)} allows any option at its * \xB7 use an exact value`,
        };
      }
    }
    let prefix = permissionRuleExtractPrefix(content)?.trimEnd();
    if (prefix !== undefined) {
      if (hasUnescapedEmptyParens(prefix)) {
        let hasStar = endsWithUnescapedStar(prefix);
        let consequence = hasStar
          ? "matches only commands containing a literal * at that position"
          : "will likely never match";
        let fixed = hasStar ? prefix : `${prefix}*`;
        let advice =
          mode === "allow"
            ? " Replace that * with the exact value you mean."
            : fixed.endsWith(":*")
              ? ""
              : ` Use ${formatPermissionRule({
                  toolName: ruleValue.toolName,
                  ruleContent: fixed,
                })} for wildcard matching.`;
        return {
          valid: true,
          warning: `${formatPermissionRule(ruleValue)} mixes * with the trailing :* prefix syntax, so it is matched as a literal prefix (the * is not expanded) and ${consequence}.${advice}`,
          ...(mode !== "allow" && {
            securityNotice: `${formatPermissionRule(ruleValue)} reads its * literally${
              fixed.endsWith(":*")
                ? ""
                : ` \xB7 use ${formatPermissionRule({
                    toolName: ruleValue.toolName,
                    ruleContent: fixed,
                  })}`
            }`,
          }),
        };
      }
    } else if (content.includes(":*") && !content.endsWith(":*")) {
      let advice =
        mode === "allow"
          ? "Replace that :* with the exact value you mean."
          : "It already matches as a * wildcard; moving :* to the end would make it a literal prefix and change which commands match.";
      return {
        valid: true,
        warning: `${formatPermissionRule(ruleValue)} has a :* that is not at the end, so it is matched as a * wildcard (the : is literal), not as the trailing :* prefix syntax. ${advice}`,
        ...(mode === "allow" && {
          securityNotice: `${formatPermissionRule(ruleValue)} reads its :* as a wildcard \xB7 use an exact value`,
        }),
      };
    }
  }
  if (isFilePatternTool(ruleValue.toolName) && ruleValue.ruleContent !== undefined) {
    if (ruleValue.ruleContent.includes(":*"))
      return {
        valid: false,
        error: 'The ":*" syntax is only for Bash prefix rules',
        suggestion: 'Use glob patterns like "*" or "**" for file matching',
        examples: [
          `${ruleValue.toolName}(*.ts) - matches .ts files`,
          `${ruleValue.toolName}(src/**) - matches all files in src`,
          `${ruleValue.toolName}(**/*.test.ts) - matches test files`,
        ],
      };
  }
  if (ruleValue.ruleContent !== undefined) {
    let expectedTool =
      ruleValue.toolName === "Write" ||
      ruleValue.toolName === "NotebookEdit" ||
      ruleValue.toolName === "MultiEdit"
        ? "Edit"
        : ruleValue.toolName === "Glob"
          ? "Read"
          : undefined;
    if (expectedTool !== undefined && !ruleValue.ruleContent.includes(":*"))
      return {
        valid: true,
        warning: `${formatPermissionRule(ruleValue)} is not matched by file permission checks \u2014 only ${expectedTool}(path) rules are. Use ${formatPermissionRule(
          {
            toolName: expectedTool,
            ruleContent: ruleValue.ruleContent,
          },
        )} instead (${expectedTool} rules cover all file-${expectedTool === "Edit" ? "editing" : "reading"} tools).`,
        ...(mode !== "allow" && {
          securityNotice: `${formatPermissionRule(ruleValue)} never matches \xB7 use ${formatPermissionRule({
            toolName: expectedTool,
            ruleContent: ruleValue.ruleContent,
          })}`,
        }),
      };
  }
  return {
    valid: true,
  };
}
//@ chunk-dcmhvw5a.js:221819-221860 layout
/**
 * permissionRuleSchema：权限规则 schema；allowPermissionRuleSchema：allow 类权限规则 schema（同一声明共 2 个绑定）。
 */
var permissionRuleSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var allowPermissionRuleSchema;
deferInit("chunk-dcmhvw5a.js:221819", () => {
  permissionRuleSchema = DoctorLazy(() => PermissionRuleSchema());
  allowPermissionRuleSchema = DoctorLazy(() => PermissionRuleSchema("allow"));
});
//@ chunk-dcmhvw5a.js:221860-222126 fingerprint = PermissionRuleSchema (0.903)
function PermissionRuleSchema(mode) {
  return stringSchema().superRefine((val, ctx) => {
    let result = validatePermissionRule(val, mode);
    if (!result.valid) {
      let message = result.error;
      if (result.suggestion) message += `. ${result.suggestion}`;
      if (result.examples && result.examples.length > 0)
        message += `. Examples: ${result.examples.join(", ")}`;
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message,
        params: {
          received: val,
        },
      });
    }
  });
}
export { validateWildcardToolName, validatePermissionRule, allowPermissionRuleSchema, permissionRuleSchema };
