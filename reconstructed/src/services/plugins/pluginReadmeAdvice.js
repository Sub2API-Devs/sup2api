/**
 * services/plugins/pluginReadmeAdvice.ts
 *
 * 2.1.316 新增：插件 README 安装命令检查建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ca06bv0t.js (23)
 * attribution: placement 23
 */
import { join, resolve, dirname, basename } from "path";
import { readdir } from "fs/promises";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import {
  isDirectoryOrFalse,
  mcpAuthCacheContent,
  readPluginFileSafe,
} from "../../utils/plugins/safeFileRead.js";
import { computeRemoteUrl_2 } from "../../utils/git/gitFilesystem.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import {
  memoizeInMap,
  MAX_PLUGIN_NAME_LENGTH,
  VALIDATE_MARKETPLACE_HINT,
  REPLACE_OWNER_REPO_HINT,
  README_SCAN_BYTES,
  readmeMissingInstallLine,
  OWNER_REPO_PLACEHOLDER,
} from "./pluginTag.js";
import {
  isSameResolvedPath,
  sanitizeForDisplay,
  matchesDirEntry,
} from "../../utils/plugins/validatePlugin.js";
import { isValidPluginIdSegment, PluginMarketplaceFileSchema } from "../../utils/plugins/schemas.js";
import { formatMarketplaceInstallCommand } from "../../commands/plugin/parseArgs.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-ca06bv0t.js:17085-17211 placement = getCurrentRepoHttpsUrl (0.765)
function getCurrentRepoHttpsUrl({ host, owner, name: i }) {
  let parsed = isGithubDotCom(host);
  let included = host.includes(":");
  return parsed ? `${owner}/${i}` : included ? undefined : `https://${host}/${owner}/${i}.git`;
}
//@ chunk-ca06bv0t.js:17211-17420 placement
async function repoHttpsUrlOf(r) {
  let n = join(r, ".git");
  let a = (await isDirectoryOrFalse(n))
    ? await mcpAuthCacheContent(join(n, "config")).catch(() => {
        return;
      })
    : undefined;
  let remoteUrl = computeRemoteUrl_2(a ?? "");
  let p =
    /^(https|ssh):\/\//i.test(remoteUrl) || !remoteUrl.includes("://") ? parseGitRemote(remoteUrl) : null;
  return p === null ? undefined : getCurrentRepoHttpsUrl(p);
}
//@ chunk-ca06bv0t.js:17420-17559 placement
function trimPunctuation(r) {
  let mapped = r.split("").map((i) => !"`'\"()<>[]*.,;:!?".includes(i));
  return r.slice(mapped.findIndex(Boolean), mapped.findLastIndex(Boolean) + 1);
}
//@ chunk-ca06bv0t.js:17559-17611 placement
/**
 * 判断某个名字是否已被安装过。
 */
var isInstalledSymbol = (installs, n) => installs.byName.has(n) || installs.bySource.has(trimPunctuation(n));
//@ chunk-ca06bv0t.js:17679-17825 placement
var hasConcreteMarketplaceArg = (r) =>
  r.some((n, i) =>
    n.startsWith("--marketplace=")
      ? /^--marketplace=[^<>]+$/.test(n)
      : n === "--marketplace" && /^[^-<>][^<>]*$/.test(r[i + 1] ?? ""),
  );
//@ chunk-ca06bv0t.js:17825-17879 placement
/**
 * 把文本切成符号列表（去标点）。
 */
var splitSymbols = (r) =>
  r
    .split(/\s+/)
    .map(trimPunctuation)
    .filter((n) => n !== "");
//@ chunk-ca06bv0t.js:17879-17977 placement
var Ne = Object.freeze(["--marketplace", "--scope", "-s", "--config", "--accept-command", "--registry"]);
//@ chunk-ca06bv0t.js:17977-18053 placement
/**
 * 取命令里的市场参数（跳过选项）。
 */
