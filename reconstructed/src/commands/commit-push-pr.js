/**
 * commands/commit-push-pr.ts
 *
 * /commit-push-pr 提示词命令（内部）：允许的 git/gh 工具、Slack 发帖工具与提示词正文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/commit-push-pr.ts
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: affinity 2, fingerprint 3, layout 2
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
  Njr,
} from "../tools/BashTool/certifiedCommands.js";
import {
  toPowerShellRules,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  getDefaultBranch,
} from "../utils/git.js";
import {
  bashAndPowerShellRules,
  PMn,
  GIT_COMMIT_FILE_ARG_RULES,
  xMn,
  AMn,
  CMn,
  Fhs,
  RMn,
} from "../utils/permissions/gitCommandRules.js";
import { xM, executeShellCommandsInPrompt, withCommandAllowRules } from "../utils/promptShellExecution.js";
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
import { CSt, buildPRAttributionTrailer } from "../utils/attribution.js";
import { isSafeRefName as isSafeRefName_2 } from "../utils/git/safeRefName.js";

/**
 * getCoAuthorTrailer：构建期返回 null。
 */
//@ chunk-e6aww6q8.js:1688101-1688129 affinity
function YZt(e) {
  return null;
}
/**
 * SLACK_POST_TOOLS：ToolSearch + slack send_message 工具。
 */
//@ chunk-e6aww6q8.js:1688129-1688492 fingerprint = ALLOWED_TOOLS (0.439)
var COMMIT_PUSH_PR_TOOLS = [
    CERTIFIED_GIT_CHECKOUT_B,
    CERTIFIED_GIT_ADD,
    CERTIFIED_GIT_STATUS,
    CERTIFIED_GIT_COMMIT,
    CERTIFIED_GH_PR_CREATE,
    CERTIFIED_GH_PR_EDIT,
    CERTIFIED_GH_PR_VIEW,
  ],
  SLACK_POST_TOOLS = ["ToolSearch", "mcp__slack__send_message", "mcp__claude_ai_Slack__slack_send_message"],
  COMMIT_PUSH_PR_GIT_COMMANDS = [
    "git checkout -b *",
    "git add *",
    "git status *",
    "git commit -m *",
    "gh pr create --title * --body *",
    "gh pr edit --title * --body *",
    "gh pr view *",
  ],
  buildAllowedTools = (e, n) => [...e.map((r) => `Bash(${r})`), ...toPowerShellRules(n), ...SLACK_POST_TOOLS],
  COMMIT_PUSH_PR_ALLOWED_TOOLS = buildAllowedTools(
    [...COMMIT_PUSH_PR_TOOLS, CERTIFIED_GIT_PUSH_ORIGIN],
    COMMIT_PUSH_PR_GIT_COMMANDS,
  );
/**
 * getCommitPushPrAllowedTools：按 git remote 动态生成 push 规则。
 */
//@ chunk-e6aww6q8.js:1688492-1688611 layout
async function getCommitPushPrAllowedTools() {
  let e = await getGitPushRemotes(),
    filtered = e.map(Njr).filter((r) => r !== null);
  return buildAllowedTools(
    [...COMMIT_PUSH_PR_TOOLS, ...filtered],
    [...COMMIT_PUSH_PR_GIT_COMMANDS, ...gitPushShellPatternsForRemotes(e)],
  );
}
//@ chunk-e6aww6q8.js:1688611-1689179 layout
var COMMIT_PUSH_PR_DISALLOWED_TOOLS = [
    ...bashAndPowerShellRules([...PMn, ...GIT_COMMIT_FILE_ARG_RULES, ...xMn, ...AMn, ...CMn, ...Fhs]),
    ...toPowerShellRules(RMn),
  ],
  SLACK_POST_INSTRUCTIONS = `

5. After creating/updating the PR, check if the user's CLAUDE.md mentions posting to Slack channels. If it does, use ToolSearch to search for "slack send message" tools. If ToolSearch finds a Slack tool, ask the user if they'd like you to post the PR URL to the relevant Slack channel. Only post if the user confirms. If ToolSearch returns no results or errors, skip this step silently\u2014do not mention the failure, do not attempt workarounds, and do not try alternative approaches.`;
/**
 * getPromptContent：同旧版 commit-push-pr getPromptContent。
 */
