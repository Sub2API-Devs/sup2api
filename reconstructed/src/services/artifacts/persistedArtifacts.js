/**
 * services/artifacts/persistedArtifacts.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bhxaz9j0.js (2)
 * attribution: placement 2
 */
import { basename, dirname, dirname as dirname_2 } from "path";
import { TOOL_RESULTS_SUBDIR } from "../../utils/toolResultStorage.js";

/**
 * 生成 artifact 落盘文件的 id：`artifact-<前 8 位清洗后的 id>-<清洗后的名字>`。
 */
//@ chunk-bhxaz9j0.js:4258-4355 placement
function makeArtifactPersistId(e, r) {
  let n = (i) => i.replace(/[^\w-]/g, "");
  return `artifact-${n(e).slice(0, 8)}-${n(r)}`;
}
/**
 * 判断路径是否是落盘的 artifact 文件（文件名以 artifact- 开头且父目录为指定目录）。
 */
//@ chunk-bhxaz9j0.js:4355-4450 placement
function isPersistedArtifactPath(e) {
  return (
    basename(e).toLowerCase().startsWith("artifact-") &&
    basename(dirname_2(e)).toLowerCase() === TOOL_RESULTS_SUBDIR
  );
}

export { makeArtifactPersistId, isPersistedArtifactPath };
