/**
 * skills/bundled/_new/getSkillifyPrompt.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (12)
 * attribution: sole-consumer-new 12
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
  Njr,
} from "../../../tools/BashTool/certifiedCommands.js";
import {
  toPowerShellRules,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  getDefaultBranch,
} from "../../../utils/git.js";
import {
  bashAndPowerShellRules,
  $hs,
  xMn,
  AMn,
  CMn,
  RMn,
} from "../../../utils/permissions/gitCommandRules.js";
import { at } from "../../../commands/commit.js";
import { xM, executeShellCommandsInPrompt } from "../../../utils/promptShellExecution.js";
import {
  untrustedPrTemplateBlock,
  AT_MENTION_GUIDANCE,
  prBodyGuidanceBullets,
  prSummaryPlaceholder,
  prTestPlanPlaceholder,
  logPrGuidanceRendered,
} from "../../../utils/gitCommitGuidance.js";
import { isBashAvailable } from "../../../utils/shell/shellToolUtils.js";
import { registerBundledSkill } from "../../bundledSkills.js";
import { JSn, SIMPLIFY } from "../bundledSkillNames.js";
import { isCommitSkillRolloutOn } from "../../../services/projectsRelay/relayGates.js";
import { smn } from "../../../services/mcp/mcpAccountKey.js";
import { getProjectRoot } from "../../../bootstrap/state.js";
import { buildPRAttributionTrailer } from "../../../utils/attribution.js";
import {
  REVIEW_PHASE0_GATHER_DIFF,
  me,
  Z,
  oe,
  ne,
  canSpawnReviewAgents,
} from "../../../commands/review/reviewAngles.js";
import { AGENT } from "../../../tools/AgentTool/constants.js";

/**
 * 创建 PR skill 的工具清单：基础工具名 PR_SKILL_BASE_TOOLS、只读 git/gh 命令模式 PR_SKILL_BASH_PATTERNS；toBashPermissionRules 把命令包成 Bash(...) 规则，合成 PR_SKILL_ALLOWED_TOOLS。
 */
//@ chunk-hantmvxa.js:183579-183843 sole-consumer-new
var PR_SKILL_BASE_TOOLS = [
    CERTIFIED_GIT_STATUS,
    CERTIFIED_GIT_LOG,
    CERTIFIED_GIT_DIFF,
    CERTIFIED_GIT_BRANCH_SHOW_CURRENT,
    CERTIFIED_GIT_CHECKOUT_B,
    CERTIFIED_GH_PR_CREATE,
    CERTIFIED_GH_PR_VIEW,
  ],
  PR_SKILL_BASH_PATTERNS = [
    "git status *",
    "git log --oneline *",
    "git diff origin/*",
    "git branch --show-current",
    "git checkout -b *",
    "gh pr create --title * --body *",
    "gh pr view *",
  ],
  toBashPermissionRules = (e) => e.map((n) => `Bash(${n})`),
  PR_SKILL_ALLOWED_TOOLS = [
    ...toBashPermissionRules([...PR_SKILL_BASE_TOOLS, CERTIFIED_GIT_PUSH_ORIGIN]),
    ...toPowerShellRules(PR_SKILL_BASH_PATTERNS),
  ];
/**
 * 异步计算创建 PR skill 的允许工具：固定工具 + 运行时探测到的额外 Bash 规则。
 */
//@ chunk-hantmvxa.js:183843-183970 sole-consumer-new
async function getPrSkillAllowedTools() {
  let e = await getGitPushRemotes(),
    filtered = e.map(Njr).filter((s) => s !== null);
  return [
    ...toBashPermissionRules([...PR_SKILL_BASE_TOOLS, ...filtered]),
    ...toPowerShellRules([...PR_SKILL_BASH_PATTERNS, ...gitPushShellPatternsForRemotes(e)]),
  ];
}
//@ chunk-hantmvxa.js:183970-184037 sole-consumer-new
var PR_SKILL_DISALLOWED_TOOLS = [
  ...bashAndPowerShellRules([...$hs, ...xMn, ...AMn, ...CMn]),
  ...toPowerShellRules(RMn),
  ...at(),
];
/**
 * 生成创建 PR skill 的提示词：用 !`git …` 注入当前状态、分支、提交与 diff，附用户指导、Git 安全协议和 gh pr create HEREDOC 模板。
 */
