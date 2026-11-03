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
import { join } from "path";
import { lstat, open } from "fs/promises";
import { constants } from "fs";
import { isDiskless } from "../../bootstrap/state.js";
import { getPluginsDirectory, isSamePluginDirName } from "./pluginDirectories.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { logForDebugging } from "../debug.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { readHandleUpTo, getFsImplementation } from "../fsOperations.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, record, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import { pluginDirectoryPolicyBlock } from "./marketplacePolicy.js";
import { commandSourceSession } from "./commandSourceErrors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";

//@ chunk-9qwbw2qr.js:8587-9509 placement
/**
 * 读取插件目录下的 JSON 文件：符号链接、非普通文件、超过上限都视为 unusable 并记 warn；不存在 absent； 读出返回 {state:"read", json}。无盘模式视为 absent。
 */
async function readPluginsDirJsonFile(fileName, maxBytes, label) {
  if (isDiskless())
    return {
      state: "absent",
    };
  let filePath = join(getPluginsDirectory(), fileName);
  let displayLabel = label === "plugin catalog cache" ? "Plugin catalog cache" : `Plugin directory ${label}`;
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await lstat(filePath)).isSymbolicLink()) {
      logForDebugging(`${displayLabel} is a symbolic link; ignoring it`, {
        level: "warn",
      });
      return {
        state: "unusable",
        readFailed: false,
      };
    }
    await using y = await open(filePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    if (!(await y.stat()).isFile()) {
      logForDebugging(`${displayLabel} is not a file; ignoring it`, {
        level: "warn",
      });
      return {
        state: "unusable",
        readFailed: false,
      };
    }
    let handleUpTo = await readHandleUpTo(y, maxBytes + 1, "file");
    if (handleUpTo.length > maxBytes) {
      logForDebugging(`${displayLabel} is too large; ignoring it`, {
        level: "warn",
      });
      return {
        state: "unusable",
        readFailed: false,
      };
    }
    return {
      state: "read",
      json: jsonParse(handleUpTo.toString("utf-8")),
    };
  } catch (error) {
    if (isENOENT(error))
      return {
        state: "absent",
      };
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK") {
      logForDebugging(`${displayLabel} is a symbolic link; ignoring it`, {
        level: "warn",
      });
      return {
        state: "unusable",
        readFailed: false,
      };
    }
    logForDebugging(`${displayLabel} could not be read: ${errorMessage(error)}`);
    return {
      state: "unusable",
      readFailed: !(error instanceof SyntaxError),
    };
  }
}
//@ chunk-9qwbw2qr.js:9509-9686 placement
/**
 * PLUGIN_DIRECTORY_BINDINGS_FILE：插件目录绑定文件名；PLUGIN_DIRECTORY_BINDINGS_VERSION：绑定文件版本；MAX_BINDINGS_FILE_BYTES：绑定文件体积上限（同一声明共 4 个绑定）。
 */
var PLUGIN_DIRECTORY_BINDINGS_JSON = "plugin-directory-bindings.json";
var PLUGIN_DIRECTORY_BINDINGS_FILE = 1;
var PLUGIN_DIRECTORY_BINDINGS_VERSION = 1048576;
var MAX_BINDINGS_FILE_BYTES = 4096;
var pluginDirectoryBindingsSchema = DoctorLazy(() =>
  u({
    schemaVersion: literal(PLUGIN_DIRECTORY_BINDINGS_FILE),
    bindings: record(
      string(),
      u({
        repositoryKey: string().min(1).max(MAX_BINDINGS_FILE_BYTES),
      })
        .optional()
        .catch(undefined),
    ),
  }),
);
//@ chunk-9qwbw2qr.js:9686-9751 placement
/**
 * isOfficialPluginDirectoryId：插件 id 属于官方市场。
 */
function isOfficialPluginDirectoryId(e) {
  let parts = e.split("@");
  return parts.length === 2 && parts[1] === OFFICIAL_MARKETPLACE_NAME;
}
//@ chunk-9qwbw2qr.js:9751-9885 placement
/**
 * 绑定表中与插件同目录名的键（精确匹配在前）。
 */
