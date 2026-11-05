/**
 * commands/commit-push-pr.ts
 *
 * /commit-push-pr 提示词命令（内部）：允许的 git/gh 工具、Slack 发帖工具与提示词正文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/commit-push-pr.ts
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: affinity 2, fingerprint 3, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  CERTIFIED_GIT_CHECKOUT_B,
  CERTIFIED_GIT_ADD,
  CERTIFIED_GIT_STATUS,
  CERTIFIED_GIT_COMMIT,
  CERTIFIED_GH_PR_CREATE,
  CERTIFIED_GH_PR_EDIT,
  CERTIFIED_GH_PR_VIEW,
  CERTIFIED_GIT_PUSH_ORIGIN,
  buildCertifiedPushRule,
} from "../tools/BashTool/certifiedCommands.js";
import {
  toPowerShellRules,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  getDefaultBranch,
} from "../utils/git.js";
import {
  bashAndPowerShellRules,
  GIT_ADD_FORCE_RULES,
  GIT_COMMIT_FILE_ARG_RULES,
  GIT_CHECKOUT_FORCE_RULES,
  GIT_PUSH_RESTRICTED_RULES,
  GH_PR_CREATE_RESTRICTED_RULES,
  GH_PR_EDIT_RESTRICTED_RULES,
  GH_PR_CREATE_BASE_RULES,
} from "../utils/permissions/gitCommandRules.js";
import { emptyList } from "./commit.js";
import {
  escapeShellBangs,
  executeShellCommandsInPrompt,
  withCommandAllowRules,
} from "../utils/promptShellExecution.js";
import { env } from "../utils/env.js";
import {
  untrustedPrTemplateBlock,
  AT_MENTION_GUIDANCE,
  prBodyGuidanceBullets,
  prSummaryPlaceholder,
  prTestPlanPlaceholder,
  logPrGuidanceRendered,
} from "../utils/gitCommitGuidance.js";
import { isBashAvailable } from "../utils/shell/shellToolUtils.js";
import { COMMIT_PUSH_PR } from "../skills/bundled/bundledSkillNames.js";
import { buildSessionAttributionTexts, buildPRAttributionTrailer } from "../utils/attribution.js";
import { isSafeRefName as isSafeRefName_2 } from "../utils/git/safeRefName.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1763334-1763362 affinity
function commitTrailerFlag(_unused) {
  return null;
}
//@ chunk-5xgkngpb.js:1763362-1763725 fingerprint (2.1.88 match: ALLOWED_TOOLS, 0.439)
/**
 * SLACK_POST_TOOLS：ToolSearch + slack send_message 工具。
 */
var COMMIT_PUSH_PR_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SLACK_POST_TOOLS;
var COMMIT_PUSH_PR_GIT_COMMANDS;
var buildAllowedTools;
var COMMIT_PUSH_PR_ALLOWED_TOOLS;
deferInit("chunk-5xgkngpb.js:1763362", () => {
  COMMIT_PUSH_PR_TOOLS = [
    CERTIFIED_GIT_CHECKOUT_B,
    CERTIFIED_GIT_ADD,
    CERTIFIED_GIT_STATUS,
    CERTIFIED_GIT_COMMIT,
    CERTIFIED_GH_PR_CREATE,
    CERTIFIED_GH_PR_EDIT,
    CERTIFIED_GH_PR_VIEW,
  ];
  SLACK_POST_TOOLS = ["ToolSearch", "mcp__slack__send_message", "mcp__claude_ai_Slack__slack_send_message"];
  COMMIT_PUSH_PR_GIT_COMMANDS = [
    "git checkout -b *",
    "git add *",
    "git status *",
    "git commit -m *",
    "gh pr create --title * --body *",
    "gh pr edit --title * --body *",
    "gh pr view *",
  ];
  buildAllowedTools = (remotes, certified) => [
    ...remotes.map((remote) => `Bash(${remote})`),
    ...toPowerShellRules(certified),
    ...SLACK_POST_TOOLS,
  ];
  COMMIT_PUSH_PR_ALLOWED_TOOLS = buildAllowedTools(
    [...COMMIT_PUSH_PR_TOOLS, CERTIFIED_GIT_PUSH_ORIGIN],
    COMMIT_PUSH_PR_GIT_COMMANDS,
  );
});
//@ chunk-5xgkngpb.js:1763725-1763747 layout
function promptOverride() {
  return;
}
//@ chunk-5xgkngpb.js:1763747-1763901 layout (2.1.88 match: getValueFromInput, 1)
/**
 * getCommitPushPrAllowedTools：按 git remote 动态生成 push 规则。
 */
