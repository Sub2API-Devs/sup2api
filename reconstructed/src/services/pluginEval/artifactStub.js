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
import path from "path";
import { lstat, rm as rm_2, readdir } from "fs/promises";
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
/**
 * 评测产物桩目录名 .eval-artifacts。
 */
var MAX_STUB_PUBLISH_BYTES = 67108864;
var EVAL_ARTIFACTS_DIR = ".eval-artifacts";
//@ chunk-qchp9vrd.js:120840-120896 placement
/**
 * 发布桩记录的目录。
 */
function stubPublishDir(evalTempDir) {
  return path.join(evalTempDir.outDir, "stub-publishes");
}
//@ chunk-qchp9vrd.js:120896-122550 placement
/**
 * 检查发布桩目录未消失/被替换/改动后收集本次运行的发布记录。
 */
async function collectStubPublishes(sandbox, stubArtifactSlugs) {
  let r = stubPublishDir(sandbox);
  let a = await lstat(r).catch((error) => {
    if (isENOENT(error) && stubArtifactSlugs.size === 0) return null;
    if (isENOENT(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run's artifact-publish staging directory is gone although the run published (${stubArtifactSlugs.size} corroborated) \u2014 its publishes cannot be vouched for`,
        "eval: stub publish staging dir missing",
      );
    logForDebugging(`eval: cannot examine ${r}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run's artifact-publish staging directory could not be examined (${getErrnoCode(error) ?? "unknown error"})`,
      "eval: stub publish staging dir unreadable",
    );
  });
  if (a === null) return [];
  if (!a.isDirectory() || a.isSymbolicLink()) {
    await detectPlatformFlavor(r, {
      harnessOwned: true,
    });
    await rm_2(r, {
      recursive: true,
      force: true,
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the run's artifact-publish staging directory was replaced by something that is not a directory, so its publishes (and their absence) cannot be trusted \u2014 discarded, and the run is an error",
      "eval: stub publish staging dir replaced",
    );
  }
  try {
    let stubPublishDir = await readStubPublishDir(r, stubArtifactSlugs);
    let h = new Set(stubPublishDir.flatMap((b) => (b.env === "stub" ? [path.basename(b.payloadDir)] : [])));
    let w = await lstat(r);
    if (!w.isDirectory() || w.isSymbolicLink() || w.ino !== a.ino || w.dev !== a.dev)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the run's artifact-publish staging directory changed while it was being indexed",
        "eval: stub publish staging dir changed",
      );
    for (let b of await readdir(r))
      if (!h.has(b))
        await rm_2(path.join(r, b), {
          recursive: true,
          force: true,
        });
    await readStubPublishesJson(r, stubPublishDir);
    return stubPublishDir;
  } catch (error) {
    await detectPlatformFlavor(r, {
      harnessOwned: true,
    });
    await rm_2(r, {
      recursive: true,
      force: true,
    });
    logForDebugging(`eval: stub publish index failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run's artifact publishes could not be indexed (${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.message : (getErrnoCode(error) ?? "unexpected error")}), so they were discarded and the run is an error`,
      "eval: stub publish index failed",
    );
  }
}
export { MAX_STUB_PUBLISH_BYTES, collectStubPublishes, EVAL_ARTIFACTS_DIR, stubPublishDir };
