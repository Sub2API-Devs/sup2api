/**
 * skills/bundled/batch.ts
 *
 * /batch 内置 skill：把大规模机械改动拆给 5–30 个 worktree 子代理并行执行并各开 PR。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/batch.ts
 * pieces: chunk-hantmvxa.js (7)
 * attribution: placement 2, fingerprint 3, layout 2
 */
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../../tools/EnterPlanModeTool/constants.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { GKe } from "../../tools/AgentTool/agentLaunch.js";

//@ chunk-hantmvxa.js:27126-27141 placement
function Ct() {}
/**
 * /batch 常量：并行代理数下限 5、上限 30，以及每个 worker 完成后需执行的收尾指令（code-review、测试、开 PR）。
 */
//@ chunk-hantmvxa.js:27141-28149 placement
var MIN_AGENTS = 5,
  MAX_AGENTS = 30,
  WORKER_INSTRUCTIONS = `After you finish implementing the change:
1. **Code review** \u2014 Invoke the \`${SKILL}\` tool with \`skill: "code-review"\` to find correctness bugs (it reports findings; it does not edit code). Fix any findings it surfaces before continuing.
2. **Run unit tests** \u2014 Run the project's test suite (check for package.json scripts, Makefile targets, or common commands like \`npm test\`, \`bun test\`, \`pytest\`, \`go test\`). If tests fail, fix them.
3. **Test end-to-end** \u2014 Follow the e2e test recipe from the coordinator's prompt (below). If the recipe says to skip e2e for this unit, skip it.
4. **Commit and push** \u2014 Commit all changes with a clear message, push the branch, and create a PR with \`gh pr create\`. Use a descriptive title. If \`gh\` is not available or the push fails, note it in your final message.
5. **Report** \u2014 End with a single line: \`PR: <url>\` so the coordinator can track it. If no PR was created, end with \`PR: none \u2014 <reason>\`.`;
/**
 * /batch 的主提示词：研究、拆分单元、并行派发 worktree 代理、汇总 PR 的流程说明。
 */
//@ chunk-hantmvxa.js:28149-32262 fingerprint = buildPrompt (0.923)
function buildPrompt(e, n) {
  return `# Batch: Parallel Work Orchestration

You are orchestrating a large, parallelizable change across this codebase.

## User Instruction

${e}

## Phase 1: Research and Plan (Plan Mode)

Call the \`${ENTER_PLAN_MODE_TOOL_NAME}\` tool now to enter plan mode, then:

1. **Understand the scope.** Launch one or more subagents (in the foreground \u2014 you need their results) to deeply research what this instruction touches. Find all the files, patterns, and call sites that need to change. Understand the existing conventions so the migration is consistent.

2. **Decompose into independent units.** Break the work into ${MIN_AGENTS}\u2013${MAX_AGENTS} self-contained units. Each unit must:
   - Be independently implementable in an isolated git worktree (no shared state with sibling units)
   - Be mergeable on its own without depending on another unit's PR landing first
   - Be roughly uniform in size (split large units, merge trivial ones)

   Scale the count to the actual work: few files \u2192 closer to ${MIN_AGENTS}; hundreds of files \u2192 closer to ${MAX_AGENTS}. Prefer per-directory or per-module slicing over arbitrary file lists.

3. **Determine the e2e test recipe.** Figure out how a worker can verify its change actually works end-to-end \u2014 not just that unit tests pass. Look for:
   - A \`claude-in-chrome\` skill or browser-automation tool (for UI changes: click through the affected flow, screenshot the result)
   - A \`tmux\` or CLI-verifier skill (for CLI changes: launch the app interactively, exercise the changed behavior)
   - A dev-server + curl pattern (for API changes: start the server, hit the affected endpoints)
   - An existing e2e/integration test suite the worker can run

   If you cannot find a concrete e2e path, use the \`${ASKUSERQUESTION}\` tool to ask the user how to verify this change end-to-end. Offer 2\u20133 specific options based on what you found (e.g., "Screenshot via chrome extension", "Run \`bun run dev\` and curl the endpoint", "No e2e \u2014 unit tests are sufficient"). Do not skip this \u2014 the workers cannot ask the user themselves.

   Write the recipe as a short, concrete set of steps that a worker can execute autonomously. Include any setup (start a dev server, build first) and the exact command/interaction to verify.

4. **Write the plan.** In your plan file, include:
   - A summary of what you found during research
   - A numbered list of work units \u2014 for each: a short title, the list of files/directories it covers, and a one-line description of the change
   - The e2e test recipe (or "skip e2e because \u2026" if the user chose that)
   - The exact worker instructions you will give each agent (the shared template)

5. Call \`${EXITPLANMODE}\` to present the plan for approval.

## Phase 2: Spawn Workers (After Plan Approval)

Once the plan is approved, spawn one background agent per work unit using the \`${AGENT}\` tool. **All agents must use \`isolation: "worktree"\` and \`run_in_background: true\`.** Launch them all in a single message block so they run in parallel.

For each agent, the prompt must be fully self-contained. Include:
- The overall goal (the user's instruction)
- This unit's specific task (title, file list, change description \u2014 copied verbatim from your plan)
- Any codebase conventions you discovered that the worker needs to follow
- The e2e test recipe from your plan (or "skip e2e because \u2026")
- The worker instructions below, copied verbatim:

\`\`\`
${WORKER_INSTRUCTIONS}
\`\`\`

Use \`subagent_type: "general-purpose"\` unless a more specific agent type fits.
${n}
## Phase 3: Track Progress

After launching all workers, render an initial status table:

| # | Unit | Status | PR |
|---|------|--------|----|
| 1 | <title> | running | \u2014 |
| 2 | <title> | running | \u2014 |

As background-agent completion notifications arrive, parse the \`PR: <url>\` line from each agent's result and re-render the table with updated status (\`done\` / \`failed\`) and PR links. Keep a brief failure note for any agent that did not produce a PR.

When all agents have reported, render the final table and a one-line summary (e.g., "22/24 units landed as PRs").
`;
}
//@ chunk-hantmvxa.js:32262-32601 layout
var NOT_A_GIT_REPO_MESSAGE =
  "The `/batch` command runs each agent in its own isolated worktree, and none can be created here: this directory is not in a git repository and no WorktreeCreate hook is configured. Run `/batch` from inside a git repository, or configure WorktreeCreate and WorktreeRemove hooks in settings.json for another version-control system.";
