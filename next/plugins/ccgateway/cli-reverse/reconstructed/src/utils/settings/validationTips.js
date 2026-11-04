/**
 * utils/settings/validationTips.ts
 *
 * 设置校验错误的修正提示与文档链接表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/validationTips.ts
 * pieces: chunk-dcmhvw5a.js (5)
 * attribution: placement 3, fingerprint 2
 */
import { firstLineOf } from "../stringUtils.js";

//@ chunk-dcmhvw5a.js:432640-432668 placement
var INTERNAL_DOC_TAG_RE = /^@internal(?:\b|$)/;
//@ chunk-dcmhvw5a.js:432668-432722 placement
function hasInternalDocTag(description) {
  return typeof description === "string" && INTERNAL_DOC_TAG_RE.test(description);
}
//@ chunk-dcmhvw5a.js:432722-433495 placement
/**
 * 收集设置校验提示。
 */
function collectValidationTips(value, includeInternal) {
  if (Array.isArray(value)) {
    for (let entry of value) collectValidationTips(entry, includeInternal);
    return;
  }
  if (value === null || typeof value !== "object") return;
  let node = value;
  if (includeInternal && hasInternalDocTag(node.description)) {
    let trimmed = node.description.replace(/^@internal\s*/, "").trim();
    if (trimmed) node.description = trimmed;
    else delete node.description;
  }
  let properties = node.properties;
  if (
    !includeInternal &&
    properties !== null &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    let propertyMap = properties;
    for (let key of Object.keys(propertyMap)) {
      let propertySchema = propertyMap[key];
      let description =
        propertySchema !== null && typeof propertySchema === "object" && !Array.isArray(propertySchema)
          ? propertySchema.description
          : undefined;
      if (hasInternalDocTag(description)) {
        delete propertyMap[key];
        if (Array.isArray(node.required))
          node.required = node.required.filter((requiredKey) => requiredKey !== key);
      }
    }
  }
  if (!includeInternal)
    for (let combinator of ["anyOf", "oneOf"]) {
      let variants = node[combinator];
      if (Array.isArray(variants)) {
        let filtered = variants.filter(
          (variant) =>
            variant === null ||
            typeof variant !== "object" ||
            Array.isArray(variant) ||
            !hasInternalDocTag(variant.description),
        );
        if (filtered.length === 0) delete node[combinator];
        else node[combinator] = filtered;
      }
    }
  for (let child of Object.values(node)) collectValidationTips(child, includeInternal);
}
//@ chunk-dcmhvw5a.js:433495-437157 fingerprint (2.1.88 match: TIP_MATCHERS, 0.876)
/**
 * SETTINGS_TIP_RULES：设置校验提示规则（同一声明共 2 个绑定）。
 */
