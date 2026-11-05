/**
 * services/pluginEval/keptSandbox.ts
 *
 * 2.1.316 新增：plugin eval 保留运行目录时对被测插件写入的 home/、tmp/ 加封（mode 000）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import path from "path";
import { open, lstat, realpath, mkdir, rename, readdir } from "fs/promises";
import { constants } from "fs";
import { getPlatform } from "../../utils/platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";

//@ chunk-af1hzzme.js:117060-117107 placement
/**
 * 保留沙箱里 sealed 目录的路径。
 */
function sealedDir(tempDir) {
  return path.join(tempDir.root, "sealed");
}
//@ chunk-af1hzzme.js:117107-119120 placement
/**
 * 保留运行目录时把被测插件写过的 home/ 与 tmp/ 设为 000 并使目录只读（Windows 与 root 下不可用）。
 */
async function sealKeptSandbox(tempDir) {
  if (getPlatform() === "windows")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "directory modes do not restrict access on Windows",
      "eval kept-sandbox seal unavailable on windows",
    );
  if (process.getuid?.() === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the harness is running as root, which a directory mode does not bind",
      "eval kept-sandbox seal ineffective for root",
    );
  let sealedPath = sealedDir(tempDir);
  let sealedHandle;
  let rootHandle;
  try {
    rootHandle = await open(tempDir.root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    let [rootStats, rootLstat, rootReal] = await Promise.all([
      rootHandle.stat({
        bigint: true,
      }),
      lstat(tempDir.root, {
        bigint: true,
      }),
      realpath(tempDir.root),
    ]);
    if (
      rootReal !== tempDir.root ||
      !rootLstat.isDirectory() ||
      rootLstat.ino !== rootStats.ino ||
      rootLstat.dev !== rootStats.dev
    )
      throw Error("the kept directory is not the one the harness created");
    let [homeStats, tmpStats] = await Promise.all([
      lstat(tempDir.home, {
        bigint: true,
      }),
      lstat(tempDir.tmpDir, {
        bigint: true,
      }),
    ]);
    if (
      !homeStats.isDirectory() ||
      homeStats.isSymbolicLink() ||
      !tmpStats.isDirectory() ||
      tmpStats.isSymbolicLink()
    )
      throw Error("home/ or tmp/ is not a real directory");
    await mkdir(sealedPath, {
      mode: 448,
    });
    sealedHandle = await open(sealedPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    await rename(tempDir.home, path.join(sealedPath, "home"));
    await rename(tempDir.tmpDir, path.join(sealedPath, "tmp"));
    await sealedHandle.chmod(64);
    await rootHandle.chmod(320);
    let isSameDir = (dirPath, expectedStats) =>
      lstat(dirPath, {
        bigint: true,
      }).then(
        (dirStats) =>
          dirStats.isDirectory() &&
          !dirStats.isSymbolicLink() &&
          dirStats.ino === expectedStats.ino &&
          dirStats.dev === expectedStats.dev,
        () => false,
      );
    let [rootMode, rootEntries, homeMoved, tmpMoved, homeReappeared, tmpReappeared] = await Promise.all([
      rootHandle.stat().then((stats) => stats.mode & 511),
      readdir(tempDir.root).then((names) => names.sort().join("\x00")),
      isSameDir(path.join(sealedPath, "home"), homeStats),
      isSameDir(path.join(sealedPath, "tmp"), tmpStats),
      lstat(tempDir.home).then(
        () => true,
        () => false,
      ),
      lstat(tempDir.tmpDir).then(
        () => true,
        () => false,
      ),
    ]);
    let joined = [path.basename(tempDir.configDir), path.basename(tempDir.outDir), path.basename(sealedPath)]
      .sort()
      .join("\x00");
    if (
      rootMode !== 320 ||
      rootEntries !== joined ||
      !homeMoved ||
      !tmpMoved ||
      homeReappeared ||
      tmpReappeared
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the directory modes did not take, the sealed trees are not the ones that were moved, the kept directory holds an unexpected entry, or something reappeared at home/ or tmp/ before the directory locked",
        "eval kept-sandbox seal did not take",
      );
    await sealedHandle.chmod(0);
    if (((await sealedHandle.stat()).mode & 511) !== 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the sealed directory mode did not take",
        "eval kept-sandbox seal did not take",
      );
  } catch (error) {
    await sealedHandle?.chmod(0).catch(() => {});
    await rootHandle?.chmod(320).catch(() => {});
    throw error;
  } finally {
    await sealedHandle?.close().catch(() => {});
    await rootHandle?.close().catch(() => {});
  }
  return sealedPath;
}
//@ chunk-af1hzzme.js:119120-119472 placement
function formatSealedKeptNotice(evalTempDir, sealed) {
  return `home/ and tmp/ in it were written by the plugin under test and are sealed in ${shellQuoteArgs([sealed])} (mode 000; the kept directory is read-only) \u2014 open them with \`chmod 700 ${shellQuoteArgs([evalTempDir.root])} ${shellQuoteArgs([sealed])}\` to inspect, and do not run git (or anything that loads configuration from its working directory) anywhere inside the kept directory`;
}
export { sealKeptSandbox, formatSealedKeptNotice };
