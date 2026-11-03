/**
 * utils/plugins/gitShaPin.ts
 *
 * 2.1.316 新增：git SHA 固定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { relative, sep, join } from "path";
import { lstat } from "fs/promises";
import {
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { getPlatform } from "../platform.js";
import { readJunction } from "../fsJunctions.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { logForDebugging } from "../debug.js";

//@ chunk-e6aww6q8.js:4523506-4523989 placement
async function hasSymlinkBetween(cloneDir, resolvedSubdir, subdirPath) {
  let filtered = relative(cloneDir, resolvedSubdir).split(sep).filter(Boolean);
  let h = cloneDir;
  for (let y of filtered) {
    h = join(h, y);
    let S;
    try {
      S = await lstat(h);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return;
      throw error;
    }
    let w = S.isSymbolicLink();
    if (!w && getPlatform() === "windows" && S.isDirectory()) {
      let junction = await readJunction(h);
      switch (junction.kind) {
        case "junction":
          w = true;
          break;
        case "directory":
          break;
        case "absent":
          return;
        case "error":
          throw junction.error;
      }
    }
    if (w)
      throw Error(
        `Subdirectory '${subdirPath}' passes through a symbolic link inside the repository; refusing to install it.`,
      );
  }
}
//@ chunk-e6aww6q8.js:4523989-4524148 placement
function assertFullCommitSha(e) {
  if (e !== undefined && !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(e))
    throw Error(`Invalid sha "${e}": must be a full commit hash (40 or 64 hex digits)`);
}
//@ chunk-e6aww6q8.js:4524148-4524665 placement
/**
 * 在检出目录里 git rev-parse <ref>，与 marketplace 条目钉住的 sha 比对，不符拒绝安装。
 */
async function verifyPinnedSha(cwd, n, r, s) {
  let h = await execFileNoThrowWithCwd(gitExe(), [...s.inCheckoutArgs, "rev-parse", n], {
    cwd,
    env: s.env,
    stdin: "ignore",
  });
  let trimmed = h.stdout.trim();
  if (h.code !== 0 || trimmed.toLowerCase() !== r.toLowerCase()) {
    if (h.stderr) logForDebugging(`plugin SHA pin rev-parse stderr: ${h.stderr}`);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `SHA pin verification failed: expected ${n} to be ${r}, got ${trimmed || "(rev-parse failed)"}. The pinned commit may have been removed upstream, or a ref with the same name exists. Refusing to install.`,
      "plugin SHA pin verification failed",
    );
  }
  return trimmed.toLowerCase();
}
export { assertFullCommitSha, verifyPinnedSha, hasSymlinkBetween };
