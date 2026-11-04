/**
 * utils/plugins/securityDefaultPlugin.ts
 *
 * 2.1.316 新增：执行时保护宿主拥有的环境变量不被改写；取环境变量（Windows 下忽略大小写）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (18)
 * attribution: placement 18
 */
import { OrderedListContext } from "../../components/ui/OrderedList.js";
import { SIGNED_CACHE_ROOTS, signedCacheMarker } from "../settings/policyCertificates.js";
import { getPlatform } from "../platform.js";
import { identity as identity_2 } from "../identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:187925-187959 placement
/**
 * 安全默认插件是否启用。
 */
function isSecDefaultPluginEnabled() {
  return OrderedListContext(SIGNED_CACHE_ROOTS, signedCacheMarker());
}
//@ chunk-dcmhvw5a.js:187959-188120 placement
/**
 * 取环境变量（Windows 下忽略大小写）。
 */
function getEnvCaseInsensitive(env, name) {
  if (name in env) return env[name];
  if (getPlatform() !== "windows") return;
  let found = Object.keys(env).find((key) => key.toUpperCase() === name.toUpperCase());
  return found === undefined ? undefined : env[found];
}
//@ chunk-dcmhvw5a.js:188120-188144 placement
function identityString(value) {
  return value;
}
//@ chunk-dcmhvw5a.js:188144-188168 placement
function identityString_2(value) {
  return value;
}
//@ chunk-dcmhvw5a.js:188168-188202 placement
var securityPluginEnvWrites; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:188168", () => {
  securityPluginEnvWrites = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-dcmhvw5a.js:188202-188274 placement
function envWritesForPlugin(pluginName) {
  let key = identityString_2(pluginName);
  return [...securityPluginEnvWrites].filter(([, entry]) => identityString_2(entry.name) === key);
}
//@ chunk-dcmhvw5a.js:188274-188343 placement
function forgetEnvWriteForValue(pluginName, value) {
  for (let [key, entry] of envWritesForPlugin(pluginName))
    if (readProcessEnv(entry.name) === value) securityPluginEnvWrites.delete(key);
}
//@ chunk-dcmhvw5a.js:188343-188385 placement
var envGuardOpen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:188343", () => {
  envGuardOpen = identity_2(
    {
      isOpen: false,
    },
    (state) => {
      state.isOpen = false;
    },
  );
});
//@ chunk-dcmhvw5a.js:188385-188422 placement
function readProcessEnv(name) {
  return process.env[name];
}
//@ chunk-dcmhvw5a.js:188422-188500 placement
function writeProcessEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
//@ chunk-dcmhvw5a.js:188500-188544 placement
function isEnvValueUnchanged(entry) {
  return readProcessEnv(entry.name) === entry.theirs;
}
//@ chunk-dcmhvw5a.js:188544-188613 placement
function activeSecurityEnvWrites() {
  let writes = [...securityPluginEnvWrites.values()];
  return envGuardOpen.isOpen ? writes : writes.filter(isEnvValueUnchanged);
}
//@ chunk-dcmhvw5a.js:188613-188856 placement
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
//@ chunk-dcmhvw5a.js:188856-188896 placement
/**
 * forgetEnvWriteRestorer：返回恢复函数（忘掉写入记录）。
 */
function forgetEnvWriteRestorer(pluginName) {
  return () => {
    forgetEnvWriteForValue(pluginName, readProcessEnv(pluginName));
  };
}
//@ chunk-dcmhvw5a.js:188896-188987 placement
/**
 * importEnvWrites：批量导入环境写入记录。
 */
function importEnvWrites(env) {
  if (envGuardOpen.isOpen) return;
  for (let [key, value] of Object.entries(env)) if (value !== undefined) forgetEnvWriteForValue(key, value);
}
//@ chunk-dcmhvw5a.js:188987-189031 placement
/**
 * 宿主拥有的环境变量名列表。
 */
function hostOwnedEnvNames() {
  return activeSecurityEnvWrites().map((entry) => entry.name);
}
//@ chunk-dcmhvw5a.js:189031-189317 placement
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
//@ chunk-dcmhvw5a.js:189317-189349 placement
/**
 * 安全默认插件名 cc-plugin-sec-default。
 */
var SEC_DEFAULT_PLUGIN_NAME = "cc-plugin-sec-default";
export {
  getEnvCaseInsensitive,
  hostOwnedEnvNames,
  isSecDefaultPluginEnabled,
  SEC_DEFAULT_PLUGIN_NAME,
  withHostOwnedEnvGuard,
  forgetEnvWriteRestorer,
  snapshotHostEnvVar,
  importEnvWrites,
};
