/**
 * skills/bundled/claudeApi.ts
 *
 * claude-code-docs（及 claude-api）内置 skill 的注册与提示词组装，附带文档文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/claudeApi.ts
 * pieces: chunk-hantmvxa.js (1), chunk-jy3v56kg.js (1), chunk-v8425tx0.js (1), chunk-ym2xht5h.js (5)
 * attribution: fingerprint 4, sole-consumer 3, affinity 1
 */
import { listAvailablePluginSubcommands } from "../../cli/handlers/plugins.js";
import { describePluginEvalAvailability } from "../../utils/plugins/pluginGates.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { sortedReleaseNotes, readChangelog } from "../../utils/releaseNotes.js";
import { semverLt } from "../../utils/semver.js";
import { isUsing3PServices } from "../../utils/auth.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logEvent } from "../../services/analytics/index.js";
import { loadSkillFilesModule } from "../../_unattributed/chunk-hantmvxa/part-001.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-ym2xht5h.js:5336-5386 sole-consumer
/**
 * 惰性加载 claude-code-docs 技能内容模块。
 */
function loadClaudeCodeDocsContent() {
  return import("./chunk-6z63wjt0.js");
}
//@ chunk-ym2xht5h.js:5386-6494 sole-consumer
/**
 * claude-code-docs 技能的描述文本（首段与其加触发条件的版本）。
 */
var CLAUDE_CODE_DOCS = "claude-code-docs";
var DOCS_SKILL_DESCRIPTION = `Answer questions about Claude Code itself: commands, flags, settings, hooks, skills, MCP servers, subagents, IDE integrations, sandboxing, deployment, and Claude Tag (Claude in Slack). Verifies against the running build before recommending any command, flag, or setting.
`;
var DOCS_SKILL_DESCRIPTION_WITH_TRIGGERS =
  DOCS_SKILL_DESCRIPTION +
  `TRIGGER when: user asks how Claude Code works ("Can Claude\u2026", "Does Claude\u2026", "How do I\u2026", "Is there a way to\u2026"); user asks about a slash command, CLI flag, settings key, hook, skill, MCP server, subagent, keybinding, or .claude/ directory; user wants to configure, customize, or troubleshoot Claude Code; user asks about Claude in Slack or Claude Tag ("what is Claude Tag", "can Claude live in Slack", "@Claude in Slack", "/install-slack-app", "set up Claude for my Slack workspace"); YOU are about to recommend a Claude Code slash command, flag, or setting and have not verified it exists in this build.
` +
  "SKIP: questions about building applications with the Claude API or Anthropic SDK (use /claude-api), general programming questions, questions about the user's own codebase.";
//@ chunk-ym2xht5h.js:6494-9801 sole-consumer
/**
 * 为 claude-code-docs 技能拼接本会话环境概况：可用斜杠命令与别名、`claude plugin` 子命令、plugin eval 可用性、自定义技能与代理、已配置 MCP 服务器、已设置的设置键名（不含值）、版本等，作为提示词的一部分。
 */
