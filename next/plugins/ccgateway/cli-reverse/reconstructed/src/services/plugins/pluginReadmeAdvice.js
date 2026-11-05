/**
 * services/plugins/pluginReadmeAdvice.ts
 *
 * 2.1.316 新增：插件 README 安装命令检查建议
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s4mtq5zk.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, resolve, dirname, basename } from "path";
import { readdir } from "fs/promises";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import {
  isDirectoryOrFalse,
  readSmallFileText,
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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s4mtq5zk.js:17089-17215 placement (2.1.88 match: getCurrentRepoHttpsUrl, 0.764)
function getCurrentRepoHttpsUrl({ host, owner, name: repoName }) {
  let parsed = isGithubDotCom(host);
  let included = host.includes(":");
  return parsed ? `${owner}/${repoName}` : included ? undefined : `https://${host}/${owner}/${repoName}.git`;
}
//@ chunk-s4mtq5zk.js:17215-17424 placement
async function repoHttpsUrlOf(repoDir) {
  let gitDir = join(repoDir, ".git");
  let configText = (await isDirectoryOrFalse(gitDir))
    ? await readSmallFileText(join(gitDir, "config")).catch(() => {
        return;
      })
    : undefined;
  let remoteUrl = computeRemoteUrl_2(configText ?? "");
  let parsedRemote =
    /^(https|ssh):\/\//i.test(remoteUrl) || !remoteUrl.includes("://") ? parseGitRemote(remoteUrl) : null;
  return parsedRemote === null ? undefined : getCurrentRepoHttpsUrl(parsedRemote);
}
//@ chunk-s4mtq5zk.js:17424-17563 placement
function trimPunctuation(text) {
  let mapped = text.split("").map((character) => !"`'\"()<>[]*.,;:!?".includes(character));
  return text.slice(mapped.findIndex(Boolean), mapped.findLastIndex(Boolean) + 1);
}
//@ chunk-s4mtq5zk.js:17563-17615 placement
/**
 * 判断某个名字是否已被安装过。
 */
var isInstalledSymbol = (installs, token) =>
  installs.byName.has(token) || installs.bySource.has(trimPunctuation(token));
//@ chunk-s4mtq5zk.js:17683-17829 placement
var hasConcreteMarketplaceArg = (args) =>
  args.some((arg, index) =>
    arg.startsWith("--marketplace=")
      ? /^--marketplace=[^<>]+$/.test(arg)
      : arg === "--marketplace" && /^[^-<>][^<>]*$/.test(args[index + 1] ?? ""),
  );
//@ chunk-s4mtq5zk.js:17829-17883 placement
/**
 * 把文本切成符号列表（去标点）。
 */
var splitSymbols = (line) =>
  line
    .split(/\s+/)
    .map(trimPunctuation)
    .filter((token) => token !== "");
//@ chunk-s4mtq5zk.js:17883-17981 placement
var OPTIONS_TAKING_VALUES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s4mtq5zk.js:17883", () => {
  OPTIONS_TAKING_VALUES = Object.freeze([
    "--marketplace",
    "--scope",
    "-s",
    "--config",
    "--accept-command",
    "--registry",
  ]);
});
//@ chunk-s4mtq5zk.js:17981-18057 placement
/**
 * 取命令里的市场参数（跳过选项）。
 */
var marketplaceSymbol = (args) =>
  args.find((arg, index) => !arg.startsWith("-") && !OPTIONS_TAKING_VALUES.includes(args[index - 1] ?? "")) ??
  "";