var HTTPS_CODE_CLAUDE_COM_DOCS_EN = "https://code.claude.com/docs/en";
var SETTINGS_TIP_RULES = [
  {
    matches: (ctx) => ctx.path === "permissions.defaultMode" && ctx.code === "invalid_value",
    tip: {
      suggestion:
        'Valid modes: "acceptEdits" (ask before file changes), "plan" (analysis only), "bypassPermissions" (auto-accept all), or "default" (standard behavior)',
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#permission-modes`,
    },
  },
  {
    matches: (ctx) => ctx.path === "apiKeyHelper" && ctx.code === "invalid_type",
    tip: {
      suggestion:
        'Provide a shell command that outputs your API key to stdout. The script should output only the API key. Example: "/bin/generate_temp_api_key.sh"',
    },
  },
  {
    matches: (ctx) => ctx.path === "cleanupPeriodDays" && ctx.code === "too_small",
    tip: {
      suggestion:
        'cleanupPeriodDays must be at least 1. To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years). To disable transcript writes entirely, remove this setting and use the --no-session-persistence CLI flag or the SDK persistSession:false option instead. (0 is rejected because it previously silently disabled all transcript writes, which users setting it to mean "never clean up" did not expect.)',
    },
  },
  {
    matches: (ctx) => ctx.path.startsWith("env.") && ctx.code === "invalid_type",
    tip: {
      suggestion:
        'Environment variables must be strings. Wrap numbers and booleans in quotes. Example: "DEBUG": "true", "PORT": "3000"',
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings#environment-variables`,
    },
  },
  {
    matches: (ctx) =>
      (ctx.path === "permissions.allow" || ctx.path === "permissions.deny") &&
      ctx.code === "invalid_type" &&
      ctx.expected === "array",
    tip: {
      suggestion:
        'Permission rules must be in an array. Format: ["Tool(specifier)"]. Examples: ["Bash(npm run build)", "Edit(docs/**)", "Read(~/.zshrc)"]. Use * for wildcards.',
    },
  },
  {
    matches: (ctx) => ctx.path === "hooks" && ctx.code === "unrecognized_keys",
    tip: {
      suggestion:
        "Not a recognized hook event. Common events: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, Stop. Check spelling and capitalization.",
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks`,
    },
  },
  {
    matches: (issue) =>
      /\.hooks\.\d+\.command$/.test(issue.path) &&
      issue.code === "invalid_type" &&
      issue.received === "undefined",
    tip: {
      suggestion:
        'Command hooks require `command`. For exec form (no shell), set `command` to the executable and `args` to its arguments: {"type": "command", "command": "echo", "args": ["hi"]}. For shell form, set `command` to the full shell string: {"type": "command", "command": "echo hi"}.',
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks#exec-form-and-shell-form`,
    },
  },
  {
    matches: (issue) => issue.path.includes("hooks") && issue.code === "invalid_type",
    tip: {
      suggestion:
        'Hooks use a matcher + hooks array. The matcher is a string: a tool name ("Bash"), pipe-separated list ("Edit|Write"), or empty to match all. Example: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}',
    },
  },
  {
    matches: (ctx) => ctx.code === "invalid_type" && ctx.expected === "boolean",
    tip: {
      suggestion: 'Use true or false without quotes. Example: "includeCoAuthoredBy": true',
    },
  },
  {
    matches: (ctx) => ctx.code === "unrecognized_keys",
    tip: {
      suggestion: "Check for typos or refer to the documentation for valid fields",
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings`,
    },
  },
  {
    matches: (ctx) => ctx.code === "invalid_value" && ctx.enumValues !== undefined,
    tip: {
      suggestion: undefined,
    },
  },
  {
    matches: (ctx) =>
      ctx.code === "invalid_type" && ctx.expected === "object" && ctx.received === null && ctx.path === "",
    tip: {
      suggestion:
        "Check for missing commas, unmatched brackets, or trailing commas. Use a JSON validator to identify the exact syntax error.",
    },
  },
  {
    matches: (ctx) => ctx.path === "permissions.additionalDirectories" && ctx.code === "invalid_type",
    tip: {
      suggestion:
        'Must be an array of directory paths. Example: ["~/projects", "/tmp/workspace"]. You can also use --add-dir flag or /add-dir command',
      docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#working-directories`,
    },
  },
];
var settingsTipRules = {
  permissions: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#configuring-permissions`,
  env: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings#environment-variables`,
  hooks: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks`,
};
//@ chunk-dcmhvw5a.js:437157-437432 fingerprint (2.1.88 match: getValidationTip, 1)
function getValidationTip(context) {
  let matcher = SETTINGS_TIP_RULES.find((m) => m.matches(context));
  if (!matcher) return null;
  let tip = {
    ...matcher.tip,
  };
  if (context.code === "invalid_value" && context.enumValues && !tip.suggestion)
    tip.suggestion = `Valid values: ${context.enumValues.map((v) => `"${v}"`).join(", ")}`;
  if (!tip.docLink && context.path) tip.docLink = settingsTipRules[firstLineOf(context.path, ".")];
  return tip;
}
export { collectValidationTips, getValidationTip };
