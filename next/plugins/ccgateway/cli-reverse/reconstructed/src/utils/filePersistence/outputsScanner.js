/**
 * utils/filePersistence/outputsScanner.ts
 *
 * 扫描输出目录中修改过的 .md 文件；环境类型（byoc/anthropic_cloud）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/filePersistence/outputsScanner.ts
 * pieces: chunk-23fm9f0d.js (2), chunk-82kqcve8.js (1)
 * attribution: affinity 1, fingerprint 2
 */
import { join } from "path";
import { env } from "../env.js";
import { emptyCleanupResult, tryRmdir } from "../cleanup.js";
import { isFsInaccessible, isENOENT } from "../errors.js";
import { readFileInRange } from "../readFileInRange.js";
import {
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  parseFrontmatter,
} from "../frontmatterParser.js";

//@ chunk-82kqcve8.js:178237-178347 fingerprint = getEnvironmentKind (1)
/**
 * 读取 CLAUDE_CODE_ENVIRONMENT_KIND，只接受 byoc 或 anthropic_cloud。
 */
function getEnvironmentKind() {
  let kind = env.CLAUDE_CODE_ENVIRONMENT_KIND;
  if (kind === "byoc" || kind === "anthropic_cloud") return kind;
  return null;
}
//@ chunk-23fm9f0d.js:36356-36380 affinity
var SKILL_PROPOSAL = "skill-proposal";
//@ chunk-23fm9f0d.js:36380-36895 fingerprint = findModifiedFiles (0.349)
/**
 * 扫描输出目录中修改过的 .md 文件（跳过符号链接，统计错误数）。
 */
async function findModifiedFiles(dirPath, cutoffDate, fsImplementation) {
  let result = emptyCleanupResult();
  try {
    if ((await fsImplementation.lstat(dirPath)).isSymbolicLink()) return result;
  } catch (error) {
    if (!isFsInaccessible(error)) result.errors++;
    return result;
  }
  let entries = await fsImplementation.readdir(dirPath).catch((error) => {
    if (!isENOENT(error)) result.errors++;
    return [];
  });
  for (let entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    let parentPath = join(dirPath, entry.name);
    try {
      let { content, mtimeMs } = await readFileInRange(
        parentPath,
        0,
        MAX_UNTRUSTED_FRONTMATTER_LINES,
        MAX_UNTRUSTED_FRONTMATTER_BYTES,
        undefined,
        {
          truncateOnByteLimit: true,
        },
      );
      if (!(mtimeMs < cutoffDate.getTime())) continue;
      if (parseFrontmatter(content, parentPath).frontmatter.type !== SKILL_PROPOSAL) continue;
      await fsImplementation.unlink(parentPath);
      result.messages++;
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  await tryRmdir(dirPath, fsImplementation);
  return result;
}
export { findModifiedFiles, getEnvironmentKind };
