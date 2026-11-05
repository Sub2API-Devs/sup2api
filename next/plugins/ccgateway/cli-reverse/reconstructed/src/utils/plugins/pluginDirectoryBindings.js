/**
 * utils/plugins/pluginDirectoryBindings.ts
 *
 * 2.1.316 新增：插件目录绑定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d2msvdm6.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { objectSchema, literal, record, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import { pluginDirectoryPolicyBlock } from "./marketplacePolicy.js";
import { commandSourceSession } from "./commandSourceErrors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d2msvdm6.js:8587-9509 placement
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
    await using handle = await open(filePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    if (!(await handle.stat()).isFile()) {
      logForDebugging(`${displayLabel} is not a file; ignoring it`, {
        level: "warn",
      });
      return {
        state: "unusable",
        readFailed: false,
      };
    }
    let handleUpTo = await readHandleUpTo(handle, maxBytes + 1, "file");
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
//@ chunk-d2msvdm6.js:9509-9686 placement
/**
 * 插件目录绑定文件的常量组：F 是文件名 plugin-directory-bindings.json；A 是 schema 版本 1；M 是读写体积上限 1 MiB；Y_n 是 repositoryKey 的字符上限 4096；ae 是绑定文件 schema。
 */
var PLUGIN_DIRECTORY_BINDINGS_JSON; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_DIRECTORY_BINDINGS_VERSION;
var MAX_BINDINGS_FILE_BYTES;
var MAX_REPOSITORY_KEY_CHARS;
var pluginDirectoryBindingsSchema;
deferInit("chunk-d2msvdm6.js:9509", () => {
  PLUGIN_DIRECTORY_BINDINGS_JSON = "plugin-directory-bindings.json";
  PLUGIN_DIRECTORY_BINDINGS_VERSION = 1;
  MAX_BINDINGS_FILE_BYTES = 1048576;
  MAX_REPOSITORY_KEY_CHARS = 4096;
  pluginDirectoryBindingsSchema = DoctorLazy(() =>
    objectSchema({
      schemaVersion: literal(PLUGIN_DIRECTORY_BINDINGS_VERSION),
      bindings: record(
        stringSchema(),
        objectSchema({
          repositoryKey: stringSchema().min(1).max(MAX_REPOSITORY_KEY_CHARS),
        })
          .optional()
          .catch(undefined),
      ),
    }),
  );
});
//@ chunk-d2msvdm6.js:9686-9751 placement
/**
 * isOfficialPluginDirectoryId：插件 id 属于官方市场。
 */
function isOfficialPluginDirectoryId(pluginId) {
  let parts = pluginId.split("@");
  return parts.length === 2 && parts[1] === OFFICIAL_MARKETPLACE_NAME;
}
//@ chunk-d2msvdm6.js:9751-9885 placement
/**
 * 绑定表中与插件同目录名的键（精确匹配在前）。
 */
function findBindingKeysFor(keys, pluginId) {
  if (!isOfficialPluginDirectoryId(pluginId)) return [];
  let filtered = [...keys].filter(
    (key) => isOfficialPluginDirectoryId(key) && isSamePluginDirName(key, pluginId),
  );
  return [...filtered.filter((key) => key === pluginId), ...filtered.filter((key) => key !== pluginId)];
}
//@ chunk-d2msvdm6.js:9885-9903 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-d2msvdm6.js:9885", () => {
  weakSet = new WeakSet();
});
//@ chunk-d2msvdm6.js:9903-9935 placement
/**
 * isUnreadableBindings：该绑定表读失败过。
 */
function isUnreadableBindings(set) {
  return weakSet.has(set);
}
//@ chunk-d2msvdm6.js:9935-10024 placement
/**
 * bindingsWithReadFailure：读绑定表并记下读失败。
 */
async function bindingsWithReadFailure() {
  let directoryBindings = await readDirectoryBindings();
  if (directoryBindings.readFailed) weakSet.add(directoryBindings.bindings);
  return directoryBindings.bindings;
}
//@ chunk-d2msvdm6.js:10024-10232 placement
/**
 * 设置或删除插件的仓库绑定。
 */