async function getCommitPushPrAllowedTools() {
  if (promptOverride()?.type === "prompt") return [];
  let gitPushRemotes = await getGitPushRemotes();
  let filtered = gitPushRemotes.map(buildCertifiedPushRule).filter((rule) => rule !== null);
  return buildAllowedTools(
    [...COMMIT_PUSH_PR_TOOLS, ...filtered],
    [...COMMIT_PUSH_PR_GIT_COMMANDS, ...gitPushShellPatternsForRemotes(gitPushRemotes)],
  );
}
//@ chunk-5xgkngpb.js:1763901-1764478 layout
var COMMIT_PUSH_PR_BASH_RULES; // deferred: uses toPowerShellRules (../utils/git.js) of its import cycle while loading; runs once the cycle is complete
var SLACK_POST_INSTRUCTIONS;
deferInit("chunk-5xgkngpb.js:1763901", () => {
  COMMIT_PUSH_PR_BASH_RULES = [
    ...bashAndPowerShellRules([
      ...GIT_ADD_FORCE_RULES,
      ...GIT_COMMIT_FILE_ARG_RULES,
      ...GIT_CHECKOUT_FORCE_RULES,
      ...GIT_PUSH_RESTRICTED_RULES,
      ...GH_PR_CREATE_RESTRICTED_RULES,
      ...GH_PR_EDIT_RESTRICTED_RULES,
    ]),
    ...toPowerShellRules(GH_PR_CREATE_BASE_RULES),
    ...emptyList(),
  ];
  SLACK_POST_INSTRUCTIONS = `

5. After creating/updating the PR, check if the user's CLAUDE.md mentions posting to Slack channels. If it does, use ToolSearch to search for "slack send message" tools. If ToolSearch finds a Slack tool, ask the user if they'd like you to post the PR URL to the relevant Slack channel. Only post if the user confirms. If ToolSearch returns no results or errors, skip this step silently\u2014do not mention the failure, do not attempt workarounds, and do not try alternative approaches.`;
});
//@ chunk-5xgkngpb.js:1764478-1767895 fingerprint (2.1.88 match: getPromptContent, 0.482)
/**
 * getPromptContent：同旧版 commit-push-pr getPromptContent。
 */
function getPromptContent(
  defaultBranch,
  commitTrailer,
  { commit, pr: defaultPrAttribution },
  prAttributionTrailer,
) {
  let commitAttr = escapeShellBangs(commit);
  let effectivePrAttribution = escapeShellBangs(prAttributionTrailer ?? defaultPrAttribution);
  let safeUser = sanitizeUsername(env.SAFEUSER || "");
  let username = sanitizeUsername(env.USER || "");
  let prHeader = "";
  let prBody = "";
  let prefix = "";
  let templateBlock = untrustedPrTemplateBlock();
  let templateSuffix =
    templateBlock && isBashAvailable()
      ? `
${templateBlock}`
      : "";
  return `## Context

- \`SAFEUSER\`: ${safeUser}
- \`whoami\`: ${username}
- \`git status\`: !\`git status\`
- \`git diff HEAD\`: !\`git diff HEAD\`
- \`git branch --show-current\`: !\`git branch --show-current\`
- \`git diff ${defaultBranch}...HEAD\`: !\`git diff ${defaultBranch}...HEAD\`
- \`gh pr view --json number\`: !\`${isBashAvailable() ? "gh pr view --json number 2>/dev/null || true" : 'gh pr view --json number 2>$null; if (-not $?) { "" }'}\`${templateSuffix}

## Git Safety Protocol

- NEVER update the git config
- NEVER run destructive/irreversible git commands (like push --force, hard reset, etc) unless the user explicitly requests them
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER run force push to main/master, warn the user if they request it
- Do not commit files that likely contain secrets (.env, credentials.json, etc)
- Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported
- When staging files, add specific files by name rather than using "git add -A" or "git add ." \u2014 bulk adds can accidentally include sensitive files (.env, credentials) or large binaries

## Your task

Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request from the git diff ${defaultBranch}...HEAD output above).

Based on the above changes:
1. Create a new branch if on ${defaultBranch} (use SAFEUSER from context above for the branch name prefix, falling back to whoami if SAFEUSER is empty, e.g., \`username/feature-name\`)
2. Create a single commit with an appropriate message${commitAttr ? ", ending with the attribution text shown in the example below" : ""}, passed inline as shown (\`-F\`/\`--file\` is refused while this skill runs):
${
  isBashAvailable()
    ? `\`\`\`
git commit -m "$(cat <<'EOF'
Commit message here.${
        commitAttr
          ? `

${commitAttr}`
          : ""
      }
EOF
)"
\`\`\``
    : `\`\`\`
git commit -m @'
Commit message here.${
        commitAttr
          ? `

${commitAttr}`
          : ""
      }
'@
\`\`\`
The closing \`'@\` MUST be at column 0 with no leading whitespace.`
}
3. Push the branch to the repo's remote (usually \`origin\`; use the remote this repo is actually configured with)
4. If a PR already exists for this branch (check the gh pr view output above), update the PR title and body using \`gh pr edit --title "..." --body "..."\` with NO PR number/URL selector (gh resolves the current branch's PR when no selector is given) to reflect the current diff${prBody}. Otherwise, create a pull request using \`gh pr create\` with the multi-line body syntax shown below${prHeader}; the body goes inline, never \`--body-file\`/\`-F\` (refused while this skill runs).
   - IMPORTANT: Keep PR titles short (under 70 characters). Use the body for details.
   - ${AT_MENTION_GUIDANCE}${prBodyGuidanceBullets(templateSuffix ? "embedded_context" : null)}
${
  isBashAvailable()
    ? `\`\`\`
gh pr create --title "Short, descriptive title" --body "$(cat <<'EOF'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${prefix}${
        effectivePrAttribution
          ? `