//@ chunk-s4mtq5zk.js:18057-18191 placement
function pluginNameFromSpec(args) {
  let spec = args.find((arg) => arg.lastIndexOf("@") > 0) ?? "";
  let index = spec.indexOf("@");
  return index > 0 && spec.length > index + 1 && !/[<>]/.test(spec) ? spec.slice(0, index) : "";
}
//@ chunk-s4mtq5zk.js:18191-18372 placement
function readmeInstallCommands(text) {
  let mapped = text
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
//@ chunk-s4mtq5zk.js:18372-18723 placement
async function listReadmeFiles(dir) {
  let filtered = (
    await readdir(dir, {
      withFileTypes: true,
    }).catch(() => [])
  )
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => /^readme(\.[a-z0-9.-]+)?$/i.test(fileName));
  let readmeName =
    filtered.find((fileName) => fileName.toLowerCase() === "readme.md") ?? filtered.toSorted()[0];
  let readmeText =
    readmeName === undefined
      ? undefined
      : await readSmallFileText(join(dir, readmeName)).catch(() => {
          return;
        });
  return readmeName !== undefined && readmeText !== undefined
    ? {
        file: join(dir, readmeName),
        installs: readmeInstallCommands(readmeText),
      }
    : undefined;
}
//@ chunk-s4mtq5zk.js:18723-19029 placement
async function readmeAdviceForPlugin({ root, name: pluginName, listing }, cache) {
  let readme = await memoizeInMap(cache.readmes, root, listReadmeFiles);
  let listingElsewhere = listing?.entry !== undefined && !isSameResolvedPath(listing.root, root);
  let singleMarketplaceEntry = listingElsewhere && listing.marketplace.plugins.length === 1;
  let readmeNeedsInstallLine = readme !== undefined && !isInstalledSymbol(readme.installs, pluginName);
  let marketplaceReadme =
    listingElsewhere && (singleMarketplaceEntry || readmeNeedsInstallLine)
      ? await memoizeInMap(cache.readmes, listing.root, listReadmeFiles)
      : undefined;
  return [readme, marketplaceReadme].some(
    (candidate) => candidate !== undefined && isInstalledSymbol(candidate.installs, pluginName),
  )
    ? undefined
    : (readme ?? (singleMarketplaceEntry ? marketplaceReadme : undefined));
}
//@ chunk-s4mtq5zk.js:19029-19349 placement
async function pluginReadmeAdvice(plugin, cache) {
  let { name: pluginName, listing } = plugin;
  let readme =
    pluginName.length <= MAX_PLUGIN_NAME_LENGTH && isValidPluginIdSegment(pluginName)
      ? await readmeAdviceForPlugin(plugin, cache)
      : undefined;
  if (readme === undefined) return [];
  let noListing = listing === undefined;
  let marketplaceSource = noListing
    ? undefined
    : await memoizeInMap(cache.sources, listing.root, repoHttpsUrlOf);
  let extraHints = noListing
    ? [VALIDATE_MARKETPLACE_HINT]
    : marketplaceSource !== undefined
      ? []
      : [REPLACE_OWNER_REPO_HINT];
  return [
    {
      file: sanitizeForDisplay(readme.file, README_SCAN_BYTES),
      message: sanitizeForDisplay(
        [readmeMissingInstallLine(plugin), ...extraHints].join(" "),
        README_SCAN_BYTES,
      ),
      installLine: sanitizeForDisplay(
        formatMarketplaceInstallCommand({
          plugin: pluginName,
          marketplaceSource: marketplaceSource ?? OWNER_REPO_PLACEHOLDER,
        }),
        README_SCAN_BYTES,
      ),
    },
  ];
}
//@ chunk-s4mtq5zk.js:19349-19535 placement
function formatAdviceLines(advice) {
  return advice.length === 0
    ? []
    : [
        `${figures_default.info} Advice (does not change the verdict):`,
        "",
        ...advice.flatMap((item) => [
          `  ${figures_default.pointer} ${item.file}: ${item.message}`,
          `      ${item.installLine}`,
        ]),
        "",
      ];
}
//@ chunk-s4mtq5zk.js:19535-19621 placement
/**
 * 顺序收集各目录的 README 建议。
 */
var collectAdvice = (readmeAdvice, cache) =>
  readmeAdvice.reduce(
    async (acc, plugin) => [...(await acc), ...(await pluginReadmeAdvice(plugin, cache))],
    Promise.resolve([]),
  );
//@ chunk-s4mtq5zk.js:19711-19806 placement
/**
 * 读取 .claude-plugin 下的文件。
 */
