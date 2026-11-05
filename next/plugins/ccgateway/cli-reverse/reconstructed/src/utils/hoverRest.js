/**
 * utils/hoverRest.ts
 *
 * 2.1.316 新增：悬停静止
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mycxs6m3.js (3)
 * attribution: placement 3
 */

//@ chunk-mycxs6m3.js:191-197 placement
var storageV5Flag;
//@ chunk-mycxs6m3.js:197-224 placement
/**
 * 存储后端 V5（storageV5）是否启用：由 GrowthBook 开关 tengu_hover_rest 在进程内首次读取时固定。插件缓存、installed_plugins、known_marketplaces 等在启用时都改走存储接口。
 */
function isStorageV5Enabled() {
  return storageV5Flag === true;
}
//@ chunk-mycxs6m3.js:224-323 placement
function pinStorageV5Flag(flag) {
  let wanted = flag === true;
  if (storageV5Flag === undefined) {
    storageV5Flag = wanted;
    return "pinned";
  }
  return storageV5Flag === wanted ? "unchanged" : "conflict";
}
export { isStorageV5Enabled, pinStorageV5Flag };
