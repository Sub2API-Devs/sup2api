/**
 * utils/frontmatterSchema.ts
 *
 * 2.1.316 新增：技能/命令 frontmatter 字段 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { DETAIL_KEY_RE } from "../plugins/functionHooks/contextDataApi.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit as lit_2,
  fromEnum,
  joinSafe,
} from "../services/analytics/safeMetadata.js";
import {
  union,
  stringSchema,
  numberSchema,
  booleanSchema,
  nullSchema,
  array,
  objectSchema,
  unknown,
  _enum,
} from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "./config.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:800857-800909 placement
function frontmatterKeyTelemetry(key) {
  return DETAIL_KEY_RE.test(key) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(key) : lit_2("other");
}
//@ chunk-5xgkngpb.js:800909-808414 placement
/**
 * 技能/命令 frontmatter 字段定义（显示名、描述、模型、allowed-tools 等）。
 */
var SKILL_FRONTMATTER_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SkillFrontmatterValueSchemaAlias;
var SkillFrontmatterValueSchemaAlias2;
var SkillFrontmatterListSchema;
var SkillFrontmatterSchema;
var SkillSchema;
var AgentFrontmatterSchema;
var OutputStyleFrontmatterSchema;
var FRONTMATTER_SCHEMAS_BY_KIND;
deferInit("chunk-5xgkngpb.js:800909", () => {
  SKILL_FRONTMATTER_SCHEMA = () => union([stringSchema(), numberSchema(), booleanSchema(), nullSchema()]);
  SkillFrontmatterValueSchemaAlias = SKILL_FRONTMATTER_SCHEMA;
  SkillFrontmatterValueSchemaAlias2 = SKILL_FRONTMATTER_SCHEMA;
  SkillFrontmatterListSchema = () => union([SKILL_FRONTMATTER_SCHEMA(), array(stringSchema())]);
  SkillFrontmatterSchema = DoctorLazy(() =>
    objectSchema({
      name: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Display name. Defaults to the filename without extension."),
      description: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("One-line summary shown in listings and the Skill tool."),
      model: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Model override (`haiku`, `sonnet`, `opus`, `fable`, or a full ID). Use `inherit` to match the parent conversation.",
        ),
      "allowed-tools": SkillFrontmatterListSchema()
        .optional()
        .describe(
          "Tools available to the model while this file is active. Comma-separated string or YAML list.",
        ),
      "disallowed-tools": SkillFrontmatterListSchema()
        .optional()
        .describe(
          "Tools removed from the model while this file is active. Comma-separated string or YAML list. Cleared when the user sends the next message.",
        ),
      disallowedTools: SkillFrontmatterListSchema()
        .optional()
        .describe("Canonical (normalized) alias of `disallowed-tools`."),
      "argument-hint": SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Placeholder text shown after the slash command name."),
      arguments: SkillFrontmatterListSchema()
        .optional()
        .describe("@internal \u2014 typed variant of argument-hint; argument-hint is the documented form"),
      "disable-model-invocation": SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe(
          "If true, the model cannot invoke this via the Skill tool; only users can type the slash command.",
        ),
      "user-invocable": SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe(
          "If false, hides the slash command from users; only the model can invoke it via the Skill tool.",
        ),
      effort: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Thinking effort for the model: `low`, `medium`, `high`, `max`, or an integer."),
      shell: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Shell for `!`-command blocks: `bash` or `powershell`. Defaults to bash regardless of platform.",
        ),
      version: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("@internal \u2014 bookkeeping, not surfaced to users"),
    }),
  );
  SkillSchema = DoctorLazy(() =>
    SkillFrontmatterSchema().extend({
      when_to_use: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Guidance for when the model should reach for this skill. Becomes part of the tool description.",
        ),
      paths: SkillFrontmatterListSchema()
        .optional()
        .describe(
          "Glob patterns this skill applies to. The skill only loads when the model touches matching files.",
        ),
      hooks: unknown()
        .optional()
        .describe("Hooks registered while this skill is active. Same shape as settings.json `hooks`."),
      context: _enum(["inline", "fork"])
        .nullable()
        .optional()
        .describe(
          "Where the skill runs: `inline` expands into the current conversation; `fork` spawns a subagent.",
        ),
      agent: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Agent type to spawn when `context: fork`."),
      background: SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe(
          "Only for `context: fork`. Forks run as background agents that report back as a task notification instead of blocking the turn; set `false` to keep the caller waiting for the result in-line.",
        ),
      fallback: SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe(
          "@internal \u2014 interim defense-in-depth for thin-pointer skill stubs. If true, this skill yields to a same-suffix plugin or MCP skill (`<plugin>:<name>` / `<server>:<name>`) when one is loaded. Stubs carrying this should be deleted once their canonical plugin/MCP skill ships, not maintained.",
        ),
      created_by: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("@internal \u2014 provenance marker (e.g. dream-proposal)"),
      improved_by: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("@internal \u2014 provenance marker (e.g. dream-proposal)"),
      mcpServers: unknown().optional().describe("@internal"),
      lspServers: unknown().optional().describe("@internal"),
      agents: unknown().optional().describe("@internal"),
      outputStyles: unknown().optional().describe("@internal"),
      themes: unknown().optional().describe("@internal"),
      workflows: unknown().optional().describe("@internal"),
      channels: unknown().optional().describe("@internal"),
      monitors: unknown().optional().describe("@internal"),
      settings: unknown().optional().describe("@internal"),
      userConfig: unknown().optional().describe("@internal"),
      defaultEnabled: unknown().optional().describe("@internal"),
      experimental: unknown().optional().describe("@internal"),
      dependencies: unknown().optional().describe("@internal"),
      metadata: unknown()
        .optional()
        .describe(
          "Free-form map for the skill author's own use (e.g. entitlement or catalog fields). Preserved on the loaded skill.",
        ),
      displayName: unknown().optional().describe("@internal"),
      author: unknown().optional().describe("@internal"),
      homepage: unknown().optional().describe("@internal"),
      repository: unknown().optional().describe("@internal"),
      license: unknown().optional().describe("@internal"),
      keywords: unknown().optional().describe("@internal"),
    }),
  );
  AgentFrontmatterSchema = DoctorLazy(() =>
    objectSchema({
      name: SkillFrontmatterValueSchemaAlias().describe(
        "Agent identifier. Required \u2014 this is how the Agent tool and `--agent` flag address it.",
      ),
      description: SkillFrontmatterValueSchemaAlias().describe(
        "When to use this agent. Required \u2014 shown in the Agent tool listing.",
      ),
      model: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Model override for this agent. Use `inherit` to match the spawning conversation."),
      tools: SkillFrontmatterListSchema()
        .optional()
        .describe("Tools available to this agent. Replaces the default set."),
      disallowedTools: SkillFrontmatterListSchema()
        .optional()
        .describe("Tools removed from the default set. Ignored if `tools` is set."),
      color: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("@internal \u2014 display color in the agents UI"),
      effort: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Thinking effort: `low`, `medium`, `high`, `max`, or an integer."),
      permissionMode: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Permission mode the agent runs in."),
      mcpServers: unknown().optional().describe("MCP servers to connect when this agent runs."),
      hooks: unknown().optional().describe("Hooks registered while this agent runs."),
      maxTurns: union([numberSchema(), stringSchema(), nullSchema()])
        .optional()
        .describe("Maximum conversation turns before the agent stops."),
      autoCompactWindow: union([numberSchema(), stringSchema(), nullSchema()])
        .optional()
        .describe(
          `Auto-compact window for this agent, in tokens from ${TRANSPORT_LABELS} to ${GLOBAL_CONFIG_FIELD_KINDS}. Overrides the window it would inherit.`,
        ),
      skills: SkillFrontmatterListSchema().optional().describe("Skills preloaded for this agent."),
      initialPrompt: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Auto-submitted first message when this agent runs as the main session (via `--agent` or settings). Not read when spawned as a subagent.",
        ),
      memory: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Memory scope: `user`, `project`, or `local`."),
      background: SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe("If true, the agent runs in the background by default."),
      omitClaudeMd: SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe(
          "If true, the agent runs without the user, project and local CLAUDE.md instruction files when spawned as a subagent; managed policy files are kept. For agents that take everything they need from the delegation prompt.",
        ),
      isolation: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Filesystem isolation: `worktree` runs in a temporary git worktree."),
      observer: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Agent type auto-spawned as a background observer whenever this agent runs."),
      observerMessage: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Supplemental postamble appended (after the harness-owned default) to each activity digest sent to the observer.",
        ),
      observeSubagents: SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe("If false, subagents this agent spawns do not inherit its observer. Defaults to true."),
      experimental: objectSchema({
        cacheTtl: SkillFrontmatterValueSchemaAlias()
          .optional()
          .describe(
            'Prompt cache TTL for this agent\'s requests ("5m" or "1h") when no `subagentPromptCacheTtl` setting or env var is set. "1h" is ignored while a Claude subscription is in overage.',
          ),
      })
        .loose()
        .nullable()
        .optional()
        .describe("Experimental per-agent options; unknown keys are ignored."),
    }),
  );
  OutputStyleFrontmatterSchema = DoctorLazy(() =>
    objectSchema({
      name: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe(
          "Style name used in the Output style picker in `/config` and in settings. Defaults to the filename.",
        ),
      description: SkillFrontmatterValueSchemaAlias()
        .optional()
        .describe("Shown in the Output style picker in `/config`."),
      "keep-coding-instructions": SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe("If true, the default coding instructions stay in the system prompt alongside this style."),
      "force-for-plugin": SkillFrontmatterValueSchemaAlias2()
        .optional()
        .describe("@internal \u2014 only meaningful for plugin-bundled styles; ignored for user styles"),
    }),
  );
  FRONTMATTER_SCHEMAS_BY_KIND = {
    skill: DoctorLazy(() => SkillSchema().strict()),
    agent: DoctorLazy(() => AgentFrontmatterSchema().strict()),
    "output-style": DoctorLazy(() => OutputStyleFrontmatterSchema().strict()),
  };
});
//@ chunk-5xgkngpb.js:808414-808524 placement
function logFrontmatterShadowOnce(eventName, surface, keyOrIssue, detail) {
  if (!claimOnce().claim(`frontmatter_shadow:${eventName}:${surface}:${keyOrIssue}`)) return;
  logEvent(eventName, {
    surface: fromEnum(surface),
    detail,
  });
}
//@ chunk-5xgkngpb.js:808524-808874 placement
/**
 * 用新版 frontmatter schema 影子校验现有 frontmatter（不影响行为）：未知键与类型不匹配各按键只打点一次。
 */
function checkFrontmatterShadow(kind, frontmatter) {
  try {
    let result = FRONTMATTER_SCHEMAS_BY_KIND[kind]().safeParse(frontmatter);
    if (result.success) return;
    for (let issue of result.error.issues)
      if (issue.code === "unrecognized_keys")
        for (let key of issue.keys)
          logFrontmatterShadowOnce(
            "tengu_frontmatter_shadow_unknown_key",
            kind,
            key,
            frontmatterKeyTelemetry(key),
          );
      else {
        let issueKey = String(issue.path[0] ?? "");
        let keyAndCode = `${issueKey}:${issue.code}`;
        logFrontmatterShadowOnce(
          "tengu_frontmatter_shadow_mismatch",
          kind,
          keyAndCode,
          joinSafe(
            [issueKey === "" ? lit_2("") : frontmatterKeyTelemetry(issueKey), fromEnum(issue.code)],
            ":",
          ),
        );
      }
  } catch {}
}
export { checkFrontmatterShadow, AgentFrontmatterSchema };
