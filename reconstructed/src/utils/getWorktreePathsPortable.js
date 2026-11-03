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
import { isGitMissingMessageSupported } from "./git/gitMissingMessage.js";
import { identity } from "./pathClassification.js";

//@ chunk-f9pzpnqt.js:947-961 affinity
var execFileAsync = promisify(execFile);
//@ chunk-f9pzpnqt.js:961-1310 fingerprint = getWorktreePathsPortable (0.699)
/**
 * 不依赖项目其余模块的 worktree 列表实现（供可移植模块/子进程使用）。
 */
async function getWorktreePathsPortable(cwd) {
  let executable = resolveExecutableSafely("git");
  if (executable === null || isGitMissingMessageSupported(executable, process.env)) return [];
  try {
    let { stdout } = await execFileAsync(
      executable,
      ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=", "worktree", "list", "--porcelain"],
      {
        cwd,
        timeout: 5000,
        windowsHide: true,
      },
    );
    if (!stdout) return [];
    return stdout
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("worktree "))
      .map((line) => identity(line.slice(9)));
  } catch {
    return [];
  }
}
export { getWorktreePathsPortable };