var marketplaceSymbol = (r) => r.find((n, i) => !n.startsWith("-") && !Ne.includes(r[i - 1] ?? "")) ?? "";
//@ chunk-ca06bv0t.js:18053-18187 placement
function pluginNameFromSpec(r) {
  let n = r.find((s) => s.lastIndexOf("@") > 0) ?? "";
  let index = n.indexOf("@");
  return index > 0 && n.length > index + 1 && !/[<>]/.test(n) ? n.slice(0, index) : "";
}
//@ chunk-ca06bv0t.js:18187-18368 placement
function readmeInstallCommands(r) {
  let mapped = r
    .split(
      `
`,
    )
    .flatMap((line) => line.split(/plugin[ \t]+(?:install|i)[ \t]+/).slice(1))
    .map(splitSymbols);
  return {
    bySource: new Set(mapped.filter(hasConcreteMarketplaceArg).map(marketplaceSymbol)),
    byName: new Set(mapped.map(pluginNameFromSpec)),
  };
}
//@ chunk-ca06bv0t.js:18368-18719 placement
async function listReadmeFiles(r) {
  let filtered = (
    await readdir(r, {
      withFileTypes: true,
    }).catch(() => [])
  )
    .filter((f) => f.isFile())
    .map((f) => f.name)
    .filter((f) => /^readme(\.[a-z0-9.-]+)?$/i.test(f));
  let i = filtered.find((f) => f.toLowerCase() === "readme.md") ?? filtered.toSorted()[0];
  let a =
    i === undefined
      ? undefined
      : await mcpAuthCacheContent(join(r, i)).catch(() => {
          return;
        });
  return i !== undefined && a !== undefined
    ? {
        file: join(r, i),
        installs: readmeInstallCommands(a),
      }
    : undefined;
}
//@ chunk-ca06bv0t.js:18719-19025 placement
async function readmeAdviceForPlugin({ root, name: n, listing }, a) {
  let s = await memoizeInMap(a.readmes, root, listReadmeFiles);
  let f = listing?.entry !== undefined && !isSameResolvedPath(listing.root, root);
  let p = f && listing.marketplace.plugins.length === 1;
  let c = s !== undefined && !isInstalledSymbol(s.installs, n);
  let h = f && (p || c) ? await memoizeInMap(a.readmes, listing.root, listReadmeFiles) : undefined;
  return [s, h].some((b) => b !== undefined && isInstalledSymbol(b.installs, n))
    ? undefined
    : (s ?? (p ? h : undefined));
}
//@ chunk-ca06bv0t.js:19025-19345 placement
async function pluginReadmeAdvice(r, n) {
  let { name: i, listing } = r;
  let f =
    i.length <= MAX_PLUGIN_NAME_LENGTH && isValidPluginIdSegment(i)
      ? await readmeAdviceForPlugin(r, n)
      : undefined;
  if (f === undefined) return [];
  let p = listing === undefined;
  let c = p ? undefined : await memoizeInMap(n.sources, listing.root, repoHttpsUrlOf);
  let h = p ? [VALIDATE_MARKETPLACE_HINT] : c !== undefined ? [] : [REPLACE_OWNER_REPO_HINT];
  return [
    {
      file: sanitizeForDisplay(f.file, README_SCAN_BYTES),
      message: sanitizeForDisplay([readmeMissingInstallLine(r), ...h].join(" "), README_SCAN_BYTES),
      installLine: sanitizeForDisplay(
        formatMarketplaceInstallCommand({
          plugin: i,
          marketplaceSource: c ?? OWNER_REPO_PLACEHOLDER,
        }),
        README_SCAN_BYTES,
      ),
    },
  ];
}
//@ chunk-ca06bv0t.js:19345-19531 placement
function formatAdviceLines(r) {
  return r.length === 0
    ? []
    : [
        `${figures_default.info} Advice (does not change the verdict):`,
        "",
        ...r.flatMap((i) => [
          `  ${figures_default.pointer} ${i.file}: ${i.message}`,
          `      ${i.installLine}`,
        ]),
        "",
      ];
}
//@ chunk-ca06bv0t.js:19531-19617 placement
/**
 * 顺序收集各目录的 README 建议。
 */
var collectAdvice = (readmeAdvice, n) =>
  readmeAdvice.reduce(
    async (acc, a) => [...(await acc), ...(await pluginReadmeAdvice(a, n))],
    Promise.resolve([]),
  );
