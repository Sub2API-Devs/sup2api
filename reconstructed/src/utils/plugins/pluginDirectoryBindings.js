/**
 * utils/plugins/pluginDirectoryBindings.ts
 *
 * 2.1.316 新增：插件目录绑定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9qwbw2qr.js (17)
 * attribution: placement 17
 */
import { join, join as join_2 } from "path";
import { lstat, open } from "fs/promises";
import { constants } from "fs";
import { isDiskless } from "../../bootstrap/state.js";
import { getPluginsDirectory, isSamePluginDirName } from "./pluginDirectories.js";
import { ws } from "../fsFlags.js";
import { logForDebugging } from "../debug.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { readHandleUpTo, getFsImplementation } from "../fsOperations.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, pe, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { QE } from "./pluginGates.js";
import { pluginDirectoryPolicyBlock } from "./marketplacePolicy.js";
import { kk } from "./commandSourceErrors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";

/**
 * 读取插件目录下的 JSON 文件：符号链接、非普通文件、超过上限都视为 unusable 并记 warn；不存在 absent； 读出返回 {state:"read", json}。无盘模式视为 absent。
 */
//@ chunk-9qwbw2qr.js:8587-9509 placement
async function readPluginsDirJsonFile(fileName, maxBytes, label) {
  if (isDiskless()) return { state: "absent" };
  let filePath = join_2(getPluginsDirectory(), fileName),
    displayLabel = label === "plugin catalog cache" ? "Plugin catalog cache" : `Plugin directory ${label}`;
  try {
    if (ws === 0 && (await lstat(filePath)).isSymbolicLink())
      return (
        logForDebugging(`${displayLabel} is a symbolic link; ignoring it`, { level: "warn" }),
        { state: "unusable", readFailed: !1 }
      );
    await using y = await open(filePath, constants.O_RDONLY | ws | READ_LIMITS);
    if (!(await y.stat()).isFile())
      return (
        logForDebugging(`${displayLabel} is not a file; ignoring it`, { level: "warn" }),
        { state: "unusable", readFailed: !1 }
      );
    let l = await readHandleUpTo(y, maxBytes + 1, "file");
    if (l.length > maxBytes)
      return (
        logForDebugging(`${displayLabel} is too large; ignoring it`, { level: "warn" }),
        { state: "unusable", readFailed: !1 }
      );
    return { state: "read", json: jsonParse(l.toString("utf-8")) };
  } catch (error) {
    if (isENOENT(error)) return { state: "absent" };
    let l = getErrnoCode(error);
    if (l === "ELOOP" || l === "EMLINK")
      return (
        logForDebugging(`${displayLabel} is a symbolic link; ignoring it`, { level: "warn" }),
        { state: "unusable", readFailed: !1 }
      );
    return (
      logForDebugging(`${displayLabel} could not be read: ${errorMessage(error)}`),
      { state: "unusable", readFailed: !(error instanceof SyntaxError) }
    );
  }
}
//@ chunk-9qwbw2qr.js:9509-9686 placement
var PLUGIN_DIRECTORY_BINDINGS_JSON = "plugin-directory-bindings.json",
  A = 1,
  M = 1048576,
  Y_n = 4096,
  ae = DoctorLazy(() =>
    u({
      schemaVersion: T(A),
      bindings: pe(
        o(),
        u({ repositoryKey: o().min(1).max(Y_n) })
          .optional()
          .catch(void 0),
      ),
    }),
  );
//@ chunk-9qwbw2qr.js:9686-9751 placement
function VS(e) {
  let parts = e.split("@");
  return parts.length === 2 && parts[1] === OFFICIAL_MARKETPLACE_NAME;
}
/**
 * 绑定表中与插件同目录名的键（精确匹配在前）。
 */
//@ chunk-9qwbw2qr.js:9751-9885 placement
function findBindingKeysFor(e, i) {
  if (!VS(i)) return [];
  let filtered = [...e].filter((n) => VS(n) && isSamePluginDirName(n, i));
  return [...filtered.filter((n) => n === i), ...filtered.filter((n) => n !== i)];
}
//@ chunk-9qwbw2qr.js:9885-9903 placement
var weakSet = new WeakSet();
//@ chunk-9qwbw2qr.js:9903-9935 placement
function xSe(e) {
  return weakSet.has(e);
}
//@ chunk-9qwbw2qr.js:9935-10024 placement
async function lpe() {
  let e = await readDirectoryBindings();
  if (e.readFailed) weakSet.add(e.bindings);
  return e.bindings;
}
/**
 * 设置或删除插件的仓库绑定。
 */
//@ chunk-9qwbw2qr.js:10024-10232 placement
async function setDirectoryBinding(e, i, r) {
  if (!VS(e)) return;
  if (i !== void 0 && !B()) return;
  await updateDirectoryBindings((n) => {
    if (i === void 0) for (let s of findBindingKeysFor(n.keys(), e)) n.delete(s);
    else if (!(r?.keepExisting === !0 && findBindingKeysFor(n.keys(), e).length > 0)) n.set(e, i);
  });
}
/**
 * 释放插件目录绑定；只查询时返回 held/none/unreadable。
 */
//@ chunk-9qwbw2qr.js:10232-10416 placement
async function releaseDirectoryBinding(e, i) {
  if (!VS(e)) return "none";
  if (!i) {
    let r = await updateDirectoryBindings(() => {});
    if (xSe(r)) return "unreadable";
    return findBindingKeysFor(r.keys(), e).length > 0 ? "held" : "none";
  }
  return (await setDirectoryBinding(e, void 0), "none");
}
//@ chunk-9qwbw2qr.js:10416-10464 placement
async function Rrt(e, i) {
  return seedDirectoryBindings([[e, i ?? []]]);
}
/**
 * 从安装记录补齐插件目录插件的仓库绑定。
 */
