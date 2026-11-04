/**
 * utils/plugins/walkPluginMarkdown.ts
 *
 * 递归遍历插件目录中的 markdown 文件（限量、跳过符号链接）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/walkPluginMarkdown.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: affinity 1, fingerprint 1, placement 1
 */
import { join, relative } from "path";
import { getFsImplementation, safeResolvePath, isDuplicatePath } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { isENOENT } from "../errors.js";
import { identity } from "../pathClassification.js";

//@ chunk-e6aww6q8.js:806356-806395 affinity
var SKILL_MD_RE = /^skill\.md$/i;
var MAX_PLUGIN_MARKDOWN_DEPTH = 32;
var MAX_PLUGIN_MARKDOWN_LENGTH = 4096;
//@ chunk-e6aww6q8.js:806395-807316 fingerprint = walkPluginMarkdown (0.577)
/**
 * 递归遍历插件目录中的 .md 文件（限制数量与深度、跳过符号链接），对每个文件回调。
 */
async function walkPluginMarkdown(rootDir, onFile, opts = {}) {
  let fs = getFsImplementation();
  let label = opts.logLabel ?? "plugin";
  let directoryCount = 0;
  let limitLogged = false;
  let rootState = {
    dir: rootDir,
  };
  function scan(dirPath, namespace) {
    if (opts.loadedPaths !== undefined && isAlreadyLoadedPath(fs, rootState, dirPath, opts.loadedPaths))
      return;
    return onFile(dirPath, namespace);
  }
  async function scan_2(dirPath, namespace) {
    if (namespace.length >= MAX_PLUGIN_MARKDOWN_DEPTH) {
      logForDebugging(`Skipping ${label} directory beyond depth ${MAX_PLUGIN_MARKDOWN_DEPTH}: ${dirPath}`, {
        level: "error",
      });
      return;
    }
    if (++directoryCount > MAX_PLUGIN_MARKDOWN_LENGTH) {
      if (!limitLogged) {
        limitLogged = true;
        logForDebugging(
          `Stopping ${label} scan after ${MAX_PLUGIN_MARKDOWN_LENGTH} directories (root=${rootDir})`,
          {
            level: "error",
          },
        );
      }
      return;
    }
    try {
      let entries = await fs.readdir(dirPath);
      if (opts.stopAtSkillDir && entries.some((e) => e.isFile() && SKILL_MD_RE.test(e.name))) {
        await Promise.all(
          entries.map((entry) =>
            entry.isFile() && entry.name.toLowerCase().endsWith(".md")
              ? scan(join(dirPath, entry.name), namespace)
              : undefined,
          ),
        );
        return;
      }
      await Promise.all(
        entries.map((entry) => {
          let fullPath = join(dirPath, entry.name);
          if (entry.isDirectory()) return scan_2(fullPath, [...namespace, entry.name]);
          if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) return scan(fullPath, namespace);
          return;
        }),
      );
    } catch (error) {
      if (opts.isRootOptional && dirPath === rootDir && isENOENT(error)) return;
      logForDebugging(`Failed to scan ${label} directory ${dirPath}: ${error}`, {
        level: "error",
      });
    }
  }
  await scan_2(rootDir, []);
}
//@ chunk-e6aww6q8.js:807316-807506 placement = validateGlobPattern (0.6)
/**
 * 按规范化真实路径去重，判断文件是否已加载（未加载则登记）。旧版名 validateGlobPattern 误配，属插件 markdown 遍历。
 */
function isAlreadyLoadedPath(fs, rootState, filePath, loadedPaths) {
  rootState.resolution ??= safeResolvePath(fs, rootState.dir);
  if (!rootState.resolution.isCanonical) return isDuplicatePath(fs, filePath, loadedPaths);
  let basePath = identity(join(rootState.resolution.resolvedPath, relative(rootState.dir, filePath)));
  if (loadedPaths.has(basePath)) return true;
  loadedPaths.add(basePath);
  return false;
}
export { walkPluginMarkdown };
