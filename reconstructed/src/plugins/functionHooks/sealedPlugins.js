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
import { u, tuple, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_LINK_FILE_2 } from "../../utils/plugins/pluginLinks.js";
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

//@ chunk-e6aww6q8.js:758786-758824 placement
/**
 * 密封插件 hooks.json schema
 */
var sealedHooksSchema = DoctorLazy(() =>
  u({
    modules: tuple([string()]),
  }),
);
//@ chunk-e6aww6q8.js:758824-758863 placement
/**
 * 计算摘要时跳过的名字
 */
var SEALED_SKIP_NAMES = new Set([
  ".git",
  PLUGIN_LINK_FILE_2,
  IN_USE_MARKER_FILE,
  LINKS_MATERIALIZED_MARKER_2,
  ORPHAN_MARKER_FILE,
]);
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
async function listSealedFiles(e) {
  let n = [];
  let r = [""];
  for (let s = r.pop(); s !== undefined; s = r.pop()) {
    for (let h of await readdir(join(e, s), {
      encoding: "buffer",
    })) {
      let str = h.toString("utf8");
      if (!Buffer.from(str, "utf8").equals(h))
        throw new SealedPluginError(`a name under ${s || "its root"} is not UTF-8`);
      if (s !== "" || !SEALED_SKIP_NAMES.has(str)) {
        let L = s === "" ? str : `${s}/${str}`;
        let G = await lstat(join(e, L));
        if (G.isDirectory()) r.push(L);
        else if (G.isFile()) n.push(L);
        else throw new SealedPluginError(`${L} is not a regular file`);
      }
    }
    if (n.length > MAX_SEALED_FILES)
      throw new SealedPluginError(`it holds more than ${MAX_SEALED_FILES} files`);
  }
  return n;
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
function checkSealedManifest(e, n, texts) {
  let s = PluginManifestSchema().safeParse(safeParseJSON(texts.get(PLUGIN_MANIFEST_PATH) ?? ""));
  let h = sealedHooksSchema().safeParse(safeParseJSON(texts.get(HOOKS_HOOKS_JSON) ?? ""));
  if (!(s.success && h.success))
    return `it does not hold ${PLUGIN_MANIFEST_PATH} and one hooks module in ` + HOOKS_HOOKS_JSON;
  let found = SEALED_MANIFEST_FIELDS.find((q) => !isDeepStrictEqual(s.data[q], e.manifest[q]));
  if (found !== undefined) return `its manifest's ${found} is not the one the loader read`;
  if (s.data.hooks !== undefined) return "its manifest names hooks of its own";
  if (!(
    e.name === s.data.name && nfcLower(e.name) === nfcLower(e.source.slice(0, e.source.lastIndexOf("@")))
  ))
    return "its name is not the one its id spells";
  if (isBuiltinPluginAlias(e)) return "its name is a built-in plugin's";
  let L = relative(e.path, n);
  return !isAbsolute(L) &&
    L.split(sep).join("/") === posix.join(posix.dirname(HOOKS_HOOKS_JSON), h.data.modules[0])
    ? undefined
    : "its hooks module is not the one the loader read";
}
//@ chunk-e6aww6q8.js:760622-761136 placement
/**
 * 不跟随链接地读取文件，校验读取前后未变化且不超大。
 */
async function readSealedFile(e, n) {
  if (getPlatform() !== "windows" && constants.O_NOFOLLOW === undefined)
    throw new SealedPluginError("this platform cannot open a file without following it");
  let s = join(e, n);
  let h = await lstat(s);
  await using y = await open(s, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  let stats = await y.stat();
  if (!(stats.isFile() && stats.dev === h.dev && stats.ino === h.ino && stats.size === h.size))
    throw new SealedPluginError(`${n} changed while it was read`);
  if (stats.size > MAX_SEALED_BYTES) throw new SealedPluginError(`${n} is over the size a folder may hold`);
  let content = await y.readFile();
  if (content.length !== stats.size) throw new SealedPluginError(`${n} changed while it was read`);
  return content;
}
//@ chunk-e6aww6q8.js:761136-761234 placement
/**
 * 密封摘要对象
 */
var sealedDigest = (digest, texts, r) => ({
  digest,
  texts,
  holdsNodeModules: r.some((s) => s.startsWith("node_modules/")),
});
//@ chunk-e6aww6q8.js:761234-761688 placement
/**
 * 计算插件目录的 sha256 摘要（按文件名排序，包含名字与长度），同时收集代码与清单文本。
 */
async function digestPluginFolder(path) {
  try {
    let hash = createHash("sha256");
    let texts = new Map();
    let s = 0;
    let h = (await listSealedFiles(path)).toSorted();
    for (let y of h) {
      let sealedFile = await readSealedFile(path, y);
      s += sealedFile.length;
      if (s > MAX_SEALED_BYTES) throw new SealedPluginError(`it holds more than ${MAX_SEALED_BYTES} bytes`);
      hash.update(`f ${y}\x00${sealedFile.length}\x00`);
      hash.update(sealedFile);
      if (isScriptFile(y) || y === PLUGIN_MANIFEST_PATH || y === HOOKS_HOOKS_JSON) {
        let str = sealedFile.toString("utf8");
        if (!Buffer.from(str, "utf8").equals(sealedFile)) throw new SealedPluginError(`${y} is not UTF-8`);
        texts.set(y, str);
      }
    }
    return sealedDigest(`sha256-${hash.digest("base64")}`, texts, h);
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
async function verifySealedPlugin(e, n, managedPluginDigests) {
  let s = await digestPluginFolder(e.path);
  if ("refused" in s) return s;
  if (!managedPluginDigests.includes(s.digest))
    return {
      refused:
        `its folder's digest is ${s.digest}, not one listed` +
        (s.holdsNodeModules ? ": its root node_modules counts, and a proved plugin ships bundled" : ""),
    };
  let y = checkSealedManifest(e, n, s.texts);
  return y === undefined
    ? s
    : {
        refused: y,
      };
}
//@ chunk-e6aww6q8.js:762005-762042 placement
/**
 * 追加密封插件 id
 */
var withSealedPlugin = (e, vouchedPolicyPluginIds) => new Set([...(vouchedPolicyPluginIds ?? []), e]);
//@ chunk-e6aww6q8.js:762042-762453 placement
/**
 * 若插件属于组织签名列表，验证后返回其密封文本；否则按普通插件处理返回 undefined。
 */
async function readSealedPluginTexts(e, n, r) {
  let s = marketplaceSource(n);
  let managedPluginDigests = resolveManagedPluginDigests(s);
  if (managedPluginDigests === undefined) {
    assertPluginHooksAdmitted(e, {
      pluginName: n.name,
      pluginId: s,
      plugin: n,
    });
    return;
  }
  let y = hooksModuleRefusalReason(s, n);
  if (y !== undefined) throw new HookAdmissionRefusal(n.name, y);
  let S = await verifySealedPlugin(n, r, managedPluginDigests);
  if ("refused" in S) {
    logForDebugging(
      `${quotedPrintable(s)} is not treated as the organization's, and does not load: ${S.refused}`,
      {
        level: "warn",
      },
    );
    logFeatureBad("plugin_sealed_read", "refused");
    throw new NotOrganizationPluginError(n.name, S.refused);
  }
  logFeatureOk("plugin_sealed_read");
  return S.texts;
}
//@ chunk-e6aww6q8.js:762453-762563 placement = buildMcpUserConfig (0.767)
var pickNonSensitiveOptions = (plugin, serverName) =>
  filterEntriesToNullProto(plugin, (r, s) => {
    let userConfig = serverName.manifest.userConfig ?? {};
    return Object.hasOwn(userConfig, s) && userConfig[s]?.sensitive !== true;
  });
export { pickNonSensitiveOptions, readSealedPluginTexts, withSealedPlugin };