//@ chunk-hantmvxa.js:32601-33215 layout
function buildVcsSection() {
  return `
## Version control

This directory is not a git repository: worker worktrees come from a WorktreeCreate hook, so \`isolation: "worktree"\` works as above, but git and \`gh\` commands do not. ${"Say so in every worker prompt, and when you copy the worker instructions, replace step 4 with: commit and publish the change with this project's own version-control commands, and end with `PR: none \u2014 <what was published instead>` when no pull request can be opened."} In Phase 3, a worker that reports what it published instead of a PR URL counts as done; show that report in the PR column.
`;
}
//@ chunk-hantmvxa.js:33215-33464 fingerprint = MISSING_INSTRUCTION_MESSAGE (1)
var MISSING_INSTRUCTION_MESSAGE = `Provide an instruction describing the batch change you want to make.

Examples:
  /batch migrate from react to vue
  /batch replace all uses of lodash with native equivalents
  /batch add type annotations to all untyped function parameters`;
/**
 * 注册 /batch 内置 skill：把大规模机械改动拆成 5–30 个 worktree 子代理并行执行、各开 PR；不在 git 仓库且没有 WorktreeCreate 钩子时直接返回说明。只能用户调用。
 */
//@ chunk-hantmvxa.js:33464-34162 fingerprint = registerBatchSkill (0.889)
function registerBatchSkill() {
  registerBundledSkill({
    name: "batch",
    menuDescription: "Plan a large change; background agents each open a PR",
    description:
      "Research and plan a large-scale change, then execute it in parallel across 5\u201330 isolated worktree agents that each open a PR.",
    whenToUse:
      "Use when the user wants to make a sweeping, mechanical change across many files (migrations, refactors, bulk renames) that can be decomposed into independent parallel units.",
    argumentHint: "<instruction>",
    userInvocable: !0,
    disableModelInvocation: !0,
    async getPromptForCommand(e) {
      let instruction = e.trim();
      if (!instruction) return [{ type: "text", text: MISSING_INSTRUCTION_MESSAGE }];
      let s = findCanonicalGitRoot(getCwd()) !== null;
      if (!s && !GKe()) return [{ type: "text", text: NOT_A_GIT_REPO_MESSAGE }];
      return [{ type: "text", text: buildPrompt(instruction, s ? "" : buildVcsSection()) }];
    },
  });
}

export { registerBatchSkill, Ct };
