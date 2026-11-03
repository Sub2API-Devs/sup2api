/**
 * utils/jetbrains.ts
 *
 * JetBrains IDE 配置/插件目录定位与 claude-code-jetbrains-plugin 安装检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/jetbrains.ts
 * pieces: chunk-7kpfrhzn.js (1), chunk-e6aww6q8.js (4)
 * attribution: fingerprint 4, affinity 1
 */
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
  platform,
} from "os";
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
} from "path";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-e6aww6q8.js:3233857-3234221 fingerprint = ideNameToDirMap (0.978)
var CLAUDE_CODE_JETBRAINS_PLUGIN = "claude-code-jetbrains-plugin",
  vEn = {
    pycharm: ["PyCharm"],
    intellij: ["IntelliJIdea", "IdeaIC"],
    webstorm: ["WebStorm"],
    phpstorm: ["PhpStorm"],
    rubymine: ["RubyMine"],
    clion: ["CLion"],
    goland: ["GoLand"],
    rider: ["Rider"],
    datagrip: ["DataGrip"],
    appcode: ["AppCode"],
    dataspell: ["DataSpell"],
    aqua: ["Aqua"],
    gateway: ["Gateway"],
    fleet: ["Fleet"],
    androidstudio: ["AndroidStudio"],
  };
//@ chunk-e6aww6q8.js:3234221-3234943 fingerprint = buildCommonPluginDirectoryPaths (1)
function buildCommonPluginDirectoryPaths(ideName) {
  let homeDir = homedir_10(),
    directories = [],
    idePatterns = vEn[ideName.toLowerCase()];
  if (!idePatterns) return directories;
  let h = env.APPDATA || join_87(homeDir, "AppData", "Roaming"),
    y = env.LOCALAPPDATA || join_87(homeDir, "AppData", "Local");
  switch (platform()) {
    case "darwin":
      if (
        (directories.push(
          join_87(homeDir, "Library", "Application Support", "JetBrains"),
          join_87(homeDir, "Library", "Application Support"),
        ),
        ideName.toLowerCase() === "androidstudio")
      )
        directories.push(join_87(homeDir, "Library", "Application Support", "Google"));
      break;
    case "win32":
      if (
        (directories.push(join_87(h, "JetBrains"), join_87(y, "JetBrains"), join_87(h)),
        ideName.toLowerCase() === "androidstudio")
      )
        directories.push(join_87(y, "Google"));
      break;
    case "linux":
      directories.push(
        join_87(homeDir, ".config", "JetBrains"),
        join_87(homeDir, ".local", "share", "JetBrains"),
      );
      for (let pattern of idePatterns) directories.push(join_87(homeDir, "." + pattern));
      if (ideName.toLowerCase() === "androidstudio") directories.push(join_87(homeDir, ".config", "Google"));
      break;
    default:
      break;
  }
  return directories;
}
/**
 * 按平台列出 JetBrains 各 IDE 的插件目录候选。
 */
//@ chunk-e6aww6q8.js:3234943-3235392 fingerprint = detectPluginDirectories (1)
async function detectPluginDirectories(ideName) {
  let foundDirectories = [],
    fs = getFsImplementation(),
    pluginDirPaths = buildCommonPluginDirectoryPaths(ideName),
    idePatterns = vEn[ideName.toLowerCase()];
  if (!idePatterns) return foundDirectories;
  let regexes = idePatterns.map((S) => new RegExp("^" + S));
  for (let baseDir of pluginDirPaths)
    try {
      let entries = await fs.readdir(baseDir);
      for (let regex of regexes)
        for (let entry of entries) {
          if (!regex.test(entry.name)) continue;
          if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
          let dir = join_87(baseDir, entry.name);
          if (platform() === "linux") {
            foundDirectories.push(dir);
            continue;
          }
          let pluginDir = join_87(dir, "plugins");
          try {
            (await fs.stat(pluginDir), foundDirectories.push(pluginDir));
          } catch {}
        }
    } catch {
      continue;
    }
  return foundDirectories.filter((dir, index) => foundDirectories.indexOf(dir) === index);
}
/**
 * JetBrains 插件目录中是否存在 claude-code-jetbrains-plugin。
 */
//@ chunk-e6aww6q8.js:3235392-3235515 affinity
async function isJetBrainsPluginInstalled(e) {
  let n = await detectPluginDirectories(e);
  for (let r of n) {
    let s = join_87(r, CLAUDE_CODE_JETBRAINS_PLUGIN);
    try {
      return (await getFsImplementation().stat(s), !0);
    } catch {}
  }
  return !1;
}
//@ chunk-7kpfrhzn.js:19240-19309 fingerprint = isJetBrainsPluginInstalled (0.642)
async function isJetBrainsPluginInstalled_2(ideType) {
  return Number((await ideType.stat({ bigint: !0 })).size);
}

export { isJetBrainsPluginInstalled_2, isJetBrainsPluginInstalled };
