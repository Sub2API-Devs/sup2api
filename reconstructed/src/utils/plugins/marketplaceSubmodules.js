/**
 * utils/plugins/marketplaceSubmodules.ts
 *
 * 2.1.316 新增。marketplace 克隆只拉取插件路径涉及的子模块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import {
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
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
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
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
} from "path";
import {
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
} from "fs/promises";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import {
  MAX_SCANNED_REFS,
  MarketplacePluginsSchema,
  PluginSourceSchema,
  MAX_SCANNED_FILES,
  PLUGIN_MANIFEST_PATHS,
  PLUGIN_CONFIG_FILES,
  PLUGIN_TREE_DIRS,
  PLUGIN_ROOT_REF_RE,
  MAX_SCANNED_BYTES,
} from "./marketplaceGitCheckout.js";
import { uniq } from "../collections.js";
import { MARKETPLACE_MANIFEST_PATH, FVt } from "./commandSource.js";
import { applyMarketplacePluginRoot, ONE_MIB } from "./schemas.js";
import { safeParseJSON } from "../json.js";
import { firstLineOf, U$ } from "../stringUtils.js";
import { hm } from "../pathPrefix.js";
import { readPluginFileSafe, getMcpAuthCache as getMcpAuthCache_2 } from "./safeFileRead.js";
import { ali } from "../git/submoduleInspection.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { stripIgnorables } from "../sanitization.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";

/**
 * 决定 marketplace 克隆需要取的子模块
 */
//@ chunk-e6aww6q8.js:4193818-4194396 placement
async function pickSubmodulesToFetch({
  checkoutDir: checkoutDir,
  manifestPath: manifestPath,
  submodules: submodules,
  inCheckoutArgs: inCheckoutArgs,
  env: env,
  deadline: deadline,
}) {
  let S = await readPluginSourcePaths(checkoutDir, manifestPath).catch((q) => {
      logForDebugging(
        `Could not read the marketplace clone's plugin paths, fetching every submodule: ${errorMessage(q)}`,
        { level: "warn" },
      );
      return;
    }),
    w =
      S &&
      (await vetTrackedLinks(checkoutDir, {
        repository: inCheckoutArgs,
        env: env,
        deadlineMs: msUntilDeadline(deadline),
      }));
  if (S === void 0 || w === void 0) return "all";
  let L = filterPathsUnder(submodules, [...S.paths, ...w]);
  if (S.rootPluginFiles === void 0 || L.length === submodules.length) return L;
  return (L.length > 0 ||
    (await grepCachedPaths({
      checkoutDir: checkoutDir,
      inCheckoutArgs: inCheckoutArgs,
      env: env,
      timeout: Math.min(msUntilDeadline(deadline), MAX_SCANNED_REFS),
      paths: submodules,
      files: S.rootPluginFiles,
    }))) === !1
    ? []
    : "all";
}
/**
 * 读取 marketplace 清单中的插件路径
 */
//@ chunk-e6aww6q8.js:4194396-4195459 placement
async function readPluginSourcePaths(e, n) {
  let r = uniq([n || MARKETPLACE_MANIFEST_PATH, MARKETPLACE_MANIFEST_PATH]),
    results = await Promise.all(r.map((q) => readCheckoutFile(e, q, FVt))),
    h = new Set(),
    y = [];
  for (let [q, Z] of results.entries()) {
    if (q > 0 && Z.kind === "absent") continue;
    let safeParse = MarketplacePluginsSchema().safeParse(
      Z.kind === "ok" ? applyMarketplacePluginRoot(safeParseJSON(Z.content, !1)) : void 0,
    );
    if (Z.kind !== "ok" || !safeParse.success) return;
    for (let plugin of safeParse.data.plugins) {
      let safeParse = PluginSourceSchema().safeParse(plugin);
      if (!safeParse.success) continue;
      let { source: source, ...Ae } = safeParse.data,
        Ie = source === "." ? "" : source.startsWith("./") ? resolveCwdReentry(source) : void 0;
      if (Ie === "") y.push(Ae);
      else if (Ie !== void 0) h.add(Ie);
    }
  }
  if (y.length === 0) return h.size > MAX_SCANNED_FILES ? void 0 : { paths: [...h], rootPluginFiles: void 0 };
  let S = [...PLUGIN_MANIFEST_PATHS, ...PLUGIN_CONFIG_FILES],
    [w, ...L] = await Promise.all(["SKILL.md", ...S].map((q) => readCheckoutFile(e, q, ONE_MIB)));
  if (w.kind !== "absent") return;
  let G = new Set();
  for (let q of y) if (!collectManifestPaths(G, q, !0)) return;
  for (let [q, Z] of L.entries()) {
    if (Z.kind === "absent") continue;
    let Se = Z.kind === "ok" ? safeParseJSON(Z.content, !1) : null;
    if (Se === null || !collectManifestPaths(G, Se, q < PLUGIN_MANIFEST_PATHS.length)) return;
  }
  for (let q of [...PLUGIN_TREE_DIRS, ...G]) h.add(q);
  if (h.size > MAX_SCANNED_FILES) return;
  return {
    paths: [...h],
    rootPluginFiles: uniq(
      [...[...r, ...S].map((q) => resolveCwdReentry(relative_45(e, resolve_54(e, q)))), ...h].flatMap((q) =>
        q ? [firstLineOf(q, "/")] : [],
      ),
    ),
  };
}
/**
 * 在克隆中安全读取文件
 */