async function setDirectoryBinding(pluginId, binding, options) {
  if (!isOfficialPluginDirectoryId(pluginId)) return;
  if (binding !== undefined && !isDirectoryBindingsEnabled()) return;
  await updateDirectoryBindings((bindings) => {
    if (binding === undefined)
      for (let key of findBindingKeysFor(bindings.keys(), pluginId)) bindings.delete(key);
    else if (!(options?.keepExisting === true && findBindingKeysFor(bindings.keys(), pluginId).length > 0))
      bindings.set(pluginId, binding);
  });
}
//@ chunk-d2msvdm6.js:10232-10416 placement
/**
 * 释放插件目录绑定；只查询时返回 held/none/unreadable。
 */
async function releaseDirectoryBinding(pluginId, deleteBinding) {
  if (!isOfficialPluginDirectoryId(pluginId)) return "none";
  if (!deleteBinding) {
    let bindings = await updateDirectoryBindings(() => {});
    if (isUnreadableBindings(bindings)) return "unreadable";
    return findBindingKeysFor(bindings.keys(), pluginId).length > 0 ? "held" : "none";
  }
  await setDirectoryBinding(pluginId, undefined);
  return "none";
}
//@ chunk-d2msvdm6.js:10416-10464 placement
/**
 * seedBindingsFromInstall：从安装记录补齐绑定。
 */
async function seedBindingsFromInstall(pluginId, installations) {
  return seedDirectoryBindings([[pluginId, installations ?? []]]);
}
//@ chunk-d2msvdm6.js:10464-10793 placement
/**
 * 从安装记录补齐插件目录插件的仓库绑定。
 */
async function seedDirectoryBindings(entries) {
  {
    let anyOfficial = false;
    let seeds = new Map();
    for (let [id, installations] of entries) {
      if (!isOfficialPluginDirectoryId(id)) continue;
      anyOfficial = true;
      let directoryRepositoryKey = installations.find(
        (installation) => installation.directoryRepositoryKey !== undefined,
      )?.directoryRepositoryKey;
      if (directoryRepositoryKey !== undefined) seeds.set(id, directoryRepositoryKey);
    }
    if (!anyOfficial) return new Map();
    if (seeds.size === 0 || !isDirectoryBindingsEnabled()) return bindingsWithReadFailure();
    return updateDirectoryBindings((bindings) => {
      for (let [id, repoKey] of seeds)
        if (findBindingKeysFor(bindings.keys(), id).length === 0) bindings.set(id, repoKey);
    });
  }
  return new Map();
}
//@ chunk-d2msvdm6.js:10793-10850 placement
/**
 * hasDirectoryRepositoryKey：是否带目录仓库键。
 */
function hasDirectoryRepositoryKey(record) {
  return Boolean(record.directoryRepositoryKey);
}
//@ chunk-d2msvdm6.js:10850-11283 placement
/**
 * 持久化插件目录绑定，返回 held/no-key/cannot-hold/not-persisted/not-directory。
 */
async function persistDirectoryBinding(pluginId, installations) {
  {
    if (!isOfficialPluginDirectoryId(pluginId)) return "not-directory";
    let directoryRepositoryKey = (installations ?? []).find(
      (installation) => installation.directoryRepositoryKey,
    )?.directoryRepositoryKey;
    let isHeld = (bindings) =>
      bindings.has(pluginId) ||
      findBindingKeysFor(bindings.keys(), pluginId).some(
        (key) => bindings.get(key) === directoryRepositoryKey,
      );
    await updateDirectoryBindings((bindings) => {
      if (directoryRepositoryKey !== undefined && !isHeld(bindings))
        bindings.set(pluginId, directoryRepositoryKey);
    });
    let after = await updateDirectoryBindings(() => {});
    let readable = !isUnreadableBindings(after);
    if (
      readable &&
      (directoryRepositoryKey === undefined
        ? findBindingKeysFor(after.keys(), pluginId).length > 0
        : isHeld(after))
    )
      return "held";
    if (directoryRepositoryKey === undefined) return "no-key";
    return readable && pluginId.length > 1024 ? "cannot-hold" : "not-persisted";
  }
  return "not-directory";
}
//@ chunk-d2msvdm6.js:11283-11409 placement
/**
 * 迁移时确保插件目录插件的绑定可持久化。
 */
