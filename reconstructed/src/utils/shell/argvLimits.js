/**
 * utils/shell/argvLimits.ts
 *
 * 2.1.316 新增：命令行参数长度限制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { formatFileSize } from "../format.js";
import { count } from "../collections.js";
import { jTr } from "../Shell.js";

/**
 * 检查命令行参数加环境变量是否超过系统 exec 上限。
 */
//@ chunk-e6aww6q8.js:3041213-3042318 placement
function checkArgvLimits({ binary: binary, argv: argv, env: env, sandboxDenyPaths: sandboxDenyPaths }) {
  let h = Buffer.byteLength(binary) + 1,
    y = 0;
  for (let Se of argv) {
    let ke = Buffer.byteLength(Se) + 1;
    if (((h += ke), ke > y)) y = ke;
  }
  let S = 0,
    w = 0,
    L,
    G = 0;
  for (let [Se, ke] of Object.entries(env)) {
    if (typeof ke !== "string") continue;
    w++;
    let we = Buffer.byteLength(Se) + Buffer.byteLength(ke) + 2;
    if (((S += we), we > G)) ((G = we), (L = Se));
  }
  let q = `Could not start ${binary}: the command line plus environment exceed the OS exec argument limit (E2BIG). At spawn: command line ${formatFileSize(h)} across ${argv.length + 1} args (largest single arg ${formatFileSize(y)}); environment ${formatFileSize(S)} across ${w} vars${L === void 0 ? "" : ` (largest: ${L} at ${formatFileSize(G)})`}.`;
  if (sandboxDenyPaths.length === 0) return q;
  let Z = count(sandboxDenyPaths, jTr);
  return (
    (q += ` The Bash sandbox profile adds ${sandboxDenyPaths.length} filesystem deny paths to every command`),
    (q +=
      Z > 0
        ? `, ${Z} of them for registered git worktrees, which grow this list without bound. From another terminal, remove worktrees you no longer need (git worktree remove <path>; git worktree prune for already-deleted checkouts), then restart Claude Code so the profile is rebuilt without them \u2014 or relax the Bash sandbox for this session with /sandbox.`
        : "."),
    q
  );
}

export { checkArgvLimits };
