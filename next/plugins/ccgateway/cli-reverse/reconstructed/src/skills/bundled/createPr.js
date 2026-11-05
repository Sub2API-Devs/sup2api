/**
 * skills/bundled/createPr.ts
 *
 * 2.1.316 新增：创建 PR 的内置技能：允许/禁止工具清单、只读 git/gh 命令模式、提示词与注册（开关满足才启用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (6)
 * attribution: placement 6
 */
import {
  CERTIFIED_GIT_STATUS,
  CERTIFIED_GIT_LOG,
  CERTIFIED_GIT_DIFF,
  CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
  CERTIFIED_GIT_CHECKOUT_B,
  CERTIFIED_GH_PR_CREATE,
  CERTIFIED_GH_PR_VIEW,
  CERTIFIED_GIT_PUSH_ORIGIN,
  buildCertifiedPushRule,
} from "../../tools/BashTool/certifiedCommands.js";
import {
  toPowerShellRules,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  getDefaultBranch,
} from "../../utils/git.js";
import {
  bashAndPowerShellRules,
  GIT_OUTPUT_RESTRICTED_RULES,
  GIT_CHECKOUT_FORCE_RULES,
  GIT_PUSH_RESTRICTED_RULES,
  GH_PR_CREATE_RESTRICTED_RULES,
  GH_PR_CREATE_BASE_RULES,
} from "../../utils/permissions/gitCommandRules.js";
import { emptyList } from "../../commands/commit.js";
import { escapeShellBangs, executeShellCommandsInPrompt } from "../../utils/promptShellExecution.js";
import {
  untrustedPrTemplateBlock,
  AT_MENTION_GUIDANCE,
  prBodyGuidanceBullets,
  prSummaryPlaceholder,
  prTestPlanPlaceholder,
  logPrGuidanceRendered,
} from "../../utils/gitCommitGuidance.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { PR_SKILL_NAME } from "./bundledSkillNames.js";
import { isCommitSkillRolloutOn } from "../../services/projectsRelay/relayGates.js";
import { getSessionSkillCommands } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRoot } from "../../bootstrap/state.js";
import { buildPRAttributionTrailer } from "../../utils/attribution.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:183760-184024 placement
/**
 * 创建 PR skill 的工具清单：基础工具名 PR_SKILL_BASE_TOOLS、只读 git/gh 命令模式 PR_SKILL_BASH_PATTERNS；toBashPermissionRules 把命令包成 Bash(...) 规则，合成 PR_SKILL_ALLOWED_TOOLS。
 */
var PR_SKILL_BASE_TOOLS; // deferred: uses toPowerShellRules (../../utils/git.js) of its import cycle while loading; runs once the cycle is complete
var PR_SKILL_BASH_PATTERNS;
var toBashPermissionRules;
var PR_SKILL_ALLOWED_TOOLS;
deferInit("chunk-ne2890fx.js:183760", () => {
  PR_SKILL_BASE_TOOLS = [
    CERTIFIED_GIT_STATUS,
    CERTIFIED_GIT_LOG,
    CERTIFIED_GIT_DIFF,
    CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
    CERTIFIED_GIT_CHECKOUT_B,
    CERTIFIED_GH_PR_CREATE,
    CERTIFIED_GH_PR_VIEW,
  ];
  PR_SKILL_BASH_PATTERNS = [
    "git status *",
    "git log --oneline *",
    "git diff origin/*",
    "git branch --show-current",
    "git checkout -b *",
    "gh pr create --title * --body *",
    "gh pr view *",
  ];
  toBashPermissionRules = (rule) => rule.map((ruleBody) => `Bash(${ruleBody})`);
  PR_SKILL_ALLOWED_TOOLS = [
    ...toBashPermissionRules([...PR_SKILL_BASE_TOOLS, CERTIFIED_GIT_PUSH_ORIGIN]),
    ...toPowerShellRules(PR_SKILL_BASH_PATTERNS),
  ];
});
//@ chunk-ne2890fx.js:184024-184151 placement
/**
 * 异步计算创建 PR skill 的允许工具：固定工具 + 运行时探测到的额外 Bash 规则。
 */
async function getPrSkillAllowedTools() {
  let gitPushRemotes = await getGitPushRemotes();
  let filtered = gitPushRemotes.map(buildCertifiedPushRule).filter((rule) => rule !== null);
  return [
    ...toBashPermissionRules([...PR_SKILL_BASE_TOOLS, ...filtered]),
    ...toPowerShellRules([...PR_SKILL_BASH_PATTERNS, ...gitPushShellPatternsForRemotes(gitPushRemotes)]),
  ];
}
//@ chunk-ne2890fx.js:184151-184219 placement
var PR_SKILL_DISALLOWED_TOOLS; // deferred: uses toPowerShellRules (../../utils/git.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ne2890fx.js:184151", () => {
  PR_SKILL_DISALLOWED_TOOLS = [
    ...bashAndPowerShellRules([
      ...GIT_OUTPUT_RESTRICTED_RULES,
      ...GIT_CHECKOUT_FORCE_RULES,
      ...GIT_PUSH_RESTRICTED_RULES,
      ...GH_PR_CREATE_RESTRICTED_RULES,
    ]),
    ...toPowerShellRules(GH_PR_CREATE_BASE_RULES),
    ...emptyList(),
  ];
});
//@ chunk-ne2890fx.js:184219-186391 placement
/**
 * 生成创建 PR skill 的提示词：用 !`git …` 注入当前状态、分支、提交与 diff，附用户指导、Git 安全协议和 gh pr create HEREDOC 模板。
 */
