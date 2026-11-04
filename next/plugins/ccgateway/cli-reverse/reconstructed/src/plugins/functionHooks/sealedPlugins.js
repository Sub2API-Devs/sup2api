/**
 * plugins/functionHooks/sealedPlugins.ts
 *
 * 2.1.316 新增：封存（sealed）插件的识别与限制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { readdir, lstat, open } from "fs/promises";
import { join, relative, isAbsolute, sep, posix } from "path";
import { isDeepStrictEqual } from "util";
import { constants } from "fs";
import { createHash } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, tuple, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_LINK_FILE } from "../../utils/plugins/pluginLinks.js";
import {
  IN_USE_MARKER_FILE,
  LINKS_MATERIALIZED_MARKER as LINKS_MATERIALIZED_MARKER_2,
  ORPHAN_MARKER_FILE,
} from "../../utils/plugins/cacheUtils.js";
import { PluginManifestSchema } from "../../utils/plugins/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { nfcLower } from "../../utils/stringUtils.js";
import {
  isBuiltinPluginAlias,
  assertPluginHooksAdmitted,
  hooksModuleRefusalReason,
} from "../../utils/hooks/hookPolicyHold.js";
import { getPlatform } from "../../utils/platform.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { isScriptFile } from "./moduleLoader.js";
import { errorMessage } from "../../utils/errors.js";
import { marketplaceSource } from "../../utils/plugins/pluginOptionsStorage.js";
import { resolveManagedPluginDigests } from "../../utils/plugins/managedPluginSeating.js";
import { HookAdmissionRefusal, NotOrganizationPluginError } from "../../utils/hooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:758786-758824 placement
/**
 * 密封插件 hooks.json schema
 */
var sealedHooksSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:758786", () => {
  sealedHooksSchema = DoctorLazy(() =>
    objectSchema({
      modules: tuple([stringSchema()]),
    }),
  );
});
//@ chunk-e6aww6q8.js:758824-758863 placement
/**
 * 计算摘要时跳过的名字
 */
var SEALED_SKIP_NAMES; // deferred: uses PLUGIN_LINK_FILE (../../utils/plugins/pluginLinks.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:758824", () => {
  SEALED_SKIP_NAMES = new Set([
    ".git",
    PLUGIN_LINK_FILE,
    IN_USE_MARKER_FILE,
    LINKS_MATERIALIZED_MARKER_2,
    ORPHAN_MARKER_FILE,
  ]);
});
//@ chunk-e6aww6q8.js:758946-758959 placement
/**
 * 4096
 */
var MAX_SEALED_FILES = 4096;
//@ chunk-e6aww6q8.js:758959-758983 placement
/**
 * 密封插件校验错误
 */
class SealedPluginError extends Error {}
//@ chunk-e6aww6q8.js:758983-759488 placement
/**
 * 列出插件目录下全部常规文件（跳过 .git 等元数据），拒绝非 UTF-8 名、非常规文件与过多文件。
 */
async function listSealedFiles(root) {
  let files = [];
  let dirsToVisit = [""];
  for (let dir = dirsToVisit.pop(); dir !== undefined; dir = dirsToVisit.pop()) {
    for (let entryBytes of await readdir(join(root, dir), {
      encoding: "buffer",
    })) {
      let str = entryBytes.toString("utf8");
      if (!Buffer.from(str, "utf8").equals(entryBytes))
        throw new SealedPluginError(`a name under ${dir || "its root"} is not UTF-8`);
      if (dir !== "" || !SEALED_SKIP_NAMES.has(str)) {
        let relativePath = dir === "" ? str : `${dir}/${str}`;
        let stats = await lstat(join(root, relativePath));
        if (stats.isDirectory()) dirsToVisit.push(relativePath);
        else if (stats.isFile()) files.push(relativePath);
        else throw new SealedPluginError(`${relativePath} is not a regular file`);
      }
    }
    if (files.length > MAX_SEALED_FILES)
      throw new SealedPluginError(`it holds more than ${MAX_SEALED_FILES} files`);
  }
  return files;
}
//@ chunk-e6aww6q8.js:759488-759504 placement
/**
 * 33554432
 */
