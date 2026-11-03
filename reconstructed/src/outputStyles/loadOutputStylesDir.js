/**
 * outputStyles/loadOutputStylesDir.ts
 *
 * 从 managed/用户/项目 output-styles 目录加载自定义输出风格（markdown + frontmatter）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/outputStyles/loadOutputStylesDir.ts
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 4, fingerprint 1
 */
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
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
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { getOrCreate, getHostState, keyOrNull } from "../utils/hostEnvironment.js";
import { W1 } from "../plugins/functionHooks/sites/promptContextSites.js";
import {
  loadMarkdownFilesCached,
  extractDescriptionFromMarkdown,
  compareByBaseDirDepth,
} from "../utils/markdownConfigLoader.js";
import { checkFrontmatterShadow } from "../utils/frontmatterSchema.js";
import { coerceDescriptionToString, parseBooleanishFrontmatter } from "../utils/frontmatterParser.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { clearCachedOutputStyles } from "../utils/plugins/schemas.js";

//@ chunk-e6aww6q8.js:805209-805233 placement
var OUTPUT_STYLES = "output-styles";
//@ chunk-e6aww6q8.js:805233-805274 placement
function H6s() {
  return resolve_13(join_33(getClaudeConfigDir(), OUTPUT_STYLES));
}
//@ chunk-e6aww6q8.js:805274-805362 placement
function H0t(e, n) {
  return getOrCreate(getHostState().outputStyleDirStyles, `${W1()}${keyOrNull(e)}`, () =>
    getOutputStyleDirStyles(e, n),
  );
}
/**
 * 从 managed/user/project 的 output-styles 目录加载 *.md 输出风格：name 取 frontmatter.name 或文件名，description 缺省取正文首行，keep-coding-instructions 解析为布尔；force-for-plugin 只对插件风格有效，这里告警忽略。
 */
//@ chunk-e6aww6q8.js:805362-806189 fingerprint = getOutputStyleDirStyles (0.682)
async function getOutputStyleDirStyles(e, n) {
  try {
    let sorted = (await loadMarkdownFilesCached(OUTPUT_STYLES, e, n))
      .map(
        ({
          filePath: filePath,
          frontmatter: frontmatter,
          content: content,
          source: source,
          baseDir: baseDir,
        }) => {
          try {
            checkFrontmatterShadow("output-style", frontmatter);
            let styleName = basename_11(filePath).replace(/\.md$/, ""),
              Z = (frontmatter.name != null ? String(frontmatter.name) : void 0) || styleName,
              Se =
                coerceDescriptionToString(frontmatter.description, styleName) ??
                extractDescriptionFromMarkdown(content, `Custom ${styleName} output style`),
              ke = parseBooleanishFrontmatter(frontmatter["keep-coding-instructions"]);
            if (frontmatter["force-for-plugin"] !== void 0)
              logForDebugging(
                `Output style "${Z}" has force-for-plugin set, but this option only applies to plugin output styles. Ignoring.`,
                { level: "warn" },
              );
            return {
              name: Z,
              description: Se,
              prompt: content.trim(),
              source: source,
              baseDir: baseDir,
              keepCodingInstructions: ke,
            };
          } catch (error) {
            return (logError(error), null);
          }
        },
      )
      .filter((style) => style !== null)
      .sort(compareByBaseDirDepth);
    return (logFeatureOk("output_style_load"), sorted);
  } catch (error) {
    return (
      logFeatureSad("output_style_load", "output_style_load_failed"),
      logForDebugging(
        `Failed to load output styles: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      []
    );
  }
}
//@ chunk-e6aww6q8.js:806189-806276 placement
function Awt() {
  let e = getHostState();
  (e.outputStyleDirStyles.clear(), e.markdownFiles.clear(), clearCachedOutputStyles());
}

export { H6s, Awt, H0t };