//@ chunk-e6aww6q8.js:4195459-4195735 placement
async function readCheckoutFile(e, n, r) {
  let s = resolve_54(e, n);
  if (!hm(e, s, !1)) return { kind: "refused" };
  switch (await readPluginFileSafe(e, dirname_67(s))) {
    case "ok":
      return getMcpAuthCache_2(s, r);
    case "absent":
      return { kind: "absent", code: "ENOENT" };
    case "not-a-directory":
      return { kind: "absent", code: "ENOTDIR" };
    case "refused":
      return { kind: "refused" };
  }
}
/**
 * 从清单值中收集相对路径
 */
//@ chunk-e6aww6q8.js:4195735-4196111 placement
function collectManifestPaths(e, n, r) {
  let s = [n];
  while (s.length > 0) {
    let h = s.pop();
    if (typeof h === "object" && h !== null) for (let w of Object.values(h)) s.push(w);
    if (typeof h !== "string") continue;
    let list = Array.from(h.matchAll(PLUGIN_ROOT_REF_RE), (w) => w[1]),
      S = h === "." || /^\.[/\\]/.test(h);
    for (let w of S ? [...list, h] : list) {
      let L = resolveCwdReentry(w);
      if (L === "") {
        if (r && w === h) return !1;
      } else if (L !== void 0) {
        if ((e.add(L), e.size > MAX_SCANNED_FILES)) return !1;
      }
    }
  }
  return !0;
}
/**
 * 检查克隆中被跟踪的链接
 */
//@ chunk-e6aww6q8.js:4196111-4196665 placement
async function vetTrackedLinks(e, n) {
  let r = await ali(e, n);
  if (!Array.isArray(r)) return;
  let s = uniq(r.map((y) => dirname_67(join_115(e, y))));
  if ((await Promise.all(s.map((y) => readPluginFileSafe(e, y)))).some((y) => y !== "ok")) {
    logForDebugging(
      "A tracked link in the marketplace clone is not under real directories, fetching every submodule",
      { level: "warn" },
    );
    return;
  }
  return Promise.all(
    r.map(async (y) => {
      let S = await readlink_9(join_115(e, y)).catch((w) => {
        if (getErrnoCode(w) === "EINVAL") return;
        throw w;
      });
      return S === void 0 || posix_12.isAbsolute(S) || win32_8.isAbsolute(S)
        ? void 0
        : resolveCwdReentry(posix_12.join(posix_12.dirname(y), S));
    }),
  ).then(
    (y) => y.filter((S) => S !== void 0),
    () => {
      return;
    },
  );
}
/**
 * git grep --cached 查找路径引用
 */
//@ chunk-e6aww6q8.js:4196665-4197260 placement
async function grepCachedPaths({
  checkoutDir: checkoutDir,
  inCheckoutArgs: inCheckoutArgs,
  env: env,
  timeout: timeout,
  paths: paths,
  files: files,
}) {
  let S = uniq(paths.flatMap((L) => [L, L.replaceAll("/", "\\"), L.replaceAll("/", "\\\\")]));
  if ([...S, ...files].join(" ").length > MAX_SCANNED_BYTES) return;
  let w = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...inCheckoutArgs,
      "grep",
      "--cached",
      "-q",
      "-a",
      "-i",
      "-F",
      ...S.flatMap((L) => ["-e", L]),
      "--",
      ...files.map((L) => `:(literal,icase)${L}`),
    ],
    {
      cwd: checkoutDir,
      env: {
        ...env,
        GIT_LITERAL_PATHSPECS: "0",
        GIT_GLOB_PATHSPECS: "0",
        GIT_NOGLOB_PATHSPECS: "0",
        GIT_ICASE_PATHSPECS: "0",
      },
      timeout: timeout,
      stdin: "ignore",
      preserveOutputOnError: !1,
    },
  );
  if (w.code === 0) return !0;
  return w.exitCode === 1 && w.error === void 0 && !w.timedOut ? !1 : void 0;
}
/**
 * 过滤位于给定前缀下的路径
 */
//@ chunk-e6aww6q8.js:4197260-4197419 placement
function filterPathsUnder(e, n) {
  let mapped = n.map((s) => (s === "" ? "" : `${s}/`));
  return e.filter((s) => {
    let h = `${s.toLowerCase()}/`;
    return mapped.some((y) => h.startsWith(y) || y.startsWith(h));
  });
}
/**
 * （旧版名配错）规范化相对路径为小写键，. 为空串，跳出上级目录返回 undefined。
 */
//@ chunk-e6aww6q8.js:4197419-4197592 placement = resolveCwdReentry (0.844)
function resolveCwdReentry(normalized) {
  let cwdBase = posix_12
    .normalize(normalized.replaceAll("\\", "/"))
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (cwdBase === "." || cwdBase === "") return "";
  return cwdBase === ".." || cwdBase.startsWith("../") ? void 0 : cwdBase;
}
//@ chunk-e6aww6q8.js:4197592-4197659 placement
function msUntilDeadline(e) {
  return Math.max(1, Math.round(e - performance.now()));
}
//@ chunk-e6aww6q8.js:4197659-4197756 placement
var SUBMODULE_FETCH_MIN_MS = 1000,
  SEE_DETAILS_HINT = "Installing a plugin from its details (Enter) in /plugin shows its full error.";
/**
 * 把错误文本截短到 200 字符再做清洗与空白折叠，得到单行可显示的失败原因（插件安装失败详情用）。
 */
//@ chunk-e6aww6q8.js:4197756-4197793 placement
function normalizeRepoPath(e) {
  return stripIgnorables(printablePluginName(U$(e)));
}

export {
  msUntilDeadline,
  pickSubmodulesToFetch,
  SUBMODULE_FETCH_MIN_MS,
  normalizeRepoPath,
  SEE_DETAILS_HINT,
};