var MAX_SEALED_BYTES = 33554432;
//@ chunk-e6aww6q8.js:759623-759686 placement
/**
 * 需要一致的清单字段
 */
var SEALED_MANIFEST_FIELDS = ["name", "version", "dependencies", "userConfig", "hooks"];
//@ chunk-e6aww6q8.js:759686-759712 placement
var HOOKS_HOOKS_JSON = "hooks/hooks.json";
//@ chunk-e6aww6q8.js:759712-759748 placement
/**
 * .claude-plugin/plugin.json
 */
var PLUGIN_MANIFEST_PATH = ".claude-plugin/plugin.json";
//@ chunk-e6aww6q8.js:759748-760471 placement
/**
 * 校验密封插件：plugin.json 与 hooks.json 存在且与加载器读到的一致，名字与 id 匹配、不冒充内置插件，hooks 模块路径一致。
 */
function checkSealedManifest(plugin, modulePath, texts) {
  let manifestResult = PluginManifestSchema().safeParse(safeParseJSON(texts.get(PLUGIN_MANIFEST_PATH) ?? ""));
  let hooksResult = sealedHooksSchema().safeParse(safeParseJSON(texts.get(HOOKS_HOOKS_JSON) ?? ""));
  if (!(manifestResult.success && hooksResult.success))
    return `it does not hold ${PLUGIN_MANIFEST_PATH} and one hooks module in ` + HOOKS_HOOKS_JSON;
  let found = SEALED_MANIFEST_FIELDS.find(
    (field) => !isDeepStrictEqual(manifestResult.data[field], plugin.manifest[field]),
  );
  if (found !== undefined) return `its manifest's ${found} is not the one the loader read`;
  if (manifestResult.data.hooks !== undefined) return "its manifest names hooks of its own";
  if (!(
    plugin.name === manifestResult.data.name &&
    nfcLower(plugin.name) === nfcLower(plugin.source.slice(0, plugin.source.lastIndexOf("@")))
  ))
    return "its name is not the one its id spells";
  if (isBuiltinPluginAlias(plugin)) return "its name is a built-in plugin's";
  let relativePath = relative(plugin.path, modulePath);
  return !isAbsolute(relativePath) &&
    relativePath.split(sep).join("/") ===
      posix.join(posix.dirname(HOOKS_HOOKS_JSON), hooksResult.data.modules[0])
    ? undefined
    : "its hooks module is not the one the loader read";
}
//@ chunk-e6aww6q8.js:760622-761136 placement
/**
 * 不跟随链接地读取文件，校验读取前后未变化且不超大。
 */
