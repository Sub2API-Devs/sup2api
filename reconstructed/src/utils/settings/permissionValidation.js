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
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { I8 } from "../../../vendor/zod/v4/classic/compat.js";

//@ chunk-dcmhvw5a.js:215644-215722 placement
function hc(e, n) {
  let r = 0,
    s = n - 1;
  while (s >= 0 && e[s] === "\\") (r++, s--);
  return r % 2 !== 0;
}
//@ chunk-dcmhvw5a.js:215722-215809 placement
function countUnescapedChar(str, char) {
  let r = 0;
  for (let s = 0; s < str.length; s++) if (str[s] === char && !hc(str, s)) r++;
  return r;
}
//@ chunk-dcmhvw5a.js:215809-215836 placement
var Zb = /(?:^|[^\\])\\[()]/;
//@ chunk-dcmhvw5a.js:215836-215892 placement
function Qb(e) {
  return Zb.test(e) && countUnescapedChar(e, "(") !== countUnescapedChar(e, ")");
}
//@ chunk-dcmhvw5a.js:215892-215922 placement
var eE = /^(?:[|&;<>]|\d+[<>])/;
//@ chunk-dcmhvw5a.js:215922-215955 placement
function tE(e) {
  return eE.test(e);
}
//@ chunk-dcmhvw5a.js:215955-216039 placement
function hasUnescapedEmptyParens(str) {
  for (let n = 0; n < str.length; n++) if (str[n] === "*" && !hc(str, n)) return !0;
  return !1;
}
//@ chunk-dcmhvw5a.js:216039-216301 placement
function emptyParensCommandName(e) {
  if (e.endsWith(":*")) return;
  let filtered = e.trim().split(/\s+/).filter(Boolean),
    r = filtered[0];
  if (filtered.length < 3 || r === void 0 || hasUnescapedEmptyParens(r)) return;
  let s = !1;
  for (let a of filtered.slice(1)) {
    if (tE(a)) return;
    if (hasUnescapedEmptyParens(a)) {
      s = !0;
      continue;
    }
    if (a.startsWith("-")) continue;
    return s ? r : void 0;
  }
  return;
}
/**
 * 校验工具名中的通配符。
 */
//@ chunk-dcmhvw5a.js:216301-216720 placement
function validateWildcardToolName(e) {
  if (!hasWildcard(e)) return null;
  let n = mcpInfoFromString(e);
  if (n && !hasWildcard(n.serverName)) return null;
  return {
    valid: !1,
    error: `Wildcard tool name "${e}" is not supported in allow rules`,
    suggestion:
      "An allow pattern must name the scope it widens \u2014 globs are permitted only in the tool position after a literal mcp__<server>__ prefix. Deny and ask rules accept wildcards anywhere",
    examples: ["mcp__puppeteer__*", "mcp__github__get_*"],
  };
}
/**
 * 校验单条权限规则 Tool 或 Tool(content) 的格式，按工具类型检查内容（文件模式、Bash 前缀等）。
 */
