/**
 * utils/plugins/marketplaceSubmodules.ts
 *
 * 2.1.316 新增。marketplace 克隆只拉取插件路径涉及的子模块。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 */
import { relative, resolve as resolve_2, dirname, join, posix, win32 } from "path";
import { readlink } from "fs/promises";
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { MARKETPLACE_MANIFEST_PATH, MAX_PLUGIN_ARCHIVE_BYTES } from "./commandSource.js";
import { applyMarketplacePluginRoot, ONE_MIB } from "./schemas.js";
import { safeParseJSON } from "../json.js";
import { firstLineOf, oneLineClipped } from "../stringUtils.js";
import { isSubpathOf } from "../pathPrefix.js";
import { readPluginFileSafe, getMcpAuthCache as getMcpAuthCache_2 } from "./safeFileRead.js";
import { listSymlinkEntries } from "../git/submoduleInspection.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { stripIgnorables } from "../sanitization.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";

//@ chunk-5xgkngpb.js:4300207-4300785 placement
/**
 * 决定 marketplace 克隆需要取的子模块
 */
async function pickSubmodulesToFetch({
  checkoutDir,
  manifestPath,
  submodules,
  inCheckoutArgs,
  env,
  deadline,
}) {
  let pluginPaths = await readPluginSourcePaths(checkoutDir, manifestPath).catch((error) => {
    logForDebugging(
      `Could not read the marketplace clone's plugin paths, fetching every submodule: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  });
  let trackedLinks =
    pluginPaths &&
    (await vetTrackedLinks(checkoutDir, {
      repository: inCheckoutArgs,
      env,
      deadlineMs: msUntilDeadline(deadline),
    }));
  if (pluginPaths === undefined || trackedLinks === undefined) return "all";
  let selected = filterPathsUnder(submodules, [...pluginPaths.paths, ...trackedLinks]);
  if (pluginPaths.rootPluginFiles === undefined || selected.length === submodules.length) return selected;
  return (selected.length > 0 ||
    (await grepCachedPaths({
      checkoutDir,
      inCheckoutArgs,
      env,
      timeout: Math.min(msUntilDeadline(deadline), MAX_SCANNED_REFS),
      paths: submodules,
      files: pluginPaths.rootPluginFiles,
    }))) === false
    ? []
    : "all";
}
//@ chunk-5xgkngpb.js:4300785-4301857 placement
/**
 * 读取 marketplace 清单中的插件路径
 */
async function readPluginSourcePaths(checkoutDir, manifestPath) {
  let manifestPaths = normalizeCaseForComparison_2([
    manifestPath || MARKETPLACE_MANIFEST_PATH,
    MARKETPLACE_MANIFEST_PATH,
  ]);
  let results = await Promise.all(
    manifestPaths.map((manifestPath) =>
      readCheckoutFile(checkoutDir, manifestPath, MAX_PLUGIN_ARCHIVE_BYTES),
    ),
  );
  let paths = new Set();
  let rootPlugins = [];
  for (let [index, result] of results.entries()) {
    if (index > 0 && result.kind === "absent") continue;
    let parseResult = MarketplacePluginsSchema().safeParse(
      result.kind === "ok" ? applyMarketplacePluginRoot(safeParseJSON(result.content, false)) : undefined,
    );
    if (result.kind !== "ok" || !parseResult.success) return;
    for (let plugin of parseResult.data.plugins) {
      let sourceResult = PluginSourceSchema().safeParse(plugin);
      if (!sourceResult.success) continue;
      let { source, ...pluginEntry } = sourceResult.data;
      let resolvedPath =
        source === "." ? "" : source.startsWith("./") ? resolveCwdReentry(source) : undefined;
      if (resolvedPath === "") rootPlugins.push(pluginEntry);
      else if (resolvedPath !== undefined) paths.add(resolvedPath);
    }
  }
  if (rootPlugins.length === 0)
    return paths.size > MAX_SCANNED_FILES
      ? undefined
      : {
          paths: [...paths],
          rootPluginFiles: undefined,
        };
  let manifestCandidates = [...PLUGIN_MANIFEST_PATHS, ...PLUGIN_CONFIG_FILES];
  let [skillFile, ...fileResults] = await Promise.all(
    ["SKILL.md", ...manifestCandidates].map((path) => readCheckoutFile(checkoutDir, path, ONE_MIB)),
  );
  if (skillFile.kind !== "absent") return;
  let collectedPaths = new Set();
  for (let plugin of rootPlugins) if (!collectManifestPaths(collectedPaths, plugin, true)) return;
  for (let [index, result] of fileResults.entries()) {
    if (result.kind === "absent") continue;
    let parsed = result.kind === "ok" ? safeParseJSON(result.content, false) : null;
    if (
      parsed === null ||
      !collectManifestPaths(collectedPaths, parsed, index < PLUGIN_MANIFEST_PATHS.length)
    )
      return;
  }
  for (let dir of [...PLUGIN_TREE_DIRS, ...collectedPaths]) paths.add(dir);
  if (paths.size > MAX_SCANNED_FILES) return;
  return {
    paths: [...paths],
    rootPluginFiles: normalizeCaseForComparison_2(
      [
        ...[...manifestPaths, ...manifestCandidates].map((path) =>
          resolveCwdReentry(relative(checkoutDir, resolve_2(checkoutDir, path))),
        ),
        ...paths,
      ].flatMap((path) => (path ? [firstLineOf(path, "/")] : [])),
    ),
  };
}
//@ chunk-5xgkngpb.js:4301857-4302133 placement
/**
 * 在克隆中安全读取文件
 */
async function readCheckoutFile(checkoutDir, relPath, maxBytes) {
  let fullPath = resolve_2(checkoutDir, relPath);
  if (!isSubpathOf(checkoutDir, fullPath, false))
    return {
      kind: "refused",
    };
  switch (await readPluginFileSafe(checkoutDir, dirname(fullPath))) {
    case "ok":
      return getMcpAuthCache_2(fullPath, maxBytes);
    case "absent":
      return {
        kind: "absent",
        code: "ENOENT",
      };
    case "not-a-directory":
      return {
        kind: "absent",
        code: "ENOTDIR",
      };
    case "refused":
      return {
        kind: "refused",
      };
  }
}
//@ chunk-5xgkngpb.js:4302133-4302509 placement
/**
 * 从清单值中收集相对路径
 */
function collectManifestPaths(collectedPaths, manifest, isRootFile) {
  let pending = [manifest];
  while (pending.length > 0) {
    let value = pending.pop();
    if (typeof value === "object" && value !== null)
      for (let child of Object.values(value)) pending.push(child);
    if (typeof value !== "string") continue;
    let list = Array.from(value.matchAll(PLUGIN_ROOT_REF_RE), (match) => match[1]);
    let isRelativePath = value === "." || /^\.[/\\]/.test(value);
    for (let candidate of isRelativePath ? [...list, value] : list) {
      let cwdReentry = resolveCwdReentry(candidate);
      if (cwdReentry === "") {
        if (isRootFile && candidate === value) return false;
      } else if (cwdReentry !== undefined) {
        collectedPaths.add(cwdReentry);
        if (collectedPaths.size > MAX_SCANNED_FILES) return false;
      }
    }
  }
  return true;
}
//@ chunk-5xgkngpb.js:4302509-4303063 placement
/**
 * 检查克隆中被跟踪的链接
 */
async function vetTrackedLinks(cwd, options) {
  let links = await listSymlinkEntries(cwd, options);
  if (!Array.isArray(links)) return;
  let dirs = normalizeCaseForComparison_2(links.map((link) => dirname(join(cwd, link))));
  if ((await Promise.all(dirs.map((dir) => readPluginFileSafe(cwd, dir)))).some((check) => check !== "ok")) {
    logForDebugging(
      "A tracked link in the marketplace clone is not under real directories, fetching every submodule",
      {
        level: "warn",
      },
    );
    return;
  }
  return Promise.all(
    links.map(async (link) => {
      let target = await readlink(join(cwd, link)).catch((error) => {
        if (getErrnoCode(error) === "EINVAL") return;
        throw error;
      });
      return target === undefined || posix.isAbsolute(target) || win32.isAbsolute(target)
        ? undefined
        : resolveCwdReentry(posix.join(posix.dirname(link), target));
    }),
  ).then(
    (targets) => targets.filter((target) => target !== undefined),
    () => {
      return;
    },
  );
}
//@ chunk-5xgkngpb.js:4303063-4303658 placement
/**
 * git grep --cached 查找路径引用
 */
async function grepCachedPaths({ checkoutDir, inCheckoutArgs, env, timeout, paths, files }) {
  let needles = normalizeCaseForComparison_2(
    paths.flatMap((path) => [path, path.replaceAll("/", "\\"), path.replaceAll("/", "\\\\")]),
  );
  if ([...needles, ...files].join(" ").length > MAX_SCANNED_BYTES) return;
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...inCheckoutArgs,
      "grep",
      "--cached",
      "-q",
      "-a",
      "-i",
      "-F",
      ...needles.flatMap((needle) => ["-e", needle]),
      "--",
      ...files.map((file) => `:(literal,icase)${file}`),
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
      timeout,
      stdin: "ignore",
      preserveOutputOnError: false,
    },
  );
  if (result.code === 0) return true;
  return result.exitCode === 1 && result.error === undefined && !result.timedOut ? false : undefined;
}
//@ chunk-5xgkngpb.js:4303658-4303817 placement
/**
 * 过滤位于给定前缀下的路径
 */
function filterPathsUnder(submodules, paths) {
  let mapped = paths.map((path) => (path === "" ? "" : `${path}/`));
  return submodules.filter((submodule) => {
    let lowered = `${submodule.toLowerCase()}/`;
    return mapped.some((prefix) => lowered.startsWith(prefix) || prefix.startsWith(lowered));
  });
}
//@ chunk-5xgkngpb.js:4303817-4303990 placement (2.1.88 match: resolveCwdReentry, 0.844)
/**
 * （旧版名配错）规范化相对路径为小写键，. 为空串，跳出上级目录返回 undefined。
 */
function resolveCwdReentry(normalized) {
  let cwdBase = posix
    .normalize(normalized.replaceAll("\\", "/"))
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (cwdBase === "." || cwdBase === "") return "";
  return cwdBase === ".." || cwdBase.startsWith("../") ? undefined : cwdBase;
}
//@ chunk-5xgkngpb.js:4303990-4304057 placement
function msUntilDeadline(deadline) {
  return Math.max(1, Math.round(deadline - performance.now()));
}
//@ chunk-5xgkngpb.js:4304057-4304154 placement
var SUBMODULE_FETCH_MIN_MS = 1000;
var SEE_DETAILS_HINT = "Installing a plugin from its details (Enter) in /plugin shows its full error.";
//@ chunk-5xgkngpb.js:4304154-4304191 placement
/**
 * 把错误文本截短到 200 字符再做清洗与空白折叠，得到单行可显示的失败原因（插件安装失败详情用）。
 */
function normalizeRepoPath(name) {
  return stripIgnorables(printablePluginName(oneLineClipped(name)));
}
export {
  msUntilDeadline,
  pickSubmodulesToFetch,
  SUBMODULE_FETCH_MIN_MS,
  normalizeRepoPath,
  SEE_DETAILS_HINT,
};
