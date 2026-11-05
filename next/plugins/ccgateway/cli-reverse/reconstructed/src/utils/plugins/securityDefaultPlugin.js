/**
 * utils/plugins/securityDefaultPlugin.ts
 *
 * 2.1.316 新增：执行时保护宿主拥有的环境变量不被改写；取环境变量（Windows 下忽略大小写）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f33rhb46.js (16), chunk-z20c443b.js (3)
 * attribution: placement 18, layout 1
 */
import { identity } from "../identity.js";
import { OrderedListContext } from "../../components/ui/OrderedList.js";
import { SIGNED_CACHE_ROOTS, signedCacheMarker } from "../settings/policyCertificates.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f33rhb46.js:227-250 placement
function identityString(value) {
  return value;
}
//@ chunk-f33rhb46.js:250-273 placement
function identityString_2(value) {
  return value;
}
//@ chunk-f33rhb46.js:273-306 placement
var securityPluginEnvWrites; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f33rhb46.js:273", () => {
  securityPluginEnvWrites = identity(new Map(), (map) => map.clear());
});
//@ chunk-f33rhb46.js:306-374 placement
function envWritesForPlugin(pluginName) {
  let key = identityString_2(pluginName);
  return [...securityPluginEnvWrites].filter(([, entry]) => identityString_2(entry.name) === key);
}
//@ chunk-f33rhb46.js:374-439 placement
function forgetEnvWriteForValue(pluginName, value) {
  for (let [key, entry] of envWritesForPlugin(pluginName))
    if (readProcessEnv(entry.name) === value) securityPluginEnvWrites.delete(key);
}
//@ chunk-f33rhb46.js:439-480 placement
var envGuardOpen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f33rhb46.js:439", () => {
  envGuardOpen = identity(
    {
      isOpen: false,
    },
    (state) => {
      state.isOpen = false;
    },
  );
});
//@ chunk-f33rhb46.js:480-516 placement
function readProcessEnv(name) {
  return process.env[name];
}
//@ chunk-f33rhb46.js:516-593 placement
function writeProcessEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
//@ chunk-f33rhb46.js:593-635 placement
function isEnvValueUnchanged(entry) {
  return readProcessEnv(entry.name) === entry.theirs;
}
//@ chunk-f33rhb46.js:635-700 placement
function activeSecurityEnvWrites() {
  let writes = [...securityPluginEnvWrites.values()];
  return envGuardOpen.isOpen ? writes : writes.filter(isEnvValueUnchanged);
}
//@ chunk-f33rhb46.js:700-932 placement
/**
 * 记录宿主环境变量写入前的值，返回登记写入者的回调。
 */
function snapshotHostEnvVar(pluginName, writer) {
  let name = identityString(pluginName);
  for (let [key, entry] of envGuardOpen.isOpen ? [] : envWritesForPlugin(pluginName))
    if (!isEnvValueUnchanged(entry)) securityPluginEnvWrites.delete(key);
  let snapshot = securityPluginEnvWrites.get(name) ?? {
    name: pluginName,
    before: readProcessEnv(pluginName),
  };
  return () => {
    securityPluginEnvWrites.set(name, {
      ...snapshot,
      theirs: undefined,
      writer,
    });
    for (let [key, entry] of envWritesForPlugin(pluginName))
      securityPluginEnvWrites.set(key, {
        ...entry,
        theirs: readProcessEnv(entry.name),
        writer,
      });
  };
}
//@ chunk-f33rhb46.js:932-970 placement
/**
 * forgetEnvWriteRestorer：返回恢复函数（忘掉写入记录）。
 */
function forgetEnvWriteRestorer(pluginName) {
  return () => {
    forgetEnvWriteForValue(pluginName, readProcessEnv(pluginName));
  };
}
//@ chunk-f33rhb46.js:970-1059 placement
/**
 * importEnvWrites：批量导入环境写入记录。
 */
function importEnvWrites(env) {
  if (envGuardOpen.isOpen) return;
  for (let [key, value] of Object.entries(env)) if (value !== undefined) forgetEnvWriteForValue(key, value);
}
//@ chunk-f33rhb46.js:1059-1102 placement
/**
 * 宿主拥有的环境变量名列表。
 */
function hostOwnedEnvNames() {
  return activeSecurityEnvWrites().map((entry) => entry.name);
}
//@ chunk-f33rhb46.js:1102-1222 layout
function missesHostOwnedEnvWrite(envNames) {
  let wanted = new Set(envNames.map(identityString_2));
  return activeSecurityEnvWrites().some(
    (write) =>
      (write.theirs || undefined) !== (write.before || undefined) && wanted.has(identityString_2(write.name)),
  );
}
//@ chunk-f33rhb46.js:1222-1502 placement
/**
 * 执行时保护宿主拥有的环境变量不被改写。
 */
function withHostOwnedEnvGuard(fn, isKept) {
  if (envGuardOpen.isOpen) return fn();
  let writes = activeSecurityEnvWrites();
  if (writes.length === 0) return fn();
  let filtered = writes.filter(
    (entry) => entry.writer === undefined || isKept === undefined || !isKept(entry.writer),
  );
  for (let j = filtered.length - 1; j >= 0; j--) writeProcessEnv(filtered[j].name, filtered[j].before);
  envGuardOpen.isOpen = true;
  try {
    return fn();
  } finally {
    for (let entry of filtered) writeProcessEnv(entry.name, entry.theirs);
    envGuardOpen.isOpen = false;
  }
}
//@ chunk-z20c443b.js:188066-188100 placement
/**
 * 安全默认插件是否启用。
 */
function isSecDefaultPluginEnabled() {
  return OrderedListContext(SIGNED_CACHE_ROOTS, signedCacheMarker());
}
//@ chunk-z20c443b.js:188100-188261 placement
/**
 * 取环境变量（Windows 下忽略大小写）。
 */
function getEnvCaseInsensitive(env, name) {
  if (name in env) return env[name];
  if (getPlatform() !== "windows") return;
  let found = Object.keys(env).find((key) => key.toUpperCase() === name.toUpperCase());
  return found === undefined ? undefined : env[found];
}
//@ chunk-z20c443b.js:188261-188293 placement
/**
 * 安全默认插件名 cc-plugin-sec-default。
 */
var SEC_DEFAULT_PLUGIN_NAME = "cc-plugin-sec-default";
export {
  getEnvCaseInsensitive,
  isSecDefaultPluginEnabled,
  missesHostOwnedEnvWrite,
  SEC_DEFAULT_PLUGIN_NAME,
  withHostOwnedEnvGuard,
  hostOwnedEnvNames,
  importEnvWrites,
  forgetEnvWriteRestorer,
  snapshotHostEnvVar,
};
