/**
 * utils/plugins/gitShaPin.ts
 *
 * 2.1.316 新增：git SHA 固定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:4630429-4630913 placement
async function hasSymlinkBetween(cloneDir, resolvedSubdir, subdirPath) {
  let filtered = relative(cloneDir, resolvedSubdir).split(sep).filter(Boolean);
  let current = cloneDir;
  for (let segment of filtered) {
    current = join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return;
      throw error;
    }
    let isLink = stat.isSymbolicLink();
    if (!isLink && getPlatform() === "windows" && stat.isDirectory()) {
      let junction = await readJunction(current);
      switch (junction.kind) {
        case "junction":
          isLink = true;
          break;
        case "directory":
          break;
        case "absent":
          return;
        case "error":
          throw junction.error;
      }
    }
    if (isLink)
      throw Error(
        `Subdirectory '${subdirPath}' passes through a symbolic link inside the repository; refusing to install it.`,
      );
  }
}
//@ chunk-5xgkngpb.js:4630913-4631072 placement
function assertFullCommitSha(sha) {
  if (sha !== undefined && !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha))
    throw Error(`Invalid sha "${sha}": must be a full commit hash (40 or 64 hex digits)`);
}
//@ chunk-5xgkngpb.js:4631072-4631589 placement
/**
 * 在检出目录里 git rev-parse <ref>，与 marketplace 条目钉住的 sha 比对，不符拒绝安装。
 */
async function verifyPinnedSha(cwd, refName, expectedSha, options) {
  let revParse = await execFileNoThrowWithCwd(gitExe(), [...options.inCheckoutArgs, "rev-parse", refName], {
    cwd,
    env: options.env,
    stdin: "ignore",
  });
  let trimmed = revParse.stdout.trim();
  if (revParse.code !== 0 || trimmed.toLowerCase() !== expectedSha.toLowerCase()) {
    if (revParse.stderr) logForDebugging(`plugin SHA pin rev-parse stderr: ${revParse.stderr}`);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `SHA pin verification failed: expected ${refName} to be ${expectedSha}, got ${trimmed || "(rev-parse failed)"}. The pinned commit may have been removed upstream, or a ref with the same name exists. Refusing to install.`,
      "plugin SHA pin verification failed",
    );
  }
  return trimmed.toLowerCase();
}
export { assertFullCommitSha, verifyPinnedSha, hasSymlinkBetween };
