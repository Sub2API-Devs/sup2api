/**
 * schemas/hooks.ts
 *
 * 并入已有模块：hook 的 if 字段 schema（权限规则语法过滤）；hook 配置错误类与 shell 类型列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/schemas/hooks.ts
 * pieces: chunk-b91jfdd4.js (1), chunk-dcmhvw5a.js (5)
 * attribution: fingerprint 3, placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  string,
  _enum,
  u,
  literal,
  array,
  E,
  M,
  record,
  unknown,
  discriminatedUnion,
  partialRecord,
} from "../../vendor/zod/v4/classic/schemas.js";
import { HOOK_EVENTS } from "../entrypoints/sdk/coreSchemas.js";
import {
  printableCommandSchema,
  MONITOR_INPUT_DESCRIPTIONS,
  allowedDomainsFieldsIfOffered,
  monitorWsInputSchema,
} from "../tools/MonitorTool/websocketMonitor.js";

//@ chunk-dcmhvw5a.js:50625-50650 placement
/**
 * hook 配置错误类与 shell 类型列表。
 */
class HookConfigError extends Error {}
//@ chunk-dcmhvw5a.js:50650-50679 placement = FRONTMATTER_SHELLS (1)
var FRONTMATTER_SHELLS = ["bash", "powershell"];
//@ chunk-dcmhvw5a.js:50679-51434 placement
/**
 * hook 的 if 字段 schema（权限规则语法过滤）。
 */
var HookIfSchema = DoctorLazy(() =>
  string()
    .optional()
    .describe(
      'Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.',
    ),
);
var hookFailureModeSchema = DoctorLazy(() =>
  _enum(["continue", "block"])
    .optional()
    .describe(
      "What a failure of this hook does: it could not start (a missing script or plugin directory), timed out, exited with a code other than 0 or 2, or printed JSON that is invalid or fails validation. 'continue' (default): the failure is reported and the action goes ahead. 'block': the failure counts as exit code 2, so the action the event guards (a tool call, a permission request, a prompt) is blocked. Ignored for async hooks and on Stop, SubagentStop, TaskCompleted and TeammateIdle.",
    ),
);
//@ chunk-dcmhvw5a.js:51434-57516 fingerprint = buildHookSchemas (0.69)
/**
 * 构造 5 种钩子的 zod schema：command（command/args 执行形式/shell/timeout/onFailure/async/asyncRewake/rewakeMessage/rewakeSummary/cloud）、prompt（prompt/model/continueOnBlock）、mcp_tool（server/tool/input）、http（url/headers/allowedEnvVars/onFailure/cloud）、agent（prompt/model）。所有类型都有 if/timeout/statusMessage/once。
 */
