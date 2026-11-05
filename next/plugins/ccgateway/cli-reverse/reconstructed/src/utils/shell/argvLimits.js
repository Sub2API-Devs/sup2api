/**
 * utils/shell/argvLimits.ts
 *
 * 2.1.316 新增：命令行参数长度限制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { formatFileSize } from "../format.js";
import { countWhere } from "../collections.js";
import { isWorktreeConfigPath } from "../worktree.js";

//@ chunk-5xgkngpb.js:3125304-3126412 placement
/**
 * 检查命令行参数加环境变量是否超过系统 exec 上限。
 */
function checkArgvLimits({ binary, argv, env, sandboxDenyPaths }) {
  let argvBytes = Buffer.byteLength(binary) + 1;
  let largestArgBytes = 0;
  for (let arg of argv) {
    let argBytes = Buffer.byteLength(arg) + 1;
    argvBytes += argBytes;
    if (argBytes > largestArgBytes) largestArgBytes = argBytes;
  }
  let envBytes = 0;
  let envCount = 0;
  let largestEnvName;
  let largestEnvBytes = 0;
  for (let [key, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    envCount++;
    let entryBytes = Buffer.byteLength(key) + Buffer.byteLength(value) + 2;
    envBytes += entryBytes;
    if (entryBytes > largestEnvBytes) {
      largestEnvBytes = entryBytes;
      largestEnvName = key;
    }
  }
  let message = `Could not start ${binary}: the command line plus environment exceed the OS exec argument limit (E2BIG). At spawn: command line ${formatFileSize(argvBytes)} across ${argv.length + 1} args (largest single arg ${formatFileSize(largestArgBytes)}); environment ${formatFileSize(envBytes)} across ${envCount} vars${largestEnvName === undefined ? "" : ` (largest: ${largestEnvName} at ${formatFileSize(largestEnvBytes)})`}.`;
  if (sandboxDenyPaths.length === 0) return message;
  let worktreeDenyCount = countWhere(sandboxDenyPaths, isWorktreeConfigPath);
  message += ` The Bash sandbox profile adds ${sandboxDenyPaths.length} filesystem deny paths to every command`;
  message +=
    worktreeDenyCount > 0
      ? `, ${worktreeDenyCount} of them for registered git worktrees, which grow this list without bound. From another terminal, remove worktrees you no longer need (git worktree remove <path>; git worktree prune for already-deleted checkouts), then restart Claude Code so the profile is rebuilt without them \u2014 or relax the Bash sandbox for this session with /sandbox.`
      : ".";
  return message;
}
export { checkArgvLimits };