//@ chunk-dcmhvw5a.js:216720-221819 fingerprint = validatePermissionRule (0.5)
function validatePermissionRule(e, n) {
  if (!e || e.trim() === "") return { valid: !1, error: "Permission rule cannot be empty" };
  let r = classifyRuleParens(e);
  if (r.kind === "malformed")
    return {
      valid: !1,
      error: "Malformed Tool(content) rule",
      suggestion:
        'Rules take the form Tool or Tool(content) and must end at the closing ")"; parentheses inside the content are literal',
    };
  if (r.kind === "call" && r.rawContent === "") {
    if (!r.toolName)
      return {
        valid: !1,
        error: "Empty parentheses with no tool name",
        suggestion: "Specify a tool name before the parentheses",
      };
    return {
      valid: !1,
      error: "Empty parentheses",
      suggestion: `Either specify a pattern or use just "${r.toolName}" without parentheses`,
      examples: [`${r.toolName}`, `${r.toolName}(some-pattern)`],
    };
  }
  let s = permissionRuleValueFromString(e),
    a = mcpInfoFromString(s.toolName);
  if (a) {
    if (r.kind === "call") {
      let g = a.toolName && !hasWildcard(a.toolName) ? `${s.toolName}__*` : void 0;
      return {
        valid: !1,
        error: "MCP rules do not support patterns in parentheses",
        suggestion:
          g === void 0
            ? `Use "${s.toolName}" without parentheses, or use "mcp__${a.serverName}__*" for all tools`
            : `Use "${s.toolName}" without parentheses. For all tools of a server, use "mcp__${a.serverName}__*" for the server "${a.serverName}", or "${g}" for a server named "${a.serverName}__${a.toolName}"`,
        examples: [
          `mcp__${a.serverName}`,
          `mcp__${a.serverName}__*`,
          a.toolName && a.toolName !== "*" ? `mcp__${a.serverName}__${a.toolName}` : void 0,
          g,
        ].filter(Boolean),
      };
    }
    if (n === "allow") {
      let g = validateWildcardToolName(s.toolName);
      if (g) return g;
    }
    return { valid: !0 };
  }
  if (!s.toolName || s.toolName.length === 0) return { valid: !1, error: "Tool name cannot be empty" };
  if (n === "allow") {
    let parsed = validateWildcardToolName(s.toolName);
    if (parsed) return parsed;
  }
  if (!s.toolName.includes("_") && s.toolName[0] !== s.toolName[0]?.toUpperCase())
    return {
      valid: !1,
      error: "Tool names must start with uppercase",
      suggestion: `Use "${capitalize_3(String(s.toolName))}"`,
    };
  if (r.kind === "call" && Qb(r.rawContent)) {
    let mcpInfo = isFilePatternTool(s.toolName);
    return {
      valid: !1,
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
  if (customValidation && s.ruleContent !== void 0) {
    let customResult = customValidation(s.ruleContent);
    if (!customResult.valid) return customResult;
  }
  if (isBashPrefixTool(s.toolName) && s.ruleContent !== void 0) {
    let content = s.ruleContent;
    if (content === ":*")
      return {
        valid: !1,
        error: "Prefix cannot be empty before :*",
        suggestion: "Specify a command prefix before :*",
        examples: ["Bash(npm *)", "Bash(git *)"],
      };
    if (n === "allow") {
      let f = emptyParensCommandName(content);
      if (f !== void 0) {
        let h = f === "git",
          y = h ? " For git, options such as -c and --exec-path can run arbitrary commands." : "",
          b = h ? " (for example Bash(git status *))" : "";
        return {
          valid: !0,
          warning: `${formatPermissionRule(s)} has a wildcard before the rest of the command, so it also matches any options inserted at that position and approves them without a prompt.${y} Replace that * with the exact value you mean, or only use * after the subcommand${b}.`,
          securityNotice: `${formatPermissionRule(s)} allows any option at its * \xB7 use an exact value`,
        };
      }
    }
    let m = permissionRuleExtractPrefix(content)?.trimEnd();
    if (m !== void 0) {
      if (hasUnescapedEmptyParens(m)) {
        let f = endsWithUnescapedStar(m),
          h = f ? "matches only commands containing a literal * at that position" : "will likely never match",
          y = f ? m : `${m}*`,
          b =
            n === "allow"
              ? " Replace that * with the exact value you mean."
              : y.endsWith(":*")
                ? ""
                : ` Use ${formatPermissionRule({ toolName: s.toolName, ruleContent: y })} for wildcard matching.`;
        return {
          valid: !0,
          warning: `${formatPermissionRule(s)} mixes * with the trailing :* prefix syntax, so it is matched as a literal prefix (the * is not expanded) and ${h}.${b}`,
          ...(n !== "allow" && {
            securityNotice: `${formatPermissionRule(s)} reads its * literally${y.endsWith(":*") ? "" : ` \xB7 use ${formatPermissionRule({ toolName: s.toolName, ruleContent: y })}`}`,
          }),
        };
      }
    } else if (content.includes(":*") && !content.endsWith(":*")) {
      let f =
        n === "allow"
          ? "Replace that :* with the exact value you mean."
          : "It already matches as a * wildcard; moving :* to the end would make it a literal prefix and change which commands match.";
      return {
        valid: !0,
        warning: `${formatPermissionRule(s)} has a :* that is not at the end, so it is matched as a * wildcard (the : is literal), not as the trailing :* prefix syntax. ${f}`,
        ...(n === "allow" && {
          securityNotice: `${formatPermissionRule(s)} reads its :* as a wildcard \xB7 use an exact value`,
        }),
      };
    }
  }
  if (isFilePatternTool(s.toolName) && s.ruleContent !== void 0) {
    if (s.ruleContent.includes(":*"))
      return {
        valid: !1,
        error: 'The ":*" syntax is only for Bash prefix rules',
        suggestion: 'Use glob patterns like "*" or "**" for file matching',
        examples: [
          `${s.toolName}(*.ts) - matches .ts files`,
          `${s.toolName}(src/**) - matches all files in src`,
          `${s.toolName}(**/*.test.ts) - matches test files`,
        ],
      };
  }
  if (s.ruleContent !== void 0) {
    let g =
      s.toolName === "Write" || s.toolName === "NotebookEdit" || s.toolName === "MultiEdit"
        ? "Edit"
        : s.toolName === "Glob"
          ? "Read"
          : void 0;
    if (g !== void 0 && !s.ruleContent.includes(":*"))
      return {
        valid: !0,
        warning: `${formatPermissionRule(s)} is not matched by file permission checks \u2014 only ${g}(path) rules are. Use ${formatPermissionRule({ toolName: g, ruleContent: s.ruleContent })} instead (${g} rules cover all file-${g === "Edit" ? "editing" : "reading"} tools).`,
        ...(n !== "allow" && {
          securityNotice: `${formatPermissionRule(s)} never matches \xB7 use ${formatPermissionRule({ toolName: g, ruleContent: s.ruleContent })}`,
        }),
      };
  }
  return { valid: !0 };
}
//@ chunk-dcmhvw5a.js:221819-221860 layout
var rs = DoctorLazy(() => PermissionRuleSchema()),
  Sc = DoctorLazy(() => PermissionRuleSchema("allow"));
//@ chunk-dcmhvw5a.js:221860-222126 fingerprint = PermissionRuleSchema (0.903)
function PermissionRuleSchema(e) {
  return o().superRefine((val, ctx) => {
    let s = validatePermissionRule(val, e);
    if (!s.valid) {
      let message = s.error;
      if (s.suggestion) message += `. ${s.suggestion}`;
      if (s.examples && s.examples.length > 0) message += `. Examples: ${s.examples.join(", ")}`;
      ctx.addIssue({ code: I8.custom, message: message, params: { received: val } });
    }
  });
}

export { validateWildcardToolName, validatePermissionRule, Sc, rs };