function buildHookSchemas() {
  let BashCommandHookSchema = u({
    type: literal("command").describe("Shell command hook type"),
    command: string().describe("Shell command to execute"),
    args: array(string())
      .optional()
      .describe(
        "Argument list for exec form. When present, `command` is resolved as " +
          "an executable and spawned directly with these arguments \u2014 no shell. " +
          "Path placeholders like ${CLAUDE_PLUGIN_ROOT} are substituted per-element as plain strings, so paths with quotes, $, or backticks never reach a shell parser. When absent, `command` runs through a shell (bash on POSIX, PowerShell on Windows without Git Bash).",
      ),
    if: HookIfSchema(),
    shell: _enum(FRONTMATTER_SHELLS)
      .optional()
      .describe(
        "Shell interpreter. 'bash' uses your $SHELL (bash/zsh/sh); 'powershell' uses pwsh. Defaults to bash (powershell on Windows without Git Bash).",
      ),
    timeout: E().positive().optional().describe("Timeout in seconds for this specific command"),
    onFailure: hookFailureModeSchema(),
    statusMessage: string()
      .optional()
      .describe("Custom status message to display in spinner while hook runs"),
    once: M().optional().describe("If true, hook runs once and is removed after execution"),
    async: M().optional().describe("If true, hook runs in background without blocking"),
    asyncRewake: M()
      .optional()
      .describe(
        "If true, hook runs in background and wakes the model on exit code 2 (blocking error). Implies async.",
      ),
    rewakeMessage: string()
      .min(1)
      .optional()
      .describe(
        "@internal Custom prefix for the system-reminder shown to the model when an asyncRewake hook exits with code 2. The hook output is appended after this prefix.",
      ),
    rewakeSummary: string()
      .min(1)
      .optional()
      .describe(
        '@internal One-line summary shown to the user in the terminal when an asyncRewake hook exits with code 2. Defaults to "Stop hook feedback".',
      ),
    cloud: _enum(["device", "skip"])
      .optional()
      .catch("skip")
      .describe(
        "@internal Where this hook may run when a cloud session is driven from this machine. 'device': offer it to the cloud session and run it here even when its script sits where the cloud session can write on this machine or cannot be pinned \u2014 the author accepts that the session may have changed files this hook executes. 'skip': never offer it to cloud sessions. Omit for the default: a command hook whose script could be read and pinned and lies outside everything the cloud session can write here is offered; other command hooks are not. Applies to this entry only: the same hook written in another settings scope keeps its own setting. An unrecognised value reads as 'skip' (the file still loads; the hook stays on this machine).",
      ),
  });
  let PromptHookSchema = u({
    type: literal("prompt").describe("LLM prompt hook type"),
    prompt: string().describe("Prompt to evaluate with LLM. Use $ARGUMENTS placeholder for hook input JSON."),
    if: HookIfSchema(),
    timeout: E().positive().optional().describe("Timeout in seconds for this specific prompt evaluation"),
    model: string()
      .optional()
      .describe(
        'Model to use for this prompt hook (e.g., "claude-sonnet-5"). If not specified, uses the default small fast model.',
      ),
    continueOnBlock: M()
      .optional()
      .describe(
        `Sets the continue value for the decision:"block" produced when ok is false. Default false (turn ends). Whether continue:true lets the turn proceed depends on the event's decision:"block" semantics. On PostToolUse, the reason is fed back to Claude and the turn continues.`,
      ),
    statusMessage: string()
      .optional()
      .describe("Custom status message to display in spinner while hook runs"),
    once: M().optional().describe("If true, hook runs once and is removed after execution"),
  });
  let McpToolHookSchema = u({
    type: literal("mcp_tool").describe("MCP tool hook type"),
    server: string().describe("Name of an already-configured MCP server to invoke"),
    tool: string().describe("Name of the tool on that server to call"),
    input: record(string(), unknown())
      .optional()
      .describe(
        'Arguments passed to the MCP tool. String values support ${path} interpolation from the hook input JSON (e.g. "${tool_input.file_path}").',
      ),
    if: HookIfSchema(),
    timeout: E().positive().optional().describe("Timeout in seconds for this specific tool call"),
    statusMessage: string()
      .optional()
      .describe("Custom status message to display in spinner while hook runs"),
    once: M().optional().describe("If true, hook runs once and is removed after execution"),
  });
  let HttpHookSchema = u({
    type: literal("http").describe("HTTP hook type"),
    url: string().url().describe("URL to POST the hook input JSON to"),
    if: HookIfSchema(),
    timeout: E().positive().optional().describe("Timeout in seconds for this specific request"),
    onFailure: hookFailureModeSchema(),
    headers: record(string(), string())
      .optional()
      .describe(
        'Additional headers to include in the request. Values may reference environment variables using $VAR_NAME or ${VAR_NAME} syntax (e.g., "Authorization": "Bearer $MY_TOKEN"). Only variables listed in allowedEnvVars will be interpolated.',
      ),
    allowedEnvVars: array(string())
      .optional()
      .describe(
        "Explicit list of environment variable names that may be interpolated in header values. Only variables listed here will be resolved; all other $VAR references are left as empty strings. Required for env var interpolation to work.",
      ),
    statusMessage: string()
      .optional()
      .describe("Custom status message to display in spinner while hook runs"),
    once: M().optional().describe("If true, hook runs once and is removed after execution"),
    cloud: _enum(["device", "skip"])
      .optional()
      .catch("skip")
      .describe(
        "@internal Where this hook may run when a cloud session is driven from this machine. 'skip': never offer it to cloud sessions; 'device' or omitted: offered (an HTTP hook has no script to pin). Applies to this entry only. An unrecognised value reads as 'skip' (the file still loads).",
      ),
  });
  let AgentHookSchema = u({
    type: literal("agent").describe("Agentic verifier hook type"),
    prompt: string().describe(
      'Prompt describing what to verify (e.g. "Verify that unit tests ran and passed."). Use $ARGUMENTS placeholder for hook input JSON.',
    ),
    if: HookIfSchema(),
    timeout: E().positive().optional().describe("Timeout in seconds for agent execution (default 60)"),
    model: string()
      .optional()
      .describe('Model to use for this agent hook (e.g., "claude-sonnet-5"). If not specified, uses Haiku.'),
    statusMessage: string()
      .optional()
      .describe("Custom status message to display in spinner while hook runs"),
    once: M().optional().describe("If true, hook runs once and is removed after execution"),
  });
  return {
    BashCommandHookSchema,
    PromptHookSchema,
    HttpHookSchema,
    AgentHookSchema,
    McpToolHookSchema,
  };
}
//@ chunk-dcmhvw5a.js:57516-57897 fingerprint = HookMatcherSchema (0.589)
/**
 * hook 定义 schema：命令长度上限、各类型 hook 联合（command/prompt/agent/http/mcp_tool）、matcher 与按事件分组的 hooks 配置。
 */
var HOOK_COMMAND_MAX_LENGTH = 24576;
var HookCommandSchema = DoctorLazy(() => {
  let { BashCommandHookSchema, PromptHookSchema, AgentHookSchema, HttpHookSchema, McpToolHookSchema } =
    buildHookSchemas();
  return discriminatedUnion("type", [
    ...[BashCommandHookSchema, PromptHookSchema, AgentHookSchema, HttpHookSchema, McpToolHookSchema],
  ]);
});
var HookMatcherSchema = DoctorLazy(() =>
  u({
    matcher: string().optional().describe('String pattern to match (e.g. tool names like "Write")'),
    hooks: array(HookCommandSchema()).describe("List of hooks to execute when the matcher matches"),
  }),
);
var HooksSchema = DoctorLazy(() => partialRecord(_enum(HOOK_EVENTS), array(HookMatcherSchema())));
//@ chunk-b91jfdd4.js:9523-9609 fingerprint = IfConditionSchema (0.457)
/**
 * if 条件字段的附属 schema 片段（command 子字段与 ws 选项），供 if 条件解析器使用。
 */
function IfConditionSchema() {
  return {
    command: printableCommandSchema().optional().describe(MONITOR_INPUT_DESCRIPTIONS),
    ...allowedDomainsFieldsIfOffered(),
    ws: monitorWsInputSchema().optional(),
  };
}
export {
  HooksSchema,
  HookCommandSchema,
  IfConditionSchema,
  HookMatcherSchema,
  HOOK_COMMAND_MAX_LENGTH,
  HookConfigError,
};
