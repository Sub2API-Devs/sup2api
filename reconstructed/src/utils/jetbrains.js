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
import { homedir, platform } from "os";
import { join } from "path";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-e6aww6q8.js:3233857-3234221 fingerprint = ideNameToDirMap (0.978)
/**
 * JetBrains 插件 ID 及各 IDE 产品目录名映射。
 */
var CLAUDE_CODE_JETBRAINS_PLUGIN = "claude-code-jetbrains-plugin";
var JETBRAINS_PRODUCT_DIRS = {
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
  let homeDir = homedir();
  let directories = [];
  let idePatterns = JETBRAINS_PRODUCT_DIRS[ideName.toLowerCase()];
  if (!idePatterns) return directories;
  let appData = env.APPDATA || join(homeDir, "AppData", "Roaming");
  let localAppData = env.LOCALAPPDATA || join(homeDir, "AppData", "Local");
  switch (platform()) {
    case "darwin":
      directories.push(
        join(homeDir, "Library", "Application Support", "JetBrains"),
        join(homeDir, "Library", "Application Support"),
      );
      if (ideName.toLowerCase() === "androidstudio")
        directories.push(join(homeDir, "Library", "Application Support", "Google"));
      break;
    case "win32":
      directories.push(join(appData, "JetBrains"), join(localAppData, "JetBrains"), join(appData));
      if (ideName.toLowerCase() === "androidstudio") directories.push(join(localAppData, "Google"));
      break;
    case "linux":
      directories.push(join(homeDir, ".config", "JetBrains"), join(homeDir, ".local", "share", "JetBrains"));
      for (let pattern of idePatterns) directories.push(join(homeDir, "." + pattern));
      if (ideName.toLowerCase() === "androidstudio") directories.push(join(homeDir, ".config", "Google"));
      break;
    default:
      break;
  }
  return directories;
}
//@ chunk-e6aww6q8.js:3234943-3235392 fingerprint = detectPluginDirectories (1)
/**
 * 按平台列出 JetBrains 各 IDE 的插件目录候选。
 */
async function detectPluginDirectories(ideName) {
  let foundDirectories = [];
  let fs = getFsImplementation();
  let pluginDirPaths = buildCommonPluginDirectoryPaths(ideName);
  let idePatterns = JETBRAINS_PRODUCT_DIRS[ideName.toLowerCase()];
  if (!idePatterns) return foundDirectories;
  let regexes = idePatterns.map((idePattern) => new RegExp("^" + idePattern));
  for (let baseDir of pluginDirPaths)
    try {
      let entries = await fs.readdir(baseDir);
      for (let regex of regexes)
        for (let entry of entries) {
          if (!regex.test(entry.name)) continue;
          if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
          let dir = join(baseDir, entry.name);
          if (platform() === "linux") {
            foundDirectories.push(dir);
            continue;
          }
          let pluginDir = join(dir, "plugins");
          try {
            await fs.stat(pluginDir);
            foundDirectories.push(pluginDir);
          } catch {}
        }
    } catch {
      continue;
    }
  return foundDirectories.filter((dir, index) => foundDirectories.indexOf(dir) === index);
}
//@ chunk-e6aww6q8.js:3235392-3235515 affinity
/**
 * JetBrains 插件目录中是否存在 claude-code-jetbrains-plugin。
 */
async function isJetBrainsPluginInstalled(ideName) {
  let pluginDirectories = await detectPluginDirectories(ideName);
  for (let pluginDirectory of pluginDirectories) {
    let s = join(pluginDirectory, CLAUDE_CODE_JETBRAINS_PLUGIN);
    try {
      await getFsImplementation().stat(s);
      return true;
    } catch {}
  }
  return false;
}
//@ chunk-7kpfrhzn.js:19240-19309 fingerprint = isJetBrainsPluginInstalled (0.642)
async function isJetBrainsPluginInstalled_2(ideType) {
  return Number(
    (
      await ideType.stat({
        bigint: true,
      })
    ).size,
  );
}
export { isJetBrainsPluginInstalled_2, isJetBrainsPluginInstalled };