function findBindingKeysFor(e, i) {
  if (!isOfficialPluginDirectoryId(i)) return [];
  let filtered = [...e].filter((n) => isOfficialPluginDirectoryId(n) && isSamePluginDirName(n, i));
  return [...filtered.filter((n) => n === i), ...filtered.filter((n) => n !== i)];
}
//@ chunk-9qwbw2qr.js:9885-9903 placement
var weakSet = new WeakSet();
//@ chunk-9qwbw2qr.js:9903-9935 placement
/**
 * isUnreadableBindings：该绑定表读失败过。
 */
function isUnreadableBindings(e) {
  return weakSet.has(e);
}
//@ chunk-9qwbw2qr.js:9935-10024 placement
/**
 * bindingsWithReadFailure：读绑定表并记下读失败。
 */
async function bindingsWithReadFailure() {
  let directoryBindings = await readDirectoryBindings();
  if (directoryBindings.readFailed) weakSet.add(directoryBindings.bindings);
  return directoryBindings.bindings;
}
//@ chunk-9qwbw2qr.js:10024-10232 placement
/**
 * 设置或删除插件的仓库绑定。
 */
async function setDirectoryBinding(e, i, r) {
  if (!isOfficialPluginDirectoryId(e)) return;
  if (i !== undefined && !isDirectoryBindingsEnabled()) return;
  await updateDirectoryBindings((n) => {
    if (i === undefined) for (let s of findBindingKeysFor(n.keys(), e)) n.delete(s);
    else if (!(r?.keepExisting === true && findBindingKeysFor(n.keys(), e).length > 0)) n.set(e, i);
  });
}
//@ chunk-9qwbw2qr.js:10232-10416 placement
/**
 * 释放插件目录绑定；只查询时返回 held/none/unreadable。
 */
async function releaseDirectoryBinding(e, i) {
  if (!isOfficialPluginDirectoryId(e)) return "none";
  if (!i) {
    let r = await updateDirectoryBindings(() => {});
    if (isUnreadableBindings(r)) return "unreadable";
    return findBindingKeysFor(r.keys(), e).length > 0 ? "held" : "none";
  }
  await setDirectoryBinding(e, undefined);
  return "none";
}
//@ chunk-9qwbw2qr.js:10416-10464 placement
/**
 * seedBindingsFromInstall：从安装记录补齐绑定。
 */
async function seedBindingsFromInstall(e, i) {
  return seedDirectoryBindings([[e, i ?? []]]);
}
//@ chunk-9qwbw2qr.js:10464-10793 placement
/**
 * 从安装记录补齐插件目录插件的仓库绑定。
 */
async function seedDirectoryBindings(e) {
  {
    let i = false;
    let r = new Map();
    for (let [n, s] of e) {
      if (!isOfficialPluginDirectoryId(n)) continue;
      i = true;
      let directoryRepositoryKey = s.find(
        (l) => l.directoryRepositoryKey !== undefined,
      )?.directoryRepositoryKey;
      if (directoryRepositoryKey !== undefined) r.set(n, directoryRepositoryKey);
    }
    if (!i) return new Map();
    if (r.size === 0 || !isDirectoryBindingsEnabled()) return bindingsWithReadFailure();
    return updateDirectoryBindings((n) => {
      for (let [s, y] of r) if (findBindingKeysFor(n.keys(), s).length === 0) n.set(s, y);
    });
  }
  return new Map();
}
//@ chunk-9qwbw2qr.js:10793-10850 placement
/**
 * hasDirectoryRepositoryKey：是否带目录仓库键。
 */
function hasDirectoryRepositoryKey(e) {
  return Boolean(e.directoryRepositoryKey);
}
//@ chunk-9qwbw2qr.js:10850-11283 placement
/**
 * 持久化插件目录绑定，返回 held/no-key/cannot-hold/not-persisted/not-directory。
 */
