/**
 * commands/commit.ts
 *
 * 并入已有模块：/commit 命令的提示片段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/commit.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ne2890fx.js (3), chunk-z20c443b.js (1)
 * attribution: placement 3, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  CERTIFIED_GIT_ADD,
  CERTIFIED_GIT_STATUS,
  CERTIFIED_GIT_COMMIT,
} from "../tools/BashTool/certifiedCommands.js";
import { toPowerShellRules } from "../utils/git.js";
import {
  bashAndPowerShellRules,
  GIT_ADD_FORCE_RULES,
  GIT_COMMIT_FILE_ARG_RULES,
} from "../utils/permissions/gitCommandRules.js";
import { buildSessionAttributionTexts } from "../utils/attribution.js";
import { escapeShellBangs, executeShellCommandsInPrompt } from "../utils/promptShellExecution.js";
import { commitMessageGuidance } from "../utils/gitCommitGuidance.js";
import { isBashAvailable } from "../utils/shell/shellToolUtils.js";
import { registerBundledSkill } from "../skills/bundledSkills.js";
import { COMMIT } from "../skills/bundled/bundledSkillNames.js";
import { isCommitSkillRolloutOn } from "../services/projectsRelay/relayGates.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:420887-420957 placement
function hasCommitOrPrArg(args) {
  return args !== undefined && (args.commit !== undefined || args.pr !== undefined);
}
//@ chunk-5xgkngpb.js:1763310-1763334 placement
/**
 * getExtraCommitTools：构建期返回 []。
 */
function emptyList() {
  return [];
}
//@ chunk-ne2890fx.js:95447-95600 placement
var COMMIT_GIT_COMMANDS; // deferred: uses toPowerShellRules (../utils/git.js) of its import cycle while loading; runs once the cycle is complete
var COMMIT_ALLOWED_TOOLS;
var COMMIT_ALLOWED_TOOLS_2;
deferInit("chunk-ne2890fx.js:95447", () => {
  COMMIT_GIT_COMMANDS = ["git add *", "git status *", "git commit -m *"];
  COMMIT_ALLOWED_TOOLS = [
    `Bash(${CERTIFIED_GIT_ADD})`,
    `Bash(${CERTIFIED_GIT_STATUS})`,
    `Bash(${CERTIFIED_GIT_COMMIT})`,
    ...toPowerShellRules(COMMIT_GIT_COMMANDS),
  ];
  COMMIT_ALLOWED_TOOLS_2 = [
    ...bashAndPowerShellRules([...GIT_ADD_FORCE_RULES, ...GIT_COMMIT_FILE_ARG_RULES]),
    ...emptyList(),
  ];
});
//@ chunk-ne2890fx.js:95600-98939 layout
/**
 * getCommitPromptContent：/commit 内建技能提示词。
 */
async function getCommitPromptContent(guidance) {
  let { commit } = await buildSessionAttributionTexts();
  let commitAttr = escapeShellBangs(commit);
  let guidanceText = escapeShellBangs(guidance.trim());
  return `## Context

- Current git status: !\`git status\`
- Current git diff (staged and unstaged changes): !\`git diff HEAD\`
- Current branch: !\`git branch --show-current\`
- Recent commits: !\`git log --oneline -10\`
${
  guidanceText
    ? `
User guidance for this commit: ${guidanceText}
`
    : ""
}
## Git Safety Protocol

- NEVER update the git config
- NEVER run destructive git commands (push --force, reset --hard, checkout ., restore ., clean -f, branch -D) unless the user explicitly requests these actions
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER force push to main/master; warn the user if they request it
- CRITICAL: Always create NEW commits rather than amending, unless the user explicitly requests a git amend. When a pre-commit hook fails, the commit did NOT happen \u2014 so --amend would modify the PREVIOUS commit, which may result in destroying work or losing previous changes. Instead, after hook failure, fix the issue, re-stage, and create a NEW commit
- When staging files, prefer adding specific files by name rather than using "git add -A" or "git add .", which can accidentally include sensitive files (.env, credentials) or large binaries
- Do not commit files that likely contain secrets (.env, credentials.json, etc). Warn the user if they specifically request to commit those files
- If there are no changes to commit (i.e., no untracked files and no modifications), do not create an empty commit
- Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported
- DO NOT push to the remote repository unless the user explicitly asks you to

## Your task

Based on the above changes, create a single git commit:

1. Analyze the changes and draft a commit message:
   - Look at the recent commits above to follow this repository's commit message style
   - Summarize the nature of the changes (new feature, enhancement, bug fix, refactoring, test, docs, etc.)
   - Ensure the message accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.)
   - Draft a concise (1-2 sentences) commit message that focuses on the "why" rather than the "what"${commitMessageGuidance()}

2. Stage the relevant files and create the commit. To ensure good formatting, ALWAYS pass the commit message inline via a ${isBashAvailable() ? "HEREDOC" : "here-string"}, never from a file or template (\`-F\`, \`--file\` and \`-t\` are refused while this skill runs):
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

3. Run git status after the commit completes to verify it succeeded.

4. If the commit fails due to a pre-commit hook: fix the issue, re-stage, and create a NEW commit. Never use --amend or --no-verify to get past a failing hook.

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not run additional commands to read or explore code beyond the git context above, and do not use any non-git tools for this task.`;
}
//@ chunk-ne2890fx.js:98939-99595 fingerprint (2.1.88 match: command, 0.439)
function command() {
  registerBundledSkill({
    name: COMMIT,
    menuDescription: "Create a git commit",
    description:
      "Create a git commit. Use whenever you are about to create a commit, whether the user asked for one or it is a step in your current task \u2014 it gathers git context and applies the required commit workflow (message style, staging rules, attribution).",
    argumentHint: "[guidance]",
    allowedTools: COMMIT_ALLOWED_TOOLS,
    disallowedTools: COMMIT_ALLOWED_TOOLS_2,
    userInvocable: true,
    isEnabled: () => isCommitSkillRolloutOn(),
    progressMessage: "creating commit",
    async getPromptForCommand(args, context) {
      let commitPromptContent = await getCommitPromptContent(args);
      return [
        {
          type: "text",
          text: await executeShellCommandsInPrompt(
            commitPromptContent,
            {
              ...context,
              permissionLayers: [
                ...(context.permissionLayers ?? []),
                {
                  kind: "allowed_tools",
                  allowedTools: COMMIT_ALLOWED_TOOLS,
                },
              ],
            },
            `/${COMMIT}`,
          ),
        },
      ];
    },
  });
}
export { hasCommitOrPrArg, emptyList, command };