function buildCreatePrPrompt(userGuidance, baseBranch, sessionSkillCommands, prAttributionTrailer) {
  let escapedTrailer = escapeShellBangs(prAttributionTrailer);
  let escapedGuidance = escapeShellBangs(userGuidance.trim());
  let extraSection = null;
  let untrustedTemplate = untrustedPrTemplateBlock();
  let templateSection =
    untrustedTemplate && isBashAvailable()
      ? `
${untrustedTemplate}`
      : "";
  return `## Context

- Current git status: !\`git status\`
- Current branch: !\`git branch --show-current\`
- Commits since origin/${baseBranch}: !\`git log --oneline origin/${baseBranch}..HEAD\`
- Full diff vs origin/${baseBranch}: !\`git diff origin/${baseBranch}...HEAD\`${templateSection}
${
  escapedGuidance
    ? `
User guidance for this PR: ${escapedGuidance}
`
    : ""
}
## Git Safety Protocol

- NEVER update the git config
- NEVER force push to main/master; warn the user if they request it
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported
- Use the gh command for ALL GitHub-related tasks including issues, pull requests, checks, and releases. If given a GitHub URL, use gh to fetch it
${
  extraSection
    ? `
${extraSection}
`
    : ""
}
## Your task

Based on the changes above, open a single pull request:

1. Analyze ALL changes that will be included in the PR (every commit since ${baseBranch}, not just the latest), then draft a title and body:
   - Keep the title short (under 70 characters); put detail in the body
   - ${AT_MENTION_GUIDANCE}${prBodyGuidanceBullets(templateSection ? "embedded_context" : null)}

2. Create a new branch if currently on ${baseBranch}, push to remote with -u if needed, then create the PR. To ensure good formatting, ALWAYS pass the body inline via a ${isBashAvailable() ? "HEREDOC" : "here-string"}, never from a file or stdin (\`--body-file\`/\`-F\`, even \`--body-file -\`, is refused while this skill runs):
${
  isBashAvailable()
    ? `\`\`\`
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${
        escapedTrailer
          ? `

${escapedTrailer}`
          : ""
      }
EOF
)"
\`\`\``
    : `\`\`\`
gh pr create --title "the pr title" --body @'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${
        escapedTrailer
          ? `

${escapedTrailer}`
          : ""
      }
'@
\`\`\`
The closing \`'@\` MUST be at column 0 with no leading whitespace.`
}

3. Return the PR URL when you're done, so the user can see it.

You have the capability to call multiple tools in a single response. Branch, push, and create the PR using a single message. Do not run additional commands to read or explore code beyond the git context above, and do not use any non-git tools for this task.`;
}
//@ chunk-ne2890fx.js:186391-187237 placement
/**
 * 注册"Create a pull request"bundled skill：限定允许/禁止的工具集，开关满足才启用，参数作为 PR 指导。
 */
function registerCreatePrSkill() {
  registerBundledSkill({
    name: PR_SKILL_NAME,
    menuDescription: "Create a pull request",
    description:
      "Create a GitHub pull request. Use whenever you are about to open a PR, whether the user asked for one or it is a step in your current task \u2014 it gathers branch context and applies the required PR workflow (gh CLI, title/body format, attribution).",
    argumentHint: "[guidance]",
    allowedTools: PR_SKILL_ALLOWED_TOOLS,
    getAllowedTools: getPrSkillAllowedTools,
    disallowedTools: PR_SKILL_DISALLOWED_TOOLS,
    userInvocable: true,
    isEnabled: () => isCommitSkillRolloutOn(),
    progressMessage: "creating pull request",
    async getPromptForCommand(args, context) {
      logPrGuidanceRendered("pr_skill");
      let [sessionSkillCommands, prAttributionTrailer] = await Promise.all([
        getSessionSkillCommands(getProjectRoot(), context.storageV5),
        buildPRAttributionTrailer(context.getAppState, context.storageV5),
      ]);
      let defaultBranch = await getDefaultBranch();
      let resolvedBaseBranch = /^[A-Za-z0-9._/+][A-Za-z0-9._/+-]*$/.test(defaultBranch)
        ? defaultBranch
        : "main";
      let createPrPrompt = buildCreatePrPrompt(
        args,
        resolvedBaseBranch,
        sessionSkillCommands,
        prAttributionTrailer,
      );
      return [
        {
          type: "text",
          text: await executeShellCommandsInPrompt(
            createPrPrompt,
            {
              ...context,
              permissionLayers: [
                ...(context.permissionLayers ?? []),
                {
                  kind: "allowed_tools",
                  allowedTools: PR_SKILL_ALLOWED_TOOLS,
                },
              ],
            },
            `/${PR_SKILL_NAME}`,
          ),
        },
      ];
    },
  });
}
//@ chunk-ne2890fx.js:187237-187258 placement
function noopSimplifySkillStub() {
  return;
}
export { noopSimplifySkillStub, registerCreatePrSkill };
