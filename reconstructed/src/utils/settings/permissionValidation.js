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
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { ZodIssueCode } from "../../../vendor/zod/v4/classic/compat.js";

//@ chunk-dcmhvw5a.js:215644-215722 placement
function isEscapedAt(e, n) {
  let r = 0;
  let s = n - 1;
  while (s >= 0 && e[s] === "\\") {
    r++;
    s--;
  }
  return r % 2 !== 0;
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
function hasLeadingShellOperator(e) {
  return LEADING_SHELL_OPERATOR_RE.test(e);
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
  let r = filtered[0];
  if (filtered.length < 3 || r === undefined || hasUnescapedEmptyParens(r)) return;
  let s = false;
  for (let a of filtered.slice(1)) {
    if (hasLeadingShellOperator(a)) return;
    if (hasUnescapedEmptyParens(a)) {
      s = true;
      continue;
    }
    if (a.startsWith("-")) continue;
    return s ? r : undefined;
  }
  return;
}
//@ chunk-dcmhvw5a.js:216301-216720 placement
/**
 * 校验工具名中的通配符。
 */
function validateWildcardToolName(toolName) {
  if (!hasWildcard(toolName)) return null;
  let n = mcpInfoFromString(toolName);
  if (n && !hasWildcard(n.serverName)) return null;
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
function validatePermissionRule(rule, n) {
  if (!rule || rule.trim() === "")
    return {
      valid: false,
      error: "Permission rule cannot be empty",
    };
  let r = classifyRuleParens(rule);
  if (r.kind === "malformed")
    return {
      valid: false,
      error: "Malformed Tool(content) rule",
      suggestion:
        'Rules take the form Tool or Tool(content) and must end at the closing ")"; parentheses inside the content are literal',
    };
  if (r.kind === "call" && r.rawContent === "") {
    if (!r.toolName)
      return {
        valid: false,
        error: "Empty parentheses with no tool name",
        suggestion: "Specify a tool name before the parentheses",
      };
    return {
      valid: false,
      error: "Empty parentheses",
      suggestion: `Either specify a pattern or use just "${r.toolName}" without parentheses`,
      examples: [`${r.toolName}`, `${r.toolName}(some-pattern)`],
    };
  }
  let s = permissionRuleValueFromString(rule);
  let mcpInfo = mcpInfoFromString(s.toolName);
  if (mcpInfo) {
    if (r.kind === "call") {
      let g = mcpInfo.toolName && !hasWildcard(mcpInfo.toolName) ? `${s.toolName}__*` : undefined;
      return {
        valid: false,
        error: "MCP rules do not support patterns in parentheses",
        suggestion:
          g === undefined
            ? `Use "${s.toolName}" without parentheses, or use "mcp__${mcpInfo.serverName}__*" for all tools`
            : `Use "${s.toolName}" without parentheses. For all tools of a server, use "mcp__${mcpInfo.serverName}__*" for the server "${mcpInfo.serverName}", or "${g}" for a server named "${mcpInfo.serverName}__${mcpInfo.toolName}"`,
        examples: [
          `mcp__${mcpInfo.serverName}`,
          `mcp__${mcpInfo.serverName}__*`,
          mcpInfo.toolName && mcpInfo.toolName !== "*"
            ? `mcp__${mcpInfo.serverName}__${mcpInfo.toolName}`
            : undefined,
          g,
        ].filter(Boolean),
      };
    }
    if (n === "allow") {
      let g = validateWildcardToolName(s.toolName);
      if (g) return g;
    }
    return {
      valid: true,
    };
  }
  if (!s.toolName || s.toolName.length === 0)
    return {
      valid: false,
      error: "Tool name cannot be empty",
    };
  if (n === "allow") {
    let parsed = validateWildcardToolName(s.toolName);
    if (parsed) return parsed;
  }
  if (!s.toolName.includes("_") && s.toolName[0] !== s.toolName[0]?.toUpperCase())
    return {
      valid: false,
      error: "Tool names must start with uppercase",
      suggestion: `Use "${capitalize_3(String(s.toolName))}"`,
    };
  if (r.kind === "call" && hasUnbalancedParens(r.rawContent)) {
    let mcpInfo = isFilePatternTool(s.toolName);
    return {
      valid: false,
      error: 'Ambiguous "\\(" or "\\)" beside an unescaped parenthesis',
      suggestion: mcpInfo
        ? "Write a Windows path with forward slashes, or spell a literal parenthesis as [(] or [)]"
        : 'Double a backslash that is a path separator ("\\\\("), and escape literal parentheses in pairs',
      examples: mcpInfo
        ? [`${s.toolName}(C:/Projects/(drafts)/**)`, `${s.toolName}(C:\\Projects\\[(]drafts)\\**)`]
        : [`${s.toolName}(C:\\tools\\\\(x86)\\run.exe *)`],
    };
  }
  let customValidation = getCustomValidation(s.toolName);
  if (customValidation && s.ruleContent !== undefined) {
    let customResult = customValidation(s.ruleContent);
    if (!customResult.valid) return customResult;
  }
  if (isBashPrefixTool(s.toolName) && s.ruleContent !== undefined) {
    let content = s.ruleContent;
    if (content === ":*")
      return {
        valid: false,
        error: "Prefix cannot be empty before :*",
        suggestion: "Specify a command prefix before :*",
        examples: ["Bash(npm *)", "Bash(git *)"],
      };
    if (n === "allow") {
      let f = emptyParensCommandName(content);
      if (f !== undefined) {
        let h = f === "git";
        let y = h ? " For git, options such as -c and --exec-path can run arbitrary commands." : "";
        let b = h ? " (for example Bash(git status *))" : "";
        return {
          valid: true,
          warning: `${formatPermissionRule(s)} has a wildcard before the rest of the command, so it also matches any options inserted at that position and approves them without a prompt.${y} Replace that * with the exact value you mean, or only use * after the subcommand${b}.`,
          securityNotice: `${formatPermissionRule(s)} allows any option at its * \xB7 use an exact value`,
        };
      }
    }
    let m = permissionRuleExtractPrefix(content)?.trimEnd();
    if (m !== undefined) {
      if (hasUnescapedEmptyParens(m)) {
        let f = endsWithUnescapedStar(m);
        let h = f
          ? "matches only commands containing a literal * at that position"
          : "will likely never match";
        let y = f ? m : `${m}*`;
        let b =
          n === "allow"
            ? " Replace that * with the exact value you mean."
            : y.endsWith(":*")
              ? ""
              : ` Use ${formatPermissionRule({
                  toolName: s.toolName,
                  ruleContent: y,
                })} for wildcard matching.`;
        return {
          valid: true,
          warning: `${formatPermissionRule(s)} mixes * with the trailing :* prefix syntax, so it is matched as a literal prefix (the * is not expanded) and ${h}.${b}`,
          ...(n !== "allow" && {
            securityNotice: `${formatPermissionRule(s)} reads its * literally${
              y.endsWith(":*")
                ? ""
                : ` \xB7 use ${formatPermissionRule({
                    toolName: s.toolName,
                    ruleContent: y,
                  })}`
            }`,
          }),
        };
      }
    } else if (content.includes(":*") && !content.endsWith(":*")) {
      let f =
        n === "allow"
          ? "Replace that :* with the exact value you mean."
          : "It already matches as a * wildcard; moving :* to the end would make it a literal prefix and change which commands match.";
      return {
        valid: true,
        warning: `${formatPermissionRule(s)} has a :* that is not at the end, so it is matched as a * wildcard (the : is literal), not as the trailing :* prefix syntax. ${f}`,
        ...(n === "allow" && {
          securityNotice: `${formatPermissionRule(s)} reads its :* as a wildcard \xB7 use an exact value`,
        }),
      };
    }
  }
  if (isFilePatternTool(s.toolName) && s.ruleContent !== undefined) {
    if (s.ruleContent.includes(":*"))
      return {
        valid: false,
        error: 'The ":*" syntax is only for Bash prefix rules',
        suggestion: 'Use glob patterns like "*" or "**" for file matching',
        examples: [
          `${s.toolName}(*.ts) - matches .ts files`,
          `${s.toolName}(src/**) - matches all files in src`,
          `${s.toolName}(**/*.test.ts) - matches test files`,
        ],
      };
  }
  if (s.ruleContent !== undefined) {
    let g =
      s.toolName === "Write" || s.toolName === "NotebookEdit" || s.toolName === "MultiEdit"
        ? "Edit"
        : s.toolName === "Glob"
          ? "Read"
          : undefined;
    if (g !== undefined && !s.ruleContent.includes(":*"))
      return {
        valid: true,
        warning: `${formatPermissionRule(s)} is not matched by file permission checks \u2014 only ${g}(path) rules are. Use ${formatPermissionRule(
          {
            toolName: g,
            ruleContent: s.ruleContent,
          },
        )} instead (${g} rules cover all file-${g === "Edit" ? "editing" : "reading"} tools).`,
        ...(n !== "allow" && {
          securityNotice: `${formatPermissionRule(s)} never matches \xB7 use ${formatPermissionRule({
            toolName: g,
            ruleContent: s.ruleContent,
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
var permissionRuleSchema = DoctorLazy(() => PermissionRuleSchema());
var allowPermissionRuleSchema = DoctorLazy(() => PermissionRuleSchema("allow"));
//@ chunk-dcmhvw5a.js:221860-222126 fingerprint = PermissionRuleSchema (0.903)
function PermissionRuleSchema(e) {
  return string().superRefine((val, ctx) => {
    let result = validatePermissionRule(val, e);
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
