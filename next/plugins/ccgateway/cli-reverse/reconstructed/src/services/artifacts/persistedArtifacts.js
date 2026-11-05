/**
 * services/artifacts/persistedArtifacts.ts
 *
 * 2.1.316 新增：artifact 落盘文件的 id 生成与路径识别（文件名以 artifact- 开头且父目录匹配）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qwkyjqpg.js (2)
 * attribution: placement 2
 */
import { basename, dirname } from "path";
import { TOOL_RESULTS_SUBDIR } from "../../utils/toolResultStorage.js";

//@ chunk-qwkyjqpg.js:3736-3833 placement
/**
 * 生成 artifact 落盘文件的 id：`artifact-<前 8 位清洗后的 id>-<清洗后的名字>`。
 */
function makeArtifactPersistId(slug, ver) {
  let sanitize = (value) => value.replace(/[^\w-]/g, "");
  return `artifact-${sanitize(slug).slice(0, 8)}-${sanitize(ver)}`;
}
//@ chunk-qwkyjqpg.js:3833-3928 placement
/**
 * 判断路径是否是落盘的 artifact 文件（文件名以 artifact- 开头且父目录为指定目录）。
 */
function isPersistedArtifactPath(path) {
  return (
    basename(path).toLowerCase().startsWith("artifact-") &&
    basename(dirname(path)).toLowerCase() === TOOL_RESULTS_SUBDIR
  );
}
export { makeArtifactPersistId, isPersistedArtifactPath };
