/**
 * services/pluginEval/artifactStub.ts
 *
 * 2.1.316 新增：plugin eval 中 Artifact 发布的桩目录（.eval-artifacts/stub-publishes）及其完整性检查
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
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
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
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  getErrnoCode,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { detectPlatformFlavor } from "./caseDiscovery.js";
import { readStubPublishDir, readStubPublishesJson } from "./runTrace.js";

//@ chunk-qchp9vrd.js:120803-120840 placement
var MAX_STUB_PUBLISH_BYTES = 67108864,
  Kt = ".eval-artifacts";
//@ chunk-qchp9vrd.js:120840-120896 placement
function Gr(e) {
  return path_15.join(e.outDir, "stub-publishes");
}
/**
 * 检查发布桩目录未消失/被替换/改动后收集本次运行的发布记录。
 */
//@ chunk-qchp9vrd.js:120896-122550 placement
async function collectStubPublishes(e, n) {
  let r = Gr(e),
    a = await lstat_11(r).catch((s) => {
      if (isENOENT(s) && n.size === 0) return null;
      if (isENOENT(s))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `the run's artifact-publish staging directory is gone although the run published (${n.size} corroborated) \u2014 its publishes cannot be vouched for`,
          "eval: stub publish staging dir missing",
        );
      throw (
        logForDebugging(`eval: cannot examine ${r}: ${errorMessage(s)}`, { level: "warn" }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `the run's artifact-publish staging directory could not be examined (${getErrnoCode(s) ?? "unknown error"})`,
          "eval: stub publish staging dir unreadable",
        )
      );
    });
  if (a === null) return [];
  if (!a.isDirectory() || a.isSymbolicLink())
    throw (
      await detectPlatformFlavor(r, { harnessOwned: !0 }),
      await rm_4(r, { recursive: !0, force: !0 }),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the run's artifact-publish staging directory was replaced by something that is not a directory, so its publishes (and their absence) cannot be trusted \u2014 discarded, and the run is an error",
        "eval: stub publish staging dir replaced",
      )
    );
  try {
    let s = await readStubPublishDir(r, n),
      h = new Set(s.flatMap((b) => (b.env === "stub" ? [path_15.basename(b.payloadDir)] : []))),
      w = await lstat_11(r);
    if (!w.isDirectory() || w.isSymbolicLink() || w.ino !== a.ino || w.dev !== a.dev)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the run's artifact-publish staging directory changed while it was being indexed",
        "eval: stub publish staging dir changed",
      );
    for (let b of await readdir_10(r))
      if (!h.has(b)) await rm_4(path_15.join(r, b), { recursive: !0, force: !0 });
    return (await readStubPublishesJson(r, s), s);
  } catch (error) {
    throw (
      await detectPlatformFlavor(r, { harnessOwned: !0 }),
      await rm_4(r, { recursive: !0, force: !0 }),
      logForDebugging(`eval: stub publish index failed: ${errorMessage(error)}`, { level: "warn" }),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run's artifact publishes could not be indexed (${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.message : (getErrnoCode(error) ?? "unexpected error")}), so they were discarded and the run is an error`,
        "eval: stub publish index failed",
      )
    );
  }
}

export { MAX_STUB_PUBLISH_BYTES, collectStubPublishes, Kt, Gr };
