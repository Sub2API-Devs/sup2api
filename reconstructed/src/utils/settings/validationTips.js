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
var Tw = /^@internal(?:\b|$)/;
//@ chunk-dcmhvw5a.js:432668-432722 placement
function Bs(e) {
  return typeof e === "string" && Tw.test(e);
}
/**
 * 收集设置校验提示。
 */
//@ chunk-dcmhvw5a.js:432722-433495 placement
function collectValidationTips(e, n) {
  if (Array.isArray(e)) {
    for (let a of e) collectValidationTips(a, n);
    return;
  }
  if (e === null || typeof e !== "object") return;
  let r = e;
  if (n && Bs(r.description)) {
    let trimmed = r.description.replace(/^@internal\s*/, "").trim();
    if (trimmed) r.description = trimmed;
    else delete r.description;
  }
  let properties = r.properties;
  if (!n && properties !== null && typeof properties === "object" && !Array.isArray(properties)) {
    let a = properties;
    for (let c of Object.keys(a)) {
      let g = a[c],
        m = g !== null && typeof g === "object" && !Array.isArray(g) ? g.description : void 0;
      if (Bs(m)) {
        if ((delete a[c], Array.isArray(r.required))) r.required = r.required.filter((f) => f !== c);
      }
    }
  }
  if (!n)
    for (let a of ["anyOf", "oneOf"]) {
      let c = r[a];
      if (Array.isArray(c)) {
        let filtered = c.filter(
          (m) => m === null || typeof m !== "object" || Array.isArray(m) || !Bs(m.description),
        );
        if (filtered.length === 0) delete r[a];
        else r[a] = filtered;
      }
    }
  for (let a of Object.values(r)) collectValidationTips(a, n);
}
//@ chunk-dcmhvw5a.js:433495-437157 fingerprint = TIP_MATCHERS (0.876)
var HTTPS_CODE_CLAUDE_COM_DOCS_EN = "https://code.claude.com/docs/en",
  vw = [
    {
      matches: (e) => e.path === "permissions.defaultMode" && e.code === "invalid_value",
      tip: {
        suggestion:
          'Valid modes: "acceptEdits" (ask before file changes), "plan" (analysis only), "bypassPermissions" (auto-accept all), or "default" (standard behavior)',
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#permission-modes`,
      },
    },
    {
      matches: (e) => e.path === "apiKeyHelper" && e.code === "invalid_type",
      tip: {
        suggestion:
          'Provide a shell command that outputs your API key to stdout. The script should output only the API key. Example: "/bin/generate_temp_api_key.sh"',
      },
    },
    {
      matches: (e) => e.path === "cleanupPeriodDays" && e.code === "too_small",
      tip: {
        suggestion:
          'cleanupPeriodDays must be at least 1. To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years). To disable transcript writes entirely, remove this setting and use the --no-session-persistence CLI flag or the SDK persistSession:false option instead. (0 is rejected because it previously silently disabled all transcript writes, which users setting it to mean "never clean up" did not expect.)',
      },
    },
    {
      matches: (e) => e.path.startsWith("env.") && e.code === "invalid_type",
      tip: {
        suggestion:
          'Environment variables must be strings. Wrap numbers and booleans in quotes. Example: "DEBUG": "true", "PORT": "3000"',
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings#environment-variables`,
      },
    },
    {
      matches: (e) =>
        (e.path === "permissions.allow" || e.path === "permissions.deny") &&
        e.code === "invalid_type" &&
        e.expected === "array",
      tip: {
        suggestion:
          'Permission rules must be in an array. Format: ["Tool(specifier)"]. Examples: ["Bash(npm run build)", "Edit(docs/**)", "Read(~/.zshrc)"]. Use * for wildcards.',
      },
    },
    {
      matches: (e) => e.path === "hooks" && e.code === "unrecognized_keys",
      tip: {
        suggestion:
          "Not a recognized hook event. Common events: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, Stop. Check spelling and capitalization.",
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks`,
      },
    },
    {
      matches: (e) =>
        /\.hooks\.\d+\.command$/.test(e.path) && e.code === "invalid_type" && e.received === "undefined",
      tip: {
        suggestion:
          'Command hooks require `command`. For exec form (no shell), set `command` to the executable and `args` to its arguments: {"type": "command", "command": "echo", "args": ["hi"]}. For shell form, set `command` to the full shell string: {"type": "command", "command": "echo hi"}.',
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks#exec-form-and-shell-form`,
      },
    },
    {
      matches: (e) => e.path.includes("hooks") && e.code === "invalid_type",
      tip: {
        suggestion:
          'Hooks use a matcher + hooks array. The matcher is a string: a tool name ("Bash"), pipe-separated list ("Edit|Write"), or empty to match all. Example: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}',
      },
    },
    {
      matches: (e) => e.code === "invalid_type" && e.expected === "boolean",
      tip: { suggestion: 'Use true or false without quotes. Example: "includeCoAuthoredBy": true' },
    },
    {
      matches: (e) => e.code === "unrecognized_keys",
      tip: {
        suggestion: "Check for typos or refer to the documentation for valid fields",
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings`,
      },
    },
    { matches: (e) => e.code === "invalid_value" && e.enumValues !== void 0, tip: { suggestion: void 0 } },
    {
      matches: (e) =>
        e.code === "invalid_type" && e.expected === "object" && e.received === null && e.path === "",
      tip: {
        suggestion:
          "Check for missing commas, unmatched brackets, or trailing commas. Use a JSON validator to identify the exact syntax error.",
      },
    },
    {
      matches: (e) => e.path === "permissions.additionalDirectories" && e.code === "invalid_type",
      tip: {
        suggestion:
          'Must be an array of directory paths. Example: ["~/projects", "/tmp/workspace"]. You can also use --add-dir flag or /add-dir command',
        docLink: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#working-directories`,
      },
    },
  ],
  Pw = {
    permissions: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/iam#configuring-permissions`,
    env: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/settings#environment-variables`,
    hooks: `${HTTPS_CODE_CLAUDE_COM_DOCS_EN}/hooks`,
  };
//@ chunk-dcmhvw5a.js:437157-437432 fingerprint = getValidationTip (1)
function getValidationTip(context) {
  let matcher = vw.find((s) => s.matches(context));
  if (!matcher) return null;
  let tip = { ...matcher.tip };
  if (context.code === "invalid_value" && context.enumValues && !tip.suggestion)
    tip.suggestion = `Valid values: ${context.enumValues.map((enumValue) => `"${enumValue}"`).join(", ")}`;
  if (!tip.docLink && context.path) tip.docLink = Pw[firstLineOf(context.path, ".")];
  return tip;
}

export { collectValidationTips, getValidationTip };