async function ensureDirectoryBindingForMigration(pluginId, installations, remaining) {
  if (!isOfficialPluginDirectoryId(pluginId)) return true;
  if (!remaining.some(hasDirectoryRepositoryKey))
    return (await persistDirectoryBinding(pluginId, installations)) !== "not-persisted";
  await seedBindingsFromInstall(pluginId, installations);
  return true;
}
//@ chunk-d2msvdm6.js:11409-11447 placement
function isDirectoryBindingsEnabled() {
  return isPluginDirectoryModeOn() && pluginDirectoryPolicyBlock() === null;
}
//@ chunk-d2msvdm6.js:11447-11803 placement
/**
 * 读绑定文件，返回绑定表与是否读失败。
 */
async function readDirectoryBindings() {
  let bindings = new Map();
  {
    let pluginsDirJsonFile = await readPluginsDirJsonFile(
      PLUGIN_DIRECTORY_BINDINGS_JSON,
      MAX_BINDINGS_FILE_BYTES,
      "bindings file",
    );
    let parsed =
      pluginsDirJsonFile.state === "read"
        ? pluginDirectoryBindingsSchema().safeParse(pluginsDirJsonFile.json)
        : undefined;
    if (parsed?.success) {
      for (let [key, value] of Object.entries(parsed.data.bindings))
        if (value !== undefined && key.length <= 1024) bindings.set(key, value.repositoryKey);
    }
    return {
      bindings,
      readFailed:
        pluginsDirJsonFile.state === "unusable" ||
        (pluginsDirJsonFile.state === "read" && parsed?.success !== true),
    };
  }
  return {
    bindings,
    readFailed: false,
  };
}
//@ chunk-d2msvdm6.js:11803-12797 placement
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
      for (let [key, repositoryKey] of current.bindings) bindings.set(key, repositoryKey);
      mutate(bindings);
      for (let [existingKey, existingRepoKey] of [...bindings])
        if (existingKey.length > 1024 || existingRepoKey === "") bindings.delete(existingKey);
      let changed =
        bindings.size !== current.bindings.size ||
        [...bindings].some(([checkKey, checkRepoKey]) => current.bindings.get(checkKey) !== checkRepoKey);
      if (changed && current.readFailed)
        logForDebugging("Plugin directory bindings file could not be used; leaving it as it is", {
          level: "warn",
        });
      else if (changed && isDiskless())
        logForDebugging("Plugin directory bindings file not written: this session saves nothing to disk");
      else if (changed) {
        let serialized = jsonStringify({
          schemaVersion: PLUGIN_DIRECTORY_BINDINGS_VERSION,
          bindings: Object.fromEntries(
            [...bindings].map(([bindingKey, repositoryKey]) => [
              bindingKey,
              {
                repositoryKey,
              },
            ]),
          ),
        });
        if (Buffer.byteLength(serialized) > MAX_BINDINGS_FILE_BYTES)
          logForDebugging(
            "Plugin directory bindings file would grow past 1 MB, the most that is read back; leaving it as it is",
            {
              level: "warn",
            },
          );
        else {
          await getFsImplementation().mkdir(getPluginsDirectory());
          await writeFileAtomic(join(getPluginsDirectory(), PLUGIN_DIRECTORY_BINDINGS_JSON), serialized, 384);
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
  readPluginsDirJsonFile,
  bindingsWithReadFailure,
  isUnreadableBindings,
  isOfficialPluginDirectoryId,
  findBindingKeysFor,
  seedDirectoryBindings,
  releaseDirectoryBinding,
  setDirectoryBinding,
  ensureDirectoryBindingForMigration,
  hasDirectoryRepositoryKey,
  persistDirectoryBinding,
  seedBindingsFromInstall,
  MAX_REPOSITORY_KEY_CHARS,
};