function buildClaudeCodeEnvironmentSummary(context, changelogContent) {
  let n = [];
  let filtered = context.options.commands.filter((command) => !command.isHidden);
  let r = (e) => e.type !== "prompt" || e.source === "builtin" || e.source === "bundled";
  let filtered_2 = filtered.filter(r);
  if (filtered_2.length > 0) {
    let sorted = filtered_2
      .map((t) => {
        let d = t.aliases?.length ? ` (aliases: ${t.aliases.map((alias) => `/${alias}`).join(", ")})` : "";
        return `- /${t.name}${d}: ${t.description}`;
      })
      .sort();
    n.push(`**Available commands (${filtered_2.length} in this build):**
${sorted.join(`
`)}`);
  }
  let g = listAvailablePluginSubcommands();
  n.push(
    `**\`claude plugin\` CLI subcommands (${g.length} available in this session; run from a shell, not the prompt):**
` +
      g.map(
        (e) =>
          `- claude ${e.usage}${e.aliases ? ` (aliases: ${e.aliases.join(", ")})` : ""}: ${e.description}`,
      ).join(`
`),
  );
  let p = describePluginEvalAvailability();
  let k = p.enabled
    ? " For any question about it \u2014 availability, authoring cases, graders, flags, the results JSON, the report, the sandbox, CI, troubleshooting \u2014 or about `/skill-doctor`, read `references/plugin-eval-quickref.md`, then the matching section of `references/plugin-eval.md`; they are the offline floor and there is no public docs page yet."
    : "";
  n.push(`**Plugin eval:** ${p.text}${k}`);
  let filtered_3 = filtered.filter((e) => !r(e));
  if (filtered_3.length > 0) {
    let sorted = filtered_3.map((t) => `- /${t.name}: ${t.description}`).sort();
    n.push(`**Custom skills configured:**
${sorted.join(`
`)}`);
  }
  let filtered_4 = context.options.agentDefinitions.activeAgents.filter(
    (activeAgent) => activeAgent.source !== "built-in",
  );
  if (filtered_4.length > 0) {
    let sorted = filtered_4.map((t) => `- ${t.agentType}: ${t.whenToUse}`).sort();
    n.push(`**Custom agents configured:**
${sorted.join(`
`)}`);
  }
  let mcpClients = context.options.mcpClients;
  if (mcpClients && mcpClients.length > 0) {
    let sorted = mcpClients.map((mcpClient) => `- ${mcpClient.name}`).sort();
    n.push(`**Configured MCP servers:**
${sorted.join(`
`)}`);
  }
  let sorted = Object.keys(getSettings_DEPRECATED()).sort();
  if (sorted.length > 0)
    n.push(
      `**Settings keys configured (values omitted):** ${sorted.join(", ")}. To see values, the user can run \`claude config list\` or open \`~/.claude/settings.json\`.`,
    );
  let S = firstLineOf(
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    "-",
  );
  let b = sortedReleaseNotes(changelogContent)
    .filter(([e]) => semverLt(e, S))
    .slice(-10)
    .reverse();
  if (b.length > 0) {
    let mapped = b.map(
      ([t, d]) =>
        `### ${t}
` +
        d.map((m) => `- ${m}`).join(`
`),
    );
    n.push(`**Recent releases (you are running v${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    }):**
${mapped.join(`

`)}`);
  }
  if (isUsing3PServices())
    n.push(
      "**Provider context:** This session is not using Anthropic's first-party API. WebSearch may be unavailable, `/feedback` is unavailable, and some features behave differently \u2014 check the docs page for the user's specific provider. Direct issues to https://github.com/anthropics/claude-code/issues.",
    );
  return n.join(`

`);
}
//@ chunk-ym2xht5h.js:9801-10147 affinity
function buildClaudeCodeDocsPrompt(i, s, context, changelog) {
  let o = [i];
  let claudeCodeEnvironmentSummary = buildClaudeCodeEnvironmentSummary(context, changelog);
  o.push(`---

# Current Build

Generated from the running Claude Code binary at invocation time. This is ground truth \u2014 it overrides your training data and any documentation when they disagree about what exists in this build.

${claudeCodeEnvironmentSummary}`);
  if (s.trim())
    o.push(`---

## User Request

${s}`);
  return o.join(`

`);
}
//@ chunk-ym2xht5h.js:10147-10723 fingerprint = registerClaudeApiSkill (0.401)
/**
 * 注册 claude-code-docs 内置 skill（回答 Claude Code 功能与设置问题，允许 Read/Grep/Glob 和 code.claude.com/platform.claude.com 的 WebFetch）；受 GrowthBook tengu_birch_kettle 门控，CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL 可关闭。
 */
function registerClaudeCodeSkill({ disabled: i = false } = {}) {
  registerBundledSkill({
    name: CLAUDE_CODE_DOCS,
    menuDescription: "Answer questions about Claude Code features and settings",
    description: DOCS_SKILL_DESCRIPTION_WITH_TRIGGERS,
    allowedTools: [
      "Read",
      "Grep",
      "Glob",
      "WebFetch(domain:code.claude.com)",
      "WebFetch(domain:platform.claude.com)",
    ],
    argumentHint: "[question]",
    userInvocable: true,
    files: () =>
      loadClaudeCodeDocsContent().then((claudeCodeDocsContent) => claudeCodeDocsContent.SKILL_FILES),
    isEnabled() {
      return !i && getFeatureValue_CACHED_MAY_BE_STALE("tengu_birch_kettle", false);
    },
    async getPromptForCommand(s, n) {
      logEvent("tengu_claude_code_skill_loaded", {
        has_args: s.trim().length > 0,
      });
      let [changelog, { SKILL_PROMPT: o }] = await Promise.all([
        readChangelog(n.storageV5),
        loadClaudeCodeDocsContent(),
      ]);
      return [
        {
          type: "text",
          text: buildClaudeCodeDocsPrompt(o, s, n, changelog),
        },
      ];
    },
  });
}
//@ chunk-hantmvxa.js:111868-111927 fingerprint = getFilesForLanguage (1)
async function getFilesForLanguage() {
  let { SKILL_FILES } = await loadSkillFilesModule();
  return SKILL_FILES;
}
//@ chunk-jy3v56kg.js:41132-41250 fingerprint = buildPrompt (0.561)
/**
 * 去掉 SKILL.md 的 frontmatter 后拼接用户参数，生成内置 skill 提示词（claude-api 类 skill 使用）。
 */
function buildPrompt(e, n) {
  let trimmed = parseFrontmatter(
    e.replace(
      /\r\n/g,
      `
`,
    ),
  ).content.trim();
  return n.trim() === ""
    ? trimmed
    : `${trimmed}

## User Request

${n}`;
}
//@ chunk-v8425tx0.js:2570-2852 fingerprint = LANGUAGE_INDICATORS (1)
var LANGUAGE_INDICATORS = {
  python: [".py", "requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
  typescript: [".ts", ".tsx", "tsconfig.json", "package.json"],
  java: [".java", "pom.xml", "build.gradle"],
  go: [".go", "go.mod"],
  ruby: [".rb", "Gemfile"],
  csharp: [".cs", ".csproj"],
  php: [".php", "composer.json"],
  curl: [],
};
export { getFilesForLanguage, buildPrompt, LANGUAGE_INDICATORS };
