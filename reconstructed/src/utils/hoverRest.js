/**
 * utils/hoverRest.ts
 *
 * 2.1.316 新增：悬停静止
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-byeye1yp.js (3)
 * attribution: placement 3
 */

//@ chunk-byeye1yp.js:191-197 placement
var e;
/**
 * 存储后端 V5（storageV5）是否启用：由 GrowthBook 开关 tengu_hover_rest 在进程内首次读取时固定。插件缓存、installed_plugins、known_marketplaces 等在启用时都改走存储接口。
 */
//@ chunk-byeye1yp.js:197-224 placement
function isStorageV5Enabled() {
  return e === !0;
}
//@ chunk-byeye1yp.js:224-323 placement
function pinStorageV5Flag(t) {
  let n = t === !0;
  if (e === void 0) return ((e = n), "pinned");
  return e === n ? "unchanged" : "conflict";
}

export { isStorageV5Enabled, pinStorageV5Flag };
