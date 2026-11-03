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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
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
var j0t = 1048576;
//@ chunk-e6aww6q8.js:807522-807667 fingerprint = loadOutputStylesFromDirectory (0.836)
async function loadOutputStylesFromDirectory(outputStylesPath, pluginName, loadedPaths) {
  let styles = [];
  return (
    await walkPluginMarkdown(
      outputStylesPath,
      async (fullPath) => {
        let y = await loadOutputStyleFromFile(fullPath, pluginName);
        if (y) styles.push(y);
      },
      { logLabel: "output-styles", loadedPaths: loadedPaths },
    ),
    styles
  );
}
//@ chunk-e6aww6q8.js:807667-808295 fingerprint = loadOutputStyleFromFile (0.603)
async function loadOutputStyleFromFile(e, n) {
  let fs = getFsImplementation();
  try {
    let s = await readSmallFileChecked(fs, e, j0t);
    if (s === null)
      return (
        logForDebugging(
          `Skipping plugin output-style ${e}: not a regular file or exceeds ${j0t} byte limit`,
          { level: "warn" },
        ),
        null
      );
    let { frontmatter: frontmatter, content: content } = parseFrontmatter(s, e, { normalizeKeys: !0 }),
      fileName = basename_12(e, ".md"),
      w = (frontmatter.name != null ? String(frontmatter.name) : void 0) || fileName,
      name = `${n}:${w}`,
      G =
        coerceDescriptionToString(frontmatter.description, name) ??
        extractDescriptionFromMarkdown(content, `Output style from ${n} plugin`);
    return {
      name: name,
      description: G,
      prompt: content.trim(),
      source: "plugin",
      forceForPlugin: parseBooleanishFrontmatter(frontmatter["force-for-plugin"]),
      keepCodingInstructions: parseBooleanishFrontmatter(frontmatter["keep-coding-instructions"]),
    };
  } catch (error) {
    return (logForDebugging(`Failed to load output style from ${e}: ${error}`, { level: "error" }), null);
  }
}
/**
 * 加载所有启用插件的输出样式（output-styles/ 或 manifest.outputStyles 下的 markdown），缓存在全局 outputStyles。
 */
//@ chunk-e6aww6q8.js:808295-809547 fingerprint = loadPluginOutputStyles (0.873)
function loadPluginOutputStyles(e) {
  let n = getPluginRegistry();
  return (
    (n.outputStyles ??= (async () => {
      let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(e),
        allStyles = [];
      if (errors.length > 0)
        logForDebugging(`Plugin loading errors: ${errors.map((S) => pluginErrorText(S)).join(", ")}`);
      let y = null;
      for (let plugin of enabled) {
        let loadedPaths = new Set();
        if (plugin.outputStylesPath)
          try {
            let styles = await loadOutputStylesFromDirectory(
              plugin.outputStylesPath,
              plugin.name,
              loadedPaths,
            );
            if ((allStyles.push(...styles), styles.length > 0))
              logForDebugging(
                `Loaded ${styles.length} output styles from plugin ${plugin.name} default directory`,
              );
          } catch (error) {
            ((y = "plugin_load_output_styles_dir_failed"),
              logForDebugging(
                `Failed to load output styles from plugin ${plugin.name} default directory: ${error}`,
                { level: "error" },
              ));
          }
        if (plugin.outputStylesPaths)
          for (let stylePath of plugin.outputStylesPaths)
            try {
              let fs = getFsImplementation(),
                stats = await fs.stat(stylePath);
              if (stats.isDirectory()) {
                let styles = await loadOutputStylesFromDirectory(stylePath, plugin.name, loadedPaths);
                if ((allStyles.push(...styles), styles.length > 0))
                  logForDebugging(
                    `Loaded ${styles.length} output styles from plugin ${plugin.name} custom path: ${stylePath}`,
                  );
              } else if (stats.isFile() && stylePath.endsWith(".md")) {
                if (isDuplicatePath(fs, stylePath, loadedPaths)) continue;
                let Z = await loadOutputStyleFromFile(stylePath, plugin.name);
                if (Z)
                  (allStyles.push(Z),
                    logForDebugging(
                      `Loaded output style from plugin ${plugin.name} custom file: ${stylePath}`,
                    ));
              }
            } catch (error) {
              ((y = "plugin_load_output_styles_path_failed"),
                logForDebugging(
                  `Failed to load output styles from plugin ${plugin.name} custom path ${stylePath}: ${error}`,
                  { level: "error" },
                ));
            }
      }
      if ((logForDebugging(`Total plugin output styles loaded: ${allStyles.length}`), y))
        logFeatureBad("plugin_load_output_styles", y);
      else logFeatureOk("plugin_load_output_styles");
      return allStyles;
    })()),
    n.outputStyles
  );
}

export { loadPluginOutputStyles };
