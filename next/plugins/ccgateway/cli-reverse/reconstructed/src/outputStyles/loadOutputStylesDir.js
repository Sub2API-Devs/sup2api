/**
 * outputStyles/loadOutputStylesDir.ts
 *
 * 从 managed/用户/项目 output-styles 目录加载自定义输出风格（markdown + frontmatter）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/outputStyles/loadOutputStylesDir.ts
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 4, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, join, basename } from "path";
import {
  getClaudeConfigDir,
  loadMarkdownFilesCached,
  extractDescriptionFromMarkdown,
  compareByBaseDirDepth,
} from "../utils/markdownConfigLoader.js";
import { getOrCreate, getHostState, keyOrNull } from "../utils/hostEnvironment.js";
import { managedFolderCondition } from "../plugins/functionHooks/sites/promptContextSites.js";
import { checkFrontmatterShadow } from "../utils/frontmatterSchema.js";
import { coerceDescriptionToString, parseBooleanishFrontmatter } from "../utils/frontmatterParser.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { clearCachedOutputStyles } from "../utils/plugins/schemas.js";

//@ chunk-5xgkngpb.js:816549-816573 placement
var OUTPUT_STYLES = "output-styles";
//@ chunk-5xgkngpb.js:816573-816614 placement
/**
 * 返回 <配置目录>/output-styles 的解析后路径（managed 层）。
 */
function managedOutputStylesDir() {
  return resolve_2(join(getClaudeConfigDir(), OUTPUT_STYLES));
}
//@ chunk-5xgkngpb.js:816614-816702 placement
/**
 * 按主机与会话键缓存地加载某一层（managed/user/project）的 *.md 输出风格，解析 frontmatter 的 name/description/keep-coding-instructions。
 */
function getOutputStyleDirStyles(cwd, context) {
  return getOrCreate(
    getHostState().outputStyleDirStyles,
    `${managedFolderCondition()}${keyOrNull(cwd)}`,
    () => getOutputStyleDirStyles_2(cwd, context),
  );
}
//@ chunk-5xgkngpb.js:816702-817532 fingerprint (2.1.88 match: getOutputStyleDirStyles, 0.683)
/**
 * 从 managed/user/project 的 output-styles 目录加载 *.md 输出风格：name 取 frontmatter.name 或文件名，description 缺省取正文首行，keep-coding-instructions 解析为布尔；force-for-plugin 只对插件风格有效，这里告警忽略。
 */
async function getOutputStyleDirStyles_2(cwd, context) {
  try {
    let sorted = (await loadMarkdownFilesCached(OUTPUT_STYLES, cwd, context))
      .map(({ filePath, frontmatter, content, source, baseDir }) => {
        try {
          checkFrontmatterShadow("output-style", frontmatter);
          let styleName = basename(filePath).replace(/\.md$/, "");
          let name = (frontmatter.name != null ? String(frontmatter.name) : undefined) || styleName;
          let description =
            coerceDescriptionToString(frontmatter.description, styleName) ??
            extractDescriptionFromMarkdown(content, `Custom ${styleName} output style`);
          let keepCodingInstructions = parseBooleanishFrontmatter(frontmatter["keep-coding-instructions"]);
          if (frontmatter["force-for-plugin"] !== undefined)
            logForDebugging(
              `Output style "${name}" has force-for-plugin set, but this option only applies to plugin output styles. Ignoring.`,
              {
                level: "warn",
              },
            );
          return {
            name,
            description,
            prompt: content.trim(),
            source,
            baseDir,
            keepCodingInstructions,
          };
        } catch (error) {
          logError(error);
          return null;
        }
      })
      .filter((style) => style !== null)
      .sort(compareByBaseDirDepth);
    logFeatureOk("output_style_load");
    return sorted;
  } catch (error) {
    logFeatureSad("output_style_load", "output_style_load_failed");
    logForDebugging(
      `Failed to load output styles: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return [];
  }
}
//@ chunk-5xgkngpb.js:817532-817619 placement
/**
 * 清空输出风格的目录缓存、markdown 缓存与上层缓存。
 */
function clearOutputStyleCaches() {
  let hostState = getHostState();
  hostState.outputStyleDirStyles.clear();
  hostState.markdownFiles.clear();
  clearCachedOutputStyles();
}
export { managedOutputStylesDir, clearOutputStyleCaches, getOutputStyleDirStyles };
