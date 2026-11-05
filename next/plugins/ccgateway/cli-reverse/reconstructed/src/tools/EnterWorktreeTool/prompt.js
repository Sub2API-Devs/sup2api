/**
 * tools/EnterWorktreeTool/prompt.ts
 *
 * 旧版已有同名文件，2.1.316 有扩充：EnterWorktree 工具提示词。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterWorktreeTool/prompt.ts
 * pieces: chunk-fmnbrxwy.js (2)
 * attribution: placement 2
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:132039-135355 placement
/**
 * EnterWorktree 工具提示词。
 */
function enterWorktreePrompt() {
  return `Use this tool ONLY when explicitly instructed to work in a worktree \u2014 either by the user directly, or by project instructions (CLAUDE.md / memory). This tool creates an isolated git worktree and switches the current session into it.

## When to Use

- The user explicitly says "worktree" (e.g., "start a worktree", "work in a worktree", "create a worktree", "use a worktree")
- CLAUDE.md or memory instructions direct you to work in a worktree for the current task

## When NOT to Use

- The user asks to create a branch, switch branches, or work on a different branch \u2014 use git commands instead
- The user asks to fix a bug or work on a feature \u2014 use normal git workflow unless worktrees are explicitly requested by the user or project instructions
- Never use this tool unless "worktree" is explicitly mentioned by the user or in CLAUDE.md / memory instructions

## Requirements

- Must be in a git repository, OR have WorktreeCreate/WorktreeRemove hooks configured in settings.json
- Must not already be in a worktree session when creating a new worktree (\`name\`); switching into another existing worktree via \`path\` is allowed

## Behavior

- In a git repository: creates a new git worktree inside \`.claude/worktrees/\` on a new branch. The base ref is governed by the \`worktree.baseRef\` setting: \`fresh\` (default) branches from origin/<default-branch>; \`head\` branches from your current local HEAD
- Outside a git repository: delegates to WorktreeCreate/WorktreeRemove hooks for VCS-agnostic isolation
- Switches the session's working directory to the new worktree
- Use ExitWorktree to leave the worktree mid-session (keep or remove). On session exit, if still in the worktree, the user will be prompted to keep or remove it

## Entering an existing worktree

Pass \`path\` instead of \`name\` to switch the session into a worktree that already exists (e.g., one you just created with \`git worktree add\`). On first entry from the launch directory, the path must appear in \`git worktree list\` for the repository that owns it \u2014 the current repository or, in a multi-repo workspace, a repository nested inside it; paths registered by neither are rejected. ExitWorktree will not remove a worktree entered this way; use \`action: "keep"\` to return to the original directory.

Switching with \`path\` also works when the session is already in a worktree (the previous worktree is left on disk, untouched, and only the new one is tracked for exit-time cleanup), and from agents whose working directory was pinned at launch (subagent isolation or explicit cwd). In both cases the target must be a worktree under \`.claude/worktrees/\` of the same repository, and from a pinned agent the switch only affects this agent, not the parent session. After a further switch, previously-visited worktrees are no longer writable \u2014 re-issue EnterWorktree with \`path\` to return to one.
${""}
## Parameters

- \`name\` (optional): A name for a new worktree. If neither \`name\` nor \`path\` is provided, a random name is generated.
- \`path\` (optional): Path to an existing worktree to enter instead of creating one \u2014 of the current repository, or (on first entry from the launch directory) of a repository nested inside it. Mutually exclusive with \`name\`.
`;
}
//@ chunk-fmnbrxwy.js:135355-135382 placement
/**
 * 按会话根记录已展示过的 worktree 提示集合（当前无引用）。
 */
var worktreePromptsShownByRoot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:135355", () => {
  worktreePromptsShownByRoot = new SessionRootSlot(() => new Set());
});
export { enterWorktreePrompt };
