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
import { uniq } from "../collections.js";
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

//@ chunk-e6aww6q8.js:4193818-4194396 placement
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
  let S = await readPluginSourcePaths(checkoutDir, manifestPath).catch((error) => {
    logForDebugging(
      `Could not read the marketplace clone's plugin paths, fetching every submodule: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  });
  let w =
    S &&
    (await vetTrackedLinks(checkoutDir, {
      repository: inCheckoutArgs,
      env,
      deadlineMs: msUntilDeadline(deadline),
    }));
  if (S === undefined || w === undefined) return "all";
  let L = filterPathsUnder(submodules, [...S.paths, ...w]);
  if (S.rootPluginFiles === undefined || L.length === submodules.length) return L;
  return (L.length > 0 ||
    (await grepCachedPaths({
      checkoutDir,
      inCheckoutArgs,
      env,
      timeout: Math.min(msUntilDeadline(deadline), MAX_SCANNED_REFS),
      paths: submodules,
      files: S.rootPluginFiles,
    }))) === false
    ? []
    : "all";
}
//@ chunk-e6aww6q8.js:4194396-4195459 placement
/**
 * 读取 marketplace 清单中的插件路径
 */
async function readPluginSourcePaths(checkoutDir, manifestPath) {
  let r = uniq([manifestPath || MARKETPLACE_MANIFEST_PATH, MARKETPLACE_MANIFEST_PATH]);
  let results = await Promise.all(r.map((q) => readCheckoutFile(checkoutDir, q, MAX_PLUGIN_ARCHIVE_BYTES)));
  let h = new Set();
  let y = [];
  for (let [q, Z] of results.entries()) {
    if (q > 0 && Z.kind === "absent") continue;
    let Se = MarketplacePluginsSchema().safeParse(
      Z.kind === "ok" ? applyMarketplacePluginRoot(safeParseJSON(Z.content, false)) : undefined,
    );
    if (Z.kind !== "ok" || !Se.success) return;
    for (let plugin of Se.data.plugins) {
      let we = PluginSourceSchema().safeParse(plugin);
      if (!we.success) continue;
      let { source, ...Ae } = we.data;
      let Ie = source === "." ? "" : source.startsWith("./") ? resolveCwdReentry(source) : undefined;
      if (Ie === "") y.push(Ae);
      else if (Ie !== undefined) h.add(Ie);
    }
  }
  if (y.length === 0)
    return h.size > MAX_SCANNED_FILES
      ? undefined
      : {
          paths: [...h],
          rootPluginFiles: undefined,
        };
  let S = [...PLUGIN_MANIFEST_PATHS, ...PLUGIN_CONFIG_FILES];
  let [w, ...L] = await Promise.all(["SKILL.md", ...S].map((q) => readCheckoutFile(checkoutDir, q, ONE_MIB)));
  if (w.kind !== "absent") return;
  let G = new Set();
  for (let q of y) if (!collectManifestPaths(G, q, true)) return;
  for (let [q, Z] of L.entries()) {
    if (Z.kind === "absent") continue;
    let Se = Z.kind === "ok" ? safeParseJSON(Z.content, false) : null;
    if (Se === null || !collectManifestPaths(G, Se, q < PLUGIN_MANIFEST_PATHS.length)) return;
  }
  for (let q of [...PLUGIN_TREE_DIRS, ...G]) h.add(q);
  if (h.size > MAX_SCANNED_FILES) return;
  return {
    paths: [...h],
    rootPluginFiles: uniq(
      [
        ...[...r, ...S].map((q) => resolveCwdReentry(relative(checkoutDir, resolve_2(checkoutDir, q)))),
        ...h,
      ].flatMap((q) => (q ? [firstLineOf(q, "/")] : [])),
    ),
  };
}
//@ chunk-e6aww6q8.js:4195459-4195735 placement
/**
 * 在克隆中安全读取文件
 */
async function readCheckoutFile(e, n, r) {
  let s = resolve_2(e, n);
  if (!isSubpathOf(e, s, false))
    return {
      kind: "refused",
    };
  switch (await readPluginFileSafe(e, dirname(s))) {
    case "ok":
      return getMcpAuthCache_2(s, r);
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
//@ chunk-e6aww6q8.js:4195735-4196111 placement
/**
 * 从清单值中收集相对路径
 */
function collectManifestPaths(e, n, r) {
  let s = [n];
  while (s.length > 0) {
    let h = s.pop();
    if (typeof h === "object" && h !== null) for (let w of Object.values(h)) s.push(w);
    if (typeof h !== "string") continue;
    let list = Array.from(h.matchAll(PLUGIN_ROOT_REF_RE), (w) => w[1]);
    let S = h === "." || /^\.[/\\]/.test(h);
    for (let w of S ? [...list, h] : list) {
      let cwdReentry = resolveCwdReentry(w);
      if (cwdReentry === "") {
        if (r && w === h) return false;
      } else if (cwdReentry !== undefined) {
        e.add(cwdReentry);
        if (e.size > MAX_SCANNED_FILES) return false;
      }
    }
  }
  return true;
}
//@ chunk-e6aww6q8.js:4196111-4196665 placement
/**
 * 检查克隆中被跟踪的链接
 */
async function vetTrackedLinks(checkoutDir, n) {
  let r = await listSymlinkEntries(checkoutDir, n);
  if (!Array.isArray(r)) return;
  let s = uniq(r.map((y) => dirname(join(checkoutDir, y))));
  if ((await Promise.all(s.map((y) => readPluginFileSafe(checkoutDir, y)))).some((y) => y !== "ok")) {
    logForDebugging(
      "A tracked link in the marketplace clone is not under real directories, fetching every submodule",
      {
        level: "warn",
      },
    );
    return;
  }
  return Promise.all(
    r.map(async (y) => {
      let S = await readlink(join(checkoutDir, y)).catch((error) => {
        if (getErrnoCode(error) === "EINVAL") return;
        throw error;
      });
      return S === undefined || posix.isAbsolute(S) || win32.isAbsolute(S)
        ? undefined
        : resolveCwdReentry(posix.join(posix.dirname(y), S));
    }),
  ).then(
    (y) => y.filter((S) => S !== undefined),
    () => {
      return;
    },
  );
}
//@ chunk-e6aww6q8.js:4196665-4197260 placement
/**
 * git grep --cached 查找路径引用
 */
async function grepCachedPaths({ checkoutDir, inCheckoutArgs, env, timeout, paths, files }) {
  let S = uniq(paths.flatMap((path) => [path, path.replaceAll("/", "\\"), path.replaceAll("/", "\\\\")]));
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
  if (w.code === 0) return true;
  return w.exitCode === 1 && w.error === undefined && !w.timedOut ? false : undefined;
}
//@ chunk-e6aww6q8.js:4197260-4197419 placement
/**
 * 过滤位于给定前缀下的路径
 */
function filterPathsUnder(submodules, n) {
  let mapped = n.map((s) => (s === "" ? "" : `${s}/`));
  return submodules.filter((s) => {
    let h = `${s.toLowerCase()}/`;
    return mapped.some((y) => h.startsWith(y) || y.startsWith(h));
  });
}
//@ chunk-e6aww6q8.js:4197419-4197592 placement = resolveCwdReentry (0.844)
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
//@ chunk-e6aww6q8.js:4197592-4197659 placement
function msUntilDeadline(deadline) {
  return Math.max(1, Math.round(deadline - performance.now()));
}
//@ chunk-e6aww6q8.js:4197659-4197756 placement
var SUBMODULE_FETCH_MIN_MS = 1000;
var SEE_DETAILS_HINT = "Installing a plugin from its details (Enter) in /plugin shows its full error.";
//@ chunk-e6aww6q8.js:4197756-4197793 placement
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