async function readPluginJsonFile(dir, fileName) {
  let metaDir = join(dir, ".claude-plugin");
  return (await isDirectoryOrFalse(metaDir))
    ? ((await readSmallFileText(join(metaDir, fileName))) ?? "")
    : "";
}
//@ chunk-s4mtq5zk.js:19806-19944 placement
async function readPluginJsonName(pluginDir) {
  try {
    let parsed = objectSchema({
      name: stringSchema(),
    }).safeParse(jsonParse(stripBom(await readPluginJsonFile(pluginDir, "plugin.json"))));
    return parsed.success ? parsed.data.name : undefined;
  } catch {
    return;
  }
}
//@ chunk-s4mtq5zk.js:19976-19986 placement
/**
 * 最多展示的 README 行数（64）。
 */
var MAX_README_LINES = 64;
//@ chunk-s4mtq5zk.js:19986-20117 placement
async function readMarketplaceJson(marketplaceDir) {
  try {
    let parsed = PluginMarketplaceFileSchema().safeParse(
      jsonParse(stripBom(await readPluginJsonFile(marketplaceDir, "marketplace.json"))),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}
//@ chunk-s4mtq5zk.js:20117-20659 placement
/**
 * 读取 marketplace.json 下各插件的 README，检查是否给出了正确的安装命令，生成不影响结论的建议。
 */
async function marketplaceReadmeAdvice(marketplaceDir) {
  let marketplaceJson = await readMarketplaceJson(marketplaceDir);
  let results = await Promise.all(
    (marketplaceJson?.plugins ?? [])
      .filter((pluginEntry) => typeof pluginEntry.source === "string")
      .slice(0, MAX_README_LINES)
      .map(async (pluginEntry) => {
        let { source } = pluginEntry;
        return marketplaceJson !== undefined &&
          typeof source === "string" &&
          !source.split(/[\\/]/).includes("..") &&
          (await readPluginFileSafe(marketplaceDir, resolve(marketplaceDir, source))) === "ok"
          ? [
              {
                root: resolve(marketplaceDir, source),
                name: pluginEntry.name,
                listing: {
                  root: marketplaceDir,
                  marketplace: marketplaceJson,
                  entry: pluginEntry,
                },
              },
            ]
          : [];
      }),
  );
  let ownName = (await readPluginJsonName(marketplaceDir)) ?? "";
  let found = marketplaceJson?.plugins.find((plugin) =>
    matchesDirEntry(plugin, marketplaceDir, {
      root: marketplaceDir,
      name: ownName,
    }),
  );
  return marketplaceJson !== undefined &&
    !results.flat().some((plugin) => plugin.root === resolve(marketplaceDir))
    ? [
        ...results.flat(),
        {
          root: marketplaceDir,
          name: found?.name ?? ownName,
          listing: {
            root: marketplaceDir,
            marketplace: marketplaceJson,
            entry: found,
          },
        },
      ]
    : results.flat();
}
//@ chunk-s4mtq5zk.js:20659-20935 placement
async function collectReadmeAdvice(cwd, manifest, contents) {
  let metaDir = dirname(manifest?.filePath ?? "");
  let root = dirname(metaDir);
  let inManifestDir =
    basename(metaDir) === ".claude-plugin" &&
    [manifest, ...contents].every((content) => content?.errors.length === 0);
  let isPlugin = inManifestDir && manifest?.fileType === "plugin";
  let marketplaceAdvice =
    inManifestDir && manifest?.fileType === "marketplace" && isSameResolvedPath(resolve(cwd), root)
      ? await marketplaceReadmeAdvice(root)
      : [];
  return isPlugin
    ? [
        {
          root,
          name: (await readPluginJsonName(root)) ?? "",
          listing: undefined,
        },
      ]
    : marketplaceAdvice;
}
//@ chunk-s4mtq5zk.js:20935-21003 placement
/**
 * 记录错误并返回空数组。
 */
function logAndEmpty(error) {
  if (isFsInaccessible(error)) logForDebugging(`No install advice: ${errorMessage(error)}`);
  else logError(error);
  return [];
}
//@ chunk-s4mtq5zk.js:21003-21091 placement
var readmeAdviceFor = (cwd, manifest, contents) =>
  collectReadmeAdvice(cwd, manifest, contents)
    .then((readmeAdvice) =>
      collectAdvice(readmeAdvice, {
        readmes: new Map(),
        sources: new Map(),
      }),
    )
    .catch(logAndEmpty);
export { readmeAdviceFor, formatAdviceLines };
