/**
 * utils/frontmatterSchema.ts
 *
 * 2.1.316 新增：技能/命令 frontmatter 字段 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { xEo } from "../plugins/functionHooks/contextDataApi.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit as lit_2,
  fromEnum,
  joinSafe,
} from "../services/analytics/safeMetadata.js";
import { Ue, o, E, M, zg, A, u, oe, U } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { Kx, d0 } from "./config.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-e6aww6q8.js:789532-789584 placement
function RWe(e) {
  return xEo.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit_2("other");
}
/**
 * 技能/命令 frontmatter 字段定义（显示名、描述、模型、allowed-tools 等）。
 */
//@ chunk-e6aww6q8.js:789584-797089 placement
var SKILL_FRONTMATTER_SCHEMA = () => Ue([o(), E(), M(), zg()]),
  ah = SKILL_FRONTMATTER_SCHEMA,
  tM = SKILL_FRONTMATTER_SCHEMA,
  HD = () => Ue([SKILL_FRONTMATTER_SCHEMA(), A(o())]),
  PEo = DoctorLazy(() =>
    u({
      name: ah().optional().describe("Display name. Defaults to the filename without extension."),
      description: ah().optional().describe("One-line summary shown in listings and the Skill tool."),
      model: ah()
        .optional()
        .describe(
          "Model override (`haiku`, `sonnet`, `opus`, `fable`, or a full ID). Use `inherit` to match the parent conversation.",
        ),
      "allowed-tools": HD()
        .optional()
        .describe(
          "Tools available to the model while this file is active. Comma-separated string or YAML list.",
        ),
      "disallowed-tools": HD()
        .optional()
        .describe(
          "Tools removed from the model while this file is active. Comma-separated string or YAML list. Cleared when the user sends the next message.",
        ),
      disallowedTools: HD().optional().describe("Canonical (normalized) alias of `disallowed-tools`."),
      "argument-hint": ah().optional().describe("Placeholder text shown after the slash command name."),
      arguments: HD()
        .optional()
        .describe("@internal \u2014 typed variant of argument-hint; argument-hint is the documented form"),
      "disable-model-invocation": tM()
        .optional()
        .describe(
          "If true, the model cannot invoke this via the Skill tool; only users can type the slash command.",
        ),
      "user-invocable": tM()
        .optional()
        .describe(
          "If false, hides the slash command from users; only the model can invoke it via the Skill tool.",
        ),
      effort: ah()
        .optional()
        .describe("Thinking effort for the model: `low`, `medium`, `high`, `max`, or an integer."),
      shell: ah()
        .optional()
        .describe(
          "Shell for `!`-command blocks: `bash` or `powershell`. Defaults to bash regardless of platform.",
        ),
      version: ah().optional().describe("@internal \u2014 bookkeeping, not surfaced to users"),
    }),
  ),
  MEo = DoctorLazy(() =>
    PEo().extend({
      when_to_use: ah()
        .optional()
        .describe(
          "Guidance for when the model should reach for this skill. Becomes part of the tool description.",
        ),
      paths: HD()
        .optional()
        .describe(
          "Glob patterns this skill applies to. The skill only loads when the model touches matching files.",
        ),
      hooks: oe()
        .optional()
        .describe("Hooks registered while this skill is active. Same shape as settings.json `hooks`."),
      context: U(["inline", "fork"])
        .nullable()
        .optional()
        .describe(
          "Where the skill runs: `inline` expands into the current conversation; `fork` spawns a subagent.",
        ),
      agent: ah().optional().describe("Agent type to spawn when `context: fork`."),
      background: tM()
        .optional()
        .describe(
          "Only for `context: fork`. Forks run as background agents that report back as a task notification instead of blocking the turn; set `false` to keep the caller waiting for the result in-line.",
        ),
      fallback: tM()
        .optional()
        .describe(
          "@internal \u2014 interim defense-in-depth for thin-pointer skill stubs. If true, this skill yields to a same-suffix plugin or MCP skill (`<plugin>:<name>` / `<server>:<name>`) when one is loaded. Stubs carrying this should be deleted once their canonical plugin/MCP skill ships, not maintained.",
        ),
      created_by: ah().optional().describe("@internal \u2014 provenance marker (e.g. dream-proposal)"),
      improved_by: ah().optional().describe("@internal \u2014 provenance marker (e.g. dream-proposal)"),
      mcpServers: oe().optional().describe("@internal"),
      lspServers: oe().optional().describe("@internal"),
      agents: oe().optional().describe("@internal"),
      outputStyles: oe().optional().describe("@internal"),
      themes: oe().optional().describe("@internal"),
      workflows: oe().optional().describe("@internal"),
      channels: oe().optional().describe("@internal"),
      monitors: oe().optional().describe("@internal"),
      settings: oe().optional().describe("@internal"),
      userConfig: oe().optional().describe("@internal"),
      defaultEnabled: oe().optional().describe("@internal"),
      experimental: oe().optional().describe("@internal"),
      dependencies: oe().optional().describe("@internal"),
      metadata: oe()
        .optional()
        .describe(
          "Free-form map for the skill author's own use (e.g. entitlement or catalog fields). Preserved on the loaded skill.",
        ),
      displayName: oe().optional().describe("@internal"),
      author: oe().optional().describe("@internal"),
      homepage: oe().optional().describe("@internal"),
      repository: oe().optional().describe("@internal"),
      license: oe().optional().describe("@internal"),
      keywords: oe().optional().describe("@internal"),
    }),
  ),
  AWe = DoctorLazy(() =>
    u({
      name: ah().describe(
        "Agent identifier. Required \u2014 this is how the Agent tool and `--agent` flag address it.",
      ),
      description: ah().describe("When to use this agent. Required \u2014 shown in the Agent tool listing."),
      model: ah()
        .optional()
        .describe("Model override for this agent. Use `inherit` to match the spawning conversation."),
      tools: HD().optional().describe("Tools available to this agent. Replaces the default set."),
      disallowedTools: HD()
        .optional()
        .describe("Tools removed from the default set. Ignored if `tools` is set."),
      color: ah().optional().describe("@internal \u2014 display color in the agents UI"),
      effort: ah().optional().describe("Thinking effort: `low`, `medium`, `high`, `max`, or an integer."),
      permissionMode: ah().optional().describe("Permission mode the agent runs in."),
      mcpServers: oe().optional().describe("MCP servers to connect when this agent runs."),
      hooks: oe().optional().describe("Hooks registered while this agent runs."),
      maxTurns: Ue([E(), o(), zg()])
        .optional()
        .describe("Maximum conversation turns before the agent stops."),
      autoCompactWindow: Ue([E(), o(), zg()])
        .optional()
        .describe(
          `Auto-compact window for this agent, in tokens from ${Kx} to ${d0}. Overrides the window it would inherit.`,
        ),
      skills: HD().optional().describe("Skills preloaded for this agent."),
      initialPrompt: ah()
        .optional()
        .describe(
          "Auto-submitted first message when this agent runs as the main session (via `--agent` or settings). Not read when spawned as a subagent.",
        ),
      memory: ah().optional().describe("Memory scope: `user`, `project`, or `local`."),
      background: tM().optional().describe("If true, the agent runs in the background by default."),
      omitClaudeMd: tM()
        .optional()
        .describe(
          "If true, the agent runs without the user, project and local CLAUDE.md instruction files when spawned as a subagent; managed policy files are kept. For agents that take everything they need from the delegation prompt.",
        ),
      isolation: ah()
        .optional()
        .describe("Filesystem isolation: `worktree` runs in a temporary git worktree."),
      observer: ah()
        .optional()
        .describe("Agent type auto-spawned as a background observer whenever this agent runs."),
      observerMessage: ah()
        .optional()
        .describe(
          "Supplemental postamble appended (after the harness-owned default) to each activity digest sent to the observer.",
        ),
      observeSubagents: tM()
        .optional()
        .describe("If false, subagents this agent spawns do not inherit its observer. Defaults to true."),
      experimental: u({
        cacheTtl: ah()
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
  ),
  OEo = DoctorLazy(() =>
    u({
      name: ah()
        .optional()
        .describe(
          "Style name used in the Output style picker in `/config` and in settings. Defaults to the filename.",
        ),
      description: ah().optional().describe("Shown in the Output style picker in `/config`."),
      "keep-coding-instructions": tM()
        .optional()
        .describe("If true, the default coding instructions stay in the system prompt alongside this style."),
      "force-for-plugin": tM()
        .optional()
        .describe("@internal \u2014 only meaningful for plugin-bundled styles; ignored for user styles"),
    }),
  ),
  IEo = {
    skill: DoctorLazy(() => MEo().strict()),
    agent: DoctorLazy(() => AWe().strict()),
    "output-style": DoctorLazy(() => OEo().strict()),
  };
//@ chunk-e6aww6q8.js:797089-797199 placement
function logFrontmatterShadowOnce(e, n, r, s) {
  if (!claimOnce().claim(`frontmatter_shadow:${e}:${n}:${r}`)) return;
  logEvent(e, { surface: fromEnum(n), detail: s });
}
/**
 * 用新版 frontmatter schema 影子校验现有 frontmatter（不影响行为）：未知键与类型不匹配各按键只打点一次。
 */
//@ chunk-e6aww6q8.js:797199-797549 placement
function checkFrontmatterShadow(e, n) {
  try {
    let safeParse = IEo[e]().safeParse(n);
    if (safeParse.success) return;
    for (let issue of safeParse.error.issues)
      if (issue.code === "unrecognized_keys")
        for (let key of issue.keys)
          logFrontmatterShadowOnce("tengu_frontmatter_shadow_unknown_key", e, key, RWe(key));
      else {
        let h = String(issue.path[0] ?? ""),
          y = `${h}:${issue.code}`;
        logFrontmatterShadowOnce(
          "tengu_frontmatter_shadow_mismatch",
          e,
          y,
          joinSafe([h === "" ? lit_2("") : RWe(h), fromEnum(issue.code)], ":"),
        );
      }
  } catch {}
}

export { checkFrontmatterShadow, AWe };
