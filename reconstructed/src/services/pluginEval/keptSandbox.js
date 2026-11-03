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
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  rename,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import { getPlatform } from "../../utils/platform.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";

//@ chunk-qchp9vrd.js:115707-115754 placement
function Jd(e) {
  return path_14.join(e.root, "sealed");
}
/**
 * 保留运行目录时把被测插件写过的 home/ 与 tmp/ 设为 000 并使目录只读（Windows 与 root 下不可用）。
 */
//@ chunk-qchp9vrd.js:115754-117767 placement
async function sealKeptSandbox(e) {
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
  let n = Jd(e),
    r,
    a;
  try {
    a = await open_5(e.root, constants_5.O_RDONLY | constants_5.O_DIRECTORY | constants_5.O_NOFOLLOW);
    let [s, h, w] = await Promise.all([
      a.stat({ bigint: !0 }),
      lstat_10(e.root, { bigint: !0 }),
      realpath_7(e.root),
    ]);
    if (w !== e.root || !h.isDirectory() || h.ino !== s.ino || h.dev !== s.dev)
      throw Error("the kept directory is not the one the harness created");
    let [b, y] = await Promise.all([lstat_10(e.home, { bigint: !0 }), lstat_10(e.tmpDir, { bigint: !0 })]);
    if (!b.isDirectory() || b.isSymbolicLink() || !y.isDirectory() || y.isSymbolicLink())
      throw Error("home/ or tmp/ is not a real directory");
    (await mkdir_3(n, { mode: 448 }),
      (r = await open_5(n, constants_5.O_RDONLY | constants_5.O_DIRECTORY | constants_5.O_NOFOLLOW)),
      await rename(e.home, path_14.join(n, "home")),
      await rename(e.tmpDir, path_14.join(n, "tmp")),
      await r.chmod(64),
      await a.chmod(320));
    let R = (W, G) =>
        lstat_10(W, { bigint: !0 }).then(
          (J) => J.isDirectory() && !J.isSymbolicLink() && J.ino === G.ino && J.dev === G.dev,
          () => !1,
        ),
      [S, T, N, x, j, K] = await Promise.all([
        a.stat().then((W) => W.mode & 511),
        readdir_9(e.root).then((W) => W.sort().join("\x00")),
        R(path_14.join(n, "home"), b),
        R(path_14.join(n, "tmp"), y),
        lstat_10(e.home).then(
          () => !0,
          () => !1,
        ),
        lstat_10(e.tmpDir).then(
          () => !0,
          () => !1,
        ),
      ]),
      joined = [path_14.basename(e.configDir), path_14.basename(e.outDir), path_14.basename(n)]
        .sort()
        .join("\x00");
    if (S !== 320 || T !== joined || !N || !x || j || K)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the directory modes did not take, the sealed trees are not the ones that were moved, the kept directory holds an unexpected entry, or something reappeared at home/ or tmp/ before the directory locked",
        "eval kept-sandbox seal did not take",
      );
    if ((await r.chmod(0), ((await r.stat()).mode & 511) !== 0))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the sealed directory mode did not take",
        "eval kept-sandbox seal did not take",
      );
  } catch (error) {
    throw (await r?.chmod(0).catch(() => {}), await a?.chmod(320).catch(() => {}), error);
  } finally {
    (await r?.close().catch(() => {}), await a?.close().catch(() => {}));
  }
  return n;
}
//@ chunk-qchp9vrd.js:117767-118119 placement
function formatSealedKeptNotice(e, n) {
  return `home/ and tmp/ in it were written by the plugin under test and are sealed in ${shellQuoteArgs([n])} (mode 000; the kept directory is read-only) \u2014 open them with \`chmod 700 ${shellQuoteArgs([e.root])} ${shellQuoteArgs([n])}\` to inspect, and do not run git (or anything that loads configuration from its working directory) anywhere inside the kept directory`;
}

export { sealKeptSandbox, formatSealedKeptNotice };
