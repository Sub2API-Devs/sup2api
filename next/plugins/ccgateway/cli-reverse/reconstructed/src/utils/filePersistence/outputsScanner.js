/**
 * utils/filePersistence/outputsScanner.ts
 *
 * 扫描输出目录中修改过的 .md 文件；环境类型（byoc/anthropic_cloud）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/filePersistence/outputsScanner.ts
 * pieces: chunk-a2q0x549.js (1), chunk-pc3x100t.js (2)
 * attribution: fingerprint 2, affinity 1
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

//@ chunk-a2q0x549.js:176405-176515 fingerprint (2.1.88 match: getEnvironmentKind, 1)
/**
 * 读取 CLAUDE_CODE_ENVIRONMENT_KIND，只接受 byoc 或 anthropic_cloud。
 */
function getEnvironmentKind() {
  let kind = env.CLAUDE_CODE_ENVIRONMENT_KIND;
  if (kind === "byoc" || kind === "anthropic_cloud") return kind;
  return null;
}
//@ chunk-pc3x100t.js:36631-36655 affinity
var SKILL_PROPOSAL = "skill-proposal";
//@ chunk-pc3x100t.js:36655-37170 fingerprint (2.1.88 match: findModifiedFiles, 0.349)
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
