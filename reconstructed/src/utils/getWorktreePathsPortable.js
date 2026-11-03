/**
 * utils/getWorktreePathsPortable.ts
 *
 * 不依赖项目其他模块的 worktree 列表实现（execFile 版）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/getWorktreePathsPortable.ts
 * pieces: chunk-f9pzpnqt.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { promisify } from "util";
import { execFile } from "child_process";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { fje } from "./git/gitMissingMessage.js";
import { Mn } from "./pathClassification.js";

//@ chunk-f9pzpnqt.js:947-961 affinity
var execFileAsync = promisify(execFile);
/**
 * 不依赖项目其余模块的 worktree 列表实现（供可移植模块/子进程使用）。
 */
//@ chunk-f9pzpnqt.js:961-1310 fingerprint = getWorktreePathsPortable (0.699)
async function getWorktreePathsPortable(cwd) {
  let n = resolveExecutableSafely("git");
  if (n === null || fje(n, process.env)) return [];
  try {
    let { stdout: stdout } = await execFileAsync(
      n,
      ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=", "worktree", "list", "--porcelain"],
      { cwd: cwd, timeout: 5000, windowsHide: !0 },
    );
    if (!stdout) return [];
    return stdout
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("worktree "))
      .map((line) => Mn(line.slice(9)));
  } catch {
    return [];
  }
}

export { getWorktreePathsPortable };