//@ chunk-ca06bv0t.js:19707-19802 placement
/**
 * 读取 .claude-plugin 下的文件。
 */
async function readPluginJsonFile(r, n) {
  let i = join(r, ".claude-plugin");
  return (await isDirectoryOrFalse(i)) ? ((await mcpAuthCacheContent(join(i, n))) ?? "") : "";
}
//@ chunk-ca06bv0t.js:19802-19940 placement
async function readPluginJsonName(r) {
  try {
    let n = u({
      name: string(),
    }).safeParse(jsonParse(stripBom(await readPluginJsonFile(r, "plugin.json"))));
    return n.success ? n.data.name : undefined;
  } catch {
    return;
  }
}
//@ chunk-ca06bv0t.js:19972-19982 placement
/**
 * 最多展示的 README 行数（64）。
 */
var MAX_README_LINES = 64;
//@ chunk-ca06bv0t.js:19982-20113 placement
async function readMarketplaceJson(r) {
  try {
    let n = PluginMarketplaceFileSchema().safeParse(
      jsonParse(stripBom(await readPluginJsonFile(r, "marketplace.json"))),
    );
    return n.success ? n.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-ca06bv0t.js:20113-20655 placement
/**
 * 读取 marketplace.json 下各插件的 README，检查是否给出了正确的安装命令，生成不影响结论的建议。
 */
async function marketplaceReadmeAdvice(r) {
  let marketplaceJson = await readMarketplaceJson(r);
  let results = await Promise.all(
    (marketplaceJson?.plugins ?? [])
      .filter((p) => typeof p.source === "string")
      .slice(0, MAX_README_LINES)
      .map(async (p) => {
        let { source } = p;
        return marketplaceJson !== undefined &&
          typeof source === "string" &&
          !source.split(/[\\/]/).includes("..") &&
          (await readPluginFileSafe(r, resolve(r, source))) === "ok"
          ? [
              {
                root: resolve(r, source),
                name: p.name,
                listing: {
                  root: r,
                  marketplace: marketplaceJson,
                  entry: p,
                },
              },
            ]
          : [];
      }),
  );
  let a = (await readPluginJsonName(r)) ?? "";
  let found = marketplaceJson?.plugins.find((plugin) =>
    matchesDirEntry(plugin, r, {
      root: r,
      name: a,
    }),
  );
  return marketplaceJson !== undefined && !results.flat().some((p) => p.root === resolve(r))
    ? [
        ...results.flat(),
        {
          root: r,
          name: found?.name ?? a,
          listing: {
            root: r,
            marketplace: marketplaceJson,
            entry: found,
          },
        },
      ]
    : results.flat();
}
//@ chunk-ca06bv0t.js:20655-20931 placement
async function collectReadmeAdvice(r, n, i) {
  let a = dirname(n?.filePath ?? "");
  let s = dirname(a);
  let f = basename(a) === ".claude-plugin" && [n, ...i].every((h) => h?.errors.length === 0);
  let p = f && n?.fileType === "plugin";
  let m =
    f && n?.fileType === "marketplace" && isSameResolvedPath(resolve(r), s)
      ? await marketplaceReadmeAdvice(s)
      : [];
  return p
    ? [
        {
          root: s,
          name: (await readPluginJsonName(s)) ?? "",
          listing: undefined,
        },
      ]
    : m;
}
//@ chunk-ca06bv0t.js:20931-20999 placement
/**
 * 记录错误并返回空数组。
 */
function logAndEmpty(r) {
  if (isFsInaccessible(r)) logForDebugging(`No install advice: ${errorMessage(r)}`);
  else logError(r);
  return [];
}
//@ chunk-ca06bv0t.js:20999-21087 placement
var readmeAdviceFor = (r, manifest, contents) =>
  collectReadmeAdvice(r, manifest, contents)
    .then((readmeAdvice) =>
      collectAdvice(readmeAdvice, {
        readmes: new Map(),
        sources: new Map(),
      }),
    )
    .catch(logAndEmpty);
export { readmeAdviceFor, formatAdviceLines };