//@ chunk-hantmvxa.js:184037-186209 sole-consumer-new
function buildCreatePrPrompt(e, n, s, r) {
  let h = xM(r),
    y = xM(e.trim()),
    w = null,
    b = untrustedPrTemplateBlock(),
    k =
      b && isBashAvailable()
        ? `
${b}`
        : "";
  return `## Context

- Current git status: !\`git status\`
- Current branch: !\`git branch --show-current\`
- Commits since origin/${n}: !\`git log --oneline origin/${n}..HEAD\`
- Full diff vs origin/${n}: !\`git diff origin/${n}...HEAD\`${k}
${
  y
    ? `
User guidance for this PR: ${y}
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
  w
    ? `
${w}
`
    : ""
}
## Your task

Based on the changes above, open a single pull request:

1. Analyze ALL changes that will be included in the PR (every commit since ${n}, not just the latest), then draft a title and body:
   - Keep the title short (under 70 characters); put detail in the body
   - ${AT_MENTION_GUIDANCE}${prBodyGuidanceBullets(k ? "embedded_context" : null)}

2. Create a new branch if currently on ${n}, push to remote with -u if needed, then create the PR. To ensure good formatting, ALWAYS pass the body inline via a ${isBashAvailable() ? "HEREDOC" : "here-string"}, never from a file or stdin (\`--body-file\`/\`-F\`, even \`--body-file -\`, is refused while this skill runs):
${
  isBashAvailable()
    ? `\`\`\`
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
${prSummaryPlaceholder()}

## Test plan
${prTestPlanPlaceholder()}${
        h
          ? `

${h}`
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
        h
          ? `

${h}`
          : ""
      }
'@
\`\`\`
The closing \`'@\` MUST be at column 0 with no leading whitespace.`
}

3. Return the PR URL when you're done, so the user can see it.

You have the capability to call multiple tools in a single response. Branch, push, and create the PR using a single message. Do not run additional commands to read or explore code beyond the git context above, and do not use any non-git tools for this task.`;
}
/**
 * 注册"Create a pull request"bundled skill：限定允许/禁止的工具集，开关满足才启用，参数作为 PR 指导。
 */
//@ chunk-hantmvxa.js:186209-187055 sole-consumer-new
function registerCreatePrSkill() {
  registerBundledSkill({
    name: JSn,
    menuDescription: "Create a pull request",
    description:
      "Create a GitHub pull request. Use whenever you are about to open a PR, whether the user asked for one or it is a step in your current task \u2014 it gathers branch context and applies the required PR workflow (gh CLI, title/body format, attribution).",
    argumentHint: "[guidance]",
    allowedTools: PR_SKILL_ALLOWED_TOOLS,
    getAllowedTools: getPrSkillAllowedTools,
    disallowedTools: PR_SKILL_DISALLOWED_TOOLS,
    userInvocable: !0,
    isEnabled: () => isCommitSkillRolloutOn(),
    progressMessage: "creating pull request",
    async getPromptForCommand(e, n) {
      logPrGuidanceRendered("pr_skill");
      let [s, r] = await Promise.all([
          smn(getProjectRoot(), n.storageV5),
          buildPRAttributionTrailer(n.getAppState, n.storageV5),
        ]),
        h = await getDefaultBranch(),
        y = /^[A-Za-z0-9._/+][A-Za-z0-9._/+-]*$/.test(h) ? h : "main",
        w = buildCreatePrPrompt(e, y, s, r);
      return [
        {
          type: "text",
          text: await executeShellCommandsInPrompt(
            w,
            {
              ...n,
              permissionLayers: [
                ...(n.permissionLayers ?? []),
                { kind: "allowed_tools", allowedTools: PR_SKILL_ALLOWED_TOOLS },
              ],
            },
            `/${JSn}`,
          ),
        },
      ];
    },
  });
}
//@ chunk-hantmvxa.js:187055-187076 sole-consumer-new
function sn() {
  return;
}
//@ chunk-hantmvxa.js:187076-189778 sole-consumer-new
var SIMPLIFY_AGENTS_PROMPT = `\`/simplify \u2192 4 cleanup agents in parallel \u2192 apply the fixes\`

You are improving the quality of the changed code, not hunting for bugs. Review
it for reuse, simplification, efficiency, and altitude issues, then fix what you
find. Do not look for correctness bugs \u2014 that is what \`/code-review\` is for.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Review (4 cleanup agents in parallel)

Launch **4 independent review agents** via the ${AGENT} tool, all in a
single message so they run concurrently. Pass each agent the diff and one of
the four angles below. Each returns its findings with \`file\`, \`line\`, a
one-line \`summary\`, and the concrete cost (what is duplicated, wasted, or
harder to maintain).

### Reuse

${me}
${Z}
${oe}
${ne}
## Phase 2 \u2014 Apply the fixes

Wait for all four agents to complete, dedup findings that point at the same
line or mechanism, and fix each remaining one directly. Skip any finding whose
fix would change intended behavior, require changes well outside the reviewed
diff, or that you judge to be a false positive \u2014 note the skip rather than
arguing with it. Finish with a brief summary of what was fixed and what was
skipped (or confirm the code was already clean).
`,
  zi = `\`/simplify \u2192 ${AGENT} tool unavailable \u2192 single-pass inline cleanup \u2192 apply the fixes\`

You are improving the quality of the changed code, not hunting for bugs. Review
it for reuse, simplification, efficiency, and altitude issues, then fix what you
find. Do not look for correctness bugs \u2014 that is what \`/code-review\` is for.

The ${AGENT} tool isn't available in this context, so the usual
4-agent fan-out can't run. Work through all four angles below yourself, in
this same context, in one pass \u2014 do not skip an angle for lack of fan-out.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Review (4 cleanup angles, single pass)

Review the diff against each angle below in turn. For each, note findings with
\`file\`, \`line\`, a one-line \`summary\`, and the concrete cost (what is
duplicated, wasted, or harder to maintain).

### Reuse

${me}
${Z}
${oe}
${ne}
## Phase 2 \u2014 Apply the fixes

Dedup findings that point at the same line or mechanism, and fix each
remaining one directly. Skip any finding whose fix would change intended
behavior, require changes well outside the reviewed diff, or that you judge to
be a false positive \u2014 note the skip rather than arguing with it. Finish with a
brief summary of what was fixed and what was skipped (or confirm the code was
already clean). State clearly in your summary that this was a single-pass
review done without the ${AGENT} tool, not the full 4-agent
fan-out, so whoever reads it isn't misled about what actually ran.
`;
/**
 * 注册 simplify skill（"Clean up the changed code without changing behavior"）：按会话能否派子代理选 4 代理并行版或单代理版提示词，参数是审查目标。
 */