async function persistDirectoryBinding(e, i) {
  {
    if (!isOfficialPluginDirectoryId(e)) return "not-directory";
    let directoryRepositoryKey = (i ?? []).find((l) => l.directoryRepositoryKey)?.directoryRepositoryKey;
    let n = (l) =>
      l.has(e) || findBindingKeysFor(l.keys(), e).some((h) => l.get(h) === directoryRepositoryKey);
    await updateDirectoryBindings((l) => {
      if (directoryRepositoryKey !== undefined && !n(l)) l.set(e, directoryRepositoryKey);
    });
    let s = await updateDirectoryBindings(() => {});
    let y = !isUnreadableBindings(s);
    if (y && (directoryRepositoryKey === undefined ? findBindingKeysFor(s.keys(), e).length > 0 : n(s)))
      return "held";
    if (directoryRepositoryKey === undefined) return "no-key";
    return y && e.length > 1024 ? "cannot-hold" : "not-persisted";
  }
  return "not-directory";
}
//@ chunk-9qwbw2qr.js:11283-11409 placement
/**
 * 迁移时确保插件目录插件的绑定可持久化。
 */
async function ensureDirectoryBindingForMigration(e, i, r) {
  if (!isOfficialPluginDirectoryId(e)) return true;
  if (!r.some(hasDirectoryRepositoryKey)) return (await persistDirectoryBinding(e, i)) !== "not-persisted";
  await seedBindingsFromInstall(e, i);
  return true;
}
//@ chunk-9qwbw2qr.js:11409-11447 placement
function isDirectoryBindingsEnabled() {
  return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() === null;
}
//@ chunk-9qwbw2qr.js:11447-11803 placement
/**
 * 读绑定文件，返回绑定表与是否读失败。
 */
async function readDirectoryBindings() {
  let e = new Map();
  {
    let pluginsDirJsonFile = await readPluginsDirJsonFile(
      PLUGIN_DIRECTORY_BINDINGS_JSON,
      PLUGIN_DIRECTORY_BINDINGS_VERSION,
      "bindings file",
    );
    let r =
      pluginsDirJsonFile.state === "read"
        ? pluginDirectoryBindingsSchema().safeParse(pluginsDirJsonFile.json)
        : undefined;
    if (r?.success) {
      for (let [key, value] of Object.entries(r.data.bindings))
        if (value !== undefined && key.length <= 1024) e.set(key, value.repositoryKey);
    }
    return {
      bindings: e,
      readFailed:
        pluginsDirJsonFile.state === "unusable" ||
        (pluginsDirJsonFile.state === "read" && r?.success !== true),
    };
  }
  return {
    bindings: e,
    readFailed: false,
  };
}
//@ chunk-9qwbw2qr.js:11803-12797 placement
/**
 * 排在上一次写之后执行：读绑定表交给回调修改，去掉过长或空值项；有变化时写回（读失败、无盘或超过 1 MB 时不写并记日志）。返回修改后的表。
 */
async function updateDirectoryBindings(mutate) {
  let bindings = new Map();
  {
    let state = commandSourceSession();
    let bindingsWriteTail = state.bindingsWriteTail;
    let { promise, resolve } = Promise.withResolvers();
    state.bindingsWriteTail = promise;
    await bindingsWriteTail;
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
          schemaVersion: PLUGIN_DIRECTORY_BINDINGS_FILE,
          bindings: Object.fromEntries(
            [...bindings].map(([b, w]) => [
              b,
              {
                repositoryKey: w,
              },
            ]),
          ),
        });
        if (Buffer.byteLength(R) > PLUGIN_DIRECTORY_BINDINGS_VERSION)
          logForDebugging(
            "Plugin directory bindings file would grow past 1 MB, the most that is read back; leaving it as it is",
            {
              level: "warn",
            },
          );
        else {
          await getFsImplementation().mkdir(getPluginsDirectory());
          await writeFileAtomic(join(getPluginsDirectory(), PLUGIN_DIRECTORY_BINDINGS_JSON), R, 384);
        }
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
  isOfficialPluginDirectoryId,
  bindingsWithReadFailure,
  isUnreadableBindings,
  findBindingKeysFor,
  persistDirectoryBinding,
  hasDirectoryRepositoryKey,
  releaseDirectoryBinding,
  seedBindingsFromInstall,
  MAX_BINDINGS_FILE_BYTES,
  readPluginsDirJsonFile,
  setDirectoryBinding,
  ensureDirectoryBindingForMigration,
};
