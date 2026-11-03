/**
 * services/pluginEval/keptSandbox.ts
 *
 * 2.1.316 新增：plugin eval 保留运行目录时对被测插件写入的 home/、tmp/ 加封（mode 000）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (3)
 * attribution: placement 3
 */
import path from "path";
import { open, lstat, realpath, mkdir, rename, readdir } from "fs/promises";
import { constants } from "fs";
import { getPlatform } from "../../utils/platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";

//@ chunk-qchp9vrd.js:115707-115754 placement
/**
 * 保留沙箱里 sealed 目录的路径。
 */
function sealedDir(e) {
  return path.join(e.root, "sealed");
}
//@ chunk-qchp9vrd.js:115754-117767 placement
/**
 * 保留运行目录时把被测插件写过的 home/ 与 tmp/ 设为 000 并使目录只读（Windows 与 root 下不可用）。
 */
async function sealKeptSandbox(evalTempDir) {
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
  let n = sealedDir(evalTempDir);
  let r;
  let a;
  try {
    a = await open(evalTempDir.root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    let [s, h, w] = await Promise.all([
      a.stat({
        bigint: true,
      }),
      lstat(evalTempDir.root, {
        bigint: true,
      }),
      realpath(evalTempDir.root),
    ]);
    if (w !== evalTempDir.root || !h.isDirectory() || h.ino !== s.ino || h.dev !== s.dev)
      throw Error("the kept directory is not the one the harness created");
    let [b, y] = await Promise.all([
      lstat(evalTempDir.home, {
        bigint: true,
      }),
      lstat(evalTempDir.tmpDir, {
        bigint: true,
      }),
    ]);
    if (!b.isDirectory() || b.isSymbolicLink() || !y.isDirectory() || y.isSymbolicLink())
      throw Error("home/ or tmp/ is not a real directory");
    await mkdir(n, {
      mode: 448,
    });
    r = await open(n, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    await rename(evalTempDir.home, path.join(n, "home"));
    await rename(evalTempDir.tmpDir, path.join(n, "tmp"));
    await r.chmod(64);
    await a.chmod(320);
    let R = (W, G) =>
      lstat(W, {
        bigint: true,
      }).then(
        (J) => J.isDirectory() && !J.isSymbolicLink() && J.ino === G.ino && J.dev === G.dev,
        () => false,
      );
    let [S, T, N, x, j, K] = await Promise.all([
      a.stat().then((W) => W.mode & 511),
      readdir(evalTempDir.root).then((W) => W.sort().join("\x00")),
      R(path.join(n, "home"), b),
      R(path.join(n, "tmp"), y),
      lstat(evalTempDir.home).then(
        () => true,
        () => false,
      ),
      lstat(evalTempDir.tmpDir).then(
        () => true,
        () => false,
      ),
    ]);
    let joined = [path.basename(evalTempDir.configDir), path.basename(evalTempDir.outDir), path.basename(n)]
      .sort()
      .join("\x00");
    if (S !== 320 || T !== joined || !N || !x || j || K)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the directory modes did not take, the sealed trees are not the ones that were moved, the kept directory holds an unexpected entry, or something reappeared at home/ or tmp/ before the directory locked",
        "eval kept-sandbox seal did not take",
      );
    await r.chmod(0);
    if (((await r.stat()).mode & 511) !== 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the sealed directory mode did not take",
        "eval kept-sandbox seal did not take",
      );
  } catch (error) {
    await r?.chmod(0).catch(() => {});
    await a?.chmod(320).catch(() => {});
    throw error;
  } finally {
    await r?.close().catch(() => {});
    await a?.close().catch(() => {});
  }
  return n;
}
//@ chunk-qchp9vrd.js:117767-118119 placement
function formatSealedKeptNotice(evalTempDir, sealed) {
  return `home/ and tmp/ in it were written by the plugin under test and are sealed in ${shellQuoteArgs([sealed])} (mode 000; the kept directory is read-only) \u2014 open them with \`chmod 700 ${shellQuoteArgs([evalTempDir.root])} ${shellQuoteArgs([sealed])}\` to inspect, and do not run git (or anything that loads configuration from its working directory) anywhere inside the kept directory`;
}
export { sealKeptSandbox, formatSealedKeptNotice };
