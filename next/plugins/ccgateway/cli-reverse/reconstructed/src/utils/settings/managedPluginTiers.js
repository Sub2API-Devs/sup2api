/**
 * utils/settings/managedPluginTiers.ts
 *
 * 托管插件层级（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (2)
 * attribution: placement 2
 */
//@ chunk-q8cqcff6.js:9983-10039 placement
/**
 * BUILTIN_PLUGIN_TIER：内置插件层级标记；PLUGIN_ORDER_KEYS：插件顺序设置键（同一声明共 2 个绑定）。
 */
var BUILTIN_PLUGIN_TIER = "@builtin";
var PLUGIN_ORDER_KEYS = ["prependPlugins", "appendPlugins"];
//@ chunk-q8cqcff6.js:10039-10110 placement
/**
 * isPlainRecord：非 null 非数组的对象。
 */
function isPlainRecord(enabledPlugins) {
  return typeof enabledPlugins === "object" && enabledPlugins !== null && !Array.isArray(enabledPlugins);
}
export { PLUGIN_ORDER_KEYS, isPlainRecord, BUILTIN_PLUGIN_TIER };
