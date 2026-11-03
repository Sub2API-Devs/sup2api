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
import { join, join as join_2, join as join_3 } from "path";
import { emptyCleanupResult, tryRmdir } from "../cleanup.js";
import { isFsInaccessible, isENOENT } from "../errors.js";
import { readFileInRange } from "../readFileInRange.js";
import {
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  parseFrontmatter,
} from "../frontmatterParser.js";
import { env } from "../env.js";

//@ chunk-23fm9f0d.js:36356-36380 affinity
var SKILL_PROPOSAL = "skill-proposal";
/**
 * 扫描输出目录中修改过的 .md 文件（跳过符号链接，统计错误数）。
 */
//@ chunk-23fm9f0d.js:36380-36895 fingerprint = findModifiedFiles (0.349)
async function findModifiedFiles(e, r, s) {
  let n = emptyCleanupResult();
  try {
    if ((await s.lstat(e)).isSymbolicLink()) return n;
  } catch (error) {
    if (!isFsInaccessible(error)) n.errors++;
    return n;
  }
  let f = await s.readdir(e).catch((i) => {
    if (!isENOENT(i)) n.errors++;
    return [];
  });
  for (let entry of f) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    let parentPath = join(e, entry.name);
    try {
      let { content: content, mtimeMs: mtimeMs } = await readFileInRange(
        parentPath,
        0,
        MAX_UNTRUSTED_FRONTMATTER_LINES,
        MAX_UNTRUSTED_FRONTMATTER_BYTES,
        void 0,
        { truncateOnByteLimit: !0 },
      );
      if (!(mtimeMs < r.getTime())) continue;
      if (parseFrontmatter(content, parentPath).frontmatter.type !== SKILL_PROPOSAL) continue;
      (await s.unlink(parentPath), n.messages++);
    } catch (error) {
      if (!isENOENT(error)) n.errors++;
    }
  }
  return (await tryRmdir(e, s), n);
}
/**
 * 读取 CLAUDE_CODE_ENVIRONMENT_KIND，只接受 byoc 或 anthropic_cloud。
 */
//@ chunk-82kqcve8.js:178237-178347 fingerprint = getEnvironmentKind (1)
function getEnvironmentKind() {
  let kind = env.CLAUDE_CODE_ENVIRONMENT_KIND;
  if (kind === "byoc" || kind === "anthropic_cloud") return kind;
  return null;
}

export { findModifiedFiles, getEnvironmentKind };
