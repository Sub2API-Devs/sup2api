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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, xE, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_LINK_FILE } from "../../utils/plugins/pluginLinks.js";
import { qm, lU, R1 } from "../../utils/plugins/cacheUtils.js";
import { PluginManifestSchema } from "../../utils/plugins/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { Ome, assertPluginHooksAdmitted, h$t } from "../../utils/hooks/hookPolicyHold.js";
import { getPlatform } from "../../utils/platform.js";
import { ws } from "../../utils/fsFlags.js";
import { Heo } from "./moduleLoader.js";
import { errorMessage } from "../../utils/errors.js";
import { marketplaceSource } from "../../utils/plugins/pluginOptionsStorage.js";
import { resolveManagedPluginDigests } from "../../utils/plugins/managedPluginSeating.js";
import { HookAdmissionRefusal, NotOrganizationPluginError } from "../../utils/hooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { filterEntriesToNullProto } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-e6aww6q8.js:758786-758824 placement
var y$t = DoctorLazy(() => u({ modules: xE([o()]) }));
//@ chunk-e6aww6q8.js:758824-758863 placement
var _$t = new Set([".git", PLUGIN_LINK_FILE, qm, lU, R1]);
//@ chunk-e6aww6q8.js:758946-758959 placement
var aWe = 4096;
//@ chunk-e6aww6q8.js:758959-758983 placement
class Jw extends Error {}
/**
 * 列出插件目录下全部常规文件（跳过 .git 等元数据），拒绝非 UTF-8 名、非常规文件与过多文件。
 */
//@ chunk-e6aww6q8.js:758983-759488 placement
async function listSealedFiles(e) {
  let n = [],
    r = [""];
  for (let s = r.pop(); s !== void 0; s = r.pop()) {
    for (let h of await readdir_13(join_31(e, s), { encoding: "buffer" })) {
      let str = h.toString("utf8");
      if (!Buffer.from(str, "utf8").equals(h)) throw new Jw(`a name under ${s || "its root"} is not UTF-8`);
      if (s !== "" || !_$t.has(str)) {
        let L = s === "" ? str : `${s}/${str}`,
          G = await lstat_16(join_31(e, L));
        if (G.isDirectory()) r.push(L);
        else if (G.isFile()) n.push(L);
        else throw new Jw(`${L} is not a regular file`);
      }
    }
    if (n.length > aWe) throw new Jw(`it holds more than ${aWe} files`);
  }
  return n;
}
//@ chunk-e6aww6q8.js:759488-759504 placement
var _7 = 33554432;
//@ chunk-e6aww6q8.js:759623-759686 placement
var b$t = ["name", "version", "dependencies", "userConfig", "hooks"];
//@ chunk-e6aww6q8.js:759686-759712 placement
var HOOKS_HOOKS_JSON = "hooks/hooks.json";
//@ chunk-e6aww6q8.js:759712-759748 placement
var k7 = ".claude-plugin/plugin.json";
/**
 * 校验密封插件：plugin.json 与 hooks.json 存在且与加载器读到的一致，名字与 id 匹配、不冒充内置插件，hooks 模块路径一致。
 */
//@ chunk-e6aww6q8.js:759748-760471 placement
function checkSealedManifest(e, n, r) {
  let safeParse = PluginManifestSchema().safeParse(safeParseJSON(r.get(k7) ?? "")),
    safeParse_2 = y$t().safeParse(safeParseJSON(r.get(HOOKS_HOOKS_JSON) ?? ""));
  if (!(safeParse.success && safeParse_2.success))
    return `it does not hold ${k7} and one hooks module in ` + HOOKS_HOOKS_JSON;
  let found = b$t.find((q) => !isDeepStrictEqual_3(safeParse.data[q], e.manifest[q]));
  if (found !== void 0) return `its manifest's ${found} is not the one the loader read`;
  if (safeParse.data.hooks !== void 0) return "its manifest names hooks of its own";
  if (!(
    e.name === safeParse.data.name &&
    nfcLower(e.name) === nfcLower(e.source.slice(0, e.source.lastIndexOf("@")))
  ))
    return "its name is not the one its id spells";
  if (Ome(e)) return "its name is a built-in plugin's";
  let L = relative_13(e.path, n);
  return !isAbsolute_9(L) &&
    L.split(sep_22).join("/") === posix_2.join(posix_2.dirname(HOOKS_HOOKS_JSON), safeParse_2.data.modules[0])
    ? void 0
    : "its hooks module is not the one the loader read";
}
/**
 * 不跟随链接地读取文件，校验读取前后未变化且不超大。
 */
