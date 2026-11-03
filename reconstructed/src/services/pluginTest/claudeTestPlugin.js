/**
 * services/pluginTest/claudeTestPlugin.ts
 *
 * 2.1.316 新增：claude-test 插件与服务端的配合逻辑
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { createHash } from "crypto";
import { join, sep } from "path";
import { identity as identity_2 } from "../../utils/identity.js";
import { pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";

//@ chunk-e6aww6q8.js:190679-190709 placement
/**
 * claude-test 内置插件的标识常量（claude-test@builtin），用于定位插件数据目录。
 */
var TEST_PLUGIN_ID = "claude-test@builtin";
//@ chunk-e6aww6q8.js:190709-190727 placement
/**
 * claude-test 内置插件的版本号常量（0.4.259），用于拼内容 id 与安装目录。
 */
var TEST_PLUGIN_VERSION = "0.4.259";
//@ chunk-e6aww6q8.js:190727-190774 placement
/**
 * 保存 claude-test 插件已加载的文本内容（含 name）；未加载时 name 为 undefined，installedRoot 依赖它。
 */
var testPluginTexts = identity_2(
  {
    name: undefined,
  },
  (e) => {
    e.name = undefined;
  },
);
//@ chunk-e6aww6q8.js:190774-190976 placement
/**
 * 由插件文本内容（按键排序、带长度前缀）计算 sha256，生成 claude-test 插件的内容 id。
 */
function testPluginContentId(e) {
  let hash = createHash("sha256");
  for (let key of Object.keys(e).sort()) {
    let s = e[key] ?? "";
    hash.update(`${Buffer.byteLength(key)}:${key}${Buffer.byteLength(s)}:${s}`);
  }
  return `${TEST_PLUGIN_VERSION}-${hash.digest("hex").slice(0, 12)}`;
}
//@ chunk-e6aww6q8.js:190976-191183 placement
/**
 * claude-test 插件的安装根目录（插件数据目录下，用正斜杠）；文本未加载时抛错。
 */
function claudeTestInstalledRoot() {
  if (testPluginTexts.name === undefined)
    throw Error(
      "claude-test: installedRoot() was called before the plugin's texts were loaded. Await loadContent() first.",
    );
  return join(pluginDataDirPath(TEST_PLUGIN_ID), testPluginTexts.name).split(sep).join("/");
}
//@ chunk-e6aww6q8.js:191183-191232 placement
/**
 * 调用取安装根目录的函数并吞掉异常：根目录不可得时返回 undefined。
 */
function tryGetInstalledRoot(e = claudeTestInstalledRoot) {
  try {
    return e();
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:191232-191283 placement
var STOP_ON_EXIT_SCRIPT_SUFFIX = "/skills/run/scripts/stop-on-exit.mjs && ";
//@ chunk-e6aww6q8.js:191283-191326 placement
/**
 * 生成 claude-test 插件 run skill 的命令行：node <安装根目录>/skills/run/scripts/stop-on-exit.mjs && 。
 */
function buildRunSkillCommand() {
  return `node ${claudeTestInstalledRoot()}${STOP_ON_EXIT_SCRIPT_SUFFIX}`;
}
//@ chunk-e6aww6q8.js:191326-191405 placement
/**
 * 判断一条命令是否以本插件 run skill 的前缀开头（安装根目录不可得时为 false）。
 */
function isRunSkillCommand(command) {
  let n = tryGetInstalledRoot();
  return n !== undefined && command.startsWith(`node ${n}${STOP_ON_EXIT_SCRIPT_SUFFIX}`);
}
export {
  TEST_PLUGIN_ID,
  testPluginTexts,
  TEST_PLUGIN_VERSION,
  testPluginContentId,
  claudeTestInstalledRoot,
  isRunSkillCommand,
  buildRunSkillCommand,
};
