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
import {
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { getFsImplementation, safeResolvePath, isDuplicatePath } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { isENOENT } from "../errors.js";
import { Mn } from "../pathClassification.js";

//@ chunk-e6aww6q8.js:806356-806395 affinity
var XEo = /^skill\.md$/i,
  B0t = 32,
  U0t = 4096;
/**
 * 递归遍历插件目录中的 .md 文件（限制数量与深度、跳过符号链接），对每个文件回调。
 */
//@ chunk-e6aww6q8.js:806395-807316 fingerprint = walkPluginMarkdown (0.577)
async function walkPluginMarkdown(rootDir, onFile, opts = {}) {
  let fs = getFsImplementation(),
    label = opts.logLabel ?? "plugin",
    y = 0,
    S = !1,
    w = { dir: rootDir };
  function scan(dirPath, namespace) {
    if (opts.loadedPaths !== void 0 && isAlreadyLoadedPath(fs, w, dirPath, opts.loadedPaths)) return;
    return onFile(dirPath, namespace);
  }
  async function G(q, Z) {
    if (Z.length >= B0t) {
      logForDebugging(`Skipping ${label} directory beyond depth ${B0t}: ${q}`, { level: "error" });
      return;
    }
    if (++y > U0t) {
      if (!S)
        ((S = !0),
          logForDebugging(`Stopping ${label} scan after ${U0t} directories (root=${rootDir})`, {
            level: "error",
          }));
      return;
    }
    try {
      let entries = await fs.readdir(q);
      if (opts.stopAtSkillDir && entries.some((ke) => ke.isFile() && XEo.test(ke.name))) {
        await Promise.all(
          entries.map((entry) =>
            entry.isFile() && entry.name.toLowerCase().endsWith(".md")
              ? scan(join_35(q, entry.name), Z)
              : void 0,
          ),
        );
        return;
      }
      await Promise.all(
        entries.map((entry) => {
          let fullPath = join_35(q, entry.name);
          if (entry.isDirectory()) return G(fullPath, [...Z, entry.name]);
          if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) return scan(fullPath, Z);
          return;
        }),
      );
    } catch (error) {
      if (opts.isRootOptional && q === rootDir && isENOENT(error)) return;
      logForDebugging(`Failed to scan ${label} directory ${q}: ${error}`, { level: "error" });
    }
  }
  await G(rootDir, []);
}
/**
 * 按规范化真实路径去重，判断文件是否已加载（未加载则登记）。旧版名 validateGlobPattern 误配，属插件 markdown 遍历。
 */
//@ chunk-e6aww6q8.js:807316-807506 placement = validateGlobPattern (0.6)
function isAlreadyLoadedPath(fs, rootState, filePath, loadedPaths) {
  if (((rootState.resolution ??= safeResolvePath(fs, rootState.dir)), !rootState.resolution.isCanonical))
    return isDuplicatePath(fs, filePath, loadedPaths);
  let basePath = Mn(join_35(rootState.resolution.resolvedPath, relative_14(rootState.dir, filePath)));
  if (loadedPaths.has(basePath)) return !0;
  return (loadedPaths.add(basePath), !1);
}

export { walkPluginMarkdown };