async function readSealedFile(root, relativePath) {
  if (getPlatform() !== "windows" && constants.O_NOFOLLOW === undefined)
    throw new SealedPluginError("this platform cannot open a file without following it");
  let fullPath = join(root, relativePath);
  let beforeStat = await lstat(fullPath);
  await using handle = await open(fullPath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  let stats = await handle.stat();
  if (!(
    stats.isFile() &&
    stats.dev === beforeStat.dev &&
    stats.ino === beforeStat.ino &&
    stats.size === beforeStat.size
  ))
    throw new SealedPluginError(`${relativePath} changed while it was read`);
  if (stats.size > MAX_SEALED_BYTES)
    throw new SealedPluginError(`${relativePath} is over the size a folder may hold`);
  let content = await handle.readFile();
  if (content.length !== stats.size) throw new SealedPluginError(`${relativePath} changed while it was read`);
  return content;
}
//@ chunk-e6aww6q8.js:761136-761234 placement
/**
 * 密封摘要对象
 */
var sealedDigest = (digest, texts, files) => ({
  digest,
  texts,
  holdsNodeModules: files.some((relativePath) => relativePath.startsWith("node_modules/")),
});
//@ chunk-e6aww6q8.js:761234-761688 placement
/**
 * 计算插件目录的 sha256 摘要（按文件名排序，包含名字与长度），同时收集代码与清单文本。
 */
async function digestPluginFolder(root) {
  try {
    let hash = createHash("sha256");
    let texts = new Map();
    let totalBytes = 0;
    let filePaths = (await listSealedFiles(root)).toSorted();
    for (let relativePath of filePaths) {
      let sealedFile = await readSealedFile(root, relativePath);
      totalBytes += sealedFile.length;
      if (totalBytes > MAX_SEALED_BYTES)
        throw new SealedPluginError(`it holds more than ${MAX_SEALED_BYTES} bytes`);
      hash.update(`f ${relativePath}\x00${sealedFile.length}\x00`);
      hash.update(sealedFile);
      if (
        isScriptFile(relativePath) ||
        relativePath === PLUGIN_MANIFEST_PATH ||
        relativePath === HOOKS_HOOKS_JSON
      ) {
        let str = sealedFile.toString("utf8");
        if (!Buffer.from(str, "utf8").equals(sealedFile))
          throw new SealedPluginError(`${relativePath} is not UTF-8`);
        texts.set(relativePath, str);
      }
    }
    return sealedDigest(`sha256-${hash.digest("base64")}`, texts, filePaths);
  } catch (error) {
    return {
      refused: errorMessage(error),
    };
  }
}
//@ chunk-e6aww6q8.js:761688-762005 placement
/**
 * 验证组织下发的密封插件：目录摘要必须在允许列表中且清单检查通过，返回文件文本或拒绝原因。
 */
async function verifySealedPlugin(plugin, modulePath, managedPluginDigests) {
  let digest = await digestPluginFolder(plugin.path);
  if ("refused" in digest) return digest;
  if (!managedPluginDigests.includes(digest.digest))
    return {
      refused:
        `its folder's digest is ${digest.digest}, not one listed` +
        (digest.holdsNodeModules ? ": its root node_modules counts, and a proved plugin ships bundled" : ""),
    };
  let manifestProblem = checkSealedManifest(plugin, modulePath, digest.texts);
  return manifestProblem === undefined
    ? digest
    : {
        refused: manifestProblem,
      };
}
//@ chunk-e6aww6q8.js:762005-762042 placement
/**
 * 追加密封插件 id
 */
var withSealedPlugin = (pluginId, vouchedPolicyPluginIds) =>
  new Set([...(vouchedPolicyPluginIds ?? []), pluginId]);
//@ chunk-e6aww6q8.js:762042-762453 placement
/**
 * 若插件属于组织签名列表，验证后返回其密封文本；否则按普通插件处理返回 undefined。
 */
async function readSealedPluginTexts(loaderContext, plugin, modulePath) {
  let pluginId = marketplaceSource(plugin);
  let managedPluginDigests = resolveManagedPluginDigests(pluginId);
  if (managedPluginDigests === undefined) {
    assertPluginHooksAdmitted(loaderContext, {
      pluginName: plugin.name,
      pluginId,
      plugin,
    });
    return;
  }
  let refusalReason = hooksModuleRefusalReason(pluginId, plugin);
  if (refusalReason !== undefined) throw new HookAdmissionRefusal(plugin.name, refusalReason);
  let digest = await verifySealedPlugin(plugin, modulePath, managedPluginDigests);
  if ("refused" in digest) {
    logForDebugging(
      `${quotedPrintable(pluginId)} is not treated as the organization's, and does not load: ${digest.refused}`,
      {
        level: "warn",
      },
    );
    logFeatureBad("plugin_sealed_read", "refused");
    throw new NotOrganizationPluginError(plugin.name, digest.refused);
  }
  logFeatureOk("plugin_sealed_read");
  return digest.texts;
}
//@ chunk-e6aww6q8.js:762453-762563 placement (2.1.88 match: buildMcpUserConfig, 0.767)
var pickNonSensitiveOptions = (plugin, serverName) =>
  filterEntriesToNullProto(plugin, (key, optionName) => {
    let userConfig = serverName.manifest.userConfig ?? {};
    return Object.hasOwn(userConfig, optionName) && userConfig[optionName]?.sensitive !== true;
  });
export { pickNonSensitiveOptions, readSealedPluginTexts, withSealedPlugin };
