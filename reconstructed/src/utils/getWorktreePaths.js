/**
 * utils/getWorktreePaths.ts
 *
 * git worktree list --porcelain 获取全部 worktree 路径（当前 worktree 排第一），打 tengu_worktree_detection
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/getWorktreePaths.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { sep } from "path";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { gitExe } from "./git.js";
import { identity } from "./pathClassification.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-e6aww6q8.js:224033-224638 fingerprint = getWorktreePaths (0.803)
/**
 * getWorktreePaths：git worktree list --porcelain（禁用 hooksPath 与 fsmonitor），当前 worktree 排第一，打 tengu_worktree_detection。
 */
async function getWorktreePaths(cwd) {
  let startTime = Date.now();
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=", "worktree", "list", "--porcelain"],
    {
      cwd,
      preserveOutputOnError: false,
    },
  );
  let h = null;
  if (code === 0)
    h = stdout
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("worktree "))
      .map((line) => identity(line.slice(9)));
  let durationMs = Date.now() - startTime;
  if (h === null) {
    logEvent("tengu_worktree_detection", {
      duration_ms: durationMs,
      worktree_count: 0,
      success: false,
    });
    return [];
  }
  logEvent("tengu_worktree_detection", {
    duration_ms: durationMs,
    worktree_count: h.length,
    success: true,
  });
  let currentWorktree = h.find((path) => cwd === path || cwd.startsWith(path + sep));
  let otherWorktrees = h.filter((path) => path !== currentWorktree).sort((L, G) => L.localeCompare(G));
  return currentWorktree ? [currentWorktree, ...otherWorktrees] : otherWorktrees;
}
export { getWorktreePaths };