${effectivePrAttribution}`
          : ""
      }
EOF
)"
\`\`\``
    : `\`\`\`
gh pr create --title "Short, descriptive title" --body @'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${prefix}${
        effectivePrAttribution
          ? `

${effectivePrAttribution}`
          : ""
      }
'@
\`\`\``
}

You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message.${SLACK_POST_INSTRUCTIONS}

Return the PR URL when you're done, so the user can see it.`;
}
//@ chunk-5xgkngpb.js:1767895-1768550 fingerprint (2.1.88 match: command, 0.755)
/**
 * /commit-push-pr 命令对象（prompt）；描述：Commit, push, and open a PR。
 */
var commitPushPrCommandDefinition; // deferred: uses COMMIT_PUSH_PR_BASH_RULES of its import cycle while loading; runs once the cycle is complete
var internalCmdB;
deferInit("chunk-5xgkngpb.js:1767895", () => {
  commitPushPrCommandDefinition = {
    type: "prompt",
    name: COMMIT_PUSH_PR,
    description: "Commit, push, and open a PR",
    allowedTools: COMMIT_PUSH_PR_ALLOWED_TOOLS,
    getAllowedTools: getCommitPushPrAllowedTools,
    disallowedTools: COMMIT_PUSH_PR_BASH_RULES,
    get contentLength() {
      return getPromptContent("main", false, {
        commit: "",
        pr: "",
      }).length;
    },
    progressMessage: "creating commit and PR",
    source: "builtin",
    async getPromptForCommand(args, context) {
      let override = promptOverride();
      if (override?.type === "prompt") return override.getPromptForCommand(args, context);
      logPrGuidanceRendered("commit_push_pr");
      let [defaultBranch, prAttribution, prAttributionTrailer] = await Promise.all([
        getDefaultBranch(),
        buildSessionAttributionTexts(),
        buildPRAttributionTrailer(context.getAppState, context.storageV5),
      ]);
      let defaultBranch_2 = isSafeRefName_2(defaultBranch) ? defaultBranch : "main";
      let promptContent = getPromptContent(
        defaultBranch_2,
        commitTrailerFlag() !== null,
        prAttribution,
        prAttributionTrailer,
      );
      let trimmedArgs = args?.trim();
      if (trimmedArgs)
        promptContent += `

## Additional instructions from user

${escapeShellBangs(trimmedArgs)}`;
      return [
        {
          type: "text",
          text: await executeShellCommandsInPrompt(
            promptContent,
            {
              ...context,
              getAppState: withCommandAllowRules(context, COMMIT_PUSH_PR_ALLOWED_TOOLS),
            },
            `/${COMMIT_PUSH_PR}`,
          ),
        },
      ];
    },
  };
  internalCmdB = commitPushPrCommandDefinition;
});
//@ chunk-5xgkngpb.js:1768550-1768606 affinity
function sanitizeUsername(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "");
}
export { internalCmdB };