//@ chunk-e6aww6q8.js:1689179-1692593 fingerprint = getPromptContent (0.482)
function getPromptContent(e, n, { commit: commit, pr: pr }, h) {
  let y = xM(commit),
    S = xM(h ?? pr),
    w = sanitizeUsername(env.SAFEUSER || ""),
    L = sanitizeUsername(env.USER || ""),
    G = "",
    q = "",
    prefix = "",
    Se = untrustedPrTemplateBlock(),
    ke =
      Se && isBashAvailable()
        ? `
${Se}`
        : "";
  return `## Context

- \`SAFEUSER\`: ${w}
- \`whoami\`: ${L}
- \`git status\`: !\`git status\`
- \`git diff HEAD\`: !\`git diff HEAD\`
- \`git branch --show-current\`: !\`git branch --show-current\`
- \`git diff ${e}...HEAD\`: !\`git diff ${e}...HEAD\`
- \`gh pr view --json number\`: !\`${isBashAvailable() ? "gh pr view --json number 2>/dev/null || true" : 'gh pr view --json number 2>$null; if (-not $?) { "" }'}\`${ke}

## Git Safety Protocol

- NEVER update the git config
- NEVER run destructive/irreversible git commands (like push --force, hard reset, etc) unless the user explicitly requests them
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER run force push to main/master, warn the user if they request it
- Do not commit files that likely contain secrets (.env, credentials.json, etc)
- Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported
- When staging files, add specific files by name rather than using "git add -A" or "git add ." \u2014 bulk adds can accidentally include sensitive files (.env, credentials) or large binaries

## Your task

Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request from the git diff ${e}...HEAD output above).

Based on the above changes:
1. Create a new branch if on ${e} (use SAFEUSER from context above for the branch name prefix, falling back to whoami if SAFEUSER is empty, e.g., \`username/feature-name\`)
2. Create a single commit with an appropriate message${y ? ", ending with the attribution text shown in the example below" : ""}, passed inline as shown (\`-F\`/\`--file\` is refused while this skill runs):
${
  isBashAvailable()
    ? `\`\`\`
git commit -m "$(cat <<'EOF'
Commit message here.${
        y
          ? `

${y}`
          : ""
      }
EOF
)"
\`\`\``
    : `\`\`\`
git commit -m @'
Commit message here.${
        y
          ? `

${y}`
          : ""
      }
'@
\`\`\`
The closing \`'@\` MUST be at column 0 with no leading whitespace.`
}
3. Push the branch to the repo's remote (usually \`origin\`; use the remote this repo is actually configured with)
4. If a PR already exists for this branch (check the gh pr view output above), update the PR title and body using \`gh pr edit --title "..." --body "..."\` with NO PR number/URL selector (gh resolves the current branch's PR when no selector is given) to reflect the current diff${q}. Otherwise, create a pull request using \`gh pr create\` with the multi-line body syntax shown below${G}; the body goes inline, never \`--body-file\`/\`-F\` (refused while this skill runs).
   - IMPORTANT: Keep PR titles short (under 70 characters). Use the body for details.
   - ${AT_MENTION_GUIDANCE}${prBodyGuidanceBullets(ke ? "embedded_context" : null)}
${
  isBashAvailable()
    ? `\`\`\`
gh pr create --title "Short, descriptive title" --body "$(cat <<'EOF'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${prefix}${
        S
          ? `

${S}`
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
        S
          ? `

${S}`
          : ""
      }
'@
\`\`\``
}

You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message.${SLACK_POST_INSTRUCTIONS}

Return the PR URL when you're done, so the user can see it.`;
}
/**
 * /commit-push-pr 命令对象（prompt）；描述：Commit, push, and open a PR。
 */
//@ chunk-e6aww6q8.js:1692593-1693180 fingerprint = command (0.755)
var commitPushPrCommandDefinition = {
    type: "prompt",
    name: COMMIT_PUSH_PR,
    description: "Commit, push, and open a PR",
    allowedTools: COMMIT_PUSH_PR_ALLOWED_TOOLS,
    getAllowedTools: getCommitPushPrAllowedTools,
    disallowedTools: COMMIT_PUSH_PR_DISALLOWED_TOOLS,
    get contentLength() {
      return getPromptContent("main", !1, { commit: "", pr: "" }).length;
    },
    progressMessage: "creating commit and PR",
    source: "builtin",
    async getPromptForCommand(args, context) {
      logPrGuidanceRendered("commit_push_pr");
      let [r, s, h] = await Promise.all([
          getDefaultBranch(),
          CSt(),
          buildPRAttributionTrailer(context.getAppState, context.storageV5),
        ]),
        y = isSafeRefName_2(r) ? r : "main",
        S = getPromptContent(y, YZt() !== null, s, h),
        w = args?.trim();
      if (w)
        S += `

## Additional instructions from user

${xM(w)}`;
      return [
        {
          type: "text",
          text: await executeShellCommandsInPrompt(
            S,
            { ...context, getAppState: withCommandAllowRules(context, COMMIT_PUSH_PR_ALLOWED_TOOLS) },
            `/${COMMIT_PUSH_PR}`,
          ),
        },
      ];
    },
  },
  commitPushPrCommand = commitPushPrCommandDefinition;
//@ chunk-e6aww6q8.js:1693180-1693236 affinity
function sanitizeUsername(e) {
  return e.replace(/[^a-zA-Z0-9._-]/g, "");
}

export { commitPushPrCommand };
