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
function getEnvCaseInsensitive(e, n) {
  if (n in e) return e[n];
  if (getPlatform() !== "windows") return;
  let found = Object.keys(e).find((key) => key.toUpperCase() === n.toUpperCase());
  return found === undefined ? undefined : e[found];
}
//@ chunk-dcmhvw5a.js:188120-188144 placement
function identityString(e) {
  return e;
}
//@ chunk-dcmhvw5a.js:188144-188168 placement
function identityString_2(e) {
  return e;
}
//@ chunk-dcmhvw5a.js:188168-188202 placement
var securityPluginEnvWrites = identity_2(new Map(), (e) => e.clear());
//@ chunk-dcmhvw5a.js:188202-188274 placement
function envWritesForPlugin(e) {
  let n = identityString_2(e);
  return [...securityPluginEnvWrites].filter(([, r]) => identityString_2(r.name) === n);
}
//@ chunk-dcmhvw5a.js:188274-188343 placement
function forgetEnvWriteForValue(e, n) {
  for (let [r, s] of envWritesForPlugin(e))
    if (readProcessEnv(s.name) === n) securityPluginEnvWrites.delete(r);
}
//@ chunk-dcmhvw5a.js:188343-188385 placement
var envGuardOpen = identity_2(
  {
    isOpen: false,
  },
  (e) => {
    e.isOpen = false;
  },
);
//@ chunk-dcmhvw5a.js:188385-188422 placement
function readProcessEnv(name) {
  return process.env[name];
}
//@ chunk-dcmhvw5a.js:188422-188500 placement
function writeProcessEnv(name, n) {
  if (n === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = n;
}
//@ chunk-dcmhvw5a.js:188500-188544 placement
function isEnvValueUnchanged(e) {
  return readProcessEnv(e.name) === e.theirs;
}
//@ chunk-dcmhvw5a.js:188544-188613 placement
function activeSecurityEnvWrites() {
  let e = [...securityPluginEnvWrites.values()];
  return envGuardOpen.isOpen ? e : e.filter(isEnvValueUnchanged);
}
//@ chunk-dcmhvw5a.js:188613-188856 placement
/**
 * 记录宿主环境变量写入前的值，返回登记写入者的回调。
 */
function snapshotHostEnvVar(name, writer) {
  let r = identityString(name);
  for (let [a, c] of envGuardOpen.isOpen ? [] : envWritesForPlugin(name))
    if (!isEnvValueUnchanged(c)) securityPluginEnvWrites.delete(a);
  let s = securityPluginEnvWrites.get(r) ?? {
    name,
    before: readProcessEnv(name),
  };
  return () => {
    securityPluginEnvWrites.set(r, {
      ...s,
      theirs: undefined,
      writer,
    });
    for (let [a, c] of envWritesForPlugin(name))
      securityPluginEnvWrites.set(a, {
        ...c,
        theirs: readProcessEnv(c.name),
        writer,
      });
  };
}
//@ chunk-dcmhvw5a.js:188856-188896 placement
/**
 * forgetEnvWriteRestorer：返回恢复函数（忘掉写入记录）。
 */
function forgetEnvWriteRestorer(name) {
  return () => {
    forgetEnvWriteForValue(name, readProcessEnv(name));
  };
}
//@ chunk-dcmhvw5a.js:188896-188987 placement
/**
 * importEnvWrites：批量导入环境写入记录。
 */
function importEnvWrites(e) {
  if (envGuardOpen.isOpen) return;
  for (let [key, value] of Object.entries(e)) if (value !== undefined) forgetEnvWriteForValue(key, value);
}
//@ chunk-dcmhvw5a.js:188987-189031 placement
/**
 * 宿主拥有的环境变量名列表。
 */
function hostOwnedEnvNames() {
  return activeSecurityEnvWrites().map((e) => e.name);
}
//@ chunk-dcmhvw5a.js:189031-189317 placement
/**
 * 执行时保护宿主拥有的环境变量不被改写。
 */
function withHostOwnedEnvGuard(e, n) {
  if (envGuardOpen.isOpen) return e();
  let r = activeSecurityEnvWrites();
  if (r.length === 0) return e();
  let filtered = r.filter((a) => a.writer === undefined || n === undefined || !n(a.writer));
  for (let j = filtered.length - 1; j >= 0; j--) writeProcessEnv(filtered[j].name, filtered[j].before);
  envGuardOpen.isOpen = true;
  try {
    return e();
  } finally {
    for (let a of filtered) writeProcessEnv(a.name, a.theirs);
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
