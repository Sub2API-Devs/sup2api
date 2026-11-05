/**
 * utils/jetbrains.ts
 *
 * JetBrains IDE 配置/插件目录定位与 claude-code-jetbrains-plugin 安装检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/jetbrains.ts
 * pieces: chunk-033d1naw.js (1), chunk-5xgkngpb.js (4)
 * attribution: fingerprint 4, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir, platform } from "os";
import { join } from "path";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-5xgkngpb.js:3318496-3318860 fingerprint (2.1.88 match: ideNameToDirMap, 0.978)
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
//@ chunk-5xgkngpb.js:3318860-3319582 fingerprint (2.1.88 match: buildCommonPluginDirectoryPaths, 1)
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
//@ chunk-5xgkngpb.js:3319582-3320034 fingerprint (2.1.88 match: detectPluginDirectories, 1)
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
//@ chunk-5xgkngpb.js:3320034-3320157 affinity
/**
 * JetBrains 插件目录中是否存在 claude-code-jetbrains-plugin。
 */
async function isJetBrainsPluginInstalled(ideName) {
  let pluginDirectories = await detectPluginDirectories(ideName);
  for (let pluginDirectory of pluginDirectories) {
    let pluginPath = join(pluginDirectory, CLAUDE_CODE_JETBRAINS_PLUGIN);
    try {
      await getFsImplementation().stat(pluginPath);
      return true;
    } catch {}
  }
  return false;
}
//@ chunk-033d1naw.js:17474-17543 fingerprint (2.1.88 match: isJetBrainsPluginInstalled, 0.644)
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