//@ chunk-9qwbw2qr.js:10464-10793 placement
async function seedDirectoryBindings(e) {
  {
    let i = !1,
      r = new Map();
    for (let [n, s] of e) {
      if (!VS(n)) continue;
      i = !0;
      let y = s.find((l) => l.directoryRepositoryKey !== void 0)?.directoryRepositoryKey;
      if (y !== void 0) r.set(n, y);
    }
    if (!i) return new Map();
    if (r.size === 0 || !B()) return lpe();
    return updateDirectoryBindings((n) => {
      for (let [s, y] of r) if (findBindingKeysFor(n.keys(), s).length === 0) n.set(s, y);
    });
  }
  return new Map();
}
//@ chunk-9qwbw2qr.js:10793-10850 placement
function tVt(e) {
  return Boolean(e.directoryRepositoryKey);
}
/**
 * 持久化插件目录绑定，返回 held/no-key/cannot-hold/not-persisted/not-directory。
 */
//@ chunk-9qwbw2qr.js:10850-11283 placement
async function persistDirectoryBinding(e, i) {
  {
    if (!VS(e)) return "not-directory";
    let r = (i ?? []).find((l) => l.directoryRepositoryKey)?.directoryRepositoryKey,
      n = (l) => l.has(e) || findBindingKeysFor(l.keys(), e).some((h) => l.get(h) === r);
    await updateDirectoryBindings((l) => {
      if (r !== void 0 && !n(l)) l.set(e, r);
    });
    let s = await updateDirectoryBindings(() => {}),
      y = !xSe(s);
    if (y && (r === void 0 ? findBindingKeysFor(s.keys(), e).length > 0 : n(s))) return "held";
    if (r === void 0) return "no-key";
    return y && e.length > 1024 ? "cannot-hold" : "not-persisted";
  }
  return "not-directory";
}
/**
 * 迁移时确保插件目录插件的绑定可持久化。
 */
//@ chunk-9qwbw2qr.js:11283-11409 placement
async function ensureDirectoryBindingForMigration(e, i, r) {
  if (!VS(e)) return !0;
  if (!r.some(tVt)) return (await persistDirectoryBinding(e, i)) !== "not-persisted";
  return (await Rrt(e, i), !0);
}
//@ chunk-9qwbw2qr.js:11409-11447 placement
function B() {
  return QE() && pluginDirectoryPolicyBlock() === null;
}
/**
 * 读绑定文件，返回绑定表与是否读失败。
 */
//@ chunk-9qwbw2qr.js:11447-11803 placement
async function readDirectoryBindings() {
  let e = new Map();
  {
    let i = await readPluginsDirJsonFile(PLUGIN_DIRECTORY_BINDINGS_JSON, M, "bindings file"),
      r = i.state === "read" ? ae().safeParse(i.json) : void 0;
    if (r?.success) {
      for (let [n, s] of Object.entries(r.data.bindings))
        if (s !== void 0 && n.length <= 1024) e.set(n, s.repositoryKey);
    }
    return { bindings: e, readFailed: i.state === "unusable" || (i.state === "read" && r?.success !== !0) };
  }
  return { bindings: e, readFailed: !1 };
}
/**
 * 排在上一次写之后执行：读绑定表交给回调修改，去掉过长或空值项；有变化时写回（读失败、无盘或超过 1 MB 时不写并记日志）。返回修改后的表。
 */
//@ chunk-9qwbw2qr.js:11803-12797 placement
async function updateDirectoryBindings(mutate) {
  let bindings = new Map();
  {
    let state = kk(),
      bindingsWriteTail = state.bindingsWriteTail,
      { promise: promise, resolve: resolve } = Promise.withResolvers();
    ((state.bindingsWriteTail = promise), await bindingsWriteTail);
    try {
      let current = await readDirectoryBindings();
      if (current.readFailed) weakSet.add(bindings);
      for (let [R, b] of current.bindings) bindings.set(R, b);
      mutate(bindings);
      for (let [R, b] of [...bindings]) if (R.length > 1024 || b === "") bindings.delete(R);
      let changed =
        bindings.size !== current.bindings.size ||
        [...bindings].some(([R, b]) => current.bindings.get(R) !== b);
      if (changed && current.readFailed)
        logForDebugging("Plugin directory bindings file could not be used; leaving it as it is", {
          level: "warn",
        });
      else if (changed && isDiskless())
        logForDebugging("Plugin directory bindings file not written: this session saves nothing to disk");
      else if (changed) {
        let R = jsonStringify({
          schemaVersion: A,
          bindings: Object.fromEntries([...bindings].map(([b, w]) => [b, { repositoryKey: w }])),
        });
        if (Buffer.byteLength(R) > M)
          logForDebugging(
            "Plugin directory bindings file would grow past 1 MB, the most that is read back; leaving it as it is",
            { level: "warn" },
          );
        else
          (await getFsImplementation().mkdir(getPluginsDirectory()),
            await writeFileAtomic(join(getPluginsDirectory(), PLUGIN_DIRECTORY_BINDINGS_JSON), R, 384));
      }
    } catch (error) {
      logForDebugging(`Failed to update plugin directory bindings file: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      resolve();
    }
  }
  return bindings;
}

export {
  seedDirectoryBindings,
  VS,
  lpe,
  xSe,
  findBindingKeysFor,
  persistDirectoryBinding,
  tVt,
  releaseDirectoryBinding,
  Rrt,
  Y_n,
  readPluginsDirJsonFile,
  setDirectoryBinding,
  ensureDirectoryBindingForMigration,
};
