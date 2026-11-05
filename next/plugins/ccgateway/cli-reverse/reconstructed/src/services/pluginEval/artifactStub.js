/**
 * services/pluginEval/artifactStub.ts
 *
 * 2.1.316 新增：plugin eval 中 Artifact 发布的桩目录（.eval-artifacts/stub-publishes）及其完整性检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (3)
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

//@ chunk-af1hzzme.js:122156-122193 placement
/**
 * 评测产物桩目录名 .eval-artifacts。
 */
var MAX_STUB_PUBLISH_BYTES = 67108864;
var EVAL_ARTIFACTS_DIR = ".eval-artifacts";
//@ chunk-af1hzzme.js:122193-122249 placement
/**
 * 发布桩记录的目录。
 */
function stubPublishDir(evalTempDir) {
  return path.join(evalTempDir.outDir, "stub-publishes");
}
//@ chunk-af1hzzme.js:122249-123903 placement
/**
 * 检查发布桩目录未消失/被替换/改动后收集本次运行的发布记录。
 */
async function collectStubPublishes(sandbox, expectedSlugs) {
  let stubDir = stubPublishDir(sandbox);
  let stats = await lstat(stubDir).catch((error) => {
    if (isENOENT(error) && expectedSlugs.size === 0) return null;
    if (isENOENT(error))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the run's artifact-publish staging directory is gone although the run published (${expectedSlugs.size} corroborated) \u2014 its publishes cannot be vouched for`,
        "eval: stub publish staging dir missing",
      );
    logForDebugging(`eval: cannot examine ${stubDir}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run's artifact-publish staging directory could not be examined (${getErrnoCode(error) ?? "unknown error"})`,
      "eval: stub publish staging dir unreadable",
    );
  });
  if (stats === null) return [];
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await detectPlatformFlavor(stubDir, {
      harnessOwned: true,
    });
    await rm_2(stubDir, {
      recursive: true,
      force: true,
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "the run's artifact-publish staging directory was replaced by something that is not a directory, so its publishes (and their absence) cannot be trusted \u2014 discarded, and the run is an error",
      "eval: stub publish staging dir replaced",
    );
  }
  try {
    let stubPublishDir = await readStubPublishDir(stubDir, expectedSlugs);
    let keptNames = new Set(
      stubPublishDir.flatMap((publish) =>
        publish.env === "stub" ? [path.basename(publish.payloadDir)] : [],
      ),
    );
    let after = await lstat(stubDir);
    if (!after.isDirectory() || after.isSymbolicLink() || after.ino !== stats.ino || after.dev !== stats.dev)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the run's artifact-publish staging directory changed while it was being indexed",
        "eval: stub publish staging dir changed",
      );
    for (let name of await readdir(stubDir))
      if (!keptNames.has(name))
        await rm_2(path.join(stubDir, name), {
          recursive: true,
          force: true,
        });
    await readStubPublishesJson(stubDir, stubPublishDir);
    return stubPublishDir;
  } catch (error) {
    await detectPlatformFlavor(stubDir, {
      harnessOwned: true,
    });
    await rm_2(stubDir, {
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
