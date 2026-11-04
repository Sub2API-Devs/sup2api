/**
 * utils/plugins/loadPluginOutputStyles.ts
 *
 * 从插件 output-styles/ 目录加载输出样式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginOutputStyles.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: affinity 1, fingerprint 3
 */
import { basename } from "path";
import { walkPluginMarkdown } from "./walkPluginMarkdown.js";
import { getFsImplementation, isDuplicatePath } from "../fsOperations.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import { logForDebugging } from "../debug.js";
import {
  parseFrontmatter,
  coerceDescriptionToString,
  parseBooleanishFrontmatter,
} from "../frontmatterParser.js";
import { extractDescriptionFromMarkdown } from "../markdownConfigLoader.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { pluginErrorText } from "../../types/plugin.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:807506-807522 affinity
var MAX_OUTPUT_STYLE_FILE_BYTES = 1048576;
//@ chunk-e6aww6q8.js:807522-807667 fingerprint = loadOutputStylesFromDirectory (0.836)
async function loadOutputStylesFromDirectory(outputStylesPath, pluginName, loadedPaths) {
  let styles = [];
  await walkPluginMarkdown(
    outputStylesPath,
    async (fullPath) => {
      let style = await loadOutputStyleFromFile(fullPath, pluginName);
      if (style) styles.push(style);
    },
    {
      logLabel: "output-styles",
      loadedPaths,
    },
  );
  return styles;
}
//@ chunk-e6aww6q8.js:807667-808295 fingerprint = loadOutputStyleFromFile (0.603)
async function loadOutputStyleFromFile(filePath, pluginName) {
  let fs = getFsImplementation();
  try {
    let smallFileChecked = await readSmallFileChecked(fs, filePath, MAX_OUTPUT_STYLE_FILE_BYTES);
    if (smallFileChecked === null) {
      logForDebugging(
        `Skipping plugin output-style ${filePath}: not a regular file or exceeds ${MAX_OUTPUT_STYLE_FILE_BYTES} byte limit`,
        {
          level: "warn",
        },
      );
      return null;
    }
    let { frontmatter, content: markdownContent } = parseFrontmatter(smallFileChecked, filePath, {
      normalizeKeys: true,
    });
    let fileName = basename(filePath, ".md");
    let baseStyleName = (frontmatter.name != null ? String(frontmatter.name) : undefined) || fileName;
    let name = `${pluginName}:${baseStyleName}`;
    let description =
      coerceDescriptionToString(frontmatter.description, name) ??
      extractDescriptionFromMarkdown(markdownContent, `Output style from ${pluginName} plugin`);
    return {
      name,
      description,
      prompt: markdownContent.trim(),
      source: "plugin",
      forceForPlugin: parseBooleanishFrontmatter(frontmatter["force-for-plugin"]),
      keepCodingInstructions: parseBooleanishFrontmatter(frontmatter["keep-coding-instructions"]),
    };
  } catch (error) {
    logForDebugging(`Failed to load output style from ${filePath}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:808295-809547 fingerprint = loadPluginOutputStyles (0.873)
/**
 * 加载所有启用插件的输出样式（output-styles/ 或 manifest.outputStyles 下的 markdown），缓存在全局 outputStyles。
 */
function loadPluginOutputStyles(storageV5) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.outputStyles ??= (async () => {
    let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
    let allStyles = [];
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
    let failureKind = null;
    for (let plugin of enabled) {
      let loadedPaths = new Set();
      if (plugin.outputStylesPath)
        try {
          let styles = await loadOutputStylesFromDirectory(plugin.outputStylesPath, plugin.name, loadedPaths);
          allStyles.push(...styles);
          if (styles.length > 0)
            logForDebugging(
              `Loaded ${styles.length} output styles from plugin ${plugin.name} default directory`,
            );
        } catch (error) {
          failureKind = "plugin_load_output_styles_dir_failed";
          logForDebugging(
            `Failed to load output styles from plugin ${plugin.name} default directory: ${error}`,
            {
              level: "error",
            },
          );
        }
      if (plugin.outputStylesPaths)
        for (let stylePath of plugin.outputStylesPaths)
          try {
            let fs = getFsImplementation();
            let stats = await fs.stat(stylePath);
            if (stats.isDirectory()) {
              let styles = await loadOutputStylesFromDirectory(stylePath, plugin.name, loadedPaths);
              allStyles.push(...styles);
              if (styles.length > 0)
                logForDebugging(
                  `Loaded ${styles.length} output styles from plugin ${plugin.name} custom path: ${stylePath}`,
                );
            } else if (stats.isFile() && stylePath.endsWith(".md")) {
              if (isDuplicatePath(fs, stylePath, loadedPaths)) continue;
              let style = await loadOutputStyleFromFile(stylePath, plugin.name);
              if (style) {
                allStyles.push(style);
                logForDebugging(`Loaded output style from plugin ${plugin.name} custom file: ${stylePath}`);
              }
            }
          } catch (error) {
            failureKind = "plugin_load_output_styles_path_failed";
            logForDebugging(
              `Failed to load output styles from plugin ${plugin.name} custom path ${stylePath}: ${error}`,
              {
                level: "error",
              },
            );
          }
    }
    logForDebugging(`Total plugin output styles loaded: ${allStyles.length}`);
    if (failureKind) logFeatureBad("plugin_load_output_styles", failureKind);
    else logFeatureOk("plugin_load_output_styles");
    return allStyles;
  })();
  return pluginRegistry.outputStyles;
}
export { loadPluginOutputStyles };