//@ chunk-e6aww6q8.js:760622-761136 placement
async function readSealedFile(e, n) {
  if (getPlatform() !== "windows" && constants_9.O_NOFOLLOW === void 0)
    throw new Jw("this platform cannot open a file without following it");
  let s = join_32(e, n),
    h = await lstat_17(s);
  await using y = await open_7(s, constants_9.O_RDONLY | ws);
  let stats = await y.stat();
  if (!(stats.isFile() && stats.dev === h.dev && stats.ino === h.ino && stats.size === h.size))
    throw new Jw(`${n} changed while it was read`);
  if (stats.size > _7) throw new Jw(`${n} is over the size a folder may hold`);
  let content = await y.readFile();
  if (content.length !== stats.size) throw new Jw(`${n} changed while it was read`);
  return content;
}
//@ chunk-e6aww6q8.js:761136-761234 placement
var R$t = (e, n, r) => ({
  digest: e,
  texts: n,
  holdsNodeModules: r.some((s) => s.startsWith("node_modules/")),
});
/**
 * 计算插件目录的 sha256 摘要（按文件名排序，包含名字与长度），同时收集代码与清单文本。
 */
//@ chunk-e6aww6q8.js:761234-761688 placement
async function digestPluginFolder(e) {
  try {
    let n = createHash_8("sha256"),
      r = new Map(),
      s = 0,
      toSorted = (await listSealedFiles(e)).toSorted();
    for (let y of toSorted) {
      let S = await readSealedFile(e, y);
      if (((s += S.length), s > _7)) throw new Jw(`it holds more than ${_7} bytes`);
      if (
        (n.update(`f ${y}\x00${S.length}\x00`), n.update(S), Heo(y) || y === k7 || y === HOOKS_HOOKS_JSON)
      ) {
        let str = S.toString("utf8");
        if (!Buffer.from(str, "utf8").equals(S)) throw new Jw(`${y} is not UTF-8`);
        r.set(y, str);
      }
    }
    return R$t(`sha256-${n.digest("base64")}`, r, toSorted);
  } catch (error) {
    return { refused: errorMessage(error) };
  }
}
/**
 * 验证组织下发的密封插件：目录摘要必须在允许列表中且清单检查通过，返回文件文本或拒绝原因。
 */
//@ chunk-e6aww6q8.js:761688-762005 placement
async function verifySealedPlugin(e, n, r) {
  let s = await digestPluginFolder(e.path);
  if ("refused" in s) return s;
  if (!r.includes(s.digest))
    return {
      refused:
        `its folder's digest is ${s.digest}, not one listed` +
        (s.holdsNodeModules ? ": its root node_modules counts, and a proved plugin ships bundled" : ""),
    };
  let y = checkSealedManifest(e, n, s.texts);
  return y === void 0 ? s : { refused: y };
}
//@ chunk-e6aww6q8.js:762005-762042 placement
var x$t = (e, n) => new Set([...(n ?? []), e]);
/**
 * 若插件属于组织签名列表，验证后返回其密封文本；否则按普通插件处理返回 undefined。
 */
//@ chunk-e6aww6q8.js:762042-762453 placement
async function readSealedPluginTexts(e, n, r) {
  let s = marketplaceSource(n),
    h = resolveManagedPluginDigests(s);
  if (h === void 0) {
    assertPluginHooksAdmitted(e, { pluginName: n.name, pluginId: s, plugin: n });
    return;
  }
  let y = h$t(s, n);
  if (y !== void 0) throw new HookAdmissionRefusal(n.name, y);
  let S = await verifySealedPlugin(n, r, h);
  if ("refused" in S)
    throw (
      logForDebugging(
        `${quotedPrintable(s)} is not treated as the organization's, and does not load: ${S.refused}`,
        { level: "warn" },
      ),
      logFeatureBad("plugin_sealed_read", "refused"),
      new NotOrganizationPluginError(n.name, S.refused)
    );
  return (logFeatureOk("plugin_sealed_read"), S.texts);
}
//@ chunk-e6aww6q8.js:762453-762563 placement = buildMcpUserConfig (0.767)
var pickNonSensitiveOptions = (plugin, serverName) =>
  filterEntriesToNullProto(plugin, (r, s) => {
    let h = serverName.manifest.userConfig ?? {};
    return Object.hasOwn(h, s) && h[s]?.sensitive !== !0;
  });

export { pickNonSensitiveOptions, readSealedPluginTexts, x$t };