//@ chunk-hantmvxa.js:189778-190259 sole-consumer-new
function registerSimplifySkill() {
  registerBundledSkill({
    name: SIMPLIFY,
    menuDescription: "Clean up the changed code without changing behavior",
    description:
      "Review the changed code for reuse, simplification, efficiency, and altitude cleanups, then apply the fixes. Quality only \u2014 it does not hunt for bugs; use /code-review for that.",
    argumentHint: "[<target>]",
    userInvocable: !0,
    async getPromptForCommand(e, n) {
      let trimmed = e.trim(),
        r = trimmed
          ? `Review target: \`${trimmed}\`

`
          : "",
        h = "",
        y = canSpawnReviewAgents(n) ? SIMPLIFY_AGENTS_PROMPT : zi;
      return [{ type: "text", text: `${r}${h}${y}` }];
    },
  });
}
//@ chunk-hantmvxa.js:190259-197617 sole-consumer-new
function getSkillifyPrompt() {
  return `# Skillify {{userDescriptionBlock}}

You are capturing this session's repeatable process as a reusable skill.

Review the conversation above \u2014 it is your source material. Pay particular attention to the user's messages (how they steered and corrected the process) and the tools/commands that were actually used.

## Your Task

### Step 1: Analyze the Session

Before asking any questions, analyze the session to identify:
- What repeatable process was performed
- What the inputs/parameters were
- The distinct steps (in order)
- The success artifacts/criteria (e.g. not just "writing code," but "an open PR with CI fully passing") for each step
- Where the user corrected or steered you
- What tools and permissions were needed
- What agents were used
- What the goals and success artifacts were

### Step 2: Interview the User

You will use the AskUserQuestion to understand what the user wants to automate. Important notes:
- Use AskUserQuestion for ALL questions! Never ask questions via plain text.
- For each round, iterate as much as needed until the user is happy.
- The user always has a freeform "Other" option to type edits or feedback -- do NOT add your own "Needs tweaking" or "I'll provide edits" option. Just offer the substantive choices.

**Round 1: High level confirmation**
- Suggest a name and description for the skill based on your analysis. Ask the user to confirm or rename.
- Suggest high-level goal(s) and specific success criteria for the skill.

**Round 2: More details**
- Present the high-level steps you identified as a numbered list. Tell the user you will dig into the detail in the next round.
- If you think the skill will require arguments, suggest arguments based on what you observed. Make sure you understand what someone would need to provide.
- If it's not clear, ask if this skill should run inline (in the current conversation) or forked (as a sub-agent with its own context). Forked is better for self-contained tasks that don't need mid-process user input; inline is better when the user wants to steer mid-process.
- Ask where the skill should be saved. Suggest a default based on context (repo-specific workflows \u2192 repo, cross-repo personal workflows \u2192 user). Options:
  - **This repo** (\`.claude/skills/<name>/SKILL.md\`) \u2014 for workflows specific to this project
  - **Personal** (\`~/.claude/skills/<name>/SKILL.md\`) \u2014 follows you across all repos

**Round 3: Breaking down each step**
For each major step, if it's not glaringly obvious, ask:
- What does this step produce that later steps need? (data, artifacts, IDs)
- What proves that this step succeeded, and that we can move on?
- Should the user be asked to confirm before proceeding? (especially for irreversible actions like merging, sending messages, or destructive operations)
- Are any steps independent and could run in parallel? (e.g., posting to Slack and monitoring CI at the same time)
- How should the skill be executed? (e.g. always use a Task agent to conduct code review, or invoke an agent team for a set of concurrent steps)
- What are the hard constraints or hard preferences? Things that must or must not happen?

You may do multiple rounds of AskUserQuestion here, one round per step, especially if there are more than 3 steps or many clarification questions. Iterate as much as needed.

IMPORTANT: Pay special attention to places where the user corrected you during the session, to help inform your design.

**Round 4: Final questions**
- Confirm when this skill should be invoked, and suggest/confirm trigger phrases too. (e.g. For a cherrypick workflow you could say: Use when the user wants to cherry-pick a PR to a release branch. Examples: 'cherry-pick to release', 'CP this PR', 'hotfix.')
- You can also ask for any other gotchas or things to watch out for, if it's still unclear.

Stop interviewing once you have enough information. IMPORTANT: Don't over-ask for simple processes!

### Step 3: Write the SKILL.md

Create the skill directory and file at the location the user chose in Round 2.

Use this format:

\`\`\`markdown
---
name: {{skill-name}}
description: {{one-line description}}
allowed-tools:
  {{list of tool permission patterns observed during session}}
when_to_use: {{detailed description of when Claude should automatically invoke this skill, including trigger phrases and example user messages}}
argument-hint: "{{hint showing argument placeholders}}"
arguments:
  {{list of argument names}}
context: {{inline or fork -- omit for inline}}
---

# {{Skill Title}}
Description of skill

## Inputs
- \`$arg_name\`: Description of this input

## Goal
Clearly stated goal for this workflow. Best if you have clearly defined artifacts or criteria for completion.

## Steps

### 1. Step Name
What to do in this step. Be specific and actionable. Include commands when appropriate.

**Success criteria**: ALWAYS include this! This shows that the step is done and we can move on. Can be a list.

IMPORTANT: see the next section below for the per-step annotations you can optionally include for each step.

...
\`\`\`

**Per-step annotations**:
- **Success criteria** is REQUIRED on every step. This helps the model understand what the user expects from their workflow, and when it should have the confidence to move on.
- **Execution**: \`Direct\` (default), \`Task agent\` (straightforward subagents), \`Teammate\` (agent with true parallelism and inter-agent communication), or \`[human]\` (user does it). Only needs specifying if not Direct.
- **Artifacts**: Data this step produces that later steps need (e.g., PR number, commit SHA). Only include if later steps depend on it.
- **Human checkpoint**: When to pause and ask the user before proceeding. Include for irreversible actions (merging, sending messages), error judgment (merge conflicts), or output review.
- **Rules**: Hard rules for the workflow. User corrections during the reference session can be especially useful here.

**Step structure tips:**
- Steps that can run concurrently use sub-numbers: 3a, 3b
- Steps requiring the user to act get \`[human]\` in the title
- Keep simple skills simple -- a 2-step skill doesn't need annotations on every step

**Frontmatter rules:**
- \`allowed-tools\`: Minimum permissions needed (use patterns like \`Bash(gh *)\` not \`Bash\`)
- \`context\`: Only set \`context: fork\` for self-contained skills that don't need mid-process user input.
- \`when_to_use\` is CRITICAL -- tells the model when to auto-invoke. Start with "Use when..." and include trigger phrases. Example: "Use when the user wants to cherry-pick a PR to a release branch. Examples: 'cherry-pick to release', 'CP this PR', 'hotfix'."
- \`arguments\` and \`argument-hint\`: Only include if the skill takes parameters. Use \`$name\` in the body for substitution.

### Step 4: Confirm and Save

Before writing the file, output the complete SKILL.md content as a yaml code block in your response so the user can review it with proper syntax highlighting. Then ask for confirmation using AskUserQuestion with a simple question like "Does this SKILL.md look good to save?" \u2014 do NOT use the body field, keep the question concise.

After writing, tell the user:
- Where the skill was saved
- How to invoke it: \`/{{skill-name}} [arguments]\`
- That they can edit the SKILL.md directly to refine it
`;
}
//@ chunk-hantmvxa.js:197617-197638 sole-consumer-new
function rn() {
  return;
}
//@ chunk-hantmvxa.js:197638-201145 sole-consumer-new
var STUCK_SKILL_PROMPT =
  "# /stuck \u2014 diagnose frozen/slow Claude Code sessions\n\nThe user thinks another Claude Code session on this machine is frozen, stuck, or very slow. Investigate and post a report to #claude-code-feedback.\n\n## What to look for\n\nScan for other Claude Code processes (excluding the current one \u2014 PID is in `process.pid` but for shell commands just exclude the PID you see running this prompt). Process names are typically `claude` (installed) or `cli` (native dev build).\n\nSigns of a stuck session:\n- **High CPU (\u226590%) sustained** \u2014 likely an infinite loop. Sample twice, 1-2s apart, to confirm it's not a transient spike.\n- **Process state `D` (uninterruptible sleep)** \u2014 often an I/O hang. The `state` column in `ps` output; first character matters (ignore modifiers like `+`, `s`, `<`).\n- **Process state `T` (stopped)** \u2014 user probably hit Ctrl+Z by accident.\n- **Process state `Z` (zombie)** \u2014 parent isn't reaping.\n- **Very high RSS (\u22654GB)** \u2014 possible memory leak making the session sluggish.\n- **Stuck child process** \u2014 a hung `git`, `node`, or shell subprocess can freeze the parent. Check `pgrep -lP <pid>` for each session.\n\n## Investigation steps\n\n1. **List all Claude Code processes** (macOS/Linux):\n   ```\n   ps -axo pid=,pcpu=,rss=,etime=,state=,comm=,command= | grep -E '(claude|cli)' | grep -v grep\n   ```\n   Filter to rows where `comm` is `claude` or (`cli` AND the command path contains \"claude\").\n\n2. **For anything suspicious**, gather more context:\n   - Child processes: `pgrep -lP <pid>`\n   - If high CPU: sample again after 1-2s to confirm it's sustained\n   - If a child looks hung (e.g., a git command), note its full command line with `ps -p <child_pid> -o command=`\n   - Check the session's debug log if you can infer the session ID: `~/.claude/debug/<session-id>.txt` (the last few hundred lines often show what it was doing before hanging)\n\n3. **Consider a stack dump** for a truly frozen process (advanced, optional):\n   - macOS: `sample <pid> 3` gives a 3-second native stack sample\n   - This is big \u2014 only grab it if the process is clearly hung and you want to know *why*\n\n## Report\n\n**Only post to Slack if you actually found something stuck.** If every session looks healthy, tell the user that directly \u2014 do not post an all-clear to the channel.\n\nIf you did find a stuck/slow session, post to **#claude-code-feedback** (channel ID: `C07VBSHV7EV`) using the Slack MCP tool. Use ToolSearch to find `slack_send_message` if it's not already loaded.\n\n**Use a two-message structure** to keep the channel scannable:\n\n1. **Top-level message** \u2014 one short line: hostname, Claude Code version, and a terse symptom (e.g. \"session PID 12345 pegged at 100% CPU for 10min\" or \"git subprocess hung in D state\"). No code blocks, no details.\n2. **Thread reply** \u2014 the full diagnostic dump. Pass the top-level message's `ts` as `thread_ts`. Include:\n   - PID, CPU%, RSS, state, uptime, command line, child processes\n   - Your diagnosis of what's likely wrong\n   - Relevant debug log tail or `sample` output if you captured it\n\nIf Slack MCP isn't available, format the report as a message the user can copy-paste into #claude-code-feedback (and let them know to thread the details themselves).\n\n## Notes\n- Don't kill or signal any processes \u2014 this is diagnostic only.\n- If the user gave an argument (e.g., a specific PID or symptom), focus there first.\n";
//@ chunk-hantmvxa.js:201145-201166 sole-consumer-new
function ln() {
  return;
}

export { rn, sn, registerCreatePrSkill, registerSimplifySkill, ln };
